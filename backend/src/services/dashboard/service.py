"""Dashboard service providing aggregation queries for CRM metrics (FR-6).

Aggregates:
- Pipeline totals by status (total value & count)
- Upcoming tasks (next 7 days)
- Overdue tasks
- Recent interactions (last 10)
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from models.interactions import (
    Interaction,
    get_recent_interactions as model_get_recent_interactions,
)
from models.leads import get_pipeline_by_status as model_get_pipeline_by_status
from models.tasks import (
    Task,
    get_overdue_tasks as model_get_overdue_tasks,
    get_upcoming_tasks as model_get_upcoming_tasks,
)


def get_pipeline_totals_by_status(db: Session) -> List[Dict[str, Any]]:
    """Retrieve total pipeline value and lead count grouped by lead status stage.

    Args:
        db: SQLAlchemy database session.

    Returns:
        List of dictionaries with keys 'status', 'count', and 'total_value'.
    """
    return model_get_pipeline_by_status(db)


def get_pipeline_summary(db: Session) -> List[Dict[str, Any]]:
    """Retrieve total pipeline value and lead count grouped by status (alias).

    Args:
        db: SQLAlchemy database session.

    Returns:
        List of dictionaries with keys 'status', 'count', and 'total_value'.
    """
    return get_pipeline_totals_by_status(db)


def get_upcoming_tasks(
    db: Session,
    days: int = 7,
    now: Optional[datetime] = None,
    limit: Optional[int] = None,
) -> List[Task]:
    """Retrieve incomplete tasks due within the upcoming N days (default 7 days).

    Args:
        db: SQLAlchemy database session.
        days: Number of days into the future to include (default 7).
        now: Optional reference datetime.
        limit: Optional maximum number of tasks to return.

    Returns:
        List of Task ORM instances.
    """
    return model_get_upcoming_tasks(db, days=days, now=now, limit=limit)


def get_overdue_tasks(
    db: Session,
    now: Optional[datetime] = None,
) -> List[Task]:
    """Retrieve all incomplete overdue tasks where due_date is prior to reference time.

    Args:
        db: SQLAlchemy database session.
        now: Optional reference datetime.

    Returns:
        List of Task ORM instances.
    """
    return model_get_overdue_tasks(db, now=now)


def get_recent_interactions(
    db: Session,
    limit: int = 10,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    lead_id: Optional[int] = None,
) -> List[Interaction]:
    """Retrieve recent interactions ordered by date descending (default 10).

    Args:
        db: SQLAlchemy database session.
        limit: Maximum number of interactions to return (default 10).
        company_id: Optional company ID filter.
        contact_id: Optional contact ID filter.
        lead_id: Optional lead ID filter.

    Returns:
        List of Interaction ORM instances.
    """
    return model_get_recent_interactions(
        db,
        limit=limit,
        company_id=company_id,
        contact_id=contact_id,
        lead_id=lead_id,
    )


def get_dashboard_summary(
    db: Session,
    task_days: int = 7,
    interaction_limit: int = 10,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Retrieve unified dashboard summary containing pipeline, upcoming tasks, overdue tasks, and recent interactions.

    Args:
        db: SQLAlchemy database session.
        task_days: Number of upcoming days for tasks widget (default 7).
        interaction_limit: Limit for recent interactions widget (default 10).
        now: Optional reference datetime.

    Returns:
        Dictionary containing:
        - 'pipeline_by_status': list of pipeline status summary dicts
        - 'upcoming_tasks': list of upcoming Task models
        - 'overdue_tasks': list of overdue Task models
        - 'recent_interactions': list of recent Interaction models
    """
    return {
        "pipeline_by_status": get_pipeline_summary(db),
        "upcoming_tasks": get_upcoming_tasks(db, days=task_days, now=now),
        "overdue_tasks": get_overdue_tasks(db, now=now),
        "recent_interactions": get_recent_interactions(db, limit=interaction_limit),
    }
