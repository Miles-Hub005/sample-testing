import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate } from '../../src/lib/format';

describe('formatCurrency', () => {
  it('formats positive integer minor units to formatted currency string', () => {
    expect(formatCurrency(123456)).toBe('$1,234.56');
  });

  it('formats zero minor units correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats single digit cents with leading zero', () => {
    expect(formatCurrency(5)).toBe('$0.05');
  });

  it('formats tens of cents correctly', () => {
    expect(formatCurrency(50)).toBe('$0.50');
  });

  it('formats exact dollar amounts with .00 cents', () => {
    expect(formatCurrency(100)).toBe('$1.00');
    expect(formatCurrency(1000000)).toBe('$10,000.00');
  });

  it('formats large numbers with commas', () => {
    expect(formatCurrency(123456789)).toBe('$1,234,567.89');
  });

  it('formats negative amounts with leading negative sign', () => {
    expect(formatCurrency(-123456)).toBe('-$1,234.56');
    expect(formatCurrency(-5)).toBe('-$0.05');
  });

  it('accepts a custom currency symbol and handles negative amounts', () => {
    expect(formatCurrency(123456, '€')).toBe('€1,234.56');
    expect(formatCurrency(123456, '£')).toBe('£1,234.56');
    expect(formatCurrency(-500, '€')).toBe('-€5.00');
  });

  it('throws TypeError for non-integer or invalid input with descriptive error message', () => {
    expect(() => formatCurrency(12.34 as any)).toThrow(TypeError);
    expect(() => formatCurrency(12.34 as any)).toThrow(/Amount must be an integer/);
    expect(() => formatCurrency('123' as any)).toThrow(TypeError);
    expect(() => formatCurrency(NaN as any)).toThrow(TypeError);
    expect(() => formatCurrency(null as any)).toThrow(TypeError);
    expect(() => formatCurrency(undefined as any)).toThrow(TypeError);
  });
});

describe('formatDate', () => {
  it('formats UTC ISO datetime string into specified timezone date string', () => {
    const formatted = formatDate('2026-09-25T13:54:17.450816+00:00', {
      timeZone: 'UTC',
      locale: 'en-US',
    });
    expect(formatted).toBe('Sep 25, 2026');
  });

  it('converts UTC datetime string to local target timezone', () => {
    // 2026-09-25 02:00 UTC is Sep 24 22:00 in America/New_York (EDT, UTC-4)
    const nyDate = formatDate('2026-09-25T02:00:00Z', {
      timeZone: 'America/New_York',
      locale: 'en-US',
    });
    expect(nyDate).toBe('Sep 24, 2026');

    const londonDate = formatDate('2026-09-25T02:00:00Z', {
      timeZone: 'Europe/London',
      locale: 'en-US',
    });
    expect(londonDate).toBe('Sep 25, 2026');
  });

  it('includes time when includeTime option is set to true', () => {
    const formatted = formatDate('2026-09-25T13:54:17Z', {
      timeZone: 'UTC',
      locale: 'en-US',
      includeTime: true,
    });
    expect(formatted).toBe('Sep 25, 2026, 1:54 PM');
  });

  it('formats JS Date object and timestamp number', () => {
    const dateObj = new Date(Date.UTC(2026, 8, 25, 13, 54, 17));
    expect(formatDate(dateObj, { timeZone: 'UTC', locale: 'en-US' })).toBe(
      'Sep 25, 2026'
    );

    const timestamp = dateObj.getTime();
    expect(formatDate(timestamp, { timeZone: 'UTC', locale: 'en-US' })).toBe(
      'Sep 25, 2026'
    );
  });

  it('handles naive ISO datetime strings by assuming UTC', () => {
    const formatted = formatDate('2026-09-25T13:54:17', {
      timeZone: 'UTC',
      locale: 'en-US',
    });
    expect(formatted).toBe('Sep 25, 2026');
  });

  it('returns fallback string for null, undefined, empty, or whitespace values', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDate('   ')).toBe('');

    expect(formatDate(null, { fallback: 'No due date' })).toBe('No due date');
    expect(formatDate(undefined, { fallback: 'N/A' })).toBe('N/A');
    expect(formatDate('', { fallback: 'N/A' })).toBe('N/A');
    expect(formatDate('   ', { fallback: 'N/A' })).toBe('N/A');
  });

  it('returns fallback string for invalid date inputs', () => {
    expect(formatDate('invalid-date-string')).toBe('');
    expect(
      formatDate('invalid-date-string', { fallback: 'Invalid date' })
    ).toBe('Invalid date');
    expect(formatDate(new Date('invalid'), { fallback: 'Invalid date' })).toBe(
      'Invalid date'
    );
  });

  it('accepts custom Intl formatting options', () => {
    const formatted = formatDate('2026-09-25T13:54:17Z', {
      timeZone: 'UTC',
      locale: 'en-US',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    expect(formatted).toBe('09/25/2026');
  });
});
