export interface FormatDateOptions extends Intl.DateTimeFormatOptions {
  locale?: string;
}

/**
 * Formats a UTC datetime string (or Date object) into a localized timezone display string.
 *
 * @param utcDate - UTC ISO 8601 date string, Date object, or null/undefined
 * @param options - Optional Intl.DateTimeFormatOptions (plus optional locale)
 * @returns Formatted local date/time string, or empty string for invalid/null inputs
 */
export function formatDate(
  utcDate: string | Date | null | undefined,
  options?: FormatDateOptions
): string {
  if (!utcDate) {
    return '';
  }

  let dateObj: Date;

  if (utcDate instanceof Date) {
    dateObj = utcDate;
  } else if (typeof utcDate === 'string') {
    const trimmed = utcDate.trim();
    if (!trimmed) {
      return '';
    }

    // If ISO datetime string has time component but no timezone offset/Z suffix, append 'Z' to treat as UTC
    let isoString = trimmed;
    if (
      trimmed.includes('T') &&
      !trimmed.endsWith('Z') &&
      !trimmed.endsWith('z') &&
      !/[+-]\d{2}:?\d{2}$/.test(trimmed)
    ) {
      isoString = `${trimmed}Z`;
    }

    dateObj = new Date(isoString);
  } else {
    return '';
  }

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const { locale = 'en-US', ...dateTimeOptions } = options || {};

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };

  const finalOptions =
    Object.keys(dateTimeOptions).length > 0 ? dateTimeOptions : defaultOptions;

  try {
    return new Intl.DateTimeFormat(locale, finalOptions).format(dateObj);
  } catch {
    return '';
  }
}

/**
 * Formats integer minor units (e.g., cents) into a currency string (e.g., "$1,234.56")
 * without using floating-point arithmetic.
 *
 * @param amountInCents - Amount in integer minor units (e.g., 123456 for $1,234.56)
 * @param currencySymbol - Currency symbol prefix (defaults to '$')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amountInCents: number,
  currencySymbol: string = '$'
): string {
  if (typeof amountInCents !== 'number' || !Number.isFinite(amountInCents)) {
    return `${currencySymbol}0.00`;
  }

  const isNegative = amountInCents < 0;
  const absCents = Math.abs(Math.trunc(amountInCents));

  const dollars = Math.floor(absCents / 100);
  const cents = absCents % 100;

  const formattedDollars = dollars.toLocaleString('en-US');
  const formattedCents = cents.toString().padStart(2, '0');

  return `${isNegative ? '-' : ''}${currencySymbol}${formattedDollars}.${formattedCents}`;
}
