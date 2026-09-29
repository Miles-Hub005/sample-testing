"""Unit tests for contacts domain service."""

import pytest
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models.base import Base
from models.companies import create_company
from services.contacts.exceptions import (
    ContactNotFoundError,
    ContactValidationError,
    InvalidForeignKeyError,
)
from services.contacts.service import (
    create_contact,
    delete_contact,
    get_contact,
    get_contact_by_id,
    get_contacts_by_company,
    list_contacts,
    search_and_paginate_contacts,
    update_contact,
)


class DummyContactModel(BaseModel):
    name: str
    email: str
    phone: str = "555-0100"
    company_id: int


@pytest.fixture
def db_session() -> Session:
    """Fixture providing an in-memory SQLite database session."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_create_contact_success_without_company(db_session: Session) -> None:
    """Test creating a contact without an associated company (Edge Case 2)."""
    contact = create_contact(
        db_session,
        name="Jane Doe",
        email="jane@example.com",
        phone="555-0199",
        role="Developer",
        notes="Primary tech contact",
        owner="Alice",
    )

    assert contact.id is not None
    assert contact.name == "Jane Doe"
    assert contact.email == "jane@example.com"
    assert contact.phone == "555-0199"
    assert contact.role == "Developer"
    assert contact.company_id is None
    assert contact.notes == "Primary tech contact"
    assert contact.owner == "Alice"


def test_create_contact_success_with_company(db_session: Session) -> None:
    """Test creating a contact associated with a valid company."""
    company = create_company(db_session, name="Acme Corp")
    contact = create_contact(
        db_session,
        name="John Smith",
        email="john@acme.com",
        company_id=company.id,
    )

    assert contact.id is not None
    assert contact.company_id == company.id


def test_create_contact_from_model_and_dict(db_session: Session) -> None:
    """Test creating a contact passing a Pydantic model and a dict."""
    company = create_company(db_session, name="Beta Inc")

    # Pydantic model
    model_input = DummyContactModel(
        name="Model User",
        email="model@beta.com",
        company_id=company.id,
    )
    contact1 = create_contact(db_session, contact_in=model_input)
    assert contact1.name == "Model User"
    assert contact1.company_id == company.id

    # Dict input
    dict_input = {
        "name": "Dict User",
        "email": "dict@beta.com",
        "company_id": company.id,
    }
    contact2 = create_contact(db_session, contact_in=dict_input)
    assert contact2.name == "Dict User"


def test_create_contact_validation_empty_name(db_session: Session) -> None:
    """Test creating a contact with empty or whitespace name raises ContactValidationError."""
    with pytest.raises(ContactValidationError):
        create_contact(db_session, name="", email="test@example.com")

    with pytest.raises(ContactValidationError):
        create_contact(db_session, name="   ", email="test@example.com")

    with pytest.raises(ContactValidationError):
        create_contact(db_session, contact_in={"name": None, "email": "test@example.com"})


def test_create_contact_validation_invalid_email(db_session: Session) -> None:
    """Test creating a contact with missing, empty, or malformed email raises ContactValidationError."""
    with pytest.raises(ContactValidationError):
        create_contact(db_session, name="Test User", email="")

    with pytest.raises(ContactValidationError):
        create_contact(db_session, name="Test User", email="invalid-email")

    with pytest.raises(ContactValidationError):
        create_contact(db_session, name="Test User", email="notanemail.com")


def test_create_contact_invalid_company_fk(db_session: Session) -> None:
    """Test creating a contact with a non-existent company_id raises InvalidForeignKeyError."""
    with pytest.raises(InvalidForeignKeyError):
        create_contact(
            db_session,
            name="Ghost Contact",
            email="ghost@example.com",
            company_id=99999,
        )


def test_get_contact(db_session: Session) -> None:
    """Test retrieving a contact by ID and get_contact_by_id alias."""
    contact = create_contact(
        db_session,
        name="Alice Smith",
        email="alice@example.com",
    )

    fetched = get_contact(db_session, contact.id)
    assert fetched is not None
    assert fetched.id == contact.id
    assert fetched.name == "Alice Smith"

    alias_fetched = get_contact_by_id(db_session, contact.id)
    assert alias_fetched is not None
    assert alias_fetched.id == contact.id

    assert get_contact(db_session, 88888) is None


def test_get_contacts_by_company(db_session: Session) -> None:
    """Test retrieving all contacts associated with a specific company."""
    company1 = create_company(db_session, name="Company 1")
    company2 = create_company(db_session, name="Company 2")

    create_contact(
        db_session, name="Bob", email="bob@c1.com", company_id=company1.id
    )
    create_contact(
        db_session, name="Charlie", email="charlie@c1.com", company_id=company1.id
    )
    create_contact(
        db_session, name="Dave", email="dave@c2.com", company_id=company2.id
    )

    c1_contacts = get_contacts_by_company(db_session, company1.id)
    assert len(c1_contacts) == 2
    assert {c.name for c in c1_contacts} == {"Bob", "Charlie"}


def test_list_and_paginate_contacts(db_session: Session) -> None:
    """Test listing, searching, filtering by company, and paginating contacts."""
    company = create_company(db_session, name="Gamma Corp")

    create_contact(
        db_session, name="Zachary", email="zach@gamma.com", company_id=company.id
    )
    create_contact(
        db_session, name="Aaron", email="aaron@example.com", company_id=None
    )
    create_contact(
        db_session, name="Beth", email="beth@gamma.com", company_id=company.id
    )

    all_contacts = list_contacts(db_session)
    assert len(all_contacts) == 3

    # list_contacts with search parameter
    searched = list_contacts(db_session, search="gamma.com")
    assert isinstance(searched, tuple)
    s_items, s_total = searched
    assert s_total == 2

    # list_contacts with company_id parameter
    company_filtered = list_contacts(db_session, company_id=company.id)
    assert isinstance(company_filtered, tuple)
    c_items, c_total = company_filtered
    assert c_total == 2

    # Filter by company_id via search_and_paginate_contacts
    company_contacts, total = search_and_paginate_contacts(
        db_session, company_id=company.id, page=1, page_size=10
    )
    assert total == 2
    assert len(company_contacts) == 2

    # Search by email term
    search_items, search_total = search_and_paginate_contacts(
        db_session, search="gamma.com", page=1, page_size=10
    )
    assert search_total == 2


def test_update_contact_success(db_session: Session) -> None:
    """Test updating fields on an existing contact."""
    company1 = create_company(db_session, name="Comp 1")
    company2 = create_company(db_session, name="Comp 2")

    contact = create_contact(
        db_session,
        name="Original Name",
        email="old@example.com",
        company_id=company1.id,
    )

    updated = update_contact(
        db_session,
        contact.id,
        name="Updated Name",
        email="new@example.com",
        company_id=company2.id,
        role="CTO",
    )

    assert updated.name == "Updated Name"
    assert updated.email == "new@example.com"
    assert updated.company_id == company2.id
    assert updated.role == "CTO"


def test_update_contact_unlink_company(db_session: Session) -> None:
    """Test updating company_id to None unlinks the company."""
    company = create_company(db_session, name="Linked Comp")
    contact = create_contact(
        db_session,
        name="Linked Contact",
        email="linked@example.com",
        company_id=company.id,
    )

    updated = update_contact(db_session, contact.id, company_id=None)
    assert updated.company_id is None


def test_update_contact_validation_errors(db_session: Session) -> None:
    """Test update with empty name or invalid email format raises ContactValidationError."""
    contact = create_contact(
        db_session, name="Valid Contact", email="valid@example.com"
    )

    with pytest.raises(ContactValidationError):
        update_contact(db_session, contact.id, name="")

    with pytest.raises(ContactValidationError):
        update_contact(db_session, contact.id, email="invalid-email")


def test_update_contact_invalid_company_fk(db_session: Session) -> None:
    """Test updating company_id to non-existent ID raises InvalidForeignKeyError."""
    contact = create_contact(
        db_session, name="Valid Contact", email="valid@example.com"
    )

    with pytest.raises(InvalidForeignKeyError):
        update_contact(db_session, contact.id, company_id=99999)


def test_update_contact_not_found(db_session: Session) -> None:
    """Test updating non-existent contact raises ContactNotFoundError."""
    with pytest.raises(ContactNotFoundError):
        update_contact(db_session, 99999, name="New Name")


def test_delete_contact_success(db_session: Session) -> None:
    """Test deleting a contact."""
    contact = create_contact(
        db_session, name="To Delete", email="delete@example.com"
    )

    result = delete_contact(db_session, contact.id)
    assert result is True
    assert get_contact(db_session, contact.id) is None


def test_delete_contact_not_found(db_session: Session) -> None:
    """Test deleting non-existent contact raises ContactNotFoundError."""
    with pytest.raises(ContactNotFoundError):
        delete_contact(db_session, 99999)
