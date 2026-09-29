/**
 * Formats an integer amount in minor currency units (e.g. cents) as a formatted currency string.
 *
 * Converts minor units to a formatted string (e.g., 123456 -> "$1,234.56") without
 * floating-point arithmetic to prevent precision and rounding errors.
 *
 * @param amount - Integer amount in minor units (e.g., cents).
 * @param currencySymbol - Currency symbol prefix (defaults to "$").
 * @returns Formatted currency string (e.g. "$1,234.56" or "-$1,234.56").
 * @throws {TypeError} If amount is not an integer.
 */
export function formatCurrency(
  amount: number,
  currencySymbol: string = '$'
): string {
  if (typeof amount !== 'number' || !Number.isInteger(amount)) {
    throw new TypeError(
      `Amount must be an integer representing minor units, got ${typeof amount === 'number' ? amount : typeof amount}`
    );
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const dollars = Math.floor(absAmount / 100);
  const cents = absAmount % 100;

  const dollarsFormatted = dollars.toLocaleString('en-US');
  const centsFormatted = cents.toString().padStart(2, '0');

  const formatted = `${currencySymbol}${dollarsFormatted}.${centsFormatted}`;
  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Options for formatDate utility.
 */
export interface FormatDateOptions extends Intl.DateTimeFormatOptions {
  /**
   * Fallback string to return if input date is null, undefined, empty, or invalid.
   * @default ''
   */
  fallback?: string;

  /**
   * Locale identifier to format the date for (e.g. 'en-US', 'de-DE').
   * If omitted, uses system/browser default locale.
   */
  locale?: string;

  /**
   * Whether to include time in the default formatted output.
   * Ignored if explicit formatting options (e.g. year, month, dateStyle) are provided.
   * @default false
   */
  includeTime?: boolean;
}

/**
 * Formats a UTC datetime (ISO string, Date object, or timestamp) into a local timezone string.
 *
 * Converts UTC inputs into human-readable strings according to the target timezone
 * (defaults to local runtime timezone if not specified in options).
 *
 * @param value - UTC datetime ISO string, Date instance, timestamp number, null, or undefined.
 * @param options - Formatting options including fallback, locale, includeTime, and Intl.DateTimeFormatOptions.
 * @returns Formatted date string or fallback string if input is nullish/invalid.
 */
export function formatDate(
  value: string | Date | number | null | undefined,
  options?: FormatDateOptions
): string {
  if (value === null || value === undefined || value === '') {
    return options?.fallback ?? '';
  }

  let date: Date;

  if (value instanceof Date) {
    date = new Date(value.getTime());
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else if (typeof value === 'string') {
    let dateStr = value.trim();
    if (dateStr === '') {
      return options?.fallback ?? '';
    }

    const hasTimezone = /[Zz]|[+-]\d{2}:?\d{2}$/.test(dateStr);
    if (!hasTimezone && /^\d{4}-\d{2}-\d{2}(T|\s)/.test(dateStr)) {
      dateStr = dateStr.replace(' ', 'T') + 'Z';
    }

    date = new Date(dateStr);
  } else {
    return options?.fallback ?? '';
  }

  if (isNaN(date.getTime())) {
    return options?.fallback ?? '';
  }

  const { fallback, locale, includeTime, ...dateTimeFormatOptions } =
    options ?? {};

  const hasFormatOption = Boolean(
    dateTimeFormatOptions.dateStyle ||
      dateTimeFormatOptions.timeStyle ||
      dateTimeFormatOptions.year ||
      dateTimeFormatOptions.month ||
      dateTimeFormatOptions.day ||
      dateTimeFormatOptions.weekday ||
      dateTimeFormatOptions.hour ||
      dateTimeFormatOptions.minute ||
      dateTimeFormatOptions.second ||
      dateTimeFormatOptions.timeZoneName ||
      dateTimeFormatOptions.era ||
      dateTimeFormatOptions.dayPeriod
  );

  let finalOptions: Intl.DateTimeFormatOptions;

  if (!hasFormatOption) {
    if (includeTime) {
      finalOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        ...dateTimeFormatOptions,
      };
    } else {
      finalOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...dateTimeFormatOptions,
      };
    }
  } else {
    finalOptions = dateTimeFormatOptions;
  }

  return new Intl.DateTimeFormat(locale, finalOptions).format(date);
}
