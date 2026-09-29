"""Initial schema creating companies, contacts, leads, tasks, and interactions tables with search and sort indexes.

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-09-25

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create companies table
    op.create_table(
        "companies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("industry", sa.String(length=255), nullable=True),
        sa.Column("website", sa.String(length=512), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("owner", sa.String(length=255), nullable=True, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_companies_name", "companies", ["name"], unique=False)
    op.create_index("ix_companies_industry", "companies", ["industry"], unique=False)
    op.create_index("ix_companies_created_at", "companies", ["created_at"], unique=False)

    # Create contacts table
    op.create_table(
        "contacts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("role", sa.String(length=100), nullable=True),
        sa.Column("company_id", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("owner", sa.String(length=255), nullable=True, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_contacts_name", "contacts", ["name"], unique=False)
    op.create_index("ix_contacts_email", "contacts", ["email"], unique=False)
    op.create_index("ix_contacts_company_id", "contacts", ["company_id"], unique=False)
    op.create_index("ix_contacts_created_at", "contacts", ["created_at"], unique=False)

    # Create leads table
    op.create_table(
        "leads",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=True),
        sa.Column("contact_id", sa.Integer(), nullable=True),
        sa.Column("value", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0.00"),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="Prospecting"),
        sa.Column("expected_close_date", sa.Date(), nullable=True),
        sa.Column("owner", sa.String(length=255), nullable=True, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_leads_title", "leads", ["title"], unique=False)
    op.create_index("ix_leads_status", "leads", ["status"], unique=False)
    op.create_index("ix_leads_company_id", "leads", ["company_id"], unique=False)
    op.create_index("ix_leads_contact_id", "leads", ["contact_id"], unique=False)
    op.create_index("ix_leads_created_at", "leads", ["created_at"], unique=False)

    # Create tasks table
    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("company_id", sa.Integer(), nullable=True),
        sa.Column("lead_id", sa.Integer(), nullable=True),
        sa.Column("contact_id", sa.Integer(), nullable=True),
        sa.Column("owner", sa.String(length=255), nullable=True, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"]),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tasks_description", "tasks", ["description"], unique=False)
    op.create_index("ix_tasks_due_date", "tasks", ["due_date"], unique=False)
    op.create_index("ix_tasks_completed", "tasks", ["completed"], unique=False)
    op.create_index("ix_tasks_company_id", "tasks", ["company_id"], unique=False)
    op.create_index("ix_tasks_contact_id", "tasks", ["contact_id"], unique=False)
    op.create_index("ix_tasks_lead_id", "tasks", ["lead_id"], unique=False)
    op.create_index("ix_tasks_created_at", "tasks", ["created_at"], unique=False)

    # Create interactions table
    op.create_table(
        "interactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False, server_default="note"),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("company_id", sa.Integer(), nullable=True),
        sa.Column("contact_id", sa.Integer(), nullable=True),
        sa.Column("lead_id", sa.Integer(), nullable=True),
        sa.Column("owner", sa.String(length=255), nullable=True, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
        sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"]),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_interactions_date", "interactions", ["date"], unique=False)
    op.create_index("ix_interactions_type", "interactions", ["type"], unique=False)
    op.create_index("ix_interactions_summary", "interactions", ["summary"], unique=False)
    op.create_index("ix_interactions_company_id", "interactions", ["company_id"], unique=False)
    op.create_index("ix_interactions_contact_id", "interactions", ["contact_id"], unique=False)
    op.create_index("ix_interactions_lead_id", "interactions", ["lead_id"], unique=False)
    op.create_index("ix_interactions_created_at", "interactions", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_interactions_created_at", table_name="interactions")
    op.drop_index("ix_interactions_lead_id", table_name="interactions")
    op.drop_index("ix_interactions_contact_id", table_name="interactions")
    op.drop_index("ix_interactions_company_id", table_name="interactions")
    op.drop_index("ix_interactions_summary", table_name="interactions")
    op.drop_index("ix_interactions_type", table_name="interactions")
    op.drop_index("ix_interactions_date", table_name="interactions")
    op.drop_table("interactions")

    op.drop_index("ix_tasks_created_at", table_name="tasks")
    op.drop_index("ix_tasks_lead_id", table_name="tasks")
    op.drop_index("ix_tasks_contact_id", table_name="tasks")
    op.drop_index("ix_tasks_company_id", table_name="tasks")
    op.drop_index("ix_tasks_completed", table_name="tasks")
    op.drop_index("ix_tasks_due_date", table_name="tasks")
    op.drop_index("ix_tasks_description", table_name="tasks")
    op.drop_table("tasks")

    op.drop_index("ix_leads_created_at", table_name="leads")
    op.drop_index("ix_leads_contact_id", table_name="leads")
    op.drop_index("ix_leads_company_id", table_name="leads")
    op.drop_index("ix_leads_status", table_name="leads")
    op.drop_index("ix_leads_title", table_name="leads")
    op.drop_table("leads")

    op.drop_index("ix_contacts_created_at", table_name="contacts")
    op.drop_index("ix_contacts_company_id", table_name="contacts")
    op.drop_index("ix_contacts_email", table_name="contacts")
    op.drop_index("ix_contacts_name", table_name="contacts")
    op.drop_table("contacts")

    op.drop_index("ix_companies_created_at", table_name="companies")
    op.drop_index("ix_companies_industry", table_name="companies")
    op.drop_index("ix_companies_name", table_name="companies")
    op.drop_table("companies")
