"""Unit tests for Contact database model and helper queries."""

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session

from models.base import Base
from models.companies import create_company
from models.contacts import (
    Contact,
    create_contact,
    delete_contact,
    get_contact,
    get_contact_by_id,
    get_contacts_by_company,
    list_contacts,
    search_and_paginate_contacts,
    update_contact,
)


def test_contact_model_fields_and_defaults() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        company = create_company(session, name="Acme Corp")
        contact = Contact(
            name="Alice Smith",
            email="alice@acme.com",
            phone="555-0199",
            role="VP of Sales",
            company_id=company.id,
            notes="Primary decision maker",
        )
        session.add(contact)
        session.commit()

        assert contact.id is not None
        assert contact.name == "Alice Smith"
        assert contact.email == "alice@acme.com"
        assert contact.phone == "555-0199"
        assert contact.role == "VP of Sales"
        assert contact.company_id == company.id
        assert contact.notes == "Primary decision maker"
        assert contact.created_at is not None
        assert contact.updated_at is not None
        assert contact.company is not None
        assert contact.company.name == "Acme Corp"


def test_contact_indexes() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    inspector = inspect(engine)
    indexes = inspector.get_indexes("contacts")
    indexed_columns = [col for idx in indexes for col in idx["column_names"]]

    assert "name" in indexed_columns
    assert "email" in indexed_columns
    assert "company_id" in indexed_columns


def test_create_and_get_contact() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        company = create_company(session, name="Globex")
        c = create_contact(
            session,
            name="Bob Jones",
            email="bob@globex.com",
            phone="555-0200",
            role="Engineering Lead",
            company_id=company.id,
            notes="Technical lead",
        )
        assert c.id is not None
        assert c.name == "Bob Jones"
        assert c.email == "bob@globex.com"

        fetched = get_contact_by_id(session, c.id)
        assert fetched is not None
        assert fetched.name == "Bob Jones"
        assert fetched.role == "Engineering Lead"

        alias_fetched = get_contact(session, c.id)
        assert alias_fetched is not None
        assert alias_fetched.id == c.id

        missing = get_contact_by_id(session, 9999)
        assert missing is None


def test_update_contact() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        c = create_contact(
            session,
            name="Charlie Brown",
            email="charlie@example.com",
        )
        updated = update_contact(
            session,
            c.id,
            {"role": "Director", "phone": "555-0300"},
        )
        assert updated is not None
        assert updated.role == "Director"
        assert updated.phone == "555-0300"

        missing_update = update_contact(session, 9999, {"name": "Test"})
        assert missing_update is None


def test_delete_contact() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        c = create_contact(session, name="Diana Prince", email="diana@hero.org")
        success = delete_contact(session, c.id)
        assert success is True

        fetched = get_contact_by_id(session, c.id)
        assert fetched is None

        failed = delete_contact(session, c.id)
        assert failed is False


def test_list_contacts() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        create_contact(session, name="Zack Miller", email="zack@test.com")
        create_contact(session, name="Aaron Paul", email="aaron@test.com")
        create_contact(session, name="Beth Harmon", email="beth@test.com")

        contacts = list_contacts(session)
        names = [c.name for c in contacts]
        assert names == ["Aaron Paul", "Beth Harmon", "Zack Miller"]

        paged = list_contacts(session, skip=1, limit=1)
        assert len(paged) == 1
        assert paged[0].name == "Beth Harmon"


def test_get_contacts_by_company() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        comp1 = create_company(session, name="Company 1")
        comp2 = create_company(session, name="Company 2")

        c1 = create_contact(session, name="Eve", email="eve@c1.com", company_id=comp1.id)
        c2 = create_contact(session, name="Frank", email="frank@c1.com", company_id=comp1.id)
        c3 = create_contact(session, name="Grace", email="grace@c2.com", company_id=comp2.id)

        comp1_contacts = get_contacts_by_company(session, comp1.id)
        assert len(comp1_contacts) == 2
        assert [c.name for c in comp1_contacts] == ["Eve", "Frank"]

        comp2_contacts = get_contacts_by_company(session, comp2.id)
        assert len(comp2_contacts) == 1
        assert comp2_contacts[0].name == "Grace"


def test_search_and_paginate_contacts() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        comp1 = create_company(session, name="Initech")
        create_contact(session, name="John Doe", email="john@initech.com", company_id=comp1.id)
        create_contact(session, name="Jane Doe", email="jane@acme.com")
        create_contact(session, name="Sam Smith", email="sam@smith.org")
        create_contact(session, name="John Wayne", email="jwayne@west.com")

        # Search by name
        items, total = search_and_paginate_contacts(session, search="John")
        assert total == 2

        # Search by email
        items, total = search_and_paginate_contacts(session, search="acme.com")
        assert total == 1
        assert items[0].name == "Jane Doe"

        # Filter by company_id
        items, total = search_and_paginate_contacts(session, company_id=comp1.id)
        assert total == 1
        assert items[0].name == "John Doe"

        # Sort desc by email
        items, total = search_and_paginate_contacts(session, sort_by="email", order="desc")
        assert items[0].email == "sam@smith.org"

        # Pagination
        items, total = search_and_paginate_contacts(session, page=1, page_size=2, sort_by="name", order="asc")
        assert total == 4
        assert len(items) == 2
        assert items[0].name == "Jane Doe"
        assert items[1].name == "John Doe"


def test_contact_optional_company_id_edge_case() -> None:
    """Verify Edge Case 2: Creating a contact without selecting a company is allowed."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        contact = create_contact(
            session,
            name="Unassigned Contact",
            email="solo@freelance.org",
            company_id=None,
        )
        assert contact.id is not None
        assert contact.company_id is None
        assert contact.company is None
