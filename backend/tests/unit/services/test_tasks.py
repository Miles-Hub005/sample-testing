"""Unit tests for Task service CRUD operations, overdue computation, and FK validation."""

from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models.base import Base
from services.crm.companies import create_company
from services.crm.contacts import create_contact
from services.crm.exceptions import InvalidForeignKeyError, TaskNotFoundError
from services.crm.leads import create_lead
from services.crm.schemas import (
    CompanyCreate,
    ContactCreate,
    LeadCreate,
    TaskCreate,
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


def test_compute_overdue() -> None:
    """Test compute_overdue helper function."""
    now = datetime.now(timezone.utc)

    # None due date is not overdue
    assert compute_overdue(None, now=now) is False

    # Past due date is overdue
    past = now - timedelta(days=1)
    assert compute_overdue(past, now=now) is True

    # Future due date is not overdue
    future = now + timedelta(days=1)
    assert compute_overdue(future, now=now) is False

    # Naive datetime handling
    naive_past = datetime.utcnow() - timedelta(hours=2)
    assert compute_overdue(naive_past) is True


def test_create_task_success_without_fks(db_session: Session) -> None:
    """Test creating a task without any foreign keys or due_date."""
    task_in = TaskCreate(
        title="Send follow-up email",
        owner="Alice",
    )
    task = create_task(db_session, task_in)

    assert task.id is not None
    assert task.title == "Send follow-up email"
    assert task.owner == "Alice"
    assert task.due_date is None
    assert task.lead_id is None
    assert task.contact_id is None
    assert task.company_id is None
    assert task.overdue is False
    assert task.created_at is not None
    assert task.updated_at is not None


def test_create_task_success_with_fks_and_due_date(db_session: Session) -> None:
    """Test creating a task with valid associated entities and due_date."""
    company = create_company(db_session, CompanyCreate(name="Acme Corp", owner="Alice"))
    contact = create_contact(
        db_session,
        ContactCreate(name="John Doe", email="john@example.com", owner="Alice"),
    )
    lead = create_lead(
        db_session,
        LeadCreate(name="Deal A", status="New", owner="Alice"),
    )

    past_date = datetime.now(timezone.utc) - timedelta(days=2)
    task_in = TaskCreate(
        title="Schedule demo",
        owner="Alice",
        due_date=past_date,
        company_id=company.id,
        contact_id=contact.id,
        lead_id=lead.id,
    )
    task = create_task(db_session, task_in)

    assert task.id is not None
    assert task.company_id == company.id
    assert task.contact_id == contact.id
    assert task.lead_id == lead.id
    assert task.due_date == past_date
    assert task.overdue is True


def test_create_task_dict_input(db_session: Session) -> None:
    """Test creating a task passing a dict."""
    task_data = {
        "title": "Call client",
        "owner": "Bob",
    }
    task = create_task(db_session, task_data)
    assert task.id is not None
    assert task.title == "Call client"


def test_create_task_invalid_company_fk(db_session: Session) -> None:
    """Test creating a task with non-existent company_id raises InvalidForeignKeyError."""
    task_in = TaskCreate(
        title="Review contract",
        owner="Alice",
        company_id=9999,
    )
    with pytest.raises(InvalidForeignKeyError) as exc_info:
        create_task(db_session, task_in)
    assert "Company ID 9999 does not exist" in str(exc_info.value)


def test_create_task_invalid_contact_fk(db_session: Session) -> None:
    """Test creating a task with non-existent contact_id raises InvalidForeignKeyError."""
    task_in = TaskCreate(
        title="Review contract",
        owner="Alice",
        contact_id=8888,
    )
    with pytest.raises(InvalidForeignKeyError) as exc_info:
        create_task(db_session, task_in)
    assert "Contact ID 8888 does not exist" in str(exc_info.value)


def test_create_task_invalid_lead_fk(db_session: Session) -> None:
    """Test creating a task with non-existent lead_id raises InvalidForeignKeyError."""
    task_in = TaskCreate(
        title="Review contract",
        owner="Alice",
        lead_id=7777,
    )
    with pytest.raises(InvalidForeignKeyError) as exc_info:
        create_task(db_session, task_in)
    assert "Lead ID 7777 does not exist" in str(exc_info.value)


def test_get_task(db_session: Session) -> None:
    """Test retrieving a task by ID."""
    created = create_task(
        db_session,
        TaskCreate(title="Task 1", owner="Alice"),
    )

    fetched = get_task(db_session, created.id)
    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.title == "Task 1"

    non_existent = get_task(db_session, 99999)
    assert non_existent is None


def test_list_tasks_sorting_and_pagination(db_session: Session) -> None:
    """Test listing tasks sorted by due_date ascending with NULLs last."""
    now = datetime.now(timezone.utc)
    t_null = create_task(
        db_session, TaskCreate(title="No Due Date", owner="Alice", due_date=None)
    )
    t_later = create_task(
        db_session,
        TaskCreate(
            title="Later Task", owner="Alice", due_date=now + timedelta(days=5)
        ),
    )
    t_earlier = create_task(
        db_session,
        TaskCreate(
            title="Earlier Task", owner="Alice", due_date=now + timedelta(days=1)
        ),
    )

    tasks = list_tasks(db_session)
    assert len(tasks) == 3
    # Earlier due_date first, then Later due_date, then NULL due_date
    assert [t.id for t in tasks] == [t_earlier.id, t_later.id, t_null.id]

    # Pagination test
    page = list_tasks(db_session, skip=1, limit=1)
    assert len(page) == 1
    assert page[0].id == t_later.id


def test_update_task_success(db_session: Session) -> None:
    """Test updating task details and FK associations."""
    task = create_task(
        db_session, TaskCreate(title="Initial Title", owner="Alice")
    )
    company = create_company(db_session, CompanyCreate(name="Acme", owner="Alice"))

    future_date = datetime.now(timezone.utc) + timedelta(days=3)
    update_in = TaskUpdate(
        title="Updated Title",
        due_date=future_date,
        company_id=company.id,
    )

    updated = update_task(db_session, task.id, update_in)
    assert updated.title == "Updated Title"
    assert updated.company_id == company.id
    assert updated.due_date == future_date
    assert updated.overdue is False


def test_update_task_invalid_fk(db_session: Session) -> None:
    """Test updating task with invalid FK raises InvalidForeignKeyError."""
    task = create_task(db_session, TaskCreate(title="Task A", owner="Alice"))

    with pytest.raises(InvalidForeignKeyError):
        update_task(db_session, task.id, TaskUpdate(company_id=99999))

    with pytest.raises(InvalidForeignKeyError):
        update_task(db_session, task.id, TaskUpdate(contact_id=99999))

    with pytest.raises(InvalidForeignKeyError):
        update_task(db_session, task.id, TaskUpdate(lead_id=99999))


def test_update_task_not_found(db_session: Session) -> None:
    """Test updating a non-existent task raises TaskNotFoundError."""
    with pytest.raises(TaskNotFoundError):
        update_task(db_session, 99999, TaskUpdate(title="New Title"))


def test_delete_task(db_session: Session) -> None:
    """Test deleting a task."""
    task = create_task(db_session, TaskCreate(title="To Delete", owner="Alice"))

    result = delete_task(db_session, task.id)
    assert result is True

    assert get_task(db_session, task.id) is None


def test_delete_task_not_found(db_session: Session) -> None:
    """Test deleting a non-existent task raises TaskNotFoundError."""
    with pytest.raises(TaskNotFoundError):
        delete_task(db_session, 99999)
