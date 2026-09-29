"""CRM database models."""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base, CreatedAtMixin, TimestampMixin
from models.companies import Company
from models.contacts import Contact


class LeadCrm(Base, TimestampMixin):
    """Lead model representing a sales lead in the CRM."""

    __tablename__ = "leads_crm"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    company_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("companies.id"), nullable=True, index=True
    )
    owner: Mapped[str] = mapped_column(String(255), nullable=False)

    company: Mapped[Optional[Company]] = relationship("Company")


class TaskCrm(Base, TimestampMixin):
    """Task model representing a task in the CRM."""

    __tablename__ = "tasks_crm"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    due_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    lead_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("leads.id"), nullable=True, index=True
    )
    contact_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("contacts.id"), nullable=True, index=True
    )
    company_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("companies.id"), nullable=True, index=True
    )
    owner: Mapped[str] = mapped_column(String(255), nullable=False)

    lead: Mapped[Optional[LeadCrm]] = relationship("Lead")
    contact: Mapped[Optional[Contact]] = relationship("Contact")
    company: Mapped[Optional[Company]] = relationship("Company")

    @property
    def overdue(self) -> bool:
        """Check if task is overdue relative to current UTC time."""
        if self.due_date is None:
            return False
        now = datetime.now(timezone.utc)
        due = self.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        return due < now


class InteractionCrm(Base, CreatedAtMixin):
    """Interaction model representing a logged interaction in the CRM."""

    __tablename__ = "interactions_crm"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    notes: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    company_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("companies.id"), nullable=True, index=True
    )
    contact_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("contacts.id"), nullable=True, index=True
    )
    lead_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("leads.id"), nullable=True, index=True
    )

    company: Mapped[Optional[Company]] = relationship("Company")
    contact: Mapped[Optional[Contact]] = relationship("Contact")
    lead: Mapped[Optional[LeadCrm]] = relationship("Lead")
