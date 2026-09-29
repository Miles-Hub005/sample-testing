"""Pydantic schemas for CRM entities (Company, Contact, Lead, Task, Interaction)."""

from datetime import datetime
import re
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def _validate_email(v: Optional[str]) -> Optional[str]:
    """Validate email format if a value is provided."""
    if v is None:
        return v
    v_str = v.strip()
    if not v_str or not EMAIL_REGEX.match(v_str):
        raise ValueError("Invalid email format")
    return v_str


# --- Company Schemas ---


class CompanyBase(BaseModel):
    """Base schema for Company attributes."""

    name: str = Field(..., min_length=1, description="Name of the company")
    email: Optional[str] = Field(
        None, description="Primary contact email for the company"
    )
    owner: str = Field(..., min_length=1, description="Owner of the company record")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)


class CompanyCreate(CompanyBase):
    """Schema for creating a new Company."""

    pass


class CompanyUpdate(BaseModel):
    """Schema for updating an existing Company."""

    name: Optional[str] = Field(None, min_length=1)
    email: Optional[str] = None
    owner: Optional[str] = Field(None, min_length=1)

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)


class CompanyResponse(CompanyBase):
    """Schema for Company API response."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Contact Schemas ---


class ContactBase(BaseModel):
    """Base schema for Contact attributes."""

    name: str = Field(..., min_length=1, description="Name of the contact")
    email: str = Field(..., description="Email address of the contact")
    owner: str = Field(..., min_length=1, description="Owner of the contact record")
    company_id: Optional[int] = Field(
        None, description="Optional associated Company ID"
    )

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        res = _validate_email(v)
        if res is None:
            raise ValueError("Invalid email format")
        return res


class ContactCreate(ContactBase):
    """Schema for creating a new Contact."""

    pass


class ContactUpdate(BaseModel):
    """Schema for updating an existing Contact."""

    name: Optional[str] = Field(None, min_length=1)
    email: Optional[str] = None
    owner: Optional[str] = Field(None, min_length=1)
    company_id: Optional[int] = None

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)


class ContactResponse(ContactBase):
    """Schema for Contact API response."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Lead Schemas ---


class LeadBase(BaseModel):
    """Base schema for Lead attributes."""

    name: str = Field(..., min_length=1, description="Name of the lead")
    status: str = Field(..., min_length=1, description="Status of the lead")
    owner: str = Field(..., min_length=1, description="Owner of the lead record")
    company_id: Optional[int] = Field(
        None, description="Optional associated Company ID"
    )


class LeadCreate(LeadBase):
    """Schema for creating a new Lead."""

    pass


class LeadUpdate(BaseModel):
    """Schema for updating an existing Lead."""

    name: Optional[str] = Field(None, min_length=1)
    status: Optional[str] = Field(None, min_length=1)
    owner: Optional[str] = Field(None, min_length=1)
    company_id: Optional[int] = None


class LeadResponse(LeadBase):
    """Schema for Lead API response."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Task Schemas ---


class TaskBase(BaseModel):
    """Base schema for Task attributes."""

    title: str = Field(..., min_length=1, description="Title of the task")
    owner: str = Field(..., min_length=1, description="Owner of the task")
    due_date: Optional[datetime] = Field(
        None, description="Optional due date in UTC"
    )
    lead_id: Optional[int] = Field(None, description="Optional associated Lead ID")
    contact_id: Optional[int] = Field(
        None, description="Optional associated Contact ID"
    )
    company_id: Optional[int] = Field(
        None, description="Optional associated Company ID"
    )


class TaskCreate(TaskBase):
    """Schema for creating a new Task."""

    pass


class TaskUpdate(BaseModel):
    """Schema for updating an existing Task."""

    title: Optional[str] = Field(None, min_length=1)
    owner: Optional[str] = Field(None, min_length=1)
    due_date: Optional[datetime] = None
    lead_id: Optional[int] = None
    contact_id: Optional[int] = None
    company_id: Optional[int] = None


class TaskResponse(TaskBase):
    """Schema for Task API response."""

    id: int
    overdue: bool = Field(
        default=False, description="Flag indicating if the task is overdue"
    )
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Interaction Schemas ---


class InteractionBase(BaseModel):
    """Base schema for Interaction attributes."""

    notes: str = Field(..., min_length=1, description="Notes describing interaction")
    timestamp: datetime = Field(..., description="Timestamp of interaction in UTC")
    company_id: Optional[int] = Field(
        None, description="Optional associated Company ID"
    )
    contact_id: Optional[int] = Field(
        None, description="Optional associated Contact ID"
    )
    lead_id: Optional[int] = Field(None, description="Optional associated Lead ID")

    @model_validator(mode="after")
    def validate_entity_association(self) -> "InteractionBase":
        """Enforce that interaction links to at least one entity."""
        if (
            self.company_id is None
            and self.contact_id is None
            and self.lead_id is None
        ):
            raise ValueError(
                "Interaction must be associated with at least one entity (company_id, contact_id, or lead_id)"
            )
        return self


class InteractionCreate(InteractionBase):
    """Schema for creating a new Interaction."""

    pass


class InteractionResponse(InteractionBase):
    """Schema for Interaction API response."""

    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Error Schemas ---


class FieldError(BaseModel):
    """Schema for field-level validation error details."""

    field: str = Field(..., description="Name of the field with error")
    message: str = Field(..., description="Validation error message for the field")


class ErrorResponse(BaseModel):
    """Structured error response schema."""

    error_code: str = Field(..., description="Error code identifier")
    message: str = Field(..., description="Human-readable error description")
    fields: Optional[List[FieldError]] = Field(
        None, description="Optional list of field-level validation errors"
    )
