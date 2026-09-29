"""Lead service module providing CRUD operations and business logic (wrapper around services.leads.service)."""

from typing import Any, Dict, List, Optional, Union
from sqlalchemy.orm import Session

from models.leads import Lead
from services.leads.service import (
    create_lead as service_create_lead,
    delete_lead as service_delete_lead,
    get_lead as service_get_lead,
    list_leads as service_list_leads,
    update_lead as service_update_lead,
)
from services.crm.exceptions import InvalidForeignKeyError, LeadNotFoundError
from services.crm.schemas import LeadCreate, LeadUpdate


def create_lead(
    db: Session, lead_in: Union[LeadCreate, Dict[str, Any]]
) -> Lead:
    """Create a new lead in the database.

    Args:
        db: SQLAlchemy database session.
        lead_in: Lead creation data (LeadCreate schema or dict).

    Returns:
        The created Lead model instance.

    Raises:
        InvalidForeignKeyError: If the provided company_id does not exist.
        pydantic.ValidationError: If creation data is invalid.
    """
    data: Dict[str, Any] = {}
    if isinstance(lead_in, LeadCreate):
        data = lead_in.model_dump(exclude_unset=True)
    elif isinstance(lead_in, dict):
        data = dict(lead_in)

    return service_create_lead(db, lead_in=data)


def get_lead(db: Session, lead_id: int) -> Optional[Lead]:
    """Retrieve a lead by its ID.

    Args:
        db: SQLAlchemy database session.
        lead_id: The ID of the lead to retrieve.

    Returns:
        The Lead model instance if found, or None.
    """
    return service_get_lead(db, lead_id)


def list_leads(
    db: Session, skip: int = 0, limit: Optional[int] = None
) -> List[Lead]:
    """List leads sorted by title A-Z.

    Args:
        db: SQLAlchemy database session.
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.

    Returns:
        List of Lead model instances.
    """
    res = service_list_leads(db, skip=skip, limit=limit)
    if isinstance(res, tuple):
        return res[0]
    return res


def update_lead(
    db: Session,
    lead_id: int,
    lead_in: Union[LeadUpdate, Dict[str, Any]],
) -> Lead:
    """Update an existing lead.

    Args:
        db: SQLAlchemy database session.
        lead_id: The ID of the lead to update.
        lead_in: Lead update data (LeadUpdate schema or dict).

    Returns:
        The updated Lead model instance.

    Raises:
        LeadNotFoundError: If lead is not found.
        InvalidForeignKeyError: If company_id is invalid.
    """
    data: Dict[str, Any] = {}
    if isinstance(lead_in, LeadUpdate):
        data = lead_in.model_dump(exclude_unset=True)
    elif isinstance(lead_in, dict):
        data = dict(lead_in)

    return service_update_lead(db, lead_id, data)


def delete_lead(db: Session, lead_id: int) -> bool:
    """Delete a lead by ID.

    Args:
        db: SQLAlchemy database session.
        lead_id: ID of the lead to delete.

    Returns:
        True if deleted successfully.

    Raises:
        LeadNotFoundError: If lead is not found.
    """
    return service_delete_lead(db, lead_id)
