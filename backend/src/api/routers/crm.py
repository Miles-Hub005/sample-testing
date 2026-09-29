"""CRM router providing REST API endpoints for Company, Contact, Lead, Task, and Interaction CRUD operations."""

from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from api.crm.companies import router as companies_router
from api.crm.contacts import router as contacts_router
from api.crm.dashboard import router as dashboard_router
from api.crm.interactions import router as interactions_router
from api.crm.leads import router as leads_router
from api.crm.tasks import router as tasks_router
from models.database import get_db
from services.dashboard.service import get_dashboard_summary
from services.contacts.service import (
    create_contact,
    delete_contact,
    get_contact,
    list_contacts,
    update_contact,
)
from services.interactions.service import (
    create_interaction,
    delete_interaction,
    get_interaction,
    list_interactions,
    update_interaction,
)
from services.crm.leads import (
    create_lead,
    delete_lead,
    get_lead,
    list_leads,
    update_lead,
)
from services.crm.tasks import (
    create_task,
    delete_task,
    get_task,
    list_tasks,
    update_task,
)
from services.crm.exceptions import (
    CompanyDeleteBlockedError,
    CompanyNotFoundError,
    ContactNotFoundError,
    InteractionNotFoundError,
    InvalidForeignKeyError,
    LeadNotFoundError,
    TaskNotFoundError,
)
from services.crm.schemas import (
    CompanyCreate,
    CompanyResponse,
    CompanyUpdate,
    ContactCreate,
    ContactResponse,
    ContactUpdate,
    ErrorResponse,
    InteractionCreate,
    InteractionResponse,
    LeadCreate,
    LeadResponse,
    LeadUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)

router = APIRouter()
router.include_router(companies_router)
router.include_router(contacts_router)
router.include_router(leads_router)
router.include_router(tasks_router)
router.include_router(interactions_router)
router.include_router(dashboard_router)


def format_validation_error(errors: list) -> JSONResponse:
    """Format validation errors into structured ErrorResponse JSON.

    Args:
        errors: List of error dictionaries from RequestValidationError or ValidationError.

    Returns:
        JSONResponse with HTTP 400 and structured ErrorResponse content.
    """
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


def register_crm_exception_handlers(app: Any) -> None:
    """Register custom exception handlers on a FastAPI application for structured error responses.

    Args:
        app: FastAPI application instance.
    """

    @app.exception_handler(RequestValidationError)
    async def request_validation_exception_handler(
        request: Any, exc: RequestValidationError
    ) -> JSONResponse:
        return format_validation_error(exc.errors())

    @app.exception_handler(CompanyNotFoundError)
    async def company_not_found_exception_handler(
        request: Any, exc: CompanyNotFoundError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "NOT_FOUND", "message": str(exc)},
        )

    @app.exception_handler(CompanyDeleteBlockedError)
    async def company_delete_blocked_exception_handler(
        request: Any, exc: CompanyDeleteBlockedError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error_code": "DELETE_BLOCKED", "message": str(exc)},
        )

    @app.exception_handler(ContactNotFoundError)
    async def contact_not_found_exception_handler(
        request: Any, exc: ContactNotFoundError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "NOT_FOUND", "message": str(exc)},
        )

    @app.exception_handler(LeadNotFoundError)
    async def lead_not_found_exception_handler(
        request: Any, exc: LeadNotFoundError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "NOT_FOUND", "message": str(exc)},
        )

    @app.exception_handler(TaskNotFoundError)
    async def task_not_found_exception_handler(
        request: Any, exc: TaskNotFoundError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "NOT_FOUND", "message": str(exc)},
        )

    @app.exception_handler(InteractionNotFoundError)
    async def interaction_not_found_exception_handler(
        request: Any, exc: InteractionNotFoundError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "NOT_FOUND", "message": str(exc)},
        )

    @app.exception_handler(InvalidForeignKeyError)
    async def invalid_foreign_key_exception_handler(
        request: Any, exc: InvalidForeignKeyError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error_code": "INVALID_FOREIGN_KEY", "message": str(exc)},
        )
