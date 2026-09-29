"""Database session and engine management, plus connectivity checks."""

from typing import Generator, Optional
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from lib.config import settings

_default_engine: Optional[Engine] = None


def get_engine(db_url: Optional[str] = None) -> Engine:
    """Get or create a SQLAlchemy engine.

    Args:
        db_url: Optional database URL. Uses settings.DATABASE_URL if not provided.

    Returns:
        SQLAlchemy Engine instance.
    """
    global _default_engine
    if db_url is not None:
        connect_args = (
            {"check_same_thread": False} if db_url.startswith("sqlite") else {}
        )
        return create_engine(db_url, connect_args=connect_args)
    if _default_engine is None:
        url = settings.DATABASE_URL
        connect_args = (
            {"check_same_thread": False} if url.startswith("sqlite") else {}
        )
        _default_engine = create_engine(url, connect_args=connect_args)
    return _default_engine


def get_sessionmaker(engine: Optional[Engine] = None) -> sessionmaker[Session]:
    """Get a sessionmaker bound to the given or default engine.

    Args:
        engine: Optional SQLAlchemy engine.

    Returns:
        sessionmaker configured for Session instances.
    """
    eng = engine if engine is not None else get_engine()
    return sessionmaker(autocommit=False, autoflush=False, bind=eng)


def get_db() -> Generator[Session, None, None]:
    """Dependency for yielding a database session."""
    session_factory = get_sessionmaker()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


def check_db_connectivity(engine: Optional[Engine] = None) -> bool:
    """Verify database connectivity by executing a simple query.

    Args:
        engine: Optional custom engine to test against.

    Returns:
        True if the database is reachable and responds, False otherwise.
    """
    try:
        eng = engine if engine is not None else get_engine()
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
