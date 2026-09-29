"""Unit tests for Interaction service operations, append-only enforcement, FK validation, and sorting."""

from datetime import datetime, timedelta, timezone
import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models.base import Base
from services.crm.companies import create_company
from services.crm.contacts import create_contact
from services.crm.exceptions import InvalidForeignKeyError
from services.crm.interactions import (
    create_interaction,
    get_interaction,
    list_interactions,
)
from services.crm.leads import create_lead
from services.crm.schemas import (
    CompanyCreate,
    ContactCreate,
    InteractionCreate,
    LeadCreate,
)


@pytest.fixture
def db_session() -> Session:
    """Fixture providing an in-memory SQLite SQLAlchemy session."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_create_interaction_success_company(db_session: Session) -> None:
    """Test creating an interaction linked to a company."""
    company = create_company(
        db_session, CompanyCreate(name="Acme Corp", owner="Alice")
    )
    now = datetime.now(timezone.utc)

    interaction_in = InteractionCreate(
        notes="Introductory phone call",
        timestamp=now,
        company_id=company.id,
    )
    interaction = create_interaction(db_session, interaction_in)

    assert interaction.id is not None
    assert interaction.notes == "Introductory phone call"
    assert interaction.company_id == company.id
    assert interaction.contact_id is None
    assert interaction.lead_id is None
    assert interaction.created_at is not None


def test_create_interaction_success_dict_input(db_session: Session) -> None:
    """Test creating an interaction using dict input."""
    contact = create_contact(
        db_session,
        ContactCreate(name="John Doe", email="john@example.com", owner="Alice"),
    )
    now = datetime.now(timezone.utc)

    interaction_dict = {
        "notes": "Follow-up email sent",
        "timestamp": now.isoformat(),
        "contact_id": contact.id,
    }
    interaction = create_interaction(db_session, interaction_dict)

    assert interaction.id is not None
    assert interaction.notes == "Follow-up email sent"
    assert interaction.contact_id == contact.id


def test_create_interaction_no_entity_link_raises_validation_error(
    db_session: Session,
) -> None:
    """Test that creating an interaction without any entity link raises ValidationError."""
    now = datetime.now(timezone.utc)

    with pytest.raises(ValidationError) as exc_info:
        create_interaction(
            db_session,
            {"notes": "Orphan note", "timestamp": now.isoformat()},
        )
    assert "at least one entity" in str(exc_info.value)


def test_create_interaction_invalid_company_fk(db_session: Session) -> None:
    """Test that creating an interaction with non-existent company_id raises InvalidForeignKeyError."""
    now = datetime.now(timezone.utc)

    interaction_in = InteractionCreate(
        notes="Call with unknown company",
        timestamp=now,
        company_id=999,
    )
    with pytest.raises(InvalidForeignKeyError) as exc_info:
        create_interaction(db_session, interaction_in)
    assert "Company ID 999 does not exist" in str(exc_info.value)


def test_create_interaction_invalid_contact_fk(db_session: Session) -> None:
    """Test that creating an interaction with non-existent contact_id raises InvalidForeignKeyError."""
    now = datetime.now(timezone.utc)

    interaction_in = InteractionCreate(
        notes="Call with unknown contact",
        timestamp=now,
        contact_id=888,
    )
    with pytest.raises(InvalidForeignKeyError) as exc_info:
        create_interaction(db_session, interaction_in)
    assert "Contact ID 888 does not exist" in str(exc_info.value)


def test_create_interaction_invalid_lead_fk(db_session: Session) -> None:
    """Test that creating an interaction with non-existent lead_id raises InvalidForeignKeyError."""
    now = datetime.now(timezone.utc)

    interaction_in = InteractionCreate(
        notes="Call with unknown lead",
        timestamp=now,
        lead_id=777,
    )
    with pytest.raises(InvalidForeignKeyError) as exc_info:
        create_interaction(db_session, interaction_in)
    assert "Lead ID 777 does not exist" in str(exc_info.value)


def test_get_interaction(db_session: Session) -> None:
    """Test get_interaction by ID."""
    lead = create_lead(
        db_session, LeadCreate(name="Big Deal", status="New", owner="Bob")
    )
    now = datetime.now(timezone.utc)

    created = create_interaction(
        db_session,
        InteractionCreate(
            notes="Initial discovery call", timestamp=now, lead_id=lead.id
        ),
    )

    retrieved = get_interaction(db_session, created.id)
    assert retrieved is not None
    assert retrieved.id == created.id
    assert retrieved.notes == "Initial discovery call"

    non_existent = get_interaction(db_session, 9999)
    assert non_existent is None


def test_list_interactions_timestamp_descending_sort(db_session: Session) -> None:
    """Test list_interactions returns interactions sorted by timestamp descending."""
    company = create_company(
        db_session, CompanyCreate(name="Acme Corp", owner="Alice")
    )

    base_time = datetime.now(timezone.utc)
    t1 = base_time - timedelta(hours=3)
    t2 = base_time - timedelta(hours=1)
    t3 = base_time

    # Create interactions out of order
    i1 = create_interaction(
        db_session,
        InteractionCreate(notes="Earliest note", timestamp=t1, company_id=company.id),
    )
    i3 = create_interaction(
        db_session,
        InteractionCreate(notes="Latest note", timestamp=t3, company_id=company.id),
    )
    i2 = create_interaction(
        db_session,
        InteractionCreate(
            notes="Middle note", timestamp=t2, company_id=company.id
        ),
    )

    results = list_interactions(db_session)
    assert len(results) == 3
    # Must be ordered timestamp descending: i3 (t3), i2 (t2), i1 (t1)
    assert [i.id for i in results] == [i3.id, i2.id, i1.id]


def test_list_interactions_pagination_and_filters(db_session: Session) -> None:
    """Test list_interactions with pagination skip/limit and entity filters."""
    company1 = create_company(
        db_session, CompanyCreate(name="Company 1", owner="Alice")
    )
    company2 = create_company(
        db_session, CompanyCreate(name="Company 2", owner="Bob")
    )

    now = datetime.now(timezone.utc)
    create_interaction(
        db_session,
        InteractionCreate(notes="Comp 1 note", timestamp=now, company_id=company1.id),
    )
    create_interaction(
        db_session,
        InteractionCreate(notes="Comp 2 note", timestamp=now, company_id=company2.id),
    )

    comp1_list = list_interactions(db_session, company_id=company1.id)
    assert len(comp1_list) == 1
    assert comp1_list[0].notes == "Comp 1 note"

    limited_list = list_interactions(db_session, limit=1)
    assert len(limited_list) == 1


def test_append_only_enforcement() -> None:
    """Verify that update_interaction and delete_interaction are not exported/implemented."""
    import services.crm.interactions as interactions_module

    assert not hasattr(interactions_module, "update_interaction")
    assert not hasattr(interactions_module, "delete_interaction")
