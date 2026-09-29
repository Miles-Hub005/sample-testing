"""Structured JSON logging with correlation ID support."""

from contextvars import ContextVar
import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from .config import settings

# Context variable to store the current correlation ID
correlation_id_var: ContextVar[Optional[str]] = ContextVar(
    "correlation_id", default=None
)


def get_correlation_id() -> Optional[str]:
    """Retrieve the current correlation ID from context."""
    return correlation_id_var.get()


def set_correlation_id(cid: Optional[str]) -> None:
    """Set the correlation ID for the current context."""
    correlation_id_var.set(cid)


class JSONFormatter(logging.Formatter):
    """Custom formatter to format log records as JSON objects."""

    def format(self, record: logging.LogRecord) -> str:
        """Format a LogRecord into a JSON string."""
        log_data: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(
                record.created, tz=timezone.utc
            ).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": get_correlation_id(),
        }

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        if record.stack_info:
            log_data["stack_info"] = self.formatStack(record.stack_info)

        # Standard LogRecord attributes to exclude from extra payload
        standard_attrs = {
            "args",
            "asctime",
            "created",
            "filename",
            "funcName",
            "levelname",
            "levelno",
            "lineno",
            "message",
            "module",
            "msecs",
            "msg",
            "name",
            "pathname",
            "process",
            "processName",
            "relativeCreated",
            "stack_info",
            "exc_info",
            "exc_text",
            "thread",
            "threadName",
            "taskName",
        }

        for key, value in record.__dict__.items():
            if key not in standard_attrs and not key.startswith("_"):
                try:
                    json.dumps(value)
                    log_data[key] = value
                except (TypeError, OverflowError):
                    log_data[key] = str(value)

        return json.dumps(log_data)


def setup_logging(log_level: Optional[str] = None) -> None:
    """Configure system-wide logging with JSON formatting and specified level."""
    level_str = log_level or settings.LOG_LEVEL
    numeric_level = getattr(logging, level_str.upper(), logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Remove existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(stream_handler)


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Get a logger instance configured with structured JSON output."""
    return logging.getLogger(name)


# Automatically configure logging on module load
setup_logging()
