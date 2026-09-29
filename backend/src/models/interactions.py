"""Interaction database model and query helpers."""

import enum
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, asc, desc, or_
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship

from models.base import Base, TimestampMixin, utc_now
from models.companies import Company
from models.contacts import Contact
from models.leads import Lead


class InteractionType(str, enum.Enum):
    """Enum representing valid interaction types."""

    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    NOTE = "note"


class Interaction(Base, TimestampMixin):
    """Interaction model representing a logged interaction in the CRM."""

    __tablename__ = "interactions"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utc_now, index=True
    )
    type: Mapped[str] = mapped_column(
        String(50), nullable=False, default=InteractionType.NOTE.value, index=True
    )
    summary: Mapped[str] = mapped_column(
        Text, nullable=False, default="", index=True
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
    owner: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True, default=""
    )

    company: Mapped[Optional[Company]] = relationship("Company")
    contact: Mapped[Optional[Contact]] = relationship("Contact")
    lead: Mapped[Optional[Lead]] = relationship("Lead")

    @property
    def notes(self) -> str:
        """Property alias for summary."""
        return self.summary

    @notes.setter
    def notes(self, val: str) -> None:
        """Property setter alias for summary."""
        self.summary = val or ""

    @property
    def title(self) -> str:
        """Property alias for summary."""
        return self.summary

    @title.setter
    def title(self, val: str) -> None:
        """Property setter alias for summary."""
        self.summary = val or ""

    @property
    def name(self) -> str:
        """Property alias for summary."""
        return self.summary

    @name.setter
    def name(self, val: str) -> None:
        """Property setter alias for summary."""
        self.summary = val or ""


def _normalize_datetime(
    dt_val: Optional[Union[date, datetime, str]]
) -> datetime:
    """Coerce input date, datetime, or ISO string to UTC datetime. Defaults to current UTC time if None."""
    if dt_val is None:
        return utc_now()
    if isinstance(dt_val, datetime):
        if dt_val.tzinfo is None:
            return dt_val.replace(tzinfo=timezone.utc)
        return dt_val
    if isinstance(dt_val, date):
        return datetime(dt_val.year, dt_val.month, dt_val.day, tzinfo=timezone.utc)
    if isinstance(dt_val, str):
        cleaned = dt_val.strip()
        if not cleaned:
            return utc_now()
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    return utc_now()


def _normalize_interaction_type(
    type_val: Optional[Union[str, InteractionType]]
) -> str:
    """Coerce interaction type input to valid type string."""
    if type_val is None:
        return InteractionType.NOTE.value
    if isinstance(type_val, InteractionType):
        return type_val.value
    if isinstance(type_val, str):
        cleaned = type_val.strip().lower()
        valid = {t.value for t in InteractionType}
        if cleaned in valid:
            return cleaned
        return cleaned or InteractionType.NOTE.value
    return InteractionType.NOTE.value


def create_interaction(
    db: Session,
    date: Optional[Union[date, datetime, str]] = None,
    type: Union[str, InteractionType] = InteractionType.NOTE,
    summary: Optional[str] = None,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    lead_id: Optional[int] = None,
    owner: Optional[str] = None,
    notes: Optional[str] = None,
    title: Optional[str] = None,
) -> Interaction:
    """Create a new interaction in the database."""
    interaction_summary = summary if summary is not None else (notes or title or "")
    interaction_date = _normalize_datetime(date)
    interaction_type = _normalize_interaction_type(type)

    interaction = Interaction(
        date=interaction_date,
        type=interaction_type,
        summary=interaction_summary,
        company_id=company_id,
        contact_id=contact_id,
        lead_id=lead_id,
        owner=owner or "",
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


def get_interaction_by_id(db: Session, interaction_id: int) -> Optional[Interaction]:
    """Retrieve an interaction by its ID."""
    return db.query(Interaction).filter(Interaction.id == interaction_id).first()


def get_interaction(db: Session, interaction_id: int) -> Optional[Interaction]:
    """Retrieve an interaction by its ID (alias for get_interaction_by_id)."""
    return get_interaction_by_id(db, interaction_id)


def update_interaction(
    db: Session,
    interaction_id: int,
    updates: Dict[str, Any],
) -> Optional[Interaction]:
    """Update an existing interaction by ID."""
    interaction = get_interaction_by_id(db, interaction_id)
    if not interaction:
        return None

    for key, value in updates.items():
        if key == "date":
            setattr(interaction, "date", _normalize_datetime(value))
        elif key == "type":
            setattr(interaction, "type", _normalize_interaction_type(value))
        elif key in ("notes", "title", "name") and "summary" not in updates:
            setattr(interaction, "summary", value or "")
        elif hasattr(interaction, key):
            setattr(interaction, key, value)

    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


def delete_interaction(db: Session, interaction_id: int) -> bool:
    """Delete an interaction by ID."""
    interaction = get_interaction_by_id(db, interaction_id)
    if not interaction:
        return False

    db.delete(interaction)
    db.commit()
    return True


def list_interactions(
    db: Session,
    skip: int = 0,
    limit: Optional[int] = None,
    type_filter: Optional[Union[str, InteractionType]] = None,
) -> List[Interaction]:
    """List interactions, optionally filtered by interaction type."""
    query = db.query(Interaction)

    if type_filter is not None:
        tf = _normalize_interaction_type(type_filter)
        query = query.filter(Interaction.type == tf)

    query = query.order_by(desc(Interaction.date), desc(Interaction.id))

    if skip > 0:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)

    return query.all()


