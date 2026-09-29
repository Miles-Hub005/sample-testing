"""Backend integration tests for CRM API endpoints.

Covers:
- Full CRUD flows for Company, Contact, Lead, Task, and Interaction entities
- Structured error responses (validation errors, invalid foreign keys, not found, delete conflicts)
- Search, filter, and pagination across all API routes
- Company detail view with associated records (contacts, leads, tasks, interactions)
- Default sort orders (Companies name A-Z, Tasks due_date asc nulls last, Interactions timestamp desc)
- Task overdue computation and null due_date handling
- Dashboard accuracy (empty state & populated state with pipeline totals, upcoming/overdue tasks, recent interactions)
- Route versioning and aliases (/api/v1/...)
- Health check endpoints (/healthz and /api/health)
"""

from datetime import datetime, timedelta, timezone
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
    """Dependency override providing an in-memory SQLite session."""
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module")
def app_instance() -> FastAPI:
    """Fixture providing configured FastAPI application instance with overridden DB dependency."""
    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    return app


@pytest.fixture
def client(app_instance: FastAPI) -> Generator[TestClient, None, None]:
    """Fixture providing TestClient with clean database schema before each test."""
    Base.metadata.create_all(bind=engine)
    with TestClient(app_instance) as test_client:
        yield test_client
    Base.metadata.drop_all(bind=engine)


# ============================================================================
# 1. FULL CRUD FLOW INTEGRATION TESTS
# ============================================================================


def test_company_crud_flow(client: TestClient) -> None:
    """Test full CRUD lifecycle for Company entity."""
    # 1. CREATE Company
    create_payload = {
        "name": "Acme Corp",
        "email": "contact@acme.com",
        "owner": "Alice",
    }
    res_create = client.post("/api/companies", json=create_payload)
    assert res_create.status_code == 201
    created = res_create.json()
    company_id = created["id"]
    assert created["name"] == "Acme Corp"
    assert created["email"] == "contact@acme.com"
    assert created["owner"] == "Alice"
    assert "created_at" in created
    assert "updated_at" in created

    # 2. READ ONE Company
    res_get = client.get(f"/api/companies/{company_id}")
    assert res_get.status_code == 200
    got = res_get.json()
    assert got["id"] == company_id
    assert got["name"] == "Acme Corp"

    # 3. READ LIST Companies
    res_list = client.get("/api/companies")
    assert res_list.status_code == 200
    companies = res_list.json()
    assert len(companies) == 1
    assert companies[0]["id"] == company_id

    # 4. UPDATE Company
    update_payload = {
        "name": "Acme International",
        "email": "info@acmeint.com",
    }
    res_update = client.put(f"/api/companies/{company_id}", json=update_payload)
    assert res_update.status_code == 200
    updated = res_update.json()
    assert updated["name"] == "Acme International"
    assert updated["email"] == "info@acmeint.com"
    assert updated["owner"] == "Alice"

    # Verify update persisted
    res_verify = client.get(f"/api/companies/{company_id}")
    assert res_verify.status_code == 200
    assert res_verify.json()["name"] == "Acme International"

    # 5. DELETE Company
    res_delete = client.delete(f"/api/companies/{company_id}")
    assert res_delete.status_code == 204

    # Verify deletion
    res_get_deleted = client.get(f"/api/companies/{company_id}")
    assert res_get_deleted.status_code == 404
    assert res_get_deleted.json()["error_code"] == "NOT_FOUND"


