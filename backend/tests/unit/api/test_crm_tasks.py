"""Unit tests for Task API router endpoints, overdue flag response, and sorting."""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from api.routers.crm import register_crm_exception_handlers, router
from models.crm import TaskCrm
from services.crm.exceptions import InvalidForeignKeyError, TaskNotFoundError

app = FastAPI()
register_crm_exception_handlers(app)
app.include_router(router)

client = TestClient(app)


def make_task_mock(
    task_id: int = 1,
    title: str = "Follow up",
    owner: str = "Alice",
    due_date: datetime | None = None,
    lead_id: int | None = None,
    contact_id: int | None = None,
    company_id: int | None = None,
) -> TaskCrm:
    """Helper to construct a mock Task model instance."""
    now = datetime.now(timezone.utc)
    return TaskCrm(
        id=task_id,
        title=title,
        owner=owner,
        due_date=due_date,
        lead_id=lead_id,
        contact_id=contact_id,
        company_id=company_id,
        created_at=now,
        updated_at=now,
    )


def test_list_tasks_empty() -> None:
    with patch("api.routers.crm.list_tasks", return_value=[]):
        response = client.get("/api/tasks")
        assert response.status_code == 200
        assert response.json() == []


def test_list_tasks_sorted_and_overdue_flag() -> None:
    now = datetime.now(timezone.utc)
    past_due = now - timedelta(days=2)
    future_due = now + timedelta(days=2)

    t1 = make_task_mock(1, "Overdue Task", "Alice", due_date=past_due)
    t2 = make_task_mock(2, "Future Task", "Bob", due_date=future_due)
    t3 = make_task_mock(3, "No Due Date Task", "Charlie", due_date=None)

    with patch("api.routers.crm.list_tasks", return_value=[t1, t2, t3]):
        response = client.get("/api/tasks")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3

        # First task is overdue
        assert data[0]["id"] == 1
        assert data[0]["title"] == "Overdue Task"
        assert data[0]["overdue"] is True

        # Second task is future, not overdue
        assert data[1]["id"] == 2
        assert data[1]["title"] == "Future Task"
        assert data[1]["overdue"] is False

        # Third task has no due date, not overdue
        assert data[2]["id"] == 3
        assert data[2]["due_date"] is None
        assert data[2]["overdue"] is False


def test_create_task_success() -> None:
    now = datetime.now(timezone.utc)
    created = make_task_mock(1, "Submit proposal", "Alice", due_date=None, company_id=10)
    with patch("api.routers.crm.create_task", return_value=created):
        payload = {
            "title": "Submit proposal",
            "owner": "Alice",
            "company_id": 10,
        }
        response = client.post("/api/tasks", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["id"] == 1
        assert data["title"] == "Submit proposal"
        assert data["owner"] == "Alice"
        assert data["company_id"] == 10
        assert data["overdue"] is False


def test_create_task_invalid_foreign_key() -> None:
    with patch(
        "api.routers.crm.create_task",
        side_effect=InvalidForeignKeyError("Company ID 999 does not exist"),
    ):
        payload = {
            "title": "Call client",
            "owner": "Alice",
            "company_id": 999,
        }
        response = client.post("/api/tasks", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert data["error_code"] == "INVALID_FOREIGN_KEY"
        assert data["message"] == "Company ID 999 does not exist"


def test_create_task_validation_error() -> None:
    payload = {}
    response = client.post("/api/tasks", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    assert data["message"] == "Validation failed"


def test_get_task_success() -> None:
    task = make_task_mock(1, "Check-in call", "Alice")
    with patch("api.routers.crm.get_task", return_value=task):
        response = client.get("/api/tasks/1")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["title"] == "Check-in call"


def test_get_task_not_found() -> None:
    with patch("api.routers.crm.get_task", return_value=None):
        response = client.get("/api/tasks/999")
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"
        assert "Task with ID 999 not found" in data["message"]


def test_update_task_success() -> None:
    updated = make_task_mock(1, "Updated title", "Alice")
    with patch("api.routers.crm.update_task", return_value=updated):
        payload = {"title": "Updated title"}
        response = client.put("/api/tasks/1", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["title"] == "Updated title"


def test_update_task_not_found() -> None:
    with patch(
        "api.routers.crm.update_task",
        side_effect=TaskNotFoundError("Task with ID 999 not found."),
    ):
        payload = {"title": "Updated title"}
        response = client.put("/api/tasks/999", json=payload)
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"


def test_update_task_invalid_fk() -> None:
    with patch(
        "api.routers.crm.update_task",
        side_effect=InvalidForeignKeyError("Contact ID 888 does not exist"),
    ):
        payload = {"contact_id": 888}
        response = client.put("/api/tasks/1", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert data["error_code"] == "INVALID_FOREIGN_KEY"


def test_delete_task_success() -> None:
    with patch("api.routers.crm.delete_task", return_value=True):
        response = client.delete("/api/tasks/1")
        assert response.status_code == 204


def test_delete_task_not_found() -> None:
    with patch(
        "api.routers.crm.delete_task",
        side_effect=TaskNotFoundError("Task with ID 999 not found."),
    ):
        response = client.delete("/api/tasks/999")
        assert response.status_code == 404
        data = response.json()
        assert data["error_code"] == "NOT_FOUND"