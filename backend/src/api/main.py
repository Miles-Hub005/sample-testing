"""FastAPI application entrypoint for CRM Platform backend API."""

from contextlib import asynccontextmanager
import logging
from typing import Any, AsyncGenerator
import uuid

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from api.routers.crm import (
    format_validation_error,
    register_crm_exception_handlers,
    router as crm_router,
)
from api.routers.health import router as health_router
from lib.logging import set_correlation_id, setup_logging
from models.base import Base
import models.crm  # noqa: F401 - Register models with Base.metadata for create_all
from models.database import get_engine
from services.crm.exceptions import (
    CRMError,
    DeleteBlockedError,
    EntityNotFoundError,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for application startup and shutdown tasks.

    Initializes logging and creates database tables on startup.
    """
    setup_logging()
    logger.info("Starting CRM Platform API server...")
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized.")
    yield
    logger.info("Shutting down CRM Platform API server...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application instance.

    Returns:
        Configured FastAPI application instance.
    """
    app = FastAPI(
        title="CRM Platform API",
        description="REST API for Basic CRM Platform Foundation",
        version="1.0.0",
        lifespan=lifespan,
    )

    # Enable Cross-Origin Resource Sharing (CORS)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Middleware for Correlation ID tracing across requests
    @app.middleware("http")
    async def correlation_id_middleware(request: Request, call_next: Any) -> Response:
        cid = (
            request.headers.get("X-Correlation-ID")
            or request.headers.get("X-Request-ID")
            or str(uuid.uuid4())
        )
        set_correlation_id(cid)
        response: Response = await call_next(request)
        response.headers["X-Correlation-ID"] = cid
        return response

    # Include API routers
    app.include_router(health_router)
    app.include_router(crm_router)

    # Register CRM domain exception handlers
    register_crm_exception_handlers(app)

    # Register additional global exception handlers
    @app.exception_handler(ValidationError)
    async def pydantic_validation_exception_handler(
        request: Request, exc: ValidationError
    ) -> JSONResponse:
        return format_validation_error(exc.errors())

    @app.exception_handler(EntityNotFoundError)
    async def entity_not_found_exception_handler(
        request: Request, exc: EntityNotFoundError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error_code": "NOT_FOUND", "message": str(exc)},
        )

    @app.exception_handler(DeleteBlockedError)
    async def delete_blocked_exception_handler(
        request: Request, exc: DeleteBlockedError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error_code": "DELETE_BLOCKED", "message": str(exc)},
        )

    @app.exception_handler(CRMError)
    async def crm_error_exception_handler(
        request: Request, exc: CRMError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error_code": "CRM_ERROR", "message": str(exc)},
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        if isinstance(exc.detail, dict):
            content = exc.detail
        else:
            content = {
                "error_code": "HTTP_ERROR",
                "message": str(exc.detail),
            }
        return JSONResponse(
            status_code=exc.status_code,
            content=content,
            headers=exc.headers,
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        logger.error("Unhandled server exception: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error_code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal error occurred.",
            },
        )

    return app


app = create_app()
