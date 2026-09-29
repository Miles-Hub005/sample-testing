"""Unit tests for CRM Company router endpoints and structured error responses."""

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from api.routers.crm import register_crm_exception_handlers, router
from models.crm import Company
from services.crm.exceptions import (
    CompanyDeleteBlockedError,
    CompanyNotFoundError,
)

app = FastAPI()
register_crm_exception_handlers(app)
app.include_router(router)

client = TestClient(app)


def make_company_mock(
    company_id: int = 1,
    name: str = "Acme Corp",
    email: str = "contact@acme.com",
    owner: str = "Alice",
) -> Company:
    """Helper to construct a mock Company model instance."""
    company = Company(
        id=company_id,
        name=name,
        email=email,
        owner=owner,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    return company


def test_list_companies_empty() -> None:
    with patch("api.routers.crm.list_companies", return_value=[]):
        response = client.get("/api/companies")
        assert response.status_code == 200
        assert response.json() == []


def test_list_companies_sorted() -> None:
    c1 = make_company_mock(1, "Acme Corp")
    c2 = make_company_mock(2, "Beta LLC")
    with patch("api.routers.crm.list_companies", return_value=[c1, c2]):
        response = client.get("/api/companies")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "Acme Corp"
        assert data[1]["name"] == "Beta LLC"


def test_create_company_success() -> None:
    created = make_company_mock(1, "Acme Corp", "contact@acme.com", "Alice")
    with patch("api.routers.crm.create_company", return_value=created):
        payload = {
            "name": "Acme Corp",
            "email": "contact@acme.com",
            "owner": "Alice",
        }
        response = client.post("/api/companies", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == 1
        assert data["name"] == "Acme Corp"
        assert data["email"] == "contact@acme.com"
        assert data["owner"] == "Alice"


def test_create_company_validation_error_missing_fields() -> None:
    payload = {}
    response = client.post("/api/companies", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    assert data["message"] == "Validation failed"
    fields = {f["field"]: f["message"] for f in data["fields"]}
    assert "name" in fields
    assert "owner" in fields


def test_create_company_validation_error_invalid_email() -> None:
    payload = {
        "name": "Acme Corp",
        "email": "not-an-email",
        "owner": "Alice",
    }
    response = client.post("/api/companies", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    fields = [f["field"] for f in data["fields"]]
    assert "email" in fields


def test_get_company_success() -> None:
    company = make_company_mock(1, "Acme Corp")
    with patch("api.routers.crm.get_company", return_value=company):
        response = client.get("/api/companies/1")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["name"] == "Acme Corp"


def test_get_company_not_found() -> None:
    with patch("api.routers.crm.get_company", return_value=None):
        response = client.get("/api/companies/999")
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"
        assert "999" in data["message"]


def test_update_company_success() -> None:
    updated = make_company_mock(1, "Updated Acme Corp", "contact@acme.com", "Alice")
    with patch("api.routers.crm.update_company", return_value=updated):
        payload = {"name": "Updated Acme Corp"}
        response = client.put("/api/companies/1", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Acme Corp"


def test_update_company_not_found() -> None:
    with patch(
        "api.routers.crm.update_company",
        side_effect=CompanyNotFoundError("Company with ID 999 not found."),
    ):
        payload = {"name": "Updated Acme Corp"}
        response = client.put("/api/companies/999", json=payload)
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"


def test_update_company_validation_error() -> None:
    payload = {"email": "invalid-email"}
    response = client.put("/api/companies/1", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "VALIDATION_ERROR"


def test_delete_company_success() -> None:
    with patch("api.routers.crm.delete_company", return_value=True):
        response = client.delete("/api/companies/1")
        assert response.status_code == 204


def test_delete_company_not_found() -> None:
    with patch(
        "api.routers.crm.delete_company",
        side_effect=CompanyNotFoundError("Company with ID 999 not found."),
    ):
        response = client.delete("/api/companies/999")
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"


def test_delete_company_blocked_by_leads() -> None:
    with patch(
        "api.routers.crm.delete_company",
        side_effect=CompanyDeleteBlockedError(
            "Cannot delete company 1: associated leads exist."
        ),
    ):
        response = client.delete("/api/companies/1")
        assert response.status_code == 409
        data = response.json()
        assert data["error_code"] == "DELETE_BLOCKED"
        assert "associated leads exist" in data["message"]
