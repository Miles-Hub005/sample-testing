"""Interaction API router providing CRUD, pagination, search, sorting, and entity association filtering."""

from datetime import date as date_type, datetime
import math
import sys
from typing import Any, List, Optional, Union

from fastapi import APIRouter, Depends, Path, Query, Response, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator, model_validator
from sqlalchemy.orm import Session

from models.database import get_db
from services.crm.exceptions import (
    InteractionNotFoundError,
    InvalidForeignKeyError,
)
from services.crm.schemas import ErrorResponse
from services.interactions.exceptions import InteractionValidationError
from services.interactions.service import (
    create_interaction as service_create_interaction,
    delete_interaction as service_delete_interaction,
    get_interaction as service_get_interaction,
    list_interactions as service_list_interactions,
    search_and_paginate_interactions as service_search_and_paginate_interactions,
    update_interaction as service_update_interaction,
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


class InteractionCreate(BaseModel):
    """Schema for creating a new interaction record."""

    summary: Optional[str] = Field(None, min_length=1, description="Summary or description of interaction")
    notes: Optional[str] = Field(None, min_length=1, description="Property alias for summary")
    title: Optional[str] = Field(None, min_length=1, description="Property alias for summary")
    name: Optional[str] = Field(None, min_length=1, description="Property alias for summary")
    date: Optional[Union[datetime, date_type, str]] = Field(
        None,
        description="Date of interaction",
    )
    timestamp: Optional[Union[datetime, date_type, str]] = Field(
        None,
        description="Property alias for date",
    )

    type: Optional[str] = Field("note", description="Type of interaction (call, email, meeting, note)")
    company_id: Optional[int] = Field(None, description="Associated company ID")
    contact_id: Optional[int] = Field(None, description="Associated contact ID")
    lead_id: Optional[int] = Field(None, description="Associated lead ID")
    owner: Optional[str] = Field("", description="Record owner")

    @field_validator("summary", "notes", "title", "name")
    @classmethod
    def validate_non_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_str = v.strip()
            if not v_str:
                raise ValueError("Interaction summary cannot be empty or whitespace only")
            return v_str
        return v

    @model_validator(mode="after")
    def validate_required_summary(self) -> "InteractionCreate":
        chosen = self.summary or self.notes or self.title or self.name
        if not chosen or not chosen.strip():
            raise ValueError("Interaction summary (or notes) is required.")
        cleaned = chosen.strip()
        self.summary = cleaned
        if not self.notes:
            self.notes = cleaned

        chosen_date = self.date or self.timestamp
        if chosen_date is not None:
            self.date = chosen_date
            self.timestamp = chosen_date

        return self


class InteractionUpdate(BaseModel):
    """Schema for updating an existing interaction record."""

    summary: Optional[str] = Field(None, min_length=1, description="Summary or description of interaction")
    notes: Optional[str] = Field(None, min_length=1, description="Property alias for summary")
    title: Optional[str] = Field(None, min_length=1, description="Property alias for summary")
    name: Optional[str] = Field(None, min_length=1, description="Property alias for summary")

    date: Optional[Union[datetime, date_type, str]] = Field(
        None,
        description="Date of interaction",
    )
    timestamp: Optional[Union[datetime, date_type, str]] = Field(
        None,
        description="Property alias for date",
    )

    type: Optional[str] = Field(None, description="Type of interaction (call, email, meeting, note)")
    company_id: Optional[int] = Field(None, description="Associated company ID")
    contact_id: Optional[int] = Field(None, description="Associated contact ID")
    lead_id: Optional[int] = Field(None, description="Associated lead ID")
    owner: Optional[str] = Field(None, description="Record owner")

    @field_validator("summary", "notes", "title", "name")
    @classmethod
    def validate_non_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_str = v.strip()
            if not v_str:
                raise ValueError("Interaction summary cannot be empty or whitespace only")
            return v_str
        return v


class InteractionResponse(BaseModel):
    """Schema for interaction API response."""

    id: int
    date: Optional[datetime] = None
    type: str = "note"
    summary: Optional[str] = ""
    company_id: Optional[int] = None
    contact_id: Optional[int] = None
    lead_id: Optional[int] = None
    owner: Optional[str] = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    notes: Optional[str] = None
    timestamp: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_aliases(self) -> "InteractionResponse":
        if not self.summary and self.notes:
            self.summary = self.notes
        elif not self.notes and self.summary:
            self.notes = self.summary

        if not self.date and self.timestamp:
            self.date = self.timestamp
        elif not self.timestamp and self.date:
            self.timestamp = self.date

        if not self.created_at and self.date:
            self.created_at = self.date
        if not self.updated_at and self.created_at:
            self.updated_at = self.created_at
        return self


class PaginatedInteractionResponse(BaseModel):
    """Paginated list response schema for interactions."""

    items: List[InteractionResponse]
    total: int
    page: int
    page_size: int
    pages: int


# --- FastAPI Router ---

router = APIRouter(tags=["interactions"])


@router.get(
    "/api/interactions",
    response_model=Union[PaginatedInteractionResponse, List[InteractionResponse]],
    summary="List or search interactions with pagination, sorting, and filtering",
)
@router.get(
    "/interactions",
    response_model=Union[PaginatedInteractionResponse, List[InteractionResponse]],
    include_in_schema=False,
)
@router.get(
    "/api/v1/interactions",
    response_model=Union[PaginatedInteractionResponse, List[InteractionResponse]],
    include_in_schema=False,
)
def list_interactions_endpoint(
    page: Optional[int] = Query(None, ge=1, description="1-based page number"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for summary, owner, or type"),
    type: Optional[str] = Query(None, description="Filter by interaction type (call, email, meeting, note)"),
    type_filter: Optional[str] = Query(None, description="Alias for type filter"),
    company_id: Optional[int] = Query(None, description="Filter by company ID"),
    contact_id: Optional[int] = Query(None, description="Filter by contact ID"),
    lead_id: Optional[int] = Query(None, description="Filter by lead ID"),
    sort_by: str = Query("date", description="Column to sort by (date, type, summary, created_at)"),
    order: str = Query("desc", description="Sort direction ('asc' or 'desc')"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: Optional[int] = Query(None, ge=1, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve interactions list with support for pagination, search, sorting, and entity filtering."""
    list_fn = _get_service_fn("list_interactions", service_list_interactions)
    effective_type_filter = type_filter or type

    if (
        page is not None
        or page_size is not None
        or search is not None
        or effective_type_filter is not None
        or company_id is not None
        or contact_id is not None
        or lead_id is not None
    ):
        p = page if page is not None else 1
        ps = page_size if page_size is not None else (limit if limit else 20)
        res = list_fn(
            db,
            search=search,
            type_filter=effective_type_filter,
            company_id=company_id,
            contact_id=contact_id,
            lead_id=lead_id,
            sort_by=sort_by,
            order=order,
            page=p,
            page_size=ps,
        )
        if isinstance(res, tuple):
            items, total = res
        else:
            items = res
            total = len(items)
        pages = math.ceil(total / ps) if total > 0 else 0
        return PaginatedInteractionResponse(
            items=[InteractionResponse.model_validate(i) for i in items],
            total=total,
            page=p,
            page_size=ps,
            pages=pages,
        )

    res = list_fn(
        db,
        skip=skip,
        limit=limit,
        search=search,
        type_filter=effective_type_filter,
        company_id=company_id,
        contact_id=contact_id,
        lead_id=lead_id,
        sort_by=sort_by,
        order=order,
    )
    if isinstance(res, tuple):
        items, total = res
        return [InteractionResponse.model_validate(i) for i in items]
    return [InteractionResponse.model_validate(i) for i in res]


@router.post(
    "/api/interactions",
    response_model=InteractionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new interaction",
    responses={
        400: {"model": ErrorResponse, "description": "Validation or foreign key error"},
    },
)
@router.post(
    "/interactions",
    response_model=InteractionResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/api/v1/interactions",
    response_model=InteractionResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_interaction_endpoint(
    interaction_in: InteractionCreate,
    db: Session = Depends(get_db),
) -> Any:
    """Create a new interaction record."""
    create_fn = _get_service_fn("create_interaction", service_create_interaction)
    try:
        summary_val = (
            interaction_in.summary
            or interaction_in.notes
            or interaction_in.title
            or interaction_in.name
        )
        date_val = interaction_in.date or interaction_in.timestamp
        created = create_fn(
            db,
            summary=summary_val,
            date=date_val,
            type=interaction_in.type or "note",
            company_id=interaction_in.company_id,
            contact_id=interaction_in.contact_id,
            lead_id=interaction_in.lead_id,
            owner=interaction_in.owner,
            notes=interaction_in.notes,
            title=interaction_in.title,
            name=interaction_in.name,
        )
        return InteractionResponse.model_validate(created)
    except (InteractionValidationError, ValueError) as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "VALIDATION_ERROR",
                "message": str(e),
                "fields": [{"field": "summary", "message": str(e)}],
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
    "/api/interactions/{interaction_id}",
    response_model=InteractionResponse,
    summary="Get interaction by ID",
    responses={
        404: {"model": ErrorResponse, "description": "Interaction not found"},
    },
)
@router.get(
    "/interactions/{interaction_id}",
    response_model=InteractionResponse,
    include_in_schema=False,
)
@router.get(
    "/api/v1/interactions/{interaction_id}",
    response_model=InteractionResponse,
    include_in_schema=False,
)
def get_interaction_endpoint(
    interaction_id: int = Path(..., description="ID of the interaction to retrieve"),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve a single interaction by its ID."""
    get_fn = _get_service_fn("get_interaction", service_get_interaction)
    interaction = get_fn(db, interaction_id)
    if not interaction:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error_code": "NOT_FOUND",
                "message": f"Interaction with ID {interaction_id} not found.",
            },
        )
    return InteractionResponse.model_validate(interaction)


@router.put(
    "/api/interactions/{interaction_id}",
    response_model=InteractionResponse,
    summary="Update interaction by ID",
    responses={
        400: {"model": ErrorResponse, "description": "Validation or foreign key error"},
        404: {"model": ErrorResponse, "description": "Interaction not found"},
    },
)
@router.put(
    "/interactions/{interaction_id}",
    response_model=InteractionResponse,
    include_in_schema=False,
)
@router.put(
    "/api/v1/interactions/{interaction_id}",
    response_model=InteractionResponse,
    include_in_schema=False,
)
def update_interaction_endpoint(
    interaction_id: int = Path(..., description="ID of the interaction to update"),
    interaction_in: InteractionUpdate = ...,
    db: Session = Depends(get_db),
) -> Any:
    """Update an existing interaction record."""
    update_fn = _get_service_fn("update_interaction", service_update_interaction)
    try:
        updates = interaction_in.model_dump(exclude_unset=True)
        updated = update_fn(db, interaction_id, **updates)
        if not updated:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "error_code": "NOT_FOUND",
                    "message": f"Interaction with ID {interaction_id} not found.",
                },
            )
        return InteractionResponse.model_validate(updated)
    except InteractionNotFoundError as e:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "NOT_FOUND", "message": str(e)},
        )
    except (InteractionValidationError, ValueError) as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "VALIDATION_ERROR",
                "message": str(e),
                "fields": [{"field": "summary", "message": str(e)}],
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


@router.delete(
    "/api/interactions/{interaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete interaction by ID",
    response_model=None,
    responses={
        404: {"model": ErrorResponse, "description": "Interaction not found"},
    },
)
@router.delete(
    "/interactions/{interaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
    response_model=None,
)
@router.delete(
    "/api/v1/interactions/{interaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
    response_model=None,
)
def delete_interaction_endpoint(
    interaction_id: int = Path(..., description="ID of the interaction to delete"),
    db: Session = Depends(get_db),
) -> Any:
    """Delete an interaction record."""
    delete_fn = _get_service_fn("delete_interaction", service_delete_interaction)
    try:
        success = delete_fn(db, interaction_id)
        if not success:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "error_code": "NOT_FOUND",
                    "message": f"Interaction with ID {interaction_id} not found.",
                },
            )
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except InteractionNotFoundError as e:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "NOT_FOUND", "message": str(e)},
        )
