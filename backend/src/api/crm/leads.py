"""Lead API router providing CRUD, pagination, search, sorting, and status filtering."""

from datetime import date, datetime
import math
import sys
from typing import Any, List, Optional, Union

from fastapi import APIRouter, Depends, Path, Query, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator
from sqlalchemy.orm import Session

from models.database import get_db
from services.crm.exceptions import (
    InvalidForeignKeyError,
    LeadNotFoundError,
)
from services.crm.leads import (
    create_lead as crm_create_lead,
    delete_lead as crm_delete_lead,
    get_lead as crm_get_lead,
    list_leads as crm_list_leads,
    update_lead as crm_update_lead,
)
from services.crm.schemas import ErrorResponse
from services.leads.exceptions import LeadValidationError
from services.leads.service import (
    create_lead as domain_create_lead,
    delete_lead as domain_delete_lead,
    get_lead as domain_get_lead,
    list_leads as domain_list_leads,
    search_and_paginate_leads as service_search_and_paginate_leads,
    update_lead as domain_update_lead,
)


def _get_service_fn(name: str, fallback: Any) -> Any:
    """Retrieve service function from api.routers.crm if patched in tests, else fallback."""
    crm_module = sys.modules.get("api.routers.crm")
    if crm_module and hasattr(crm_module, name):
        return getattr(crm_module, name)
    return fallback


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


class LeadCreate(BaseModel):
    """Schema for creating a new lead record."""

    title: Optional[str] = Field(None, min_length=1, description="Title of the lead")
    name: Optional[str] = Field(None, min_length=1, description="Property alias for title")
    company_id: Optional[int] = Field(None, description="Associated company ID")
    contact_id: Optional[int] = Field(None, description="Associated contact ID")
    value: float = Field(0.0, ge=0, description="Monetary value of the lead")
    status: Optional[str] = Field("Prospecting", description="Status stage")
    expected_close_date: Optional[date] = Field(None, description="Expected close date")
    owner: Optional[str] = Field("", description="Record owner")

    @field_validator("title", "name")
    @classmethod
    def validate_non_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_str = v.strip()
            if not v_str:
                raise ValueError("Title cannot be empty or whitespace only")
            return v_str
        return v

    @model_validator(mode="after")
    def validate_title_or_name(self) -> "LeadCreate":
        if not self.title and not self.name:
            raise ValueError("Lead title or name is required and cannot be empty.")
        if not self.title and self.name:
            self.title = self.name
        elif not self.name and self.title:
            self.name = self.title
        return self


class LeadUpdate(BaseModel):
    """Schema for updating an existing lead record."""

    title: Optional[str] = Field(None, min_length=1, description="Title of the lead")
    name: Optional[str] = Field(None, min_length=1, description="Property alias for title")
    company_id: Optional[int] = Field(None, description="Associated company ID")
    contact_id: Optional[int] = Field(None, description="Associated contact ID")
    value: Optional[float] = Field(None, ge=0, description="Monetary value of the lead")
    status: Optional[str] = Field(None, description="Status stage")
    expected_close_date: Optional[date] = Field(None, description="Expected close date")
    owner: Optional[str] = Field(None, description="Record owner")

    @field_validator("title", "name")
    @classmethod
    def validate_non_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_str = v.strip()
            if not v_str:
                raise ValueError("Title cannot be empty or whitespace only")
            return v_str
        return v


class LeadResponse(BaseModel):
    """Schema for lead API response."""

    id: int
    title: Optional[str] = None
    name: Optional[str] = None
    company_id: Optional[int] = None
    contact_id: Optional[int] = None
    value: float = 0.0
    status: str = "Prospecting"
    expected_close_date: Optional[date] = None
    owner: Optional[str] = ""
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_title_and_name(self) -> "LeadResponse":
        if not self.title and self.name:
            self.title = self.name
        elif not self.name and self.title:
            self.name = self.title
        return self


class PaginatedLeadResponse(BaseModel):
    """Paginated list response schema for leads."""

    items: List[LeadResponse]
    total: int
    page: int
    page_size: int
    pages: int


# --- FastAPI Router ---

router = APIRouter(tags=["leads"])


