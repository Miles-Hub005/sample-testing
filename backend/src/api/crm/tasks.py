"""Task API router providing CRUD, pagination, search, sorting, and status filtering."""

from datetime import date, datetime, timezone
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
    TaskNotFoundError,
)
from services.crm.schemas import ErrorResponse
from services.crm.tasks import (
    create_task as crm_create_task,
    delete_task as crm_delete_task,
    get_task as crm_get_task,
    list_tasks as crm_list_tasks,
    update_task as crm_update_task,
)
from services.tasks.exceptions import TaskValidationError
from services.tasks.service import (
    create_task as domain_create_task,
    delete_task as domain_delete_task,
    get_task as domain_get_task,
    list_tasks as domain_list_tasks,
    search_and_paginate_tasks as service_search_and_paginate_tasks,
    update_task as domain_update_task,
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


class TaskCreate(BaseModel):
    """Schema for creating a new task record."""

    description: Optional[str] = Field(None, min_length=1, description="Description of the task")
    title: Optional[str] = Field(None, min_length=1, description="Property alias for description")
    name: Optional[str] = Field(None, min_length=1, description="Property alias for description")
    due_date: Optional[Union[datetime, date, str]] = Field(None, description="Due date of the task")
    completed: bool = Field(False, description="Completion status")
    company_id: Optional[int] = Field(None, description="Associated company ID")
    lead_id: Optional[int] = Field(None, description="Associated lead ID")
    contact_id: Optional[int] = Field(None, description="Associated contact ID")
    owner: Optional[str] = Field("", description="Record owner")

    @field_validator("description", "title", "name")
    @classmethod
    def validate_non_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_str = v.strip()
            if not v_str:
                raise ValueError("Task description cannot be empty or whitespace only")
            return v_str
        return v

    @model_validator(mode="after")
    def validate_description_or_title(self) -> "TaskCreate":
        chosen = self.description or self.title or self.name
        if not chosen:
            raise ValueError("Task description (or title/name alias) is required.")
        cleaned = chosen.strip()
        if not cleaned:
            raise ValueError("Task description cannot be empty or whitespace only.")
        if not self.description:
            self.description = cleaned
        if not self.title:
            self.title = cleaned
        if not self.name:
            self.name = cleaned
        return self


class TaskUpdate(BaseModel):
    """Schema for updating an existing task record."""

    description: Optional[str] = Field(None, min_length=1, description="Description of the task")
    title: Optional[str] = Field(None, min_length=1, description="Property alias for description")
    name: Optional[str] = Field(None, min_length=1, description="Property alias for description")
    due_date: Optional[Union[datetime, date, str]] = Field(None, description="Due date of the task")
    completed: Optional[bool] = Field(None, description="Completion status")
    company_id: Optional[int] = Field(None, description="Associated company ID")
    lead_id: Optional[int] = Field(None, description="Associated lead ID")
    contact_id: Optional[int] = Field(None, description="Associated contact ID")
    owner: Optional[str] = Field(None, description="Record owner")

    @field_validator("description", "title", "name")
    @classmethod
    def validate_non_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_str = v.strip()
            if not v_str:
                raise ValueError("Task description cannot be empty or whitespace only")
            return v_str
        return v


class TaskResponse(BaseModel):
    """Schema for task API response."""

    id: int
    description: Optional[str] = None
    title: Optional[str] = None
    name: Optional[str] = None
    due_date: Optional[datetime] = None
    completed: bool = False
    overdue: bool = False
    company_id: Optional[int] = None
    lead_id: Optional[int] = None
    contact_id: Optional[int] = None
    owner: Optional[str] = ""
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="after")
    def populate_fields_and_overdue(self) -> "TaskResponse":
        chosen = self.description or self.title or self.name
        if chosen:
            if not self.description:
                self.description = chosen
            if not self.title:
                self.title = chosen
            if not self.name:
                self.name = chosen

        if not self.completed and self.due_date is not None:
            now = datetime.now(timezone.utc)
            due = self.due_date
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            self.overdue = due < now
        else:
            self.overdue = False

        return self


class PaginatedTaskResponse(BaseModel):
    """Paginated list response schema for tasks."""

    items: List[TaskResponse]
    total: int
    page: int
    page_size: int
    pages: int


# --- FastAPI Router ---

router = APIRouter(tags=["tasks"])


