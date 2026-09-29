"""Unit tests for Lead service CRUD operations and company_id FK validation."""

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models.base import Base
from services.crm.companies import create_company
from services.crm.exceptions import InvalidForeignKeyError, LeadNotFoundError
from services.crm.leads import (
    create_lead,
    delete_lead,
    get_lead,
    list_leads,
    update_lead,
)
from services.crm.schemas import CompanyCreate, LeadCreate, LeadUpdate


@pytest.fixture
def db_session() -> Session:
    """Fixture providing an in-memory SQLite SQLAlchemy session."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_create_lead_success_without_company(db_session: Session) -> None:
    """Test creating a lead without an associated company."""
    lead_in = LeadCreate(
        name="Qualified Prospect",
        status="New",
        owner="Alice",
    )
    lead = create_lead(db_session, lead_in)

    assert lead.id is not None
    assert lead.name == "Qualified Prospect"
    assert lead.status == "New"
    assert lead.owner == "Alice"
    assert lead.company_id is None
    assert lead.created_at is not None
    assert lead.updated_at is not None


def test_create_lead_success_with_company(db_session: Session) -> None:
    """Test creating a lead with a valid associated company."""
    company = create_company(
        db_session,
        CompanyCreate(name="Acme Corp", owner="Alice"),
    )

    lead_in = LeadCreate(
        name="Enterprise Deal",
        status="Contacted",
        owner="Alice",
        company_id=company.id,
    )
    lead = create_lead(db_session, lead_in)

    assert lead.id is not None
    assert lead.company_id == company.id


def test_create_lead_dict_input(db_session: Session) -> None:
    """Test creating a lead passing a dict."""
    lead_data = {
        "name": "Dict Lead",
        "status": "Qualified",
        "owner": "Bob",
    }
    lead = create_lead(db_session, lead_data)
    assert lead.id is not None
    assert lead.name == "Dict Lead"
    assert lead.status == "Qualified"


def test_create_lead_invalid_company_fk(db_session: Session) -> None:
    """Test creating a lead with non-existent company_id raises InvalidForeignKeyError."""
    lead_in = LeadCreate(
        name="Orphan Lead",
        status="New",
        owner="Alice",
        company_id=99999,
    )
    with pytest.raises(InvalidForeignKeyError) as exc_info:
        create_lead(db_session, lead_in)
    assert "Company ID 99999 does not exist" in str(exc_info.value)


def test_get_lead(db_session: Session) -> None:
    """Test retrieving a lead by ID."""
    created = create_lead(
        db_session,
        LeadCreate(name="Lead 1", status="New", owner="Alice"),
    )

    fetched = get_lead(db_session, created.id)
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.name == "Lead 1"

    non_existent = get_lead(db_session, 88888)
    assert non_existent is None


def test_list_leads_sorting_and_pagination(db_session: Session) -> None:
    """Test listing leads sorted by name A-Z with pagination."""
    create_lead(db_session, LeadCreate(name="Zebra Deal", status="New", owner="Alice"))
    create_lead(db_session, LeadCreate(name="Alpha Opportunity", status="New", owner="Alice"))
    create_lead(db_session, LeadCreate(name="Beta Prospect", status="New", owner="Alice"))

    all_leads = list_leads(db_session)
    assert len(all_leads) == 3
    assert [l.name for l in all_leads] == ["Alpha Opportunity", "Beta Prospect", "Zebra Deal"]

    paged = list_leads(db_session, skip=1, limit=1)
    assert len(paged) == 1
    assert paged[0].name == "Beta Prospect"


def test_update_lead_success(db_session: Session) -> None:
    """Test updating an existing lead's fields."""
    company1 = create_company(db_session, CompanyCreate(name="Company 1", owner="Alice"))
    company2 = create_company(db_session, CompanyCreate(name="Company 2", owner="Alice"))

    lead = create_lead(
        db_session,
        LeadCreate(name="Original Name", status="New", owner="Alice", company_id=company1.id),
    )

    updated = update_lead(
        db_session,
        lead.id,
        LeadUpdate(name="Updated Name", status="Proposal", company_id=company2.id),
    )

    assert updated.name == "Updated Name"
    assert updated.status == "Proposal"
    assert updated.company_id == company2.id
    assert updated.owner == "Alice"  # Unchanged field preserved


def test_update_lead_dict_input(db_session: Session) -> None:
    """Test updating a lead using a dictionary."""
    lead = create_lead(
        db_session,
        LeadCreate(name="Lead Dict", status="New", owner="Alice"),
    )

    updated = update_lead(db_session, lead.id, {"status": "Closed Won"})
    assert updated.status == "Closed Won"


def test_update_lead_invalid_company_fk(db_session: Session) -> None:
    """Test updating a lead with a non-existent company_id raises InvalidForeignKeyError."""
    lead = create_lead(
        db_session,
        LeadCreate(name="Valid Lead", status="New", owner="Alice"),
    )

    with pytest.raises(InvalidForeignKeyError) as exc_info:
        update_lead(
            db_session,
            lead.id,
            LeadUpdate(company_id=99999),
        )
    assert "Company ID 99999 does not exist" in str(exc_info.value)


def test_update_lead_not_found(db_session: Session) -> None:
    """Test updating a non-existent lead raises LeadNotFoundError."""
    with pytest.raises(LeadNotFoundError):
        update_lead(db_session, 99999, LeadUpdate(name="Ghost Lead"))


def test_delete_lead_success(db_session: Session) -> None:
    """Test deleting a lead."""
    lead = create_lead(
        db_session,
        LeadCreate(name="To Delete", status="New", owner="Alice"),
    )

    result = delete_lead(db_session, lead.id)
    assert result is True
    assert get_lead(db_session, lead.id) is None


def test_delete_lead_not_found(db_session: Session) -> None:
    """Test deleting a non-existent lead raises LeadNotFoundError."""
    with pytest.raises(LeadNotFoundError):
        delete_lead(db_session, 99999)
