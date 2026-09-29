"""Unit tests for SQLAlchemy base model and UTC timestamp mixins."""

from datetime import datetime, timezone
from sqlalchemy import Integer, String, create_engine
from sqlalchemy.orm import Mapped, Session, mapped_column

from models.base import Base, CreatedAtMixin, TimestampMixin, UpdatedAtMixin, utc_now


class SampleModel(Base, TimestampMixin):
    """Test model for verifying TimestampMixin."""

    __tablename__ = "sample_models"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)


class AppendOnlyModel(Base, CreatedAtMixin):
    """Test model for verifying CreatedAtMixin without updated_at."""

    __tablename__ = "append_only_models"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    val: Mapped[str] = mapped_column(String(50), nullable=False)


def test_utc_now_returns_timezone_aware_utc() -> None:
    now = utc_now()
    assert isinstance(now, datetime)
    assert now.tzinfo == timezone.utc


def test_timestamp_mixin_defaults_and_updates() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        item = SampleModel(name="test item")
        session.add(item)
        session.commit()

        assert item.id is not None
        assert item.created_at is not None
        assert item.updated_at is not None
        assert item.created_at.tzinfo == timezone.utc
        assert item.updated_at.tzinfo == timezone.utc

        initial_updated = item.updated_at
        item.name = "updated item"
        session.commit()

        assert item.name == "updated item"
        assert item.updated_at >= initial_updated


def test_created_at_mixin_only() -> None:
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        item = AppendOnlyModel(val="immutable record")
        session.add(item)
        session.commit()

        assert item.id is not None
        assert item.created_at is not None
        assert item.created_at.tzinfo == timezone.utc
        assert not hasattr(item, "updated_at")
