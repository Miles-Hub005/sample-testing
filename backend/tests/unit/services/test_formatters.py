"""Unit tests for CRM formatting helpers."""

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

import pytest

from services.crm.formatters import (
    convert_utc_to_timezone,
    ensure_utc,
    format_currency,
    format_date,
    format_datetime,
    formatCurrency,
    formatDate,
    formatDateTime,
    to_utc,
)


def test_format_currency_standard_positive() -> None:
    """Test formatting standard positive integer minor unit amounts."""
    assert format_currency(123456) == "$1,234.56"
    assert format_currency(100) == "$1.00"
    assert format_currency(123456789) == "$1,234,567.89"


def test_format_currency_small_amounts() -> None:
    """Test formatting amounts less than one dollar and zero."""
    assert format_currency(0) == "$0.00"
    assert format_currency(5) == "$0.05"
    assert format_currency(50) == "$0.50"


def test_format_currency_negative_amounts() -> None:
    """Test formatting negative integer minor unit amounts."""
    assert format_currency(-123456) == "-$1,234.56"
    assert format_currency(-5) == "-$0.05"
    assert format_currency(-100) == "-$1.00"


def test_format_currency_custom_symbol() -> None:
    """Test formatting with non-default currency symbols."""
    assert format_currency(123456, currency_symbol="€") == "€1,234.56"
    assert format_currency(-123456, currency_symbol="£") == "-£1,234.56"
    assert format_currency(100, currency_symbol="¥") == "¥1.00"


def test_format_currency_invalid_type_raises_type_error() -> None:
    """Test that non-integer inputs raise TypeError to avoid floating point issues."""
    with pytest.raises(TypeError):
        format_currency(1234.56)  # type: ignore[arg-type]

    with pytest.raises(TypeError):
        format_currency("123456")  # type: ignore[arg-type]

    with pytest.raises(TypeError):
        format_currency(None)  # type: ignore[arg-type]

    with pytest.raises(TypeError):
        format_currency(True)  # type: ignore[arg-type]


def test_format_currency_alias() -> None:
    """Test that formatCurrency camelCase alias works identically."""
    assert formatCurrency(123456) == "$1,234.56"


def test_ensure_utc_naive_datetime() -> None:
    """Test attaching UTC timezone to naive datetime."""
    naive_dt = datetime(2025, 6, 15, 14, 30, 0)
    utc_dt = ensure_utc(naive_dt)
    assert utc_dt.tzinfo == timezone.utc
    assert utc_dt.year == 2025
    assert utc_dt.month == 6
    assert utc_dt.day == 15
    assert utc_dt.hour == 14
    assert utc_dt.minute == 30


def test_ensure_utc_aware_datetime() -> None:
    """Test converting timezone-aware datetime to UTC."""
    ny_tz = ZoneInfo("America/New_York")
    ny_dt = datetime(2025, 6, 15, 10, 30, 0, tzinfo=ny_tz)
    utc_dt = ensure_utc(ny_dt)
    assert utc_dt.tzinfo == timezone.utc
    assert utc_dt.hour == 14  # NYC (EDT -04:00) 10:30 -> UTC 14:30


def test_ensure_utc_invalid_type() -> None:
    """Test that non-datetime input raises TypeError."""
    with pytest.raises(TypeError):
        ensure_utc("2025-06-15T14:30:00Z")  # type: ignore[arg-type]


def test_to_utc_from_iso_string() -> None:
    """Test converting ISO string to UTC datetime."""
    dt1 = to_utc("2025-06-15T14:30:00Z")
    assert dt1.tzinfo == timezone.utc
    assert dt1.hour == 14

    dt2 = to_utc("2025-06-15T10:30:00-04:00")
    assert dt2.tzinfo == timezone.utc
    assert dt2.hour == 14


def test_to_utc_invalid_inputs() -> None:
    """Test invalid types and bad strings in to_utc."""
    with pytest.raises(TypeError):
        to_utc(12345)  # type: ignore[arg-type]

    with pytest.raises(ValueError):
        to_utc("not-a-datetime")


def test_convert_utc_to_timezone() -> None:
    """Test converting UTC datetime to local timezones."""
    utc_dt = datetime(2025, 6, 15, 14, 30, 0, tzinfo=timezone.utc)

    # Convert to America/New_York (EDT UTC-4)
    ny_dt = convert_utc_to_timezone(utc_dt, "America/New_York")
    assert ny_dt.hour == 10
    assert ny_dt.minute == 30

    # Convert to Asia/Tokyo (JST UTC+9)
    tokyo_dt = convert_utc_to_timezone(utc_dt, "Asia/Tokyo")
    assert tokyo_dt.hour == 23
    assert tokyo_dt.minute == 30


def test_convert_utc_to_invalid_timezone() -> None:
    """Test invalid timezone name raises ValueError."""
    utc_dt = datetime(2025, 6, 15, 14, 30, 0, tzinfo=timezone.utc)
    with pytest.raises(ValueError, match="Invalid timezone name"):
        convert_utc_to_timezone(utc_dt, "Invalid/Timezone_Name")


def test_format_datetime_utc_and_local() -> None:
    """Test format_datetime with ISO format and custom format strings."""
    utc_str = "2025-06-15T14:30:00Z"

    # Default UTC ISO string output
    formatted_utc = format_datetime(utc_str)
    assert formatted_utc == "2025-06-15T14:30:00+00:00"

    # Localized custom format string
    formatted_ny = format_datetime(
        utc_str, tz="America/New_York", fmt="%Y-%m-%d %H:%M:%S"
    )
    assert formatted_ny == "2025-06-15 10:30:00"


def test_format_date_utc_and_local() -> None:
    """Test format_date for local date string extraction."""
    # Midnight UTC on June 15: in NYC (UTC-4) it's June 14 20:00
    utc_dt = datetime(2025, 6, 15, 0, 30, 0, tzinfo=timezone.utc)

    date_utc = format_date(utc_dt, tz="UTC")
    assert date_utc == "2025-06-15"

    date_ny = format_date(utc_dt, tz="America/New_York")
    assert date_ny == "2025-06-14"


def test_format_datetime_none_returns_none() -> None:
    """Test that passing None to format_datetime and format_date returns None."""
    assert format_datetime(None) is None
    assert format_date(None) is None


def test_format_aliases() -> None:
    """Test formatDate and formatDateTime aliases."""
    utc_dt = datetime(2025, 6, 15, 14, 30, 0, tzinfo=timezone.utc)
    assert formatDate(utc_dt) == "2025-06-15"
    assert formatDateTime(utc_dt, fmt="%Y-%m-%d %H:%M") == "2025-06-15 14:30"
