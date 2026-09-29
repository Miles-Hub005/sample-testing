"""Lead domain exceptions."""

from services.crm.exceptions import (
    CRMError,
    EntityNotFoundError,
    InvalidForeignKeyError,
    LeadNotFoundError,
)


class LeadValidationError(CRMError, ValueError):
    """Raised when lead input fails validation rules (e.g., missing title, negative value, invalid status)."""

    pass
