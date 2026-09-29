"""Contact domain service providing CRUD operations, validation, and company association handling."""

import re
from typing import Any, Dict, List, Optional, Tuple, Union
from pydantic import BaseModel
from sqlalchemy.orm import Session

from models.companies import Company
from models.contacts import (
    Contact,
    create_contact as model_create_contact,
    delete_contact as model_delete_contact,
    get_contact_by_id as model_get_contact_by_id,
    get_contacts_by_company as model_get_contacts_by_company,
    list_contacts as model_list_contacts,
    search_and_paginate_contacts as model_search_and_paginate_contacts,
    update_contact as model_update_contact,
)
from services.contacts.exceptions import (
    ContactNotFoundError,
    ContactValidationError,
    InvalidForeignKeyError,
)

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def _extract_contact_data(
    contact_in: Union[BaseModel, Dict[str, Any], None] = None,
    **kwargs: Any,
) -> Dict[str, Any]:
    """Extract contact data dictionary from Pydantic model, dict, or kwargs."""
    data: Dict[str, Any] = {}
    if contact_in is not None:
        if isinstance(contact_in, BaseModel):
            data = contact_in.model_dump(exclude_unset=True)
        elif isinstance(contact_in, dict):
            data = dict(contact_in)
    for k, v in kwargs.items():
        if v is not None or k not in data:
            data[k] = v
    return data


def _validate_email(email: Optional[str]) -> str:
    """Validate and clean email format.

    Raises:
        ContactValidationError: If email is missing, empty, or fails format check.
    """
    if email is None or not str(email).strip():
        raise ContactValidationError("Contact email is required and cannot be empty.")
    cleaned = str(email).strip()
    if not EMAIL_REGEX.match(cleaned):
        raise ContactValidationError(f"Invalid email format: {cleaned}")
    return cleaned


def create_contact(
    db: Session,
    contact_in: Union[BaseModel, Dict[str, Any], None] = None,
    name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    role: Optional[str] = None,
    company_id: Optional[int] = None,
    notes: Optional[str] = None,
    owner: Optional[str] = None,
    **kwargs: Any,
) -> Contact:
    """Create a new contact record with required-field and optional company_id validation.

    Args:
        db: SQLAlchemy database session.
        contact_in: Optional Pydantic model or dict with contact attributes.
        name: Name of the contact (required).
        email: Email address of the contact (required, format validated).
        phone: Optional phone number.
        role: Optional role or job title.
        company_id: Optional associated company ID (Edge Case 2: allowed to be None).
        notes: Optional text notes.
        owner: Optional owner name.
        **kwargs: Additional fields.

    Returns:
        Created Contact model instance.

    Raises:
        ContactValidationError: If name or email is missing/invalid.
        InvalidForeignKeyError: If company_id is provided but the company does not exist.
    """
    data = _extract_contact_data(
        contact_in,
        name=name,
        email=email,
        phone=phone,
        role=role,
        company_id=company_id,
        notes=notes,
        owner=owner,
        **kwargs,
    )

    contact_name = data.get("name")
    if contact_name is None or not str(contact_name).strip():
        raise ContactValidationError("Contact name is required and cannot be empty.")
    cleaned_name = str(contact_name).strip()

    cleaned_email = _validate_email(data.get("email"))

    comp_id = data.get("company_id")
    if comp_id is not None:
        company_exists = (
            db.query(Company.id).filter(Company.id == comp_id).first() is not None
        )
        if not company_exists:
            raise InvalidForeignKeyError(f"Company ID {comp_id} does not exist.")

    return model_create_contact(
        db=db,
        name=cleaned_name,
        email=cleaned_email,
        phone=data.get("phone"),
        role=data.get("role"),
        company_id=comp_id,
        notes=data.get("notes"),
        owner=data.get("owner", ""),
    )


def get_contact(db: Session, contact_id: int) -> Optional[Contact]:
    """Retrieve a contact by primary key ID.

    Args:
        db: SQLAlchemy database session.
        contact_id: The ID of the contact to retrieve.

    Returns:
        Contact model instance if found, or None.
    """
    return model_get_contact_by_id(db, contact_id)


def get_contact_by_id(db: Session, contact_id: int) -> Optional[Contact]:
    """Retrieve a contact by primary key ID (alias for get_contact)."""
    return get_contact(db, contact_id)


