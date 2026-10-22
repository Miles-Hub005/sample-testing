'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Filter,
  RotateCw,
  Layers,
  ArrowDown,
  CheckCircle2,
  Calendar,
  HelpCircle,
  ChevronRight,
  Activity,
  XCircle,
  BarChart2,
  ShieldAlert,
} from 'lucide-react';
import {
  getConversionFunnelReport,
  FunnelStageItem,
  ConversionFunnelQueryParams,
} from '../../services/analytics';
import { cn } from '../../lib/utils';

// ============================================================================
// Types & Props Contract [FR-004, FR-005]
// ============================================================================

export interface ConversionFunnelProps {
  /**
   * Pre-loaded funnel stage items. If provided, used directly or refetched on filter changes.
   */
  data?: FunnelStageItem[];

  /**
   * Initial query parameters for filtering funnel data.
   */
  initialFilters?: ConversionFunnelQueryParams;

  /**
   * Callback invoked whenever filter criteria change.
   */
  onFilterChange?: (filters: ConversionFunnelQueryParams) => void;

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
   * Custom CSS class name to append to the root container.
   */
  className?: string;

  /**
   * Testing identifier.
   */
  'data-testid'?: string;
}

// ============================================================================
// Formatting & Helper Functions [FR-004, FR-005, NFR-001]
// ============================================================================

/**
 * Formats a percentage value to 1 decimal place with '%' symbol.
 * Handles null, undefined, or NaN gracefully.
 */
export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) {
    return '0.0%';
  }
  return `${val.toFixed(1)}%`;
}

/**
 * Formats numeric stage counts with standard comma separators ($#,##0).
 */
export function formatStageCount(count: number | null | undefined): string {
  if (count === null || count === undefined || Number.isNaN(count)) {
    return '0';
  }
  return Math.max(0, Math.round(count)).toLocaleString('en-US');
}

/**
 * Summary metrics aggregated across funnel stages.
 */
export interface FunnelSummaryMetrics {
  topStageCount: number;
  convertedCount: number;
  overallConversionRate: number;
  totalDropoffs: number;
  bottleneckCount: number;
}

/**
 * Computes summary metrics across funnel stages.
 */
export function computeFunnelSummary(stages: FunnelStageItem[]): FunnelSummaryMetrics {
  if (!stages || stages.length === 0) {
    return {
      topStageCount: 0,
      convertedCount: 0,
      overallConversionRate: 0,
      totalDropoffs: 0,
      bottleneckCount: 0,
    };
  }

  const topStageCount = stages[0]?.stage_count || 0;
  const convertedCount = stages[stages.length - 1]?.stage_count || 0;
  const overallConversionRate =
    topStageCount > 0 ? (convertedCount / topStageCount) * 100 : 0;
  const totalDropoffs = Math.max(0, topStageCount - convertedCount);

  const bottleneckCount = detectBottlenecks(stages).length;

  return {
    topStageCount,
    convertedCount,
    overallConversionRate,
    totalDropoffs,
    bottleneckCount,
  };
}

/**
 * Detects bottleneck stages where drop-off rate exceeds configured threshold or is_bottleneck is true.
 */
export function detectBottlenecks(stages: FunnelStageItem[]): FunnelStageItem[] {
  if (!stages || stages.length === 0) return [];
  return stages.filter(
    (stage) => stage.is_bottleneck || stage.dropoff_rate > stage.threshold_percent
  );
}

/**
 * Calculates lead count lost from previous stage.
 */
export function calculateStageLoss(stages: FunnelStageItem[], index: number): number {
  if (index <= 0 || !stages || index >= stages.length) return 0;
  const prevCount = stages[index - 1]?.stage_count || 0;
  const currCount = stages[index]?.stage_count || 0;
  return Math.max(0, prevCount - currCount);
}

// ============================================================================
// Main Component: ConversionFunnel [FR-004, FR-005]
// ============================================================================

