"""Unit tests for Interaction database model and query helpers."""

from datetime import date, datetime, timedelta, timezone
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session

from models.base import Base
from models.companies import create_company
from models.contacts import create_contact
from models.interactions import (
    Interaction,
    InteractionType,
    _normalize_datetime,
    _normalize_interaction_type,
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
from models.leads import create_lead


def test_interaction_model_fields_and_defaults() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        dt = datetime(2026, 9, 25, 14, 0, tzinfo=timezone.utc)
        interaction = Interaction(
            date=dt,
            type=InteractionType.CALL.value,
            summary="Introductory call with client",
            owner="Alice",
        )
        session.add(interaction)
        session.commit()

        assert interaction.id is not None
        assert interaction.date == dt
        assert interaction.type == "call"
        assert interaction.summary == "Introductory call with client"
        assert interaction.notes == "Introductory call with client"
        assert interaction.title == "Introductory call with client"
        assert interaction.name == "Introductory call with client"
        assert interaction.company_id is None
        assert interaction.contact_id is None
        assert interaction.lead_id is None
        assert interaction.owner == "Alice"
        assert interaction.created_at is not None
        assert interaction.updated_at is not None


def test_interaction_property_setters() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        interaction = Interaction(summary="Initial")
        interaction.notes = "Updated via Notes Property"
        assert interaction.summary == "Updated via Notes Property"

        interaction.title = "Updated via Title Property"
        assert interaction.summary == "Updated via Title Property"

        interaction.name = "Updated via Name Property"
        assert interaction.summary == "Updated via Name Property"


def test_interaction_indexes() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    inspector = inspect(engine)
    indexes = inspector.get_indexes("interactions")
    indexed_columns = [col for idx in indexes for col in idx["column_names"]]

    assert "date" in indexed_columns
    assert "type" in indexed_columns
    assert "summary" in indexed_columns
    assert "company_id" in indexed_columns
    assert "contact_id" in indexed_columns
    assert "lead_id" in indexed_columns


def test_create_and_get_interaction() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        company = create_company(session, name="Acme Corp")
        contact = create_contact(
            session, name="Jane Smith", email="jane@acme.com", company_id=company.id
        )
        lead = create_lead(session, title="Acme Expansion", company_id=company.id)

        now = datetime.now(timezone.utc)
        interaction = create_interaction(
            session,
            date=now,
            type=InteractionType.MEETING,
            summary="Quarterly review meeting",
            company_id=company.id,
            contact_id=contact.id,
            lead_id=lead.id,
            owner="Bob",
        )

        assert interaction.id is not None
        assert interaction.type == "meeting"
        assert interaction.summary == "Quarterly review meeting"
        assert interaction.company_id == company.id
        assert interaction.contact_id == contact.id
        assert interaction.lead_id == lead.id
        assert interaction.owner == "Bob"

        fetched = get_interaction_by_id(session, interaction.id)
        assert fetched is not None
        assert fetched.id == interaction.id

        alias_fetched = get_interaction(session, interaction.id)
        assert alias_fetched is not None
        assert alias_fetched.id == interaction.id


def test_update_and_delete_interaction() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        interaction = create_interaction(
            session,
            type=InteractionType.EMAIL,
            summary="Sent proposal email",
        )

        updated = update_interaction(
            session,
            interaction.id,
            {
                "type": "call",
                "notes": "Followed up proposal via phone call",
            },
        )
        assert updated is not None
        assert updated.type == "call"
        assert updated.summary == "Followed up proposal via phone call"

        # Update non-existent returns None
        assert update_interaction(session, 999, {"type": "note"}) is None

        # Delete
        success = delete_interaction(session, interaction.id)
        assert success is True
        assert get_interaction_by_id(session, interaction.id) is None
        assert delete_interaction(session, interaction.id) is False


def test_get_recent_interactions() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        base_time = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
        for i in range(15):
            create_interaction(
                session,
                date=base_time + timedelta(hours=i),
                type=InteractionType.NOTE if i % 2 == 0 else InteractionType.CALL,
                summary=f"Interaction #{i}",
            )

        recent = get_recent_interactions(session, limit=10)
        assert len(recent) == 10
        # Check order is date descending
        assert recent[0].summary == "Interaction #14"
        assert recent[9].summary == "Interaction #5"


def test_get_interactions_by_entity_and_type() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        c1 = create_company(session, name="Company 1")
        c2 = create_company(session, name="Company 2")
        cnt1 = create_contact(session, name="Contact 1", email="cnt1@test.com")
        lead1 = create_lead(session, title="Lead 1")

        i1 = create_interaction(session, company_id=c1.id, type="call", summary="C1 call")
        i2 = create_interaction(session, company_id=c1.id, type="email", summary="C1 email")
        i3 = create_interaction(session, company_id=c2.id, type="call", summary="C2 call")
        i4 = create_interaction(session, contact_id=cnt1.id, type="meeting", summary="Cnt1 meeting")
        i5 = create_interaction(session, lead_id=lead1.id, type="note", summary="Lead1 note")

        by_c1 = get_interactions_by_company(session, c1.id)
        assert len(by_c1) == 2

        by_cnt1 = get_interactions_by_contact(session, cnt1.id)
        assert len(by_cnt1) == 1
        assert by_cnt1[0].id == i4.id

        by_lead1 = get_interactions_by_lead(session, lead1.id)
        assert len(by_lead1) == 1
        assert by_lead1[0].id == i5.id

        by_call = get_interactions_by_type(session, "call")
        assert len(by_call) == 2


def test_search_and_paginate_interactions() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        c1 = create_company(session, name="Target Co")
        now = datetime.now(timezone.utc)

        create_interaction(
            session,
            company_id=c1.id,
            type="call",
            summary="Discussion about pricing terms",
            date=now - timedelta(days=2),
            owner="Alice",
        )
        create_interaction(
            session,
            company_id=c1.id,
            type="email",
            summary="Sending NDA document",
            date=now - timedelta(days=1),
            owner="Bob",
        )
        create_interaction(
            session,
            type="meeting",
            summary="Onsite demo session",
            date=now,
            owner="Alice",
        )

        # Search by term
        items, total = search_and_paginate_interactions(
            session, search="pricing"
        )
        assert total == 1
        assert items[0].summary == "Discussion about pricing terms"

        # Filter by type
        items, total = search_and_paginate_interactions(
            session, type_filter="email"
        )
        assert total == 1
        assert items[0].type == "email"

        # Filter by company_id
        items, total = search_and_paginate_interactions(
            session, company_id=c1.id
        )
        assert total == 2

        # Sort and paginate
        items, total = search_and_paginate_interactions(
            session, sort_by="date", order="asc", page=1, page_size=2
        )
        assert total == 3
        assert len(items) == 2
        assert items[0].type == "call"  # oldest date first


def test_normalize_helpers() -> None:
    # Test _normalize_datetime
    d_obj = date(2026, 5, 10)
    dt_res = _normalize_datetime(d_obj)
    assert dt_res == datetime(2026, 5, 10, 0, 0, tzinfo=timezone.utc)

    iso_str = "2026-05-10T15:30:00+00:00"
    dt_res_iso = _normalize_datetime(iso_str)
    assert dt_res_iso.year == 2026

    # Test _normalize_interaction_type
    assert _normalize_interaction_type("CALL") == "call"
    assert _normalize_interaction_type("Email") == "email"
    assert _normalize_interaction_type("invalid") == "invalid"  # returns stripped lowercase or fallback
