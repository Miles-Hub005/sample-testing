"""Unit tests for Company database model and helper queries."""

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session

from models.base import Base
from models.companies import (
    Company,
    create_company,
    delete_company,
    get_company,
    get_company_by_id,
    list_companies,
    search_and_paginate_companies,
    update_company,
)


def test_company_model_fields_and_defaults() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        company = Company(
            name="Acme Inc",
            industry="Technology",
            website="https://acme.com",
            notes="Key partner",
        )
        session.add(company)
        session.commit()

        assert company.id is not None
        assert company.name == "Acme Inc"
        assert company.industry == "Technology"
        assert company.website == "https://acme.com"
        assert company.notes == "Key partner"
        assert company.created_at is not None
        assert company.updated_at is not None


def test_company_indexes() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    inspector = inspect(engine)
    indexes = inspector.get_indexes("companies")
    indexed_columns = [col for idx in indexes for col in idx["column_names"]]

    assert "name" in indexed_columns
    assert "industry" in indexed_columns


def test_create_and_get_company() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        c = create_company(
            session,
            name="Globex Corp",
            industry="Manufacturing",
            website="https://globex.org",
            notes="Global conglomerate",
        )
        assert c.id is not None
        assert c.name == "Globex Corp"

        fetched = get_company_by_id(session, c.id)
        assert fetched is not None
        assert fetched.name == "Globex Corp"
        assert fetched.industry == "Manufacturing"

        alias_fetched = get_company(session, c.id)
        assert alias_fetched is not None
        assert alias_fetched.id == c.id

        missing = get_company_by_id(session, 9999)
        assert missing is None


def test_update_company() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        c = create_company(session, name="Stark Industries", industry="Defense")
        updated = update_company(
            session,
            c.id,
            {"industry": "Clean Energy", "website": "https://stark.com"},
        )
        assert updated is not None
        assert updated.industry == "Clean Energy"
        assert updated.website == "https://stark.com"

        missing_update = update_company(session, 9999, {"name": "Test"})
        assert missing_update is None


def test_delete_company() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        c = create_company(session, name="Wayne Enterprises")
        success = delete_company(session, c.id)
        assert success is True

        fetched = get_company_by_id(session, c.id)
        assert fetched is None

        failed = delete_company(session, c.id)
        assert failed is False


def test_list_companies() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        create_company(session, name="Zeta Corp")
        create_company(session, name="Alpha LLC")
        create_company(session, name="Beta Inc")

        companies = list_companies(session)
        names = [c.name for c in companies]
        assert names == ["Alpha LLC", "Beta Inc", "Zeta Corp"]

        paged = list_companies(session, skip=1, limit=1)
        assert len(paged) == 1
        assert paged[0].name == "Beta Inc"


def test_search_and_paginate_companies() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        create_company(session, name="Acme Logistics", industry="Shipping")
        create_company(session, name="Acme Tech", industry="Software")
        create_company(session, name="Beta Software", industry="Software")
        create_company(session, name="Gamma Retail", industry="Retail")

        # Search by name
        items, total = search_and_paginate_companies(session, search="Acme")
        assert total == 2
        assert len(items) == 2

        # Search by industry
        items, total = search_and_paginate_companies(session, search="Software")
        assert total == 2

        # Sort desc
        items, total = search_and_paginate_companies(
            session, sort_by="name", order="desc"
        )
        assert items[0].name == "Gamma Retail"
        assert items[-1].name == "Acme Logistics"

        # Paginate (20/page by default, override page_size)
        items, total = search_and_paginate_companies(
            session, page=1, page_size=2, sort_by="name", order="asc"
        )
        assert total == 4
        assert len(items) == 2
        assert items[0].name == "Acme Logistics"
        assert items[1].name == "Acme Tech"

        items_p2, total = search_and_paginate_companies(
            session, page=2, page_size=2, sort_by="name", order="asc"
        )
        assert len(items_p2) == 2
        assert items_p2[0].name == "Beta Software"
        assert items_p2[1].name == "Gamma Retail"
