"""Base model and timestamp mixins for SQLAlchemy models."""

from datetime import datetime, timezone
from sqlalchemy import DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    """Return the current datetime in UTC with timezone information."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""

    pass


class CreatedAtMixin:
    """Mixin providing a created_at UTC timestamp column."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )


class UpdatedAtMixin:
    """Mixin providing an updated_at UTC timestamp column."""

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )


class TimestampMixin(CreatedAtMixin, UpdatedAtMixin):
    """Mixin providing created_at and updated_at UTC timestamp columns."""

    pass
