"""Unit tests for Lead database model and query helpers."""

from datetime import date, datetime, timezone
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session

from models.base import Base
from models.companies import create_company
from models.contacts import create_contact
from models.leads import (
    Lead,
    LeadStatus,
    create_lead,
    delete_lead,
    get_lead,
    get_lead_by_id,
    get_leads_by_company,
    get_leads_by_contact,
    get_leads_by_status,
    list_leads,
    search_and_paginate_leads,
    update_lead,
)


def test_lead_model_fields_and_defaults() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        lead = Lead(
            title="Big Enterprise Deal",
            value=50000.0,
            status=LeadStatus.QUALIFIED.value,
            expected_close_date=date(2026, 12, 31),
        )
        session.add(lead)
        session.commit()

        assert lead.id is not None
        assert lead.title == "Big Enterprise Deal"
        assert lead.name == "Big Enterprise Deal"
        assert lead.value == 50000.0
        assert lead.status == "Qualified"
        assert lead.expected_close_date == date(2026, 12, 31)
        assert lead.company_id is None
        assert lead.contact_id is None
        assert lead.created_at is not None
        assert lead.updated_at is not None


def test_lead_name_property_setter() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        lead = Lead(title="Initial Title")
        lead.name = "New Title via Property"
        assert lead.title == "New Title via Property"
        assert lead.name == "New Title via Property"


def test_lead_indexes() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    inspector = inspect(engine)
    indexes = inspector.get_indexes("leads")
    indexed_columns = [col for idx in indexes for col in idx["column_names"]]

    assert "title" in indexed_columns
    assert "status" in indexed_columns
    assert "company_id" in indexed_columns
    assert "contact_id" in indexed_columns


def test_create_and_get_lead() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        company = create_company(session, name="Acme Inc")
        contact = create_contact(session, name="John Doe", email="john@acme.com", company_id=company.id)

        lead = create_lead(
            session,
            title="Acme Renewal",
            company_id=company.id,
            contact_id=contact.id,
            value=12000.50,
            status=LeadStatus.NEGOTIATION,
            expected_close_date=date(2026, 10, 15),
            owner="Alice",
        )

        assert lead.id is not None
        assert lead.title == "Acme Renewal"
        assert lead.company_id == company.id
        assert lead.contact_id == contact.id
        assert lead.value == 12000.50
        assert lead.status == "Negotiation"
        assert lead.expected_close_date == date(2026, 10, 15)
        assert lead.owner == "Alice"

        fetched = get_lead_by_id(session, lead.id)
        assert fetched is not None
        assert fetched.id == lead.id
        assert fetched.company is not None
        assert fetched.company.name == "Acme Inc"
        assert fetched.contact is not None
        assert fetched.contact.name == "John Doe"

        alias_fetched = get_lead(session, lead.id)
        assert alias_fetched is not None
        assert alias_fetched.id == lead.id

        missing = get_lead_by_id(session, 9999)
        assert missing is None


def test_update_lead() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        lead = create_lead(session, title="Initial Lead", value=1000.0, status=LeadStatus.PROSPECTING)

        updated = update_lead(
            session,
            lead.id,
            {
                "status": LeadStatus.CLOSED_WON,
                "value": 1500.0,
                "expected_close_date": datetime(2026, 11, 1, tzinfo=timezone.utc),
            },
        )

        assert updated is not None
        assert updated.status == "Closed Won"
        assert updated.value == 1500.0
        assert updated.expected_close_date == date(2026, 11, 1)

        missing = update_lead(session, 9999, {"title": "Ghost"})
        assert missing is None


def test_delete_lead() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        lead = create_lead(session, title="To Delete")
        assert delete_lead(session, lead.id) is True
        assert get_lead_by_id(session, lead.id) is None
        assert delete_lead(session, lead.id) is False


def test_list_and_filter_leads() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        c1 = create_company(session, name="Company A")
        c2 = create_company(session, name="Company B")

        l1 = create_lead(session, title="Zebra Deal", status=LeadStatus.PROSPECTING, company_id=c1.id)
        l2 = create_lead(session, title="Alpha Deal", status=LeadStatus.QUALIFIED, company_id=c1.id)
        l3 = create_lead(session, title="Beta Deal", status=LeadStatus.PROSPECTING, company_id=c2.id)

        all_leads = list_leads(session)
        assert len(all_leads) == 3
        assert [l.title for l in all_leads] == ["Alpha Deal", "Beta Deal", "Zebra Deal"]

        prospecting_leads = list_leads(session, status=LeadStatus.PROSPECTING)
        assert len(prospecting_leads) == 2
        assert [l.title for l in prospecting_leads] == ["Beta Deal", "Zebra Deal"]

        by_status = get_leads_by_status(session, "Qualified")
        assert len(by_status) == 1
        assert by_status[0].id == l2.id

        by_company = get_leads_by_company(session, c1.id)
        assert len(by_company) == 2
        assert [l.title for l in by_company] == ["Alpha Deal", "Zebra Deal"]


def test_search_and_paginate_leads() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        c = create_company(session, name="Corp")
        create_lead(session, title="Alpha Opportunity", value=100.0, status=LeadStatus.PROSPECTING, company_id=c.id)
        create_lead(session, title="Beta Deal", value=500.0, status=LeadStatus.QUALIFIED, company_id=c.id)
        create_lead(session, title="Gamma Prospect", value=300.0, status=LeadStatus.PROSPECTING)

        # Search term
        items, total = search_and_paginate_leads(session, search="Prospect")
        assert total == 1
        assert items[0].title == "Gamma Prospect"

        # Status filter
        items, total = search_and_paginate_leads(session, status=LeadStatus.PROSPECTING)
        assert total == 2

        # Company filter
        items, total = search_and_paginate_leads(session, company_id=c.id)
        assert total == 2

        # Sort by value desc
        items, total = search_and_paginate_leads(session, sort_by="value", order="desc")
        assert [l.title for l in items] == ["Beta Deal", "Gamma Prospect", "Alpha Opportunity"]

        # Pagination
        items, total = search_and_paginate_leads(session, page=1, page_size=2)
        assert total == 3
        assert len(items) == 2
