"""Unit tests for Dashboard API router endpoints (FR-6, NFR-3)."""

from datetime import datetime, timezone
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from api.routers.crm import register_crm_exception_handlers, router
from models.crm import InteractionCrm, TaskCrm

app = FastAPI()
register_crm_exception_handlers(app)
app.include_router(router)

client = TestClient(app)


def test_get_dashboard_empty() -> None:
    """Test GET /dashboard returning empty dashboard metrics."""
    mock_summary = {
        "pipeline_by_status": [
            {"status": "Prospecting", "count": 0, "total_value": 0.0},
            {"status": "Qualified", "count": 0, "total_value": 0.0},
            {"status": "Negotiation", "count": 0, "total_value": 0.0},
            {"status": "Closed Won", "count": 0, "total_value": 0.0},
            {"status": "Closed Lost", "count": 0, "total_value": 0.0},
        ],
        "upcoming_tasks": [],
        "overdue_tasks": [],
        "recent_interactions": [],
    }

    with patch("api.routers.crm.get_dashboard_summary", return_value=mock_summary):
        response = client.get("/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert len(data["pipeline_by_status"]) == 5
        assert data["upcoming_tasks"] == []
        assert data["overdue_tasks"] == []
        assert data["recent_interactions"] == []


def test_get_dashboard_populated() -> None:
    """Test GET /dashboard returning populated pipeline, tasks, and interactions."""
    now = datetime.now(timezone.utc)
    mock_summary = {
        "pipeline_by_status": [
            {"status": "Prospecting", "count": 2, "total_value": 25000.0},
            {"status": "Negotiation", "count": 1, "total_value": 50000.0},
        ],
        "upcoming_tasks": [
            TaskCrm(
                id=1,
                description="Follow up call",
                due_date=now,
                completed=False,
                owner="Alice",
                created_at=now,
                updated_at=now,
            )
        ],
        "overdue_tasks": [],
        "recent_interactions": [
            InteractionCrm(
                id=1,
                summary="Introductory call",
                type="call",
                date=now,
                owner="Bob",
                created_at=now,
                updated_at=now,
            )
        ],
    }

    with patch("api.routers.crm.get_dashboard_summary", return_value=mock_summary):
        response = client.get("/api/v1/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert len(data["pipeline_by_status"]) == 2
        assert data["pipeline_by_status"][0]["status"] == "Prospecting"
        assert data["pipeline_by_status"][0]["total_value"] == 25000.0

        assert len(data["upcoming_tasks"]) == 1
        assert data["upcoming_tasks"][0]["id"] == 1
        assert data["upcoming_tasks"][0]["description"] == "Follow up call"

        assert len(data["recent_interactions"]) == 1
        assert data["recent_interactions"][0]["id"] == 1
        assert data["recent_interactions"][0]["summary"] == "Introductory call"


def test_get_dashboard_query_params() -> None:
    """Test GET /dashboard query parameters task_days and interaction_limit."""
    mock_summary = {
        "pipeline_by_status": [],
        "upcoming_tasks": [],
        "overdue_tasks": [],
        "recent_interactions": [],
    }

    with patch("api.routers.crm.get_dashboard_summary", return_value=mock_summary) as mock_fn:
        response = client.get("/dashboard?task_days=14&interaction_limit=5")
        assert response.status_code == 200
        mock_fn.assert_called_once()
        _, kwargs = mock_fn.call_args
        assert kwargs.get("task_days") == 14
        assert kwargs.get("interaction_limit") == 5
