"""Company service module providing CRUD operations and business logic."""

from typing import Any, Dict, List, Optional, Union
from sqlalchemy.orm import Session

from models.companies import Company
from services.companies.service import (
    create_company as service_create_company,
    delete_company as service_delete_company,
    get_company as service_get_company,
    get_company_with_associations as service_get_company_with_associations,
    list_companies as service_list_companies,
    update_company as service_update_company,
)
from services.crm.exceptions import CompanyDeleteBlockedError, CompanyNotFoundError
from services.crm.schemas import CompanyCreate, CompanyUpdate


def create_company(
    db: Session, company_in: Union[CompanyCreate, Dict[str, Any]]
) -> Company:
    """Create a new company in the database.

    Args:
        db: SQLAlchemy database session.
        company_in: Company creation data (CompanyCreate schema or dict).

    Returns:
        The created Company model instance.

    Raises:
        pydantic.ValidationError: If creation data is invalid (e.g. invalid email).
    """
    if isinstance(company_in, dict):
        company_in = CompanyCreate(**company_in)

    return service_create_company(
        db,
        name=company_in.name,
        email=company_in.email,
        owner=company_in.owner,
    )


def get_company(db: Session, company_id: int) -> Optional[Company]:
    """Retrieve a company by its ID.

    Args:
        db: SQLAlchemy database session.
        company_id: The ID of the company to retrieve.

    Returns:
        The Company model instance if found, or None.
    """
    return service_get_company(db, company_id)


def list_companies(
    db: Session, skip: int = 0, limit: Optional[int] = None
) -> List[Company]:
    """List companies sorted by name A-Z.

    Args:
        db: SQLAlchemy database session.
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.

    Returns:
        List of Company model instances sorted by name ascending.
    """
    res = service_list_companies(db, skip=skip, limit=limit)
    if isinstance(res, tuple):
        return res[0]
    return res


def update_company(
    db: Session,
    company_id: int,
    company_in: Union[CompanyUpdate, Dict[str, Any]],
) -> Company:
    """Update an existing company.

    Args:
        db: SQLAlchemy database session.
        company_id: The ID of the company to update.
        company_in: Company update data (CompanyUpdate schema or dict).

    Returns:
        The updated Company model instance.

    Raises:
        CompanyNotFoundError: If company with company_id does not exist.
        pydantic.ValidationError: If update data is invalid.
    """
    company = get_company(db, company_id)
    if not company:
        raise CompanyNotFoundError(f"Company with ID {company_id} not found.")

    if isinstance(company_in, dict):
        company_in = CompanyUpdate(**company_in)

    update_data = company_in.model_dump(exclude_unset=True)
    return service_update_company(db, company_id, update_data)


def delete_company(db: Session, company_id: int) -> bool:
    """Delete a company if no associated records exist.

    Args:
        db: SQLAlchemy database session.
        company_id: The ID of the company to delete.

    Returns:
        True if deleted successfully.

    Raises:
        CompanyNotFoundError: If company with company_id does not exist.
        CompanyDeleteBlockedError: If company has associated records.
    """
    return service_delete_company(db, company_id)
