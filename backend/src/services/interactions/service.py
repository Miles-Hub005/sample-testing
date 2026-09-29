"""Interaction domain service providing CRUD operations, validation, type enum checks, and association linking."""

from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

from pydantic import BaseModel
from sqlalchemy.orm import Session

from models.companies import Company
from models.contacts import Contact
from models.interactions import (
    Interaction,
    InteractionType,
    create_interaction as model_create_interaction,
    delete_interaction as model_delete_interaction,
    get_interaction_by_id as model_get_interaction_by_id,
    get_interactions_by_company as model_get_interactions_by_company,
    get_interactions_by_contact as model_get_interactions_by_contact,
    get_interactions_by_lead as model_get_interactions_by_lead,
    get_interactions_by_type as model_get_interactions_by_type,
    get_recent_interactions as model_get_recent_interactions,
    list_interactions as model_list_interactions,
    search_and_paginate_interactions as model_search_and_paginate_interactions,
    update_interaction as model_update_interaction,
)
from models.leads import Lead
from services.interactions.exceptions import (
    InteractionNotFoundError,
    InteractionValidationError,
    InvalidForeignKeyError,
)

VALID_TYPES = {t.value for t in InteractionType}


def _extract_interaction_data(
    interaction_in: Union[BaseModel, Dict[str, Any], None] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Extract interaction data dictionary from Pydantic model, dict, or kwargs."""
    data: Dict[str, Any] = {}
    if interaction_in is not None:
        if isinstance(interaction_in, BaseModel):
            data = interaction_in.model_dump(exclude_unset=True)
        elif isinstance(interaction_in, dict):
            data = dict(interaction_in)
    for k, v in kwargs.items():
        if v is not None or k not in data:
            data[k] = v
    return data


def _validate_summary(
    raw_summary: Any = None,
    raw_notes: Any = None,
    raw_title: Any = None,
    raw_name: Any = None,
) -> str:
    """Validate and clean interaction summary (or notes/title/name alias).

    Raises:
        InteractionValidationError: If summary is missing or empty string.
    """
    chosen = None
    if raw_summary is not None:
        chosen = raw_summary
    elif raw_notes is not None:
        chosen = raw_notes
    elif raw_title is not None:
        chosen = raw_title
    elif raw_name is not None:
        chosen = raw_name

    if chosen is None or not str(chosen).strip():
        raise InteractionValidationError("Interaction summary is required and cannot be empty.")
    return str(chosen).strip()


def _validate_date(
    raw_date: Any,
    allow_none: bool = False,
) -> Optional[datetime]:
    """Validate and normalize interaction date.

    Args:
        raw_date: Date, datetime, or ISO string.
        allow_none: If True, None/empty returns None.

    Returns:
        Normalized UTC datetime or None if allowed.

    Raises:
        InteractionValidationError: If date is missing/empty (when allow_none=False) or invalid format.
    """
    if raw_date is None or (isinstance(raw_date, str) and not raw_date.strip()):
        if allow_none:
            return None
        raise InteractionValidationError("Interaction date is required and cannot be empty.")

    if isinstance(raw_date, datetime):
        if raw_date.tzinfo is None:
            return raw_date.replace(tzinfo=timezone.utc)
        return raw_date

    if isinstance(raw_date, date):
        return datetime(raw_date.year, raw_date.month, raw_date.day, tzinfo=timezone.utc)

    if isinstance(raw_date, str):
        cleaned = raw_date.strip()
        try:
            dt = datetime.fromisoformat(cleaned)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt
        except (ValueError, TypeError):
            raise InteractionValidationError(f"Invalid interaction date format: '{raw_date}'")

    raise InteractionValidationError(f"Invalid interaction date: '{raw_date}'")


def _validate_type(
    raw_type: Any,
    allow_none: bool = False,
    default_to_note: bool = True,
) -> Optional[str]:
    """Validate and normalize interaction type enum.

    Args:
        raw_type: Interaction type string or InteractionType enum.
        allow_none: If True, None/empty returns None.
        default_to_note: If True and raw_type is None/empty when allow_none is False, returns 'note'.

    Returns:
        Validated type string ("call", "email", "meeting", "note") or None.

    Raises:
        InteractionValidationError: If type is invalid or empty when allow_none=False and default_to_note=False.
    """
    if raw_type is None or (isinstance(raw_type, str) and not raw_type.strip()):
        if allow_none:
            return None
        if default_to_note:
            return InteractionType.NOTE.value
        raise InteractionValidationError("Interaction type is required and cannot be empty.")

    if isinstance(raw_type, InteractionType):
        return raw_type.value

    type_str = str(raw_type).strip().lower()
    if type_str not in VALID_TYPES:
        raise InteractionValidationError(
            f"Invalid interaction type: '{raw_type}'. Must be one of {sorted(VALID_TYPES)}."
        )
    return type_str


def _validate_foreign_keys(
    db: Session,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    lead_id: Optional[int] = None,
) -> None:
    """Validate that foreign key references exist in the database.

    Raises:
        InvalidForeignKeyError: If company_id, contact_id, or lead_id is non-existent.
    """
    if company_id is not None:
        exists = db.query(Company.id).filter(Company.id == company_id).first() is not None
        if not exists:
            raise InvalidForeignKeyError(f"Company ID {company_id} does not exist.")

    if contact_id is not None:
        exists = db.query(Contact.id).filter(Contact.id == contact_id).first() is not None
        if not exists:
            raise InvalidForeignKeyError(f"Contact ID {contact_id} does not exist.")

    if lead_id is not None:
        exists = db.query(Lead.id).filter(Lead.id == lead_id).first() is not None
        if not exists:
            raise InvalidForeignKeyError(f"Lead ID {lead_id} does not exist.")


def create_interaction(
    db: Session,
    interaction_in: Union[BaseModel, Dict[str, Any], None] = None,
    date: Any = None,
    type: Any = None,
    summary: Any = None,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    lead_id: Optional[int] = None,
    owner: Optional[str] = None,
    notes: Any = None,
    title: Any = None,
    name: Any = None,
    **kwargs: Any,
) -> Interaction:
    """Create a new interaction record with required-field and enum validation.

    Args:
        db: SQLAlchemy database session.
        interaction_in: Optional Pydantic model or dict with interaction attributes.
        date: Interaction date/datetime (required).
        type: Interaction type enum ("call", "email", "meeting", "note", default "note").
        summary: Summary/notes description of the interaction (required).
        company_id: Optional associated company ID.
        contact_id: Optional associated contact ID.
        lead_id: Optional associated lead ID.
        owner: Optional owner or author name.
        notes: Property alias for summary.
        title: Property alias for summary.
        name: Property alias for summary.
        **kwargs: Additional fields.

    Returns:
        Created Interaction model instance.

    Raises:
        InteractionValidationError: If date or summary is missing/invalid, or type is invalid.
        InvalidForeignKeyError: If company_id, contact_id, or lead_id does not exist.
    """
    data = _extract_interaction_data(
        interaction_in,
        date=date,
        type=type,
        summary=summary,
        company_id=company_id,
        contact_id=contact_id,
        lead_id=lead_id,
        owner=owner,
        notes=notes,
        title=title,
        name=name,
        **kwargs,
    )

    cleaned_summary = _validate_summary(
        data.get("summary"), data.get("notes"), data.get("title"), data.get("name")
    )
    cleaned_date = _validate_date(data.get("date"), allow_none=False)
    cleaned_type = _validate_type(data.get("type"), allow_none=False, default_to_note=True)

    comp_id = data.get("company_id")
    cnt_id = data.get("contact_id")
    ld_id = data.get("lead_id")
    _validate_foreign_keys(db, company_id=comp_id, contact_id=cnt_id, lead_id=ld_id)

    owner_str = str(data.get("owner", "") or "")

    return model_create_interaction(
        db=db,
        date=cleaned_date,
        type=cleaned_type,
        summary=cleaned_summary,
        company_id=comp_id,
        contact_id=cnt_id,
        lead_id=ld_id,
        owner=owner_str,
    )


def get_interaction(db: Session, interaction_id: int) -> Optional[Interaction]:
    """Retrieve an interaction by ID.

    Args:
        db: SQLAlchemy database session.
        interaction_id: ID of the interaction to retrieve.

    Returns:
        Interaction model instance if found, or None.
    """
    return model_get_interaction_by_id(db, interaction_id)


def get_interaction_by_id(db: Session, interaction_id: int) -> Optional[Interaction]:
    """Retrieve an interaction by ID (alias for get_interaction)."""
    return get_interaction(db, interaction_id)


def update_interaction(
    db: Session,
    interaction_id: int,
    interaction_in: Union[BaseModel, Dict[str, Any], None] = None,
    **kwargs: Any,
) -> Interaction:
    """Update an existing interaction record with validation rules.

    Args:
        db: SQLAlchemy database session.
        interaction_id: ID of the interaction to update.
        interaction_in: Optional Pydantic model or dict with update fields.
        **kwargs: Additional keyword arguments for field updates.

    Returns:
        Updated Interaction model instance.

    Raises:
        InteractionNotFoundError: If interaction is not found.
        InteractionValidationError: If summary or date is set to empty/invalid value or type is invalid.
        InvalidForeignKeyError: If company_id, contact_id, or lead_id does not exist.
    """
    interaction = get_interaction(db, interaction_id)
    if not interaction:
        raise InteractionNotFoundError(f"Interaction with ID {interaction_id} not found.")

    updates = _extract_interaction_data(interaction_in, **kwargs)

    if any(k in updates for k in ("summary", "notes", "title", "name")):
        raw_sum = updates.get("summary")
        if raw_sum is None and "notes" in updates:
            raw_sum = updates.get("notes")
        if raw_sum is None and "title" in updates:
            raw_sum = updates.get("title")
        if raw_sum is None and "name" in updates:
            raw_sum = updates.get("name")

        updates["summary"] = _validate_summary(raw_sum)
        for alias in ("notes", "title", "name"):
            if alias in updates:
                del updates[alias]

    if "date" in updates:
        raw_dt = updates["date"]
        if raw_dt is None or (isinstance(raw_dt, str) and not raw_dt.strip()):
            raise InteractionValidationError("Interaction date cannot be set to empty.")
        updates["date"] = _validate_date(raw_dt, allow_none=False)

    if "type" in updates:
        raw_type = updates["type"]
        if raw_type is None or (isinstance(raw_type, str) and not raw_type.strip()):
            raise InteractionValidationError("Interaction type cannot be set to empty.")
        updates["type"] = _validate_type(raw_type, allow_none=False, default_to_note=False)

    comp_id = updates.get("company_id") if "company_id" in updates else None
    cnt_id = updates.get("contact_id") if "contact_id" in updates else None
    ld_id = updates.get("lead_id") if "lead_id" in updates else None
    _validate_foreign_keys(db, company_id=comp_id, contact_id=cnt_id, lead_id=ld_id)

    updated = model_update_interaction(db, interaction_id, updates)
    if updated is None:
        raise InteractionNotFoundError(f"Interaction with ID {interaction_id} not found.")
    return updated


def delete_interaction(db: Session, interaction_id: int) -> bool:
    """Delete an interaction record by ID.

    Args:
        db: SQLAlchemy database session.
        interaction_id: ID of the interaction to delete.

    Returns:
        True if deleted successfully.

    Raises:
        InteractionNotFoundError: If interaction does not exist.
    """
    interaction = get_interaction(db, interaction_id)
    if not interaction:
        raise InteractionNotFoundError(f"Interaction with ID {interaction_id} not found.")

    return model_delete_interaction(db, interaction_id)


def list_interactions(
    db: Session,
    skip: int = 0,
    limit: Optional[int] = None,
    search: Optional[str] = None,
    type_filter: Optional[Union[str, InteractionType]] = None,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    lead_id: Optional[int] = None,
    sort_by: str = "date",
    order: str = "desc",
    page: Optional[int] = None,
    page_size: Optional[int] = None,
) -> Union[List[Interaction], Tuple[List[Interaction], int]]:
    """List interactions, or search/filter and paginate if search/pagination parameters are supplied.

    Args:
        db: SQLAlchemy database session.
        skip: Offset for simple listing.
        limit: Limit for simple listing.
        search: Optional search term matching summary, owner, or type.
        type_filter: Optional interaction type filter ("call", "email", "meeting", "note").
        company_id: Optional filter by company ID.
        contact_id: Optional filter by contact ID.
        lead_id: Optional filter by lead ID.
        sort_by: Column to sort by ("date", "type", "summary", etc.).
        order: Sort direction ("asc" or "desc").
        page: Optional 1-based page index.
        page_size: Optional items per page.

    Returns:
        List of Interaction instances, or Tuple of (items, total count) if searched/filtered/paginated.
    """
    if type_filter is not None and str(type_filter).strip():
        type_filter = _validate_type(type_filter, allow_none=True)

    if (
        search is not None
        or company_id is not None
        or contact_id is not None
        or lead_id is not None
        or page is not None
        or page_size is not None
    ):
        p = page if page is not None else 1
        ps = page_size if page_size is not None else (limit if limit else 20)
        return model_search_and_paginate_interactions(
            db=db,
            search=search,
            type_filter=type_filter,
            company_id=company_id,
            contact_id=contact_id,
            lead_id=lead_id,
            sort_by=sort_by,
            order=order,
            page=p,
            page_size=ps,
        )

    return model_list_interactions(db=db, skip=skip, limit=limit, type_filter=type_filter)


def search_and_paginate_interactions(
    db: Session,
    search: Optional[str] = None,
    type_filter: Optional[Union[str, InteractionType]] = None,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    lead_id: Optional[int] = None,
    sort_by: str = "date",
    order: str = "desc",
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Interaction], int]:
    """Search, filter, sort, and paginate interactions.

    Returns:
        Tuple of (matching Interaction instances, total count).
    """
    if type_filter is not None and str(type_filter).strip():
        type_filter = _validate_type(type_filter, allow_none=True)

    return model_search_and_paginate_interactions(
        db=db,
        search=search,
        type_filter=type_filter,
        company_id=company_id,
        contact_id=contact_id,
        lead_id=lead_id,
        sort_by=sort_by,
        order=order,
        page=page,
        page_size=page_size,
    )


def get_recent_interactions(
    db: Session,
    limit: int = 10,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    lead_id: Optional[int] = None,
) -> List[Interaction]:
    """Retrieve recent interactions ordered by date descending."""
    return model_get_recent_interactions(
        db=db,
        limit=limit,
        company_id=company_id,
        contact_id=contact_id,
        lead_id=lead_id,
    )


def get_interactions_by_company(
    db: Session,
    company_id: int,
    skip: int = 0,
    limit: Optional[int] = None,
) -> List[Interaction]:
    """Retrieve interactions associated with a company ID."""
    return model_get_interactions_by_company(db, company_id=company_id, skip=skip, limit=limit)


def get_interactions_by_contact(
    db: Session,
    contact_id: int,
    skip: int = 0,
    limit: Optional[int] = None,
) -> List[Interaction]:
    """Retrieve interactions associated with a contact ID."""
    return model_get_interactions_by_contact(db, contact_id=contact_id, skip=skip, limit=limit)


def get_interactions_by_lead(
    db: Session,
    lead_id: int,
    skip: int = 0,
    limit: Optional[int] = None,
) -> List[Interaction]:
    """Retrieve interactions associated with a lead ID."""
    return model_get_interactions_by_lead(db, lead_id=lead_id, skip=skip, limit=limit)


def get_interactions_by_type(
    db: Session,
    type_filter: Union[str, InteractionType],
    skip: int = 0,
    limit: Optional[int] = None,
) -> List[Interaction]:
    """Retrieve interactions matching a specific type."""
    validated_type = _validate_type(type_filter, allow_none=False, default_to_note=False)
    return model_get_interactions_by_type(db, type_filter=validated_type, skip=skip, limit=limit)
