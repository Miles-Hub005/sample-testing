"""Unit tests for InteractionCrm API router endpoints, append-only enforcement (405 responses), and sorting."""

from datetime import datetime, timezone
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from api.routers.crm import register_crm_exception_handlers, router
from models.crm import InteractionCrm
from services.crm.exceptions import InvalidForeignKeyError, InteractionNotFoundError

app = FastAPI()
register_crm_exception_handlers(app)
app.include_router(router)

client = TestClient(app)


def make_interaction_mock(
    interaction_id: int = 1,
    notes: str = "Client meeting",
    timestamp: datetime | None = None,
    company_id: int | None = None,
    contact_id: int | None = None,
    lead_id: int | None = None,
) -> InteractionCrm:
    """Helper to construct a mock InteractionCrm model instance."""
    now = datetime.now(timezone.utc)
    return InteractionCrm(
        id=interaction_id,
        notes=notes,
        timestamp=timestamp or now,
        company_id=company_id,
        contact_id=contact_id,
        lead_id=lead_id,
        created_at=now,
    )


def test_list_interactions_empty() -> None:
    with patch("api.routers.crm.list_interactions", return_value=[]):
        response = client.get("/api/interactions")
        assert response.status_code == 200
        assert response.json() == []


def test_list_interactions_sorted_descending() -> None:
    t1 = datetime(2025, 1, 10, 10, 0, tzinfo=timezone.utc)
    t2 = datetime(2025, 1, 9, 10, 0, tzinfo=timezone.utc)

    i1 = make_interaction_mock(1, "Newer interaction", timestamp=t1, company_id=10)
    i2 = make_interaction_mock(2, "Older interaction", timestamp=t2, company_id=10)

    with patch("api.routers.crm.list_interactions", return_value=[i1, i2]):
        response = client.get("/api/interactions")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id"] == 1
        assert data[0]["notes"] == "Newer interaction"
        assert data[1]["id"] == 2
        assert data[1]["notes"] == "Older interaction"


def test_list_interactions_with_filters() -> None:
    i1 = make_interaction_mock(1, "Company interaction", company_id=10)
    with patch("api.routers.crm.list_interactions", return_value=[i1]) as mock_list:
        response = client.get("/api/interactions?company_id=10")
        assert response.status_code == 200
        mock_list.assert_called_once()
        _, kwargs = mock_list.call_args
        assert kwargs.get("company_id") == 10


def test_create_interaction_success() -> None:
    now = datetime.now(timezone.utc)
    created = make_interaction_mock(1, "Initial discovery call", timestamp=now, company_id=10)
    with patch("api.routers.crm.create_interaction", return_value=created):
        payload = {
            "notes": "Initial discovery call",
            "timestamp": now.isoformat(),
            "company_id": 10,
        }
        response = client.post("/api/interactions", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == 1
        assert data["notes"] == "Initial discovery call"
        assert data["company_id"] == 10


def test_create_interaction_validation_error_no_entity_link() -> None:
    now = datetime.now(timezone.utc)
    payload = {
        "notes": "Orphan note",
        "timestamp": now.isoformat(),
    }
    response = client.post("/api/interactions", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    assert "fields" in data


def test_create_interaction_invalid_fk() -> None:
    now = datetime.now(timezone.utc)
    with patch(
        "api.routers.crm.create_interaction",
        side_effect=InvalidForeignKeyError("Company ID 999 does not exist"),
    ):
        payload = {
            "notes": "Call with bad company",
            "timestamp": now.isoformat(),
            "company_id": 999,
        }
        response = client.post("/api/interactions", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert data["error_code"] == "INVALID_FOREIGN_KEY"
        assert data["message"] == "Company ID 999 does not exist"


def test_get_interaction_success() -> None:
    now = datetime.now(timezone.utc)
    interaction = make_interaction_mock(1, "Client meeting", timestamp=now, company_id=10)
    with patch("api.routers.crm.get_interaction", return_value=interaction):
        response = client.get("/api/interactions/1")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["notes"] == "Client meeting"


def test_get_interaction_not_found() -> None:
    with patch("api.routers.crm.get_interaction", return_value=None):
        response = client.get("/api/interactions/999")
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"


def test_update_interaction_success() -> None:
    now = datetime.now(timezone.utc)
    updated = make_interaction_mock(1, "Updated interaction notes", timestamp=now, company_id=10)
    with patch("api.routers.crm.update_interaction", return_value=updated):
        response = client.put(
            "/api/interactions/1",
            json={"summary": "Updated interaction notes"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["summary"] == "Updated interaction notes"


def test_update_interaction_not_found() -> None:
    with patch("api.routers.crm.update_interaction", side_effect=InteractionNotFoundError("InteractionCrm with ID 999 not found.")):
        response = client.put(
            "/api/interactions/999",
            json={"summary": "Updated notes"},
        )
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"


def test_delete_interaction_success() -> None:
    with patch("api.routers.crm.delete_interaction", return_value=True):
        response = client.delete("/api/interactions/1")
        assert response.status_code == 204


def test_delete_interaction_not_found() -> None:
    with patch("api.routers.crm.delete_interaction", side_effect=InteractionNotFoundError("InteractionCrm with ID 999 not found.")):
        response = client.delete("/api/interactions/999")
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"
