"""Contact API router providing CRUD, pagination, search, sorting, and company association filtering."""

from datetime import datetime
import math
import re
from typing import Any, List, Optional, Union

from fastapi import APIRouter, Depends, Path, Query, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from sqlalchemy.orm import Session

from models.database import get_db
from services.contacts.exceptions import (
    ContactNotFoundError,
    ContactValidationError,
    InvalidForeignKeyError,
)
from services.contacts.service import (
    create_contact as service_create_contact,
    delete_contact as service_delete_contact,
    get_contact as service_get_contact,
    list_contacts as service_list_contacts,
    update_contact as service_update_contact,
)
from services.crm.schemas import ErrorResponse

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def _validate_email(v: Optional[str]) -> Optional[str]:
    """Validate email format if provided."""
    if v is None:
        return v
    v_str = v.strip()
    if not v_str:
        return None
    if not EMAIL_REGEX.match(v_str):
        raise ValueError("Invalid email format")
    return v_str


def format_validation_error(errors: list) -> JSONResponse:
    """Format Pydantic validation errors into structured JSON error response."""
    field_errors = []
    for err in errors:
        loc = err.get("loc", [])
        field_name = (
            ".".join(str(x) for x in loc if x != "body") if loc else "unknown"
        )
        msg = err.get("msg", "Invalid value")
        if msg.startswith("Value error, "):
            msg = msg[len("Value error, ") :]
        field_errors.append({"field": field_name, "message": msg})

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error_code": "VALIDATION_ERROR",
            "message": "Validation failed",
            "fields": field_errors,
        },
    )


# --- Request/Response Pydantic Schemas ---


class ContactCreate(BaseModel):
    """Schema for creating a new contact record."""

    name: str = Field(..., min_length=1, description="Name of the contact")
    email: str = Field(..., description="Email address of the contact")
    phone: Optional[str] = Field(None, description="Phone number")
    role: Optional[str] = Field(None, description="Role or job title")
    company_id: Optional[int] = Field(None, description="Associated company ID")
    notes: Optional[str] = Field(None, description="Additional notes")
    owner: Optional[str] = Field(..., description="Record owner")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        res = _validate_email(v)
        if res is None or not res:
            raise ValueError("Invalid email format")
        return res


class ContactUpdate(BaseModel):
    """Schema for updating an existing contact record."""

    name: Optional[str] = Field(None, min_length=1, description="Name of the contact")
    email: Optional[str] = Field(None, description="Email address of the contact")
    phone: Optional[str] = Field(None, description="Phone number")
    role: Optional[str] = Field(None, description="Role or job title")
    company_id: Optional[int] = Field(None, description="Associated company ID")
    notes: Optional[str] = Field(None, description="Additional notes")
    owner: Optional[str] = Field(None, description="Record owner")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)


class ContactResponse(BaseModel):
    """Schema for contact API response."""

    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: Optional[str] = None
    company_id: Optional[int] = None
    notes: Optional[str] = None
    owner: Optional[str] = ""
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedContactResponse(BaseModel):
    """Paginated list response schema for contacts."""

    items: List[ContactResponse]
    total: int
    page: int
    page_size: int
    pages: int


# --- FastAPI Router ---

router = APIRouter(tags=["contacts"])


