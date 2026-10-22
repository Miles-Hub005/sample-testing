'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Receipt,
  CreditCard,
  Search,
  Filter,
  RotateCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  DollarSign,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  Quote,
  Invoice,
  Payment,
  getQuotes,
  getInvoices,
  getPayments,
  ALLOWED_APPROVAL_STATES,
  ALLOWED_INVOICE_STATUSES,
} from '../../services/financial';
import { StatusLabel } from '../common/StatusLabel';
import { cn } from '../../lib/utils';

// ============================================================================
// Types & Props Contract [FR-1, FR-2, FR-3]
// ============================================================================

export type ActiveDashboardTab = 'all' | 'quotes' | 'invoices' | 'payments';

export interface DashboardFilters {
  approvalState?: string;
  invoiceStatus?: string;
  customerId?: string;
  invoiceId?: string;
  searchQuery?: string;
}

export interface DashboardProps {
  /**
   * Pre-loaded quotes array. If omitted or null, component self-fetches via getQuotes().
   */
  quotes?: Quote[] | null;

  /**
   * Pre-loaded invoices array. If omitted or null, component self-fetches via getInvoices().
   */
  invoices?: Invoice[] | null;

  /**
   * Pre-loaded payments array. If omitted or null, component self-fetches via getPayments().
   */
  payments?: Payment[] | null;

  /**
   * Initial active tab (default: 'all').
   */
  initialTab?: ActiveDashboardTab;

  /**
   * Initial filter parameter overrides.
   */
  initialFilters?: DashboardFilters;

  /**
   * Optional customer ID filter prop.
   */
  customerId?: string;

  /**
   * Callback invoked whenever filters change.
   */
  onFilterChange?: (filters: DashboardFilters) => void;

  /**
   * Callback invoked when selecting an invoice to view payments or link details.
   */
  onSelectInvoice?: (invoiceId: string) => void;

  /**
   * Controlled loading indicator flag.
   */
  isLoading?: boolean;

  /**
   * Controlled error message or Error object.
   */
  error?: string | Error | null;

  /**
   * Callback for retrying data fetch upon error or manual refresh.
   */
  onRetry?: () => void;

  /**
   * Title heading override.
   */
  title?: string;

  /**
   * Custom CSS class name to append to the root container.
   */
  className?: string;

  /**
   * Testing identifier for testing utilities.
   */
  'data-testid'?: string;
}

export interface SummaryMetrics {
  totalQuotesCount: number;
  totalQuotesValue: number;
  approvedQuotesCount: number;
  pendingQuotesCount: number;
  totalInvoicesCount: number;
  totalInvoicesValue: number;
  totalOutstandingAmount: number;
  pastDueInvoicesCount: number;
  totalPaymentsCount: number;
  totalPaymentsValue: number;
}

// ============================================================================
// Formatting & Calculation Helpers [FR-1, FR-2, FR-3]
// ============================================================================

/**
 * Formats numeric currency values into standard USD string representation.
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
 * Formats ISO date-time strings into human-readable date strings.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) {
    return 'N/A';
  }
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Formats raw status enums or keys into clean human-readable labels.
 */
export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return 'Unknown';
  }
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Normalizes state and status strings for loose string comparison.
 */
