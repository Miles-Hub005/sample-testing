"""Unit tests for Lead API router endpoints and company_id FK validation errors."""

from datetime import datetime, timezone
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from api.routers.crm import register_crm_exception_handlers, router
from models.crm import LeadCrm
from services.crm.exceptions import InvalidForeignKeyError, LeadNotFoundError

app = FastAPI()
register_crm_exception_handlers(app)
app.include_router(router)

client = TestClient(app)


def make_lead_mock(
    lead_id: int = 1,
    name: str = "Acme Deal",
    status: str = "New",
    owner: str = "Alice",
    company_id: int | None = None,
) -> LeadCrm:
    """Helper to construct a mock Lead model instance."""
    now = datetime.now(timezone.utc)
    return LeadCrm(
        id=lead_id,
        name=name,
        status=status,
        owner=owner,
        company_id=company_id,
        created_at=now,
        updated_at=now,
    )


def test_list_leads_empty() -> None:
    with patch("api.routers.crm.list_leads", return_value=[]):
        response = client.get("/api/leads")
        assert response.status_code == 200
        assert response.json() == []


def test_list_leads_sorted() -> None:
    l1 = make_lead_mock(1, "Alpha Deal")
    l2 = make_lead_mock(2, "Beta Deal")
    with patch("api.routers.crm.list_leads", return_value=[l1, l2]):
        response = client.get("/api/leads")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "Alpha Deal"
        assert data[1]["name"] == "Beta Deal"


def test_create_lead_success_without_company() -> None:
    created = make_lead_mock(1, "Acme Deal", "New", "Alice", company_id=None)
    with patch("api.routers.crm.create_lead", return_value=created):
        payload = {
            "name": "Acme Deal",
            "status": "New",
            "owner": "Alice",
        }
        response = client.post("/api/leads", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == 1
        assert data["name"] == "Acme Deal"
        assert data["status"] == "New"
        assert data["owner"] == "Alice"
        assert data["company_id"] is None


def test_create_lead_success_with_company() -> None:
    created = make_lead_mock(1, "Acme Deal", "Qualified", "Alice", company_id=5)
    with patch("api.routers.crm.create_lead", return_value=created):
        payload = {
            "name": "Acme Deal",
            "status": "Qualified",
            "owner": "Alice",
            "company_id": 5,
        }
        response = client.post("/api/leads", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["company_id"] == 5


def test_create_lead_validation_error_missing_fields() -> None:
    payload = {}
    response = client.post("/api/leads", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    assert data["message"] == "Validation failed"
    fields = {f["field"]: f["message"] for f in data["fields"]}
    assert "name" in fields
    assert "status" in fields
    assert "owner" in fields


def test_create_lead_invalid_company_fk() -> None:
    payload = {
        "name": "Acme Deal",
        "status": "New",
        "owner": "Alice",
        "company_id": 999,
    }
    with patch(
        "api.routers.crm.create_lead",
        side_effect=InvalidForeignKeyError("Company ID 999 does not exist"),
    ):
        response = client.post("/api/leads", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert data["error_code"] == "INVALID_FOREIGN_KEY"
        assert "Company ID 999 does not exist" in data["message"]


def test_get_lead_success() -> None:
    lead = make_lead_mock(1, "Acme Deal")
    with patch("api.routers.crm.get_lead", return_value=lead):
        response = client.get("/api/leads/1")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["name"] == "Acme Deal"


def test_get_lead_not_found() -> None:
    with patch("api.routers.crm.get_lead", return_value=None):
        response = client.get("/api/leads/999")
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"


def test_update_lead_success() -> None:
    updated = make_lead_mock(1, "Acme Deal Updated", "Closed-Won", "Alice", company_id=5)
    with patch("api.routers.crm.update_lead", return_value=updated):
        payload = {"name": "Acme Deal Updated", "status": "Closed-Won", "company_id": 5}
        response = client.put("/api/leads/1", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Acme Deal Updated"
        assert data["status"] == "Closed-Won"
        assert data["company_id"] == 5


def test_update_lead_not_found() -> None:
    with patch(
        "api.routers.crm.update_lead",
        side_effect=LeadNotFoundError("Lead with ID 999 not found."),
    ):
        payload = {"name": "Ghost"}
        response = client.put("/api/leads/999", json=payload)
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"


def test_update_lead_invalid_company_fk() -> None:
    with patch(
        "api.routers.crm.update_lead",
        side_effect=InvalidForeignKeyError("Company ID 999 does not exist"),
    ):
        payload = {"company_id": 999}
        response = client.put("/api/leads/1", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert data["error_code"] == "INVALID_FOREIGN_KEY"


def test_delete_lead_success() -> None:
    with patch("api.routers.crm.delete_lead", return_value=True):
        response = client.delete("/api/leads/1")
        assert response.status_code == 204


def test_delete_lead_not_found() -> None:
    with patch(
        "api.routers.crm.delete_lead",
        side_effect=LeadNotFoundError("Lead with ID 999 not found."),
    ):
        response = client.delete("/api/leads/999")
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"
