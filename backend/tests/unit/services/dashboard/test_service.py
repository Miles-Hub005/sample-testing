"""Unit tests for dashboard domain service."""

from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models.base import Base
from models.companies import create_company
from models.contacts import create_contact
from models.interactions import create_interaction
from models.leads import LeadStatus, create_lead
from models.tasks import create_task
from services.dashboard.service import (
    get_dashboard_summary,
    get_overdue_tasks,
    get_pipeline_summary,
    get_pipeline_totals_by_status,
    get_recent_interactions,
    get_upcoming_tasks,
)


@pytest.fixture
def db_session() -> Session:
    """Fixture providing an in-memory SQLite database session."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_dashboard_empty_state(db_session: Session) -> None:
    """Test dashboard aggregation query behavior when database is completely empty (US-5, FR-6)."""
    pipeline = get_pipeline_totals_by_status(db_session)
    assert len(pipeline) == 5
    for item in pipeline:
        assert item["count"] == 0
        assert item["total_value"] == 0.0

    upcoming = get_upcoming_tasks(db_session)
    assert upcoming == []

    overdue = get_overdue_tasks(db_session)
    assert overdue == []

    recent = get_recent_interactions(db_session)
    assert recent == []

    summary = get_dashboard_summary(db_session)
    assert len(summary["pipeline_by_status"]) == 5
    assert summary["upcoming_tasks"] == []
    assert summary["overdue_tasks"] == []
    assert summary["recent_interactions"] == []


def test_pipeline_totals_by_status_aggregation(db_session: Session) -> None:
    """Test pipeline totals calculation grouped by lead status stage (FR-6, US-5)."""
    create_lead(db_session, title="Lead 1", value=10000.0, status=LeadStatus.PROSPECTING)
    create_lead(db_session, title="Lead 2", value=15000.0, status=LeadStatus.PROSPECTING)
    create_lead(db_session, title="Lead 3", value=50000.0, status=LeadStatus.NEGOTIATION)
    create_lead(db_session, title="Lead 4", value=20000.0, status=LeadStatus.CLOSED_WON)

    pipeline = get_pipeline_summary(db_session)
    pipeline_dict = {p["status"]: p for p in pipeline}

    assert pipeline_dict["Prospecting"]["count"] == 2
    assert pipeline_dict["Prospecting"]["total_value"] == 25000.0

    assert pipeline_dict["Negotiation"]["count"] == 1
    assert pipeline_dict["Negotiation"]["total_value"] == 50000.0

    assert pipeline_dict["Closed Won"]["count"] == 1
    assert pipeline_dict["Closed Won"]["total_value"] == 20000.0

    assert pipeline_dict["Qualified"]["count"] == 0
    assert pipeline_dict["Qualified"]["total_value"] == 0.0

    assert pipeline_dict["Closed Lost"]["count"] == 0
    assert pipeline_dict["Closed Lost"]["total_value"] == 0.0


def test_upcoming_tasks_filtering(db_session: Session) -> None:
    """Test retrieving incomplete tasks due within the upcoming 7 days (FR-6)."""
    ref_time = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)

    # Due in 3 days -> Should appear
    t1 = create_task(
        db_session,
        description="Follow up call",
        due_date=ref_time + timedelta(days=3),
        completed=False,
    )
    # Due in 10 days -> Out of 7-day range
    create_task(
        db_session,
        description="Far future task",
        due_date=ref_time + timedelta(days=10),
        completed=False,
    )
    # Due in 2 days but completed -> Should NOT appear
    create_task(
        db_session,
        description="Completed task",
        due_date=ref_time + timedelta(days=2),
        completed=True,
    )
    # Due 2 days ago -> Overdue, not upcoming
    create_task(
        db_session,
        description="Overdue task",
        due_date=ref_time - timedelta(days=2),
        completed=False,
    )

    upcoming = get_upcoming_tasks(db_session, days=7, now=ref_time)
    assert len(upcoming) == 1
    assert upcoming[0].id == t1.id
    assert upcoming[0].description == "Follow up call"


def test_overdue_tasks_filtering(db_session: Session) -> None:
    """Test retrieving incomplete tasks overdue relative to reference time (FR-6)."""
    ref_time = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)

    # Due 2 days ago, incomplete -> Should appear
    t_overdue = create_task(
        db_session,
        description="Overdue follow up",
        due_date=ref_time - timedelta(days=2),
        completed=False,
    )
    # Due 2 days ago, completed -> Should NOT appear
    create_task(
        db_session,
        description="Completed past task",
        due_date=ref_time - timedelta(days=2),
        completed=True,
    )
    # Due in 2 days, incomplete -> Future, not overdue
    create_task(
        db_session,
        description="Future task",
        due_date=ref_time + timedelta(days=2),
        completed=False,
    )

    overdue = get_overdue_tasks(db_session, now=ref_time)
    assert len(overdue) == 1
    assert overdue[0].id == t_overdue.id
    assert overdue[0].description == "Overdue follow up"


def test_recent_interactions_ordering_and_limit(db_session: Session) -> None:
    """Test retrieving recent interactions ordered by date descending with limit (FR-6)."""
    base_time = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)
    company = create_company(db_session, name="Acme Inc")

    # Create 15 interactions with incremental dates
    for i in range(15):
        dt = base_time + timedelta(hours=i)
        create_interaction(
            db_session,
            date=dt,
            summary=f"Interaction {i}",
            type="call",
            company_id=company.id,
        )

    recent = get_recent_interactions(db_session, limit=10)
    assert len(recent) == 10
    # Most recent interaction should be first (i=14)
    assert recent[0].summary == "Interaction 14"
    assert recent[9].summary == "Interaction 5"

    # Test filtering by company ID, contact ID, lead ID
    recent_company = get_recent_interactions(db_session, limit=10, company_id=company.id)
    assert len(recent_company) == 10

    contact = create_contact(db_session, name="Contact 1", email="c1@example.com")
    create_interaction(db_session, date=base_time, summary="Contact interaction", contact_id=contact.id)
    recent_contact = get_recent_interactions(db_session, limit=10, contact_id=contact.id)
    assert len(recent_contact) == 1
    assert recent_contact[0].summary == "Contact interaction"


def test_get_dashboard_summary_unified(db_session: Session) -> None:
    """Test unified get_dashboard_summary returning all widgets populated (FR-6, US-5)."""
    ref_time = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)

    # Add lead
    create_lead(db_session, title="Big Deal", value=75000.0, status=LeadStatus.QUALIFIED)

    # Add task
    create_task(
        db_session,
        description="Prepare deck",
        due_date=ref_time + timedelta(days=1),
        completed=False,
    )

    # Add overdue task
    create_task(
        db_session,
        description="Review NDA",
        due_date=ref_time - timedelta(days=1),
        completed=False,
    )

    # Add interaction
    create_interaction(
        db_session,
        date=ref_time,
        summary="Intro call",
        type="call",
    )

    summary = get_dashboard_summary(db_session, task_days=7, interaction_limit=10, now=ref_time)

    assert "pipeline_by_status" in summary
    assert "upcoming_tasks" in summary
    assert "overdue_tasks" in summary
    assert "recent_interactions" in summary

    qualified_stage = next(p for p in summary["pipeline_by_status"] if p["status"] == "Qualified")
    assert qualified_stage["count"] == 1
    assert qualified_stage["total_value"] == 75000.0

    assert len(summary["upcoming_tasks"]) == 1
    assert summary["upcoming_tasks"][0].description == "Prepare deck"

    assert len(summary["overdue_tasks"]) == 1
    assert summary["overdue_tasks"][0].description == "Review NDA"

    assert len(summary["recent_interactions"]) == 1
    assert summary["recent_interactions"][0].summary == "Intro call"
