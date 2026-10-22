'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Filter,
  ArrowUpDown,
  RotateCw,
  AlertCircle,
  BarChart3,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  DollarSign,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import {
  getChannelAcquisitionReport,
  ChannelAcquisitionReportItem,
  ChannelAcquisitionQueryParams,
  AcquisitionSortField,
  SortOrder,
} from '../../services/analytics';
import { cn } from '../../lib/utils';

// ============================================================================
// Types & Props Contract
// ============================================================================

export interface AcquisitionReportProps {
  /**
   * Pre-loaded data items. If provided, the component can display them directly
   * or refetch when filters change.
   */
  data?: ChannelAcquisitionReportItem[];

  /**
   * Initial query parameters for channel acquisition filtering and sorting.
   */
  initialFilters?: ChannelAcquisitionQueryParams;

  /**
   * Callback invoked whenever filter inputs or sort configurations are changed.
   */
  onFilterChange?: (filters: ChannelAcquisitionQueryParams) => void;

  /**
   * Controlled loading indicator flag.
   */
  isLoading?: boolean;

  /**
   * Controlled error message or Error object.
   */
  error?: string | Error | null;

  /**
   * Callback for retrying data fetch upon error.
   */
  onRetry?: () => void;

  /**
   * Custom CSS class name to append to the container.
   */
  className?: string;

  /**
   * Testing identifier.
   */
  'data-testid'?: string;
}

// ============================================================================
// Formatting & Helper Functions
// ============================================================================

/**
 * Formats channel ROI. Displays "N/A" for zero or missing spend to prevent division errors [FR-003, spec.md Edge Cases].
 */
export function formatROI(
  spend: number | null | undefined,
  roiStr?: string | null,
  roiVal?: number | null
): string {
  if (spend === 0 || spend === null || spend === undefined) {
    return 'N/A';
  }

  if (roiStr && roiStr.trim() !== '') {
    if (roiStr.toUpperCase() === 'N/A') {
      return 'N/A';
    }
    return roiStr;
  }

  if (roiVal !== null && roiVal !== undefined) {
    const formatted = Math.abs(roiVal) < 0.01 ? '0.00%' : `${roiVal.toFixed(2)}%`;
    return roiVal > 0 ? `+${formatted}` : formatted;
  }

  return 'N/A';
}

/**
 * Formats numeric currency values into standard USD currency string ($#,##0.00).
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '$0.00';
  }

  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats lead quality score to 1 decimal place or "N/A".
 */
export function formatQualityScore(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return 'N/A';
  }
  return score.toFixed(1);
}

/**
 * Helper to compute aggregate summary metrics across channel report items.
 */
export interface SummaryMetrics {
  totalLeads: number;
  totalSpend: number;
  totalRevenue: number;
  avgQualityScore: number;
  overallROIStr: string;
  overallROIVal: number | null;
}

export function computeSummaryMetrics(items: ChannelAcquisitionReportItem[]): SummaryMetrics {
  if (!items || items.length === 0) {
    return {
      totalLeads: 0,
      totalSpend: 0,
      totalRevenue: 0,
      avgQualityScore: 0,
      overallROIStr: 'N/A',
      overallROIVal: null,
    };
  }

  let totalLeads = 0;
  let totalSpend = 0;
  let totalRevenue = 0;
  let totalQualityScoreSum = 0;
  let qualityCount = 0;

  for (const item of items) {
    totalLeads += item.lead_volume || 0;
    totalSpend += item.spend || 0;
    totalRevenue += item.revenue || 0;
    if (item.quality_score !== null && item.quality_score !== undefined) {
      totalQualityScoreSum += item.quality_score;
      qualityCount += 1;
    }
  }

  const avgQualityScore = qualityCount > 0 ? totalQualityScoreSum / qualityCount : 0;

  let overallROIVal: number | null = null;
  let overallROIStr = 'N/A';

  if (totalSpend > 0) {
    overallROIVal = ((totalRevenue - totalSpend) / totalSpend) * 100;
    const formatted = Math.abs(overallROIVal) < 0.01 ? '0.00%' : `${overallROIVal.toFixed(2)}%`;
    overallROIStr = overallROIVal > 0 ? `+${formatted}` : formatted;
  }

  return {
    totalLeads,
    totalSpend,
    totalRevenue,
    avgQualityScore,
    overallROIStr,
    overallROIVal,
  };
}

