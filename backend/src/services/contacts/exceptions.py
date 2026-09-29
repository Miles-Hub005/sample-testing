"""Contact domain exceptions."""

from services.crm.exceptions import (
    CRMError,
    ContactNotFoundError,
    EntityNotFoundError,
    InvalidForeignKeyError,
)


class ContactValidationError(CRMError, ValueError):
    """Raised when contact input fails validation rules (e.g., missing name or invalid email format)."""

    pass