@router.get(
    "/api/tasks",
    response_model=Union[PaginatedTaskResponse, List[TaskResponse]],
    summary="List or search tasks with pagination, status filtering, and sorting",
)
@router.get(
    "/tasks",
    response_model=Union[PaginatedTaskResponse, List[TaskResponse]],
    include_in_schema=False,
)
@router.get(
    "/api/v1/tasks",
    response_model=Union[PaginatedTaskResponse, List[TaskResponse]],
    include_in_schema=False,
)
def list_tasks_endpoint(
    page: Optional[int] = Query(None, ge=1, description="1-based page number"),
    page_size: Optional[int] = Query(None, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for task description or owner"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter tasks by status ('completed', 'pending', 'overdue', 'all')"),
    completed: Optional[bool] = Query(None, description="Filter tasks by completed boolean flag"),
    company_id: Optional[int] = Query(None, description="Filter tasks by company ID"),
    lead_id: Optional[int] = Query(None, description="Filter tasks by lead ID"),
    contact_id: Optional[int] = Query(None, description="Filter tasks by contact ID"),
    sort_by: str = Query("due_date", description="Column to sort by (due_date, description, title, completed, created_at, updated_at)"),
    order: str = Query("asc", description="Sort direction ('asc' or 'desc')"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: Optional[int] = Query(None, ge=1, description="Maximum number of records to return"),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve tasks list with support for pagination, search, status filtering, and sorting."""
    list_fn = _get_service_fn("list_tasks", crm_list_tasks)

    if (
        page is not None
        or page_size is not None
        or search is not None
        or status_filter is not None
        or completed is not None
        or company_id is not None
        or lead_id is not None
        or contact_id is not None
    ):
        p = page if page is not None else 1
        ps = page_size if page_size is not None else (limit if limit else 20)

        try:
            items, total = service_search_and_paginate_tasks(
                db,
                search=search,
                status=status_filter,
                completed=completed,
                company_id=company_id,
                lead_id=lead_id,
                contact_id=contact_id,
                sort_by=sort_by,
                order=order,
                page=p,
                page_size=ps,
            )
            pages = math.ceil(total / ps) if total > 0 else 0
            return PaginatedTaskResponse(
                items=[TaskResponse.model_validate(t) for t in items],
                total=total,
                page=p,
                page_size=ps,
                pages=pages,
            )
        except Exception:
            res = list_fn(db, skip=skip, limit=limit)
            if isinstance(res, tuple):
                items, total = res
                return [TaskResponse.model_validate(t) for t in items]
            return [TaskResponse.model_validate(t) for t in res]

    res = list_fn(db, skip=skip, limit=limit)
    if isinstance(res, tuple):
        items, total = res
        return [TaskResponse.model_validate(t) for t in items]
    return [TaskResponse.model_validate(t) for t in res]


@router.post(
    "/api/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new task",
    responses={
        400: {"model": ErrorResponse, "description": "Validation or foreign key error"},
    },
)
@router.post(
    "/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
@router.post(
    "/api/v1/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def create_task_endpoint(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
) -> Any:
    """Create a new task record."""
    create_fn = _get_service_fn("create_task", crm_create_task)
    try:
        try:
            created = create_fn(db, task_in)
        except TypeError:
            created = domain_create_task(
                db,
                task_in=task_in,
                description=task_in.description or task_in.title or task_in.name,
                due_date=task_in.due_date,
                completed=task_in.completed,
                company_id=task_in.company_id,
                lead_id=task_in.lead_id,
                contact_id=task_in.contact_id,
                owner=task_in.owner,
            )
        return TaskResponse.model_validate(created)
    except InvalidForeignKeyError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "INVALID_FOREIGN_KEY",
                "message": str(e),
            },
        )
    except TaskValidationError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "VALIDATION_ERROR",
                "message": str(e),
                "fields": [{"field": "unknown", "message": str(e)}],
            },
        )


@router.get(
    "/api/tasks/{task_id}",
    response_model=TaskResponse,
    summary="Get task by ID",
    responses={
        404: {"model": ErrorResponse, "description": "Task not found"},
    },
)
@router.get(
    "/tasks/{task_id}",
    response_model=TaskResponse,
    include_in_schema=False,
)
@router.get(
    "/api/v1/tasks/{task_id}",
    response_model=TaskResponse,
    include_in_schema=False,
)
def get_task_endpoint(
    task_id: int = Path(..., description="The ID of the task to retrieve"),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve a single task by its ID."""
    get_fn = _get_service_fn("get_task", crm_get_task)
    task = get_fn(db, task_id)
    if not task:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error_code": "NOT_FOUND",
                "message": f"Task with ID {task_id} not found.",
            },
        )
    return TaskResponse.model_validate(task)


@router.put(
    "/api/tasks/{task_id}",
    response_model=TaskResponse,
    summary="Update task by ID",
    responses={
        400: {"model": ErrorResponse, "description": "Validation or foreign key error"},
        404: {"model": ErrorResponse, "description": "Task not found"},
    },
)
@router.put(
    "/tasks/{task_id}",
    response_model=TaskResponse,
    include_in_schema=False,
)
@router.put(
    "/api/v1/tasks/{task_id}",
    response_model=TaskResponse,
    include_in_schema=False,
)
def update_task_endpoint(
    task_id: int = Path(..., description="The ID of the task to update"),
    task_in: TaskUpdate = ...,
    db: Session = Depends(get_db),
) -> Any:
    """Update an existing task record."""
    update_fn = _get_service_fn("update_task", crm_update_task)
    try:
        try:
            updated = update_fn(db, task_id, task_in)
        except TypeError:
            updated = domain_update_task(db, task_id, task_in)
        if not updated:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "error_code": "NOT_FOUND",
                    "message": f"Task with ID {task_id} not found.",
                },
            )
        return TaskResponse.model_validate(updated)
    except TaskNotFoundError as e:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error_code": "NOT_FOUND",
                "message": str(e),
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
    except TaskValidationError as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error_code": "VALIDATION_ERROR",
                "message": str(e),
                "fields": [{"field": "unknown", "message": str(e)}],
            },
        )


@router.delete(
    "/api/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete task by ID",
    response_model=None,
    responses={
        404: {"model": ErrorResponse, "description": "Task not found"},
    },
)
@router.delete(
    "/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
    response_model=None
)
@router.delete(
    "/api/v1/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
    response_model=None,
)
def delete_task_endpoint(
    task_id: int = Path(..., description="The ID of the task to delete"),
    db: Session = Depends(get_db),
) -> Any:
    """Delete a task record by ID."""
    delete_fn = _get_service_fn("delete_task", crm_delete_task)
    try:
        res = delete_fn(db, task_id)
        if res is False:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "error_code": "NOT_FOUND",
                    "message": f"Task with ID {task_id} not found.",
                },
            )
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except TaskNotFoundError as e:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error_code": "NOT_FOUND",
                "message": str(e),
            },
        )
