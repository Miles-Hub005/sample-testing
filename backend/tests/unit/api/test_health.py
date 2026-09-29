"""Unit tests for health check API endpoint."""

from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.routers.health import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_health_check_success() -> None:
    with patch("api.routers.health.check_db_connectivity", return_value=True):
        response = client.get("/healthz")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

        response_api = client.get("/api/health")
        assert response_api.status_code == 200
        assert response_api.json() == {"status": "ok"}


def test_health_check_failure() -> None:
    with patch("api.routers.health.check_db_connectivity", return_value=False):
        response = client.get("/healthz")
        assert response.status_code == 503
        assert response.json() == {"status": "unavailable"}

        response_api = client.get("/api/health")
        assert response_api.status_code == 503
        assert response_api.json() == {"status": "unavailable"}