@router.get(
    "/api/contacts",
    response_model=Union[PaginatedContactResponse, List[ContactResponse]],
    summary="List or search contacts with pagination, sorting, and filtering",
)
@router.get(
    "/contacts",
    response_model=Union[PaginatedContactResponse, List[ContactResponse]],
    include_in_schema=False,
)
@router.get(
    "/api/v1/contacts",
    response_model=Union[PaginatedContactResponse, List[ContactResponse]],
    include_in_schema=False,
)
def list_contacts_endpoint(
    page: Optional[int] = Query(None, ge=1, description="1-based page number"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for contact name or email"),
    company_id: Optional[int] = Query(None, description="Filter contacts by company ID"),
    sort_by: str = Query("name", description="Column to sort by (name, email, created_at, updated_at)"),
    order: str = Query("asc", description="Sort direction ('asc' or 'desc')"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: Optional[int] = Query(None, ge=1, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve contacts list with support for pagination, search, sorting, and company filtering."""
    if page is not None or page_size is not None or search is not None or company_id is not None:
        p = page if page is not None else 1
        ps = page_size if page_size is not None else (limit if limit else 20)
        items, total = service_list_contacts(
            db,
            search=search,
            company_id=company_id,
            sort_by=sort_by,
            order=order,
            page=p,
            page_size=ps,
        )
        pages = math.ceil(total / ps) if total > 0 else 0
        return PaginatedContactResponse(
            items=[ContactResponse.model_validate(c) for c in items],
            total=total,
            page=p,
            page_size=ps,
            pages=pages,
        )

    res = service_list_contacts(
        db, skip=skip, limit=limit, search=search, company_id=company_id, sort_by=sort_by, order=order
    )
    if isinstance(res, tuple):
        items, total = res
        return [ContactResponse.model_validate(c) for c in items]
    return [ContactResponse.model_validate(c) for c in res]


@router.post(
    "/api/contacts",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new contact",
    responses={
        400: {"model": ErrorResponse, "description": "Validation or foreign key error"},
    },
)
@router.post(
    "/contacts",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/api/v1/contacts",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_contact_endpoint(
    contact_in: ContactCreate,
    db: Session = Depends(get_db),
) -> Any:
    """Create a new contact record."""
    try:
        created = service_create_contact(
            db,
            name=contact_in.name,
            email=contact_in.email,
            phone=contact_in.phone,
            role=contact_in.role,
            company_id=contact_in.company_id,
            notes=contact_in.notes,
            owner=contact_in.owner,
        )
        return ContactResponse.model_validate(created)
    except ContactValidationError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "VALIDATION_ERROR",
                "message": str(e),
                "fields": [{"field": "unknown", "message": str(e)}],
            },
        )
    except InvalidForeignKeyError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "INVALID_FOREIGN_KEY",
                "message": str(e),
            },
        )
    except ValidationError as e:
        return format_validation_error(e.errors())


@router.get(
    "/api/contacts/{contact_id}",
    response_model=ContactResponse,
    summary="Get contact by ID",
    responses={
        404: {"model": ErrorResponse, "description": "Contact not found"},
    },
)
@router.get(
    "/contacts/{contact_id}",
    response_model=ContactResponse,
    include_in_schema=False,
)
@router.get(
    "/api/v1/contacts/{contact_id}",
    response_model=ContactResponse,
    include_in_schema=False,
)
def get_contact_endpoint(
    contact_id: int = Path(..., description="ID of the contact to retrieve"),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve a single contact by its ID."""
    contact = service_get_contact(db, contact_id)
    if not contact:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error_code": "NOT_FOUND",
                "message": f"Contact with ID {contact_id} not found.",
            },
        )
    return ContactResponse.model_validate(contact)


@router.put(
    "/api/contacts/{contact_id}",
    response_model=ContactResponse,
    summary="Update contact by ID",
    responses={
        400: {"model": ErrorResponse, "description": "Validation or foreign key error"},
        404: {"model": ErrorResponse, "description": "Contact not found"},
    },
)
@router.put(
    "/contacts/{contact_id}",
    response_model=ContactResponse,
    include_in_schema=False,
)
@router.put(
    "/api/v1/contacts/{contact_id}",
    response_model=ContactResponse,
    include_in_schema=False,
)
def update_contact_endpoint(
    contact_id: int = Path(..., description="ID of the contact to update"),
    contact_in: ContactUpdate = ...,
    db: Session = Depends(get_db),
) -> Any:
    """Update an existing contact record."""
    try:
        updates = contact_in.model_dump(exclude_unset=True)
        updated = service_update_contact(db, contact_id, **updates)
        return ContactResponse.model_validate(updated)
    except ContactNotFoundError as e:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "NOT_FOUND", "message": str(e)},
        )
    except InvalidForeignKeyError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error_code": "INVALID_FOREIGN_KEY", "message": str(e)},
        )
    except ContactValidationError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "VALIDATION_ERROR",
                "message": str(e),
                "fields": [{"field": "unknown", "message": str(e)}],
            },
        )
    except ValidationError as e:
        return format_validation_error(e.errors())


@router.delete(
    "/api/contacts/{contact_id}",
    response_model=None,
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete contact by ID",
    responses={
        404: {"model": ErrorResponse, "description": "Contact not found"},
    },
)
@router.delete(
    "/contacts/{contact_id}",
    response_model=None,
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
)
@router.delete(
    "/api/v1/contacts/{contact_id}",
    response_model=None,
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
)
def delete_contact_endpoint(
    contact_id: int = Path(..., description="ID of the contact to delete"),
    db: Session = Depends(get_db),
) -> Any:
    """Delete a contact record."""
    try:
        service_delete_contact(db, contact_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except ContactNotFoundError as e:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "NOT_FOUND", "message": str(e)},
        )
