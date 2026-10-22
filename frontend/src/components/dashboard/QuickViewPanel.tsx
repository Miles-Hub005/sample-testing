'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Briefcase,
  Headphones,
  DollarSign,
  RotateCw,
  AlertTriangle,
  BarChart3,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  DashboardDomain,
  DashboardTimeframe,
  DomainDetailResponse,
  MetricSchema,
  BreakdownItemSchema,
  ALLOWED_DOMAINS,
  getDomainDetail,
  sanitizeDomainId,
} from '../../services/dashboard';
import { MetricCard } from './MetricCard';
import { StatusLabel } from '../common/StatusLabel';
import { cn } from '../../lib/utils';

export interface DomainConfig {
  id: DashboardDomain;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keyMetricsSummary: string;
}

export const DOMAIN_CONFIGS: Record<DashboardDomain, DomainConfig> = {
  lead_gen: {
    id: 'lead_gen',
    label: 'Lead Generation',
    shortLabel: 'Lead Gen',
    description: 'Track prospect volume, acquisition channels, and lead-to-opportunity conversion rates.',
    icon: Users,
    keyMetricsSummary: 'Lead Volume & Conversion Rates',
  },
  sales_pipeline: {
    id: 'sales_pipeline',
    label: 'Sales Pipeline',
    shortLabel: 'Sales',
    description: 'Monitor active deal values, stage distributions, and pipeline velocity across sales tiers.',
    icon: Briefcase,
    keyMetricsSummary: 'Deal Values & Stage Distribution',
  },
  support: {
    id: 'support',
    label: 'Support Ticketing',
    shortLabel: 'Support',
    description: 'Evaluate ticket volume, resolution times, SLA compliance, and customer satisfaction scores.',
    icon: Headphones,
    keyMetricsSummary: 'Open Tickets, Resolution Times & SLA Compliance',
  },
  financials: {
    id: 'financials',
    label: 'Financial Summaries',
    shortLabel: 'Financials',
    description: 'Overview of monthly recurring revenue, outstanding invoices, cash collection, and ARR growth.',
    icon: DollarSign,
    keyMetricsSummary: 'Recurring Revenue & Outstanding Invoices',
  },
};

export interface QuickViewPanelProps {
  /**
   * Currently active domain ID ('lead_gen' | 'sales_pipeline' | 'support' | 'financials').
   * Defaults to 'lead_gen'.
   */
  selectedDomain?: DashboardDomain | string;

  /**
   * Callback fired when user selects or switches active domain selection tab.
   */
  onSelectDomain?: (domain: DashboardDomain) => void;

  /**
   * Optional timeframe duration filter ('7d', '30d', '90d'). Defaults to '30d'.
   */
  timeframe?: DashboardTimeframe | string;

  /**
   * Optional pre-fetched domain detail data supplied by parent container.
   */
  domainDetail?: DomainDetailResponse | null;

  /**
   * Indicates whether domain detail data is currently loading.
   */
  isLoading?: boolean;

  /**
   * Optional external error message string.
   */
  error?: string | null;

  /**
   * Callback fired when user clicks retry button on unavailable state.
   */
  onRetry?: () => void | Promise<void>;

  /**
   * Optional callback fired when retry is requested for an individual metric inside the panel.
   */
  onMetricRetry?: (metricKey: string) => void | Promise<void>;

  /**
   * Optional custom CSS class name for the panel wrapper.
   */
  className?: string;

  /**
   * Optional test identifier for testing libraries.
   */
  'data-testid'?: string;
}

/**
 * Helper to format breakdown values depending on domain context.
 */
