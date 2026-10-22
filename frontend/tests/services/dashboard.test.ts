import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dashboardApi,
  getDashboardSummary,
  getDomainDetail,
  sanitizeDomainId,
  sanitizeTimeframe,
} from '../../src/services/dashboard';
import { apiFetch } from '../../src/services/apiClient';

vi.mock('../../src/services/apiClient', async () => {
  const actual = await vi.importActual('../../src/services/apiClient');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

describe('Dashboard Service Wrapper', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('sanitizeTimeframe', () => {
    it('returns default 30d for missing or null input', () => {
      expect(sanitizeTimeframe()).toBe('30d');
      expect(sanitizeTimeframe(null)).toBe('30d');
      expect(sanitizeTimeframe('')).toBe('30d');
    });

    it('returns valid timeframe when allowed', () => {
      expect(sanitizeTimeframe('7d')).toBe('7d');
      expect(sanitizeTimeframe('30d')).toBe('30d');
      expect(sanitizeTimeframe('90d')).toBe('90d');
      expect(sanitizeTimeframe(' 7D ')).toBe('7d');
    });

    it('returns 30d fallback for invalid timeframe string', () => {
      expect(sanitizeTimeframe('14d')).toBe('30d');
      expect(sanitizeTimeframe('invalid')).toBe('30d');
    });
  });

  describe('sanitizeDomainId', () => {
    it('returns valid domain for allowed domain identifiers', () => {
      expect(sanitizeDomainId('lead_gen')).toBe('lead_gen');
      expect(sanitizeDomainId('sales_pipeline')).toBe('sales_pipeline');
      expect(sanitizeDomainId('support')).toBe('support');
      expect(sanitizeDomainId('financials')).toBe('financials');
      expect(sanitizeDomainId(' LEAD_GEN ')).toBe('lead_gen');
    });

    it('throws an error for missing or invalid domain input', () => {
      expect(() => sanitizeDomainId('')).toThrow(/domain id is required/i);
      expect(() => sanitizeDomainId(null)).toThrow(/domain id is required/i);
      expect(() => sanitizeDomainId('unknown_domain')).toThrow(/unsupported domain_id/i);
    });
  });

  describe('getDashboardSummary', () => {
    it('fetches dashboard summary with sanitized timeframe parameter and sanitizes response', async () => {
      const mockApiResponse = {
        status: 'COMPLETE',
        generated_at: '2026-10-06T08:00:00Z',
        metrics: [
          {
            domain: 'financials',
            metric_key: 'recurring_revenue',
            display_name: 'Recurring Revenue',
            raw_value: 12500,
            baseline_value: 10000,
            formatted_value: '$12,500',
            percentage_change: 25,
            status: 'VALID',
            unit: 'currency',
            error_detail: null,
          },
          {
            domain: 'support',
            metric_key: 'open_tickets',
            display_name: 'Open Support Tickets',
            raw_value: 0,
            baseline_value: 5,
            formatted_value: '0',
            percentage_change: -100,
            status: 'ZERO',
            unit: 'count',
            error_detail: null,
          },
        ],
      };

      (apiFetch as any).mockResolvedValueOnce(mockApiResponse);

      const result = await getDashboardSummary('7d');

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/dashboard/summary?timeframe=7d');

      expect(result.status).toBe('COMPLETE');
      expect(result.generated_at).toBe('2026-10-06T08:00:00Z');
      expect(result.metrics).toHaveLength(2);
      expect(result.metrics[0].formatted_value).toBe('$12,500');
      expect(result.metrics[1].status).toBe('ZERO');
    });

    it('applies safe defaults when API response contains malformed or unexpected data', async () => {
      const malformedResponse = {
        status: 'INVALID_STATUS',
        generated_at: 12345, // invalid type
        metrics: [
          {
            domain: 123, // invalid type
            metric_key: null,
            display_name: undefined,
            status: 'UNKNOWN_STATUS',
            unit: 'invalid_unit',
          },
        ],
      };

      (apiFetch as any).mockResolvedValueOnce(malformedResponse);

      const result = await getDashboardSummary('invalid_tf');

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/dashboard/summary?timeframe=30d');
      expect(result.status).toBe('FAILED');
      expect(typeof result.generated_at).toBe('string');
      expect(result.metrics[0].domain).toBe('unknown');
      expect(result.metrics[0].status).toBe('UNAVAILABLE');
      expect(result.metrics[0].unit).toBe('count');
    });
  });

  describe('getDomainDetail', () => {
    it('fetches domain detail with sanitized parameters and validates detailed response', async () => {
      const mockDomainResponse = {
        domain: 'support',
        status: 'COMPLETE',
        detailed_metrics: [
          {
            domain: 'support',
            metric_key: 'open_tickets',
            display_name: 'Open Tickets',
            raw_value: 12,
            baseline_value: 15,
            formatted_value: '12',
            percentage_change: -20,
            status: 'VALID',
            unit: 'count',
          },
        ],
        breakdown_items: [
          { label: 'Ticket Severity: P1', value: 2 },
          { label: 'Ticket Severity: P2', value: 10 },
        ],
        error_detail: null,
      };

      (apiFetch as any).mockResolvedValueOnce(mockDomainResponse);

      const result = await getDomainDetail('support', '90d');

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/dashboard/domains/support?timeframe=90d');

      expect(result.domain).toBe('support');
      expect(result.status).toBe('COMPLETE');
      expect(result.detailed_metrics).toHaveLength(1);
      expect(result.breakdown_items).toHaveLength(2);
      expect(result.breakdown_items[0].label).toBe('Ticket Severity: P1');
    });

    it('handles domain fetch for dashboardApi object', async () => {
      const mockDomainResponse = {
        domain: 'lead_gen',
        status: 'UNAVAILABLE',
        detailed_metrics: [],
        breakdown_items: [],
        error_detail: 'Connector timeout',
      };

      (apiFetch as any).mockResolvedValueOnce(mockDomainResponse);

      const result = await dashboardApi.getDomainDetail('lead_gen');

      expect(result.status).toBe('UNAVAILABLE');
      expect(result.error_detail).toBe('Connector timeout');
    });
  });
});