/**
 * Perform client-side sorting on channel items according to sort_by field and sort_order.
 */
export function sortAcquisitionItems(
  items: ChannelAcquisitionReportItem[],
  sortBy: AcquisitionSortField = 'quality_score',
  sortOrder: SortOrder = 'desc'
): ChannelAcquisitionReportItem[] {
  if (!items || items.length === 0) return [];

  const copy = [...items];
  const isDesc = sortOrder.toLowerCase() === 'desc';

  copy.sort((a, b) => {
    let valA: number | string = 0;
    let valB: number | string = 0;

    switch (sortBy) {
      case 'quality_score':
        valA = a.quality_score ?? -1;
        valB = b.quality_score ?? -1;
        break;
      case 'lead_volume':
        valA = a.lead_volume ?? 0;
        valB = b.lead_volume ?? 0;
        break;
      case 'spend':
        valA = a.spend ?? 0;
        valB = b.spend ?? 0;
        break;
      case 'revenue':
        valA = a.revenue ?? 0;
        valB = b.revenue ?? 0;
        break;
      case 'roi': {
        // Zero spend means ROI is "N/A" -> treat as -Infinity for desc sorting so zero spend drops to bottom
        valA = a.spend === 0 || a.spend === null ? -Infinity : (a.roi ?? -Infinity);
        valB = b.spend === 0 || b.spend === null ? -Infinity : (b.roi ?? -Infinity);
        break;
      }
      case 'channel_name':
        valA = (a.channel_name || '').toLowerCase();
        valB = (b.channel_name || '').toLowerCase();
        break;
      default:
        valA = a.quality_score ?? 0;
        valB = b.quality_score ?? 0;
        break;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return isDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
    }

    const numA = Number(valA);
    const numB = Number(valB);

    if (numA < numB) return isDesc ? 1 : -1;
    if (numA > numB) return isDesc ? -1 : 1;
    return 0;
  });

  return copy;
}

// ============================================================================
// Main UI Component
// ============================================================================