function formatBreakdownValue(value: number, domain: DashboardDomain): string {
  if (value === 0) {
    return domain === 'financials' || domain === 'sales_pipeline' ? '$0' : '0';
  }

  if (domain === 'financials' || domain === 'sales_pipeline') {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return value.toLocaleString('en-US');
}

/**
 * QuickViewPanel component for expanded domain metrics and distribution breakdowns (FR-6, FR-7, FR-8, FR-9).
 * Provides dedicated quick-view drilldowns for Lead Generation, Sales Pipeline, Support Ticketing, and Financial Summaries.
 */
export const QuickViewPanel: React.FC<QuickViewPanelProps> = ({
  selectedDomain = 'lead_gen',
  onSelectDomain,
  timeframe = '30d',
  domainDetail: externalDetail,
  isLoading: externalLoading,
  error: externalError,
  onRetry,
  onMetricRetry,
  className,
  'data-testid': testId = 'quick-view-panel',
}) => {
  // Validate and resolve active domain identifier
  const resolvedDomain: DashboardDomain = React.useMemo(() => {
    try {
      return sanitizeDomainId(selectedDomain);
    } catch {
      return 'lead_gen';
    }
  }, [selectedDomain]);

  // Local state for self-fetching when external domainDetail is not provided
  const [internalDetail, setInternalDetail] = useState<DomainDetailResponse | null>(null);
  const [internalLoading, setInternalLoading] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // Fetch domain details if externalDetail is not passed
  const fetchDomainDetails = useCallback(async () => {
    setInternalLoading(true);
    setInternalError(null);
    try {
      const data = await getDomainDetail(resolvedDomain, timeframe);
      setInternalDetail(data);
    } catch (err: any) {
      setInternalError(err?.message || `Failed to fetch details for domain '${resolvedDomain}'`);
    } finally {
      setInternalLoading(false);
    }
  }, [resolvedDomain, timeframe]);

  useEffect(() => {
    if (!externalDetail) {
      fetchDomainDetails();
    }
  }, [externalDetail, fetchDomainDetails]);

  // Derived state combining external and internal props
  const activeDetail = externalDetail ?? internalDetail;
  const isLoading = externalLoading ?? internalLoading;
  const error = externalError ?? internalError;
  const isUnavailable = activeDetail?.status === 'UNAVAILABLE' || !!error;

  const currentConfig = DOMAIN_CONFIGS[resolvedDomain] || DOMAIN_CONFIGS.lead_gen;
  const DomainIcon = currentConfig.icon;

  // Handle manual retry action
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else {
        await fetchDomainDetails();
      }
    } finally {
      setIsRetrying(false);
    }
  };

  // Handle domain tab click
  const handleDomainSelect = (domain: DashboardDomain) => {
    if (onSelectDomain) {
      onSelectDomain(domain);
    }
  };

  // Compute breakdown total for progress percentages
  const breakdownItems: BreakdownItemSchema[] = activeDetail?.breakdown_items || [];
  const breakdownTotal = breakdownItems.reduce((acc, item) => acc + Math.max(0, item.value), 0);

  const detailedMetrics: MetricSchema[] = activeDetail?.detailed_metrics || [];

  return (
    <section
      data-testid={testId}
      aria-labelledby="quick-view-heading"
      className={cn(
        'bg-[#fbf9f4] border border-[#e4e2dd] rounded-lg shadow-sm transition-all duration-200 overflow-hidden',
        className
      )}
    >
      {/* Quick-View Header & Domain Selection Tabs */}
      <div className="border-b border-[#e4e2dd] bg-[#f5f3ee] px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#eae8e3] text-[#59452b] rounded-md border border-[#d1c4b9]">
              <DomainIcon className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="quick-view-heading"
                  data-testid="quick-view-heading"
                  className="text-2xl font-serif text-[#1b1c19] tracking-tight"
                >
                  {currentConfig.label} Quick-View
                </h2>
                {isUnavailable ? (
                  <StatusLabel status="offline" label="Outage Detected" size="sm" />
                ) : (
                  <StatusLabel status="online" label="Active Sync" size="sm" />
                )}
              </div>
              <p className="mt-0.5 text-xs text-[#4e453d]">
                {currentConfig.description}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#735c41] bg-[#f0eee9] px-2.5 py-1 rounded border border-[#d1c4b9]">
              Timeframe: {timeframe}
            </span>
          </div>
        </div>

        {/* Domain Navigation Tabs */}
        <nav
          aria-label="Core Domain Quick-View Selector"
          className="mt-6 flex flex-wrap gap-2 border-t border-[#e4e2dd] pt-4"
        >
          {ALLOWED_DOMAINS.map((domainKey) => {
            const cfg = DOMAIN_CONFIGS[domainKey];
            const isSelected = resolvedDomain === domainKey;
            const TabIcon = cfg.icon;

            return (
              <button
                key={domainKey}
                data-testid={`domain-tab-${domainKey}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls="quick-view-content"
                onClick={() => handleDomainSelect(domainKey)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md border transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41] focus:ring-offset-1',
                  isSelected
                    ? 'bg-[#59452b] text-[#ffffff] border-[#59452b] shadow-sm'
                    : 'bg-[#ffffff] text-[#1b1c19] border-[#e4e2dd] hover:bg-[#eae8e3] hover:text-[#59452b]'
                )}
              >
                <TabIcon className={cn('w-3.5 h-3.5', isSelected ? 'text-[#f5d6b4]' : 'text-[#715a3f]')} aria-hidden="true" />
                <span>{cfg.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Panel Content Area */}
      <div id="quick-view-content" className="p-6 space-y-8">
        {/* Loading Spinner State */}
        {isLoading ? (
          <div
            data-testid="quick-view-loading"
            className="flex flex-col items-center justify-center py-16 text-[#4e453d]"
            aria-busy="true"
            aria-label={`Loading ${currentConfig.label} operational metrics`}
          >
            <RotateCw className="w-8 h-8 animate-spin text-[#735c41] mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-[#1b1c19]">
              Loading {currentConfig.label} metrics...
            </p>
            <p className="text-xs text-[#80756b] mt-1">
              Synchronizing connector status and historical baselines
            </p>
          </div>
        ) : isUnavailable ? (
          /* Error / Unavailable Outage State Banner */
          <div
            data-testid="quick-view-error"
            className="p-6 bg-[#ffdad6] border border-[#ffb4a7] rounded-md shadow-sm"
            role="alert"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-[#ba1a1a] flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-semibold text-[#93000a] tracking-tight">
                    {currentConfig.label} Metrics Unavailable
                  </h3>
                  <p className="mt-1 text-xs text-[#71160b]">
                    {error ||
                      activeDetail?.error_detail ||
                      `The upstream service for ${currentConfig.label} is currently unresponsive or timing out. Metrics cannot be aggregated.`}
                  </p>
                </div>
              </div>

              <button
                data-testid="quick-view-retry-button"
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-[#ffffff] bg-[#a43b2c] hover:bg-[#842417] active:bg-[#71160b] rounded-md shadow-sm border border-[#a43b2c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#a43b2c]"
              >
                <RotateCw className={cn('w-3.5 h-3.5', isRetrying && 'animate-spin')} aria-hidden="true" />
                <span>{isRetrying ? 'Retrying...' : 'Retry Domain Sync'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Success State: Detailed Metrics & Breakdown Distributions */
          <>
            {/* Expanded Detailed Metrics Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#715a3f]" aria-hidden="true" />
                  <h3 className="text-base font-medium text-[#1b1c19]">
                    Detailed Operational Metrics
                  </h3>
                </div>
                <span className="text-xs text-[#80756b]">
                  {detailedMetrics.length} metrics recorded
                </span>
              </div>

              {detailedMetrics.length === 0 ? (
                <div className="p-8 text-center bg-[#f5f3ee] border border-dashed border-[#d1c4b9] rounded-md">
                  <p className="text-xs text-[#4e453d]">
                    No detailed metrics currently recorded for {currentConfig.label}.
                  </p>
                </div>
              ) : (
                <div
                  data-testid="quick-view-metrics-grid"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {detailedMetrics.map((metric) => (
                    <MetricCard
                      key={metric.metric_key}
                      metric={metric}
                      onRetry={
                        onMetricRetry
                          ? () => onMetricRetry(metric.metric_key)
                          : handleRetry
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Distribution Breakdown Items Section */}
            <div className="border-t border-[#e4e2dd] pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#715a3f]" aria-hidden="true" />
                  <h3 className="text-base font-medium text-[#1b1c19]">
                    Distribution & Segment Breakdowns
                  </h3>
                </div>
                <span className="text-xs text-[#80756b]">
                  {breakdownItems.length} categories
                </span>
              </div>

              {breakdownItems.length === 0 ? (
                <div className="p-8 text-center bg-[#f5f3ee] border border-dashed border-[#d1c4b9] rounded-md">
                  <p className="text-xs text-[#4e453d]">
                    No breakdown distribution items available for {currentConfig.label}.
                  </p>
                </div>
              ) : (
                <div
                  data-testid="quick-view-breakdowns"
                  className="bg-[#ffffff] border border-[#e4e2dd] rounded-lg p-5 space-y-4 shadow-sm"
                >
                  {breakdownItems.map((item, idx) => {
                    const pct = breakdownTotal > 0 ? (Math.max(0, item.value) / breakdownTotal) * 100 : 0;
                    const formattedVal = formatBreakdownValue(item.value, resolvedDomain);
                    const slug = item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

                    return (
                      <div
                        key={item.label || idx}
                        data-testid={`breakdown-item-${slug}`}
                        className="space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-[#1b1c19] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#735c41]" aria-hidden="true" />
                            {item.label}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[#1b1c19] font-semibold">{formattedVal}</span>
                            {breakdownTotal > 0 && (
                              <span className="text-[11px] font-mono text-[#80756b] bg-[#f5f3ee] px-1.5 py-0.5 rounded border border-[#e4e2dd]">
                                {pct.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Visual Progress / Ratio Bar */}
                        <div
                          className="w-full bg-[#f0eee9] h-2 rounded-full overflow-hidden border border-[#e4e2dd]"
                          role="progressbar"
                          aria-valuenow={item.value}
                          aria-valuemin={0}
                          aria-valuemax={breakdownTotal || 100}
                          aria-label={`${item.label}: ${formattedVal} (${pct.toFixed(1)}%)`}
                        >
                          <div
                            className="bg-[#735c41] h-full transition-all duration-300 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
