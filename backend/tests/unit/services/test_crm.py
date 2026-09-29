"""Comprehensive unit tests for CRM service layer.

Covers:
- Service-layer validation (Pydantic schemas and business constraints)
- Foreign Key (FK) constraints and non-existent reference error handling
- Restrictive delete blocking (preventing deletion of companies with associated leads)
- Currency and date/time formatting helpers
- Task overdue logic and nulls-last sorting
- Interaction append-only creation, entity linkage validation, and timestamp descending sorting
- Domain exceptions
"""

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models.base import Base
from models.crm import Company, Contact, InteractionCrm,   LeadCrm, TaskCrm
from services.crm.companies import (
    create_company,
    delete_company,
    get_company,
    list_companies,
    update_company,
)
from services.crm.contacts import (
    create_contact,
    delete_contact,
    get_contact,
    list_contacts,
    update_contact,
)
from services.crm.exceptions import (
    CompanyDeleteBlockedError,
    CompanyNotFoundError,
    ContactNotFoundError,
    CRMError,
    DeleteBlockedError,
    EntityNotFoundError,
    InteractionNotFoundError,
    InvalidForeignKeyError,
    LeadNotFoundError,
    TaskNotFoundError,
)
from services.crm.formatters import (
    convert_utc_to_timezone,
    ensure_utc,
    format_currency,
    format_date,
    format_datetime,
    formatCurrency,
    formatDate,
    formatDateTime,
    to_utc,
)
from services.crm.interactions import (
    create_interaction,
    get_interaction,
    list_interactions,
)
from services.crm.leads import (
    create_lead,
    delete_lead,
    get_lead,
    list_leads,
    update_lead,
)
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
from services.crm.tasks import (
    compute_overdue,
    create_task,
    delete_task,
    get_task,
    list_tasks,
    update_task,
)