export const AcquisitionReport: React.FC<AcquisitionReportProps> = ({
  data: propsData,
  initialFilters,
  onFilterChange,
  isLoading: propsIsLoading,
  error: propsError,
  onRetry: propsOnRetry,
  className,
  'data-testid': testId = 'acquisition-report',
}) => {
  // Filter state
  const [startDate, setStartDate] = useState<string>(
    initialFilters?.start_date_val
      ? typeof initialFilters.start_date_val === 'string'
        ? initialFilters.start_date_val
        : initialFilters.start_date_val.toISOString().split('T')[0]
      : ''
  );

  const [endDate, setEndDate] = useState<string>(
    initialFilters?.end_date_val
      ? typeof initialFilters.end_date_val === 'string'
        ? initialFilters.end_date_val
        : initialFilters.end_date_val.toISOString().split('T')[0]
      : ''
  );

  const [channelFilter, setChannelFilter] = useState<string>(initialFilters?.channel_id || '');
  const [sortBy, setSortBy] = useState<AcquisitionSortField>(
    initialFilters?.sort_by || 'quality_score'
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialFilters?.sort_order || 'desc');

  // Internal data & fetch states
  const [internalData, setInternalData] = useState<ChannelAcquisitionReportItem[]>(
    propsData || []
  );
  const [internalLoading, setInternalLoading] = useState<boolean>(!propsData && !propsIsLoading);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Sync props data if passed
  useEffect(() => {
    if (propsData) {
      setInternalData(propsData);
    }
  }, [propsData]);

  // Combined state flags
  const isLoading = propsIsLoading !== undefined ? propsIsLoading : internalLoading;
  const rawError = propsError !== undefined ? propsError : internalError;
  const errorMsg = rawError
    ? typeof rawError === 'string'
      ? rawError
      : rawError.message || 'Failed to load acquisition report.'
    : null;

  // Fetch function
  const fetchReport = useCallback(
    async (overrideParams?: ChannelAcquisitionQueryParams) => {
      setInternalLoading(true);
      setInternalError(null);

      const queryParams: ChannelAcquisitionQueryParams = {
        start_date_val: startDate || null,
        end_date_val: endDate || null,
        channel_id: channelFilter || null,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...overrideParams,
      };

      try {
        const result = await getChannelAcquisitionReport(queryParams);
        setInternalData(result);
        if (onFilterChange) {
          onFilterChange(queryParams);
        }
      } catch (err: any) {
        setInternalError(err.message || 'Failed to fetch acquisition report data.');
      } finally {
        setInternalLoading(false);
      }
    },
    [startDate, endDate, channelFilter, sortBy, sortOrder, onFilterChange]
  );

  // Auto-fetch on mount if no initial prop data provided
  useEffect(() => {
    if (!propsData) {
      fetchReport();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Apply Filters
  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchReport();
  };

  // Handle Reset Filters
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setChannelFilter('');
    setSortBy('quality_score');
    setSortOrder('desc');

    if (!propsData) {
      fetchReport({
        start_date_val: null,
        end_date_val: null,
        channel_id: null,
        sort_by: 'quality_score',
        sort_order: 'desc',
      });
    }
  };

  // Quick Action: Sort by Quality Score Descending [FR-002, spec.md Scenario 1.2]
  const handleSortQualityScoreDesc = () => {
    setSortBy('quality_score');
    setSortOrder('desc');

    if (!propsData) {
      fetchReport({ sort_by: 'quality_score', sort_order: 'desc' });
    }
  };

  // Toggle Table Header Sort
  const handleHeaderSort = (field: AcquisitionSortField) => {
    let newOrder: SortOrder = 'desc';
    if (sortBy === field) {
      newOrder = sortOrder === 'desc' ? 'asc' : 'desc';
    } else if (field === 'channel_name') {
      newOrder = 'asc';
    }

    setSortBy(field);
    setSortOrder(newOrder);

    if (!propsData) {
      fetchReport({ sort_by: field, sort_order: newOrder });
    }
  };

  // Process and sort data items locally
  const displayItems = useMemo(() => {
    let items = [...internalData];

    // Filter by channel_id or channel_name client-side if channelFilter set
    if (channelFilter.trim() !== '') {
      const query = channelFilter.toLowerCase().trim();
      items = items.filter(
        (item) =>
          item.channel_id.toLowerCase().includes(query) ||
          item.channel_name.toLowerCase().includes(query)
      );
    }

    return sortAcquisitionItems(items, sortBy, sortOrder);
  }, [internalData, channelFilter, sortBy, sortOrder]);

  // Aggregate metrics summary
  const summary = useMemo(() => computeSummaryMetrics(displayItems), [displayItems]);

  const handleRetryClick = () => {
    if (propsOnRetry) {
      propsOnRetry();
    } else {
      fetchReport();
    }
  };

  return (
    <div
      className={cn('space-y-6 text-[#1b1c19]', className)}
      data-testid={testId}
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e4e2dd] pb-4">
        <div>
          <h2 className="text-2xl font-serif font-normal text-[#59452b] tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#735c41]" aria-hidden="true" />
            Channel Acquisition & ROI Report
          </h2>
          <p className="text-sm text-[#80756b] mt-1">
            Analyze attributed lead volume, marketing spend, revenue attribution, lead quality scores, and channel ROI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSortQualityScoreDesc}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 border',
              sortBy === 'quality_score' && sortOrder === 'desc'
                ? 'bg-[#59452b] text-white border-[#59452b] shadow-sm'
                : 'bg-white text-[#59452b] border-[#d1c4b9] hover:bg-[#f5f3ee]'
            )}
            data-testid="btn-sort-quality-desc"
            aria-label="Sort channels by lead quality score descending"
          >
            <Award className="w-3.5 h-3.5" aria-hidden="true" />
            Top Quality Sources
          </button>

          <button
            type="button"
            onClick={() => fetchReport()}
            disabled={isLoading}
            className="p-1.5 text-[#59452b] bg-white border border-[#d1c4b9] rounded hover:bg-[#f5f3ee] transition-colors disabled:opacity-50"
            data-testid="btn-refresh"
            aria-label="Refresh report data"
            title="Refresh Report Data"
          >
            <RotateCw className={cn('w-4 h-4', isLoading && 'animate-spin')} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <form
        onSubmit={handleApplyFilters}
        className="bg-[#f0eee9] p-4 rounded-lg border border-[#e4e2dd] space-y-3"
        data-testid="filter-bar"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Start Date */}
          <div className="space-y-1">
            <label htmlFor="filter-start-date" className="block text-xs font-medium text-[#4e453d]">
              Start Date
            </label>
            <div className="relative">
              <input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#80756b] rounded text-[#1b1c19] focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                data-testid="filter-start-date"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label htmlFor="filter-end-date" className="block text-xs font-medium text-[#4e453d]">
              End Date
            </label>
            <div className="relative">
              <input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-[#80756b] rounded text-[#1b1c19] focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                data-testid="filter-end-date"
              />
            </div>
          </div>

          {/* Channel Search / Filter */}
          <div className="space-y-1">
            <label htmlFor="filter-channel" className="block text-xs font-medium text-[#4e453d]">
              Channel Filter
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#80756b]" aria-hidden="true" />
              <input
                id="filter-channel"
                type="text"
                placeholder="Search or Channel ID..."
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#80756b] rounded text-[#1b1c19] focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                data-testid="filter-channel"
              />
            </div>
          </div>

          {/* Sort By Select */}
          <div className="space-y-1">
            <label htmlFor="sort-by-select" className="block text-xs font-medium text-[#4e453d]">
              Sort By Field
            </label>
            <div className="flex gap-1.5">
              <select
                id="sort-by-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as AcquisitionSortField)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#80756b] rounded text-[#1b1c19] focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                data-testid="sort-by-select"
              >
                <option value="quality_score">Quality Score</option>
                <option value="lead_volume">Lead Volume</option>
                <option value="spend">Spend</option>
                <option value="revenue">Revenue</option>
                <option value="roi">ROI</option>
                <option value="channel_name">Channel Name</option>
              </select>

              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                className="px-2.5 py-1.5 bg-white border border-[#80756b] rounded text-[#59452b] hover:bg-[#f5f3ee] text-xs font-medium flex items-center justify-center shrink-0"
                data-testid="sort-order-toggle"
                aria-label={`Toggle sort order, currently ${sortOrder === 'desc' ? 'descending' : 'ascending'}`}
                title={`Order: ${sortOrder.toUpperCase()}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="ml-1 uppercase text-[10px]">{sortOrder}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#e4e2dd]/60">
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3 py-1.5 text-xs font-medium text-[#4e453d] bg-white border border-[#d1c4b9] rounded hover:bg-[#f5f3ee] transition-colors"
            data-testid="btn-reset-filters"
          >
            Reset Filters
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-medium text-white bg-[#59452b] rounded hover:bg-[#735c41] transition-colors flex items-center gap-1 shadow-sm"
            data-testid="btn-apply-filters"
          >
            <Filter className="w-3.5 h-3.5" aria-hidden="true" />
            Apply Filters
          </button>
        </div>
      </form>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3" data-testid="summary-cards">
        {/* Total Attributed Leads */}
        <div className="bg-[#f5f3ee] p-3.5 rounded-lg border border-[#e4e2dd] space-y-1">
          <span className="text-[11px] font-medium tracking-wide uppercase text-[#80756b] flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#735c41]" aria-hidden="true" />
            Attributed Leads
          </span>
          <div className="text-xl font-serif font-semibold text-[#1b1c19]" data-testid="summary-total-leads">
            {summary.totalLeads.toLocaleString('en-US')}
          </div>
        </div>

        {/* Total Spend */}
        <div className="bg-[#f5f3ee] p-3.5 rounded-lg border border-[#e4e2dd] space-y-1">
          <span className="text-[11px] font-medium tracking-wide uppercase text-[#80756b] flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-[#735c41]" aria-hidden="true" />
            Total Spend
          </span>
          <div className="text-xl font-serif font-semibold text-[#1b1c19]" data-testid="summary-total-spend">
            {formatCurrency(summary.totalSpend)}
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-[#f5f3ee] p-3.5 rounded-lg border border-[#e4e2dd] space-y-1">
          <span className="text-[11px] font-medium tracking-wide uppercase text-[#80756b] flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            Attributed Revenue
          </span>
          <div className="text-xl font-serif font-semibold text-[#1b1c19]" data-testid="summary-total-revenue">
            {formatCurrency(summary.totalRevenue)}
          </div>
        </div>

        {/* Overall ROI */}
        <div className="bg-[#f5f3ee] p-3.5 rounded-lg border border-[#e4e2dd] space-y-1">
          <span className="text-[11px] font-medium tracking-wide uppercase text-[#80756b] flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5 text-[#735c41]" aria-hidden="true" />
            Overall ROI
          </span>
          <div
            className={cn(
              'text-xl font-serif font-semibold',
              summary.overallROIStr === 'N/A'
                ? 'text-[#80756b]'
                : (summary.overallROIVal ?? 0) >= 0
                ? 'text-emerald-800'
                : 'text-red-700'
            )}
            data-testid="summary-overall-roi"
          >
            {summary.overallROIStr}
          </div>
        </div>

        {/* Avg Quality Score */}
        <div className="bg-[#f5f3ee] p-3.5 rounded-lg border border-[#e4e2dd] space-y-1 col-span-2 md:col-span-1">
          <span className="text-[11px] font-medium tracking-wide uppercase text-[#80756b] flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
            Avg Quality Score
          </span>
          <div className="text-xl font-serif font-semibold text-[#1b1c19]" data-testid="summary-avg-quality-score">
            {formatQualityScore(summary.avgQualityScore)}
          </div>
        </div>
      </div>

      {/* Error Alert State */}
      {errorMsg && (
        <div
          className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start justify-between gap-3"
          data-testid="error-alert"
          role="alert"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Failed to Load Report</p>
              <p className="text-xs text-red-700 mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetryClick}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 text-xs font-medium rounded transition-colors shrink-0"
            data-testid="btn-retry"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Spinner State */}
      {isLoading ? (
        <div
          className="bg-white p-12 rounded-lg border border-[#e4e2dd] flex flex-col items-center justify-center space-y-3"
          data-testid="loading-spinner"
        >
          <RotateCw className="w-8 h-8 text-[#735c41] animate-spin" aria-hidden="true" />
          <p className="text-sm font-medium text-[#4e453d]">Fetching channel acquisition metrics...</p>
        </div>
      ) : displayItems.length === 0 ? (
        /* Empty State */
        <div
          className="bg-white p-12 rounded-lg border border-[#e4e2dd] text-center space-y-3"
          data-testid="empty-state"
        >
          <XCircle className="w-10 h-10 text-[#80756b] mx-auto opacity-60" aria-hidden="true" />
          <h3 className="text-base font-serif font-medium text-[#59452b]">No Channel Acquisition Data Found</h3>
          <p className="text-xs text-[#80756b] max-w-md mx-auto">
            No marketing channels match your selected filters. Try clearing or expanding your date range or channel search query.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-1.5 bg-[#f0eee9] hover:bg-[#eae8e3] text-[#59452b] border border-[#d1c4b9] text-xs font-medium rounded transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Channels Data Table */
        <div className="bg-white rounded-lg border border-[#e4e2dd] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table
              className="w-full text-left text-xs text-[#1b1c19]"
              data-testid="acquisition-table"
              role="table"
              aria-label="Channel Acquisition and ROI Performance Breakdown"
            >
              <thead className="bg-[#f0eee9] text-[#4e453d] font-medium border-b border-[#e4e2dd] uppercase tracking-wider text-[11px]">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 cursor-pointer hover:bg-[#eae8e3] transition-colors"
                    onClick={() => handleHeaderSort('channel_name')}
                    aria-sort={
                      sortBy === 'channel_name' ? (sortOrder === 'desc' ? 'descending' : 'ascending') : 'none'
                    }
                  >
                    <div className="flex items-center gap-1">
                      <span>Channel Source</span>
                      <ArrowUpDown className="w-3 h-3 text-[#80756b]" aria-hidden="true" />
                    </div>
                  </th>

                  <th
                    scope="col"
                    className="px-4 py-3 text-right cursor-pointer hover:bg-[#eae8e3] transition-colors"
                    onClick={() => handleHeaderSort('lead_volume')}
                    aria-sort={
                      sortBy === 'lead_volume' ? (sortOrder === 'desc' ? 'descending' : 'ascending') : 'none'
                    }
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Attributed Leads</span>
                      <ArrowUpDown className="w-3 h-3 text-[#80756b]" aria-hidden="true" />
                    </div>
                  </th>

                  <th
                    scope="col"
                    className="px-4 py-3 text-center cursor-pointer hover:bg-[#eae8e3] transition-colors"
                    onClick={() => handleHeaderSort('quality_score')}
                    aria-sort={
                      sortBy === 'quality_score' ? (sortOrder === 'desc' ? 'descending' : 'ascending') : 'none'
                    }
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Lead Quality Score</span>
                      <ArrowUpDown className="w-3 h-3 text-[#80756b]" aria-hidden="true" />
                    </div>
                  </th>

                  <th
                    scope="col"
                    className="px-4 py-3 text-right cursor-pointer hover:bg-[#eae8e3] transition-colors"
                    onClick={() => handleHeaderSort('spend')}
                    aria-sort={
                      sortBy === 'spend' ? (sortOrder === 'desc' ? 'descending' : 'ascending') : 'none'
                    }
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Marketing Spend</span>
                      <ArrowUpDown className="w-3 h-3 text-[#80756b]" aria-hidden="true" />
                    </div>
                  </th>

                  <th
                    scope="col"
                    className="px-4 py-3 text-right cursor-pointer hover:bg-[#eae8e3] transition-colors"
                    onClick={() => handleHeaderSort('revenue')}
                    aria-sort={
                      sortBy === 'revenue' ? (sortOrder === 'desc' ? 'descending' : 'ascending') : 'none'
                    }
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Attributed Revenue</span>
                      <ArrowUpDown className="w-3 h-3 text-[#80756b]" aria-hidden="true" />
                    </div>
                  </th>

                  <th
                    scope="col"
                    className="px-4 py-3 text-right cursor-pointer hover:bg-[#eae8e3] transition-colors"
                    onClick={() => handleHeaderSort('roi')}
                    aria-sort={
                      sortBy === 'roi' ? (sortOrder === 'desc' ? 'descending' : 'ascending') : 'none'
                    }
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Calculated ROI</span>
                      <ArrowUpDown className="w-3 h-3 text-[#80756b]" aria-hidden="true" />
                    </div>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#e4e2dd]">
                {displayItems.map((item) => {
                  const formattedRoi = formatROI(item.spend, item.roi_str, item.roi);
                  const isZeroSpend = item.spend === 0 || item.spend === null || item.spend === undefined;
                  const score = item.quality_score;

                  return (
                    <tr
                      key={item.channel_id}
                      className="hover:bg-[#fbf9f4] transition-colors"
                      data-testid={`channel-row-${item.channel_id}`}
                    >
                      {/* Channel Name */}
                      <td className="px-4 py-3 font-medium text-[#1b1c19]">
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-[#59452b]">{item.channel_name}</span>
                          <span className="text-[10px] text-[#80756b] font-mono">{item.channel_id}</span>
                        </div>
                      </td>

                      {/* Attributed Leads */}
                      <td className="px-4 py-3 text-right font-medium text-[#1b1c19]">
                        {item.lead_volume.toLocaleString('en-US')}
                      </td>

                      {/* Lead Quality Score Badge */}
                      <td className="px-4 py-3 text-center" data-testid={`quality-score-${item.channel_id}`}>
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                            score >= 80
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : score >= 60
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : score > 0
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : 'bg-gray-100 text-gray-700 border-gray-200'
                          )}
                        >
                          {formatQualityScore(score)}
                        </span>
                      </td>

                      {/* Spend */}
                      <td className="px-4 py-3 text-right text-[#4e453d]">
                        {formatCurrency(item.spend)}
                      </td>

                      {/* Revenue */}
                      <td className="px-4 py-3 text-right font-medium text-[#1b1c19]">
                        {formatCurrency(item.revenue)}
                      </td>

                      {/* ROI Cell with zero-spend N/A protection */}
                      <td className="px-4 py-3 text-right" data-testid={`roi-cell-${item.channel_id}`}>
                        {isZeroSpend || formattedRoi === 'N/A' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#eae8e3] text-[#80756b]">
                            N/A
                          </span>
                        ) : (
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
                              formattedRoi.startsWith('+') || (item.roi ?? 0) > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            )}
                          >
                            {formattedRoi}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-[#f0eee9] px-4 py-2 border-t border-[#e4e2dd] text-[11px] text-[#80756b] flex items-center justify-between">
            <span>
              Showing <strong>{displayItems.length}</strong> channel acquisition record
              {displayItems.length === 1 ? '' : 's'}
            </span>
            <span>Sorted by {String(sortBy).replace('_', ' ')} ({sortOrder.toUpperCase()})</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcquisitionReport;
