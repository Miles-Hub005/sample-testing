"""Unit tests for CRM Pydantic schemas."""

from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from services.crm.schemas import (
    CompanyCreate,
    CompanyResponse,
    CompanyUpdate,
    ContactCreate,
    ContactResponse,
    ContactUpdate,
    InteractionCreate,
    InteractionResponse,
    LeadCreate,
    LeadResponse,
    LeadUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)


def test_company_schemas() -> None:
    """Test Company creation, update, and response schemas."""
    # Valid create
    company_data = CompanyCreate(
        name="Acme Corp", email="info@acme.com", owner="Alice"
    )
    assert company_data.name == "Acme Corp"
    assert company_data.email == "info@acme.com"
    assert company_data.owner == "Alice"

    # Optional email omitted
    company_no_email = CompanyCreate(name="Globex", owner="Bob")
    assert company_no_email.email is None

    # Invalid email format
    with pytest.raises(ValidationError) as exc_info:
        CompanyCreate(name="Fail Corp", email="invalid-email", owner="Alice")
    assert "Invalid email format" in str(exc_info.value)

    # Valid update
    update = CompanyUpdate(name="Acme Corp Updated")
    assert update.name == "Acme Corp Updated"
    assert update.email is None

    # Company response attributes
    now = datetime.now(timezone.utc)
    resp = CompanyResponse(
        id=1,
        name="Acme Corp",
        email="info@acme.com",
        owner="Alice",
        created_at=now,
        updated_at=now,
    )
    assert resp.id == 1


def test_contact_schemas() -> None:
    """Test Contact creation, update, and response schemas."""
    # Valid create
    contact = ContactCreate(
        name="John Doe",
        email="john@example.com",
        owner="Alice",
        company_id=1,
    )
    assert contact.name == "John Doe"
    assert contact.email == "john@example.com"
    assert contact.company_id == 1

    # Invalid email format
    with pytest.raises(ValidationError) as exc_info:
        ContactCreate(name="Bad Email", email="bademail", owner="Alice")
    assert "Invalid email format" in str(exc_info.value)

    # Missing email (required)
    with pytest.raises(ValidationError):
        ContactCreate.model_validate(
            {"name": "No Email", "owner": "Alice"}
        )

    # Contact response
    now = datetime.now(timezone.utc)
    resp = ContactResponse(
        id=10,
        name="John Doe",
        email="john@example.com",
        owner="Alice",
        company_id=1,
        created_at=now,
        updated_at=now,
    )
    assert resp.id == 10


def test_lead_schemas() -> None:
    """Test Lead creation, update, and response schemas."""
    lead = LeadCreate(
        name="New Lead", status="Qualified", owner="Bob", company_id=2
    )
    assert lead.name == "New Lead"
    assert lead.status == "Qualified"

    update = LeadUpdate(status="Closed-Won")
    assert update.status == "Closed-Won"

    now = datetime.now(timezone.utc)
    resp = LeadResponse(
        id=5,
        name="New Lead",
        status="Qualified",
        owner="Bob",
        company_id=2,
        created_at=now,
        updated_at=now,
    )
    assert resp.id == 5


def test_task_schemas() -> None:
    """Test Task creation, update, and response schemas."""
    now = datetime.now(timezone.utc)
    task = TaskCreate(
        title="Follow up call",
        owner="Charlie",
        due_date=now,
        company_id=1,
    )
    assert task.title == "Follow up call"
    assert task.due_date == now

    update = TaskUpdate(title="Updated Title")
    assert update.title == "Updated Title"

    resp = TaskResponse(
        id=100,
        title="Follow up call",
        owner="Charlie",
        due_date=now,
        company_id=1,
        overdue=True,
        created_at=now,
        updated_at=now,
    )
    assert resp.overdue is True


def test_interaction_schemas() -> None:
    """Test Interaction creation, entity association validator, and response schemas."""
    now = datetime.now(timezone.utc)

    # Valid with company_id
    interaction_company = InteractionCreate(
        notes="Called the client",
        timestamp=now,
        company_id=1,
    )
    assert interaction_company.company_id == 1

    # Valid with contact_id
    interaction_contact = InteractionCreate(
        notes="Emailed contact",
        timestamp=now,
        contact_id=2,
    )
    assert interaction_contact.contact_id == 2

    # Valid with lead_id
    interaction_lead = InteractionCreate(
        notes="Demo presentation",
        timestamp=now,
        lead_id=3,
    )
    assert interaction_lead.lead_id == 3

    # Invalid: no entity linked
    with pytest.raises(ValidationError) as exc_info:
        InteractionCreate(
            notes="Orphan interaction",
            timestamp=now,
        )
    assert "at least one entity" in str(exc_info.value)

    # Interaction response
    resp = InteractionResponse(
        id=50,
        notes="Called the client",
        timestamp=now,
        company_id=1,
        created_at=now,
    )
    assert resp.id == 50
