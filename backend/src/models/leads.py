"""Lead database model and query helpers."""

import enum
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple, Union

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, asc, desc, func, or_
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship

from models.base import Base, TimestampMixin
from models.companies import Company
from models.contacts import Contact


class LeadStatus(str, enum.Enum):
    """Enum representing valid lead status stages."""

    PROSPECTING = "Prospecting"
    QUALIFIED = "Qualified"
    NEGOTIATION = "Negotiation"
    CLOSED_WON = "Closed Won"
    CLOSED_LOST = "Closed Lost"


class Lead(Base, TimestampMixin):
    """Lead model representing a sales opportunity or lead in the CRM."""

    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    company_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("companies.id"), nullable=True, index=True
    )
    contact_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("contacts.id"), nullable=True, index=True
    )
    value: Mapped[float] = mapped_column(
        Numeric(15, 2, asdecimal=False), nullable=False, default=0.0
    )
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default=LeadStatus.PROSPECTING.value, index=True
    )
    expected_close_date: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True
    )
    owner: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, default=""
    )

    company: Mapped[Optional[Company]] = relationship("Company")
    contact: Mapped[Optional[Contact]] = relationship("Contact")

    @property
    def name(self) -> str:
        """Property alias for title to maintain backwards compatibility."""
        return self.title

    @name.setter
    def name(self, val: str) -> None:
        """Property setter alias for title."""
        self.title = val


def create_lead(
    db: Session,
    title: Optional[str] = None,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    value: float = 0.0,
    status: Union[str, LeadStatus] = LeadStatus.PROSPECTING,
    expected_close_date: Optional[Union[date, datetime]] = None,
    owner: Optional[str] = None,
    name: Optional[str] = None,
) -> Lead:
    """Create a new lead in the database."""
    lead_title = title if title is not None else (name or "")
    status_str = status.value if isinstance(status, LeadStatus) else status

    close_date: Optional[date] = None
    if isinstance(expected_close_date, datetime):
        close_date = expected_close_date.date()
    elif isinstance(expected_close_date, date):
        close_date = expected_close_date

    lead = Lead(
        title=lead_title,
        company_id=company_id,
        contact_id=contact_id,
        value=value if value is not None else 0.0,
        status=status_str or LeadStatus.PROSPECTING.value,
        expected_close_date=close_date,
        owner=owner or "",
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def get_lead_by_id(db: Session, lead_id: int) -> Optional[Lead]:
    """Retrieve a lead by its ID."""
    return db.query(Lead).filter(Lead.id == lead_id).first()


def get_lead(db: Session, lead_id: int) -> Optional[Lead]:
    """Retrieve a lead by its ID (alias for get_lead_by_id)."""
    return get_lead_by_id(db, lead_id)


def update_lead(
    db: Session,
    lead_id: int,
    updates: Dict[str, Any],
) -> Optional[Lead]:
    """Update an existing lead by ID."""
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        return None

    updates_copy = dict(updates)
    if "name" in updates_copy and "title" not in updates_copy:
        updates_copy["title"] = updates_copy.pop("name")

    for key, value in updates_copy.items():
        if key == "status" and isinstance(value, LeadStatus):
            value = value.value
        elif key == "expected_close_date" and isinstance(value, datetime):
            value = value.date()

        if hasattr(lead, key):
            setattr(lead, key, value)

    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def delete_lead(db: Session, lead_id: int) -> bool:
    """Delete a lead by ID."""
    lead = get_lead_by_id(db, lead_id)
    if not lead:
        return False

    db.delete(lead)
    db.commit()
    return True


def list_leads(
    db: Session,
    skip: int = 0,
    limit: Optional[int] = None,
    status: Optional[Union[str, LeadStatus]] = None,
) -> List[Lead]:
    """List leads sorted by title ascending, optionally filtered by status."""
    query = db.query(Lead)
    if status:
        status_str = status.value if isinstance(status, LeadStatus) else status
        query = query.filter(Lead.status == status_str)

    query = query.order_by(Lead.title.asc())
    if skip > 0:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def get_leads_by_status(
    db: Session,
    status: Union[str, LeadStatus],
) -> List[Lead]:
    """Retrieve all leads matching a given status."""
    status_str = status.value if isinstance(status, LeadStatus) else status
    return (
        db.query(Lead)
        .filter(Lead.status == status_str)
        .order_by(Lead.title.asc())
        .all()
    )


def get_leads_by_company(
    db: Session,
    company_id: int,
) -> List[Lead]:
    """Retrieve all leads associated with a specific company ID."""
    return (
        db.query(Lead)
        .filter(Lead.company_id == company_id)
        .order_by(Lead.title.asc())
        .all()
    )


def get_leads_by_contact(
    db: Session,
    contact_id: int,
) -> List[Lead]:
    """Retrieve all leads associated with a specific contact ID."""
    return (
        db.query(Lead)
        .filter(Lead.contact_id == contact_id)
        .order_by(Lead.title.asc())
        .all()
    )


def search_and_paginate_leads(
    db: Session,
    search: Optional[str] = None,
    status: Optional[Union[str, LeadStatus]] = None,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    sort_by: str = "title",
    order: str = "asc",
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Lead], int]:
    """Search, filter, sort, and paginate leads.

    Args:
        db: SQLAlchemy database session.
        search: Optional search term matching lead title (case-insensitive).
        status: Optional filter by lead status.
        company_id: Optional filter for leads associated with a company.
        contact_id: Optional filter for leads associated with a contact.
        sort_by: Column to sort by ("title", "value", "status", "expected_close_date", "created_at", "updated_at").
        order: Sort direction ("asc" or "desc").
        page: 1-based page index.
        page_size: Number of items per page.

    Returns:
        Tuple of (matching lead records, total count of matching records).
    """
    query = db.query(Lead)

    if company_id is not None:
        query = query.filter(Lead.company_id == company_id)

    if contact_id is not None:
        query = query.filter(Lead.contact_id == contact_id)

    if status:
        status_str = status.value if isinstance(status, LeadStatus) else status
        query = query.filter(Lead.status == status_str)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Lead.title.ilike(term),
            )
        )

    total = query.count()

    # Dynamic sort mapping
    if sort_by == "name":
        sort_attr = Lead.title
    else:
        sort_attr = getattr(Lead, sort_by, Lead.title)

    if order.lower() == "desc":
        query = query.order_by(desc(sort_attr))
    else:
        query = query.order_by(asc(sort_attr))

    # Pagination
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20

    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return items, total


def get_pipeline_by_status(db: Session) -> List[Dict[str, Any]]:
    """Aggregate total pipeline value and lead count grouped by lead status stage (FR-6).

    Returns a list of dicts with 'status', 'count', and 'total_value' for each lead status stage.
    Ensures all standard LeadStatus stages are present even if count is zero.
    """
    results = (
        db.query(
            Lead.status,
            func.count(Lead.id).label("count"),
            func.coalesce(func.sum(Lead.value), 0.0).label("total_value"),
        )
        .group_by(Lead.status)
        .all()
    )

    status_map = {row.status: (int(row.count), float(row.total_value)) for row in results}

    pipeline: List[Dict[str, Any]] = []
    standard_statuses = [s.value for s in LeadStatus]
    for status in standard_statuses:
        count, total_val = status_map.pop(status, (0, 0.0))
        pipeline.append(
            {
                "status": status,
                "count": count,
                "total_value": total_val,
            }
        )

    for status, (count, total_val) in status_map.items():
        pipeline.append(
            {
                "status": status,
                "count": count,
                "total_value": total_val,
            }
        )

    return pipeline
