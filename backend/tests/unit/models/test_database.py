"""Unit tests for database session and engine management."""

from unittest.mock import patch
from sqlalchemy import create_engine

from models.database import (
    check_db_connectivity,
    get_db,
    get_engine,
    get_sessionmaker,
)


def test_get_engine_custom_url() -> None:
    engine = get_engine("sqlite:///:memory:")
    assert engine is not None
    assert str(engine.url) == "sqlite:///:memory:"


def test_get_sessionmaker() -> None:
    engine = create_engine("sqlite:///:memory:")
    sm = get_sessionmaker(engine)
    assert sm is not None
    session = sm()
    assert session is not None
    session.close()


def test_get_db_generator() -> None:
    db_gen = get_db()
    session = next(db_gen)
    assert session is not None
    try:
        next(db_gen)
    except StopIteration:
        pass


def test_check_db_connectivity_success() -> None:
    engine = create_engine("sqlite:///:memory:")
    assert check_db_connectivity(engine) is True


def test_check_db_connectivity_failure() -> None:
    with patch("models.database.get_engine") as mock_get_engine:
        mock_get_engine.side_effect = Exception("DB connection failed")
        assert check_db_connectivity() is False
