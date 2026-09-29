"""Unit tests for tasks domain service CRUD operations, validation, overdue detection, and linking."""

from datetime import date, datetime, timedelta, timezone
import pytest
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models.base import Base
from models.companies import create_company
from models.leads import create_lead
from models.contacts import create_contact
from services.tasks.exceptions import (
    InvalidForeignKeyError,
    TaskNotFoundError,
    TaskValidationError,
)
from services.tasks.service import (
    compute_overdue,
    create_task,
    delete_task,
    get_overdue_tasks,
    get_task,
    get_task_by_id,
    get_tasks_by_company,
    get_tasks_by_contact,
    get_tasks_by_lead,
    get_upcoming_tasks,
    is_task_overdue,
    list_tasks,
    search_and_paginate_tasks,
    update_task,
)


class DummyTaskModel(BaseModel):
    description: str
    due_date: str
    company_id: int


@pytest.fixture
def db_session() -> Session:
    """Fixture providing an in-memory SQLite database session."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_create_task_success(db_session: Session) -> None:
    """Test creating a task with valid description and future due_date."""
    due = datetime.now(timezone.utc) + timedelta(days=2)
    task = create_task(
        db_session,
        description="Follow up with client",
        due_date=due,
        owner="Alice",
    )

    assert task.id is not None
    assert task.description == "Follow up with client"
    assert task.title == "Follow up with client"
    assert task.due_date is not None
    assert task.completed is False
    assert task.overdue is False
    assert task.company_id is None
    assert task.lead_id is None


def test_create_task_using_pydantic_model(db_session: Session) -> None:
    """Test creating a task from a Pydantic model input."""
    company = create_company(db_session, name="Acme Corp")
    task_model = DummyTaskModel(
        description="Send proposal",
        due_date="2026-11-15T10:00:00Z",
        company_id=company.id,
    )

    task = create_task(db_session, task_in=task_model)
    assert task.id is not None
    assert task.description == "Send proposal"
    assert task.company_id == company.id


def test_create_task_missing_description(db_session: Session) -> None:
    """Test creating a task without description raises TaskValidationError."""
    due = datetime.now(timezone.utc) + timedelta(days=1)
    with pytest.raises(TaskValidationError, match="description is required"):
        create_task(db_session, description="", due_date=due)

    with pytest.raises(TaskValidationError, match="description is required"):
        create_task(db_session, description=None, due_date=due)


def test_create_task_missing_due_date(db_session: Session) -> None:
    """Test creating a task without due_date raises TaskValidationError."""
    with pytest.raises(TaskValidationError, match="due_date is required"):
        create_task(db_session, description="Call client", due_date=None)

    with pytest.raises(TaskValidationError, match="due_date is required"):
        create_task(db_session, description="Call client", due_date="")


def test_create_task_invalid_due_date_format(db_session: Session) -> None:
    """Test creating a task with unparseable due_date raises TaskValidationError."""
    with pytest.raises(TaskValidationError, match="Invalid due_date format"):
        create_task(db_session, description="Call client", due_date="not-a-date")


def test_create_task_past_due_date_allowed_and_overdue(db_session: Session) -> None:
    """Test creating a task with a past due date is allowed and marked overdue (Edge Case 3)."""
    past_due = datetime.now(timezone.utc) - timedelta(days=3)
    task = create_task(
        db_session,
        description="Prepare Q3 report",
        due_date=past_due,
    )

    assert task.id is not None
    assert task.overdue is True
    assert is_task_overdue(task) is True


def test_create_task_with_company_and_lead_linking(db_session: Session) -> None:
    """Test optional linking of company and lead (FR-4)."""
    company = create_company(db_session, name="Beta Inc")
    lead = create_lead(db_session, title="Project X", company_id=company.id)

    due = datetime.now(timezone.utc) + timedelta(days=5)
    task = create_task(
        db_session,
        description="Review agreement",
        due_date=due,
        company_id=company.id,
        lead_id=lead.id,
    )

    assert task.company_id == company.id
    assert task.lead_id == lead.id


def test_create_task_invalid_company_fk(db_session: Session) -> None:
    """Test linking to a non-existent company ID raises InvalidForeignKeyError."""
    due = datetime.now(timezone.utc) + timedelta(days=1)
    with pytest.raises(InvalidForeignKeyError, match="Company ID 999 does not exist"):
        create_task(db_session, description="Task A", due_date=due, company_id=999)


def test_create_task_due_date_types_and_contact_link(db_session: Session) -> None:
    """Test creating task with date object, naive datetime, ISO string, and contact association."""
    contact = create_contact(db_session, name="Jane Contact", email="jane@example.com")

    # Date object
    d_obj = date(2026, 11, 20)
    task1 = create_task(db_session, description="Task with date", due_date=d_obj, contact_id=contact.id)
    assert task1.id is not None
    assert task1.contact_id == contact.id

    # Naive datetime
    naive_dt = datetime(2026, 11, 20, 15, 30)
    task2 = create_task(db_session, description="Task with naive dt", due_date=naive_dt)
    assert task2.due_date.tzinfo is not None

    # Invalid due date type (e.g. integer)
    with pytest.raises(TaskValidationError, match="Invalid due_date"):
        create_task(db_session, description="Task invalid dt", due_date=12345)

    # Invalid contact_id
    with pytest.raises(InvalidForeignKeyError, match="Contact ID 7777 does not exist"):
        create_task(db_session, description="Task invalid contact", due_date=d_obj, contact_id=7777)


def test_get_task(db_session: Session) -> None:
    """Test retrieving task by ID."""
    due = datetime.now(timezone.utc) + timedelta(days=1)
    task = create_task(db_session, description="Task C", due_date=due)

    found = get_task(db_session, task.id)
    assert found is not None
    assert found.id == task.id
    assert get_task_by_id(db_session, task.id) is not None

    assert get_task(db_session, 9999) is None


def test_get_tasks_by_company_and_lead(db_session: Session) -> None:
    """Test querying tasks by company ID, lead ID, and contact ID."""
    company = create_company(db_session, name="Gamma LLC")
    lead = create_lead(db_session, title="Gamma Lead")
    contact = create_contact(db_session, name="Gamma Contact", email="contact@gamma.com")

    due = datetime.now(timezone.utc) + timedelta(days=1)
    t1 = create_task(db_session, description="Task 1", due_date=due, company_id=company.id)
    t2 = create_task(db_session, description="Task 2", due_date=due, lead_id=lead.id)
    t3 = create_task(db_session, description="Task 3", due_date=due, contact_id=contact.id)

    company_tasks = get_tasks_by_company(db_session, company.id)
    assert len(company_tasks) == 1
    assert company_tasks[0].id == t1.id

    lead_tasks = get_tasks_by_lead(db_session, lead.id)
    assert len(lead_tasks) == 1
    assert lead_tasks[0].id == t2.id

    contact_tasks = get_tasks_by_contact(db_session, contact.id)
    assert len(contact_tasks) == 1
    assert contact_tasks[0].id == t3.id


def test_update_task_success(db_session: Session) -> None:
    """Test updating task attributes."""
    due = datetime.now(timezone.utc) + timedelta(days=10)
    task = create_task(db_session, description="Original Task", due_date=due)

    updated = update_task(
        db_session,
        task.id,
        description="Updated Task",
        completed=True,
    )

    assert updated.description == "Updated Task"
    assert updated.completed is True
    assert updated.overdue is False


def test_update_task_due_date_to_past_allowed(db_session: Session) -> None:
    """Test updating due_date to a past date (Edge Case 3)."""
    future_due = datetime.now(timezone.utc) + timedelta(days=10)
    task = create_task(db_session, description="Task D", due_date=future_due)
    assert task.overdue is False

    past_due = datetime.now(timezone.utc) - timedelta(days=5)
    updated = update_task(db_session, task.id, due_date=past_due)

    assert updated.overdue is True


def test_update_task_empty_description_or_due_date_fails(db_session: Session) -> None:
    """Test updating description or due_date to empty value raises TaskValidationError."""
    due = datetime.now(timezone.utc) + timedelta(days=1)
    task = create_task(db_session, description="Task E", due_date=due)

    with pytest.raises(TaskValidationError, match="description is required"):
        update_task(db_session, task.id, description="  ")

    with pytest.raises(TaskValidationError, match="due_date cannot be set to None or empty"):
        update_task(db_session, task.id, due_date="")


def test_update_task_not_found(db_session: Session) -> None:
    """Test updating a non-existent task raises TaskNotFoundError."""
    with pytest.raises(TaskNotFoundError, match="Task with ID 999 not found"):
        update_task(db_session, 999, description="No task")


def test_delete_task_success(db_session: Session) -> None:
    """Test deleting an existing task."""
    due = datetime.now(timezone.utc) + timedelta(days=1)
    task = create_task(db_session, description="Task F", due_date=due)

    result = delete_task(db_session, task.id)
    assert result is True
    assert get_task(db_session, task.id) is None


def test_delete_task_not_found(db_session: Session) -> None:
    """Test deleting a non-existent task raises TaskNotFoundError."""
    with pytest.raises(TaskNotFoundError, match="Task with ID 777 not found"):
        delete_task(db_session, 777)


def test_compute_overdue_and_queries(db_session: Session) -> None:
    """Test compute_overdue, get_overdue_tasks, and get_upcoming_tasks."""
    now = datetime.now(timezone.utc)

    # Overdue task
    create_task(db_session, description="Overdue 1", due_date=now - timedelta(days=2))
    # Upcoming task (in 3 days)
    create_task(db_session, description="Upcoming 1", due_date=now + timedelta(days=3))
    # Completed overdue task (not counted as overdue)
    create_task(db_session, description="Completed 1", due_date=now - timedelta(days=1), completed=True)

    overdue_list = get_overdue_tasks(db_session, now=now)
    assert len(overdue_list) == 1
    assert overdue_list[0].description == "Overdue 1"

    upcoming_list = get_upcoming_tasks(db_session, days=7, now=now)
    assert len(upcoming_list) == 1
    assert upcoming_list[0].description == "Upcoming 1"

    # Compute overdue helper checks
    assert compute_overdue(now - timedelta(days=1), completed=False, now=now) is True
    assert compute_overdue(now - timedelta(days=1), completed=True, now=now) is False
    assert compute_overdue(now + timedelta(days=1), completed=False, now=now) is False


def test_list_and_search_tasks(db_session: Session) -> None:
    """Test list_tasks and search_and_paginate_tasks."""
    due = datetime.now(timezone.utc) + timedelta(days=1)
    create_task(db_session, description="Alpha task", due_date=due)
    create_task(db_session, description="Beta task", due_date=due)

    all_tasks = list_tasks(db_session)
    assert len(all_tasks) == 2

    items, total = search_and_paginate_tasks(db_session, search="Alpha", page=1, page_size=10)
    assert total == 1
    assert len(items) == 1
    assert items[0].description == "Alpha task"
