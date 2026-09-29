"""Unit tests for FastAPI app entrypoint, middleware, and exception handlers."""

from unittest.mock import patch
from fastapi.testclient import TestClient
import pytest

from api.main import app
from services.crm.exceptions import CompanyDeleteBlockedError, CompanyNotFoundError

client = TestClient(app)


def test_healthz_endpoint() -> None:
    """Test health check endpoint on the main FastAPI application."""
    with patch("api.routers.health.check_db_connectivity", return_value=True):
        response = client.get("/healthz")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_api_health_endpoint() -> None:
    """Test /api/health endpoint on the main FastAPI application."""
    with patch("api.routers.health.check_db_connectivity", return_value=True):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


def test_correlation_id_header_provided() -> None:
    """Test that incoming X-Correlation-ID header is preserved in the response."""
    with patch("api.routers.health.check_db_connectivity", return_value=True):
        response = client.get(
            "/healthz", headers={"X-Correlation-ID": "test-cid-12345"}
        )
        assert response.status_code == 200
        assert response.headers.get("X-Correlation-ID") == "test-cid-12345"


def test_correlation_id_header_generated() -> None:
    """Test that X-Correlation-ID header is auto-generated if missing."""
    with patch("api.routers.health.check_db_connectivity", return_value=True):
        response = client.get("/healthz")
        assert response.status_code == 200
        cid = response.headers.get("X-Correlation-ID")
        assert cid is not None
        assert len(cid) > 0


def test_validation_error_structured_response() -> None:
    """Test structured 400 error response for validation failures."""
    payload = {"name": "", "email": "invalid-email"}
    response = client.post("/api/companies", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    assert data["message"] == "Validation failed"
    assert "fields" in data


def test_not_found_error_structured_response() -> None:
    """Test structured 404 error response when entity is not found."""
    with patch(
        "api.routers.crm.get_company",
        side_effect=CompanyNotFoundError("Company 999 not found"),
    ):
        response = client.get("/api/companies/999")
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"
        assert data["message"] == "Company 999 not found"


def test_delete_blocked_error_structured_response() -> None:
    """Test structured 409 error response when entity deletion is blocked."""
    with patch(
        "api.routers.crm.delete_company",
        side_effect=CompanyDeleteBlockedError("Cannot delete company with associated leads"),
    ):
        response = client.delete("/api/companies/1")
        assert response.status_code == 409
        data = response.json()
        assert data["error_code"] == "DELETE_BLOCKED"
        assert data["message"] == "Cannot delete company with associated leads"


def test_generic_exception_handler() -> None:
    """Test structured 500 error response on unhandled server exception."""
    with patch(
        "api.routers.crm.list_companies",
        side_effect=RuntimeError("Unexpected DB crash"),
    ):
        response = client.get("/api/companies")
        assert response.status_code == 500
        data = response.json()
        assert data["error_code"] == "INTERNAL_SERVER_ERROR"
        assert data["message"] == "An unexpected internal error occurred."