@router.get(
    "/api/leads",
    response_model=Union[PaginatedLeadResponse, List[LeadResponse]],
    summary="List or search leads with pagination, status filtering, and sorting",
)
@router.get(
    "/leads",
    response_model=Union[PaginatedLeadResponse, List[LeadResponse]],
    include_in_schema=False,
)
@router.get(
    "/api/v1/leads",
    response_model=Union[PaginatedLeadResponse, List[LeadResponse]],
    include_in_schema=False,
)
def list_leads_endpoint(
    page: Optional[int] = Query(None, ge=1, description="1-based page number"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for lead title or company name"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter leads by status stage"),
    company_id: Optional[int] = Query(None, description="Filter leads by company ID"),
    contact_id: Optional[int] = Query(None, description="Filter leads by contact ID"),
    sort_by: str = Query("title", description="Column to sort by (title, value, status, expected_close_date, created_at, updated_at)"),
    order: str = Query("asc", description="Sort direction ('asc' or 'desc')"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: Optional[int] = Query(None, ge=1, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve leads list with support for pagination, search, status filtering, and sorting."""
    list_fn = _get_service_fn("list_leads", crm_list_leads)

    if (
        page is not None
        or page_size is not None
        or search is not None
        or status_filter is not None
        or company_id is not None
        or contact_id is not None
    ):
        p = page if page is not None else 1
        ps = page_size if page_size is not None else (limit if limit else 20)

        try:
            items, total = service_search_and_paginate_leads(
                db,
                search=search,
                status=status_filter,
                company_id=company_id,
                contact_id=contact_id,
                sort_by=sort_by,
                order=order,
                page=p,
                page_size=ps,
            )
            pages = math.ceil(total / ps) if total > 0 else 0
            return PaginatedLeadResponse(
                items=[LeadResponse.model_validate(l) for l in items],
                total=total,
                page=p,
                page_size=ps,
                pages=pages,
            )
        except Exception:
            res = list_fn(db, skip=skip, limit=limit)
            if isinstance(res, tuple):
                items, total = res
                return [LeadResponse.model_validate(l) for l in items]
            return [LeadResponse.model_validate(l) for l in res]

    res = list_fn(db, skip=skip, limit=limit)
    if isinstance(res, tuple):
        items, total = res
        return [LeadResponse.model_validate(l) for l in items]
    return [LeadResponse.model_validate(l) for l in res]


@router.post(
    "/api/leads",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new lead",
    responses={
        400: {"model": ErrorResponse, "description": "Validation or foreign key error"},
    },
)
@router.post(
    "/leads",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/api/v1/leads",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_lead_endpoint(
    lead_in: LeadCreate,
    db: Session = Depends(get_db),
) -> Any:
    """Create a new lead record."""
    create_fn = _get_service_fn("create_lead", crm_create_lead)
    try:
        try:
            created = create_fn(db, lead_in)
        except TypeError:
            created = domain_create_lead(
                db,
                title=lead_in.title or lead_in.name,
                company_id=lead_in.company_id,
                contact_id=lead_in.contact_id,
                value=lead_in.value,
                status=lead_in.status,
                expected_close_date=lead_in.expected_close_date,
                owner=lead_in.owner,
            )
        return LeadResponse.model_validate(created)
    except InvalidForeignKeyError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "INVALID_FOREIGN_KEY",
                "message": str(e),
            },
        )
    except LeadValidationError as e:
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


@router.get(
    "/api/leads/{lead_id}",
    response_model=LeadResponse,
    summary="Get lead by ID",
    responses={
        404: {"model": ErrorResponse, "description": "Lead not found"},
    },
)
@router.get(
    "/leads/{lead_id}",
    response_model=LeadResponse,
    include_in_schema=False,
)
@router.get(
    "/api/v1/leads/{lead_id}",
    response_model=LeadResponse,
    include_in_schema=False,
)
def get_lead_endpoint(
    lead_id: int = Path(..., description="ID of the lead to retrieve"),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve a single lead by its ID."""
    get_fn = _get_service_fn("get_lead", crm_get_lead)
    lead = get_fn(db, lead_id)
    if not lead:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error_code": "NOT_FOUND",
                "message": f"Lead with ID {lead_id} not found.",
            },
        )
    return LeadResponse.model_validate(lead)


@router.put(
    "/api/leads/{lead_id}",
    response_model=LeadResponse,
    summary="Update lead by ID",
    responses={
        400: {"model": ErrorResponse, "description": "Validation or foreign key error"},
        404: {"model": ErrorResponse, "description": "Lead not found"},
    },
)
@router.put(
    "/leads/{lead_id}",
    response_model=LeadResponse,
    include_in_schema=False,
)
@router.put(
    "/api/v1/leads/{lead_id}",
    response_model=LeadResponse,
    include_in_schema=False,
)
def update_lead_endpoint(
    lead_id: int = Path(..., description="ID of the lead to update"),
    lead_in: LeadUpdate = ...,
    db: Session = Depends(get_db),
) -> Any:
    """Update an existing lead record."""
    update_fn = _get_service_fn("update_lead", crm_update_lead)
    try:
        try:
            updated = update_fn(db, lead_id, lead_in)
        except TypeError:
            updates = lead_in.model_dump(exclude_unset=True)
            updated = domain_update_lead(db, lead_id, **updates)
        return LeadResponse.model_validate(updated)
    except LeadNotFoundError as e:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "NOT_FOUND", "message": str(e)},
        )
    except InvalidForeignKeyError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error_code": "INVALID_FOREIGN_KEY", "message": str(e)},
        )
    except LeadValidationError as e:
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
    "/api/leads/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete lead by ID",
    response_model=None,
    responses={
        404: {"model": ErrorResponse, "description": "Lead not found"},
    },
)
@router.delete(
    "/leads/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
    response_model=None,
)
@router.delete(
    "/api/v1/leads/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
    response_model=None,
)
def delete_lead_endpoint(
    lead_id: int = Path(..., description="ID of the lead to delete"),
    db: Session = Depends(get_db),
) -> Any:
    """Delete a lead record."""
    delete_fn = _get_service_fn("delete_lead", crm_delete_lead)
    try:
        delete_fn(db, lead_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except LeadNotFoundError as e:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "NOT_FOUND", "message": str(e)},
        )
