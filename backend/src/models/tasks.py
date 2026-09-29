"""Task database model and query helpers."""

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, asc, desc, or_
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship

from models.base import Base, TimestampMixin
from models.companies import Company
from models.contacts import Contact
from models.leads import Lead


class Task(Base, TimestampMixin):
    """Task model representing a follow-up action or task in the CRM."""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    description: Mapped[str] = mapped_column(
        Text, nullable=False, default="", index=True
    )
    due_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    completed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, index=True
    )
    company_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("companies.id"), nullable=True, index=True
    )
    lead_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("leads.id"), nullable=True, index=True
    )
    contact_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("contacts.id"), nullable=True, index=True
    )
    owner: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, default=""
    )

    company: Mapped[Optional[Company]] = relationship("Company")
    lead: Mapped[Optional[Lead]] = relationship("Lead")
    contact: Mapped[Optional[Contact]] = relationship("Contact")

    @property
    def title(self) -> str:
        """Property alias for description."""
        return self.description

    @title.setter
    def title(self, val: str) -> None:
        """Property setter alias for description."""
        self.description = val

    @property
    def name(self) -> str:
        """Property alias for description."""
        return self.description

    @name.setter
    def name(self, val: str) -> None:
        """Property setter alias for description."""
        self.description = val

    @property
    def overdue(self) -> bool:
        """Check if task is incomplete and overdue relative to current UTC time."""
        if self.completed or self.due_date is None:
            return False
        now = datetime.now(timezone.utc)
        due = self.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        return due < now


def _normalize_datetime(
    dt_val: Optional[Union[date, datetime, str]]
) -> Optional[datetime]:
    """Coerce input date, datetime, or ISO string to UTC datetime."""
    if dt_val is None:
        return None
    if isinstance(dt_val, datetime):
        if dt_val.tzinfo is None:
            return dt_val.replace(tzinfo=timezone.utc)
        return dt_val
    if isinstance(dt_val, date):
        return datetime(dt_val.year, dt_val.month, dt_val.day, tzinfo=timezone.utc)
    if isinstance(dt_val, str):
        cleaned = dt_val.strip()
        if not cleaned:
            return None
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    return None


def create_task(
    db: Session,
    description: Optional[str] = None,
    due_date: Optional[Union[date, datetime, str]] = None,
    completed: bool = False,
    company_id: Optional[int] = None,
    lead_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    owner: Optional[str] = None,
    title: Optional[str] = None,
) -> Task:
    """Create a new task in the database."""
    task_description = description if description is not None else (title or "")
    normalized_due_date = _normalize_datetime(due_date)

    task = Task(
        description=task_description,
        due_date=normalized_due_date,
        completed=completed,
        company_id=company_id,
        lead_id=lead_id,
        contact_id=contact_id,
        owner=owner or "",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def get_task_by_id(db: Session, task_id: int) -> Optional[Task]:
    """Retrieve a task by its ID."""
    return db.query(Task).filter(Task.id == task_id).first()


def get_task(db: Session, task_id: int) -> Optional[Task]:
    """Retrieve a task by its ID (alias for get_task_by_id)."""
    return get_task_by_id(db, task_id)


def update_task(
    db: Session,
    task_id: int,
    updates: Dict[str, Any],
) -> Optional[Task]:
    """Update an existing task by ID."""
    task = get_task_by_id(db, task_id)
    if not task:
        return None

    for key, value in updates.items():
        if key == "due_date":
            setattr(task, "due_date", _normalize_datetime(value))
        elif key in ("title", "name") and "description" not in updates:
            setattr(task, "description", value)
        elif hasattr(task, key):
            setattr(task, key, value)

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int) -> bool:
    """Delete a task by ID."""
    task = get_task_by_id(db, task_id)
    if not task:
        return False

    db.delete(task)
    db.commit()
    return True


def list_tasks(
    db: Session,
    skip: int = 0,
    limit: Optional[int] = None,
    status: Optional[str] = None,
    completed: Optional[bool] = None,
) -> List[Task]:
    """List tasks, optionally filtered by status or completion state."""
    query = db.query(Task)

    if completed is not None:
        query = query.filter(Task.completed == completed)
    elif status is not None and status.strip():
        st = status.lower().strip()
        if st in ("completed", "done", "true"):
            query = query.filter(Task.completed == True)
        elif st in ("pending", "active", "open", "false", "in_progress", "incomplete"):
            query = query.filter(Task.completed == False)
        elif st == "overdue":
            now = datetime.now(timezone.utc)
            query = query.filter(
                Task.completed == False,
                Task.due_date.isnot(None),
                Task.due_date < now,
            )

    query = query.order_by(asc(Task.due_date).nulls_last(), asc(Task.id))

    if skip > 0:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

    return query.all()


