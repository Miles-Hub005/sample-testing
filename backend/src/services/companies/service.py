"""Company service providing CRUD operations, validation, and association queries."""

from typing import Any, Dict, List, Optional, Tuple, Union
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models.companies import (
    Company,
    create_company as model_create_company,
    delete_company as model_delete_company,
    get_company_by_id as model_get_company_by_id,
    list_companies as model_list_companies,
    search_and_paginate_companies as model_search_and_paginate_companies,
    update_company as model_update_company,
)
from models.contacts import Contact
from models.interactions import Interaction
from models.leads import Lead
from models.tasks import Task
from services.companies.exceptions import (
    CompanyDeleteBlockedError,
    CompanyNotFoundError,
    CompanyValidationError,
)


def _extract_company_data(
    company_in: Union[BaseModel, Dict[str, Any], None] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Extract company data dictionary from Pydantic model, dict, or kwargs."""
    data: Dict[str, Any] = {}
    if company_in is not None:
        if isinstance(company_in, BaseModel):
            data = company_in.model_dump(exclude_unset=True)
        elif isinstance(company_in, dict):
            data = dict(company_in)
    data.update({k: v for k, v in kwargs.items() if v is not None or k not in data})
    return data


def create_company(
    db: Session,
    company_in: Union[BaseModel, Dict[str, Any], None] = None,
    name: Optional[str] = None,
    industry: Optional[str] = None,
    website: Optional[str] = None,
    notes: Optional[str] = None,
    email: Optional[str] = None,
    owner: Optional[str] = None,
    **kwargs: Any,
) -> Company:
    """Create a new company record with required name validation.

    Args:
        db: SQLAlchemy database session.
        company_in: Optional Pydantic model or dict with company attributes.
        name: Name of the company.
        industry: Optional industry.
        website: Optional website URL.
        notes: Optional text notes.
        email: Optional primary email address.
        owner: Optional owner name.
        **kwargs: Additional fields.

    Returns:
        Created Company model instance.

    Raises:
        CompanyValidationError: If name is missing or empty string.
    """
    data = _extract_company_data(company_in, name=name, industry=industry, website=website, notes=notes, email=email, owner=owner, **kwargs)

    comp_name = data.get("name")
    if comp_name is None or not str(comp_name).strip():
        raise CompanyValidationError("Company name is required and cannot be empty.")

    cleaned_name = str(comp_name).strip()

    return model_create_company(
        db=db,
        name=cleaned_name,
        industry=data.get("industry"),
        website=data.get("website"),
        notes=data.get("notes"),
        email=data.get("email"),
        owner=data.get("owner", ""),
    )


def get_company(db: Session, company_id: int) -> Optional[Company]:
    """Retrieve a company by its primary key ID.

    Args:
        db: SQLAlchemy database session.
        company_id: The ID of the company to retrieve.

    Returns:
        Company model instance if found, or None.
    """
    return model_get_company_by_id(db, company_id)


def get_company_by_id(db: Session, company_id: int) -> Optional[Company]:
    """Retrieve a company by its primary key ID."""
    return get_company(db, company_id)


def get_company_associations(db: Session, company_id: int) -> Dict[str, List[Any]]:
    """Query linked contacts, leads, tasks, and interactions for a company.

    Args:
        db: SQLAlchemy database session.
        company_id: The ID of the company.

    Returns:
        Dictionary containing lists of associated contacts, leads, tasks, and interactions.
    """
    contacts = db.query(Contact).filter(Contact.company_id == company_id).all()
    leads = db.query(Lead).filter(Lead.company_id == company_id).all()
    tasks = db.query(Task).filter(Task.company_id == company_id).all()
    interactions = (
        db.query(Interaction).filter(Interaction.company_id == company_id).all()
    )

    return {
        "contacts": contacts,
        "leads": leads,
        "tasks": tasks,
        "interactions": interactions,
    }


def get_company_with_associations(db: Session, company_id: int) -> Dict[str, Any]:
    """Retrieve company detail view including all associated records.

    Args:
        db: SQLAlchemy database session.
        company_id: The ID of the company to retrieve.

    Returns:
        Dictionary with company and its associated contacts, leads, tasks, interactions.

    Raises:
        CompanyNotFoundError: If the company with given ID does not exist.
    """
    company = get_company(db, company_id)
    if not company:
        raise CompanyNotFoundError(f"Company with ID {company_id} not found.")

    associations = get_company_associations(db, company_id)
    return {
        "company": company,
        "contacts": associations["contacts"],
        "leads": associations["leads"],
        "tasks": associations["tasks"],
        "interactions": associations["interactions"],
    }


def list_companies(
    db: Session,
    skip: int = 0,
    limit: Optional[int] = None,
    search: Optional[str] = None,
    sort_by: str = "name",
    order: str = "asc",
    page: Optional[int] = None,
    page_size: Optional[int] = None,
) -> Union[List[Company], Tuple[List[Company], int]]:
    """List companies or search and paginate if pagination/search params are provided.

    Args:
        db: SQLAlchemy database session.
        skip: Pagination offset.
        limit: Pagination max items count.
        search: Optional search term.
        sort_by: Attribute name to sort by.
        order: Sort direction ("asc" or "desc").
        page: Optional 1-based page number.
        page_size: Optional items per page.

    Returns:
        List of Company items, or tuple of (items, total count) if paginated/searched.
    """
    if search is not None or page is not None or page_size is not None:
        p = page if page is not None else 1
        ps = page_size if page_size is not None else (limit if limit else 20)
        return model_search_and_paginate_companies(
            db, search=search, sort_by=sort_by, order=order, page=p, page_size=ps
        )

    return model_list_companies(db, skip=skip, limit=limit)


def search_and_paginate_companies(
    db: Session,
    search: Optional[str] = None,
    sort_by: str = "name",
    order: str = "asc",
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Company], int]:
    """Search, sort, and paginate companies.

    Args:
        db: SQLAlchemy database session.
        search: Term to filter companies by.
        sort_by: Column to sort by.
        order: Sort direction ("asc" or "desc").
        page: 1-based page index.
        page_size: Items per page.

    Returns:
        Tuple of (matching company records, total count).
    """
    return model_search_and_paginate_companies(
        db, search=search, sort_by=sort_by, order=order, page=page, page_size=page_size
    )


def update_company(
    db: Session,
    company_id: int,
    company_in: Union[BaseModel, Dict[str, Any], None] = None,
    **kwargs: Any,
) -> Company:
    """Update an existing company record.

    Args:
        db: SQLAlchemy database session.
        company_id: The ID of the company to update.
        company_in: Optional Pydantic model or dict with update attributes.
        **kwargs: Keyword arguments for field updates.

    Returns:
        Updated Company model instance.

    Raises:
        CompanyNotFoundError: If company with company_id does not exist.
        CompanyValidationError: If name is set to an empty string.
    """
    company = get_company(db, company_id)
    if not company:
        raise CompanyNotFoundError(f"Company with ID {company_id} not found.")

    updates = _extract_company_data(company_in, **kwargs)

    if "name" in updates:
        val = updates["name"]
        if val is None or not str(val).strip():
            raise CompanyValidationError("Company name cannot be empty.")
        updates["name"] = str(val).strip()

    updated = model_update_company(db, company_id, updates)
    if updated is None:
        raise CompanyNotFoundError(f"Company with ID {company_id} not found.")
    return updated


def delete_company(db: Session, company_id: int) -> bool:
    """Delete a company if no associated contacts, leads, tasks, or interactions exist.

    Args:
        db: SQLAlchemy database session.
        company_id: The ID of the company to delete.

    Returns:
        True if deleted successfully.

    Raises:
        CompanyNotFoundError: If company does not exist.
        CompanyDeleteBlockedError: If associated records exist.
    """
    company = get_company(db, company_id)
    if not company:
        raise CompanyNotFoundError(f"Company with ID {company_id} not found.")

    lead_exists = (
        db.query(Lead.id).filter(Lead.company_id == company_id).first() is not None
    )
    contact_exists = (
        db.query(Contact.id).filter(Contact.company_id == company_id).first() is not None
    )
    task_exists = (
        db.query(Task.id).filter(Task.company_id == company_id).first() is not None
    )
    interaction_exists = (
        db.query(Interaction.id).filter(Interaction.company_id == company_id).first() is not None
    )

    if lead_exists or contact_exists or task_exists or interaction_exists:
        raise CompanyDeleteBlockedError(
            f"Cannot delete company {company_id}: associated records exist."
        )

    return model_delete_company(db, company_id)
