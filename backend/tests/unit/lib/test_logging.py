"""Unit tests for structured JSON logger."""

import json
import logging
import io
from typing import Any, Dict

try:
    from lib.logging import (
        JSONFormatter,
        get_correlation_id,
        get_logger,
        set_correlation_id,
        setup_logging,
    )
except ImportError:
    from src.lib.logging import (
        JSONFormatter,
        get_correlation_id,
        get_logger,
        set_correlation_id,
        setup_logging,
    )


def test_correlation_id_context() -> None:
    """Test getting and setting correlation ID in context."""
    set_correlation_id(None)
    assert get_correlation_id() is None

    set_correlation_id("test-corr-123")
    assert get_correlation_id() == "test-corr-123"

    set_correlation_id(None)
    assert get_correlation_id() is None


def test_json_formatter_basic() -> None:
    """Test basic log formatting with JSONFormatter."""
    formatter = JSONFormatter()
    set_correlation_id("req-456")

    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Hello %s",
        args=("world",),
        exc_info=None,
    )

    formatted = formatter.format(record)
    data: Dict[str, Any] = json.loads(formatted)

    assert data["logger"] == "test_logger"
    assert data["level"] == "INFO"
    assert data["message"] == "Hello world"
    assert data["correlation_id"] == "req-456"
    assert "timestamp" in data

    set_correlation_id(None)


def test_json_formatter_extra_and_exception() -> None:
    """Test formatting extra parameters and exceptions."""
    formatter = JSONFormatter()
    set_correlation_id(None)

    try:
        raise ValueError("Something went wrong")
    except ValueError as err:
        import sys
        exc_info = sys.exc_info()

    record = logging.LogRecord(
        name="test_logger",
        level=logging.ERROR,
        pathname="test.py",
        lineno=20,
        msg="An error occurred",
        args=(),
        exc_info=exc_info,
    )
    record.user_id = 42  # type: ignore[attr-defined]
    record.custom_obj = object()  # type: ignore[attr-defined]

    formatted = formatter.format(record)
    data: Dict[str, Any] = json.loads(formatted)

    assert data["level"] == "ERROR"
    assert data["message"] == "An error occurred"
    assert data["user_id"] == 42
    assert "object at" in str(data["custom_obj"])
    assert "exception" in data
    assert "ValueError: Something went wrong" in data["exception"]


def test_setup_logging_and_get_logger() -> None:
    """Test setup_logging and get_logger output."""
    setup_logging("DEBUG")
    logger = get_logger("test_module")
    
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JSONFormatter())
    
    # Attach custom stream handler to capture output
    root = logging.getLogger()
    root.addHandler(handler)

    set_correlation_id("trace-789")
    logger.info("Structured log message", extra={"action": "test"})

    output = stream.getvalue()
    root.removeHandler(handler)

    data = json.loads(output.strip())
    assert data["logger"] == "test_module"
    assert data["message"] == "Structured log message"
    assert data["action"] == "test"
    assert data["correlation_id"] == "trace-789"

    set_correlation_id(None)
