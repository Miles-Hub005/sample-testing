"""Company API router providing CRUD, pagination, search, sorting, and association views."""

from datetime import datetime
import math
import re
from typing import Any, List, Optional, Union

from fastapi import APIRouter, Depends, Path, Query, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from sqlalchemy.orm import Session

from models.database import get_db
from services.companies.exceptions import (
    CompanyDeleteBlockedError,
    CompanyNotFoundError,
    CompanyValidationError,
)
from services.companies.service import (
    create_company as service_create_company,
    delete_company as service_delete_company,
    get_company_with_associations as service_get_company_with_associations,
    list_companies as service_list_companies,
    update_company as service_update_company,
)
from services.crm.schemas import (
    ContactResponse,
    ErrorResponse,
    InteractionResponse,
    LeadResponse,
    TaskResponse,
)

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


class CompanyCreate(BaseModel):
    """Schema for creating a new company record."""

    name: str = Field(..., min_length=1, description="Name of the company")
    industry: Optional[str] = Field(None, description="Industry sector")
    website: Optional[str] = Field(None, description="Company website URL")
    notes: Optional[str] = Field(None, description="Additional notes")
    email: Optional[str] = Field(None, description="Primary email address")
    owner: Optional[str] = Field("", description="Record owner")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)


class CompanyUpdate(BaseModel):
    """Schema for updating an existing company record."""

    name: Optional[str] = Field(None, min_length=1, description="Name of the company")
    industry: Optional[str] = Field(None, description="Industry sector")
    website: Optional[str] = Field(None, description="Company website URL")
    notes: Optional[str] = Field(None, description="Additional notes")
    email: Optional[str] = Field(None, description="Primary email address")
    owner: Optional[str] = Field(None, description="Record owner")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)


class CompanyResponse(BaseModel):
    """Schema for company detail/summary API response."""

    id: int
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    notes: Optional[str] = None
    email: Optional[str] = None
    owner: Optional[str] = ""
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedCompanyResponse(BaseModel):
    """Paginated list response schema for companies."""

    items: List[CompanyResponse]
    total: int
    page: int
    page_size: int
    pages: int


class CompanyDetailResponse(CompanyResponse):
    """Company detail response schema including associated entities."""

    contacts: List[ContactResponse] = Field(default_factory=list)
    leads: List[LeadResponse] = Field(default_factory=list)
    tasks: List[TaskResponse] = Field(default_factory=list)
    interactions: List[InteractionResponse] = Field(default_factory=list)


# --- FastAPI Router ---

router = APIRouter(tags=["companies"])


