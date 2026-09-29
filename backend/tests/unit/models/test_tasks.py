"""Unit tests for Task database model and query helpers."""

from datetime import date, datetime, timedelta, timezone
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session

from models.base import Base
from models.companies import create_company
from models.contacts import create_contact
from models.leads import create_lead
from models.tasks import (
    Task,
    create_task,
    delete_task,
    get_overdue_tasks,
    get_task,
    get_task_by_id,
    get_tasks_by_company,
    get_tasks_by_contact,
    get_tasks_by_lead,
    get_tasks_by_status,
    get_upcoming_tasks,
    list_tasks,
    search_and_paginate_tasks,
    update_task,
)


def test_task_model_fields_and_defaults() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        due = datetime(2026, 12, 31, 10, 0, tzinfo=timezone.utc)
        task = Task(
            description="Follow up on renewal",
            due_date=due,
            completed=False,
            owner="Alice",
        )
        session.add(task)
        session.commit()

        assert task.id is not None
        assert task.description == "Follow up on renewal"
        assert task.title == "Follow up on renewal"
        assert task.name == "Follow up on renewal"
        assert task.due_date == due
        assert task.completed is False
        assert task.company_id is None
        assert task.lead_id is None
        assert task.contact_id is None
        assert task.owner == "Alice"
        assert task.created_at is not None
        assert task.updated_at is not None
        assert task.overdue is False


def test_task_property_setters() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        task = Task(description="Initial")
        task.title = "Updated via Title Property"
        assert task.description == "Updated via Title Property"

        task.name = "Updated via Name Property"
        assert task.description == "Updated via Name Property"


def test_task_overdue_property() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        past = datetime.now(timezone.utc) - timedelta(days=2)
        future = datetime.now(timezone.utc) + timedelta(days=2)

        t1 = Task(description="Past Task", due_date=past, completed=False)
        t2 = Task(description="Past Task Completed", due_date=past, completed=True)
        t3 = Task(description="Future Task", due_date=future, completed=False)
        t4 = Task(description="No Due Date", due_date=None, completed=False)

        assert t1.overdue is True
        assert t2.overdue is False
        assert t3.overdue is False
        assert t4.overdue is False


def test_task_indexes() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    inspector = inspect(engine)
    indexes = inspector.get_indexes("tasks")
    indexed_columns = [col for idx in indexes for col in idx["column_names"]]

    assert "description" in indexed_columns
    assert "due_date" in indexed_columns
    assert "completed" in indexed_columns
    assert "company_id" in indexed_columns
    assert "lead_id" in indexed_columns
    assert "contact_id" in indexed_columns


def test_create_and_get_task() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        company = create_company(session, name="Acme Corp")
        lead = create_lead(session, title="Project X", company_id=company.id)
        contact = create_contact(session, name="Bob", email="bob@acme.com", company_id=company.id)

        due_str = "2026-11-15T14:30:00"
        task = create_task(
            session,
            description="Prepare slide deck",
            due_date=due_str,
            completed=False,
            company_id=company.id,
            lead_id=lead.id,
            contact_id=contact.id,
            owner="Alice",
        )

        assert task.id is not None
        assert task.description == "Prepare slide deck"
        assert task.due_date is not None
        assert task.due_date.year == 2026
        assert task.due_date.month == 11
        assert task.due_date.day == 15
        assert task.company_id == company.id
        assert task.lead_id == lead.id
        assert task.contact_id == contact.id
        assert task.company.name == "Acme Corp"
        assert task.lead.title == "Project X"
        assert task.contact.name == "Bob"

        fetched = get_task_by_id(session, task.id)
        assert fetched is not None
        assert fetched.id == task.id

        alias_fetched = get_task(session, task.id)
        assert alias_fetched is not None
        assert alias_fetched.id == task.id

        assert get_task(session, 99999) is None


def test_create_task_with_date_and_datetime() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        dt_val = datetime(2026, 10, 5, 9, 0, tzinfo=timezone.utc)
        t1 = create_task(session, description="Task 1", due_date=dt_val)
        assert t1.due_date == dt_val

        d_val = date(2026, 10, 10)
        t2 = create_task(session, title="Task 2", due_date=d_val)
        assert t2.due_date is not None
        assert t2.due_date.year == 2026
        assert t2.due_date.month == 10
        assert t2.due_date.day == 10


def test_update_task() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        task = create_task(session, description="Original Task", completed=False)

        updated = update_task(
            session,
            task.id,
            {
                "description": "Updated Task Description",
                "completed": True,
                "due_date": "2026-12-01T00:00:00",
            },
        )

        assert updated is not None
        assert updated.description == "Updated Task Description"
        assert updated.completed is True
        assert updated.due_date is not None
        assert updated.due_date.year == 2026

        # Test updating non-existent task
        assert update_task(session, 999, {"description": "X"}) is None


def test_delete_task() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        task = create_task(session, description="To be deleted")
        assert delete_task(session, task.id) is True
        assert get_task(session, task.id) is None
        assert delete_task(session, task.id) is False