export function normalizeStateString(str: string | null | undefined): string {
  if (!str) {
    return '';
  }
  return str.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/**
 * Calculates financial summary metrics from quotes, invoices, and payments arrays.
 */
export function calculateDashboardSummary(
  quotes: Quote[] | null | undefined,
  invoices: Invoice[] | null | undefined,
  payments: Payment[] | null | undefined
): SummaryMetrics {
  const safeQuotes = Array.isArray(quotes) ? quotes : [];
  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  const totalQuotesCount = safeQuotes.length;
  const totalQuotesValue = safeQuotes.reduce((acc, q) => acc + (q.total_amount || 0), 0);
  const approvedQuotesCount = safeQuotes.filter(
    (q) => normalizeStateString(q.approval_state) === 'approved'
  ).length;
  const pendingQuotesCount = safeQuotes.filter((q) => {
    const norm = normalizeStateString(q.approval_state);
    return norm === 'pending_approval' || norm === 'draft';
  }).length;

  const totalInvoicesCount = safeInvoices.length;
  const totalInvoicesValue = safeInvoices.reduce((acc, i) => acc + (i.total_amount || 0), 0);
  const totalOutstandingAmount = safeInvoices.reduce(
    (acc, i) => acc + (i.outstanding_amount || 0),
    0
  );
  const pastDueInvoicesCount = safeInvoices.filter(
    (i) => normalizeStateString(i.status) === 'past_due'
  ).length;

  const totalPaymentsCount = safePayments.length;
  const totalPaymentsValue = safePayments.reduce((acc, p) => acc + (p.amount_paid || 0), 0);

  return {
    totalQuotesCount,
    totalQuotesValue,
    approvedQuotesCount,
    pendingQuotesCount,
    totalInvoicesCount,
    totalInvoicesValue,
    totalOutstandingAmount,
    pastDueInvoicesCount,
    totalPaymentsCount,
    totalPaymentsValue,
  };
}

// ============================================================================
// Consolidated Financial Transparency Dashboard Component [FR-1, FR-2, FR-3]
// ============================================================================

export function Dashboard({
  quotes: quotesProp,
  invoices: invoicesProp,
  payments: paymentsProp,
  initialTab = 'all',
  initialFilters = {},
  customerId: customerIdProp,
  onFilterChange,
  onSelectInvoice,
  isLoading: isLoadingProp,
  error: errorProp,
  onRetry,
  title = 'Financial Transparency Dashboard',
  className = '',
  'data-testid': testId = 'financial-dashboard',
}: DashboardProps) {
  // State for fetched data when props are omitted
  const [internalQuotes, setInternalQuotes] = useState<Quote[]>([]);
  const [internalInvoices, setInternalInvoices] = useState<Invoice[]>([]);
  const [internalPayments, setInternalPayments] = useState<Payment[]>([]);

  // Internal loading and error state
  const [internalLoading, setInternalLoading] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<ActiveDashboardTab>(initialTab);

  // Filter states
  const [approvalStateFilter, setApprovalStateFilter] = useState<string>(
    initialFilters.approvalState || 'All'
  );
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>(
    initialFilters.invoiceStatus || 'All'
  );
  const [customerIdInput, setCustomerIdInput] = useState<string>(
    customerIdProp || initialFilters.customerId || ''
  );
  const [invoiceIdFilter, setInvoiceIdFilter] = useState<string>(
    initialFilters.invoiceId || ''
  );
  const [searchQuery, setSearchQuery] = useState<string>(
    initialFilters.searchQuery || ''
  );

  // Effective customer ID (prop takes precedence if provided)
  const effectiveCustomerId = customerIdProp !== undefined ? customerIdProp : customerIdInput;

  // Determine whether to use controlled props or self-fetched internal data
  const isSelfFetching =
    quotesProp === undefined || invoicesProp === undefined || paymentsProp === undefined;

  const quotes = quotesProp !== undefined && quotesProp !== null ? quotesProp : internalQuotes;
  const invoices = invoicesProp !== undefined && invoicesProp !== null ? invoicesProp : internalInvoices;
  const payments = paymentsProp !== undefined && paymentsProp !== null ? paymentsProp : internalPayments;

  const isLoading = isLoadingProp !== undefined ? isLoadingProp : internalLoading;
  const rawError = errorProp !== undefined ? errorProp : internalError;
  const errorText =
    typeof rawError === 'string'
      ? rawError
      : rawError instanceof Error
      ? rawError.message
      : null;

  // --------------------------------------------------------------------------
  // Data Fetching Logic (Self-Fetching Mode)
  // --------------------------------------------------------------------------

  const fetchDashboardData = useCallback(async () => {
    if (!isSelfFetching) return;

    setInternalLoading(true);
    setInternalError(null);

    try {
      const [quotesRes, invoicesRes, paymentsRes] = await Promise.allSettled([
        getQuotes({
          approval_state: approvalStateFilter !== 'All' ? approvalStateFilter : undefined,
          customer_id: effectiveCustomerId || undefined,
        }),
        getInvoices({
          status: invoiceStatusFilter !== 'All' ? invoiceStatusFilter : undefined,
          customer_id: effectiveCustomerId || undefined,
        }),
        getPayments({
          invoice_id: invoiceIdFilter || undefined,
          customer_id: effectiveCustomerId || undefined,
        }),
      ]);

      let hasError = false;
      let errorMsg = '';

      if (quotesRes.status === 'fulfilled') {
        setInternalQuotes(quotesRes.value);
      } else {
        hasError = true;
        errorMsg = quotesRes.reason?.message || 'Failed to fetch quotes.';
      }

      if (invoicesRes.status === 'fulfilled') {
        setInternalInvoices(invoicesRes.value);
      } else {
        hasError = true;
        errorMsg = invoicesRes.reason?.message || errorMsg || 'Failed to fetch invoices.';
      }

      if (paymentsRes.status === 'fulfilled') {
        setInternalPayments(paymentsRes.value);
      } else {
        hasError = true;
        errorMsg = paymentsRes.reason?.message || errorMsg || 'Failed to fetch payments.';
      }

      if (hasError && errorMsg) {
        setInternalError(errorMsg);
      }
    } catch (err: any) {
      setInternalError(err?.message || 'An unexpected error occurred while loading dashboard data.');
    } finally {
      setInternalLoading(false);
    }
  }, [
    isSelfFetching,
    approvalStateFilter,
    invoiceStatusFilter,
    invoiceIdFilter,
    effectiveCustomerId,
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // --------------------------------------------------------------------------
  // Filter Change Propagation
  // --------------------------------------------------------------------------

  const handleFilterChange = useCallback(
    (updatedFilters: Partial<DashboardFilters>) => {
      const combined: DashboardFilters = {
        approvalState: approvalStateFilter,
        invoiceStatus: invoiceStatusFilter,
        customerId: customerIdInput,
        invoiceId: invoiceIdFilter,
        searchQuery,
        ...updatedFilters,
      };

      if (updatedFilters.approvalState !== undefined) {
        setApprovalStateFilter(updatedFilters.approvalState);
      }
      if (updatedFilters.invoiceStatus !== undefined) {
        setInvoiceStatusFilter(updatedFilters.invoiceStatus);
      }
      if (updatedFilters.customerId !== undefined) {
        setCustomerIdInput(updatedFilters.customerId);
      }
      if (updatedFilters.invoiceId !== undefined) {
        setInvoiceIdFilter(updatedFilters.invoiceId);
      }
      if (updatedFilters.searchQuery !== undefined) {
        setSearchQuery(updatedFilters.searchQuery);
      }

      if (onFilterChange) {
        onFilterChange(combined);
      }
    },
    [
      approvalStateFilter,
      invoiceStatusFilter,
      customerIdInput,
      invoiceIdFilter,
      searchQuery,
      onFilterChange,
    ]
  );

  const handleResetFilters = useCallback(() => {
    setApprovalStateFilter('All');
    setInvoiceStatusFilter('All');
    setCustomerIdInput('');
    setInvoiceIdFilter('');
    setSearchQuery('');

    if (onFilterChange) {
      onFilterChange({
        approvalState: 'All',
        invoiceStatus: 'All',
        customerId: '',
        invoiceId: '',
        searchQuery: '',
      });
    }
  }, [onFilterChange]);

  const handleRefresh = useCallback(() => {
    if (onRetry) {
      onRetry();
    } else {
      fetchDashboardData();
    }
  }, [onRetry, fetchDashboardData]);

  // --------------------------------------------------------------------------
  // Summary Metrics Computation
  // --------------------------------------------------------------------------

  const summary = useMemo(
    () => calculateDashboardSummary(quotes, invoices, payments),
    [quotes, invoices, payments]
  );

  // --------------------------------------------------------------------------
  // Filtered Record Collections [FR-1, FR-2, FR-3]
  // --------------------------------------------------------------------------

  const filteredQuotes = useMemo(() => {
    if (!Array.isArray(quotes)) return [];
    return quotes.filter((q) => {
      // Approval state filter
      if (approvalStateFilter && approvalStateFilter !== 'All') {
        if (normalizeStateString(q.approval_state) !== normalizeStateString(approvalStateFilter)) {
          return false;
        }
      }
      // Customer ID filter
      if (effectiveCustomerId) {
        if (
          !q.customer_id ||
          !q.customer_id.toLowerCase().includes(effectiveCustomerId.toLowerCase())
        ) {
          return false;
        }
      }
      // General search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = q.quote_id?.toLowerCase().includes(query);
        const matchesCust = q.customer_id?.toLowerCase().includes(query);
        const matchesAmount = String(q.total_amount).includes(query);
        const matchesState = q.approval_state?.toLowerCase().includes(query);
        if (!matchesId && !matchesCust && !matchesAmount && !matchesState) {
          return false;
        }
      }
      return true;
    });
  }, [quotes, approvalStateFilter, effectiveCustomerId, searchQuery]);

  const filteredInvoices = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    return invoices.filter((inv) => {
      // Status filter
      if (invoiceStatusFilter && invoiceStatusFilter !== 'All') {
        if (normalizeStateString(inv.status) !== normalizeStateString(invoiceStatusFilter)) {
          return false;
        }
      }
      // Customer ID filter
      if (effectiveCustomerId) {
        if (
          !inv.customer_id ||
          !inv.customer_id.toLowerCase().includes(effectiveCustomerId.toLowerCase())
        ) {
          return false;
        }
      }
      // Invoice ID filter
      if (invoiceIdFilter) {
        if (
          !inv.invoice_id ||
          !inv.invoice_id.toLowerCase().includes(invoiceIdFilter.toLowerCase())
        ) {
          return false;
        }
      }
      // General search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = inv.invoice_id?.toLowerCase().includes(query);
        const matchesQuote = inv.quote_id?.toLowerCase().includes(query);
        const matchesCust = inv.customer_id?.toLowerCase().includes(query);
        const matchesStatus = inv.status?.toLowerCase().includes(query);
        const matchesAmount = String(inv.total_amount).includes(query);
        if (
          !matchesId &&
          !matchesQuote &&
          !matchesCust &&
          !matchesStatus &&
          !matchesAmount
        ) {
          return false;
        }
      }
      return true;
    });
  }, [invoices, invoiceStatusFilter, effectiveCustomerId, invoiceIdFilter, searchQuery]);

  const filteredPayments = useMemo(() => {
    if (!Array.isArray(payments)) return [];
    return payments.filter((p) => {
      // Invoice ID filter
      if (invoiceIdFilter) {
        if (
          !p.invoice_id ||
          !p.invoice_id.toLowerCase().includes(invoiceIdFilter.toLowerCase())
        ) {
          return false;
        }
      }
      // Customer ID filter (match via linked invoices if available)
      if (effectiveCustomerId && Array.isArray(invoices)) {
        const linkedInvoice = invoices.find((i) => i.invoice_id === p.invoice_id);
        if (
          linkedInvoice &&
          !linkedInvoice.customer_id.toLowerCase().includes(effectiveCustomerId.toLowerCase())
        ) {
          return false;
        }
      }
      // General search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = p.payment_id?.toLowerCase().includes(query);
        const matchesInvoice = p.invoice_id?.toLowerCase().includes(query);
        const matchesMethod = p.payment_method?.toLowerCase().includes(query);
        const matchesAmount = String(p.amount_paid).includes(query);
        if (!matchesId && !matchesInvoice && !matchesMethod && !matchesAmount) {
          return false;
        }
      }
      return true;
    });
  }, [payments, invoiceIdFilter, effectiveCustomerId, invoices, searchQuery]);

  // Handle invoice row selection
  const handleInvoiceClick = (invoiceId: string) => {
    setInvoiceIdFilter(invoiceId);
    setActiveTab('payments');
    if (onSelectInvoice) {
      onSelectInvoice(invoiceId);
    }
    if (onFilterChange) {
      onFilterChange({
        approvalState: approvalStateFilter,
        invoiceStatus: invoiceStatusFilter,
        customerId: customerIdInput,
        invoiceId: invoiceId,
        searchQuery,
      });
    }
  };

  const hasActiveFilters =
    approvalStateFilter !== 'All' ||
    invoiceStatusFilter !== 'All' ||
    !!customerIdInput ||
    !!invoiceIdFilter ||
    !!searchQuery;

  return (
    <div
      data-testid={testId}
      className={cn(
        'w-full space-y-6 rounded-xl bg-[#fbf9f4] p-4 text-[#1b1c19] sm:p-6 lg:p-8',
        className
      )}
    >
      {/* ==================================================================== */}
      {/* Header & Controls Bar */}
      {/* ==================================================================== */}
      <div className="flex flex-col gap-4 border-b border-[#e4e2dd] pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-[#735c41]" />
            <h1 className="font-serif text-2xl font-normal tracking-tight text-[#1b1c19] sm:text-3xl">
              {title}
            </h1>
          </div>
          <p className="mt-1 text-sm text-[#4e453d]">
            Consolidated financial oversight for quotes, invoices, and complete payment histories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="refresh-button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md border border-[#d1c4b9] bg-[#ffffff] px-3.5 py-2 text-sm font-medium text-[#1b1c19] shadow-sm transition-colors hover:bg-[#f5f3ee] focus:outline-none focus:ring-2 focus:ring-[#735c41] focus:ring-offset-2 disabled:opacity-50"
            aria-label="Refresh financial dashboard data"
          >
            <RotateCw className={cn('h-4 w-4 text-[#735c41]', isLoading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Error Alert Display */}
      {/* ==================================================================== */}
      {errorText && (
        <div
          data-testid="error-banner"
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-[#ffdad6] bg-[#ffdad6]/40 p-4 text-[#93000a] sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#ba1a1a]" />
            <div>
              <h3 className="text-sm font-semibold text-[#ba1a1a]">Failed to load financial records</h3>
              <p className="mt-0.5 text-xs text-[#4e453d]">{errorText}</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="retry-button"
            onClick={handleRefresh}
            className="inline-flex items-center justify-center rounded-md bg-[#ba1a1a] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#93000a] focus:outline-none focus:ring-2 focus:ring-[#ba1a1a] focus:ring-offset-2"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Summary KPI Cards */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* KPI Card 1: Quotes Summary */}
        <div
          data-testid="kpi-card-quotes"
          className="rounded-lg border border-[#e4e2dd] bg-[#ffffff] p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#4e453d]">
              Authorized Quotes
            </span>
            <div className="rounded-md bg-[#f0eee9] p-2 text-[#735c41]">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-semibold tracking-tight text-[#1b1c19]">
              {formatCurrency(summary.totalQuotesValue)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#4e453d]">
              <span className="rounded bg-[#f5f3ee] px-2 py-0.5 font-medium text-[#1b1c19]">
                {summary.totalQuotesCount} Total Quotes
              </span>
              <span className="text-[#064e3b]">
                {summary.approvedQuotesCount} Approved
              </span>
              <span>•</span>
              <span className="text-[#92400e]">
                {summary.pendingQuotesCount} Draft/Pending
              </span>
            </div>
          </div>
        </div>

        {/* KPI Card 2: Invoices Summary */}
        <div
          data-testid="kpi-card-invoices"
          className="rounded-lg border border-[#e4e2dd] bg-[#ffffff] p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#4e453d]">
              Outstanding Invoices
            </span>
            <div className="rounded-md bg-[#f0eee9] p-2 text-[#735c41]">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-semibold tracking-tight text-[#1b1c19]">
              {formatCurrency(summary.totalOutstandingAmount)}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#4e453d]">
              <span className="rounded bg-[#f5f3ee] px-2 py-0.5 font-medium text-[#1b1c19]">
                {summary.totalInvoicesCount} Total Invoices ({formatCurrency(summary.totalInvoicesValue)})
              </span>
              {summary.pastDueInvoicesCount > 0 && (
                <span className="font-medium text-[#991b1b]">
                  {summary.pastDueInvoicesCount} Past Due
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI Card 3: Payments Summary */}
        <div
          data-testid="kpi-card-payments"
          className="rounded-lg border border-[#e4e2dd] bg-[#ffffff] p-5 shadow-sm transition-shadow hover:shadow-md sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-[#4e453d]">
              Payments Collected
            </span>
            <div className="rounded-md bg-[#f0eee9] p-2 text-[#735c41]">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-semibold tracking-tight text-[#064e3b]">
              {formatCurrency(summary.totalPaymentsValue)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#4e453d]">
              <span className="rounded bg-[#f5f3ee] px-2 py-0.5 font-medium text-[#1b1c19]">
                {summary.totalPaymentsCount} Payment Records
              </span>
              <span className="text-xs text-[#064e3b]">Verified & Settled</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Search & Filter Toolbar */}
      {/* ==================================================================== */}
      <div className="rounded-lg border border-[#e4e2dd] bg-[#ffffff] p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* General Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#80756b]" />
            <input
              type="text"
              data-testid="dashboard-search-input"
              value={searchQuery}
              onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
              placeholder="Search by ID, customer, method, or amount..."
              className="w-full rounded-md border border-[#d1c4b9] bg-[#fbf9f4] pl-9 pr-3 py-1.5 text-sm text-[#1b1c19] placeholder-[#80756b] focus:border-[#735c41] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#735c41]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleFilterChange({ searchQuery: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#80756b] hover:text-[#1b1c19]"
                aria-label="Clear search query"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Customer ID Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#80756b] shrink-0" />
            <input
              type="text"
              data-testid="customer-id-input"
              value={customerIdInput}
              onChange={(e) => handleFilterChange({ customerId: e.target.value })}
              placeholder="Filter by Customer ID..."
              className="w-48 rounded-md border border-[#d1c4b9] bg-[#fbf9f4] px-3 py-1.5 text-sm text-[#1b1c19] placeholder-[#80756b] focus:border-[#735c41] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#735c41]"
            />
          </div>
        </div>

        {/* Specific Filters Row */}
        <div className="flex flex-wrap items-center gap-3 border-t border-[#f0eee9] pt-3 text-xs">
          <div className="flex items-center gap-1.5 text-[#4e453d] font-medium">
            <Filter className="h-3.5 w-3.5 text-[#735c41]" />
            <span>Filters:</span>
          </div>

          {/* Quote Approval State Filter */}
          <div className="flex items-center gap-1">
            <label htmlFor="quote-approval-select" className="text-[#4e453d]">
              Quote State:
            </label>
            <select
              id="quote-approval-select"
              data-testid="quote-approval-filter"
              value={approvalStateFilter}
              onChange={(e) => handleFilterChange({ approvalState: e.target.value })}
              className="rounded-md border border-[#d1c4b9] bg-[#fbf9f4] px-2.5 py-1 text-xs text-[#1b1c19] focus:border-[#735c41] focus:outline-none focus:ring-1 focus:ring-[#735c41]"
            >
              <option value="All">All States</option>
              {ALLOWED_APPROVAL_STATES.map((state) => (
                <option key={state} value={state}>
                  {formatStatusLabel(state)}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Status Filter */}
          <div className="flex items-center gap-1">
            <label htmlFor="invoice-status-select" className="text-[#4e453d]">
              Invoice Status:
            </label>
            <select
              id="invoice-status-select"
              data-testid="invoice-status-filter"
              value={invoiceStatusFilter}
              onChange={(e) => handleFilterChange({ invoiceStatus: e.target.value })}
              className="rounded-md border border-[#d1c4b9] bg-[#fbf9f4] px-2.5 py-1 text-xs text-[#1b1c19] focus:border-[#735c41] focus:outline-none focus:ring-1 focus:ring-[#735c41]"
            >
              <option value="All">All Statuses</option>
              {ALLOWED_INVOICE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice ID Link Filter */}
          <div className="flex items-center gap-1">
            <label htmlFor="invoice-id-input-field" className="text-[#4e453d]">
              Linked Invoice ID:
            </label>
            <input
              id="invoice-id-input-field"
              type="text"
              data-testid="invoice-id-filter"
              value={invoiceIdFilter}
              onChange={(e) => handleFilterChange({ invoiceId: e.target.value })}
              placeholder="e.g. INV-101..."
              className="w-32 rounded-md border border-[#d1c4b9] bg-[#fbf9f4] px-2 py-1 text-xs text-[#1b1c19] placeholder-[#80756b] focus:border-[#735c41] focus:outline-none focus:ring-1 focus:ring-[#735c41]"
            />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              data-testid="reset-filters-button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 rounded bg-[#f0eee9] px-2 py-1 text-xs font-medium text-[#735c41] hover:bg-[#e4e2dd] transition-colors"
            >
              <X className="h-3 w-3" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* Navigation Tabs Bar */}
      {/* ==================================================================== */}
      <div className="border-b border-[#e4e2dd]">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Dashboard views">
          <button
            type="button"
            data-testid="tab-all"
            onClick={() => setActiveTab('all')}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors',
              activeTab === 'all'
                ? 'border-[#735c41] text-[#735c41]'
                : 'border-transparent text-[#4e453d] hover:border-[#d1c4b9] hover:text-[#1b1c19]'
            )}
            aria-selected={activeTab === 'all'}
            role="tab"
          >
            <Building2 className="h-4 w-4" />
            <span>All Overview</span>
          </button>

          <button
            type="button"
            data-testid="tab-quotes"
            onClick={() => setActiveTab('quotes')}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors',
              activeTab === 'quotes'
                ? 'border-[#735c41] text-[#735c41]'
                : 'border-transparent text-[#4e453d] hover:border-[#d1c4b9] hover:text-[#1b1c19]'
            )}
            aria-selected={activeTab === 'quotes'}
            role="tab"
          >
            <FileText className="h-4 w-4" />
            <span>Quotes ({filteredQuotes.length})</span>
          </button>

          <button
            type="button"
            data-testid="tab-invoices"
            onClick={() => setActiveTab('invoices')}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors',
              activeTab === 'invoices'
                ? 'border-[#735c41] text-[#735c41]'
                : 'border-transparent text-[#4e453d] hover:border-[#d1c4b9] hover:text-[#1b1c19]'
            )}
            aria-selected={activeTab === 'invoices'}
            role="tab"
          >
            <Receipt className="h-4 w-4" />
            <span>Invoices ({filteredInvoices.length})</span>
          </button>

          <button
            type="button"
            data-testid="tab-payments"
            onClick={() => setActiveTab('payments')}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors',
              activeTab === 'payments'
                ? 'border-[#735c41] text-[#735c41]'
                : 'border-transparent text-[#4e453d] hover:border-[#d1c4b9] hover:text-[#1b1c19]'
            )}
            aria-selected={activeTab === 'payments'}
            role="tab"
          >
            <CreditCard className="h-4 w-4" />
            <span>Payment History ({filteredPayments.length})</span>
          </button>
        </nav>
      </div>

      {/* ==================================================================== */}
      {/* Loading Skeleton Indicator */}
      {/* ==================================================================== */}
      {isLoading && (
        <div
          data-testid="loading-indicator"
          className="flex flex-col items-center justify-center py-12 space-y-3 rounded-lg border border-[#e4e2dd] bg-[#ffffff] text-[#4e453d]"
        >
          <RotateCw className="h-8 w-8 animate-spin text-[#735c41]" />
          <p className="text-sm font-medium">Loading financial transparency data...</p>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Tab 1: All Overview */}
      {/* ==================================================================== */}
      {!isLoading && activeTab === 'all' && (
        <div className="space-y-8">
          {/* Section A: Authorized Quotes Summary */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-[#1b1c19] flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#735c41]" />
                <span>Authorized Quotes [FR-1]</span>
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('quotes')}
                className="text-xs font-medium text-[#735c41] hover:underline flex items-center gap-1"
              >
                <span>View All Quotes ({filteredQuotes.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <QuotesTable
              quotes={filteredQuotes.slice(0, 5)}
              totalCount={filteredQuotes.length}
              onSelectAll={() => setActiveTab('quotes')}
            />
          </section>

          {/* Section B: Status-Filtered Invoices */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-[#1b1c19] flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#735c41]" />
                <span>Status-Filtered Invoices [FR-2]</span>
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className="text-xs font-medium text-[#735c41] hover:underline flex items-center gap-1"
              >
                <span>View All Invoices ({filteredInvoices.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <InvoicesTable
              invoices={filteredInvoices.slice(0, 5)}
              totalCount={filteredInvoices.length}
              onSelectInvoice={handleInvoiceClick}
              onSelectAll={() => setActiveTab('invoices')}
            />
          </section>

          {/* Section C: Complete Payment History */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-[#1b1c19] flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#735c41]" />
                <span>Payment History Records [FR-3]</span>
              </h2>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className="text-xs font-medium text-[#735c41] hover:underline flex items-center gap-1"
              >
                <span>View All Payments ({filteredPayments.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <PaymentsTable
              payments={filteredPayments.slice(0, 5)}
              totalCount={filteredPayments.length}
              onSelectAll={() => setActiveTab('payments')}
            />
          </section>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Tab 2: Quotes View [FR-1] */}
      {/* ==================================================================== */}
      {!isLoading && activeTab === 'quotes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-[#1b1c19] flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#735c41]" />
              <span>Authorized Quotes ({filteredQuotes.length}) [FR-1]</span>
            </h2>
            <span className="text-xs text-[#4e453d]">
              Displaying quotes with approval states and explicit expiration dates.
            </span>
          </div>
          <QuotesTable quotes={filteredQuotes} totalCount={filteredQuotes.length} />
        </div>
      )}

      {/* ==================================================================== */}
      {/* Tab 3: Invoices View [FR-2] */}
      {/* ==================================================================== */}
      {!isLoading && activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-[#1b1c19] flex items-center gap-2">
              <Receipt className="h-5 w-5 text-[#735c41]" />
              <span>Status-Filtered Invoices ({filteredInvoices.length}) [FR-2]</span>
            </h2>
            <span className="text-xs text-[#4e453d]">
              Displaying current, pending, and historical invoices with status filter.
            </span>
          </div>
          <InvoicesTable
            invoices={filteredInvoices}
            totalCount={filteredInvoices.length}
            onSelectInvoice={handleInvoiceClick}
          />
        </div>
      )}

      {/* ==================================================================== */}
      {/* Tab 4: Payments View [FR-3] */}
      {/* ==================================================================== */}
      {!isLoading && activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-[#1b1c19] flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#735c41]" />
              <span>Payment History Records ({filteredPayments.length}) [FR-3]</span>
            </h2>
            <span className="text-xs text-[#4e453d]">
              Displaying complete payment history records linked to corresponding invoices.
            </span>
          </div>
          {invoiceIdFilter && (
            <div className="flex items-center gap-2 rounded bg-[#f0eee9] px-3 py-1.5 text-xs text-[#735c41]">
              <span>Filtered by linked Invoice ID: <strong>{invoiceIdFilter}</strong></span>
              <button
                type="button"
                onClick={() => handleFilterChange({ invoiceId: '' })}
                className="ml-auto font-semibold hover:underline"
              >
                Show All Payments
              </button>
            </div>
          )}
          <PaymentsTable payments={filteredPayments} totalCount={filteredPayments.length} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-Component: Quotes Table [FR-1]
// ============================================================================

interface QuotesTableProps {
  quotes: Quote[];
  totalCount: number;
  onSelectAll?: () => void;
}

function QuotesTable({ quotes, totalCount, onSelectAll }: QuotesTableProps) {
  if (quotes.length === 0) {
    return (
      <div
        data-testid="quotes-empty-state"
        className="rounded-lg border border-[#e4e2dd] bg-[#ffffff] p-8 text-center"
      >
        <FileText className="mx-auto h-10 w-10 text-[#80756b]" />
        <h3 className="mt-2 text-sm font-semibold text-[#1b1c19]">No Quotes Found</h3>
        <p className="mt-1 text-xs text-[#4e453d]">
          No quotes match the current state or filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="quotes-table-container"
      className="overflow-hidden rounded-lg border border-[#e4e2dd] bg-[#ffffff] shadow-sm"
    >
      <div className="overflow-x-auto">
        <table data-testid="quotes-table" className="w-full text-left text-xs">
          <thead className="border-b border-[#e4e2dd] bg-[#f5f3ee] text-[#4e453d]">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Quote ID
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Customer ID
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Total Amount
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Approval State [FR-1]
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Expiration Date [FR-1]
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Created On
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0eee9] text-[#1b1c19]">
            {quotes.map((quote) => {
              const isExpired =
                normalizeStateString(quote.approval_state) === 'expired' ||
                (quote.expiration_date_time &&
                  new Date(quote.expiration_date_time).getTime() < Date.now());

              return (
                <tr
                  key={quote.quote_id}
                  data-testid={`quote-row-${quote.quote_id}`}
                  className="hover:bg-[#fbf9f4] transition-colors"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-[#735c41]">
                    {quote.quote_id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#4e453d]">
                    {quote.customer_id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#1b1c19]">
                    {formatCurrency(quote.total_amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusLabel
                      status={quote.approval_state}
                      label={formatStatusLabel(quote.approval_state)}
                      size="sm"
                    />
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap px-4 py-3 font-medium',
                      isExpired ? 'text-[#ba1a1a]' : 'text-[#1b1c19]'
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-[#80756b]" />
                      <span>{formatDate(quote.expiration_date_time)}</span>
                      {isExpired && (
                        <span className="rounded bg-[#ffdad6] px-1.5 py-0.2 text-[10px] font-bold text-[#93000a]">
                          EXPIRED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#4e453d]">
                    {formatDate(quote.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {onSelectAll && totalCount > quotes.length && (
        <div className="border-t border-[#f0eee9] bg-[#f5f3ee] px-4 py-2 text-center text-xs">
          <button
            type="button"
            onClick={onSelectAll}
            className="font-medium text-[#735c41] hover:underline"
          >
            Showing {quotes.length} of {totalCount} quotes. Click to view all.
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-Component: Invoices Table [FR-2]
// ============================================================================

interface InvoicesTableProps {
  invoices: Invoice[];
  totalCount: number;
  onSelectInvoice?: (invoiceId: string) => void;
  onSelectAll?: () => void;
}

function InvoicesTable({
  invoices,
  totalCount,
  onSelectInvoice,
  onSelectAll,
}: InvoicesTableProps) {
  if (invoices.length === 0) {
    return (
      <div
        data-testid="invoices-empty-state"
        className="rounded-lg border border-[#e4e2dd] bg-[#ffffff] p-8 text-center"
      >
        <Receipt className="mx-auto h-10 w-10 text-[#80756b]" />
        <h3 className="mt-2 text-sm font-semibold text-[#1b1c19]">No Invoices Found</h3>
        <p className="mt-1 text-xs text-[#4e453d]">
          No invoices match the current status filter or search parameters.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="invoices-table-container"
      className="overflow-hidden rounded-lg border border-[#e4e2dd] bg-[#ffffff] shadow-sm"
    >
      <div className="overflow-x-auto">
        <table data-testid="invoices-table" className="w-full text-left text-xs">
          <thead className="border-b border-[#e4e2dd] bg-[#f5f3ee] text-[#4e453d]">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Invoice ID
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Quote ID
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Customer ID
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Status [FR-2]
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Total Amount
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Outstanding
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Issue Date
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Due Date
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0eee9] text-[#1b1c19]">
            {invoices.map((inv) => {
              const isPastDue =
                normalizeStateString(inv.status) === 'past_due' ||
                (inv.outstanding_amount > 0 &&
                  new Date(inv.due_date_time).getTime() < Date.now());

              return (
                <tr
                  key={inv.invoice_id}
                  data-testid={`invoice-row-${inv.invoice_id}`}
                  className="hover:bg-[#fbf9f4] transition-colors"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-[#735c41]">
                    {inv.invoice_id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[#80756b]">
                    {inv.quote_id || '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#4e453d]">
                    {inv.customer_id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusLabel
                      status={inv.status}
                      label={formatStatusLabel(inv.status)}
                      size="sm"
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#1b1c19]">
                    {formatCurrency(inv.total_amount)}
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap px-4 py-3 font-semibold',
                      inv.outstanding_amount > 0 ? 'text-[#991b1b]' : 'text-[#064e3b]'
                    )}
                  >
                    {formatCurrency(inv.outstanding_amount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-[#4e453d]">
                    {formatDate(inv.issue_date_time)}
                  </td>
                  <td
                    className={cn(
                      'whitespace-nowrap px-4 py-3 font-medium',
                      isPastDue ? 'text-[#ba1a1a]' : 'text-[#1b1c19]'
                    )}
                  >
                    {formatDate(inv.due_date_time)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {onSelectInvoice && (
                      <button
                        type="button"
                        onClick={() => onSelectInvoice(inv.invoice_id)}
                        className="inline-flex items-center gap-1 rounded bg-[#f0eee9] px-2.5 py-1 text-xs font-medium text-[#735c41] hover:bg-[#e4e2dd] transition-colors"
                        aria-label={`View payments linked to invoice ${inv.invoice_id}`}
                      >
                        <span>Payments</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {onSelectAll && totalCount > invoices.length && (
        <div className="border-t border-[#f0eee9] bg-[#f5f3ee] px-4 py-2 text-center text-xs">
          <button
            type="button"
            onClick={onSelectAll}
            className="font-medium text-[#735c41] hover:underline"
          >
            Showing {invoices.length} of {totalCount} invoices. Click to view all.
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-Component: Payments Table [FR-3]
// ============================================================================

interface PaymentsTableProps {
  payments: Payment[];
  totalCount: number;
  onSelectAll?: () => void;
}

function PaymentsTable({ payments, totalCount, onSelectAll }: PaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <div
        data-testid="payments-empty-state"
        className="rounded-lg border border-[#e4e2dd] bg-[#ffffff] p-8 text-center"
      >
        <CreditCard className="mx-auto h-10 w-10 text-[#80756b]" />
        <h3 className="mt-2 text-sm font-semibold text-[#1b1c19]">No Payments Found</h3>
        <p className="mt-1 text-xs text-[#4e453d]">
          No payment history records match the selected invoice or filter query.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="payments-table-container"
      className="overflow-hidden rounded-lg border border-[#e4e2dd] bg-[#ffffff] shadow-sm"
    >
      <div className="overflow-x-auto">
        <table data-testid="payments-table" className="w-full text-left text-xs">
          <thead className="border-b border-[#e4e2dd] bg-[#f5f3ee] text-[#4e453d]">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Payment ID
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Linked Invoice ID [FR-3]
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Amount Paid
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Payment Date
              </th>
              <th scope="col" className="px-4 py-3 font-semibold uppercase tracking-wider">
                Payment Method
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0eee9] text-[#1b1c19]">
            {payments.map((p) => (
              <tr
                key={p.payment_id}
                data-testid={`payment-row-${p.payment_id}`}
                className="hover:bg-[#fbf9f4] transition-colors"
              >
                <td className="whitespace-nowrap px-4 py-3 font-mono font-medium text-[#735c41]">
                  {p.payment_id}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-[#1b1c19]">
                  {p.invoice_id}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#064e3b]">
                  {formatCurrency(p.amount_paid)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[#4e453d]">
                  {formatDate(p.payment_date_time)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-[#4e453d]">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f5f3ee] px-2.5 py-0.5 text-xs font-medium text-[#1b1c19]">
                    <CreditCard className="h-3 w-3 text-[#735c41]" />
                    <span>{p.payment_method}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {onSelectAll && totalCount > payments.length && (
        <div className="border-t border-[#f0eee9] bg-[#f5f3ee] px-4 py-2 text-center text-xs">
          <button
            type="button"
            onClick={onSelectAll}
            className="font-medium text-[#735c41] hover:underline"
          >
            Showing {payments.length} of {totalCount} payments. Click to view all.
          </button>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