def get_contacts_by_company(db: Session, company_id: int) -> List[Contact]:
    """Retrieve all contacts linked to a specific company ID.

    Args:
        db: SQLAlchemy database session.
        company_id: The ID of the associated company.

    Returns:
        List of Contact model instances.
    """
    return model_get_contacts_by_company(db, company_id)


def list_contacts(
    db: Session,
    skip: int = 0,
    limit: Optional[int] = None,
    search: Optional[str] = None,
    company_id: Optional[int] = None,
    sort_by: str = "name",
    order: str = "asc",
    page: Optional[int] = None,
    page_size: Optional[int] = None,
) -> Union[List[Contact], Tuple[List[Contact], int]]:
    """List contacts, or search and paginate if search/filter/pagination params are provided.

    Args:
        db: SQLAlchemy database session.
        skip: Pagination offset.
        limit: Pagination max items count.
        search: Optional search term (matches name or email).
        company_id: Optional filter for contacts belonging to a company.
        sort_by: Attribute to sort by ("name", "email", etc.).
        order: Sort direction ("asc" or "desc").
        page: Optional 1-based page number.
        page_size: Optional items per page.

    Returns:
        List of Contact items, or tuple of (items, total count) if searched/filtered/paginated.
    """
    if (
        search is not None
        or company_id is not None
        or page is not None
        or page_size is not None
    ):
        p = page if page is not None else 1
        ps = page_size if page_size is not None else (limit if limit else 20)
        return model_search_and_paginate_contacts(
            db,
            search=search,
            company_id=company_id,
            sort_by=sort_by,
            order=order,
            page=p,
            page_size=ps,
        )

    return model_list_contacts(db, skip=skip, limit=limit)


def search_and_paginate_contacts(
    db: Session,
    search: Optional[str] = None,
    company_id: Optional[int] = None,
    sort_by: str = "name",
    order: str = "asc",
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Contact], int]:
    """Search, filter, sort, and paginate contacts.

    Args:
        db: SQLAlchemy database session.
        search: Optional search term matching contact name or email.
        company_id: Optional company ID filter.
        sort_by: Column to sort by.
        order: Sort direction ("asc" or "desc").
        page: 1-based page index.
        page_size: Number of items per page.

    Returns:
        Tuple of (matching contact records, total count).
    """
    return model_search_and_paginate_contacts(
        db,
        search=search,
        company_id=company_id,
        sort_by=sort_by,
        order=order,
        page=page,
        page_size=page_size,
    )


def update_contact(
    db: Session,
    contact_id: int,
    contact_in: Union[BaseModel, Dict[str, Any], None] = None,
    **kwargs: Any,
) -> Contact:
    """Update an existing contact record.

    Args:
        db: SQLAlchemy database session.
        contact_id: ID of the contact to update.
        contact_in: Optional Pydantic model or dict with update attributes.
        **kwargs: Additional keyword arguments for field updates.

    Returns:
        Updated Contact model instance.

    Raises:
        ContactNotFoundError: If contact with contact_id does not exist.
        ContactValidationError: If name or email update is empty/invalid.
        InvalidForeignKeyError: If updated company_id does not exist.
    """
    contact = get_contact(db, contact_id)
    if not contact:
        raise ContactNotFoundError(f"Contact with ID {contact_id} not found.")

    updates = _extract_contact_data(contact_in, **kwargs)

    if "name" in updates:
        val = updates["name"]
        if val is None or not str(val).strip():
            raise ContactValidationError("Contact name cannot be empty.")
        updates["name"] = str(val).strip()

    if "email" in updates:
        updates["email"] = _validate_email(updates["email"])

    if "company_id" in updates:
        comp_id = updates["company_id"]
        if comp_id is not None:
            company_exists = (
                db.query(Company.id).filter(Company.id == comp_id).first() is not None
            )
            if not company_exists:
                raise InvalidForeignKeyError(f"Company ID {comp_id} does not exist.")

    updated = model_update_contact(db, contact_id, updates)
    if updated is None:
        raise ContactNotFoundError(f"Contact with ID {contact_id} not found.")
    return updated


def delete_contact(db: Session, contact_id: int) -> bool:
    """Delete a contact by ID.

    Args:
        db: SQLAlchemy database session.
        contact_id: ID of the contact to delete.

    Returns:
        True if deleted successfully.

    Raises:
        ContactNotFoundError: If contact does not exist.
    """
    contact = get_contact(db, contact_id)
    if not contact:
        raise ContactNotFoundError(f"Contact with ID {contact_id} not found.")

    return model_delete_contact(db, contact_id)
