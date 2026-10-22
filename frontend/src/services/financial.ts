/**
 * Financial Transparency API Client Wrapper Service
 *
 * Connects Next.js frontend components to FastAPI backend endpoints (/api/v1/financial)
 * for quotes, invoices, payment history records, and Accounts Receivable (AR) aging metrics.
 *
 * Requirements satisfied: [FR-1, FR-2, FR-3, FR-4]
 */

import { apiFetch } from './apiClient';

// ============================================================================
// Types, Interfaces & Enums [FR-1, FR-2, FR-3, FR-4]
// ============================================================================

export type QuoteApprovalState =
  | 'Draft'
  | 'Pending_Approval'
  | 'Approved'
  | 'Expired'
  | string;

export type InvoiceStatus = 'Current' | 'Pending' | 'Past_Due' | 'Paid' | string;

export const ALLOWED_APPROVAL_STATES = [
  'Draft',
  'Pending_Approval',
  'Approved',
  'Expired',
] as const;

export const ALLOWED_INVOICE_STATUSES = [
  'Current',
  'Pending',
  'Past_Due',
  'Paid',
] as const;

/**
 * Quote representation with approval state and explicit expiration date [FR-1].
 */
export interface Quote {
  quote_id: string;
  customer_id: string;
  approval_state: QuoteApprovalState;
  expiration_date_time: string;
  total_amount: number;
  created_at: string;
}

/**
 * Invoice representation with status filter fields and outstanding amounts [FR-2].
 */
export interface Invoice {
  invoice_id: string;
  quote_id?: string | null;
  customer_id: string;
  status: InvoiceStatus;
  issue_date_time: string;
  due_date_time: string;
  total_amount: number;
  outstanding_amount: number;
}

/**
 * Payment history record linked to an invoice [FR-3].
 */
export interface Payment {
  payment_id: string;
  invoice_id: string;
  payment_date_time: string;
  amount_paid: number;
  payment_method: string;
}

/**
 * Accounts Receivable (AR) duration bucket totals [FR-4].
 */
export interface ARAgingBucket {
  total_outstanding: number;
  invoice_count: number;
}

/**
 * Visual AR aging metrics segmented into 0-30, 31-60, 61-90, and 90+ day buckets [FR-4].
 */
export interface ARAgingMetrics {
  bucket_0_30: ARAgingBucket;
  bucket_31_60: ARAgingBucket;
  bucket_61_90: ARAgingBucket;
  bucket_90_plus: ARAgingBucket;
}

/**
 * Query parameter options for listing quotes [FR-1].
 */
export interface GetQuotesParams {
  approval_state?: string | null;
  customer_id?: string | null;
}

/**
 * Query parameter options for listing invoices [FR-2].
 */
export interface GetInvoicesParams {
  status?: string | null;
  customer_id?: string | null;
}

/**
 * Query parameter options for listing payments [FR-3].
 */
export interface GetPaymentsParams {
  invoice_id?: string | null;
  customer_id?: string | null;
}

/**
 * Query parameter options for requesting AR aging metrics [FR-4].
 */
export interface GetARAgingParams {
  customer_id?: string | null;
  as_of_date_val?: string | null;
}

// ============================================================================
// Sanitization & Query Formatting Helpers
// ============================================================================

/**
 * Sanitize and normalize quote approval state filter string [FR-1].
 */
export function sanitizeApprovalState(state?: string | null): string | undefined {
  if (!state || typeof state !== 'string') {
    return undefined;
  }
  const trimmed = state.trim();
  if (!trimmed) {
    return undefined;
  }
  const matched = ALLOWED_APPROVAL_STATES.find(
    (s) => s.toLowerCase() === trimmed.toLowerCase()
  );
  return matched || trimmed;
}

/**
 * Sanitize and normalize invoice status filter string [FR-2].
 */
export function sanitizeInvoiceStatus(status?: string | null): string | undefined {
  if (!status || typeof status !== 'string') {
    return undefined;
  }
  const trimmed = status.trim();
  if (!trimmed) {
    return undefined;
  }
  const matched = ALLOWED_INVOICE_STATUSES.find(
    (s) => s.toLowerCase() === trimmed.toLowerCase()
  );
  return matched || trimmed;
}

/**
 * Construct formatted query string from parameter map.
 */
