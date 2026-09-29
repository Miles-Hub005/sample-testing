"""Unit tests for Company service CRUD operations and validation rules."""

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models.base import Base
from models.crm import Company, Lead
from services.crm.companies import (
    create_company,
    delete_company,
    get_company,
    list_companies,
    update_company,
)
from services.crm.exceptions import CompanyDeleteBlockedError, CompanyNotFoundError
from services.crm.schemas import CompanyCreate, CompanyUpdate


@pytest.fixture
def db_session() -> Session:
    """Fixture providing an in-memory SQLite SQLAlchemy session."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_create_company_success(db_session: Session) -> None:
    """Test creating a company with valid CompanyCreate schema."""
    company_in = CompanyCreate(
        name="Acme Corp",
        email="contact@acme.com",
        owner="Alice",
    )
    company = create_company(db_session, company_in)

    assert company.id is not None
    assert company.name == "Acme Corp"
    assert company.email == "contact@acme.com"
    assert company.owner == "Alice"
    assert company.created_at is not None
    assert company.updated_at is not None


def test_create_company_dict_input(db_session: Session) -> None:
    """Test creating a company with dictionary input."""
    company_data = {
        "name": "Globex Corp",
        "email": "info@globex.com",
        "owner": "Bob",
    }
    company = create_company(db_session, company_data)

    assert company.id is not None
    assert company.name == "Globex Corp"
    assert company.email == "info@globex.com"


def test_create_company_invalid_email(db_session: Session) -> None:
    """Test that creating a company with an invalid email raises ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        CompanyCreate(
            name="Fail Corp",
            email="invalid-email-address",
            owner="Alice",
        )
    assert "Invalid email format" in str(exc_info.value)

    with pytest.raises(ValidationError):
        create_company(
            db_session,
            {
                "name": "Fail Corp",
                "email": "not-an-email",
                "owner": "Alice",
            },
        )


def test_get_company(db_session: Session) -> None:
    """Test retrieving a company by ID."""
    company_in = CompanyCreate(name="Initech", owner="Peter")
    created = create_company(db_session, company_in)

    fetched = get_company(db_session, created.id)
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.name == "Initech"

    non_existent = get_company(db_session, 99999)
    assert non_existent is None


def test_list_companies_sorting(db_session: Session) -> None:
    """Test listing companies sorted by name A-Z."""
    create_company(db_session, CompanyCreate(name="Zulu Inc", owner="Owner1"))
    create_company(db_session, CompanyCreate(name="Alpha Corp", owner="Owner2"))
    create_company(db_session, CompanyCreate(name="Beta LLC", owner="Owner3"))

    companies = list_companies(db_session)
    names = [c.name for c in companies]
    assert names == ["Alpha Corp", "Beta LLC", "Zulu Inc"]


def test_list_companies_pagination(db_session: Session) -> None:
    """Test pagination with skip and limit for list_companies."""
    create_company(db_session, CompanyCreate(name="Company A", owner="Owner"))
    create_company(db_session, CompanyCreate(name="Company B", owner="Owner"))
    create_company(db_session, CompanyCreate(name="Company C", owner="Owner"))

    companies_page = list_companies(db_session, skip=1, limit=1)
    assert len(companies_page) == 1
    assert companies_page[0].name == "Company B"


def test_update_company_success(db_session: Session) -> None:
    """Test updating existing company attributes."""
    created = create_company(
        db_session,
        CompanyCreate(name="Old Name", email="old@acme.com", owner="Alice"),
    )

    update_in = CompanyUpdate(name="New Name", email="new@acme.com")
    updated = update_company(db_session, created.id, update_in)

    assert updated.id == created.id
    assert updated.name == "New Name"
    assert updated.email == "new@acme.com"
    assert updated.owner == "Alice"


def test_update_company_invalid_email(db_session: Session) -> None:
    """Test updating company with invalid email format raises ValidationError."""
    created = create_company(
        db_session,
        CompanyCreate(name="Valid Company", owner="Alice"),
    )

    with pytest.raises(ValidationError):
        update_company(
            db_session,
            created.id,
            {"email": "invalid-email"},
        )


def test_update_company_not_found(db_session: Session) -> None:
    """Test updating a non-existent company raises CompanyNotFoundError."""
    with pytest.raises(CompanyNotFoundError):
        update_company(db_session, 99999, CompanyUpdate(name="New Name"))


def test_delete_company_success(db_session: Session) -> None:
    """Test deleting a company with no associated leads succeeds."""
    company = create_company(
        db_session,
        CompanyCreate(name="To Be Deleted", owner="Alice"),
    )

    result = delete_company(db_session, company.id)
    assert result is True
    assert get_company(db_session, company.id) is None


def test_delete_company_blocked_if_leads_exist(db_session: Session) -> None:
    """Test deleting a company with associated leads raises CompanyDeleteBlockedError."""
    company = create_company(
        db_session,
        CompanyCreate(name="Company With Leads", owner="Alice"),
    )

    lead = Lead(
        name="Lead 1",
        status="New",
        company_id=company.id,
        owner="Alice",
    )
    db_session.add(lead)
    db_session.commit()

    with pytest.raises(CompanyDeleteBlockedError) as exc_info:
        delete_company(db_session, company.id)

    assert f"Cannot delete company {company.id}" in str(exc_info.value)
    # Ensure company still exists
    assert get_company(db_session, company.id) is not None


def test_delete_company_not_found(db_session: Session) -> None:
    """Test deleting a non-existent company raises CompanyNotFoundError."""
    with pytest.raises(CompanyNotFoundError):
        delete_company(db_session, 99999)
