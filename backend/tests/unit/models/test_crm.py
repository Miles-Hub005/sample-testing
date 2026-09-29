"""Unit tests for CRM database models."""

from datetime import datetime, timezone
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import Session

from models.base import Base
from models.crm import Company, Contact, Interaction, Lead, Task


def test_company_model_creation_and_attributes() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        company = Company(
            name="Acme Corp",
            email="info@acme.com",
            owner="Alice",
        )
        session.add(company)
        session.commit()

        assert company.id is not None
        assert company.name == "Acme Corp"
        assert company.email == "info@acme.com"
        assert company.owner == "Alice"
        assert company.created_at is not None
        assert company.updated_at is not None


def test_company_optional_email() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        company = Company(
            name="Globex",
            owner="Bob",
        )
        session.add(company)
        session.commit()

        assert company.id is not None
        assert company.name == "Globex"
        assert company.email is None
        assert company.owner == "Bob"


def test_company_name_index() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    inspector = inspect(engine)
    indexes = inspector.get_indexes("companies")
    indexed_columns = [col for idx in indexes for col in idx["column_names"]]

    assert "name" in indexed_columns


def test_contact_model_creation_and_attributes() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        company = Company(
            name="Initech",
            email="contact@initech.com",
            owner="Peter",
        )
        session.add(company)
        session.commit()

        contact = Contact(
            name="John Doe",
            email="john@initech.com",
            company_id=company.id,
            owner="Peter",
        )
        session.add(contact)
        session.commit()

        assert contact.id is not None
        assert contact.name == "John Doe"
        assert contact.email == "john@initech.com"
        assert contact.company_id == company.id
        assert contact.owner == "Peter"
        assert contact.created_at is not None
        assert contact.updated_at is not None
        assert contact.company is not None
        assert contact.company.name == "Initech"


def test_contact_optional_company_id() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        contact = Contact(
            name="Jane Smith",
            email="jane@example.com",
            company_id=None,
            owner="Alice",
        )
        session.add(contact)
        session.commit()

        assert contact.id is not None
        assert contact.name == "Jane Smith"
        assert contact.email == "jane@example.com"
        assert contact.company_id is None
        assert contact.owner == "Alice"
        assert contact.company is None


def test_contact_company_id_index() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    inspector = inspect(engine)
    indexes = inspector.get_indexes("contacts")
    indexed_columns = [col for idx in indexes for col in idx["column_names"]]

    assert "company_id" in indexed_columns


def test_lead_model_creation_and_attributes() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        company = Company(
            name="Stark Industries",
            email="info@stark.com",
            owner="Tony",
        )
        session.add(company)
        session.commit()

        lead = Lead(
            name="Arc Reactor Pitch",
            status="NEW",
            company_id=company.id,
            owner="Pepper",
        )
        session.add(lead)
        session.commit()

        assert lead.id is not None
        assert lead.name == "Arc Reactor Pitch"
        assert lead.status == "NEW"
        assert lead.company_id == company.id
        assert lead.owner == "Pepper"
        assert lead.created_at is not None
        assert lead.updated_at is not None
        assert lead.company is not None
        assert lead.company.name == "Stark Industries"


def test_lead_optional_company_id() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        lead = Lead(
            name="Unattached Lead",
            status="QUALIFIED",
            company_id=None,
            owner="Tony",
        )
        session.add(lead)
        session.commit()

        assert lead.id is not None
        assert lead.name == "Unattached Lead"
        assert lead.status == "QUALIFIED"
        assert lead.company_id is None
        assert lead.owner == "Tony"
        assert lead.company is None


def test_lead_company_id_index() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    inspector = inspect(engine)
    indexes = inspector.get_indexes("leads")
    indexed_columns = [col for idx in indexes for col in idx["column_names"]]

    assert "company_id" in indexed_columns


