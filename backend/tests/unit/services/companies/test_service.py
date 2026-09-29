"""Unit tests for companies domain service."""

from datetime import datetime, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models.base import Base
from models.contacts import Contact
from models.interactions import Interaction
from models.leads import Lead
from models.tasks import Task
from services.companies.exceptions import (
    CompanyDeleteBlockedError,
    CompanyNotFoundError,
    CompanyValidationError,
)
from services.companies.service import (
    create_company,
    delete_company,
    get_company,
    get_company_associations,
    get_company_by_id,
    get_company_with_associations,
    list_companies,
    search_and_paginate_companies,
    update_company,
)


@pytest.fixture
def db_session() -> Session:
    """Fixture providing an in-memory SQLite database session."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_create_company_success(db_session: Session) -> None:
    """Test creating a company with all fields valid."""
    company = create_company(
        db_session,
        name="Acme Corp",
        industry="Technology",
        website="https://acme.example.com",
        notes="Key enterprise account",
        email="info@acme.example.com",
        owner="Alice",
    )

    assert company.id is not None
    assert company.name == "Acme Corp"
    assert company.industry == "Technology"
    assert company.website == "https://acme.example.com"
    assert company.notes == "Key enterprise account"
    assert company.email == "info@acme.example.com"
    assert company.owner == "Alice"


def test_create_company_validation_empty_name(db_session: Session) -> None:
    """Test creating a company with empty or missing name raises CompanyValidationError."""
    with pytest.raises(CompanyValidationError):
        create_company(db_session, name="")

    with pytest.raises(CompanyValidationError):
        create_company(db_session, name="   ")

    with pytest.raises(CompanyValidationError):
        create_company(db_session, company_in={"name": None})


def test_get_company(db_session: Session) -> None:
    """Test retrieving a company by ID."""
    company = create_company(db_session, name="Stark Industries")
    fetched = get_company(db_session, company.id)

    assert fetched is not None
    assert fetched.id == company.id
    assert fetched.name == "Stark Industries"

    assert get_company(db_session, 99999) is None
    assert get_company_by_id(db_session, company.id) is not None


def test_list_and_paginate_companies(db_session: Session) -> None:
    """Test list_companies and search_and_paginate_companies."""
    create_company(db_session, name="Zulu Corp", industry="Logistics")
    create_company(db_session, name="Alpha Inc", industry="Software")
    create_company(db_session, name="Beta LLC", industry="Software")

    companies = list_companies(db_session)
    assert len(companies) == 3

    # Direct search parameter in list_companies
    searched = list_companies(db_session, search="Software")
    assert isinstance(searched, tuple)
    items, total = searched
    assert total == 2
    assert len(items) == 2

    # Pagination in list_companies
    paginated = list_companies(db_session, page=1, page_size=2)
    assert isinstance(paginated, tuple)
    p_items, p_total = paginated
    assert p_total == 3
    assert len(p_items) == 2

    # Search & paginate
    items, total = search_and_paginate_companies(
        db_session, search="Software", page=1, page_size=10
    )
    assert total == 2
    assert len(items) == 2


def test_update_company_success_and_validation(db_session: Session) -> None:
    """Test updating company fields and validating empty name."""
    company = create_company(db_session, name="Wayne Enterprises")

    updated = update_company(
        db_session,
        company.id,
        name="Wayne Tech",
        industry="Defense",
    )
    assert updated.name == "Wayne Tech"
    assert updated.industry == "Defense"

    with pytest.raises(CompanyValidationError):
        update_company(db_session, company.id, name="   ")

    with pytest.raises(CompanyNotFoundError):
        update_company(db_session, 99999, name="Non-existent")


def test_get_company_with_associations(db_session: Session) -> None:
    """Test querying linked contacts, leads, tasks, and interactions for detail view."""
    company = create_company(db_session, name="Cyberdyne Systems")

    # Add linked records
    contact = Contact(
        name="John Connor",
        email="john@resistance.org",
        company_id=company.id,
    )
    lead = Lead(
        name="Defense Contract",
        title="Defense Contract",
        status="Negotiation",
        company_id=company.id,
        owner="Alice",
    )
    task = Task(
        description="Review Skynet proposal",
        company_id=company.id,
    )
    interaction = Interaction(
        notes="Initial demo meeting",
        summary="Initial demo meeting",
        type="meeting",
        date=datetime.now(timezone.utc),
        company_id=company.id,
    )

    db_session.add_all([contact, lead, task, interaction])
    db_session.commit()

    detail = get_company_with_associations(db_session, company.id)
    assert detail["company"].id == company.id
    assert len(detail["contacts"]) == 1
    assert detail["contacts"][0].name == "John Connor"
    assert len(detail["leads"]) == 1
    assert detail["leads"][0].title == "Defense Contract"
    assert len(detail["tasks"]) == 1
    assert detail["tasks"][0].description == "Review Skynet proposal"
    assert len(detail["interactions"]) == 1
    assert detail["interactions"][0].type == "meeting"

    with pytest.raises(CompanyNotFoundError):
        get_company_with_associations(db_session, 99999)


def test_delete_company_blocked_by_associations(db_session: Session) -> None:
    """Test deleting company is blocked if any associated record exists."""
    company = create_company(db_session, name="Umbrella Corp")

    # Contact association blocks delete
    contact = Contact(name="Alice", email="alice@umbrella.com", company_id=company.id)
    db_session.add(contact)
    db_session.commit()

    with pytest.raises(CompanyDeleteBlockedError):
        delete_company(db_session, company.id)

    db_session.delete(contact)
    db_session.commit()

    # Lead association blocks delete
    lead = Lead(name="Deal", title="Deal", company_id=company.id, owner="Alice")
    db_session.add(lead)
    db_session.commit()

    with pytest.raises(CompanyDeleteBlockedError):
        delete_company(db_session, company.id)

    db_session.delete(lead)
    db_session.commit()

    # Task association blocks delete
    task = Task(description="Follow up", company_id=company.id)
    db_session.add(task)
    db_session.commit()

    with pytest.raises(CompanyDeleteBlockedError):
        delete_company(db_session, company.id)

    db_session.delete(task)
    db_session.commit()

    # Interaction association blocks delete
    interaction = Interaction(
        notes="Call notes",
        summary="Call notes",
        type="call",
        date=datetime.now(timezone.utc),
        company_id=company.id,
    )
    db_session.add(interaction)
    db_session.commit()

    with pytest.raises(CompanyDeleteBlockedError):
        delete_company(db_session, company.id)

    db_session.delete(interaction)
    db_session.commit()

    # Now delete succeeds
    assert delete_company(db_session, company.id) is True
    assert get_company(db_session, company.id) is None


def test_delete_company_not_found(db_session: Session) -> None:
    """Test deleting a non-existent company raises CompanyNotFoundError."""
    with pytest.raises(CompanyNotFoundError):
        delete_company(db_session, 99999)
