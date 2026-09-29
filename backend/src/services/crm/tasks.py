"""TaskCrm service module providing CRUD operations, overdue computation, and FK validation."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from sqlalchemy import nullslast
from sqlalchemy.orm import Session

from models.crm import Company, Contact, LeadCrm, TaskCrm
from services.crm.exceptions import InvalidForeignKeyError, TaskNotFoundError
from services.crm.schemas import TaskCreate, TaskUpdate


def compute_overdue(
    due_date: Optional[datetime], now: Optional[datetime] = None
) -> bool:
    """Compute whether a task is overdue based on its due date.

    Args:
        due_date: The due date of the task (in UTC), or None if no due date.
        now: Optional current datetime to compare against (defaults to current UTC time).

    Returns:
        True if due_date is provided and in the past relative to now, False otherwise.
    """
    if due_date is None:
        return False

    if now is None:
        now = datetime.now(timezone.utc)

    # Ensure both datetimes are timezone-aware in UTC for comparison
    if due_date.tzinfo is None:
        due_date = due_date.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    return due_date < now


def create_task(
    db: Session, task_in: Union[TaskCreate, Dict[str, Any]]
) -> TaskCrm:
    """Create a new task in the database with optional FK validation.

    Args:
        db: SQLAlchemy database session.
        task_in: TaskCrm creation data (TaskCreate schema or dict).

    Returns:
        The created TaskCrm model instance.

    Raises:
        InvalidForeignKeyError: If lead_id, contact_id, or company_id references
            a non-existent entity.
        pydantic.ValidationError: If creation data is invalid.
    """
    if isinstance(task_in, dict):
        task_in = TaskCreate(**task_in)

    if task_in.company_id is not None:
        company_exists = (
            db.query(Company.id).filter(Company.id == task_in.company_id).first()
            is not None
        )
        if not company_exists:
            raise InvalidForeignKeyError(
                f"Company ID {task_in.company_id} does not exist"
            )

    if task_in.contact_id is not None:
        contact_exists = (
            db.query(Contact.id).filter(Contact.id == task_in.contact_id).first()
            is not None
        )
        if not contact_exists:
            raise InvalidForeignKeyError(
                f"Contact ID {task_in.contact_id} does not exist"
            )

    if task_in.lead_id is not None:
        lead_exists = (
            db.query(LeadCrm.id).filter(LeadCrm.id == task_in.lead_id).first()
            is not None
        )
        if not lead_exists:
            raise InvalidForeignKeyError(
                f"LeadCrm ID {task_in.lead_id} does not exist"
            )

    task = TaskCrm(
        title=task_in.title,
        owner=task_in.owner,
        due_date=task_in.due_date,
        lead_id=task_in.lead_id,
        contact_id=task_in.contact_id,
        company_id=task_in.company_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def get_task(db: Session, task_id: int) -> Optional[TaskCrm]:
    """Retrieve a task by its ID.

    Args:
        db: SQLAlchemy database session.
        task_id: The ID of the task to retrieve.

    Returns:
        The TaskCrm model instance if found, or None.
    """
    return db.query(TaskCrm).filter(TaskCrm.id == task_id).first()


def list_tasks(
    db: Session, skip: int = 0, limit: Optional[int] = None
) -> List[TaskCrm]:
    """List tasks sorted by due_date ascending, with NULL due_dates last.

    Args:
        db: SQLAlchemy database session.
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.

    Returns:
        List of TaskCrm model instances.
    """
    query = db.query(TaskCrm).order_by(nullslast(TaskCrm.due_date.asc()))
    if skip > 0:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def update_task(
    db: Session,
    task_id: int,
    task_in: Union[TaskUpdate, Dict[str, Any]],
) -> TaskCrm:
    """Update an existing task with optional FK validation.

    Args:
        db: SQLAlchemy database session.
        task_id: The ID of the task to update.
        task_in: TaskCrm update data (TaskUpdate schema or dict).

    Returns:
        The updated TaskCrm model instance.

    Raises:
        TaskNotFoundError: If task with task_id does not exist.
        InvalidForeignKeyError: If an updated lead_id, contact_id, or company_id
            references a non-existent entity.
        pydantic.ValidationError: If update data is invalid.
    """
    task = get_task(db, task_id)
    if not task:
        raise TaskNotFoundError(f"TaskCrm with ID {task_id} not found.")

    if isinstance(task_in, dict):
        task_in = TaskUpdate(**task_in)

    update_data = task_in.model_dump(exclude_unset=True)

    if "company_id" in update_data and update_data["company_id"] is not None:
        company_id = update_data["company_id"]
        company_exists = (
            db.query(Company.id).filter(Company.id == company_id).first() is not None
        )
        if not company_exists:
            raise InvalidForeignKeyError(
                f"Company ID {company_id} does not exist"
            )

    if "contact_id" in update_data and update_data["contact_id"] is not None:
        contact_id = update_data["contact_id"]
        contact_exists = (
            db.query(Contact.id).filter(Contact.id == contact_id).first() is not None
        )
        if not contact_exists:
            raise InvalidForeignKeyError(
                f"Contact ID {contact_id} does not exist"
            )

    if "lead_id" in update_data and update_data["lead_id"] is not None:
        lead_id = update_data["lead_id"]
        lead_exists = (
            db.query(LeadCrm.id).filter(LeadCrm.id == lead_id).first() is not None
        )
        if not lead_exists:
            raise InvalidForeignKeyError(
                f"LeadCrm ID {lead_id} does not exist"
            )

    for field, value in update_data.items():
        setattr(task, field, value)

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int) -> bool:
    """Delete a task by its ID.

    Args:
        db: SQLAlchemy database session.
        task_id: The ID of the task to delete.

    Returns:
        True if deleted successfully.

    Raises:
        TaskNotFoundError: If task with task_id does not exist.
    """
    task = get_task(db, task_id)
    if not task:
        raise TaskNotFoundError(f"TaskCrm with ID {task_id} not found.")

    db.delete(task)
    db.commit()
    return True
