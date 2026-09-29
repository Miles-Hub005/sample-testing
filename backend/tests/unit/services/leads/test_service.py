"""Unit tests for leads domain service."""

from datetime import date, datetime
import pytest
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models.base import Base
from models.companies import create_company
from models.contacts import create_contact
from models.leads import LeadStatus
from services.leads.exceptions import (
    InvalidForeignKeyError,
    LeadNotFoundError,
    LeadValidationError,
)
from services.leads.service import (
    create_lead,
    delete_lead,
    get_lead,
    get_lead_by_id,
    get_leads_by_company,
    get_leads_by_contact,
    get_leads_by_status,
    get_pipeline_by_status,
    get_pipeline_summary,
    list_leads,
    search_and_paginate_leads,
    update_lead,
)


class DummyLeadModel(BaseModel):
    title: str
    value: float = 1000.0
    status: str = "Qualified"
    company_id: int


@pytest.fixture
def db_session() -> Session:
    """Fixture providing an in-memory SQLite database session."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_create_lead_success_without_associations(db_session: Session) -> None:
    """Test creating a lead without an associated company or contact (FR-3, Edge Case 2)."""
    close_dt = date(2026, 12, 31)
    lead = create_lead(
        db_session,
        title="Enterprise Expansion",
        value=50000.0,
        status="Prospecting",
        expected_close_date=close_dt,
        owner="Alice",
    )

    assert lead.id is not None
    assert lead.title == "Enterprise Expansion"
    assert lead.value == 50000.0
    assert lead.status == "Prospecting"
    assert lead.company_id is None
    assert lead.contact_id is None
    assert lead.expected_close_date == close_dt
    assert lead.owner == "Alice"


def test_create_lead_success_with_company_and_contact(db_session: Session) -> None:
    """Test creating a lead with valid company and contact associations."""
    company = create_company(db_session, name="Acme Corp")
    contact = create_contact(db_session, name="Jane Doe", email="jane@acme.com", company_id=company.id)

    lead = create_lead(
        db_session,
        title="Acme Q4 Deal",
        company_id=company.id,
        contact_id=contact.id,
        value=15000.0,
        status=LeadStatus.QUALIFIED,
    )

    assert lead.id is not None
    assert lead.company_id == company.id
    assert lead.contact_id == contact.id
    assert lead.value == 15000.0
    assert lead.status == "Qualified"


def test_create_lead_from_model_and_dict(db_session: Session) -> None:
    """Test creating a lead from a Pydantic model or dictionary."""
    company = create_company(db_session, name="Beta Inc")

    # Model input
    model_input = DummyLeadModel(
        title="Model Opportunity",
        value=25000.0,
        company_id=company.id,
    )
    lead1 = create_lead(db_session, lead_in=model_input)
    assert lead1.title == "Model Opportunity"
    assert lead1.value == 25000.0
    assert lead1.company_id == company.id

    # Dict input with name alias
    dict_input = {
        "name": "Dict Opportunity",
        "value": 12000.0,
        "status": "Negotiation",
        "company_id": company.id,
    }
    lead2 = create_lead(db_session, lead_in=dict_input)
    assert lead2.title == "Dict Opportunity"
    assert lead2.status == "Negotiation"


def test_create_lead_validation_empty_title(db_session: Session) -> None:
    """Test creating a lead with missing or empty title raises LeadValidationError."""
    with pytest.raises(LeadValidationError):
        create_lead(db_session, title="")

    with pytest.raises(LeadValidationError):
        create_lead(db_session, title="   ")

    with pytest.raises(LeadValidationError):
        create_lead(db_session, lead_in={"title": None})


def test_create_lead_validation_negative_value(db_session: Session) -> None:
    """Test creating a lead with negative or non-numeric value raises LeadValidationError (Edge Case 8)."""
    with pytest.raises(LeadValidationError) as exc_info:
        create_lead(db_session, title="Refund Lead", value=-500.0)
    assert "cannot be negative" in str(exc_info.value)

    with pytest.raises(LeadValidationError) as exc_info2:
        create_lead(db_session, title="Invalid Value Lead", value="not-a-number")
    assert "Invalid lead value" in str(exc_info2.value)


def test_create_lead_validation_invalid_status(db_session: Session) -> None:
    """Test creating a lead with invalid status stage raises LeadValidationError."""
    with pytest.raises(LeadValidationError) as exc_info:
        create_lead(db_session, title="Test Lead", status="NotAValidStatus")
    assert "Invalid lead status" in str(exc_info.value)


def test_create_lead_invalid_company_fk(db_session: Session) -> None:
    """Test creating a lead with non-existent company_id raises InvalidForeignKeyError."""
    with pytest.raises(InvalidForeignKeyError) as exc_info:
        create_lead(db_session, title="Orphan Lead", company_id=99999)
    assert "Company ID 99999 does not exist" in str(exc_info.value)


def test_create_lead_invalid_contact_fk(db_session: Session) -> None:
    """Test creating a lead with non-existent contact_id raises InvalidForeignKeyError."""
    with pytest.raises(InvalidForeignKeyError) as exc_info:
        create_lead(db_session, title="Orphan Lead", contact_id=99999)
    assert "Contact ID 99999 does not exist" in str(exc_info.value)


def test_get_lead_queries(db_session: Session) -> None:
    """Test retrieving leads by ID, company, contact, and status."""
    company = create_company(db_session, name="Stark Tech")
    contact = create_contact(db_session, name="Tony Stark", email="tony@stark.com", company_id=company.id)

    lead1 = create_lead(
        db_session,
        title="Arc Reactor License",
        company_id=company.id,
        contact_id=contact.id,
        status="Prospecting",
    )
    lead2 = create_lead(
        db_session,
        title="Defense Contract",
        company_id=company.id,
        status="Closed Won",
    )

    assert get_lead(db_session, lead1.id) is not None
    assert get_lead_by_id(db_session, lead2.id) is not None
    assert get_lead(db_session, 88888) is None

    company_leads = get_leads_by_company(db_session, company.id)
    assert len(company_leads) == 2

    contact_leads = get_leads_by_contact(db_session, contact.id)
    assert len(contact_leads) == 1
    assert contact_leads[0].id == lead1.id

    prospecting_leads = get_leads_by_status(db_session, "Prospecting")
    assert len(prospecting_leads) == 1
    assert prospecting_leads[0].id == lead1.id


def test_list_and_paginate_leads(db_session: Session) -> None:
    """Test list_leads and search_and_paginate_leads."""
    create_lead(db_session, title="Zulu Lead", status="Prospecting", value=100.0)
    create_lead(db_session, title="Alpha Lead", status="Qualified", value=200.0)
    create_lead(db_session, title="Beta Lead", status="Prospecting", value=300.0)

    leads = list_leads(db_session)
    assert len(leads) == 3

    # list_leads with status filter
    filtered = list_leads(db_session, status="Prospecting")
    assert isinstance(filtered, tuple)
    f_items, f_total = filtered
    assert f_total == 2

    # Search & paginate
    items, total = search_and_paginate_leads(
        db_session, search="Lead", status="Prospecting", page=1, page_size=10
    )
    assert total == 2
    assert len(items) == 2


def test_get_pipeline_summary(db_session: Session) -> None:
    """Test pipeline totals by status service function."""
    create_lead(db_session, title="Lead A", value=1000.0, status="Prospecting")
    create_lead(db_session, title="Lead B", value=2000.0, status="Negotiation")

    pipeline1 = get_pipeline_by_status(db_session)
    pipeline2 = get_pipeline_summary(db_session)

    assert len(pipeline1) == 5
    assert len(pipeline2) == 5
    p_dict = {p["status"]: p["total_value"] for p in pipeline1}
    assert p_dict["Prospecting"] == 1000.0
    assert p_dict["Negotiation"] == 2000.0


def test_update_lead_success_and_status_transitions(db_session: Session) -> None:
    """Test updating lead fields and status transitions."""
    company = create_company(db_session, name="Wayne Enterprises")
    lead = create_lead(db_session, title="Initial Title", value=1000.0, status="Prospecting")

    # Status transition Prospecting -> Negotiation
    updated = update_lead(
        db_session,
        lead.id,
        title="Renamed Title",
        status="Negotiation",
        value=5000.0,
        company_id=company.id,
    )

    assert updated.title == "Renamed Title"
    assert updated.status == "Negotiation"
    assert updated.value == 5000.0
    assert updated.company_id == company.id

    # Status transition Negotiation -> Closed Won
    closed = update_lead(db_session, lead.id, status=LeadStatus.CLOSED_WON)
    assert closed.status == "Closed Won"


def test_update_lead_validation_errors(db_session: Session) -> None:
    """Test validation errors on update_lead."""
    lead = create_lead(db_session, title="Valid Lead", value=100.0, status="Prospecting")

    with pytest.raises(LeadValidationError):
        update_lead(db_session, lead.id, title="")

    with pytest.raises(LeadValidationError):
        update_lead(db_session, lead.id, value=-50.0)

    with pytest.raises(LeadValidationError):
        update_lead(db_session, lead.id, status="BadStatus")

    with pytest.raises(InvalidForeignKeyError):
        update_lead(db_session, lead.id, company_id=99999)

    with pytest.raises(InvalidForeignKeyError):
        update_lead(db_session, lead.id, contact_id=99999)


def test_update_lead_not_found(db_session: Session) -> None:
    """Test updating a non-existent lead raises LeadNotFoundError."""
    with pytest.raises(LeadNotFoundError):
        update_lead(db_session, 99999, title="NonExistent")


def test_delete_lead_success(db_session: Session) -> None:
    """Test deleting an existing lead."""
    lead = create_lead(db_session, title="Lead To Delete")
    assert delete_lead(db_session, lead.id) is True
    assert get_lead(db_session, lead.id) is None


def test_delete_lead_not_found(db_session: Session) -> None:
    """Test deleting a non-existent lead raises LeadNotFoundError."""
    with pytest.raises(LeadNotFoundError):
        delete_lead(db_session, 99999)
