"""Company database model and query helpers."""

from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import Integer, String, Text, asc, desc, or_
from sqlalchemy.orm import Mapped, Session, mapped_column

from models.base import Base, TimestampMixin


class Company(Base, TimestampMixin):
    """Company model representing an organization in the CRM."""

    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    industry: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    website: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    owner: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default="")


def create_company(
    db: Session,
    name: str,
    industry: Optional[str] = None,
    website: Optional[str] = None,
    notes: Optional[str] = None,
    email: Optional[str] = None,
    owner: Optional[str] = None,
) -> Company:
    """Create a new company in the database."""
    company = Company(
        name=name,
        industry=industry,
        website=website,
        notes=notes,
        email=email,
        owner=owner or "",
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def get_company_by_id(db: Session, company_id: int) -> Optional[Company]:
    """Retrieve a company by its ID."""
    return db.query(Company).filter(Company.id == company_id).first()


def get_company(db: Session, company_id: int) -> Optional[Company]:
    """Retrieve a company by its ID."""
    return get_company_by_id(db, company_id)


def update_company(
    db: Session,
    company_id: int,
    updates: Dict[str, Any],
) -> Optional[Company]:
    """Update an existing company by ID."""
    company = get_company_by_id(db, company_id)
    if not company:
        return None

    for key, value in updates.items():
        if hasattr(company, key):
            setattr(company, key, value)

    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def delete_company(db: Session, company_id: int) -> bool:
    """Delete a company by ID."""
    company = get_company_by_id(db, company_id)
    if not company:
        return False

    db.delete(company)
    db.commit()
    return True


def list_companies(
    db: Session,
    skip: int = 0,
    limit: Optional[int] = None,
) -> List[Company]:
    """List companies sorted by name ascending."""
    query = db.query(Company).order_by(Company.name.asc())
    if skip > 0:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def search_and_paginate_companies(
    db: Session,
    search: Optional[str] = None,
    sort_by: str = "name",
    order: str = "asc",
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Company], int]:
    """Search, sort, and paginate companies.

    Args:
        db: SQLAlchemy database session.
        search: Optional search term matching company name or industry (case-insensitive).
        sort_by: Column to sort by ("name", "created_at", "updated_at", "industry").
        order: Sort direction ("asc" or "desc").
        page: 1-based page index.
        page_size: Number of items per page.

    Returns:
        Tuple of (matching company records, total count of matching records).
    """
    query = db.query(Company)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Company.name.ilike(term),
                Company.industry.ilike(term),
            )
        )

    total = query.count()

    # Dynamic sort
    sort_attr = getattr(Company, sort_by, Company.name)
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