@pytest.fixture
def db_session() -> Session:
    """Fixture providing an in-memory SQLite SQLAlchemy session."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


# ============================================================================
# 1. SERVICE-LAYER VALIDATION TESTS
# ============================================================================


def test_company_validation() -> None:
    """Test validation rules for Company creation and updates."""
    # Valid company
    c = CompanyCreate(name="Acme Corp", email="test@acme.com", owner="Alice")
    assert c.name == "Acme Corp"
    assert c.email == "test@acme.com"

    # Empty name should fail min_length validation
    with pytest.raises(ValidationError):
        CompanyCreate(name="", email="test@acme.com", owner="Alice")

    # Invalid email format should fail custom validator
    with pytest.raises(ValidationError) as exc:
        CompanyCreate(name="Acme", email="not-an-email", owner="Alice")
    assert "Invalid email format" in str(exc.value)

    # Valid update with None email
    up = CompanyUpdate(email=None)
    assert up.email is None


def test_contact_validation() -> None:
    """Test validation rules for Contact creation and updates."""
    # Valid contact
    ct = ContactCreate(
        name="Jane Doe", email="jane@example.com", owner="Alice", company_id=1
    )
    assert ct.name == "Jane Doe"
    assert ct.email == "jane@example.com"

    # Invalid email format
    with pytest.raises(ValidationError) as exc:
        ContactCreate(name="Jane", email="bad-email", owner="Alice")
    assert "Invalid email format" in str(exc.value)

    # Missing email (required field)
    with pytest.raises(ValidationError):
        ContactCreate.model_validate({"name": "No Email", "owner": "Alice"})


def test_interaction_validation() -> None:
    """Test interaction model validator enforcing entity association."""
    now = datetime.now(timezone.utc)

    # Valid interaction linked to company
    i1 = InteractionCreate(notes="Call note", timestamp=now, company_id=1)
    assert i1.company_id == 1

    # Valid interaction linked to contact
    i2 = InteractionCreate(notes="Call note", timestamp=now, contact_id=2)
    assert i2.contact_id == 2

    # Valid interaction linked to lead
    i3 = InteractionCreate(notes="Call note", timestamp=now, lead_id=3)
    assert i3.lead_id == 3

    # Invalid interaction: no company_id, contact_id, or lead_id provided
    with pytest.raises(ValidationError) as exc:
        InteractionCreate(notes="Orphan note", timestamp=now)
    assert "at least one entity" in str(exc.value)


# ============================================================================
# 2. FOREIGN KEY (FK) CONSTRAINT TESTS
# ============================================================================


def test_contact_fk_validation(db_session: Session) -> None:
    """Test FK constraints when creating or updating contacts."""
    # Create valid company
    comp = create_company(
        db_session, CompanyCreate(name="Parent Co", owner="Alice")
    )

    # Success with valid company_id
    contact = create_contact(
        db_session,
        ContactCreate(
            name="John", email="john@example.com", owner="Alice", company_id=comp.id
        ),
    )
    assert contact.company_id == comp.id

    # Fail on create with non-existent company_id
    with pytest.raises(InvalidForeignKeyError) as exc:
        create_contact(
            db_session,
            ContactCreate(
                name="John", email="john2@example.com", owner="Alice", company_id=9999
            ),
        )
    assert "Company ID 9999 does not exist" in str(exc.value)

    # Fail on update with non-existent company_id
    with pytest.raises(InvalidForeignKeyError) as exc:
        update_contact(db_session, contact.id, ContactUpdate(company_id=8888))
    assert "Company ID 8888 does not exist" in str(exc.value)


def test_lead_fk_validation(db_session: Session) -> None:
    """Test FK constraints when creating or updating leads."""
    comp = create_company(
        db_session, CompanyCreate(name="Parent Co", owner="Alice")
    )

    lead = create_lead(
        db_session,
        LeadCreate(
            name="Prospect A", status="New", owner="Alice", company_id=comp.id
        ),
    )
    assert lead.company_id == comp.id

    # Fail on create with non-existent company_id
    with pytest.raises(InvalidForeignKeyError):
        create_lead(
            db_session,
            LeadCreate(
                name="Prospect B", status="New", owner="Alice", company_id=9999
            ),
        )

    # Fail on update with non-existent company_id
    with pytest.raises(InvalidForeignKeyError):
        update_lead(db_session, lead.id, LeadUpdate(company_id=8888))


def test_task_fk_validation(db_session: Session) -> None:
    """Test FK constraints when creating or updating tasks."""
    comp = create_company(
        db_session, CompanyCreate(name="Comp Co", owner="Alice")
    )
    contact = create_contact(
        db_session,
        ContactCreate(name="Contact A", email="c@a.com", owner="Alice"),
    )
    lead = create_lead(
        db_session, LeadCreate(name="Lead A", status="New", owner="Alice")
    )

    # Valid task with all 3 links
    t = create_task(
        db_session,
        TaskCreate(
            title="Task 1",
            owner="Alice",
            company_id=comp.id,
            contact_id=contact.id,
            lead_id=lead.id,
        ),
    )
    assert t.company_id == comp.id
    assert t.contact_id == contact.id
    assert t.lead_id == lead.id

    # Invalid company FK on create
    with pytest.raises(InvalidForeignKeyError):
        create_task(
            db_session,
            TaskCreate(title="Task Bad Comp", owner="Alice", company_id=999),
        )

    # Invalid contact FK on create
    with pytest.raises(InvalidForeignKeyError):
        create_task(
            db_session,
            TaskCreate(title="Task Bad Contact", owner="Alice", contact_id=999),
        )

    # Invalid lead FK on create
    with pytest.raises(InvalidForeignKeyError):
        create_task(
            db_session,
            TaskCreate(title="Task Bad Lead", owner="Alice", lead_id=999),
        )

    # Invalid update FKs
    with pytest.raises(InvalidForeignKeyError):
        update_task(db_session, t.id, TaskUpdate(company_id=999))
    with pytest.raises(InvalidForeignKeyError):
        update_task(db_session, t.id, TaskUpdate(contact_id=999))
    with pytest.raises(InvalidForeignKeyError):
        update_task(db_session, t.id, TaskUpdate(lead_id=999))


def test_interaction_fk_validation(db_session: Session) -> None:
    """Test FK constraints when creating interactions."""
    now = datetime.now(timezone.utc)

    # Invalid company FK
    with pytest.raises(InvalidForeignKeyError):
        create_interaction(
            db_session,
            InteractionCreate(notes="Note", timestamp=now, company_id=999),
        )

    # Invalid contact FK
    with pytest.raises(InvalidForeignKeyError):
        create_interaction(
            db_session,
            InteractionCreate(notes="Note", timestamp=now, contact_id=999),
        )

    # Invalid lead FK
    with pytest.raises(InvalidForeignKeyError):
        create_interaction(
            db_session,
            InteractionCreate(notes="Note", timestamp=now, lead_id=999),
        )


# ============================================================================
# 3. DELETE BLOCKING & RESTRICTIVE RULES TESTS
# ============================================================================


def test_delete_company_blocked_when_leads_exist(db_session: Session) -> None:
    """Test that deleting a company with associated leads raises CompanyDeleteBlockedError."""
    comp = create_company(
        db_session, CompanyCreate(name="Target Co", owner="Alice")
    )
    lead = create_lead(
        db_session,
        LeadCreate(
            name="Target Lead", status="New", owner="Alice", company_id=comp.id
        ),
    )

    # Attempt delete should fail
    with pytest.raises(CompanyDeleteBlockedError) as exc:
        delete_company(db_session, comp.id)
    assert f"Cannot delete company {comp.id}" in str(exc.value)

    # Delete lead first, then company delete succeeds
    delete_lead(db_session, lead.id)
    assert delete_company(db_session, comp.id) is True


def test_delete_non_existent_entities_raises_not_found(db_session: Session) -> None:
    """Test that deleting non-existent entities raises NotFoundError."""
    with pytest.raises(CompanyNotFoundError):
        delete_company(db_session, 9999)

    with pytest.raises(ContactNotFoundError):
        delete_contact(db_session, 9999)

    with pytest.raises(LeadNotFoundError):
        delete_lead(db_session, 9999)

    with pytest.raises(TaskNotFoundError):
        delete_task(db_session, 9999)


def test_update_non_existent_entities_raises_not_found(db_session: Session) -> None:
    """Test that updating non-existent entities raises NotFoundError."""
    with pytest.raises(CompanyNotFoundError):
        update_company(db_session, 9999, CompanyUpdate(name="X"))

    with pytest.raises(ContactNotFoundError):
        update_contact(db_session, 9999, ContactUpdate(name="X"))

    with pytest.raises(LeadNotFoundError):
        update_lead(db_session, 9999, LeadUpdate(name="X"))

    with pytest.raises(TaskNotFoundError):
        update_task(db_session, 9999, TaskUpdate(title="X"))


# ============================================================================
# 4. CURRENCY & DATE FORMATTING TESTS
# ============================================================================


def test_format_currency() -> None:
    """Test integer minor unit currency formatting without floating-point math."""
    # Positive
    assert format_currency(123456) == "$1,234.56"
    assert format_currency(100) == "$1.00"
    assert format_currency(5) == "$0.05"
    assert format_currency(0) == "$0.00"

    # Negative
    assert format_currency(-123456) == "-$1,234.56"
    assert format_currency(-50) == "-$0.50"

    # Custom symbol
    assert format_currency(10000, currency_symbol="€") == "€100.00"

    # CamelCase alias
    assert formatCurrency(500) == "$5.00"

    # Type error on non-integer
    with pytest.raises(TypeError):
        format_currency(12.34)  # type: ignore[arg-type]
    with pytest.raises(TypeError):
        format_currency("100")  # type: ignore[arg-type]
    with pytest.raises(TypeError):
        format_currency(True)  # type: ignore[arg-type]


def test_date_and_utc_formatting() -> None:
    """Test UTC conversion and timezone formatting helpers."""
    # ensure_utc
    naive = datetime(2025, 1, 1, 12, 0, 0)
    utc_dt = ensure_utc(naive)
    assert utc_dt.tzinfo == timezone.utc

    ny_tz = ZoneInfo("America/New_York")
    aware = datetime(2025, 1, 1, 7, 0, 0, tzinfo=ny_tz)
    converted = ensure_utc(aware)
    assert converted.tzinfo == timezone.utc
    assert converted.hour == 12  # 07:00 EST -> 12:00 UTC

    with pytest.raises(TypeError):
        ensure_utc("2025-01-01")  # type: ignore[arg-type]

    # to_utc
    iso_z = "2025-05-10T15:30:00Z"
    assert to_utc(iso_z).tzinfo == timezone.utc
    assert to_utc(iso_z).hour == 15

    with pytest.raises(TypeError):
        to_utc(12345)  # type: ignore[arg-type]

    # convert_utc_to_timezone
    loc = convert_utc_to_timezone("2025-01-01T12:00:00Z", "America/New_York")
    assert loc.hour == 7  # 12:00 UTC -> 07:00 EST

    with pytest.raises(ValueError):
        convert_utc_to_timezone("2025-01-01T12:00:00Z", "Invalid/Timezone_Name")

    with pytest.raises(TypeError):
        convert_utc_to_timezone("2025-01-01T12:00:00Z", 1234)  # type: ignore[arg-type]

    # format_datetime and format_date
    assert format_datetime(None) is None
    assert format_date(None) is None

    formatted_dt = format_datetime("2025-01-01T12:00:00Z", "America/New_York")
    assert formatted_dt is not None
    assert "07:00:00" in formatted_dt

    formatted_d = format_date("2025-01-01T12:00:00Z", "America/New_York")
    assert formatted_d == "2025-01-01"

    # Aliases
    assert formatDate("2025-01-01T12:00:00Z") == "2025-01-01"
    assert formatDateTime("2025-01-01T12:00:00Z") is not None


# ============================================================================
# 5. OVERDUE LOGIC & TASK SORTING TESTS
# ============================================================================


def test_compute_overdue() -> None:
    """Test task compute_overdue business logic."""
    now = datetime(2025, 6, 15, 12, 0, 0, tzinfo=timezone.utc)

    # None due date is never overdue
    assert compute_overdue(None, now=now) is False

    # Past due date is overdue
    past = datetime(2025, 6, 14, 12, 0, 0, tzinfo=timezone.utc)
    assert compute_overdue(past, now=now) is True

    # Future due date is not overdue
    future = datetime(2025, 6, 16, 12, 0, 0, tzinfo=timezone.utc)
    assert compute_overdue(future, now=now) is False

    # Naive past due date gets converted and checked correctly
    naive_past = datetime(2025, 6, 14, 12, 0, 0)
    assert compute_overdue(naive_past, now=now) is True

    # Default now (using actual current time)
    recent_past = datetime.now(timezone.utc) - timedelta(hours=1)
    assert compute_overdue(recent_past) is True


def test_list_tasks_sorting_nulls_last(db_session: Session) -> None:
    """Test listing tasks sorted by due_date ascending, with NULL due_dates last."""
    t_null = create_task(
        db_session, TaskCreate(title="No Due Date", owner="Alice", due_date=None)
    )

    d1 = datetime(2025, 1, 10, 10, 0, 0, tzinfo=timezone.utc)
    d2 = datetime(2025, 1, 5, 10, 0, 0, tzinfo=timezone.utc)

    t_later = create_task(
        db_session, TaskCreate(title="Later Task", owner="Alice", due_date=d1)
    )
    t_earlier = create_task(
        db_session, TaskCreate(title="Earlier Task", owner="Alice", due_date=d2)
    )

    tasks = list_tasks(db_session)
    assert len(tasks) == 3
    assert tasks[0].id == t_earlier.id
    assert tasks[1].id == t_later.id
    assert tasks[2].id == t_null.id


# ============================================================================
# 6. INTERACTION APPEND-ONLY & SORTING TESTS
# ============================================================================


def test_list_interactions_sorting_descending(db_session: Session) -> None:
    """Test listing interactions sorted by timestamp descending."""
    comp = create_company(db_session, CompanyCreate(name="Co 1", owner="Alice"))

    t1 = datetime(2025, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    t2 = datetime(2025, 1, 2, 10, 0, 0, tzinfo=timezone.utc)

    i1 = create_interaction(
        db_session,
        InteractionCreate(notes="First note", timestamp=t1, company_id=comp.id),
    )
    i2 = create_interaction(
        db_session,
        InteractionCreate(notes="Second note", timestamp=t2, company_id=comp.id),
    )

    interactions = list_interactions(db_session, company_id=comp.id)
    assert len(interactions) == 2
    # Reverse chronological (t2 first)
    assert interactions[0].id == i2.id
    assert interactions[1].id == i1.id


def test_get_interaction(db_session: Session) -> None:
    """Test retrieving an interaction by ID."""
    comp = create_company(db_session, CompanyCreate(name="Co 1", owner="Alice"))
    now = datetime.now(timezone.utc)

    created = create_interaction(
        db_session,
        InteractionCreate(notes="Meeting", timestamp=now, company_id=comp.id),
    )

    fetched = get_interaction(db_session, created.id)
    assert fetched is not None
    assert fetched.id == created.id

    assert get_interaction(db_session, 9999) is None


# ============================================================================
# 7. DOMAIN EXCEPTIONS TESTS
# ============================================================================


def test_domain_exceptions_hierarchy() -> None:
    """Test domain exception hierarchy and messages."""
    e = CRMError("Base error")
    assert str(e) == "Base error"

    enf = EntityNotFoundError("Entity missing")
    assert isinstance(enf, CRMError)

    cnf = CompanyNotFoundError("Company missing")
    assert isinstance(cnf, EntityNotFoundError)

    ctnf = ContactNotFoundError("Contact missing")
    assert isinstance(ctnf, EntityNotFoundError)

    lnf = LeadNotFoundError("Lead missing")
    assert isinstance(lnf, EntityNotFoundError)

    tnf = TaskNotFoundError("Task missing")
    assert isinstance(tnf, EntityNotFoundError)

    inf = InteractionNotFoundError("Interaction missing")
    assert isinstance(inf, EntityNotFoundError)

    fk_err = InvalidForeignKeyError("FK error")
    assert isinstance(fk_err, CRMError)

    del_err = DeleteBlockedError("Delete blocked")
    assert isinstance(del_err, CRMError)

    cdel_err = CompanyDeleteBlockedError("Company delete blocked")
    assert isinstance(cdel_err, DeleteBlockedError)
