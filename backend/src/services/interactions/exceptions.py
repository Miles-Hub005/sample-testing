"""Interaction domain exceptions."""

from services.crm.exceptions import (
    CRMError,
    EntityNotFoundError,
    InteractionNotFoundError,
    InvalidForeignKeyError,
)


class InteractionValidationError(CRMError, ValueError):
    """Raised when interaction input fails validation rules (e.g., missing summary or date, invalid type enum)."""

    pass


__all__ = [
    "CRMError",
    "EntityNotFoundError",
    "InteractionNotFoundError",
    "InteractionValidationError",
    "InvalidForeignKeyError",
]
