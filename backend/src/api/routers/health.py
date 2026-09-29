"""Health check router verifying database connectivity."""

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from models.database import check_db_connectivity

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=dict)
@router.get("/api/health", response_model=dict)
def health_check() -> JSONResponse:
    """Verify system health and database connectivity.

    Returns:
        HTTP 200 with {"status": "ok"} if database connection is verified.
        HTTP 503 with {"status": "unavailable"} if database is unreachable.
    """
    if check_db_connectivity():
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "ok"},
        )
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "unavailable"},
    )
