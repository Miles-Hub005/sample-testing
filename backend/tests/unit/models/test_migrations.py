"""Unit tests for initial schema Alembic migration."""

import importlib
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect


def test_migration_upgrade_and_downgrade() -> None:
    migration = importlib.import_module("models.migrations.versions.001_initial_schema")

    engine = create_engine("sqlite:///:memory:", echo=False)

    with engine.begin() as connection:
        ctx = MigrationContext.configure(connection)
        with Operations.context(ctx):
            migration.upgrade()

    inspector = inspect(engine)
    tables = inspector.get_table_names()
    assert "companies" in tables
    assert "contacts" in tables
    assert "leads" in tables
    assert "tasks" in tables
    assert "interactions" in tables

    # Verify search and sort indexes across all five tables
    companies_indexes = [idx["name"] for idx in inspector.get_indexes("companies")]
    assert "ix_companies_name" in companies_indexes
    assert "ix_companies_industry" in companies_indexes
    assert "ix_companies_created_at" in companies_indexes

    contacts_indexes = [idx["name"] for idx in inspector.get_indexes("contacts")]
    assert "ix_contacts_name" in contacts_indexes
    assert "ix_contacts_email" in contacts_indexes
    assert "ix_contacts_company_id" in contacts_indexes
    assert "ix_contacts_created_at" in contacts_indexes

    leads_indexes = [idx["name"] for idx in inspector.get_indexes("leads")]
    assert "ix_leads_title" in leads_indexes
    assert "ix_leads_status" in leads_indexes
    assert "ix_leads_company_id" in leads_indexes
    assert "ix_leads_contact_id" in leads_indexes
    assert "ix_leads_created_at" in leads_indexes

    tasks_indexes = [idx["name"] for idx in inspector.get_indexes("tasks")]
    assert "ix_tasks_description" in tasks_indexes
    assert "ix_tasks_due_date" in tasks_indexes
    assert "ix_tasks_completed" in tasks_indexes
    assert "ix_tasks_company_id" in tasks_indexes
    assert "ix_tasks_contact_id" in tasks_indexes
    assert "ix_tasks_lead_id" in tasks_indexes
    assert "ix_tasks_created_at" in tasks_indexes

    interactions_indexes = [idx["name"] for idx in inspector.get_indexes("interactions")]
    assert "ix_interactions_date" in interactions_indexes
    assert "ix_interactions_type" in interactions_indexes
    assert "ix_interactions_summary" in interactions_indexes
    assert "ix_interactions_company_id" in interactions_indexes
    assert "ix_interactions_contact_id" in interactions_indexes
    assert "ix_interactions_lead_id" in interactions_indexes
    assert "ix_interactions_created_at" in interactions_indexes

    # Test downgrade
    with engine.begin() as connection:
        ctx = MigrationContext.configure(connection)
        with Operations.context(ctx):
            migration.downgrade()

    inspector = inspect(engine)
    tables_after_downgrade = inspector.get_table_names()
    assert "companies" not in tables_after_downgrade
    assert "contacts" not in tables_after_downgrade
    assert "leads" not in tables_after_downgrade
    assert "tasks" not in tables_after_downgrade
    assert "interactions" not in tables_after_downgrade