def test_list_tasks_filtering_and_sorting() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        now = datetime.now(timezone.utc)
        past = now - timedelta(days=2)
        future = now + timedelta(days=2)

        t_past = create_task(session, description="Past Task", due_date=past, completed=False)
        t_future = create_task(session, description="Future Task", due_date=future, completed=False)
        t_done = create_task(session, description="Completed Task", due_date=past, completed=True)
        t_nodue = create_task(session, description="No Due Date", due_date=None, completed=False)

        # List all
        all_tasks = list_tasks(session)
        assert len(all_tasks) == 4
        # Ordered by due_date asc nulls_last: past, future, nodue (done is past too)

        # Filter by completed boolean
        completed_tasks = list_tasks(session, completed=True)
        assert len(completed_tasks) == 1
        assert completed_tasks[0].id == t_done.id

        # Filter by status="overdue"
        overdue_tasks = list_tasks(session, status="overdue")
        assert len(overdue_tasks) == 1
        assert overdue_tasks[0].id == t_past.id

        # Filter by status="completed"
        done_tasks = list_tasks(session, status="completed")
        assert len(done_tasks) == 1
        assert done_tasks[0].id == t_done.id

        # Filter by status="pending"
        pending_tasks = list_tasks(session, status="pending")
        assert len(pending_tasks) == 3


def test_get_overdue_and_upcoming_tasks() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        ref_now = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)

        t_past = create_task(
            session,
            description="Overdue Task",
            due_date=ref_now - timedelta(days=1),
            completed=False,
        )
        t_upcoming_1 = create_task(
            session,
            description="Upcoming Task 1",
            due_date=ref_now + timedelta(days=2),
            completed=False,
        )
        t_upcoming_2 = create_task(
            session,
            description="Upcoming Task 2",
            due_date=ref_now + timedelta(days=5),
            completed=False,
        )
        t_far = create_task(
            session,
            description="Far Future Task",
            due_date=ref_now + timedelta(days=20),
            completed=False,
        )

        overdue = get_overdue_tasks(session, now=ref_now)
        assert len(overdue) == 1
        assert overdue[0].id == t_past.id

        upcoming = get_upcoming_tasks(session, days=7, now=ref_now)
        assert len(upcoming) == 2
        assert [t.id for t in upcoming] == [t_upcoming_1.id, t_upcoming_2.id]


def test_get_tasks_by_entity() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        c1 = create_company(session, name="Company 1")
        l1 = create_lead(session, title="Lead 1")
        cnt1 = create_contact(session, name="Contact 1", email="c1@example.com")

        t1 = create_task(session, description="Task for C1", company_id=c1.id)
        t2 = create_task(session, description="Task for L1", lead_id=l1.id)
        t3 = create_task(session, description="Task for Cnt1", contact_id=cnt1.id)

        c1_tasks = get_tasks_by_company(session, c1.id)
        assert len(c1_tasks) == 1
        assert c1_tasks[0].id == t1.id

        l1_tasks = get_tasks_by_lead(session, l1.id)
        assert len(l1_tasks) == 1
        assert l1_tasks[0].id == t2.id

        cnt1_tasks = get_tasks_by_contact(session, cnt1.id)
        assert len(cnt1_tasks) == 1
        assert cnt1_tasks[0].id == t3.id


def test_get_tasks_by_status() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        t_completed = create_task(session, description="Task Completed", completed=True)
        t_pending = create_task(session, description="Task Pending", completed=False)

        res_completed = get_tasks_by_status(session, "completed")
        assert len(res_completed) == 1
        assert res_completed[0].id == t_completed.id

        res_pending = get_tasks_by_status(session, "pending")
        assert len(res_pending) == 1
        assert res_pending[0].id == t_pending.id


def test_search_and_paginate_tasks() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        ref_now = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)

        t1 = create_task(
            session,
            description="Alpha Call client",
            owner="Alice",
            due_date=ref_now + timedelta(days=1),
            completed=False,
        )
        t2 = create_task(
            session,
            description="Beta Email prospect",
            owner="Bob",
            due_date=ref_now + timedelta(days=3),
            completed=True,
        )
        t3 = create_task(
            session,
            description="Gamma Prepare proposal",
            owner="Alice",
            due_date=ref_now + timedelta(days=2),
            completed=False,
        )

        # Search term matching description
        items, total = search_and_paginate_tasks(session, search="prospect")
        assert total == 1
        assert items[0].id == t2.id

        # Search term matching owner
        items, total = search_and_paginate_tasks(session, search="Alice")
        assert total == 2

        # Sort by description asc
        items, total = search_and_paginate_tasks(session, sort_by="description", order="asc")
        assert total == 3
        assert [t.id for t in items] == [t1.id, t2.id, t3.id]

        # Pagination
        items, total = search_and_paginate_tasks(
            session, sort_by="due_date", order="asc", page=1, page_size=2
        )
        assert total == 3
        assert len(items) == 2
        assert [t.id for t in items] == [t1.id, t3.id]

        items_p2, total_p2 = search_and_paginate_tasks(
            session, sort_by="due_date", order="asc", page=2, page_size=2
        )
        assert total_p2 == 3
        assert len(items_p2) == 1
        assert items_p2[0].id == t2.id
