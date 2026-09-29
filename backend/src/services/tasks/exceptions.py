"""Task domain exceptions."""

from services.crm.exceptions import (
    CRMError,
    EntityNotFoundError,
    InvalidForeignKeyError,
    TaskNotFoundError,
)


class TaskValidationError(CRMError, ValueError):
    """Raised when task input fails validation rules (e.g., missing description or due_date)."""

    pass


__all__ = [
    "CRMError",
    "EntityNotFoundError",
    "InvalidForeignKeyError",
    "TaskNotFoundError",
    "TaskValidationError",
]
