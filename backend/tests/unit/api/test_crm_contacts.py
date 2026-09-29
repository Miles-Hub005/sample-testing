"""Unit tests for Contact API router endpoints, email validation, and FK validation errors."""

from datetime import datetime, timezone
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from api.routers.crm import register_crm_exception_handlers, router
from models.crm import Contact
from services.crm.exceptions import ContactNotFoundError, InvalidForeignKeyError

app = FastAPI()
register_crm_exception_handlers(app)
app.include_router(router)

client = TestClient(app)


def make_contact_mock(
    contact_id: int = 1,
    name: str = "Jane Doe",
    email: str = "jane@example.com",
    owner: str = "Alice",
    company_id: int | None = None,
) -> Contact:
    """Helper to construct a mock Contact model instance."""
    now = datetime.now(timezone.utc)
    return Contact(
        id=contact_id,
        name=name,
        email=email,
        owner=owner,
        company_id=company_id,
        created_at=now,
        updated_at=now,
    )


def test_list_contacts_empty() -> None:
    with patch("api.routers.crm.list_contacts", return_value=[]):
        response = client.get("/api/contacts")
        assert response.status_code == 200
        assert response.json() == []


def test_list_contacts_sorted() -> None:
    c1 = make_contact_mock(1, "Alice Smith")
    c2 = make_contact_mock(2, "Bob Jones")
    with patch("api.routers.crm.list_contacts", return_value=[c1, c2]):
        response = client.get("/api/contacts")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "Alice Smith"
        assert data[1]["name"] == "Bob Jones"


def test_create_contact_success() -> None:
    created = make_contact_mock(1, "Jane Doe", "jane@example.com", "Alice", company_id=10)
    with patch("api.routers.crm.create_contact", return_value=created):
        payload = {
            "name": "Jane Doe",
            "email": "jane@example.com",
            "owner": "Alice",
            "company_id": 10,
        }
        response = client.post("/api/contacts", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == 1
        assert data["name"] == "Jane Doe"
        assert data["email"] == "jane@example.com"
        assert data["owner"] == "Alice"
        assert data["company_id"] == 10


def test_create_contact_validation_error_missing_fields() -> None:
    payload = {}
    response = client.post("/api/contacts", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    assert data["message"] == "Validation failed"
    fields = {f["field"]: f["message"] for f in data["fields"]}
    assert "name" in fields
    assert "email" in fields
    assert "owner" in fields


def test_create_contact_validation_error_invalid_email() -> None:
    payload = {
        "name": "Jane Doe",
        "email": "invalid-email",
        "owner": "Alice",
    }
    response = client.post("/api/contacts", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    fields = [f["field"] for f in data["fields"]]
    assert "email" in fields


def test_create_contact_invalid_fk() -> None:
    payload = {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "owner": "Alice",
        "company_id": 999,
    }
    with patch(
        "api.routers.crm.create_contact",
        side_effect=InvalidForeignKeyError("Company ID 999 does not exist"),
    ):
        response = client.post("/api/contacts", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert data["error_code"] == "INVALID_FOREIGN_KEY"
        assert "Company ID 999 does not exist" in data["message"]


def test_get_contact_success() -> None:
    contact = make_contact_mock(1, "Jane Doe")
    with patch("api.routers.crm.get_contact", return_value=contact):
        response = client.get("/api/contacts/1")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["name"] == "Jane Doe"


def test_get_contact_not_found() -> None:
    with patch("api.routers.crm.get_contact", return_value=None):
        response = client.get("/api/contacts/999")
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"


def test_update_contact_success() -> None:
    updated = make_contact_mock(1, "Jane Updated", "jane_updated@example.com", "Alice")
    with patch("api.routers.crm.update_contact", return_value=updated):
        payload = {"name": "Jane Updated", "email": "jane_updated@example.com"}
        response = client.put("/api/contacts/1", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Jane Updated"
        assert data["email"] == "jane_updated@example.com"


def test_update_contact_not_found() -> None:
    with patch(
        "api.routers.crm.update_contact",
        side_effect=ContactNotFoundError("Contact with ID 999 not found."),
    ):
        payload = {"name": "Ghost"}
        response = client.put("/api/contacts/999", json=payload)
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"


def test_update_contact_invalid_fk() -> None:
    with patch(
        "api.routers.crm.update_contact",
        side_effect=InvalidForeignKeyError("Company ID 999 does not exist"),
    ):
        payload = {"company_id": 999}
        response = client.put("/api/contacts/1", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert data["error_code"] == "INVALID_FOREIGN_KEY"


def test_delete_contact_success() -> None:
    with patch("api.routers.crm.delete_contact", return_value=True):
        response = client.delete("/api/contacts/1")
        assert response.status_code == 204


def test_delete_contact_not_found() -> None:
    with patch(
        "api.routers.crm.delete_contact",
        side_effect=ContactNotFoundError("Contact with ID 999 not found."),
    ):
        response = client.delete("/api/contacts/999")
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"
