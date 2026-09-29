"""Contact database model and query helpers."""

from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import ForeignKey, Integer, String, Text, asc, desc, or_
from sqlalchemy.orm import Mapped, Session, mapped_column, relationship

from models.base import Base, TimestampMixin
from models.companies import Company


class Contact(Base, TimestampMixin):
    """Contact model representing an individual contact in the CRM."""

    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    company_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("companies.id"), nullable=True, index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    owner: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default="")

    company: Mapped[Optional[Company]] = relationship("Company")


def create_contact(
    db: Session,
    name: str,
    email: str,
    phone: Optional[str] = None,
    role: Optional[str] = None,
    company_id: Optional[int] = None,
    notes: Optional[str] = None,
    owner: Optional[str] = None,
) -> Contact:
    """Create a new contact in the database."""
    contact = Contact(
        name=name,
        email=email,
        phone=phone,
        role=role,
        company_id=company_id,
        notes=notes,
        owner=owner or "",
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def get_contact_by_id(db: Session, contact_id: int) -> Optional[Contact]:
    """Retrieve a contact by its ID."""
    return db.query(Contact).filter(Contact.id == contact_id).first()


def get_contact(db: Session, contact_id: int) -> Optional[Contact]:
    """Retrieve a contact by its ID (alias for get_contact_by_id)."""
    return get_contact_by_id(db, contact_id)


def update_contact(
    db: Session,
    contact_id: int,
    updates: Dict[str, Any],
) -> Optional[Contact]:
    """Update an existing contact by ID."""
    contact = get_contact_by_id(db, contact_id)
    if not contact:
        return None

    for key, value in updates.items():
        if hasattr(contact, key):
            setattr(contact, key, value)

    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def delete_contact(db: Session, contact_id: int) -> bool:
    """Delete a contact by ID."""
    contact = get_contact_by_id(db, contact_id)
    if not contact:
        return False

    db.delete(contact)
    db.commit()
    return True


def list_contacts(
    db: Session,
    skip: int = 0,
    limit: Optional[int] = None,
) -> List[Contact]:
    """List contacts sorted by name ascending."""
    query = db.query(Contact).order_by(Contact.name.asc())
    if skip > 0:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def get_contacts_by_company(
    db: Session,
    company_id: int,
) -> List[Contact]:
    """Retrieve all contacts associated with a specific company ID."""
    return (
        db.query(Contact)
        .filter(Contact.company_id == company_id)
        .order_by(Contact.name.asc())
        .all()
    )


def search_and_paginate_contacts(
    db: Session,
    search: Optional[str] = None,
    company_id: Optional[int] = None,
    sort_by: str = "name",
    order: str = "asc",
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Contact], int]:
    """Search, filter, sort, and paginate contacts.

    Args:
        db: SQLAlchemy database session.
        search: Optional search term matching contact name or email (case-insensitive).
        company_id: Optional filter for contacts belonging to a specific company.
        sort_by: Column to sort by ("name", "email", "created_at", "updated_at", "role").
        order: Sort direction ("asc" or "desc").
        page: 1-based page index.
        page_size: Number of items per page.

    Returns:
        Tuple of (matching contact records, total count of matching records).
    """
    query = db.query(Contact)

    if company_id is not None:
        query = query.filter(Contact.company_id == company_id)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Contact.name.ilike(term),
                Contact.email.ilike(term),
            )
        )

    total = query.count()

    # Dynamic sort
    sort_attr = getattr(Contact, sort_by, Contact.name)
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
