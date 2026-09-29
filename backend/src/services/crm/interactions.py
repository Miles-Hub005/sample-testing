"""InteractionCrm service module providing append-only CRUD (create/read) operations and business logic."""

from typing import Any, Dict, List, Optional, Union
from sqlalchemy.orm import Session

from models.crm import Company, Contact, InteractionCrm, LeadCrm
from services.crm.exceptions import InvalidForeignKeyError
from services.crm.schemas import InteractionCreate


def create_interaction(
    db: Session, interaction_in: Union[InteractionCreate, Dict[str, Any]]
) -> InteractionCrm:
    """Create a new interaction record with required entity association and FK validation.

    Interactions are append-only and must link to at least one entity (Company,
    Contact, or LeadCrm).

    Args:
        db: SQLAlchemy database session.
        interaction_in: InteractionCrm creation data (InteractionCreate schema or dict).

    Returns:
        The created InteractionCrm model instance.

    Raises:
        InvalidForeignKeyError: If company_id, contact_id, or lead_id references
            a non-existent entity.
        pydantic.ValidationError: If creation data is invalid or missing required entity link.
    """
    if isinstance(interaction_in, dict):
        interaction_in = InteractionCreate(**interaction_in)

    if interaction_in.company_id is not None:
        company_exists = (
            db.query(Company.id)
            .filter(Company.id == interaction_in.company_id)
            .first()
            is not None
        )
        if not company_exists:
            raise InvalidForeignKeyError(
                f"Company ID {interaction_in.company_id} does not exist"
            )

    if interaction_in.contact_id is not None:
        contact_exists = (
            db.query(Contact.id)
            .filter(Contact.id == interaction_in.contact_id)
            .first()
            is not None
        )
        if not contact_exists:
            raise InvalidForeignKeyError(
                f"Contact ID {interaction_in.contact_id} does not exist"
            )

    if interaction_in.lead_id is not None:
        lead_exists = (
            db.query(LeadCrm.id)
            .filter(LeadCrm.id == interaction_in.lead_id)
            .first()
            is not None
        )
        if not lead_exists:
            raise InvalidForeignKeyError(
                f"LeadCrm ID {interaction_in.lead_id} does not exist"
            )

    interaction = InteractionCrm(
        notes=interaction_in.notes,
        timestamp=interaction_in.timestamp,
        company_id=interaction_in.company_id,
        contact_id=interaction_in.contact_id,
        lead_id=interaction_in.lead_id,
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


def get_interaction(db: Session, interaction_id: int) -> Optional[InteractionCrm]:
    """Retrieve an interaction by its ID.

    Args:
        db: SQLAlchemy database session.
        interaction_id: The ID of the interaction to retrieve.

    Returns:
        The InteractionCrm model instance if found, or None.
    """
    return db.query(InteractionCrm).filter(InteractionCrm.id == interaction_id).first()


def list_interactions(
    db: Session,
    skip: int = 0,
    limit: Optional[int] = None,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    lead_id: Optional[int] = None,
) -> List[InteractionCrm]:
    """List interactions sorted by timestamp descending.

    Interactions are returned in reverse chronological order (timestamp descending).
    Optional filters can narrow results by associated entity.

    Args:
        db: SQLAlchemy database session.
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.
        company_id: Optional filter for associated Company ID.
        contact_id: Optional filter for associated Contact ID.
        lead_id: Optional filter for associated LeadCrm ID.

    Returns:
        List of InteractionCrm model instances sorted by timestamp descending.
    """
    query = db.query(InteractionCrm)

    if company_id is not None:
        query = query.filter(InteractionCrm.company_id == company_id)
    if contact_id is not None:
        query = query.filter(InteractionCrm.contact_id == contact_id)
    if lead_id is not None:
        query = query.filter(InteractionCrm.lead_id == lead_id)

    query = query.order_by(InteractionCrm.timestamp.desc())

    if skip > 0:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

    return query.all()
