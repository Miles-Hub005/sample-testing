"""CRM domain exceptions."""


class CRMError(Exception):
    """Base exception for CRM domain errors."""

    pass


class EntityNotFoundError(CRMError):
    """Raised when a requested entity is not found."""

    pass


class CompanyNotFoundError(EntityNotFoundError):
    """Raised when a company is not found."""

    pass


class ContactNotFoundError(EntityNotFoundError):
    """Raised when a contact is not found."""

    pass


class LeadNotFoundError(EntityNotFoundError):
    """Raised when a lead is not found."""

    pass


class TaskNotFoundError(EntityNotFoundError):
    """Raised when a task is not found."""

    pass


class InteractionNotFoundError(EntityNotFoundError):
    """Raised when an interaction is not found."""

    pass


class InvalidForeignKeyError(CRMError):
    """Raised when a foreign key references a non-existent entity."""

    pass


class DeleteBlockedError(CRMError):
    """Raised when deletion of an entity is blocked by existing dependencies."""

    pass


class CompanyDeleteBlockedError(DeleteBlockedError):
    """Raised when deleting a company is blocked because leads exist."""

    pass
