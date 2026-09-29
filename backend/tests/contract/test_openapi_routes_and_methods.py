"""Contract tests for backend OpenAPI route definitions and HTTP methods (NFR-3).

Verifies that all required REST endpoints define standard HTTP methods, expected status codes,
and JSON content-type specifications in accordance with OpenAPI contracts.
"""

from typing import Any, Dict
from api.main import app


def test_openapi_endpoint_methods_and_operations() -> None:
    """Assert that every entity route in OpenAPI schema defines expected HTTP verbs."""
    spec: Dict[str, Any] = app.openapi()
    paths = spec.get("paths", {})

    route_methods = {
        "/api/companies": ["get", "post"],
        "/api/companies/{company_id}": ["get", "put", "delete"],
        "/api/contacts": ["get", "post"],
        "/api/contacts/{contact_id}": ["get", "put", "delete"],
        "/api/leads": ["get", "post"],
        "/api/leads/{lead_id}": ["get", "put", "delete"],
        "/api/tasks": ["get", "post"],
        "/api/tasks/{task_id}": ["get", "put", "delete"],
        "/api/interactions": ["get", "post"],
        "/api/interactions/{interaction_id}": ["get", "put", "delete"],
        "/api/dashboard": ["get"],
        "/healthz": ["get"],
        "/api/health": ["get"],
    }

    for route, expected_verbs in route_methods.items():
        assert route in paths, f"Route {route} not found in OpenAPI paths"
        methods = paths[route]
        for verb in expected_verbs:
            assert verb in methods, f"Method {verb.upper()} missing for route {route}"


def test_openapi_status_codes_and_content_types() -> None:
    """Assert that endpoints specify application/json and expected HTTP status codes (NFR-3)."""
    spec: Dict[str, Any] = app.openapi()
    paths = spec.get("paths", {})

    # Check POST creation endpoints return 201
    post_routes = [
        "/api/companies",
        "/api/contacts",
        "/api/leads",
        "/api/tasks",
        "/api/interactions",
    ]
    for route in post_routes:
        post_op = paths[route]["post"]
        responses = post_op.get("responses", {})
        assert "201" in responses, f"POST {route} missing 201 status code in schema"
        content = responses["201"].get("content", {})
        assert "application/json" in content, f"POST {route} 201 response missing application/json content type"

    # Check single-entity endpoints document 404
    entity_detail_routes = [
        "/api/companies/{company_id}",
        "/api/contacts/{contact_id}",
        "/api/leads/{lead_id}",
        "/api/tasks/{task_id}",
        "/api/interactions/{interaction_id}",
    ]
    for route in entity_detail_routes:
        for verb in ["get", "put", "delete"]:
            op = paths[route][verb]
            responses = op.get("responses", {})
            assert "404" in responses, f"{verb.upper()} {route} missing 404 status code in schema"

    # Check DELETE /api/companies/{company_id} documents 409 conflict
    company_delete_op = paths["/api/companies/{company_id}"]["delete"]
    assert "409" in company_delete_op.get("responses", {}), "DELETE /api/companies/{company_id} missing 409 Conflict response"


def test_openapi_path_parameters() -> None:
    """Assert that single-entity routes define required path parameters."""
    spec: Dict[str, Any] = app.openapi()
    paths = spec.get("paths", {})

    path_params = {
        "/api/companies/{company_id}": "company_id",
        "/api/contacts/{contact_id}": "contact_id",
        "/api/leads/{lead_id}": "lead_id",
        "/api/tasks/{task_id}": "task_id",
        "/api/interactions/{interaction_id}": "interaction_id",
    }

    for route, param_name in path_params.items():
        op = paths[route]["get"]
        parameters = op.get("parameters", [])
        param = next((p for p in parameters if p.get("name") == param_name and p.get("in") == "path"), None)
        assert param is not None, f"Path parameter '{param_name}' missing in {route}"
        assert param.get("required") is True, f"Path parameter '{param_name}' in {route} must be required"
