"""Unit tests for interactions service CRUD operations, validation, type enum checks, and association linking."""

from datetime import date, datetime, timedelta, timezone
import pytest
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models.base import Base
from models.companies import create_company
from models.contacts import create_contact
from models.interactions import InteractionType
from models.leads import create_lead
from services.interactions.exceptions import (
    InteractionNotFoundError,
    InteractionValidationError,
    InvalidForeignKeyError,
)
from services.interactions.service import (
    create_interaction,
    delete_interaction,
    get_interaction,
    get_interaction_by_id,
    get_interactions_by_company,
    get_interactions_by_contact,
    get_interactions_by_lead,
    get_interactions_by_type,
    get_recent_interactions,
    list_interactions,
    search_and_paginate_interactions,
    update_interaction,
)


class DummyInteractionModel(BaseModel):
    summary: str
    date: str
    type: str
    company_id: int


@pytest.fixture
def db_session() -> Session:
    """Fixture providing an in-memory SQLite database session."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_create_interaction_success(db_session: Session) -> None:
    """Test creating an interaction with valid required fields."""
    now = datetime.now(timezone.utc)
    interaction = create_interaction(
        db_session,
        summary="Initial discovery call",
        date=now,
        type="call",
        owner="Alice",
    )

    assert interaction.id is not None
    assert interaction.summary == "Initial discovery call"
    assert interaction.type == "call"
    assert interaction.owner == "Alice"
    assert interaction.company_id is None
    assert interaction.contact_id is None
    assert interaction.lead_id is None


def test_create_interaction_with_alias_and_default_type(db_session: Session) -> None:
    """Test creating an interaction using notes alias and default type."""
    now = datetime.now(timezone.utc)
    interaction = create_interaction(
        db_session,
        notes="Quick note on client requirement",
        date=now,
    )

    assert interaction.id is not None
    assert interaction.summary == "Quick note on client requirement"
    assert interaction.type == "note"


def test_create_interaction_with_pydantic_model(db_session: Session) -> None:
    """Test creating an interaction from a Pydantic model."""
    company = create_company(db_session, name="Acme Corp")
    pydantic_in = DummyInteractionModel(
        summary="Quarterly review meeting",
        date="2026-10-15T14:00:00Z",
        type="meeting",
        company_id=company.id,
    )

    interaction = create_interaction(db_session, interaction_in=pydantic_in)
    assert interaction.id is not None
    assert interaction.summary == "Quarterly review meeting"
    assert interaction.type == "meeting"
    assert interaction.company_id == company.id


def test_create_interaction_missing_summary(db_session: Session) -> None:
    """Test creating an interaction without summary raises InteractionValidationError."""
    now = datetime.now(timezone.utc)
    with pytest.raises(InteractionValidationError, match="summary is required"):
        create_interaction(db_session, summary="", date=now)

    with pytest.raises(InteractionValidationError, match="summary is required"):
        create_interaction(db_session, summary=None, date=now)


def test_create_interaction_missing_date(db_session: Session) -> None:
    """Test creating an interaction without date raises InteractionValidationError."""
    with pytest.raises(InteractionValidationError, match="date is required"):
        create_interaction(db_session, summary="Call logged", date=None)

    with pytest.raises(InteractionValidationError, match="date is required"):
        create_interaction(db_session, summary="Call logged", date="")


def test_create_interaction_date_types_and_aliases(db_session: Session) -> None:
    """Test creating interaction with date object, naive datetime, and title/name aliases."""
    # Date object
    d_obj = date(2026, 10, 20)
    i1 = create_interaction(db_session, title="Call title", date=d_obj, type="call")
    assert i1.id is not None
    assert i1.summary == "Call title"

    # Naive datetime
    naive_dt = datetime(2026, 10, 20, 10, 0)
    i2 = create_interaction(db_session, name="Call name", date=naive_dt, type="email")
    assert i2.id is not None
    assert i2.summary == "Call name"
    assert i2.date.tzinfo is not None

    # Invalid date type (e.g. int)
    with pytest.raises(InteractionValidationError, match="Invalid interaction date"):
        create_interaction(db_session, summary="Call summary", date=12345)


def test_create_interaction_invalid_type_enum(db_session: Session) -> None:
    """Test creating an interaction with invalid type enum raises InteractionValidationError."""
    now = datetime.now(timezone.utc)
    with pytest.raises(InteractionValidationError, match="Invalid interaction type"):
        create_interaction(db_session, summary="Call logged", date=now, type="invalid_type")


def test_create_interaction_valid_foreign_keys(db_session: Session) -> None:
    """Test creating an interaction linked to existing company, contact, and lead."""
    company = create_company(db_session, name="Beta Corp")
    contact = create_contact(db_session, name="Bob", email="bob@beta.com")
    lead = create_lead(db_session, title="Beta Deal", value=1000)
    now = datetime.now(timezone.utc)

    interaction = create_interaction(
        db_session,
        summary="Demo meeting with client team",
        date=now,
        type=InteractionType.MEETING,
        company_id=company.id,
        contact_id=contact.id,
        lead_id=lead.id,
    )

    assert interaction.company_id == company.id
    assert interaction.contact_id == contact.id
    assert interaction.lead_id == lead.id


def test_create_interaction_invalid_foreign_keys(db_session: Session) -> None:
    """Test creating an interaction with non-existent FK raises InvalidForeignKeyError."""
    now = datetime.now(timezone.utc)

    with pytest.raises(InvalidForeignKeyError, match="Company ID 9999 does not exist"):
        create_interaction(db_session, summary="Call", date=now, company_id=9999)

    with pytest.raises(InvalidForeignKeyError, match="Contact ID 9999 does not exist"):
        create_interaction(db_session, summary="Call", date=now, contact_id=9999)

    with pytest.raises(InvalidForeignKeyError, match="Lead ID 9999 does not exist"):
        create_interaction(db_session, summary="Call", date=now, lead_id=9999)


def test_get_interaction_by_id(db_session: Session) -> None:
    """Test getting interaction by ID."""
    now = datetime.now(timezone.utc)
    created = create_interaction(db_session, summary="Email follow-up", date=now, type="email")

    found = get_interaction(db_session, created.id)
    assert found is not None
    assert found.id == created.id
    assert found.summary == "Email follow-up"

    found_alias = get_interaction_by_id(db_session, created.id)
    assert found_alias is not None
    assert found_alias.id == created.id

    assert get_interaction(db_session, 9999) is None


def test_update_interaction_success(db_session: Session) -> None:
    """Test updating interaction fields successfully."""
    now = datetime.now(timezone.utc)
    interaction = create_interaction(db_session, summary="Original summary", date=now, type="note")

    updated = update_interaction(
        db_session,
        interaction.id,
        summary="Updated summary",
        type="call",
    )

    assert updated.summary == "Updated summary"
    assert updated.type == "call"


def test_update_interaction_not_found(db_session: Session) -> None:
    """Test updating non-existent interaction raises InteractionNotFoundError."""
    with pytest.raises(InteractionNotFoundError, match="ID 9999 not found"):
        update_interaction(db_session, 9999, summary="Updated summary")


def test_update_interaction_validation_errors(db_session: Session) -> None:
    """Test updating with invalid empty summary, date, type, or FK."""
    now = datetime.now(timezone.utc)
    interaction = create_interaction(db_session, summary="Valid interaction", date=now, type="call")

    with pytest.raises(InteractionValidationError, match="summary is required"):
        update_interaction(db_session, interaction.id, summary="")

    with pytest.raises(InteractionValidationError, match="date cannot be set to empty"):
        update_interaction(db_session, interaction.id, date="")

    with pytest.raises(InteractionValidationError, match="type cannot be set to empty"):
        update_interaction(db_session, interaction.id, type="")

    with pytest.raises(InteractionValidationError, match="Invalid interaction type"):
        update_interaction(db_session, interaction.id, type="invalid_type")

    with pytest.raises(InvalidForeignKeyError, match="Company ID 9999 does not exist"):
        update_interaction(db_session, interaction.id, company_id=9999)


def test_delete_interaction(db_session: Session) -> None:
    """Test deleting interaction."""
    now = datetime.now(timezone.utc)
    interaction = create_interaction(db_session, summary="Temporary note", date=now)

    result = delete_interaction(db_session, interaction.id)
    assert result is True
    assert get_interaction(db_session, interaction.id) is None

    with pytest.raises(InteractionNotFoundError, match="ID 9999 not found"):
        delete_interaction(db_session, 9999)


def test_list_and_search_interactions(db_session: Session) -> None:
    """Test listing, filtering, searching, and paginating interactions."""
    now = datetime.now(timezone.utc)
    company = create_company(db_session, name="Search Corp")
    contact = create_contact(db_session, name="Charlie", email="charlie@search.com")
    lead = create_lead(db_session, title="Search Lead", value=5000)

    i1 = create_interaction(
        db_session, summary="First call", date=now - timedelta(days=2), type="call", company_id=company.id
    )
    i2 = create_interaction(
        db_session, summary="Email reply", date=now - timedelta(days=1), type="email", contact_id=contact.id
    )
    i3 = create_interaction(
        db_session, summary="Strategy meeting", date=now, type="meeting", lead_id=lead.id
    )

    # list_interactions simple
    all_items = list_interactions(db_session)
    assert len(all_items) == 3

    # list_interactions by type_filter
    calls = list_interactions(db_session, type_filter="call")
    assert len(calls) == 1
    assert calls[0].id == i1.id

    # get_recent_interactions
    recent = get_recent_interactions(db_session, limit=2)
    assert len(recent) == 2
    assert recent[0].id == i3.id

    # get by entity
    company_items = get_interactions_by_company(db_session, company.id)
    assert len(company_items) == 1
    assert company_items[0].id == i1.id

    contact_items = get_interactions_by_contact(db_session, contact.id)
    assert len(contact_items) == 1
    assert contact_items[0].id == i2.id

    lead_items = get_interactions_by_lead(db_session, lead.id)
    assert len(lead_items) == 1
    assert lead_items[0].id == i3.id

    type_items = get_interactions_by_type(db_session, "meeting")
    assert len(type_items) == 1
    assert type_items[0].id == i3.id

    # search_and_paginate_interactions
    items, total = search_and_paginate_interactions(
        db_session, search="Strategy", page=1, page_size=10
    )
    assert total == 1
    assert items[0].id == i3.id
