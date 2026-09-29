"""Contract tests for runtime API response conformance against OpenAPI specification (NFR-3).

Executes live HTTP requests using FastAPI TestClient to ensure that runtime status codes,
headers, and JSON payload structures match the contract defined in OpenAPI spec.
"""

from typing import Generator
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from api.main import create_app
from models.base import Base
from models.database import get_db

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db() -> Generator[Session, None, None]:
    """Dependency override providing an in-memory SQLite database session."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def app_instance() -> FastAPI:
    """Fixture providing configured FastAPI application instance."""
    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    return app


@pytest.fixture
def client(app_instance: FastAPI) -> Generator[TestClient, None, None]:
    """Fixture providing TestClient with clean DB tables before each test."""
    Base.metadata.create_all(bind=engine)
    with TestClient(app_instance) as test_client:
        yield test_client
    Base.metadata.drop_all(bind=engine)


def test_healthz_runtime_contract(client: TestClient) -> None:
    """Verify runtime response contract for /healthz endpoint."""
    res = client.get("/healthz")
    assert res.status_code == 200
    assert "application/json" in res.headers.get("content-type", "")
    data = res.json()
    assert isinstance(data, dict)
    assert data.get("status") == "ok"


def test_list_endpoints_runtime_contract(client: TestClient) -> None:
    """Verify runtime response contracts for list endpoints return 200 and JSON lists."""
    endpoints = [
        "/api/companies",
        "/api/contacts",
        "/api/leads",
        "/api/tasks",
        "/api/interactions",
    ]
    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 200, f"GET {ep} failed with status {res.status_code}"
        assert "application/json" in res.headers.get("content-type", ""), f"GET {ep} missing application/json"
        data = res.json()
        assert isinstance(data, list), f"Expected list response for {ep}, got {type(data)}"


def test_dashboard_runtime_contract(client: TestClient) -> None:
    """Verify runtime response contract for /api/dashboard summary endpoint."""
    res = client.get("/api/dashboard")
    assert res.status_code == 200
    assert "application/json" in res.headers.get("content-type", "")
    data = res.json()
    assert isinstance(data, dict)
    assert "pipeline_summary" in data
    assert "upcoming_tasks" in data
    assert "recent_interactions" in data


def test_not_found_runtime_error_contract(client: TestClient) -> None:
    """Verify 404 response payload matches ErrorResponse schema."""
    res = client.get("/api/companies/999999")
    assert res.status_code == 404
    assert "application/json" in res.headers.get("content-type", "")
    data = res.json()
    assert isinstance(data, dict)
    assert "error_code" in data
    assert data["error_code"] == "NOT_FOUND"
    assert "message" in data


def test_validation_error_runtime_contract(client: TestClient) -> None:
    """Verify validation error response payload matches ErrorResponse schema."""
    # POST empty payload to /api/companies (missing required 'name')
    res = client.post("/api/companies", json={})
    assert res.status_code in [400, 422]
    assert "application/json" in res.headers.get("content-type", "")
    data = res.json()
    assert isinstance(data, dict)
    assert "error_code" in data
    assert "message" in data


def test_company_delete_blocked_conflict_contract(client: TestClient) -> None:
    """Verify 409 conflict contract when deleting a company with linked contact."""
    # 1. Create company
    c_res = client.post("/api/companies", json={"name": "Parent Corp"})
    assert c_res.status_code == 201
    comp_id = c_res.json()["id"]

    # 2. Create linked contact
    ct_res = client.post(
        "/api/contacts",
        json={"name": "Alice Parent", "email": "alice@parent.com", "company_id": comp_id},
    )
    assert ct_res.status_code == 201

    # 3. Attempt company delete -> 409 Conflict
    d_res = client.delete(f"/api/companies/{comp_id}")
    assert d_res.status_code == 409
    assert "application/json" in d_res.headers.get("content-type", "")
    data = d_res.json()
    assert data.get("error_code") == "DELETE_BLOCKED"
    assert "message" in data
