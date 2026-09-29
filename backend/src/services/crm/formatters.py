"""Formatting helpers for CRM business logic."""

from datetime import datetime, timezone
from typing import Optional, Union
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def format_currency(amount: int, currency_symbol: str = "$") -> str:
    """Format an integer number of minor currency units (e.g. cents) as a formatted currency string.

    Converts integer minor units to a formatted string (e.g., 123456 -> "$1,234.56")
    without using floating-point arithmetic to prevent precision and rounding errors.

    Args:
        amount: Integer amount in minor units (e.g. cents).
        currency_symbol: Currency symbol prefix (defaults to "$").

    Returns:
        Formatted currency string (e.g. "$1,234.56" or "-$1,234.56").

    Raises:
        TypeError: If amount is not an integer.
    """
    if not isinstance(amount, int) or isinstance(amount, bool):
        raise TypeError(
            f"Amount must be an integer representing minor units, got {type(amount).__name__}"
        )

    is_negative = amount < 0
    abs_amount = abs(amount)

    dollars, cents = divmod(abs_amount, 100)

    formatted = f"{currency_symbol}{dollars:,}.{cents:02d}"
    if is_negative:
        return f"-{formatted}"
    return formatted


# CamelCase alias for compatibility
formatCurrency = format_currency


def ensure_utc(dt: datetime) -> datetime:
    """Ensure a datetime is timezone-aware and set to UTC.

    If naive, attaches timezone.utc. If aware, converts to timezone.utc.

    Args:
        dt: Datetime object.

    Returns:
        UTC datetime object.

    Raises:
        TypeError: If dt is not a datetime object.
    """
    if not isinstance(dt, datetime):
        raise TypeError(f"Expected datetime object, got {type(dt).__name__}")
    if dt.tzinfo is None or dt.tzinfo.utcoffset(dt) is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def to_utc(dt_val: Union[datetime, str]) -> datetime:
    """Convert a datetime or ISO format string to a UTC datetime object.

    Args:
        dt_val: Datetime object or ISO formatted date string.

    Returns:
        UTC datetime object.

    Raises:
        TypeError: If input is neither datetime nor str.
        ValueError: If string cannot be parsed as ISO format datetime.
    """
    if isinstance(dt_val, str):
        val_str = dt_val.strip()
        if val_str.endswith("Z") or val_str.endswith("z"):
            val_str = val_str[:-1] + "+00:00"
        parsed = datetime.fromisoformat(val_str)
        return ensure_utc(parsed)
    elif isinstance(dt_val, datetime):
        return ensure_utc(dt_val)
    else:
        raise TypeError(
            f"Expected datetime or ISO string, got {type(dt_val).__name__}"
        )


def convert_utc_to_timezone(
    dt_val: Union[datetime, str],
    tz: Union[str, timezone, ZoneInfo] = "UTC",
) -> datetime:
    """Convert a UTC datetime (or string) to a specified local timezone.

    Args:
        dt_val: UTC datetime or ISO date string.
        tz: Target timezone name (e.g. "America/New_York"), ZoneInfo, or timezone instance.

    Returns:
        Datetime converted to the target timezone.

    Raises:
        ValueError: If specified timezone is invalid.
    """
    utc_dt = to_utc(dt_val)

    if isinstance(tz, str):
        tz_name = tz.strip()
        if tz_name.upper() == "UTC":
            target_tz: Union[timezone, ZoneInfo] = timezone.utc
        else:
            try:
                target_tz = ZoneInfo(tz_name)
            except (ZoneInfoNotFoundError, ValueError) as exc:
                raise ValueError(f"Invalid timezone name: '{tz}'") from exc
    elif isinstance(tz, (timezone, ZoneInfo)):
        target_tz = tz
    else:
        raise TypeError(
            f"Expected timezone as str, timezone, or ZoneInfo, got {type(tz).__name__}"
        )

    return utc_dt.astimezone(target_tz)


def format_datetime(
    dt_val: Optional[Union[datetime, str]],
    tz: Union[str, timezone, ZoneInfo] = "UTC",
    fmt: Optional[str] = None,
) -> Optional[str]:
    """Format a UTC datetime or string after converting to a local timezone.

    Args:
        dt_val: Datetime object, ISO date string, or None.
        tz: Target timezone (defaults to "UTC").
        fmt: Optional strftime format string. If None, returns ISO 8601 string.

    Returns:
        Formatted datetime string in target timezone, or None if input is None.
    """
    if dt_val is None:
        return None

    local_dt = convert_utc_to_timezone(dt_val, tz)
    if fmt is None:
        return local_dt.isoformat()
    return local_dt.strftime(fmt)


def format_date(
    dt_val: Optional[Union[datetime, str]],
    tz: Union[str, timezone, ZoneInfo] = "UTC",
    fmt: str = "%Y-%m-%d",
) -> Optional[str]:
    """Format the date portion of a UTC datetime after converting to a local timezone.

    Args:
        dt_val: Datetime object, ISO date string, or None.
        tz: Target timezone (defaults to "UTC").
        fmt: strftime format string (defaults to "%Y-%m-%d").

    Returns:
        Formatted date string in target timezone, or None if input is None.
    """
    if dt_val is None:
        return None

    return format_datetime(dt_val, tz=tz, fmt=fmt)


# Aliases for compatibility
formatDate = format_date
formatDateTime = format_datetime
