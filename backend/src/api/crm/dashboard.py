"""Dashboard API router providing summary metrics for CRM (FR-6, NFR-3).

Endpoints:
- GET /dashboard: returns pipeline_by_status, upcoming_tasks, overdue_tasks, and recent_interactions.
"""

from datetime import datetime
import sys
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from api.crm.interactions import InteractionResponse
from api.crm.tasks import TaskResponse
from models.database import get_db
from services.dashboard.service import (
    get_dashboard_summary as service_get_dashboard_summary,
)


def _get_service_fn(name: str, fallback: Any) -> Any:
    """Retrieve service function from api.routers.crm if patched in tests, else fallback."""
    crm_module = sys.modules.get("api.routers.crm")
    if crm_module and hasattr(crm_module, name):
        return getattr(crm_module, name)
    return fallback


# --- Request/Response Pydantic Schemas ---


class PipelineStatusSummary(BaseModel):
    """Schema for lead pipeline summary by status stage."""

    status: str = Field(..., description="Lead status stage name")
    count: int = Field(..., description="Number of leads in this status")
    total_value: float = Field(..., description="Total monetary value of leads in this status")

    model_config = ConfigDict(from_attributes=True)


class DashboardResponse(BaseModel):
    """Schema for unified dashboard summary response."""

    pipeline_by_status: List[PipelineStatusSummary] = Field(
        ..., description="Pipeline summary grouped by lead status"
    )
    upcoming_tasks: List[TaskResponse] = Field(
        ..., description="List of incomplete tasks due in the upcoming days"
    )
    overdue_tasks: List[TaskResponse] = Field(
        default_factory=list, description="List of incomplete overdue tasks"
    )
    recent_interactions: List[InteractionResponse] = Field(
        ..., description="List of recent interactions"
    )

    model_config = ConfigDict(from_attributes=True)


# --- FastAPI Router ---

router = APIRouter(tags=["dashboard"])


@router.get(
    "/api/dashboard",
    response_model=DashboardResponse,
    summary="Get CRM dashboard summary metrics",
)
@router.get(
    "/dashboard",
    response_model=DashboardResponse,
    include_in_schema=False,
)
@router.get(
    "/api/v1/dashboard",
    response_model=DashboardResponse,
    include_in_schema=False,
)
def get_dashboard(
    task_days: int = Query(7, ge=1, le=365, description="Number of upcoming days for task widget"),
    interaction_limit: int = Query(10, ge=1, le=100, description="Limit for recent interactions widget"),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve unified dashboard summary metrics including pipeline, upcoming tasks, overdue tasks, and recent interactions."""
    get_summary_fn = _get_service_fn(
        "get_dashboard_summary", service_get_dashboard_summary
    )
    summary_data = get_summary_fn(
        db, task_days=task_days, interaction_limit=interaction_limit
    )
    return summary_data
