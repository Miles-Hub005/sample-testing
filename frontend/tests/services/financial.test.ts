import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildQueryString,
  financialApi,
  financialService,
  getARAgingMetrics,
  getInvoices,
  getPayments,
  getQuotes,
  sanitizeApprovalState,
  sanitizeInvoiceStatus,
  ARAgingMetrics,
  Invoice,
  Payment,
  Quote,
} from '../../src/services/financial';
import { apiFetch, ApiError } from '../../src/services/apiClient';

vi.mock('../../src/services/apiClient', async () => {
  const actual = await vi.importActual('../../src/services/apiClient');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

describe('Financial Transparency API Client Wrapper Service [FR-1, FR-2, FR-3, FR-4]', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Sanitization & Query Helper Functions', () => {
    it('buildQueryString formats query parameters correctly', () => {
      expect(buildQueryString()).toBe('');
      expect(buildQueryString({})).toBe('');

      const queryStr = buildQueryString({
        status: 'Past_Due',
        customer_id: 'cust-123',
        empty: '',
        nil: null,
        undef: undefined,
      });

      expect(queryStr).toContain('status=Past_Due');
      expect(queryStr).toContain('customer_id=cust-123');
      expect(queryStr).not.toContain('empty');
      expect(queryStr).not.toContain('nil');
    });

    it('sanitizeApprovalState sanitizes approval states correctly [FR-1]', () => {
      expect(sanitizeApprovalState('  approved  ')).toBe('Approved');
      expect(sanitizeApprovalState('draft')).toBe('Draft');
      expect(sanitizeApprovalState('PENDING_APPROVAL')).toBe('Pending_Approval');
      expect(sanitizeApprovalState('expired')).toBe('Expired');
      expect(sanitizeApprovalState('CustomState')).toBe('CustomState');
      expect(sanitizeApprovalState('')).toBeUndefined();
      expect(sanitizeApprovalState(null)).toBeUndefined();
      expect(sanitizeApprovalState(undefined)).toBeUndefined();
    });

    it('sanitizeInvoiceStatus sanitizes invoice statuses correctly [FR-2]', () => {
      expect(sanitizeInvoiceStatus('  current  ')).toBe('Current');
      expect(sanitizeInvoiceStatus('pending')).toBe('Pending');
      expect(sanitizeInvoiceStatus('PAST_DUE')).toBe('Past_Due');
      expect(sanitizeInvoiceStatus('paid')).toBe('Paid');
      expect(sanitizeInvoiceStatus('CustomStatus')).toBe('CustomStatus');
      expect(sanitizeInvoiceStatus('')).toBeUndefined();
      expect(sanitizeInvoiceStatus(null)).toBeUndefined();
      expect(sanitizeInvoiceStatus(undefined)).toBeUndefined();
    });
  });

  describe('Quotes API Client Wrapper [FR-1]', () => {
    it('getQuotes fetches quotes without parameters', async () => {
      const mockQuotes: Quote[] = [
        {
          quote_id: 'q-100',
          customer_id: 'c-100',
          approval_state: 'Approved',
          expiration_date_time: '2026-11-01T00:00:00Z',
          total_amount: 15000.0,
          created_at: '2026-10-01T10:00:00Z',
        },
      ];

      (apiFetch as any).mockResolvedValueOnce(mockQuotes);

      const res = await getQuotes();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/financial/quotes', { method: 'GET' });
      expect(res).toEqual(mockQuotes);
    });

    it('getQuotes fetches quotes with approval_state and customer_id filters', async () => {
      const mockQuotes: Quote[] = [
        {
          quote_id: 'q-101',
          customer_id: 'c-200',
          approval_state: 'Pending_Approval',
          expiration_date_time: '2026-12-01T00:00:00Z',
          total_amount: 25000.0,
          created_at: '2026-10-05T12:00:00Z',
        },
      ];

      (apiFetch as any).mockResolvedValueOnce(mockQuotes);

      const res = await getQuotes({ approval_state: 'pending_approval', customer_id: '  c-200  ' });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/financial/quotes?approval_state=Pending_Approval&customer_id=c-200',
        { method: 'GET' }
      );
      expect(res).toEqual(mockQuotes);
    });
  });

  describe('Invoices API Client Wrapper [FR-2]', () => {
    it('getInvoices fetches invoices without parameters', async () => {
      const mockInvoices: Invoice[] = [
        {
          invoice_id: 'inv-100',
          quote_id: 'q-100',
          customer_id: 'c-100',
          status: 'Current',
          issue_date_time: '2026-10-01T00:00:00Z',
          due_date_time: '2026-10-31T00:00:00Z',
          total_amount: 5000.0,
          outstanding_amount: 5000.0,
        },
      ];

      (apiFetch as any).mockResolvedValueOnce(mockInvoices);

      const res = await getInvoices();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/financial/invoices', { method: 'GET' });
      expect(res).toEqual(mockInvoices);
    });

    it('getInvoices fetches invoices with status and customer_id filters', async () => {
      const mockInvoices: Invoice[] = [
        {
          invoice_id: 'inv-101',
          quote_id: null,
          customer_id: 'c-300',
          status: 'Past_Due',
          issue_date_time: '2026-08-01T00:00:00Z',
          due_date_time: '2026-09-01T00:00:00Z',
          total_amount: 8000.0,
          outstanding_amount: 8000.0,
        },
      ];

      (apiFetch as any).mockResolvedValueOnce(mockInvoices);

      const res = await getInvoices({ status: 'past_due', customer_id: 'c-300' });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/financial/invoices?status=Past_Due&customer_id=c-300',
        { method: 'GET' }
      );
      expect(res).toEqual(mockInvoices);
    });
  });

  describe('Payments API Client Wrapper [FR-3]', () => {
    it('getPayments fetches payments without parameters', async () => {
      const mockPayments: Payment[] = [
        {
          payment_id: 'pay-100',
          invoice_id: 'inv-100',
          payment_date_time: '2026-10-02T14:30:00Z',
          amount_paid: 2500.0,
          payment_method: 'Credit Card',
        },
      ];

      (apiFetch as any).mockResolvedValueOnce(mockPayments);

      const res = await getPayments();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/financial/payments', { method: 'GET' });
      expect(res).toEqual(mockPayments);
    });

    it('getPayments fetches payments with invoice_id and customer_id filters', async () => {
      const mockPayments: Payment[] = [
        {
          payment_id: 'pay-101',
          invoice_id: 'inv-200',
          payment_date_time: '2026-10-04T09:00:00Z',
          amount_paid: 1200.0,
          payment_method: 'ACH Transfer',
        },
      ];

      (apiFetch as any).mockResolvedValueOnce(mockPayments);

      const res = await getPayments({ invoice_id: 'inv-200', customer_id: 'c-500' });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/financial/payments?invoice_id=inv-200&customer_id=c-500',
        { method: 'GET' }
      );
      expect(res).toEqual(mockPayments);
    });
  });

  describe('AR Aging Metrics API Client Wrapper [FR-4]', () => {
    it('getARAgingMetrics fetches metrics without parameters', async () => {
      const mockMetrics: ARAgingMetrics = {
        bucket_0_30: { total_outstanding: 10000.0, invoice_count: 2 },
        bucket_31_60: { total_outstanding: 5000.0, invoice_count: 1 },
        bucket_61_90: { total_outstanding: 0.0, invoice_count: 0 },
        bucket_90_plus: { total_outstanding: 2500.0, invoice_count: 1 },
      };

      (apiFetch as any).mockResolvedValueOnce(mockMetrics);

      const res = await getARAgingMetrics();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/financial/ar-aging', { method: 'GET' });
      expect(res).toEqual(mockMetrics);
    });

    it('getARAgingMetrics fetches metrics with customer_id and as_of_date_val', async () => {
      const mockMetrics: ARAgingMetrics = {
        bucket_0_30: { total_outstanding: 0.0, invoice_count: 0 },
        bucket_31_60: { total_outstanding: 0.0, invoice_count: 0 },
        bucket_61_90: { total_outstanding: 0.0, invoice_count: 0 },
        bucket_90_plus: { total_outstanding: 0.0, invoice_count: 0 },
      };

      (apiFetch as any).mockResolvedValueOnce(mockMetrics);

      const res = await getARAgingMetrics({
        customer_id: 'c-999',
        as_of_date_val: '2026-10-06T00:00:00Z',
      });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/financial/ar-aging?customer_id=c-999&as_of_date_val=2026-10-06T00%3A00%3A00Z',
        { method: 'GET' }
      );
      expect(res).toEqual(mockMetrics);
    });
  });

  describe('Error Handling and Service Objects', () => {
    it('propagates ApiError on network or API failure', async () => {
      const apiErr = new ApiError(403, 'Forbidden', { detail: 'Role required: financial:read' });
      (apiFetch as any).mockRejectedValueOnce(apiErr);

      await expect(getQuotes()).rejects.toThrow('Role required: financial:read');
    });

    it('exports financialService and financialApi object aliases', () => {
      expect(financialService.getQuotes).toBe(getQuotes);
      expect(financialService.getInvoices).toBe(getInvoices);
      expect(financialService.getPayments).toBe(getPayments);
      expect(financialService.getARAgingMetrics).toBe(getARAgingMetrics);
      expect(financialApi).toBe(financialService);
    });
  });
});