def test_contact_crud_flow(client: TestClient) -> None:
    """Test full CRUD lifecycle for Contact entity, including company linking."""
    # Create parent company
    company_res = client.post(
        "/api/companies",
        json={"name": "Tech Corp", "owner": "Alice"},
    )
    assert company_res.status_code == 201
    company_id = company_res.json()["id"]

    # 1. CREATE Contact
    create_payload = {
        "name": "Jane Smith",
        "email": "jane@techcorp.com",
        "owner": "Bob",
        "company_id": company_id,
    }
    res_create = client.post("/api/contacts", json=create_payload)
    assert res_create.status_code == 201
    created = res_create.json()
    contact_id = created["id"]
    assert created["name"] == "Jane Smith"
    assert created["email"] == "jane@techcorp.com"
    assert created["owner"] == "Bob"
    assert created["company_id"] == company_id

    # 2. READ ONE Contact
    res_get = client.get(f"/api/contacts/{contact_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == contact_id

    # 3. READ LIST Contacts
    res_list = client.get("/api/contacts")
    assert res_list.status_code == 200
    contacts = res_list.json()
    assert len(contacts) == 1
    assert contacts[0]["id"] == contact_id

    # 4. UPDATE Contact
    update_payload = {"name": "Jane Doe-Smith"}
    res_update = client.put(f"/api/contacts/{contact_id}", json=update_payload)
    assert res_update.status_code == 200
    assert res_update.json()["name"] == "Jane Doe-Smith"

    # 5. DELETE Contact
    res_delete = client.delete(f"/api/contacts/{contact_id}")
    assert res_delete.status_code == 204

    # Verify deletion
    res_get_deleted = client.get(f"/api/contacts/{contact_id}")
    assert res_get_deleted.status_code == 404


def test_lead_crud_flow(client: TestClient) -> None:
    """Test full CRUD lifecycle for Lead entity."""
    # Create parent company
    company_res = client.post(
        "/api/companies",
        json={"name": "Initech", "owner": "Bob"},
    )
    assert company_res.status_code == 201
    company_id = company_res.json()["id"]

    # 1. CREATE Lead
    create_payload = {
        "name": "Peter Gibbons",
        "status": "New",
        "owner": "Charlie",
        "company_id": company_id,
    }
    res_create = client.post("/api/leads", json=create_payload)
    assert res_create.status_code == 201
    created = res_create.json()
    lead_id = created["id"]
    assert created["name"] == "Peter Gibbons"
    assert created["status"] == "New"
    assert created["company_id"] == company_id

    # 2. READ ONE Lead
    res_get = client.get(f"/api/leads/{lead_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == lead_id

    # 3. READ LIST Leads
    res_list = client.get("/api/leads")
    assert res_list.status_code == 200
    leads = res_list.json()
    assert len(leads) == 1
    assert leads[0]["id"] == lead_id

    # 4. UPDATE Lead
    update_payload = {"status": "Qualified"}
    res_update = client.put(f"/api/leads/{lead_id}", json=update_payload)
    assert res_update.status_code == 200
    assert res_update.json()["status"] == "Qualified"

    # 5. DELETE Lead
    res_delete = client.delete(f"/api/leads/{lead_id}")
    assert res_delete.status_code == 204

    # Verify deletion
    res_get_deleted = client.get(f"/api/leads/{lead_id}")
    assert res_get_deleted.status_code == 404


def test_task_crud_flow_and_overdue(client: TestClient) -> None:
    """Test full CRUD lifecycle for Task entity and overdue computation."""
    # 1. CREATE Task with past due_date -> overdue should be True
    past_due = "2020-01-01T10:00:00Z"
    create_payload = {
        "title": "Review Q1 Proposal",
        "owner": "Dave",
        "due_date": past_due,
    }
    res_create = client.post("/api/tasks", json=create_payload)
    assert res_create.status_code == 201
    created = res_create.json()
    task_id = created["id"]
    assert created["title"] == "Review Q1 Proposal"
    assert created["overdue"] is True

    # 2. READ ONE Task
    res_get = client.get(f"/api/tasks/{task_id}")
    assert res_get.status_code == 200
    got = res_get.json()
    assert got["id"] == task_id
    assert got["overdue"] is True

    # 3. READ LIST Tasks
    res_list = client.get("/api/tasks")
    assert res_list.status_code == 200
    tasks = res_list.json()
    assert len(tasks) == 1
    assert tasks[0]["id"] == task_id

    # 4. UPDATE Task with future due_date -> overdue should become False
    future_due = "2099-12-31T23:59:59Z"
    update_payload = {"due_date": future_due}
    res_update = client.put(f"/api/tasks/{task_id}", json=update_payload)
    assert res_update.status_code == 200
    updated = res_update.json()
    assert updated["overdue"] is False

    # 5. DELETE Task
    res_delete = client.delete(f"/api/tasks/{task_id}")
    assert res_delete.status_code == 204

    # Verify deletion
    res_get_deleted = client.get(f"/api/tasks/{task_id}")
    assert res_get_deleted.status_code == 404


def test_interaction_create_and_read_flow(client: TestClient) -> None:
    """Test Creation and Retrieval flows for Interaction entity."""
    # Create target company
    company_res = client.post(
        "/api/companies",
        json={"name": "Globex Corp", "owner": "Hank"},
    )
    assert company_res.status_code == 201
    company_id = company_res.json()["id"]

    # 1. CREATE Interaction
    create_payload = {
        "notes": "Initial discovery call with Hank.",
        "timestamp": "2025-01-15T14:30:00Z",
        "company_id": company_id,
    }
    res_create = client.post("/api/interactions", json=create_payload)
    assert res_create.status_code == 201
    created = res_create.json()
    interaction_id = created["id"]
    assert created["notes"] == "Initial discovery call with Hank."
    assert created["company_id"] == company_id
    assert "created_at" in created

    # 2. READ ONE Interaction
    res_get = client.get(f"/api/interactions/{interaction_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == interaction_id

    # 3. READ LIST Interactions
    res_list = client.get("/api/interactions")
    assert res_list.status_code == 200
    interactions = res_list.json()
    assert len(interactions) == 1
    assert interactions[0]["id"] == interaction_id


# ============================================================================
# 2. ERROR RESPONSES AND FIELD VALIDATION TESTS
# ============================================================================


def test_validation_error_missing_required_fields(client: TestClient) -> None:
    """Verify structured HTTP 400 validation error responses for missing required fields."""
    # Empty payload to Company endpoint
    res_company = client.post("/api/companies", json={})
    assert res_company.status_code == 400
    data = res_company.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    assert data["message"] == "Validation failed"
    field_names = [f["field"] for f in data["fields"]]
    assert "name" in field_names
    assert "owner" in field_names

    # Empty payload to Contact endpoint
    res_contact = client.post("/api/contacts", json={})
    assert res_contact.status_code == 400
    data = res_contact.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    field_names = [f["field"] for f in data["fields"]]
    assert "name" in field_names
    assert "email" in field_names
    assert "owner" in field_names

    # Empty payload to Lead endpoint
    res_lead = client.post("/api/leads", json={})
    assert res_lead.status_code == 400
    data = res_lead.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    field_names = [f["field"] for f in data["fields"]]
    assert "name" in field_names
    assert "status" in field_names
    assert "owner" in field_names

    # Empty payload to Task endpoint
    res_task = client.post("/api/tasks", json={})
    assert res_task.status_code == 400
    data = res_task.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    field_names = [f["field"] for f in data["fields"]]
    assert "title" in field_names
    assert "owner" in field_names

    # Empty payload to Interaction endpoint
    res_interaction = client.post("/api/interactions", json={})
    assert res_interaction.status_code == 400
    data = res_interaction.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    field_names = [f["field"] for f in data["fields"]]
    assert "notes" in field_names
    assert "timestamp" in field_names


def test_validation_error_invalid_email_format(client: TestClient) -> None:
    """Verify field-level error responses for invalid email formats."""
    # Company with bad email
    res_comp = client.post(
        "/api/companies",
        json={"name": "Bad Email Inc", "owner": "Alice", "email": "invalid-email"},
    )
    assert res_comp.status_code == 400
    data = res_comp.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    assert any(f["field"] == "email" for f in data["fields"])

    # Contact with bad email
    res_cont = client.post(
        "/api/contacts",
        json={"name": "Bad Email Contact", "owner": "Bob", "email": "not.an.email.address"},
    )
    assert res_cont.status_code == 400
    data = res_cont.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    assert any(f["field"] == "email" for f in data["fields"])


def test_invalid_foreign_key_errors(client: TestClient) -> None:
    """Verify HTTP 400 INVALID_FOREIGN_KEY error when referencing non-existent entities."""
    non_existent_id = 99999

    # Contact referencing invalid company_id
    res_contact = client.post(
        "/api/contacts",
        json={
            "name": "Orphan Contact",
            "email": "orphan@example.com",
            "owner": "Alice",
            "company_id": non_existent_id,
        },
    )
    assert res_contact.status_code == 400
    data = res_contact.json()
    assert data["error_code"] == "INVALID_FOREIGN_KEY"
    assert f"Company ID {non_existent_id} does not exist" in data["message"]

    # Lead referencing invalid company_id
    res_lead = client.post(
        "/api/leads",
        json={
            "name": "Orphan Lead",
            "status": "New",
            "owner": "Bob",
            "company_id": non_existent_id,
        },
    )
    assert res_lead.status_code == 400
    data = res_lead.json()
    assert data["error_code"] == "INVALID_FOREIGN_KEY"

    # Task referencing invalid company_id
    res_task = client.post(
        "/api/tasks",
        json={
            "title": "Orphan Task",
            "owner": "Charlie",
            "company_id": non_existent_id,
        },
    )
    assert res_task.status_code == 400
    data = res_task.json()
    assert data["error_code"] == "INVALID_FOREIGN_KEY"

    # Interaction referencing invalid company_id
    res_interaction = client.post(
        "/api/interactions",
        json={
            "notes": "Orphan interaction",
            "timestamp": "2025-01-01T00:00:00Z",
            "company_id": non_existent_id,
        },
    )
    assert res_interaction.status_code == 400
    data = res_interaction.json()
    assert data["error_code"] == "INVALID_FOREIGN_KEY"


def test_interaction_without_entity_link_error(client: TestClient) -> None:
    """Verify error when creating an interaction without any entity link (company, contact, or lead)."""
    res = client.post(
        "/api/interactions",
        json={
            "notes": "Unlinked interaction",
            "timestamp": "2025-01-01T00:00:00Z",
        },
    )
    assert res.status_code == 400
    data = res.json()
    assert data["error_code"] in ("VALIDATION_ERROR", "CRM_ERROR")


def test_404_not_found_errors(client: TestClient) -> None:
    """Verify HTTP 404 NOT_FOUND error responses for non-existent record IDs."""
    missing_id = 88888

    assert client.get(f"/api/companies/{missing_id}").status_code == 404
    assert (
        client.put(
            f"/api/companies/{missing_id}", json={"name": "New Name"}
        ).status_code
        == 404
    )
    assert client.delete(f"/api/companies/{missing_id}").status_code == 404

    assert client.get(f"/api/contacts/{missing_id}").status_code == 404
    assert client.get(f"/api/leads/{missing_id}").status_code == 404
    assert client.get(f"/api/tasks/{missing_id}").status_code == 404
    assert client.get(f"/api/interactions/{missing_id}").status_code == 404


def test_delete_company_blocked_by_associated_leads(client: TestClient) -> None:
    """Verify restrictive deletion rule (HTTP 409) preventing deletion of companies with associated leads."""
    # Create company
    comp_res = client.post(
        "/api/companies",
        json={"name": "Stark Industries", "owner": "Tony"},
    )
    assert comp_res.status_code == 201
    company_id = comp_res.json()["id"]

    # Create associated lead
    lead_res = client.post(
        "/api/leads",
        json={
            "name": "Arc Reactor Supply",
            "status": "New",
            "owner": "Pepper",
            "company_id": company_id,
        },
    )
    assert lead_res.status_code == 201
    lead_id = lead_res.json()["id"]

    # Attempt deleting company -> Should fail with 409 Conflict
    res_del_blocked = client.delete(f"/api/companies/{company_id}")
    assert res_del_blocked.status_code == 409
    data = res_del_blocked.json()
    assert data["error_code"] == "DELETE_BLOCKED"
    assert "associated lead" in data["message"].lower()

    # Delete the associated lead first
    res_del_lead = client.delete(f"/api/leads/{lead_id}")
    assert res_del_lead.status_code == 204

    # Now delete the company -> Should succeed with 204
    res_del_comp = client.delete(f"/api/companies/{company_id}")
    assert res_del_comp.status_code == 204


# ============================================================================
# 3. SORT ORDERS ENFORCEMENT TESTS
# ============================================================================


def test_companies_sort_order_name_asc(client: TestClient) -> None:
    """Verify default list order for Companies is name A-Z ascending."""
    client.post("/api/companies", json={"name": "Zebra Corp", "owner": "Alice"})
    client.post("/api/companies", json={"name": "Alpha LLC", "owner": "Bob"})
    client.post("/api/companies", json={"name": "Beta Inc", "owner": "Charlie"})

    res = client.get("/api/companies")
    assert res.status_code == 200
    names = [c["name"] for c in res.json()]
    assert names == ["Alpha LLC", "Beta Inc", "Zebra Corp"]


def test_tasks_sort_order_due_date_asc_nulls_last(client: TestClient) -> None:
    """Verify default list order for Tasks is due_date ascending with NULLs last."""
    client.post(
        "/api/tasks",
        json={"title": "Task 1 (Later)", "owner": "A", "due_date": "2025-06-01T10:00:00Z"},
    )
    client.post(
        "/api/tasks",
        json={"title": "Task 2 (Earlier)", "owner": "B", "due_date": "2025-01-01T10:00:00Z"},
    )
    client.post(
        "/api/tasks",
        json={"title": "Task 3 (No Due Date)", "owner": "C", "due_date": None},
    )

    res = client.get("/api/tasks")
    assert res.status_code == 200
    titles = [t["title"] for t in res.json()]
    assert titles == ["Task 2 (Earlier)", "Task 1 (Later)", "Task 3 (No Due Date)"]


def test_interactions_sort_order_timestamp_desc(client: TestClient) -> None:
    """Verify default list order for Interactions is timestamp descending."""
    comp_res = client.post("/api/companies", json={"name": "Wayne Enterprises", "owner": "Bruce"})
    company_id = comp_res.json()["id"]

    client.post(
        "/api/interactions",
        json={
            "notes": "First Interaction",
            "timestamp": "2025-01-01T10:00:00Z",
            "company_id": company_id,
        },
    )
    client.post(
        "/api/interactions",
        json={
            "notes": "Second Interaction (Later)",
            "timestamp": "2025-01-02T10:00:00Z",
            "company_id": company_id,
        },
    )

    res = client.get("/api/interactions")
    assert res.status_code == 200
    notes = [i["notes"] for i in res.json()]
    assert notes == ["Second Interaction (Later)", "First Interaction"]


# ============================================================================
# 4. INTERACTION UPDATE AND DELETE FLOW
# ============================================================================


def test_interaction_update_and_delete_flow(client: TestClient) -> None:
    """Verify PUT update and DELETE on Interaction records."""
    # Create parent company and interaction
    comp_res = client.post("/api/companies", json={"name": "Cyberdyne", "owner": "Miles"})
    company_id = comp_res.json()["id"]

    int_res = client.post(
        "/api/interactions",
        json={
            "summary": "Initial record",
            "notes": "Initial record",
            "timestamp": "2025-01-01T10:00:00Z",
            "company_id": company_id,
        },
    )
    assert int_res.status_code == 201
    interaction_id = int_res.json()["id"]

    # Test PUT /api/interactions/{id} -> 200
    res_put = client.put(f"/api/interactions/{interaction_id}", json={"summary": "Modified summary"})
    assert res_put.status_code == 200
    assert res_put.json()["summary"] == "Modified summary"

    # Test DELETE /api/interactions/{id} -> 204
    res_delete = client.delete(f"/api/interactions/{interaction_id}")
    assert res_delete.status_code == 204

    # Verify deleted -> 404
    res_get = client.get(f"/api/interactions/{interaction_id}")
    assert res_get.status_code == 404


# ============================================================================
# 5. DASHBOARD INTEGRATION TEST
# ============================================================================


def test_dashboard_integration_flow(client: TestClient) -> None:
    """Verify GET /dashboard returns pipeline totals, upcoming tasks, and recent interactions."""
    # 1. Create a Lead
    client.post(
        "/api/leads",
        json={"name": "Enterprise Deal", "value": 10000.0, "status": "Prospecting", "owner": "Alice"},
    )

    # 2. Create a Task due tomorrow
    from datetime import datetime, timedelta, timezone
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    client.post(
        "/api/tasks",
        json={"title": "Follow up lead", "due_date": tomorrow, "owner": "Alice"},
    )

    # 3. Create an Interaction
    client.post(
        "/api/interactions",
        json={"summary": "Intro call", "type": "call", "owner": "Alice"},
    )

    # 4. Fetch Dashboard
    res = client.get("/dashboard")
    assert res.status_code == 200
    data = res.json()

    assert "pipeline_by_status" in data
    assert "upcoming_tasks" in data
    assert "recent_interactions" in data

    # Check pipeline
    prospecting_stage = next(p for p in data["pipeline_by_status"] if p["status"] == "Prospecting")
    assert prospecting_stage["count"] == 1
    assert prospecting_stage["total_value"] == 10000.0

    # Check upcoming tasks
    assert len(data["upcoming_tasks"]) == 1
    assert data["upcoming_tasks"][0]["title"] == "Follow up lead"

    # Check recent interactions
    assert len(data["recent_interactions"]) == 1
    assert data["recent_interactions"][0]["summary"] == "Intro call"


# ============================================================================
# 6. HEALTH CHECK ENDPOINT TESTS
# ============================================================================


def test_health_endpoints(client: TestClient) -> None:
    """Verify health check endpoints return HTTP 200 and ok status."""
    res1 = client.get("/healthz")
    assert res1.status_code == 200
    assert res1.json() == {"status": "ok"}

    res2 = client.get("/api/health")
    assert res2.status_code == 200
    assert res2.json() == {"status": "ok"}


# ============================================================================
# 7. SEARCH, FILTER, AND PAGINATION INTEGRATION TESTS
# ============================================================================


def test_companies_search_and_pagination(client: TestClient) -> None:
    """Verify search, sorting, and pagination for Companies API."""
    client.post("/api/companies", json={"name": "Alpha Corp", "industry": "Tech", "owner": "Alice"})
    client.post("/api/companies", json={"name": "Beta Inc", "industry": "Finance", "owner": "Bob"})
    client.post("/api/companies", json={"name": "Gamma LLC", "industry": "Tech", "owner": "Charlie"})
    client.post("/api/companies", json={"name": "Delta Systems", "industry": "Healthcare", "owner": "Dave"})
    client.post("/api/companies", json={"name": "Epsilon Group", "industry": "Finance", "owner": "Eve"})

    # Pagination: page 1 with page_size=2
    res_page1 = client.get("/api/companies?page=1&page_size=2&sort_by=name&order=asc")
    assert res_page1.status_code == 200
    p1 = res_page1.json()
    assert p1["total"] == 5
    assert p1["page"] == 1
    assert p1["page_size"] == 2
    assert p1["pages"] == 3
    assert len(p1["items"]) == 2
    assert p1["items"][0]["name"] == "Alpha Corp"
    assert p1["items"][1]["name"] == "Beta Inc"

    # Page 2
    res_page2 = client.get("/api/companies?page=2&page_size=2&sort_by=name&order=asc")
    assert res_page2.status_code == 200
    p2 = res_page2.json()
    assert len(p2["items"]) == 2
    assert p2["items"][0]["name"] == "Delta Systems"
    assert p2["items"][1]["name"] == "Epsilon Group"

    # Search by industry
    res_search = client.get("/api/companies?search=Tech")
    assert res_search.status_code == 200
    p_search = res_search.json()
    assert p_search["total"] == 2
    names = [c["name"] for c in p_search["items"]]
    assert "Alpha Corp" in names
    assert "Gamma LLC" in names


def test_contacts_search_filter_and_pagination(client: TestClient) -> None:
    """Verify search, company_id filtering, and pagination for Contacts API."""
    comp1 = client.post("/api/companies", json={"name": "Company One", "owner": "Alice"}).json()["id"]
    comp2 = client.post("/api/companies", json={"name": "Company Two", "owner": "Bob"}).json()["id"]

    client.post("/api/contacts", json={"name": "Alice Smith", "email": "alice@one.com", "owner": "A", "company_id": comp1})
    client.post("/api/contacts", json={"name": "Bob Jones", "email": "bob@one.com", "owner": "B", "company_id": comp1})
    client.post("/api/contacts", json={"name": "Charlie Brown", "email": "charlie@two.com", "owner": "C", "company_id": comp2})

    # Filter by company_id
    res_comp1 = client.get(f"/api/contacts?company_id={comp1}&page=1&page_size=10")
    assert res_comp1.status_code == 200
    data_comp1 = res_comp1.json()
    assert data_comp1["total"] == 2
    assert all(c["company_id"] == comp1 for c in data_comp1["items"])

    # Search by email
    res_search = client.get("/api/contacts?search=charlie@two.com")
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert data_search["total"] == 1
    assert data_search["items"][0]["name"] == "Charlie Brown"

    # Pagination test
    res_pag = client.get("/api/contacts?page=1&page_size=2&sort_by=name&order=asc")
    assert res_pag.status_code == 200
    data_pag = res_pag.json()
    assert data_pag["total"] == 3
    assert len(data_pag["items"]) == 2


def test_leads_search_filter_and_pagination(client: TestClient) -> None:
    """Verify search, status filtering, company_id filtering, and pagination for Leads API."""
    comp1 = client.post("/api/companies", json={"name": "Acme", "owner": "A"}).json()["id"]

    client.post("/api/leads", json={"name": "Project Alpha", "status": "Prospecting", "value": 1000.0, "owner": "A", "company_id": comp1})
    client.post("/api/leads", json={"name": "Project Beta", "status": "Qualified", "value": 5000.0, "owner": "B", "company_id": comp1})
    client.post("/api/leads", json={"name": "Deal Gamma", "status": "Qualified", "value": 15000.0, "owner": "C"})

    # Filter by status
    res_status = client.get("/api/leads?status=Qualified&page=1&page_size=10")
    assert res_status.status_code == 200
    data_status = res_status.json()
    assert data_status["total"] == 2
    assert all(l["status"] == "Qualified" for l in data_status["items"])

    # Search by name/title
    res_search = client.get("/api/leads?search=Alpha")
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert data_search["total"] == 1
    assert data_search["items"][0]["title"] == "Project Alpha"

    # Filter by company_id
    res_comp = client.get(f"/api/leads?company_id={comp1}&page=1&page_size=10")
    assert res_comp.status_code == 200
    assert res_comp.json()["total"] == 2


def test_tasks_search_filter_and_pagination(client: TestClient) -> None:
    """Verify search, status/completion filtering, and pagination for Tasks API."""
    client.post("/api/tasks", json={"title": "Fix login bug", "due_date": "2025-01-01T00:00:00Z", "owner": "A"})
    client.post("/api/tasks", json={"title": "Prepare presentation", "due_date": "2025-02-01T00:00:00Z", "owner": "B"})
    client.post("/api/tasks", json={"title": "Review PRs", "due_date": "2025-03-01T00:00:00Z", "owner": "C"})

    # Search by title
    res_search = client.get("/api/tasks?search=login")
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert data_search["total"] == 1
    assert "Fix login bug" in (data_search["items"][0]["description"] or data_search["items"][0]["title"])

    # Pagination
    res_pag = client.get("/api/tasks?page=1&page_size=2&sort_by=due_date&order=asc")
    assert res_pag.status_code == 200
    data_pag = res_pag.json()
    assert data_pag["total"] == 3
    assert len(data_pag["items"]) == 2


def test_interactions_search_filter_and_pagination(client: TestClient) -> None:
    """Verify search, entity filtering, and pagination for Interactions API."""
    comp1 = client.post("/api/companies", json={"name": "Comp A", "owner": "A"}).json()["id"]

    client.post("/api/interactions", json={"summary": "Demo call", "type": "call", "company_id": comp1, "timestamp": "2025-01-01T10:00:00Z"})
    client.post("/api/interactions", json={"summary": "Follow-up email", "type": "email", "company_id": comp1, "timestamp": "2025-01-02T10:00:00Z"})
    client.post("/api/interactions", json={"summary": "Onsite meeting", "type": "meeting", "company_id": comp1, "timestamp": "2025-01-03T10:00:00Z"})

    # Search by summary
    res_search = client.get("/api/interactions?search=email")
    assert res_search.status_code == 200
    data_search = res_search.json()
    assert data_search["total"] == 1
    assert data_search["items"][0]["summary"] == "Follow-up email"

    # Filter by company_id
    res_comp = client.get(f"/api/interactions?company_id={comp1}&page=1&page_size=10")
    assert res_comp.status_code == 200
    assert res_comp.json()["total"] == 3


# ============================================================================
# 8. COMPANY DETAIL ASSOCIATIONS INTEGRATION TESTS
# ============================================================================


def test_company_detail_associations_integration(client: TestClient) -> None:
    """Verify GET /api/companies/{id} returns company details along with linked contacts, leads, tasks, and interactions."""
    comp = client.post("/api/companies", json={"name": "Omni Consumer Products", "owner": "Dick Jones"}).json()
    company_id = comp["id"]

    client.post("/api/contacts", json={"name": "RoboCop", "email": "murphy@ocp.com", "owner": "Dick", "company_id": company_id})
    client.post("/api/leads", json={"name": "ED-209 Contract", "status": "Negotiation", "value": 500000.0, "owner": "Dick", "company_id": company_id})
    client.post("/api/tasks", json={"title": "Deploy ED-209", "due_date": "2025-12-01T00:00:00Z", "owner": "Dick", "company_id": company_id})
    client.post("/api/interactions", json={"summary": "Board Meeting", "type": "meeting", "company_id": company_id, "timestamp": "2025-01-01T10:00:00Z"})

    res = client.get(f"/api/companies/{company_id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == company_id
    assert data["name"] == "Omni Consumer Products"
    assert "contacts" in data and len(data["contacts"]) == 1
    assert data["contacts"][0]["name"] == "RoboCop"
    assert "leads" in data and len(data["leads"]) == 1
    assert data["leads"][0]["title"] == "ED-209 Contract"
    assert "tasks" in data and len(data["tasks"]) == 1
    assert (data["tasks"][0]["description"] == "Deploy ED-209" or data["tasks"][0]["title"] == "Deploy ED-209")
    assert "interactions" in data and len(data["interactions"]) == 1
    assert data["interactions"][0]["summary"] == "Board Meeting"


def test_delete_company_blocked_by_other_associations(client: TestClient) -> None:
    """Verify company deletion is blocked when associated contacts, tasks, or interactions exist (HTTP 409)."""
    # Blocked by contact
    comp1 = client.post("/api/companies", json={"name": "Comp Contact Test", "owner": "A"}).json()["id"]
    cont = client.post("/api/contacts", json={"name": "User", "email": "u@test.com", "owner": "A", "company_id": comp1}).json()["id"]
    res_del1 = client.delete(f"/api/companies/{comp1}")
    assert res_del1.status_code == 409
    client.delete(f"/api/contacts/{cont}")
    assert client.delete(f"/api/companies/{comp1}").status_code == 204

    # Blocked by task
    comp2 = client.post("/api/companies", json={"name": "Comp Task Test", "owner": "A"}).json()["id"]
    task = client.post("/api/tasks", json={"title": "Task", "company_id": comp2, "owner": "A"}).json()["id"]
    res_del2 = client.delete(f"/api/companies/{comp2}")
    assert res_del2.status_code == 409
    client.delete(f"/api/tasks/{task}")
    assert client.delete(f"/api/companies/{comp2}").status_code == 204

    # Blocked by interaction
    comp3 = client.post("/api/companies", json={"name": "Comp Interaction Test", "owner": "A"}).json()["id"]
    inter = client.post("/api/interactions", json={"summary": "Call", "company_id": comp3, "timestamp": "2025-01-01T00:00:00Z"}).json()["id"]
    res_del3 = client.delete(f"/api/companies/{comp3}")
    assert res_del3.status_code == 409
    client.delete(f"/api/interactions/{inter}")
    assert client.delete(f"/api/companies/{comp3}").status_code == 204


# ============================================================================
# 9. ADVANCED DASHBOARD ACCURACY TESTS
# ============================================================================


def test_dashboard_empty_state_accuracy(client: TestClient) -> None:
    """Verify GET /dashboard accuracy on clean/empty database."""
    res = client.get("/api/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert "pipeline_by_status" in data
    assert "upcoming_tasks" in data
    assert "overdue_tasks" in data
    assert "recent_interactions" in data

    assert len(data["upcoming_tasks"]) == 0
    assert len(data["overdue_tasks"]) == 0
    assert len(data["recent_interactions"]) == 0


def test_dashboard_full_accuracy(client: TestClient) -> None:
    """Verify GET /dashboard accurately calculates pipeline stages, upcoming/overdue tasks, and recent interactions."""
    now_utc = datetime.now(timezone.utc)

    # 1. Create Leads across stages
    client.post("/api/leads", json={"name": "Prospect Deal 1", "value": 15000.0, "status": "Prospecting", "owner": "A"})
    client.post("/api/leads", json={"name": "Negotiation Deal 1", "value": 25000.0, "status": "Negotiation", "owner": "A"})
    client.post("/api/leads", json={"name": "Negotiation Deal 2", "value": 25000.0, "status": "Negotiation", "owner": "B"})
    client.post("/api/leads", json={"name": "Closed Won Deal", "value": 100000.0, "status": "Closed Won", "owner": "C"})

    # 2. Create Tasks (upcoming, overdue, completed, far future)
    upcoming_due = (now_utc + timedelta(days=2)).isoformat()
    overdue_due = (now_utc - timedelta(days=3)).isoformat()
    far_future_due = (now_utc + timedelta(days=30)).isoformat()

    client.post("/api/tasks", json={"title": "Upcoming Task", "due_date": upcoming_due, "completed": False, "owner": "A"})
    client.post("/api/tasks", json={"title": "Overdue Task", "due_date": overdue_due, "completed": False, "owner": "A"})
    client.post("/api/tasks", json={"title": "Completed Past Task", "due_date": overdue_due, "completed": True, "owner": "A"})
    client.post("/api/tasks", json={"title": "Far Future Task", "due_date": far_future_due, "completed": False, "owner": "A"})

    # 3. Create Interactions
    comp = client.post("/api/companies", json={"name": "Dash Co", "owner": "A"}).json()["id"]
    for i in range(12):
        ts = (now_utc - timedelta(hours=i)).isoformat()
        client.post("/api/interactions", json={"summary": f"Interaction {i}", "timestamp": ts, "company_id": comp})

    # 4. Request Dashboard
    res = client.get("/api/dashboard")
    assert res.status_code == 200
    data = res.json()

    # Check pipeline
    pipeline = {p["status"]: p for p in data["pipeline_by_status"]}
    assert pipeline["Negotiation"]["count"] == 2
    assert pipeline["Negotiation"]["total_value"] == 50000.0
    assert pipeline["Prospecting"]["count"] == 1
    assert pipeline["Prospecting"]["total_value"] == 15000.0
    assert pipeline["Closed Won"]["count"] == 1
    assert pipeline["Closed Won"]["total_value"] == 100000.0

    # Check upcoming tasks (only the 1 task due in 2 days)
    upcoming_titles = [t.get("title") or t.get("description") for t in data["upcoming_tasks"]]
    assert "Upcoming Task" in upcoming_titles
    assert "Overdue Task" not in upcoming_titles
    assert "Far Future Task" not in upcoming_titles
    assert "Completed Past Task" not in upcoming_titles

    # Check overdue tasks (only the 1 incomplete task past due)
    overdue_titles = [t.get("title") or t.get("description") for t in data["overdue_tasks"]]
    assert "Overdue Task" in overdue_titles
    assert "Upcoming Task" not in overdue_titles
    assert "Completed Past Task" not in overdue_titles

    # Check recent interactions (limited to 10)
    assert len(data["recent_interactions"]) == 10
    assert data["recent_interactions"][0]["summary"] == "Interaction 0"


# ============================================================================
# 10. API V1 VERSIONED ROUTES TESTS
# ============================================================================


def test_api_v1_versioned_routes(client: TestClient) -> None:
    """Verify /api/v1/... route aliases work for all entities and dashboard."""
    assert client.get("/api/v1/companies").status_code == 200
    assert client.get("/api/v1/contacts").status_code == 200
    assert client.get("/api/v1/leads").status_code == 200
    assert client.get("/api/v1/tasks").status_code == 200
    assert client.get("/api/v1/interactions").status_code == 200
    assert client.get("/api/v1/dashboard").status_code == 200