def get_overdue_tasks(
    db: Session,
    now: Optional[datetime] = None,
) -> List[Task]:
    """Retrieve all incomplete tasks where due_date is prior to now."""
    ref_time = now or datetime.now(timezone.utc)
    if ref_time.tzinfo is None:
        ref_time = ref_time.replace(tzinfo=timezone.utc)

    return (
        db.query(Task)
        .filter(
            Task.completed == False,
            Task.due_date.isnot(None),
            Task.due_date < ref_time,
        )
        .order_by(asc(Task.due_date))
        .all()
    )


def get_upcoming_tasks(
    db: Session,
    days: int = 7,
    now: Optional[datetime] = None,
    limit: Optional[int] = None,
) -> List[Task]:
    """Retrieve incomplete tasks due within the upcoming N days."""
    ref_time = now or datetime.now(timezone.utc)
    if ref_time.tzinfo is None:
        ref_time = ref_time.replace(tzinfo=timezone.utc)
    end_time = ref_time + timedelta(days=days)

    query = (
        db.query(Task)
        .filter(
            Task.completed == False,
            Task.due_date.isnot(None),
            Task.due_date >= ref_time,
            Task.due_date <= end_time,
        )
        .order_by(asc(Task.due_date))
    )
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def get_tasks_by_company(db: Session, company_id: int) -> List[Task]:
    """Get all tasks associated with a company."""
    return (
        db.query(Task)
        .filter(Task.company_id == company_id)
        .order_by(asc(Task.due_date).nulls_last(), asc(Task.id))
        .all()
    )


def get_tasks_by_lead(db: Session, lead_id: int) -> List[Task]:
    """Get all tasks associated with a lead."""
    return (
        db.query(Task)
        .filter(Task.lead_id == lead_id)
        .order_by(asc(Task.due_date).nulls_last(), asc(Task.id))
        .all()
    )


def get_tasks_by_contact(db: Session, contact_id: int) -> List[Task]:
    """Get all tasks associated with a contact."""
    return (
        db.query(Task)
        .filter(Task.contact_id == contact_id)
        .order_by(asc(Task.due_date).nulls_last(), asc(Task.id))
        .all()
    )


def get_tasks_by_status(
    db: Session,
    status: str,
    skip: int = 0,
    limit: Optional[int] = None,
) -> List[Task]:
    """Get tasks filtered by status string."""
    return list_tasks(db, skip=skip, limit=limit, status=status)


def search_and_paginate_tasks(
    db: Session,
    search: Optional[str] = None,
    status: Optional[str] = None,
    completed: Optional[bool] = None,
    company_id: Optional[int] = None,
    lead_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    sort_by: str = "due_date",
    order: str = "asc",
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Task], int]:
    """Search, filter, sort, and paginate tasks.

    Args:
        db: Database session.
        search: Term to match description or owner (case-insensitive).
        status: Status string filter ("completed", "pending", "overdue", etc.).
        completed: Boolean completion filter.
        company_id: Optional company ID filter.
        lead_id: Optional lead ID filter.
        contact_id: Optional contact ID filter.
        sort_by: Column to sort by ("due_date", "description", "created_at", "updated_at", "completed").
        order: Sort direction ("asc" or "desc").
        page: Page number (1-based).
        page_size: Items per page.

    Returns:
        Tuple of (list of matching tasks, total count).
    """
    query = db.query(Task)

    if company_id is not None:
        query = query.filter(Task.company_id == company_id)
    if lead_id is not None:
        query = query.filter(Task.lead_id == lead_id)
    if contact_id is not None:
        query = query.filter(Task.contact_id == contact_id)

    if completed is not None:
        query = query.filter(Task.completed == completed)
    elif status is not None and status.strip():
        st = status.lower().strip()
        if st in ("completed", "done", "true"):
            query = query.filter(Task.completed == True)
        elif st in ("pending", "active", "open", "false", "in_progress", "incomplete"):
            query = query.filter(Task.completed == False)
        elif st == "overdue":
            now = datetime.now(timezone.utc)
            query = query.filter(
                Task.completed == False,
                Task.due_date.isnot(None),
                Task.due_date < now,
            )

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Task.description.ilike(term),
                Task.owner.ilike(term),
            )
        )

    total = query.count()

    # Dynamic sorting
    if sort_by in ("title", "name"):
        sort_attr = Task.description
    elif hasattr(Task, sort_by):
        sort_attr = getattr(Task, sort_by)
    else:
        sort_attr = Task.due_date

    is_desc = order.lower() == "desc"

    if sort_by == "due_date":
        if is_desc:
            query = query.order_by(desc(sort_attr).nulls_last(), desc(Task.id))
        else:
            query = query.order_by(asc(sort_attr).nulls_last(), asc(Task.id))
    else:
        if is_desc:
            query = query.order_by(desc(sort_attr), desc(Task.id))
        else:
            query = query.order_by(asc(sort_attr), asc(Task.id))

    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20

    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return items, total