export const ConversionFunnel: React.FC<ConversionFunnelProps> = ({
  data: propsData,
  initialFilters,
  onFilterChange,
  isLoading: propsIsLoading,
  error: propsError,
  onRetry: propsOnRetry,
  className,
  'data-testid': testId = 'conversion-funnel',
}) => {
  // Filter state
  const [funnelId, setFunnelId] = useState<string>(initialFilters?.funnel_id || '');
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
  const [channelId, setChannelId] = useState<string>(initialFilters?.channel_id || '');
  const [campaignId, setCampaignId] = useState<string>(initialFilters?.campaign_id || '');
  const [territoryId, setTerritoryId] = useState<string>(initialFilters?.territory_id || '');

  // Internal data & fetch state
  const [internalData, setInternalData] = useState<FunnelStageItem[]>(propsData || []);
  const [internalLoading, setInternalLoading] = useState<boolean>(!propsData && !propsIsLoading);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Sync props data if provided
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
      : rawError.message || 'Failed to load conversion funnel data.'
    : null;

  // Fetch function
  const fetchReport = useCallback(
    async (overrideParams?: ConversionFunnelQueryParams) => {
      setInternalLoading(true);
      setInternalError(null);

      const queryParams: ConversionFunnelQueryParams = {
        funnel_id: funnelId || null,
        start_date_val: startDate || null,
        end_date_val: endDate || null,
        channel_id: channelId || null,
        campaign_id: campaignId || null,
        territory_id: territoryId || null,
        ...overrideParams,
      };

      try {
        const result = await getConversionFunnelReport(queryParams);
        setInternalData(result);
        if (onFilterChange) {
          onFilterChange(queryParams);
        }
      } catch (err: any) {
        setInternalError(err.message || 'Failed to fetch conversion funnel report data.');
      } finally {
        setInternalLoading(false);
      }
    },
    [funnelId, startDate, endDate, channelId, campaignId, territoryId, onFilterChange]
  );

  // Auto-fetch on mount if no prop data provided
  useEffect(() => {
    if (!propsData) {
      fetchReport();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Form Submission / Apply
  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchReport();
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFunnelId('');
    setStartDate('');
    setEndDate('');
    setChannelId('');
    setCampaignId('');
    setTerritoryId('');

    const resetParams: ConversionFunnelQueryParams = {
      funnel_id: null,
      start_date_val: null,
      end_date_val: null,
      channel_id: null,
      campaign_id: null,
      territory_id: null,
    };

    if (!propsData) {
      fetchReport(resetParams);
    } else if (onFilterChange) {
      onFilterChange(resetParams);
    }
  };

  // Retry handler
  const handleRetry = () => {
    if (propsOnRetry) {
      propsOnRetry();
    } else {
      fetchReport();
    }
  };

  // Stages array
  const stages = internalData || [];

  // Summary metrics
  const summary = useMemo(() => computeFunnelSummary(stages), [stages]);

  // Bottlenecks list
  const bottleneckStages = useMemo(() => detectBottlenecks(stages), [stages]);

  return (
    <div
      data-testid={testId}
      className={cn('w-full space-y-6 text-on-surface font-sans', className)}
    >
      {/* Top Header / Title Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-serif font-normal text-on-surface tracking-tight">
              Conversion Funnel Analysis
            </h2>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Real-time stage-by-stage conversion progression and automated drop-off bottleneck detection.
          </p>
        </div>

        {summary.bottleneckCount > 0 && (
          <div className="flex items-center px-3 py-1.5 bg-error-container/20 border border-secondary/30 text-secondary rounded-md text-sm font-medium animate-pulse">
            <AlertTriangle className="w-4 h-4 mr-2 text-secondary flex-shrink-0" />
            <span>
              {summary.bottleneckCount} Bottleneck{summary.bottleneckCount > 1 ? 's' : ''} Detected
            </span>
          </div>
        )}
      </div>

      {/* Filter Controls Bar [FR-004] */}
      <form
        onSubmit={handleApplyFilters}
        data-testid="funnel-filter-bar"
        className="p-4 bg-surface-container-low border border-outline-variant rounded-md shadow-sm space-y-4"
      >
        <div className="flex items-center space-x-2 text-xs font-semibold text-primary uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          <span>Funnel Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Funnel ID */}
          <div>
            <label htmlFor="funnel-id-input" className="block text-on-surface-variant font-medium mb-1">
              Funnel ID
            </label>
            <input
              id="funnel-id-input"
              type="text"
              data-testid="funnel-id-input"
              value={funnelId}
              onChange={(e) => setFunnelId(e.target.value)}
              placeholder="e.g. default"
              className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded focus:outline-none focus:border-primary text-on-surface"
            />
          </div>

          {/* Start Date */}
          <div>
            <label htmlFor="start-date-input" className="block text-on-surface-variant font-medium mb-1">
              Start Date
            </label>
            <input
              id="start-date-input"
              type="date"
              data-testid="start-date-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded focus:outline-none focus:border-primary text-on-surface"
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="end-date-input" className="block text-on-surface-variant font-medium mb-1">
              End Date
            </label>
            <input
              id="end-date-input"
              type="date"
              data-testid="end-date-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded focus:outline-none focus:border-primary text-on-surface"
            />
          </div>

          {/* Channel ID */}
          <div>
            <label htmlFor="channel-id-input" className="block text-on-surface-variant font-medium mb-1">
              Channel ID
            </label>
            <input
              id="channel-id-input"
              type="text"
              data-testid="channel-id-input"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              placeholder="All Channels"
              className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded focus:outline-none focus:border-primary text-on-surface"
            />
          </div>

          {/* Campaign ID */}
          <div>
            <label htmlFor="campaign-id-input" className="block text-on-surface-variant font-medium mb-1">
              Campaign ID
            </label>
            <input
              id="campaign-id-input"
              type="text"
              data-testid="campaign-id-input"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              placeholder="All Campaigns"
              className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded focus:outline-none focus:border-primary text-on-surface"
            />
          </div>

          {/* Territory ID */}
          <div>
            <label htmlFor="territory-id-input" className="block text-on-surface-variant font-medium mb-1">
              Territory ID
            </label>
            <input
              id="territory-id-input"
              type="text"
              data-testid="territory-id-input"
              value={territoryId}
              onChange={(e) => setTerritoryId(e.target.value)}
              placeholder="All Territories"
              className="w-full px-2.5 py-1.5 bg-surface border border-outline-variant rounded focus:outline-none focus:border-primary text-on-surface"
            />
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 border-t border-outline-variant/60 pt-3">
          <button
            type="button"
            data-testid="reset-filters-button"
            onClick={handleResetFilters}
            className="px-3 py-1.5 bg-surface hover:bg-surface-container border border-outline-variant text-on-surface-variant rounded text-xs font-medium transition-colors"
          >
            Reset Filters
          </button>
          <button
            type="submit"
            data-testid="apply-filters-button"
            disabled={isLoading}
            className="px-4 py-1.5 bg-primary hover:bg-primary-container text-on-primary rounded text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            {isLoading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
            <span>Apply Filters</span>
          </button>
        </div>
      </form>

      {/* Summary KPI Cards [FR-004] */}
      <div data-testid="funnel-summary" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Top Funnel Volume */}
        <div className="p-4 bg-surface-container-low border border-outline-variant rounded-md shadow-sm">
          <span className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">
            Top Stage Volume
          </span>
          <div className="text-2xl font-serif font-normal text-on-surface mt-1">
            {formatStageCount(summary.topStageCount)}
          </div>
          <span className="text-xs text-on-surface-variant/80 mt-1 block">Total Initial Leads</span>
        </div>

        {/* Converted Leads */}
        <div className="p-4 bg-surface-container-low border border-outline-variant rounded-md shadow-sm">
          <span className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">
            Converted Leads
          </span>
          <div className="text-2xl font-serif font-normal text-primary mt-1">
            {formatStageCount(summary.convertedCount)}
          </div>
          <span className="text-xs text-on-surface-variant/80 mt-1 block">Final Closed/Won Leads</span>
        </div>

        {/* Overall Conversion Rate */}
        <div className="p-4 bg-surface-container-low border border-outline-variant rounded-md shadow-sm">
          <span className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">
            Overall Conversion
          </span>
          <div className="text-2xl font-serif font-normal text-tertiary mt-1">
            {formatPercent(summary.overallConversionRate)}
          </div>
          <span className="text-xs text-on-surface-variant/80 mt-1 block">Top to Bottom Conversion</span>
        </div>

        {/* Bottleneck Alerts Count */}
        <div
          className={cn(
            'p-4 border rounded-md shadow-sm transition-colors',
            summary.bottleneckCount > 0
              ? 'bg-error-container/20 border-secondary/40 text-secondary'
              : 'bg-surface-container-low border-outline-variant text-on-surface'
          )}
        >
          <span className="text-xs uppercase tracking-wider font-medium">
            Flagged Bottlenecks
          </span>
          <div className="text-2xl font-serif font-normal mt-1 flex items-center space-x-2">
            <span>{summary.bottleneckCount}</span>
            {summary.bottleneckCount > 0 && <ShieldAlert className="w-5 h-5 text-secondary inline" />}
          </div>
          <span className="text-xs mt-1 block opacity-80">
            {summary.bottleneckCount === 0
              ? 'All stages within thresholds'
              : 'Stages exceeding drop-off limit'}
          </span>
        </div>
      </div>

      {/* Bottleneck Alert Banner [FR-005] */}
      {bottleneckStages.length > 0 && (
        <div
          data-testid="bottleneck-alert-banner"
          className="p-4 bg-error-container/20 border border-secondary/40 rounded-md shadow-sm text-on-surface space-y-2"
        >
          <div className="flex items-center space-x-2 text-secondary font-semibold text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>Conversion Bottleneck Alert Detected!</span>
          </div>
          <p className="text-xs text-on-surface-variant">
            The following stage{bottleneckStages.length > 1 ? 's' : ''} exceeded configured drop-off
            threshold limits. Review lead nurturing and sales handover workflows to reduce drop-offs:
          </p>
          <ul className="list-disc list-inside text-xs space-y-1 text-secondary font-medium">
            {bottleneckStages.map((stage) => (
              <li key={`alert-${stage.stage_name}`}>
                <span className="font-bold">{stage.stage_name}</span>: Drop-off rate{' '}
                <span className="underline">{formatPercent(stage.dropoff_rate)}</span> exceeds threshold
                limit of <span className="font-semibold">{formatPercent(stage.threshold_percent)}</span> (
                {formatStageCount(stage.stage_count)} leads remaining).
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Loading State Skeleton */}
      {isLoading && (
        <div data-testid="funnel-loading" className="p-8 text-center bg-surface-container-low border border-outline-variant rounded-md">
          <RotateCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-on-surface">Loading conversion funnel data...</p>
        </div>
      )}

      {/* Error State View */}
      {!isLoading && errorMsg && (
        <div data-testid="funnel-error" className="p-6 bg-error-container/30 border border-secondary rounded-md text-center space-y-3">
          <XCircle className="w-8 h-8 text-secondary mx-auto" />
          <h3 className="text-base font-semibold text-secondary">Unable to Load Conversion Funnel</h3>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto">{errorMsg}</p>
          <button
            type="button"
            data-testid="retry-button"
            onClick={handleRetry}
            className="px-4 py-2 bg-secondary text-on-secondary rounded text-xs font-medium hover:bg-secondary/90 transition-colors inline-flex items-center space-x-1.5"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Data Fetch</span>
          </button>
        </div>
      )}

      {/* Empty Data View */}
      {!isLoading && !errorMsg && stages.length === 0 && (
        <div data-testid="funnel-empty" className="p-8 text-center bg-surface-container-low border border-outline-variant rounded-md space-y-2">
          <HelpCircle className="w-8 h-8 text-outline mx-auto" />
          <h3 className="text-base font-medium text-on-surface">No Conversion Funnel Data Available</h3>
          <p className="text-xs text-on-surface-variant">
            No stage progression records matched the current filter criteria. Adjust your date range or filters.
          </p>
        </div>
      )}

      {/* Funnel Visual Bars Section [FR-004, FR-005] */}
      {!isLoading && !errorMsg && stages.length > 0 && (
        <div data-testid="funnel-visualization" className="space-y-6">
          <div className="flex items-center justify-between border-b border-outline-variant pb-2">
            <h3 className="text-lg font-serif text-on-surface">Sequential Stage Progression</h3>
            <span className="text-xs text-on-surface-variant">
              {stages.length} Funnel Stages Analyzed
            </span>
          </div>

          <div className="space-y-4">
            {stages.map((stage, idx) => {
              const lossCount = calculateStageLoss(stages, idx);
              const isBottleneck =
                stage.is_bottleneck || stage.dropoff_rate > stage.threshold_percent;

              // Calculate relative visual width percentage (minimum 12% so text remains visible)
              const visualWidthPct = Math.max(
                12,
                Math.min(100, stage.overall_conversion_rate || (idx === 0 ? 100 : 12))
              );

              return (
                <div key={`stage-${stage.stage_name}-${idx}`} className="space-y-2">
                  {/* Drop-off Flow Connector Arrow (For idx > 0) */}
                  {idx > 0 && (
                    <div className="flex items-center justify-center py-1">
                      <div className="flex items-center space-x-2 px-3 py-1 bg-surface-container border border-outline-variant/60 rounded-full text-xs text-on-surface-variant shadow-2xs">
                        <ArrowDown className="w-3.5 h-3.5 text-outline" />
                        <span>
                          Lost: <span className="font-semibold">{formatStageCount(lossCount)}</span> leads
                        </span>
                        <span className="text-outline">|</span>
                        <span className={cn('font-medium', isBottleneck ? 'text-secondary font-bold' : '')}>
                          Drop-off: {formatPercent(stage.dropoff_rate)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Stage Card */}
                  <div
                    data-testid={`funnel-stage-card-${stage.stage_name}`}
                    className={cn(
                      'p-4 rounded-md border shadow-2xs transition-all relative overflow-hidden',
                      isBottleneck
                        ? 'bg-error-container/15 border-secondary/50 ring-1 ring-secondary/30'
                        : 'bg-surface-container-lowest border-outline-variant hover:border-outline'
                    )}
                  >
                    {/* Background Visual Fill Bar */}
                    <div
                      className={cn(
                        'absolute top-0 bottom-0 left-0 opacity-15 pointer-events-none transition-all duration-500',
                        isBottleneck ? 'bg-secondary' : 'bg-primary'
                      )}
                      style={{ width: `${visualWidthPct}%` }}
                    />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Stage Step Badge & Name */}
                      <div className="flex items-start space-x-3">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5',
                            isBottleneck
                              ? 'bg-secondary text-on-secondary'
                              : 'bg-primary text-on-primary'
                          )}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-base text-on-surface tracking-tight">
                              {stage.stage_name}
                            </span>
                            {isBottleneck && (
                              <span
                                data-testid={`bottleneck-badge-${stage.stage_name}`}
                                className="px-2 py-0.5 bg-secondary text-on-secondary rounded text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                <span>Bottleneck</span>
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-on-surface-variant block mt-0.5">
                            Stage Count: <span className="font-medium text-on-surface">{formatStageCount(stage.stage_count)}</span> leads
                          </span>
                        </div>
                      </div>

                      {/* Right: Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs md:text-right">
                        <div>
                          <span className="text-on-surface-variant/80 block uppercase text-[10px] font-semibold">
                            Sequential Conversion
                          </span>
                          <span className="font-semibold text-on-surface text-sm">
                            {formatPercent(stage.conversion_rate)}
                          </span>
                        </div>

                        <div>
                          <span className="text-on-surface-variant/80 block uppercase text-[10px] font-semibold">
                            Drop-off Rate
                          </span>
                          <span
                            className={cn(
                              'font-semibold text-sm',
                              isBottleneck ? 'text-secondary font-bold underline' : 'text-on-surface'
                            )}
                          >
                            {formatPercent(stage.dropoff_rate)}
                          </span>
                        </div>

                        <div>
                          <span className="text-on-surface-variant/80 block uppercase text-[10px] font-semibold">
                            Threshold Limit
                          </span>
                          <span className="font-medium text-on-surface text-sm">
                            {formatPercent(stage.threshold_percent)}
                          </span>
                        </div>

                        <div>
                          <span className="text-on-surface-variant/80 block uppercase text-[10px] font-semibold">
                            Overall Retention
                          </span>
                          <span className="font-semibold text-tertiary text-sm">
                            {formatPercent(stage.overall_conversion_rate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar Gauge */}
                    <div className="mt-3 pt-3 border-t border-outline-variant/40 flex items-center space-x-3 text-xs">
                      <span className="text-[11px] text-on-surface-variant min-w-[70px]">
                        Retention Bar
                      </span>
                      <div className="flex-1 bg-surface-container-high h-2.5 rounded-full overflow-hidden relative">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            isBottleneck ? 'bg-secondary' : 'bg-primary'
                          )}
                          style={{ width: `${Math.min(100, Math.max(2, stage.overall_conversion_rate))}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-on-surface">
                        {formatPercent(stage.overall_conversion_rate)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Tabular Breakdown [FR-004] */}
          <div className="pt-4 border-t border-outline-variant">
            <h4 className="text-sm font-semibold text-on-surface uppercase tracking-wider mb-3">
              Detailed Stage Breakdown Table
            </h4>
            <div className="overflow-x-auto border border-outline-variant rounded-md shadow-2xs">
              <table data-testid="funnel-table" className="w-full text-left text-xs text-on-surface">
                <thead className="bg-surface-container-high border-b border-outline-variant text-on-surface font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Step</th>
                    <th className="py-2.5 px-3">Stage Name</th>
                    <th className="py-2.5 px-3 text-right">Stage Count</th>
                    <th className="py-2.5 px-3 text-right">Conversion Rate</th>
                    <th className="py-2.5 px-3 text-right">Drop-off Rate</th>
                    <th className="py-2.5 px-3 text-right">Threshold Limit</th>
                    <th className="py-2.5 px-3 text-right">Overall Retention</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60 bg-surface">
                  {stages.map((stg, i) => {
                    const isBtl = stg.is_bottleneck || stg.dropoff_rate > stg.threshold_percent;
                    return (
                      <tr
                        key={`tbl-${stg.stage_name}-${i}`}
                        className={cn(
                          'hover:bg-surface-container/50 transition-colors',
                          isBtl ? 'bg-error-container/10 font-medium' : ''
                        )}
                      >
                        <td className="py-2.5 px-3 text-on-surface-variant font-mono">{i + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-on-surface">{stg.stage_name}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {formatStageCount(stg.stage_count)}
                        </td>
                        <td className="py-2.5 px-3 text-right">{formatPercent(stg.conversion_rate)}</td>
                        <td
                          className={cn(
                            'py-2.5 px-3 text-right',
                            isBtl ? 'text-secondary font-bold' : ''
                          )}
                        >
                          {formatPercent(stg.dropoff_rate)}
                        </td>
                        <td className="py-2.5 px-3 text-right">{formatPercent(stg.threshold_percent)}</td>
                        <td className="py-2.5 px-3 text-right text-tertiary font-medium">
                          {formatPercent(stg.overall_conversion_rate)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isBtl ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-secondary text-on-secondary">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Bottleneck
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-primary text-[10px] font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-primary" /> Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversionFunnel;
