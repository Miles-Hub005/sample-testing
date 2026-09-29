"""Task domain service providing CRUD operations, validation, overdue detection, and company/lead optional linking."""

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

from pydantic import BaseModel
from sqlalchemy.orm import Session

from models.companies import Company
from models.contacts import Contact
from models.leads import Lead
from models.tasks import (
    Task,
    create_task as model_create_task,
    delete_task as model_delete_task,
    get_overdue_tasks as model_get_overdue_tasks,
    get_task_by_id as model_get_task_by_id,
    get_tasks_by_company as model_get_tasks_by_company,
    get_tasks_by_contact as model_get_tasks_by_contact,
    get_tasks_by_lead as model_get_tasks_by_lead,
    get_upcoming_tasks as model_get_upcoming_tasks,
    list_tasks as model_list_tasks,
    search_and_paginate_tasks as model_search_and_paginate_tasks,
    update_task as model_update_task,
)
from services.tasks.exceptions import (
    InvalidForeignKeyError,
    TaskNotFoundError,
    TaskValidationError,
)


def _extract_task_data(
    task_in: Union[BaseModel, Dict[str, Any], None] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Extract task data dictionary from Pydantic model, dict, or kwargs."""
    data: Dict[str, Any] = {}
    if task_in is not None:
        if isinstance(task_in, BaseModel):
            data = task_in.model_dump(exclude_unset=True)
        elif isinstance(task_in, dict):
            data = dict(task_in)
    for k, v in kwargs.items():
        if v is not None or k not in data:
            data[k] = v
    return data


def _validate_description(
    raw_description: Any = None,
    raw_title: Any = None,
    raw_name: Any = None,
) -> str:
    """Validate and clean task description (or title/name alias).

    Raises:
        TaskValidationError: If description is missing or empty string.
    """
    chosen = None
    if raw_description is not None:
        chosen = raw_description
    elif raw_title is not None:
        chosen = raw_title
    elif raw_name is not None:
        chosen = raw_name

    if chosen is None or not str(chosen).strip():
        raise TaskValidationError("Task description is required and cannot be empty.")
    return str(chosen).strip()


def _validate_due_date(
    raw_due_date: Any,
    allow_none: bool = False,
) -> Optional[datetime]:
    """Validate and normalize task due_date.

    Args:
        raw_due_date: Date, datetime, or ISO string.
        allow_none: If True, None is allowed. If False, missing/None raises validation error.

    Returns:
        Normalized UTC datetime or None if allow_none=True.

    Raises:
        TaskValidationError: If due_date is missing (when allow_none=False) or invalid format.
    """
    if raw_due_date is None or (isinstance(raw_due_date, str) and not raw_due_date.strip()):
        if allow_none:
            return None
        raise TaskValidationError("Task due_date is required and cannot be empty.")

    if isinstance(raw_due_date, datetime):
        if raw_due_date.tzinfo is None:
            return raw_due_date.replace(tzinfo=timezone.utc)
        return raw_due_date

    if isinstance(raw_due_date, date):
        return datetime(raw_due_date.year, raw_due_date.month, raw_due_date.day, tzinfo=timezone.utc)

    if isinstance(raw_due_date, str):
        cleaned = raw_due_date.strip()
        try:
            dt = datetime.fromisoformat(cleaned)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            raise TaskValidationError(
                f"Invalid due_date format: '{cleaned}'. Must be a valid ISO date or datetime."
            )

    raise TaskValidationError(f"Invalid due_date value: {raw_due_date}")


def _validate_foreign_keys(
    db: Session,
    company_id: Optional[int] = None,
    lead_id: Optional[int] = None,
    contact_id: Optional[int] = None,
) -> None:
    """Validate optional foreign key links to company, lead, and contact.

    Raises:
        InvalidForeignKeyError: If any non-None foreign key references a non-existent record.
    """
    if company_id is not None:
        exists = db.query(Company.id).filter(Company.id == company_id).first() is not None
        if not exists:
            raise InvalidForeignKeyError(f"Company ID {company_id} does not exist.")

    if lead_id is not None:
        exists = db.query(Lead.id).filter(Lead.id == lead_id).first() is not None
        if not exists:
            raise InvalidForeignKeyError(f"Lead ID {lead_id} does not exist.")

    if contact_id is not None:
        exists = db.query(Contact.id).filter(Contact.id == contact_id).first() is not None
        if not exists:
            raise InvalidForeignKeyError(f"Contact ID {contact_id} does not exist.")


def compute_overdue(
    due_date: Optional[Union[date, datetime, str]],
    completed: bool = False,
    now: Optional[datetime] = None,
) -> bool:
    """Compute whether a task is incomplete and overdue relative to a given reference time.

    Args:
        due_date: Due date as date, datetime, or ISO string.
        completed: Completion status flag.
        now: Optional reference datetime (defaults to current UTC time).

    Returns:
        True if incomplete and due_date is in the past relative to now, False otherwise.
    """
    if completed or due_date is None:
        return False

    ref_now = now or datetime.now(timezone.utc)
    if ref_now.tzinfo is None:
        ref_now = ref_now.replace(tzinfo=timezone.utc)

    try:
        norm_due = _validate_due_date(due_date, allow_none=True)
    except TaskValidationError:
        return False

    if norm_due is None:
        return False

    return norm_due < ref_now


def is_task_overdue(
    task: Task,
    now: Optional[datetime] = None,
) -> bool:
    """Check if a Task instance is incomplete and overdue.

    Args:
        task: Task ORM instance.
        now: Optional current reference time.

    Returns:
        True if task is incomplete and due date is in the past, False otherwise.
    """
    if task.completed or task.due_date is None:
        return False
    return compute_overdue(task.due_date, completed=task.completed, now=now)


def get_overdue_tasks(
    db: Session,
    now: Optional[datetime] = None,
) -> List[Task]:
    """Retrieve all incomplete tasks that are overdue.

    Args:
        db: SQLAlchemy database session.
        now: Optional current reference datetime.

    Returns:
        List of overdue Task ORM instances.
    """
    return model_get_overdue_tasks(db, now=now)


def get_upcoming_tasks(
    db: Session,
    days: int = 7,
    now: Optional[datetime] = None,
    limit: Optional[int] = None,
) -> List[Task]:
    """Retrieve all incomplete tasks due within the upcoming N days.

    Args:
        db: SQLAlchemy database session.
        days: Number of days into the future to check (default 7).
        now: Optional reference datetime.
        limit: Optional maximum number of tasks to return.

    Returns:
        List of upcoming Task ORM instances.
    """
    return model_get_upcoming_tasks(db, days=days, now=now, limit=limit)


def create_task(
    db: Session,
    task_in: Union[BaseModel, Dict[str, Any], None] = None,
    description: Optional[str] = None,
    title: Optional[str] = None,
    name: Optional[str] = None,
    due_date: Optional[Union[date, datetime, str]] = None,
    completed: bool = False,
    company_id: Optional[int] = None,
    lead_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    owner: Optional[str] = None,
    **kwargs: Any,
) -> Task:
    """Create a new task record with required-field validation and optional linking.

    Args:
        db: SQLAlchemy database session.
        task_in: Optional Pydantic model or dict with task attributes.
        description: Description of the task (required).
        title: Property alias for description.
        name: Property alias for description.
        due_date: Due date of the task (required).
        completed: Task completion status (default False).
        company_id: Optional associated company ID (FR-4).
        lead_id: Optional associated lead ID (FR-4).
        contact_id: Optional associated contact ID.
        owner: Optional owner name.
        **kwargs: Additional task fields.

    Returns:
        Created Task ORM model instance.

    Raises:
        TaskValidationError: If description or due_date is missing or invalid.
        InvalidForeignKeyError: If company_id, lead_id, or contact_id does not exist.
    """
    data = _extract_task_data(
        task_in,
        description=description,
        title=title,
        name=name,
        due_date=due_date,
        completed=completed,
        company_id=company_id,
        lead_id=lead_id,
        contact_id=contact_id,
        owner=owner,
        **kwargs,
    )

    cleaned_desc = _validate_description(
        data.get("description"), data.get("title"), data.get("name")
    )
    cleaned_due_date = _validate_due_date(data.get("due_date"), allow_none=False)

    comp_id = data.get("company_id")
    ld_id = data.get("lead_id")
    cnt_id = data.get("contact_id")
    _validate_foreign_keys(db, company_id=comp_id, lead_id=ld_id, contact_id=cnt_id)

    is_completed = bool(data.get("completed", False))
    task_owner = str(data.get("owner", "") or "")

    return model_create_task(
        db=db,
        description=cleaned_desc,
        due_date=cleaned_due_date,
        completed=is_completed,
        company_id=comp_id,
        lead_id=ld_id,
        contact_id=cnt_id,
        owner=task_owner,
    )


def get_task(db: Session, task_id: int) -> Optional[Task]:
    """Retrieve a task by primary key ID.

    Args:
        db: SQLAlchemy database session.
        task_id: ID of the task to retrieve.

    Returns:
        Task model instance if found, or None.
    """
    return model_get_task_by_id(db, task_id)


def get_task_by_id(db: Session, task_id: int) -> Optional[Task]:
    """Retrieve a task by primary key ID (alias for get_task)."""
    return get_task(db, task_id)


def get_tasks_by_company(db: Session, company_id: int) -> List[Task]:
    """Retrieve all tasks associated with a company ID."""
    return model_get_tasks_by_company(db, company_id)


def get_tasks_by_lead(db: Session, lead_id: int) -> List[Task]:
    """Retrieve all tasks associated with a lead ID."""
    return model_get_tasks_by_lead(db, lead_id)


def get_tasks_by_contact(db: Session, contact_id: int) -> List[Task]:
    """Retrieve all tasks associated with a contact ID."""
    return model_get_tasks_by_contact(db, contact_id)


def list_tasks(
    db: Session,
    skip: int = 0,
    limit: Optional[int] = None,
    search: Optional[str] = None,
    status: Optional[str] = None,
    completed: Optional[bool] = None,
    company_id: Optional[int] = None,
    lead_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    sort_by: str = "due_date",
    order: str = "asc",
    page: Optional[int] = None,
    page_size: Optional[int] = None,
) -> Union[List[Task], Tuple[List[Task], int]]:
    """List tasks, or search/filter and paginate if search/pagination parameters are supplied.

    Args:
        db: SQLAlchemy database session.
        skip: Offset for simple listing.
        limit: Limit for simple listing.
        search: Optional search term matching description or owner.
        status: Optional status string filter ("completed", "pending", "overdue").
        completed: Optional completion boolean filter.
        company_id: Optional filter by associated company ID.
        lead_id: Optional filter by associated lead ID.
        contact_id: Optional filter by associated contact ID.
        sort_by: Attribute to sort by ("due_date", "description", etc.).
        order: Sort direction ("asc" or "desc").
        page: Optional 1-based page index.
        page_size: Optional items per page.

    Returns:
        List of Task instances, or Tuple of (items, total count) if searched/filtered/paginated.
    """
    if (
        search is not None
        or status is not None
        or completed is not None
        or company_id is not None
        or lead_id is not None
        or contact_id is not None
        or page is not None
        or page_size is not None
    ):
        p = page if page is not None else 1
        ps = page_size if page_size is not None else (limit if limit else 20)
        return model_search_and_paginate_tasks(
            db=db,
            search=search,
            status=status,
            completed=completed,
            company_id=company_id,
            lead_id=lead_id,
            contact_id=contact_id,
            sort_by=sort_by,
            order=order,
            page=p,
            page_size=ps,
        )

    return model_list_tasks(db=db, skip=skip, limit=limit, status=status, completed=completed)


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

    Returns:
        Tuple of (matching Task instances, total count).
    """
    return model_search_and_paginate_tasks(
        db=db,
        search=search,
        status=status,
        completed=completed,
        company_id=company_id,
        lead_id=lead_id,
        contact_id=contact_id,
        sort_by=sort_by,
        order=order,
        page=page,
        page_size=page_size,
    )


def update_task(
    db: Session,
    task_id: int,
    task_in: Union[BaseModel, Dict[str, Any], None] = None,
    **kwargs: Any,
) -> Task:
    """Update an existing task record with validation rules.

    Args:
        db: SQLAlchemy database session.
        task_id: ID of the task to update.
        task_in: Optional Pydantic model or dict with update fields.
        **kwargs: Additional keyword arguments for field updates.

    Returns:
        Updated Task ORM model instance.

    Raises:
        TaskNotFoundError: If task with task_id is not found.
        TaskValidationError: If description or due_date is updated to an empty value.
        InvalidForeignKeyError: If company_id, lead_id, or contact_id is non-existent.
    """
    task = get_task(db, task_id)
    if not task:
        raise TaskNotFoundError(f"Task with ID {task_id} not found.")

    updates = _extract_task_data(task_in, **kwargs)

    if any(k in updates for k in ("description", "title", "name")):
        raw_desc = updates.get("description")
        if raw_desc is None and "title" in updates:
            raw_desc = updates.get("title")
        if raw_desc is None and "name" in updates:
            raw_desc = updates.get("name")

        updates["description"] = _validate_description(raw_desc)
        if "title" in updates:
            del updates["title"]
        if "name" in updates:
            del updates["name"]

    if "due_date" in updates:
        raw_dd = updates["due_date"]
        if raw_dd is None or (isinstance(raw_dd, str) and not raw_dd.strip()):
            raise TaskValidationError("Task due_date cannot be set to None or empty.")
        updates["due_date"] = _validate_due_date(raw_dd, allow_none=False)

    comp_id = updates.get("company_id") if "company_id" in updates else None
    ld_id = updates.get("lead_id") if "lead_id" in updates else None
    cnt_id = updates.get("contact_id") if "contact_id" in updates else None
    _validate_foreign_keys(db, company_id=comp_id, lead_id=ld_id, contact_id=cnt_id)

    updated = model_update_task(db, task_id, updates)
    if updated is None:
        raise TaskNotFoundError(f"Task with ID {task_id} not found.")
    return updated


def delete_task(db: Session, task_id: int) -> bool:
    """Delete a task record by ID.

    Args:
        db: SQLAlchemy database session.
        task_id: ID of the task to delete.

    Returns:
        True if task was deleted.

    Raises:
        TaskNotFoundError: If task does not exist.
    """
    task = get_task(db, task_id)
    if not task:
        raise TaskNotFoundError(f"Task with ID {task_id} not found.")

    return model_delete_task(db, task_id)