def test_task_model_creation_and_attributes() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        company = Company(name="Wayne Enterprises", owner="Bruce")
        session.add(company)
        session.commit()

        contact = Contact(name="Lucius Fox", email="lfox@wayne.com", company_id=company.id, owner="Bruce")
        session.add(contact)
        session.commit()

        lead = Lead(name="Defense Tech Deal", status="NEW", company_id=company.id, owner="Bruce")
        session.add(lead)
        session.commit()

        due = datetime(2026, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
        task = Task(
            title="Follow up on contract",
            due_date=due,
            lead_id=lead.id,
            contact_id=contact.id,
            company_id=company.id,
            owner="Bruce",
        )
        session.add(task)
        session.commit()

        assert task.id is not None
        assert task.title == "Follow up on contract"
        assert task.due_date == due
        assert task.lead_id == lead.id
        assert task.contact_id == contact.id
        assert task.company_id == company.id
        assert task.owner == "Bruce"
        assert task.created_at is not None
        assert task.updated_at is not None
        assert task.lead.name == "Defense Tech Deal"
        assert task.contact.name == "Lucius Fox"
        assert task.company.name == "Wayne Enterprises"


def test_task_optional_due_date_and_fks() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        task = Task(
            title="Standalone Task",
            due_date=None,
            lead_id=None,
            contact_id=None,
            company_id=None,
            owner="Bruce",
        )
        session.add(task)
        session.commit()

        assert task.id is not None
        assert task.title == "Standalone Task"
        assert task.due_date is None
        assert task.lead_id is None
        assert task.contact_id is None
        assert task.company_id is None
        assert task.owner == "Bruce"
        assert task.lead is None
        assert task.contact is None
        assert task.company is None


def test_task_indexes() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    inspector = inspect(engine)
    indexes = inspector.get_indexes("tasks")
    indexed_columns = [col for idx in indexes for col in idx["column_names"]]

    assert "due_date" in indexed_columns
    assert "lead_id" in indexed_columns
    assert "contact_id" in indexed_columns
    assert "company_id" in indexed_columns


def test_interaction_model_creation_and_attributes() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        company = Company(name="Wayne Enterprises", owner="Bruce")
        session.add(company)
        session.commit()

        contact = Contact(name="Lucius Fox", email="lfox@wayne.com", company_id=company.id, owner="Bruce")
        session.add(contact)
        session.commit()

        lead = Lead(name="Defense Tech Deal", status="NEW", company_id=company.id, owner="Bruce")
        session.add(lead)
        session.commit()

        ts = datetime(2026, 9, 25, 12, 0, 0, tzinfo=timezone.utc)
        interaction = Interaction(
            notes="Discussed contract terms.",
            timestamp=ts,
            company_id=company.id,
            contact_id=contact.id,
            lead_id=lead.id,
        )
        session.add(interaction)
        session.commit()

        assert interaction.id is not None
        assert interaction.notes == "Discussed contract terms."
        assert interaction.timestamp == ts
        assert interaction.company_id == company.id
        assert interaction.contact_id == contact.id
        assert interaction.lead_id == lead.id
        assert interaction.created_at is not None
        assert not hasattr(interaction, "updated_at")
        assert interaction.company.name == "Wayne Enterprises"
        assert interaction.contact.name == "Lucius Fox"
        assert interaction.lead.name == "Defense Tech Deal"


def test_interaction_optional_fks() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        ts = datetime(2026, 9, 25, 12, 0, 0, tzinfo=timezone.utc)
        interaction = Interaction(
            notes="General note without linked entities.",
            timestamp=ts,
            company_id=None,
            contact_id=None,
            lead_id=None,
        )
        session.add(interaction)
        session.commit()

        assert interaction.id is not None
        assert interaction.notes == "General note without linked entities."
        assert interaction.timestamp == ts
        assert interaction.company_id is None
        assert interaction.contact_id is None
        assert interaction.lead_id is None
        assert interaction.company is None
        assert interaction.contact is None
        assert interaction.lead is None


def test_interaction_indexes() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    inspector = inspect(engine)
    indexes = inspector.get_indexes("interactions")
    indexed_columns = [col for idx in indexes for col in idx["column_names"]]

    assert "timestamp" in indexed_columns
    assert "company_id" in indexed_columns
    assert "contact_id" in indexed_columns
    assert "lead_id" in indexed_columns
