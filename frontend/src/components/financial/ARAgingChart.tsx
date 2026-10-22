'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Filter,
  RotateCw,
  AlertCircle,
  BarChart3,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import {
  ARAgingMetrics,
  GetARAgingParams,
  getARAgingMetrics,
} from '../../services/financial';
import { cn } from '../../lib/utils';

// ============================================================================
// Types & Props Contract [FR-4]
// ============================================================================

export interface ARAgingChartProps {
  /**
   * Pre-loaded AR aging metrics object. If omitted, the component fetches metrics via API.
   */
  data?: ARAgingMetrics | null;

  /**
   * Initial query parameters (e.g. customer_id, as_of_date_val) for filtering AR aging metrics.
   */
  initialParams?: GetARAgingParams;

  /**
   * Optional customer ID filter prop.
   */
  customerId?: string;

  /**
   * Optional as-of date filter prop (ISO date string YYYY-MM-DD).
   */
  asOfDateVal?: string;

  /**
   * Callback invoked whenever filter parameters change.
   */
  onFilterChange?: (params: GetARAgingParams) => void;

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
   * Optional heading title override (defaults to "Accounts Receivable (AR) Aging").
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

export interface BucketItem {
  id: string;
  key: keyof ARAgingMetrics;
  label: string;
  daysRange: string;
  amount: number;
  count: number;
  percentage: number;
  colorClass: string;
  badgeBgClass: string;
  barColorClass: string;
  borderClass: string;
  severity: 'current' | 'warning' | 'high' | 'critical';
}

export interface ARTotalsSummary {
  totalOutstanding: number;
  totalInvoices: number;
  buckets: BucketItem[];
  isZeroData: boolean;
}

// ============================================================================
// Formatting & Calculation Helpers [FR-4]
// ============================================================================

/**
 * Formats a numeric USD currency amount ($#,##0.00).
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '$0.00';
  }
  const absolute = Math.abs(amount);
  const formatted = absolute.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
}

/**
 * Formats invoice counts with pluralized label ("0 Invoices", "1 Invoice", "5 Invoices").
 */
export function formatInvoiceCount(count: number | null | undefined): string {
  if (count === null || count === undefined || Number.isNaN(count) || count < 0) {
    return '0 Invoices';
  }
  const rounded = Math.round(count);
  return rounded === 1 ? '1 Invoice' : `${rounded.toLocaleString('en-US')} Invoices`;
}

/**
 * Formats a percentage value to 1 decimal place with '%' symbol.
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value) || value < 0) {
    return '0.0%';
  }
  return `${value.toFixed(1)}%`;
}

/**
 * Calculates total AR balance, total invoice count, individual bucket percentages,
 * and determines zero-data empty state status across duration buckets.
 */
export function calculateARTotals(metrics?: ARAgingMetrics | null): ARTotalsSummary {
  const b0_30 = metrics?.bucket_0_30 || { total_outstanding: 0, invoice_count: 0 };
  const b31_60 = metrics?.bucket_31_60 || { total_outstanding: 0, invoice_count: 0 };
  const b61_90 = metrics?.bucket_61_90 || { total_outstanding: 0, invoice_count: 0 };
  const b90_plus = metrics?.bucket_90_plus || { total_outstanding: 0, invoice_count: 0 };

  const amt0_30 = Math.max(0, b0_30.total_outstanding || 0);
  const amt31_60 = Math.max(0, b31_60.total_outstanding || 0);
  const amt61_90 = Math.max(0, b61_90.total_outstanding || 0);
  const amt90_plus = Math.max(0, b90_plus.total_outstanding || 0);

  const cnt0_30 = Math.max(0, b0_30.invoice_count || 0);
  const cnt31_60 = Math.max(0, b31_60.invoice_count || 0);
  const cnt61_90 = Math.max(0, b61_90.invoice_count || 0);
  const cnt90_plus = Math.max(0, b90_plus.invoice_count || 0);

  const totalOutstanding = amt0_30 + amt31_60 + amt61_90 + amt90_plus;
  const totalInvoices = cnt0_30 + cnt31_60 + cnt61_90 + cnt90_plus;

  const isZeroData = !metrics || (totalOutstanding === 0 && totalInvoices === 0);

  const calcPct = (amt: number): number => {
    if (totalOutstanding <= 0) return 0;
    return (amt / totalOutstanding) * 100;
  };

  const buckets: BucketItem[] = [
    {
      id: 'bucket_0_30',
      key: 'bucket_0_30',
      label: '0–30 Days',
      daysRange: 'Current (0–30 Days)',
      amount: amt0_30,
      count: cnt0_30,
      percentage: calcPct(amt0_30),
      colorClass: 'text-[#59452b]',
      badgeBgClass: 'bg-[#f0eee9] text-[#59452b]',
      barColorClass: 'bg-[#59452b]',
      borderClass: 'border-[#d1c4b9]',
      severity: 'current',
    },
    {
      id: 'bucket_31_60',
      key: 'bucket_31_60',
      label: '31–60 Days',
      daysRange: 'Past Due (31–60 Days)',
      amount: amt31_60,
      count: cnt31_60,
      percentage: calcPct(amt31_60),
      colorClass: 'text-[#735c41]',
      badgeBgClass: 'bg-[#f5d6b4]/40 text-[#735c41]',
      barColorClass: 'bg-[#735c41]',
      borderClass: 'border-[#d1c4b9]',
      severity: 'warning',
    },
    {
      id: 'bucket_61_90',
      key: 'bucket_61_90',
      label: '61–90 Days',
      daysRange: 'Past Due (61–90 Days)',
      amount: amt61_90,
      count: cnt61_90,
      percentage: calcPct(amt61_90),
      colorClass: 'text-[#a43b2c]',
      badgeBgClass: 'bg-[#ffdad4] text-[#a43b2c]',
      barColorClass: 'bg-[#a43b2c]',
      borderClass: 'border-[#fd7d69]/40',
      severity: 'high',
    },
    {
      id: 'bucket_90_plus',
      key: 'bucket_90_plus',
      label: '90+ Days',
      daysRange: 'Severely Past Due (90+ Days)',
      amount: amt90_plus,
      count: cnt90_plus,
      percentage: calcPct(amt90_plus),
      colorClass: 'text-[#ba1a1a]',
      badgeBgClass: 'bg-[#ffdad6] text-[#ba1a1a]',
      barColorClass: 'bg-[#ba1a1a]',
      borderClass: 'border-[#ba1a1a]/30',
      severity: 'critical',
    },
  ];

  return {
    totalOutstanding,
    totalInvoices,
    buckets,
    isZeroData,
  };
}

// ============================================================================
// Main Visual AR Aging Chart Component [FR-4]
// ============================================================================

export const ARAgingChart: React.FC<ARAgingChartProps> = ({
  data: propsData,
  initialParams,
  customerId: propsCustomerId,
  asOfDateVal: propsAsOfDateVal,
  onFilterChange,
  isLoading: propsIsLoading,
  error: propsError,
  onRetry,
  title = 'Accounts Receivable (AR) Aging',
  className,
  'data-testid': testId = 'ar-aging-chart-root',
}) => {
  // Local state management for internal fetch when propsData is omitted
  const [internalData, setInternalData] = useState<ARAgingMetrics | null>(null);
  const [internalLoading, setInternalLoading] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Filter input states
  const [customerIdInput, setCustomerIdInput] = useState<string>(
    propsCustomerId || initialParams?.customer_id || ''
  );
  const [asOfDateInput, setAsOfDateInput] = useState<string>(
    propsAsOfDateVal || initialParams?.as_of_date_val || ''
  );

  const activeCustomerId = propsCustomerId !== undefined ? propsCustomerId : customerIdInput;
  const activeAsOfDate = propsAsOfDateVal !== undefined ? propsAsOfDateVal : asOfDateInput;

  // Active metrics data preference
  const metricsData = propsData !== undefined ? propsData : internalData;
  const isLoading = propsIsLoading !== undefined ? propsIsLoading : internalLoading;
  const errorObj = propsError !== undefined ? propsError : internalError;
  const errorMessage =
    typeof errorObj === 'string'
      ? errorObj
      : errorObj instanceof Error
      ? errorObj.message
      : errorObj
      ? 'Failed to load AR aging metrics.'
      : null;

  // Fetch metrics internally if data prop is not controlled
  const fetchMetrics = useCallback(async () => {
    if (propsData !== undefined) return;

    setInternalLoading(true);
    setInternalError(null);

    try {
      const params: GetARAgingParams = {};
      if (activeCustomerId.trim()) {
        params.customer_id = activeCustomerId.trim();
      }
      if (activeAsOfDate.trim()) {
        params.as_of_date_val = activeAsOfDate.trim();
      }

      const res = await getARAgingMetrics(params);
      setInternalData(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error fetching AR aging data';
      setInternalError(msg);
    } finally {
      setInternalLoading(false);
    }
  }, [propsData, activeCustomerId, activeAsOfDate]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Sync props filter inputs
  useEffect(() => {
    if (propsCustomerId !== undefined) {
      setCustomerIdInput(propsCustomerId);
    }
  }, [propsCustomerId]);

  useEffect(() => {
    if (propsAsOfDateVal !== undefined) {
      setAsOfDateInput(propsAsOfDateVal);
    }
  }, [propsAsOfDateVal]);

  // Aggregated totals summary
  const summary = useMemo(() => calculateARTotals(metricsData), [metricsData]);

  // Handle filter submit / apply
  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params: GetARAgingParams = {
      customer_id: customerIdInput.trim() || undefined,
      as_of_date_val: asOfDateInput.trim() || undefined,
    };
    if (onFilterChange) {
      onFilterChange(params);
    }
    if (propsData === undefined) {
      fetchMetrics();
    }
  };

  const handleClearFilters = () => {
    setCustomerIdInput('');
    setAsOfDateInput('');
    const params: GetARAgingParams = {};
    if (onFilterChange) {
      onFilterChange(params);
    }
    if (propsData === undefined) {
      // Re-fetch with empty params
      setInternalLoading(true);
      getARAgingMetrics({})
        .then((res) => setInternalData(res))
        .catch((err) => setInternalError(err instanceof Error ? err.message : 'Error clearing filters'))
        .finally(() => setInternalLoading(false));
    }
  };

  const handleRetryClick = () => {
    if (onRetry) {
      onRetry();
    }
    if (propsData === undefined) {
      fetchMetrics();
    }
  };

  return (
    <section
      data-testid={testId}
      aria-label={title}
      role="region"
      className={cn(
        'w-full bg-[#fbf9f4] border border-[#d1c4b9] rounded-lg p-6 shadow-sm text-[#1b1c19]',
        className
      )}
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#d1c4b9]/60">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#59452b]" aria-hidden="true" />
            <h2 className="text-xl font-serif font-medium text-[#1b1c19] tracking-tight">
              {title}
            </h2>
          </div>
          <p className="text-xs text-[#4e453d] mt-1">
            Visual distribution of outstanding receivables segmented by due date duration buckets (0–30, 31–60, 61–90, 90+ days).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRetryClick}
            disabled={isLoading}
            data-testid="ar-aging-refresh-btn"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-[#80756b]',
              'bg-[#f5f3ee] text-[#1b1c19] hover:bg-[#eae8e3] transition-colors focus-visible:outline',
              isLoading && 'opacity-60 cursor-not-allowed'
            )}
            aria-label="Refresh AR aging data"
          >
            <RotateCw className={cn('w-3.5 h-3.5 text-[#59452b]', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <form
        onSubmit={handleApplyFilters}
        data-testid="ar-aging-filter-form"
        className="my-4 p-3 bg-[#f5f3ee] border border-[#d1c4b9]/50 rounded-md flex flex-wrap items-center gap-3"
      >
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#4e453d]">
          <Filter className="w-3.5 h-3.5 text-[#735c41]" aria-hidden="true" />
          <span>Filters:</span>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="ar-customer-id-filter" className="sr-only">
            Filter by Customer ID
          </label>
          <div className="relative">
            <Building2 className="w-3.5 h-3.5 text-[#80756b] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="ar-customer-id-filter"
              type="text"
              placeholder="Customer ID..."
              value={customerIdInput}
              onChange={(e) => setCustomerIdInput(e.target.value)}
              data-testid="ar-customer-filter-input"
              className="pl-8 pr-3 py-1 text-xs border border-[#d1c4b9] rounded bg-white text-[#1b1c19] placeholder:text-[#80756b] focus:outline-none focus:ring-1 focus:ring-[#735c41]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="ar-as-of-date-filter" className="sr-only">
            Filter by As-Of Evaluation Date
          </label>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-[#80756b] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              id="ar-as-of-date-filter"
              type="date"
              placeholder="As-Of Date"
              value={asOfDateInput}
              onChange={(e) => setAsOfDateInput(e.target.value)}
              data-testid="ar-date-filter-input"
              className="pl-8 pr-3 py-1 text-xs border border-[#d1c4b9] rounded bg-white text-[#1b1c19] focus:outline-none focus:ring-1 focus:ring-[#735c41]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="submit"
            data-testid="ar-filter-submit-btn"
            className="px-3 py-1 text-xs font-medium bg-[#59452b] text-white rounded hover:bg-[#735c41] transition-colors focus-visible:outline"
          >
            Apply
          </button>
          {(customerIdInput || asOfDateInput) && (
            <button
              type="button"
              onClick={handleClearFilters}
              data-testid="ar-filter-clear-btn"
              className="px-2.5 py-1 text-xs font-medium border border-[#80756b] text-[#4e453d] bg-white rounded hover:bg-[#f5f3ee] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Error Banner State */}
      {errorMessage && (
        <div
          data-testid="ar-aging-error"
          role="alert"
          className="mb-6 p-4 rounded-md bg-[#ffdad6] border border-[#ba1a1a]/30 text-[#93000a] flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-[#ba1a1a] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <h3 className="text-sm font-medium">Unable to display AR aging chart</h3>
            <p className="text-xs mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={handleRetryClick}
            data-testid="ar-aging-retry-btn"
            className="px-3 py-1 text-xs font-medium rounded bg-[#ba1a1a] text-white hover:bg-[#93000a] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading ? (
        <div
          data-testid="ar-aging-loading"
          aria-busy="true"
          aria-label="Loading AR aging metrics..."
          className="py-12 flex flex-col items-center justify-center gap-3 text-center"
        >
          <RotateCw className="w-8 h-8 text-[#735c41] animate-spin" aria-hidden="true" />
          <span className="text-sm font-medium text-[#4e453d]">Calculating duration bucket totals...</span>
          <div className="w-full max-w-md h-3 bg-[#e4e2dd] rounded-full overflow-hidden mt-2 animate-pulse">
            <div className="h-full bg-[#735c41]/40 w-2/3"></div>
          </div>
        </div>
      ) : summary.isZeroData ? (
        /* Zero-Data Empty State */
        <div
          data-testid="ar-aging-empty-state"
          aria-label="Zero data empty state"
          className="my-4 p-8 rounded-lg border-2 border-dashed border-[#d1c4b9] bg-[#f5f3ee]/60 text-center flex flex-col items-center justify-center gap-3"
        >
          <div className="w-12 h-12 rounded-full bg-[#f0eee9] flex items-center justify-center text-[#59452b] shadow-inner">
            <ShieldCheck className="w-6 h-6 text-[#59452b]" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-serif font-medium text-[#1b1c19]">
              No Outstanding Receivables
            </h3>
            <p className="text-xs text-[#4e453d] max-w-md mx-auto mt-1">
              All client invoices are fully settled or no past-due balances exist across duration buckets (0–30, 31–60, 61–90, and 90+ days).
            </p>
          </div>

          {/* Zero Summary Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl mt-4">
            {summary.buckets.map((b) => (
              <div
                key={b.id}
                data-testid={`empty-bucket-${b.id}`}
                className="p-3 bg-white border border-[#d1c4b9]/60 rounded text-center shadow-2xs"
              >
                <div className="text-[11px] font-medium text-[#80756b] uppercase tracking-wider">
                  {b.label}
                </div>
                <div className="text-sm font-semibold text-[#1b1c19] mt-1">
                  {formatCurrency(0)}
                </div>
                <div className="text-[10px] text-[#4e453d] mt-0.5">
                  {formatInvoiceCount(0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Populated Data State */
        <div className="mt-6 space-y-6" data-testid="ar-aging-content">
          {/* Summary Metric Header Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-[#d1c4b9] rounded-md shadow-2xs">
              <span className="text-xs font-medium text-[#80756b] uppercase tracking-wider">
                Total Outstanding AR
              </span>
              <div className="text-2xl font-serif font-semibold text-[#1b1c19] mt-1">
                {formatCurrency(summary.totalOutstanding)}
              </div>
              <span className="inline-block mt-1 text-xs text-[#4e453d]">
                Across all active duration buckets
              </span>
            </div>

            <div className="p-4 bg-white border border-[#d1c4b9] rounded-md shadow-2xs">
              <span className="text-xs font-medium text-[#80756b] uppercase tracking-wider">
                Total Outstanding Invoices
              </span>
              <div className="text-2xl font-serif font-semibold text-[#1b1c19] mt-1">
                {summary.totalInvoices.toLocaleString('en-US')}
              </div>
              <span className="inline-block mt-1 text-xs text-[#4e453d]">
                Unpaid invoice records
              </span>
            </div>

            <div className="p-4 bg-white border border-[#d1c4b9] rounded-md shadow-2xs sm:col-span-2 lg:col-span-1">
              <span className="text-xs font-medium text-[#80756b] uppercase tracking-wider">
                High Risk Exposure (61+ Days)
              </span>
              {(() => {
                const highRiskAmount =
                  (summary.buckets.find((b) => b.id === 'bucket_61_90')?.amount || 0) +
                  (summary.buckets.find((b) => b.id === 'bucket_90_plus')?.amount || 0);
                const highRiskPct =
                  summary.totalOutstanding > 0
                    ? (highRiskAmount / summary.totalOutstanding) * 100
                    : 0;
                return (
                  <>
                    <div
                      className={cn(
                        'text-2xl font-serif font-semibold mt-1',
                        highRiskAmount > 0 ? 'text-[#ba1a1a]' : 'text-[#59452b]'
                      )}
                    >
                      {formatCurrency(highRiskAmount)}
                    </div>
                    <span className="inline-block mt-1 text-xs text-[#4e453d]">
                      {formatPercent(highRiskPct)} of total outstanding balance
                    </span>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Visual Proportion Bar */}
          <div className="p-4 bg-[#f5f3ee] border border-[#d1c4b9] rounded-md">
            <div className="flex items-center justify-between text-xs font-medium text-[#4e453d] mb-2">
              <span>Visual Proportion Distribution</span>
              <span>100% Total AR</span>
            </div>

            <div
              className="w-full h-5 bg-[#e4e2dd] rounded overflow-hidden flex shadow-inner"
              role="img"
              aria-label="Visual AR Aging Duration Distribution Bar"
            >
              {summary.buckets.map((bucket) => {
                if (bucket.percentage <= 0) return null;
                return (
                  <div
                    key={bucket.id}
                    style={{ width: `${bucket.percentage}%` }}
                    className={cn(
                      bucket.barColorClass,
                      'h-full transition-all duration-300 relative group cursor-pointer'
                    )}
                    title={`${bucket.label}: ${formatCurrency(bucket.amount)} (${formatPercent(
                      bucket.percentage
                    )})`}
                  >
                    <span className="sr-only">
                      {bucket.label}: {formatCurrency(bucket.amount)} ({formatPercent(bucket.percentage)})
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend underneath bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3 text-xs">
              {summary.buckets.map((bucket) => (
                <div key={bucket.id} className="flex items-center gap-1.5">
                  <span
                    className={cn('w-2.5 h-2.5 rounded-full inline-block', bucket.barColorClass)}
                    aria-hidden="true"
                  />
                  <span className="font-medium text-[#1b1c19]">{bucket.label}:</span>
                  <span className="text-[#4e453d]">{formatPercent(bucket.percentage)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Duration Bucket Cards Grid [FR-4] */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {summary.buckets.map((bucket) => (
              <div
                key={bucket.id}
                data-testid={`ar-bucket-card-${bucket.id}`}
                className={cn(
                  'p-4 bg-white border rounded-md shadow-2xs flex flex-col justify-between transition-all',
                  bucket.borderClass
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#80756b] uppercase tracking-wider">
                      {bucket.label}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        bucket.badgeBgClass
                      )}
                    >
                      {bucket.severity.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="text-xl font-serif font-bold text-[#1b1c19]">
                      {formatCurrency(bucket.amount)}
                    </div>
                    <div className="text-xs text-[#4e453d] mt-1 font-medium">
                      {formatInvoiceCount(bucket.count)}
                    </div>
                  </div>
                </div>

                {/* Individual bucket percentage bar */}
                <div className="mt-4 pt-3 border-t border-[#f0eee9]">
                  <div className="flex items-center justify-between text-[11px] text-[#4e453d] mb-1">
                    <span>Share of AR</span>
                    <span className="font-semibold text-[#1b1c19]">
                      {formatPercent(bucket.percentage)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#f0eee9] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, bucket.percentage)}%` }}
                      className={cn('h-full rounded-full', bucket.barColorClass)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default ARAgingChart;
