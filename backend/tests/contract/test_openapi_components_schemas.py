"""Contract tests for backend OpenAPI component schemas (NFR-3).

Verifies that domain schemas (Company, Contact, Lead, Task, Interaction, Dashboard, Error)
are properly registered under components.schemas with expected properties and constraints.
"""

from typing import Any, Dict
from api.main import app


def test_openapi_component_schemas_exist() -> None:
    """Assert that all domain schemas exist in OpenAPI components.schemas."""
    spec: Dict[str, Any] = app.openapi()
    schemas = spec.get("components", {}).get("schemas", {})

    expected_schemas = [
        "CompanyCreate",
        "CompanyResponse",
        "CompanyUpdate",
        "ContactCreate",
        "ContactResponse",
        "ContactUpdate",
        "LeadCreate",
        "LeadResponse",
        "LeadUpdate",
        "TaskCreate",
        "TaskResponse",
        "TaskUpdate",
        "InteractionCreate",
        "InteractionResponse",
        "InteractionUpdate",
        "DashboardSummaryResponse",
        "ErrorResponse",
        "FieldError",
    ]

    for schema_name in expected_schemas:
        assert schema_name in schemas, f"Schema '{schema_name}' missing from components.schemas"


def test_entity_response_schemas_properties() -> None:
    """Assert key fields exist in entity response schemas."""
    spec: Dict[str, Any] = app.openapi()
    schemas = spec.get("components", {}).get("schemas", {})

    # CompanyResponse
    company_schema = schemas["CompanyResponse"]
    company_props = company_schema.get("properties", {})
    assert "id" in company_props
    assert "name" in company_props
    assert "created_at" in company_props
    assert "updated_at" in company_props

    # ContactResponse
    contact_schema = schemas["ContactResponse"]
    contact_props = contact_schema.get("properties", {})
    assert "id" in contact_props
    assert "name" in contact_props
    assert "email" in contact_props
    assert "company_id" in contact_props

    # LeadResponse
    lead_schema = schemas["LeadResponse"]
    lead_props = lead_schema.get("properties", {})
    assert "id" in lead_props
    assert "title" in lead_props
    assert "value" in lead_props
    assert "status" in lead_props

    # TaskResponse
    task_schema = schemas["TaskResponse"]
    task_props = task_schema.get("properties", {})
    assert "id" in task_props
    assert "description" in task_props
    assert "completed" in task_props
    assert "due_date" in task_props

    # InteractionResponse
    interaction_schema = schemas["InteractionResponse"]
    interaction_props = interaction_schema.get("properties", {})
    assert "id" in interaction_props
    assert "summary" in interaction_props
    assert "type" in interaction_props
    assert "date" in interaction_props


def test_error_response_schema_properties() -> None:
    """Assert that ErrorResponse schema defines standard error fields (NFR-3)."""
    spec: Dict[str, Any] = app.openapi()
    schemas = spec.get("components", {}).get("schemas", {})

    assert "ErrorResponse" in schemas
    error_props = schemas["ErrorResponse"].get("properties", {})
    assert "error_code" in error_props, "error_code missing in ErrorResponse schema"
    assert "message" in error_props, "message missing in ErrorResponse schema"

    required_fields = schemas["ErrorResponse"].get("required", [])
    assert "error_code" in required_fields
    assert "message" in required_fields
