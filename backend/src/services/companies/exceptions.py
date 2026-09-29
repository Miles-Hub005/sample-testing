"""Company domain exceptions."""

from services.crm.exceptions import (
    CRMError,
    CompanyDeleteBlockedError,
    CompanyNotFoundError,
    DeleteBlockedError,
    EntityNotFoundError,
)


class CompanyValidationError(CRMError, ValueError):
    """Raised when company input fails validation rules (e.g., missing name)."""

    pass
