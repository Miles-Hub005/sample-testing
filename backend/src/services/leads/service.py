"""Lead domain service providing CRUD operations, validation, status transitions, and optional company/contact linking."""

from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple, Union
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models.companies import Company
from models.contacts import Contact
from models.leads import (
    Lead,
    LeadStatus,
    create_lead as model_create_lead,
    delete_lead as model_delete_lead,
    get_lead_by_id as model_get_lead_by_id,
    get_leads_by_company as model_get_leads_by_company,
    get_leads_by_contact as model_get_leads_by_contact,
    get_leads_by_status as model_get_leads_by_status,
    get_pipeline_by_status as model_get_pipeline_by_status,
    list_leads as model_list_leads,
    search_and_paginate_leads as model_search_and_paginate_leads,
    update_lead as model_update_lead,
)
from services.leads.exceptions import (
    InvalidForeignKeyError,
    LeadNotFoundError,
    LeadValidationError,
)

VALID_STATUSES = {s.value for s in LeadStatus}


def _extract_lead_data(
    lead_in: Union[BaseModel, Dict[str, Any], None] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Extract lead data dictionary from Pydantic model, dict, or kwargs."""
    data: Dict[str, Any] = {}
    if lead_in is not None:
        if isinstance(lead_in, BaseModel):
            data = lead_in.model_dump(exclude_unset=True)
        elif isinstance(lead_in, dict):
            data = dict(lead_in)
    for k, v in kwargs.items():
        if v is not None or k not in data:
            data[k] = v
    return data


def _validate_title(raw_title: Any, raw_name: Any = None) -> str:
    """Validate and clean lead title or name alias.

    Raises:
        LeadValidationError: If title/name is missing or empty.
    """
    chosen = raw_title if raw_title is not None else raw_name
    if chosen is None or not str(chosen).strip():
        raise LeadValidationError("Lead title is required and cannot be empty.")
    return str(chosen).strip()


def _validate_value(raw_value: Any) -> float:
    """Validate and convert lead value.

    Raises:
        LeadValidationError: If value is negative or not numeric.
    """
    if raw_value is None:
        return 0.0
    try:
        val = float(raw_value)
    except (TypeError, ValueError):
        raise LeadValidationError(f"Invalid lead value: {raw_value}")
    if val < 0:
        raise LeadValidationError("Lead value cannot be negative.")
    return val


def _validate_status(raw_status: Any) -> str:
    """Validate and normalize lead status.

    Raises:
        LeadValidationError: If status is not a valid lead status stage.
    """
    if raw_status is None:
        return LeadStatus.PROSPECTING.value
    if isinstance(raw_status, LeadStatus):
        return raw_status.value
    status_str = str(raw_status).strip()
    if status_str not in VALID_STATUSES:
        raise LeadValidationError(
            f"Invalid lead status: '{status_str}'. Must be one of {sorted(VALID_STATUSES)}."
        )
    return status_str


def _validate_company_and_contact(
    db: Session,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
) -> None:
    """Verify that provided company_id and contact_id foreign keys exist.

    Raises:
        InvalidForeignKeyError: If company_id or contact_id is provided but not found in DB.
    """
    if company_id is not None:
        company_exists = (
            db.query(Company.id).filter(Company.id == company_id).first() is not None
        )
        if not company_exists:
            raise InvalidForeignKeyError(f"Company ID {company_id} does not exist.")

    if contact_id is not None:
        contact_exists = (
            db.query(Contact.id).filter(Contact.id == contact_id).first() is not None
        )
        if not contact_exists:
            raise InvalidForeignKeyError(f"Contact ID {contact_id} does not exist.")


def create_lead(
    db: Session,
    lead_in: Union[BaseModel, Dict[str, Any], None] = None,
    title: Optional[str] = None,
    name: Optional[str] = None,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    value: Optional[Union[float, int]] = None,
    status: Union[str, LeadStatus, None] = None,
    expected_close_date: Optional[Union[date, datetime]] = None,
    owner: Optional[str] = None,
    **kwargs: Any,
) -> Lead:
    """Create a new lead record with validation rules and optional company/contact linking.

    Args:
        db: SQLAlchemy database session.
        lead_in: Optional Pydantic model or dict containing lead attributes.
        title: Title of the lead (required).
        name: Property alias for title.
        company_id: Optional associated company ID (Edge Case 2/FR-3).
        contact_id: Optional associated contact ID.
        value: Lead value (required >= 0, default 0.0).
        status: Lead status stage (default: Prospecting).
        expected_close_date: Optional target close date.
        owner: Optional owner name.
        **kwargs: Additional fields.

    Returns:
        Created Lead model instance.

    Raises:
        LeadValidationError: If title is empty, value < 0, or status is invalid.
        InvalidForeignKeyError: If company_id or contact_id is non-existent.
    """
    data = _extract_lead_data(
        lead_in,
        title=title,
        name=name,
        company_id=company_id,
        contact_id=contact_id,
        value=value,
        status=status,
        expected_close_date=expected_close_date,
        owner=owner,
        **kwargs,
    )

    cleaned_title = _validate_title(data.get("title"), data.get("name"))
    cleaned_value = _validate_value(data.get("value"))
    cleaned_status = _validate_status(data.get("status"))

    comp_id = data.get("company_id")
    cnt_id = data.get("contact_id")
    _validate_company_and_contact(db, company_id=comp_id, contact_id=cnt_id)

    return model_create_lead(
        db=db,
        title=cleaned_title,
        company_id=comp_id,
        contact_id=cnt_id,
        value=cleaned_value,
        status=cleaned_status,
        expected_close_date=data.get("expected_close_date"),
        owner=data.get("owner", ""),
    )


def get_lead(db: Session, lead_id: int) -> Optional[Lead]:
    """Retrieve a lead by primary key ID.

    Args:
        db: SQLAlchemy database session.
        lead_id: The ID of the lead to retrieve.

    Returns:
        Lead model instance if found, or None.
    """
    return model_get_lead_by_id(db, lead_id)


def get_lead_by_id(db: Session, lead_id: int) -> Optional[Lead]:
    """Retrieve a lead by primary key ID (alias for get_lead)."""
    return get_lead(db, lead_id)


def get_leads_by_company(db: Session, company_id: int) -> List[Lead]:
    """Retrieve all leads associated with a specific company ID.

    Args:
        db: SQLAlchemy database session.
        company_id: The ID of the associated company.

    Returns:
        List of Lead model instances.
    """
    return model_get_leads_by_company(db, company_id)


def get_leads_by_contact(db: Session, contact_id: int) -> List[Lead]:
    """Retrieve all leads associated with a specific contact ID.

    Args:
        db: SQLAlchemy database session.
        contact_id: The ID of the associated contact.

    Returns:
        List of Lead model instances.
    """
    return model_get_leads_by_contact(db, contact_id)


def get_leads_by_status(
    db: Session,
    status: Union[str, LeadStatus],
) -> List[Lead]:
    """Retrieve all leads matching a given status stage.

    Args:
        db: SQLAlchemy database session.
        status: The status stage string or LeadStatus enum value.

    Returns:
        List of Lead model instances.
    """
    cleaned_status = _validate_status(status)
    return model_get_leads_by_status(db, cleaned_status)


def list_leads(
    db: Session,
    skip: int = 0,
    limit: Optional[int] = None,
    search: Optional[str] = None,
    status: Optional[Union[str, LeadStatus]] = None,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    sort_by: str = "title",
    order: str = "asc",
    page: Optional[int] = None,
    page_size: Optional[int] = None,
) -> Union[List[Lead], Tuple[List[Lead], int]]:
    """List leads, or search and paginate if search/filter/pagination params are provided.

    Args:
        db: SQLAlchemy database session.
        skip: Pagination offset.
        limit: Pagination max items count.
        search: Optional search term matching lead title.
        status: Optional filter by status stage.
        company_id: Optional filter by associated company ID.
        contact_id: Optional filter by associated contact ID.
        sort_by: Attribute to sort by ("title", "value", "status", etc.).
        order: Sort direction ("asc" or "desc").
        page: Optional 1-based page index.
        page_size: Optional items per page.

    Returns:
        List of Lead items, or tuple of (items, total count) if searched/filtered/paginated.
    """
    if (
        search is not None
        or status is not None
        or company_id is not None
        or contact_id is not None
        or page is not None
        or page_size is not None
    ):
        p = page if page is not None else 1
        ps = page_size if page_size is not None else (limit if limit else 20)
        return model_search_and_paginate_leads(
            db,
            search=search,
            status=status,
            company_id=company_id,
            contact_id=contact_id,
            sort_by=sort_by,
            order=order,
            page=p,
            page_size=ps,
        )

    return model_list_leads(db, skip=skip, limit=limit, status=status)


def search_and_paginate_leads(
    db: Session,
    search: Optional[str] = None,
    status: Optional[Union[str, LeadStatus]] = None,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    sort_by: str = "title",
    order: str = "asc",
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Lead], int]:
    """Search, filter, sort, and paginate leads.

    Args:
        db: SQLAlchemy database session.
        search: Optional search term matching lead title.
        status: Optional status filter.
        company_id: Optional company ID filter.
        contact_id: Optional contact ID filter.
        sort_by: Column to sort by.
        order: Sort direction ("asc" or "desc").
        page: 1-based page index.
        page_size: Number of items per page.

    Returns:
        Tuple of (matching lead records, total count).
    """
    return model_search_and_paginate_leads(
        db,
        search=search,
        status=status,
        company_id=company_id,
        contact_id=contact_id,
        sort_by=sort_by,
        order=order,
        page=page,
        page_size=page_size,
    )


def update_lead(
    db: Session,
    lead_id: int,
    lead_in: Union[BaseModel, Dict[str, Any], None] = None,
    **kwargs: Any,
) -> Lead:
    """Update an existing lead record with field validation and status transitions.

    Args:
        db: SQLAlchemy database session.
        lead_id: ID of the lead to update.
        lead_in: Optional Pydantic model or dict with update attributes.
        **kwargs: Additional keyword arguments for field updates.

    Returns:
        Updated Lead model instance.

    Raises:
        LeadNotFoundError: If lead with lead_id does not exist.
        LeadValidationError: If title is empty, value < 0, or status is invalid.
        InvalidForeignKeyError: If updated company_id or contact_id does not exist.
    """
    lead = get_lead(db, lead_id)
    if not lead:
        raise LeadNotFoundError(f"Lead with ID {lead_id} not found.")

    updates = _extract_lead_data(lead_in, **kwargs)

    if "title" in updates or "name" in updates:
        raw_t = updates.get("title") if "title" in updates else updates.get("name")
        updates["title"] = _validate_title(raw_t)
        if "name" in updates:
            del updates["name"]

    if "value" in updates:
        val = updates["value"]
        if val is None:
            raise LeadValidationError("Lead value cannot be None.")
        updates["value"] = _validate_value(val)

    if "status" in updates:
        status_val = updates["status"]
        if status_val is None:
            raise LeadValidationError("Lead status cannot be None.")
        updates["status"] = _validate_status(status_val)

    comp_id = updates.get("company_id") if "company_id" in updates else None
    cnt_id = updates.get("contact_id") if "contact_id" in updates else None
    _validate_company_and_contact(db, company_id=comp_id, contact_id=cnt_id)

    updated = model_update_lead(db, lead_id, updates)
    if updated is None:
        raise LeadNotFoundError(f"Lead with ID {lead_id} not found.")
    return updated


def delete_lead(db: Session, lead_id: int) -> bool:
    """Delete a lead by ID.

    Args:
        db: SQLAlchemy database session.
        lead_id: ID of the lead to delete.

    Returns:
        True if deleted successfully.

    Raises:
        LeadNotFoundError: If lead does not exist.
    """
    lead = get_lead(db, lead_id)
    if not lead:
        raise LeadNotFoundError(f"Lead with ID {lead_id} not found.")

    return model_delete_lead(db, lead_id)


def get_pipeline_by_status(db: Session) -> List[Dict[str, Any]]:
    """Aggregate total pipeline value and lead count grouped by lead status stage (FR-6)."""
    return model_get_pipeline_by_status(db)


def get_pipeline_summary(db: Session) -> List[Dict[str, Any]]:
    """Alias for get_pipeline_by_status."""
    return get_pipeline_by_status(db)