export function buildQueryString(
  params?: Record<string, string | number | boolean | null | undefined>
): string {
  if (!params) {
    return '';
  }

  const queryParts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }

  return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
}

// ============================================================================
// API Service Wrapper Methods [FR-1, FR-2, FR-3, FR-4]
// ============================================================================

/**
 * Retrieve authorized quotes with approval states and expiration dates [FR-1].
 *
 * @param params Query parameters for filtering quotes by approval_state or customer_id
 * @returns Array of Quote records
 */
export async function getQuotes(params?: GetQuotesParams): Promise<Quote[]> {
  const queryParams: Record<string, string | undefined> = {};

  if (params?.approval_state) {
    const sanitized = sanitizeApprovalState(params.approval_state);
    if (sanitized) {
      queryParams.approval_state = sanitized;
    }
  }

  if (params?.customer_id) {
    const trimmed = params.customer_id.trim();
    if (trimmed) {
      queryParams.customer_id = trimmed;
    }
  }

  const queryString = buildQueryString(queryParams);
  return apiFetch<Quote[]>(`/api/v1/financial/quotes${queryString}`, {
    method: 'GET',
  });
}

/**
 * Retrieve current, pending, and historical invoices with status filters [FR-2].
 *
 * @param params Query parameters for filtering invoices by status or customer_id
 * @returns Array of Invoice records
 */
export async function getInvoices(params?: GetInvoicesParams): Promise<Invoice[]> {
  const queryParams: Record<string, string | undefined> = {};

  if (params?.status) {
    const sanitized = sanitizeInvoiceStatus(params.status);
    if (sanitized) {
      queryParams.status = sanitized;
    }
  }

  if (params?.customer_id) {
    const trimmed = params.customer_id.trim();
    if (trimmed) {
      queryParams.customer_id = trimmed;
    }
  }

  const queryString = buildQueryString(queryParams);
  return apiFetch<Invoice[]>(`/api/v1/financial/invoices${queryString}`, {
    method: 'GET',
  });
}

/**
 * Retrieve complete payment history records linked to corresponding invoices or customer [FR-3].
 *
 * @param params Query parameters for filtering payments by invoice_id or customer_id
 * @returns Array of Payment records
 */
export async function getPayments(params?: GetPaymentsParams): Promise<Payment[]> {
  const queryParams: Record<string, string | undefined> = {};

  if (params?.invoice_id) {
    const trimmed = params.invoice_id.trim();
    if (trimmed) {
      queryParams.invoice_id = trimmed;
    }
  }

  if (params?.customer_id) {
    const trimmed = params.customer_id.trim();
    if (trimmed) {
      queryParams.customer_id = trimmed;
    }
  }

  const queryString = buildQueryString(queryParams);
  return apiFetch<Payment[]>(`/api/v1/financial/payments${queryString}`, {
    method: 'GET',
  });
}

/**
 * Retrieve visual Accounts Receivable (AR) aging metrics segmented into duration buckets [FR-4].
 * Buckets: 0-30, 31-60, 61-90, and 90+ days.
 *
 * @param params Query parameters for optional customer_id filter or as_of_date_val evaluation date
 * @returns ARAgingMetrics object containing duration buckets
 */
export async function getARAgingMetrics(params?: GetARAgingParams): Promise<ARAgingMetrics> {
  const queryParams: Record<string, string | undefined> = {};

  if (params?.customer_id) {
    const trimmed = params.customer_id.trim();
    if (trimmed) {
      queryParams.customer_id = trimmed;
    }
  }

  if (params?.as_of_date_val) {
    const trimmed = params.as_of_date_val.trim();
    if (trimmed) {
      queryParams.as_of_date_val = trimmed;
    }
  }

  const queryString = buildQueryString(queryParams);
  return apiFetch<ARAgingMetrics>(`/api/v1/financial/ar-aging${queryString}`, {
    method: 'GET',
  });
}

/**
 * Format numeric currency amount as formatted USD string ($#,##0.00).
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Aggregated Financial API Service object export.
 */
export const financialService = {
  getQuotes,
  getInvoices,
  getPayments,
  getARAgingMetrics,
  sanitizeApprovalState,
  sanitizeInvoiceStatus,
  buildQueryString,
};

export const financialApi = financialService;
export default financialService;
