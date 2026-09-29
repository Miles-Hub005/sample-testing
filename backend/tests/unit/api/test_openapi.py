"""Unit tests for OpenAPI specification generation and verification."""

import json
from pathlib import Path

from api.main import app


def test_generate_and_verify_openapi_spec() -> None:
    """Verify that OpenAPI spec generated from FastAPI app matches contracts/openapi.json."""
    spec = app.openapi()
    assert spec["info"]["title"] == "CRM Platform API"
    assert spec["info"]["version"] == "1.0.0"
    assert "paths" in spec
    assert "/api/companies" in spec["paths"]
    assert "/api/contacts" in spec["paths"]
    assert "/api/leads" in spec["paths"]
    assert "/api/tasks" in spec["paths"]
    assert "/api/interactions" in spec["paths"]
    assert "/api/dashboard" in spec["paths"]
    assert "/healthz" in spec["paths"]

    # Locate repository root
    repo_root = Path(__file__).resolve()
    while repo_root.parent != repo_root and not (repo_root / "backend").exists():
        repo_root = repo_root.parent

    contracts_dir = repo_root / "contracts"
    openapi_file = contracts_dir / "openapi.json"

    assert openapi_file.exists(), f"Committed spec file missing at {openapi_file}"
    with open(openapi_file, "r", encoding="utf-8") as f:
        committed_spec = json.load(f)
    assert spec == committed_spec, "Generated OpenAPI schema does not match committed contracts/openapi.json"
