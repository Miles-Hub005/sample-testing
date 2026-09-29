"""Contact service module providing CRUD operations and business logic."""

from typing import Any, Dict, List, Optional, Union
from sqlalchemy.orm import Session

from models.crm import Company, Contact
from services.crm.exceptions import ContactNotFoundError, InvalidForeignKeyError
from services.crm.schemas import ContactCreate, ContactUpdate


def create_contact(
    db: Session, contact_in: Union[ContactCreate, Dict[str, Any]]
) -> Contact:
    """Create a new contact in the database.

    Args:
        db: SQLAlchemy database session.
        contact_in: Contact creation data (ContactCreate schema or dict).

    Returns:
        The created Contact model instance.

    Raises:
        InvalidForeignKeyError: If the provided company_id does not exist.
        pydantic.ValidationError: If creation data is invalid (e.g. invalid email).
    """
    if isinstance(contact_in, dict):
        contact_in = ContactCreate(**contact_in)

    if contact_in.company_id is not None:
        company_exists = (
            db.query(Company.id).filter(Company.id == contact_in.company_id).first()
            is not None
        )
        if not company_exists:
            raise InvalidForeignKeyError(
                f"Company ID {contact_in.company_id} does not exist"
            )

    contact = Contact(
        name=contact_in.name,
        email=contact_in.email,
        owner=contact_in.owner,
        company_id=contact_in.company_id,
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def get_contact(db: Session, contact_id: int) -> Optional[Contact]:
    """Retrieve a contact by its ID.

    Args:
        db: SQLAlchemy database session.
        contact_id: The ID of the contact to retrieve.

    Returns:
        The Contact model instance if found, or None.
    """
    return db.query(Contact).filter(Contact.id == contact_id).first()


def list_contacts(
    db: Session, skip: int = 0, limit: Optional[int] = None
) -> List[Contact]:
    """List contacts sorted by name A-Z.

    Args:
        db: SQLAlchemy database session.
        skip: Number of records to skip for pagination.
        limit: Maximum number of records to return.

    Returns:
        List of Contact model instances sorted by name ascending.
    """
    query = db.query(Contact).order_by(Contact.name.asc())
    if skip > 0:
        query = query.offset(skip)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


def update_contact(
    db: Session,
    contact_id: int,
    contact_in: Union[ContactUpdate, Dict[str, Any]],
) -> Contact:
    """Update an existing contact.

    Args:
        db: SQLAlchemy database session.
        contact_id: The ID of the contact to update.
        contact_in: Contact update data (ContactUpdate schema or dict).

    Returns:
        The updated Contact model instance.

    Raises:
        ContactNotFoundError: If contact with contact_id does not exist.
        InvalidForeignKeyError: If updated company_id does not exist.
        pydantic.ValidationError: If update data is invalid.
    """
    contact = get_contact(db, contact_id)
    if not contact:
        raise ContactNotFoundError(f"Contact with ID {contact_id} not found.")

    if isinstance(contact_in, dict):
        contact_in = ContactUpdate(**contact_in)

    update_data = contact_in.model_dump(exclude_unset=True)

    if "company_id" in update_data and update_data["company_id"] is not None:
        company_id = update_data["company_id"]
        company_exists = (
            db.query(Company.id).filter(Company.id == company_id).first() is not None
        )
        if not company_exists:
            raise InvalidForeignKeyError(
                f"Company ID {company_id} does not exist"
            )

    for field, value in update_data.items():
        setattr(contact, field, value)

    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def delete_contact(db: Session, contact_id: int) -> bool:
    """Delete a contact by its ID.

    Args:
        db: SQLAlchemy database session.
        contact_id: The ID of the contact to delete.

    Returns:
        True if deleted successfully.

    Raises:
        ContactNotFoundError: If contact with contact_id does not exist.
    """
    contact = get_contact(db, contact_id)
    if not contact:
        raise ContactNotFoundError(f"Contact with ID {contact_id} not found.")

    db.delete(contact)
    db.commit()
    return True
