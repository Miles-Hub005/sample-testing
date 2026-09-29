"""Unit tests for Contact service CRUD operations, email validation, and FK validation."""

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models.base import Base
from services.crm.companies import create_company
from services.crm.contacts import (
    create_contact,
    delete_contact,
    get_contact,
    list_contacts,
    update_contact,
)
from services.crm.exceptions import ContactNotFoundError, InvalidForeignKeyError
from services.crm.schemas import CompanyCreate, ContactCreate, ContactUpdate


@pytest.fixture
def db_session() -> Session:
    """Fixture providing an in-memory SQLite SQLAlchemy session."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_create_contact_success_without_company(db_session: Session) -> None:
    """Test creating a contact without an associated company."""
    contact_in = ContactCreate(
        name="Jane Doe",
        email="jane@example.com",
        owner="Alice",
    )
    contact = create_contact(db_session, contact_in)

    assert contact.id is not None
    assert contact.name == "Jane Doe"
    assert contact.email == "jane@example.com"
    assert contact.owner == "Alice"
    assert contact.company_id is None
    assert contact.created_at is not None
    assert contact.updated_at is not None


def test_create_contact_success_with_company(db_session: Session) -> None:
    """Test creating a contact with a valid associated company."""
    company = create_company(
        db_session,
        CompanyCreate(name="Acme Corp", owner="Alice"),
    )

    contact_in = ContactCreate(
        name="John Smith",
        email="john@acme.com",
        owner="Alice",
        company_id=company.id,
    )
    contact = create_contact(db_session, contact_in)

    assert contact.id is not None
    assert contact.company_id == company.id


def test_create_contact_dict_input(db_session: Session) -> None:
    """Test creating a contact passing a dict."""
    contact_data = {
        "name": "Dict Contact",
        "email": "dict@example.com",
        "owner": "Bob",
    }
    contact = create_contact(db_session, contact_data)
    assert contact.id is not None
    assert contact.name == "Dict Contact"


def test_create_contact_invalid_email(db_session: Session) -> None:
    """Test creating a contact with invalid email format raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        ContactCreate(
            name="Bad Email",
            email="invalid-email-format",
            owner="Alice",
        )
    assert "Invalid email format" in str(exc_info.value)

    with pytest.raises(ValidationError):
        create_contact(
            db_session,
            {
                "name": "Bad Email",
                "email": "notanemail",
                "owner": "Alice",
            },
        )


def test_create_contact_invalid_company_fk(db_session: Session) -> None:
    """Test creating a contact with a non-existent company_id raises InvalidForeignKeyError."""
    contact_in = ContactCreate(
        name="Orphan Contact",
        email="orphan@example.com",
        owner="Alice",
        company_id=99999,
    )
    with pytest.raises(InvalidForeignKeyError) as exc_info:
        create_contact(db_session, contact_in)

    assert "Company ID 99999 does not exist" in str(exc_info.value)


def test_get_contact(db_session: Session) -> None:
    """Test retrieving a contact by ID."""
    created = create_contact(
        db_session,
        ContactCreate(name="Alice", email="alice@example.com", owner="Owner1"),
    )

    fetched = get_contact(db_session, created.id)
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.name == "Alice"

    assert get_contact(db_session, 99999) is None


def test_list_contacts_sorting_and_pagination(db_session: Session) -> None:
    """Test listing contacts sorted by name A-Z with pagination."""
    create_contact(
        db_session,
        ContactCreate(name="Charlie", email="charlie@example.com", owner="Owner1"),
    )
    create_contact(
        db_session,
        ContactCreate(name="Alice", email="alice@example.com", owner="Owner2"),
    )
    create_contact(
        db_session,
        ContactCreate(name="Bob", email="bob@example.com", owner="Owner3"),
    )

    contacts = list_contacts(db_session)
    assert len(contacts) == 3
    assert [c.name for c in contacts] == ["Alice", "Bob", "Charlie"]

    # Test pagination
    paged = list_contacts(db_session, skip=1, limit=1)
    assert len(paged) == 1
    assert paged[0].name == "Bob"


def test_update_contact_success(db_session: Session) -> None:
    """Test updating contact attributes successfully."""
    company = create_company(
        db_session, CompanyCreate(name="Beta LLC", owner="Owner1")
    )
    created = create_contact(
        db_session,
        ContactCreate(name="Old Name", email="old@example.com", owner="Owner1"),
    )

    updated = update_contact(
        db_session,
        created.id,
        ContactUpdate(
            name="New Name",
            email="new@example.com",
            company_id=company.id,
        ),
    )

    assert updated.name == "New Name"
    assert updated.email == "new@example.com"
    assert updated.company_id == company.id


def test_update_contact_dict_input(db_session: Session) -> None:
    """Test updating contact using a dictionary."""
    created = create_contact(
        db_session,
        ContactCreate(name="Contact A", email="a@example.com", owner="Owner1"),
    )

    updated = update_contact(
        db_session,
        created.id,
        {"name": "Contact A Updated"},
    )
    assert updated.name == "Contact A Updated"


def test_update_contact_not_found(db_session: Session) -> None:
    """Test updating a non-existent contact raises ContactNotFoundError."""
    with pytest.raises(ContactNotFoundError):
        update_contact(
            db_session,
            99999,
            ContactUpdate(name="Non Existent"),
        )


def test_update_contact_invalid_company_fk(db_session: Session) -> None:
    """Test updating contact with non-existent company_id raises InvalidForeignKeyError."""
    created = create_contact(
        db_session,
        ContactCreate(name="Contact B", email="b@example.com", owner="Owner1"),
    )

    with pytest.raises(InvalidForeignKeyError) as exc_info:
        update_contact(
            db_session,
            created.id,
            ContactUpdate(company_id=88888),
        )

    assert "Company ID 88888 does not exist" in str(exc_info.value)


def test_delete_contact_success(db_session: Session) -> None:
    """Test deleting a contact."""
    created = create_contact(
        db_session,
        ContactCreate(name="To Delete", email="delete@example.com", owner="Owner1"),
    )

    result = delete_contact(db_session, created.id)
    assert result is True
    assert get_contact(db_session, created.id) is None


def test_delete_contact_not_found(db_session: Session) -> None:
    """Test deleting a non-existent contact raises ContactNotFoundError."""
    with pytest.raises(ContactNotFoundError):
        delete_contact(db_session, 99999)