@router.get(
    "/api/companies",
    response_model=Union[PaginatedCompanyResponse, List[CompanyResponse]],
    summary="List or search companies with pagination and sorting",
)
@router.get(
    "/companies",
    response_model=Union[PaginatedCompanyResponse, List[CompanyResponse]],
    include_in_schema=False,
)
@router.get(
    "/api/v1/companies",
    response_model=Union[PaginatedCompanyResponse, List[CompanyResponse]],
    include_in_schema=False,
)
def list_companies_endpoint(
    page: Optional[int] = Query(None, ge=1, description="1-based page number"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for company name or industry"),
    sort_by: str = Query("name", description="Column to sort by (name, created_at, updated_at, industry)"),
    order: str = Query("asc", description="Sort direction ('asc' or 'desc')"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: Optional[int] = Query(None, ge=1, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve companies list with support for pagination, search, and sorting."""
    if page is not None or page_size is not None or search is not None:
        p = page if page is not None else 1
        ps = page_size if page_size is not None else 20
        items, total = service_list_companies(
            db,
            search=search,
            sort_by=sort_by,
            order=order,
            page=p,
            page_size=ps,
        )
        pages = math.ceil(total / ps) if total > 0 else 0
        return PaginatedCompanyResponse(
            items=[CompanyResponse.model_validate(c) for c in items],
            total=total,
            page=p,
            page_size=ps,
            pages=pages,
        )

    res = service_list_companies(
        db, skip=skip, limit=limit, search=search, sort_by=sort_by, order=order
    )
    if isinstance(res, tuple):
        items, total = res
        return [CompanyResponse.model_validate(c) for c in items]
    return [CompanyResponse.model_validate(c) for c in res]


@router.post(
    "/api/companies",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new company",
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
    },
)
@router.post(
    "/companies",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/api/v1/companies",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_company_endpoint(
    company_in: CompanyCreate,
    db: Session = Depends(get_db),
) -> Any:
    """Create a new company record."""
    try:
        created = service_create_company(
            db,
            name=company_in.name,
            industry=company_in.industry,
            website=company_in.website,
            notes=company_in.notes,
            email=company_in.email,
            owner=company_in.owner,
        )
        return CompanyResponse.model_validate(created)
    except CompanyValidationError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "VALIDATION_ERROR",
                "message": str(e),
                "fields": [{"field": "name", "message": str(e)}],
            },
        )
    except ValidationError as e:
        return format_validation_error(e.errors())


@router.get(
    "/api/companies/{company_id}",
    response_model=CompanyDetailResponse,
    summary="Get company detail with associated entities",
    responses={
        404: {"model": ErrorResponse, "description": "Company not found"},
    },
)
@router.get(
    "/companies/{company_id}",
    response_model=CompanyDetailResponse,
    include_in_schema=False,
)
@router.get(
    "/api/v1/companies/{company_id}",
    response_model=CompanyDetailResponse,
    include_in_schema=False,
)
def get_company_endpoint(
    company_id: int = Path(..., description="The ID of the company to retrieve"),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve company detail view including associated contacts, leads, tasks, and interactions."""
    try:
        detail = service_get_company_with_associations(db, company_id)
        company = detail["company"]
        return CompanyDetailResponse(
            id=company.id,
            name=company.name,
            industry=company.industry,
            website=company.website,
            notes=company.notes,
            email=company.email,
            owner=company.owner or "",
            created_at=company.created_at,
            updated_at=company.updated_at,
            contacts=[ContactResponse.model_validate(c) for c in detail["contacts"]],
            leads=[LeadResponse.model_validate(l) for l in detail["leads"]],
            tasks=[TaskResponse.model_validate(t) for t in detail["tasks"]],
            interactions=[
                InteractionResponse.model_validate(i) for i in detail["interactions"]
            ],
        )
    except CompanyNotFoundError as e:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error_code": "NOT_FOUND",
                "message": str(e),
            },
        )


@router.put(
    "/api/companies/{company_id}",
    response_model=CompanyResponse,
    summary="Update company by ID",
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        404: {"model": ErrorResponse, "description": "Company not found"},
    },
)
@router.put(
    "/companies/{company_id}",
    response_model=CompanyResponse,
    include_in_schema=False,
)
@router.put(
    "/api/v1/companies/{company_id}",
    response_model=CompanyResponse,
    include_in_schema=False,
)
def update_company_endpoint(
    company_id: int = Path(..., description="The ID of the company to update"),
    company_in: CompanyUpdate = ...,
    db: Session = Depends(get_db),
) -> Any:
    """Update an existing company record."""
    try:
        updated = service_update_company(db, company_id, company_in)
        return CompanyResponse.model_validate(updated)
    except CompanyNotFoundError as e:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "NOT_FOUND", "message": str(e)},
        )
    except CompanyValidationError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "VALIDATION_ERROR",
                "message": str(e),
                "fields": [{"field": "name", "message": str(e)}],
            },
        )
    except ValidationError as e:
        return format_validation_error(e.errors())


@router.delete(
    "/api/companies/{company_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete company by ID",
    response_model=None,
    responses={
        404: {"model": ErrorResponse, "description": "Company not found"},
        409: {
            "model": ErrorResponse,
            "description": "Delete blocked due to associated records (409 pending cascade clarification)",
        },
    },
)
@router.delete(
    "/companies/{company_id}",
    response_model=None,
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
)
@router.delete(
    "/api/v1/companies/{company_id}",
    response_model=None,
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
)
def delete_company_endpoint(
    company_id: int = Path(..., description="The ID of the company to delete"),
    db: Session = Depends(get_db),
) -> Any:
    """Delete a company record if no associated records exist.

    Returns HTTP 409 Conflict if associated records exist (Edge Case 1).
    """
    try:
        service_delete_company(db, company_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except CompanyNotFoundError as e:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "NOT_FOUND", "message": str(e)},
        )
    except CompanyDeleteBlockedError as e:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error_code": "DELETE_BLOCKED",
                "message": str(e),
            },
        )