def get_recent_interactions(
    db: Session,
    limit: int = 10,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    lead_id: Optional[int] = None,
) -> List[Interaction]:
    """Retrieve recent interactions ordered by date descending (FR-6)."""
    query = db.query(Interaction)

    if company_id is not None:
        query = query.filter(Interaction.company_id == company_id)
    if contact_id is not None:
        query = query.filter(Interaction.contact_id == contact_id)
    if lead_id is not None:
        query = query.filter(Interaction.lead_id == lead_id)

    query = query.order_by(desc(Interaction.date), desc(Interaction.id)).limit(limit)
    return query.all()


def get_interactions_by_company(
    db: Session,
    company_id: int,
    skip: int = 0,
    limit: Optional[int] = None,
) -> List[Interaction]:
    """Retrieve interactions linked to a specific company."""
    query = (
        db.query(Interaction)
        .filter(Interaction.company_id == company_id)
        .order_by(desc(Interaction.date), desc(Interaction.id))
    )
    if skip > 0:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def get_interactions_by_contact(
    db: Session,
    contact_id: int,
    skip: int = 0,
    limit: Optional[int] = None,
) -> List[Interaction]:
    """Retrieve interactions linked to a specific contact."""
    query = (
        db.query(Interaction)
        .filter(Interaction.contact_id == contact_id)
        .order_by(desc(Interaction.date), desc(Interaction.id))
    )
    if skip > 0:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def get_interactions_by_lead(
    db: Session,
    lead_id: int,
    skip: int = 0,
    limit: Optional[int] = None,
) -> List[Interaction]:
    """Retrieve interactions linked to a specific lead."""
    query = (
        db.query(Interaction)
        .filter(Interaction.lead_id == lead_id)
        .order_by(desc(Interaction.date), desc(Interaction.id))
    )
    if skip > 0:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def get_interactions_by_type(
    db: Session,
    type_filter: Union[str, InteractionType],
    skip: int = 0,
    limit: Optional[int] = None,
) -> List[Interaction]:
    """Retrieve interactions matching a specific type."""
    tf = _normalize_interaction_type(type_filter)
    query = (
        db.query(Interaction)
        .filter(Interaction.type == tf)
        .order_by(desc(Interaction.date), desc(Interaction.id))
    )
    if skip > 0:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def search_and_paginate_interactions(
    db: Session,
    search: Optional[str] = None,
    type_filter: Optional[Union[str, InteractionType]] = None,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    lead_id: Optional[int] = None,
    sort_by: str = "date",
    order: str = "desc",
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Interaction], int]:
    """Search, filter, sort, and paginate interactions.

    Args:
        db: Database session.
        search: Term to match summary, owner, or type (case-insensitive).
        type_filter: Interaction type filter ("call", "email", "meeting", "note").
        company_id: Optional company ID filter.
        contact_id: Optional contact ID filter.
        lead_id: Optional lead ID filter.
        sort_by: Column to sort by ("date", "type", "summary", "created_at", "updated_at").
        order: Sort direction ("asc" or "desc").
        page: Page number (1-based).
        page_size: Items per page.

    Returns:
        Tuple of (list of matching interactions, total count).
    """
    query = db.query(Interaction)

    if company_id is not None:
        query = query.filter(Interaction.company_id == company_id)
    if contact_id is not None:
        query = query.filter(Interaction.contact_id == contact_id)
    if lead_id is not None:
        query = query.filter(Interaction.lead_id == lead_id)

    if type_filter is not None and str(type_filter).strip():
        tf = _normalize_interaction_type(type_filter)
        query = query.filter(Interaction.type == tf)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Interaction.summary.ilike(term),
                Interaction.owner.ilike(term),
                Interaction.type.ilike(term),
            )
        )

    total = query.count()

    # Dynamic sorting
    if sort_by in ("notes", "title", "name"):
        sort_attr = Interaction.summary
    elif hasattr(Interaction, sort_by):
        sort_attr = getattr(Interaction, sort_by)
    else:
        sort_attr = Interaction.date

    is_desc = order.lower() == "desc"

    if sort_by == "date":
        if is_desc:
            query = query.order_by(desc(sort_attr).nulls_last(), desc(Interaction.id))
        else:
            query = query.order_by(asc(sort_attr).nulls_last(), asc(Interaction.id))
    else:
        if is_desc:
            query = query.order_by(desc(sort_attr), desc(Interaction.id))
        else:
            query = query.order_by(asc(sort_attr), asc(Interaction.id))

    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 20

    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return items, total
