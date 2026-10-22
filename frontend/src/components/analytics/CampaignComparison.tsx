'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Calendar,
  Filter,
  RotateCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  Plus,
  X,
  Info,
  Sparkles,
  Activity,
  ArrowUpDown,
  Search,
} from 'lucide-react';
import {
  getCampaignComparisonReport,
  CampaignComparisonItem,
  CampaignTimeSeriesItem,
  CampaignComparisonQueryParams,
} from '../../services/analytics';
import { cn } from '../../lib/utils';

// ============================================================================
// Constants & Color Palette [FR-006, Linen & Logic Design System]
// ============================================================================

export const MAX_CAMPAIGNS_LIMIT = 5;

/**
 * Palette of 5 distinct accessible editorial color tokens for up to 5 campaign overlays.
 */
export const CAMPAIGN_COLORS = [
  {
    id: 'campaign-0',
    hex: '#59452b', // Tobacco / Primary
    stroke: '#59452b',
    fill: 'rgba(89, 69, 43, 0.12)',
    badgeBg: 'bg-[#59452b]',
    badgeText: 'text-white',
    border: 'border-[#59452b]',
    lightBg: 'bg-[#59452b]/10',
    label: 'Primary Brown',
  },
  {
    id: 'campaign-1',
    hex: '#a43b2c', // Sun-faded Red / Secondary
    stroke: '#a43b2c',
    fill: 'rgba(164, 59, 44, 0.12)',
    badgeBg: 'bg-[#a43b2c]',
    badgeText: 'text-white',
    border: 'border-[#a43b2c]',
    lightBg: 'bg-[#a43b2c]/10',
    label: 'Sun-faded Red',
  },
  {
    id: 'campaign-2',
    hex: '#374a5f', // Wool Blanket Blue / Tertiary
    stroke: '#374a5f',
    fill: 'rgba(55, 74, 95, 0.12)',
    badgeBg: 'bg-[#374a5f]',
    badgeText: 'text-white',
    border: 'border-[#374a5f]',
    lightBg: 'bg-[#374a5f]/10',
    label: 'Wool Blue',
  },
  {
    id: 'campaign-3',
    hex: '#715a3f', // Warm Gold / Surface Tint
    stroke: '#715a3f',
    fill: 'rgba(113, 90, 63, 0.12)',
    badgeBg: 'bg-[#715a3f]',
    badgeText: 'text-white',
    border: 'border-[#715a3f]',
    lightBg: 'bg-[#715a3f]/10',
    label: 'Warm Ochre',
  },
  {
    id: 'campaign-4',
    hex: '#4f6278', // Slate / Tertiary Container
    stroke: '#4f6278',
    fill: 'rgba(79, 98, 120, 0.12)',
    badgeBg: 'bg-[#4f6278]',
    badgeText: 'text-white',
    border: 'border-[#4f6278]',
    lightBg: 'bg-[#4f6278]/10',
    label: 'Slate Grey',
  },
];

export type ComparisonMetricType = 'relative_volume' | 'cost_per_lead' | 'engagement_rate';

// ============================================================================
// Types & Props Contract [FR-006]
// ============================================================================

export interface CampaignOption {
  campaign_id: string;
  campaign_name: string;
}

export interface CampaignComparisonProps {
  /**
   * Pre-loaded campaign comparison items. If supplied, used directly or refetched when filters change.
   */
  data?: CampaignComparisonItem[];

  /**
   * Initial query parameters for campaign selection and date bounds.
   */
  initialFilters?: CampaignComparisonQueryParams;

  /**
   * List of available campaigns to choose from in selection controls.
   */
  availableCampaigns?: CampaignOption[];

  /**
   * Callback fired whenever filter criteria or campaign selections change.
   */
  onFilterChange?: (filters: CampaignComparisonQueryParams) => void;

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
// Helper & Formatting Functions [FR-006, NFR-001]
// ============================================================================

/**
 * Formats a currency value with dollar sign ($) and comma separators.
 */
export function formatCurrency(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || Number.isNaN(val)) {
    return '$0.00';
  }
  return `$${val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Formats a percentage value with 1 or 2 decimal places and '%' symbol.
 */
export function formatPercent(val: number | null | undefined, decimals = 1): string {
  if (val === null || val === undefined || Number.isNaN(val)) {
    return '0.0%';
  }
  return `${val.toFixed(decimals)}%`;
}

/**
 * Formats numeric volumes with standard comma separators.
 */
export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) {
    return '0';
  }
  return Math.max(0, Math.round(val)).toLocaleString('en-US');
}

/**
 * Default fallback campaigns for selection dropdowns when none are supplied.
 */
const DEFAULT_AVAILABLE_CAMPAIGNS: CampaignOption[] = [
  { campaign_id: 'cmp-1', campaign_name: 'Q4 Product Launch' },
  { campaign_id: 'cmp-2', campaign_name: 'Retargeting Blitz' },
  { campaign_id: 'cmp-3', campaign_name: 'Search Brand Keywords' },
  { campaign_id: 'cmp-4', campaign_name: 'Social Lead Gen Campaign' },
  { campaign_id: 'cmp-5', campaign_name: 'Email Nurture Sequence' },
  { campaign_id: 'cmp-6', campaign_name: 'Partner Webinar Promotion' },
];

// ============================================================================
// Main UI Component: CampaignComparison [FR-006]
// ============================================================================

export const CampaignComparison: React.FC<CampaignComparisonProps> = ({
  data: propsData,
  initialFilters,
  availableCampaigns = DEFAULT_AVAILABLE_CAMPAIGNS,
  onFilterChange,
  isLoading: propsIsLoading = false,
  error: propsError = null,
  onRetry,
  className,
  'data-testid': dataTestId = 'campaign-comparison',
}) => {
  // Internal state
  const [internalData, setInternalData] = useState<CampaignComparisonItem[]>(propsData || []);
  const [internalLoading, setInternalLoading] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Selected campaign IDs state (up to 5 max)
  const initialCampaignIds = useMemo(() => {
    if (!initialFilters?.campaign_ids) {
      return availableCampaigns.slice(0, 3).map((c) => c.campaign_id);
    }
    if (Array.isArray(initialFilters.campaign_ids)) {
      return initialFilters.campaign_ids.slice(0, MAX_CAMPAIGNS_LIMIT);
    }
    return String(initialFilters.campaign_ids)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_CAMPAIGNS_LIMIT);
  }, [initialFilters, availableCampaigns]);

  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>(initialCampaignIds);

  // Date boundary states
  const [startDate, setStartDate] = useState<string>(
    initialFilters?.start_date_val
      ? String(initialFilters.start_date_val).split('T')[0]
      : ''
  );
  const [endDate, setEndDate] = useState<string>(
    initialFilters?.end_date_val
      ? String(initialFilters.end_date_val).split('T')[0]
      : ''
  );

  // Active trend metric selection
  const [activeMetric, setActiveMetric] = useState<ComparisonMetricType>('relative_volume');

  // Input state for adding custom campaign ID
  const [customCampaignInput, setCustomCampaignInput] = useState<string>('');

  // Warning state for max limit attempt
  const [limitWarning, setLimitWarning] = useState<boolean>(false);

  // Interactive tooltip hover point state
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    campaignName: string;
    valueStr: string;
    colorHex: string;
    x: number;
    y: number;
  } | null>(null);

  // Sync external props data
  useEffect(() => {
    if (propsData) {
      setInternalData(propsData);
    }
  }, [propsData]);

  // Fetch campaign comparison trend data
  const fetchData = useCallback(async () => {
    if (propsData && !onFilterChange) {
      return;
    }

    if (selectedCampaignIds.length === 0) {
      setInternalData([]);
      return;
    }

    setInternalLoading(true);
    setInternalError(null);

    try {
      const queryParams: CampaignComparisonQueryParams = {
        campaign_ids: selectedCampaignIds,
        start_date_val: startDate || undefined,
        end_date_val: endDate || undefined,
      };

      const result = await getCampaignComparisonReport(queryParams);
      setInternalData(result);
    } catch (err: any) {
      const errMsg =
        err?.message || 'Failed to load campaign comparison trend data. Please try again.';
      setInternalError(errMsg);
    } finally {
      setInternalLoading(false);
    }
  }, [propsData, onFilterChange, selectedCampaignIds, startDate, endDate]);

  // Execute initial fetch or refetch on dependency changes
  useEffect(() => {
    if (!propsData) {
      fetchData();
    }
  }, [fetchData, propsData]);

  // Combined state flags
  const isLoading = propsIsLoading || internalLoading;
  const error = propsError || internalError;
  const campaignData = propsData || internalData;

  // Toggle or add campaign selection (max 5 limit enforcement)
  const handleToggleCampaign = (campaignId: string) => {
    setLimitWarning(false);
    if (selectedCampaignIds.includes(campaignId)) {
      const updated = selectedCampaignIds.filter((id) => id !== campaignId);
      setSelectedCampaignIds(updated);
      if (onFilterChange) {
        onFilterChange({
          campaign_ids: updated,
          start_date_val: startDate || undefined,
          end_date_val: endDate || undefined,
        });
      }
    } else {
      if (selectedCampaignIds.length >= MAX_CAMPAIGNS_LIMIT) {
        setLimitWarning(true);
        return;
      }
      const updated = [...selectedCampaignIds, campaignId];
      setSelectedCampaignIds(updated);
      if (onFilterChange) {
        onFilterChange({
          campaign_ids: updated,
          start_date_val: startDate || undefined,
          end_date_val: endDate || undefined,
        });
      }
    }
  };

  // Add custom campaign ID via text input
  const handleAddCustomCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customCampaignInput.trim();
    if (!trimmed) return;

    if (selectedCampaignIds.includes(trimmed)) {
      setCustomCampaignInput('');
      return;
    }

    if (selectedCampaignIds.length >= MAX_CAMPAIGNS_LIMIT) {
      setLimitWarning(true);
      return;
    }

    const updated = [...selectedCampaignIds, trimmed];
    setSelectedCampaignIds(updated);
    setCustomCampaignInput('');
    setLimitWarning(false);

    if (onFilterChange) {
      onFilterChange({
        campaign_ids: updated,
        start_date_val: startDate || undefined,
        end_date_val: endDate || undefined,
      });
    }
  };

  // Trigger explicit compare action
  const handleApplyCompare = () => {
    setLimitWarning(false);
    if (onFilterChange) {
      onFilterChange({
        campaign_ids: selectedCampaignIds,
        start_date_val: startDate || undefined,
        end_date_val: endDate || undefined,
      });
    }
    fetchData();
  };

  // Clear date filters
  const handleClearDates = () => {
    setStartDate('');
    setEndDate('');
    if (onFilterChange) {
      onFilterChange({
        campaign_ids: selectedCampaignIds,
        start_date_val: undefined,
        end_date_val: undefined,
      });
    }
  };

  // Key campaign performance highlights
  const campaignHighlights = useMemo(() => {
    if (!campaignData || campaignData.length === 0) return null;

    let highestVolume = campaignData[0];
    let lowestCPL = campaignData[0];
    let highestEngagement = campaignData[0];

    campaignData.forEach((item) => {
      if (item.lead_volume > highestVolume.lead_volume) {
        highestVolume = item;
      }
      if (
        item.cost_per_lead !== null &&
        item.cost_per_lead !== undefined &&
        (lowestCPL.cost_per_lead === null ||
          lowestCPL.cost_per_lead === undefined ||
          item.cost_per_lead < lowestCPL.cost_per_lead)
      ) {
        lowestCPL = item;
      }
      if (item.engagement_rate > highestEngagement.engagement_rate) {
        highestEngagement = item;
      }
    });

    return { highestVolume, lowestCPL, highestEngagement };
  }, [campaignData]);

  // Extract all unique dates across all campaign time series for overlay alignment
  const timeSeriesDates = useMemo(() => {
    if (!campaignData || campaignData.length === 0) return [];

    const dateSet = new Set<string>();
    campaignData.forEach((item) => {
      if (item.time_series && Array.isArray(item.time_series)) {
        item.time_series.forEach((pt) => {
          if (pt.date_val) dateSet.add(pt.date_val);
        });
      }
    });

    return Array.from(dateSet).sort();
  }, [campaignData]);

  // Prepare normalized plot lines for SVG overlay chart
  const overlayChartData = useMemo(() => {
    if (timeSeriesDates.length === 0 || !campaignData || campaignData.length === 0) {
      return null;
    }

    // Map each campaign to time series points aligned with timeSeriesDates
    const campaignsPlot = campaignData.map((cmp, idx) => {
      const colorToken = CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length];
      const seriesMap = new Map<string, CampaignTimeSeriesItem>();

      if (cmp.time_series && Array.isArray(cmp.time_series)) {
        cmp.time_series.forEach((pt) => {
          seriesMap.set(pt.date_val, pt);
        });
      }

      const points = timeSeriesDates.map((dateStr) => {
        const pt = seriesMap.get(dateStr);
        let val = 0;
        let formattedVal = '0';

        if (pt) {
          if (activeMetric === 'relative_volume') {
            val = pt.lead_volume || 0;
            formattedVal = `${formatNumber(val)} leads`;
          } else if (activeMetric === 'cost_per_lead') {
            val = pt.cost_per_lead || 0;
            formattedVal = pt.cost_per_lead_str || formatCurrency(val);
          } else {
            val = pt.engagement_rate || 0;
            formattedVal = formatPercent(val);
          }
        }

        return {
          date: dateStr,
          value: val,
          formattedVal,
          rawItem: pt,
        };
      });

      return {
        campaign_id: cmp.campaign_id,
        campaign_name: cmp.campaign_name,
        colorToken,
        points,
      };
    });

    // Find global min and max for active metric scaling
    let maxVal = 0;
    campaignsPlot.forEach((c) => {
      c.points.forEach((p) => {
        if (p.value > maxVal) maxVal = p.value;
      });
    });

    if (maxVal === 0) maxVal = 100; // prevent divide by zero

    return {
      dates: timeSeriesDates,
      campaignsPlot,
      maxVal,
    };
  }, [timeSeriesDates, campaignData, activeMetric]);

  return (
    <div
      data-testid={dataTestId}
      className={cn(
        'bg-[#fbf9f4] border border-[#d1c4b9]/60 rounded-xl p-6 shadow-sm font-sans text-[#1b1c19] transition-all',
        className
      )}
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#e4e2dd]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-[#59452b]/10 text-[#59452b] rounded-md inline-flex">
              <BarChart2 className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-serif font-normal text-[#1b1c19] tracking-tight">
              Campaign Comparison Analytics
            </h2>
          </div>
          <p className="text-xs text-[#4e453d] ml-8">
            Compare acquisition trends, cost per lead, and engagement rates side-by-side (Up to 5 campaigns)
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApplyCompare}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#59452b] text-white hover:bg-[#59452b]/90 text-xs font-medium rounded-md shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            data-testid="compare-btn"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Compare Campaigns</span>
          </button>
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 border border-[#80756b]/40 text-[#4e453d] hover:bg-[#f0eee9] rounded-md transition-colors cursor-pointer"
            title="Refresh Data"
            aria-label="Refresh Data"
            data-testid="refresh-btn"
          >
            <RotateCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Campaign Selection & Filter Controls [FR-006] */}
      <div className="py-5 border-b border-[#e4e2dd]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Campaign Selection Badges & Checkboxes */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#4e453d] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#59452b]" />
                Selected Campaigns ({selectedCampaignIds.length}/{MAX_CAMPAIGNS_LIMIT})
              </span>
              {limitWarning && (
                <span
                  className="text-xs font-medium text-[#ba1a1a] flex items-center gap-1 animate-pulse"
                  data-testid="limit-warning"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Maximum 5 campaigns limit reached
                </span>
              )}
            </div>

            {/* Campaign Selection Pills */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {availableCampaigns.map((cmp) => {
                const isSelected = selectedCampaignIds.includes(cmp.campaign_id);
                const selectedIndex = selectedCampaignIds.indexOf(cmp.campaign_id);
                const colorToken =
                  selectedIndex !== -1
                    ? CAMPAIGN_COLORS[selectedIndex % CAMPAIGN_COLORS.length]
                    : null;

                return (
                  <button
                    key={cmp.campaign_id}
                    type="button"
                    onClick={() => handleToggleCampaign(cmp.campaign_id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5',
                      isSelected && colorToken
                        ? `${colorToken.badgeBg} ${colorToken.badgeText} ${colorToken.border} shadow-xs`
                        : 'bg-white border-[#d1c4b9] text-[#4e453d] hover:bg-[#f5f3ee]'
                    )}
                    data-testid={`campaign-toggle-${cmp.campaign_id}`}
                  >
                    <span>{cmp.campaign_name}</span>
                    {isSelected ? (
                      <X className="w-3 h-3 hover:opacity-80" />
                    ) : (
                      <Plus className="w-3 h-3 text-[#80756b]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Campaign ID Input */}
            <form onSubmit={handleAddCustomCampaign} className="flex items-center gap-2">
              <div className="relative max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#80756b]" />
                <input
                  type="text"
                  value={customCampaignInput}
                  onChange={(e) => setCustomCampaignInput(e.target.value)}
                  placeholder="Add campaign ID..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#d1c4b9] rounded-md text-xs text-[#1b1c19] placeholder:text-[#80756b] focus:outline-none focus:ring-1 focus:ring-[#59452b]"
                  data-testid="custom-campaign-input"
                />
              </div>
              <button
                type="submit"
                disabled={!customCampaignInput.trim() || selectedCampaignIds.length >= MAX_CAMPAIGNS_LIMIT}
                className="px-3 py-1.5 bg-[#f0eee9] hover:bg-[#eae8e3] text-[#1b1c19] text-xs font-medium border border-[#d1c4b9] rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                data-testid="add-custom-campaign-btn"
              >
                Add
              </button>
            </form>
          </div>

          {/* Date Range Selector */}
          <div className="flex flex-wrap items-center gap-2 bg-white/80 p-3 rounded-lg border border-[#d1c4b9]/60">
            <Calendar className="w-4 h-4 text-[#59452b]" />
            <div className="flex items-center gap-1.5">
              <label htmlFor="cmp-start-date" className="sr-only">Start Date</label>
              <input
                id="cmp-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 bg-[#f5f3ee] border border-[#d1c4b9] rounded-md text-xs text-[#1b1c19] focus:outline-none focus:ring-1 focus:ring-[#59452b]"
                data-testid="start-date-input"
              />
              <span className="text-xs text-[#80756b]">to</span>
              <label htmlFor="cmp-end-date" className="sr-only">End Date</label>
              <input
                id="cmp-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 bg-[#f5f3ee] border border-[#d1c4b9] rounded-md text-xs text-[#1b1c19] focus:outline-none focus:ring-1 focus:ring-[#59452b]"
                data-testid="end-date-input"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={handleClearDates}
                className="p-1 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-md transition-colors"
                title="Clear date filter"
                aria-label="Clear date filter"
                data-testid="clear-dates-btn"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert Display */}
      {error && (
        <div
          className="my-4 p-4 bg-[#ffdad6] border border-[#ba1a1a]/30 rounded-lg flex items-start gap-3 text-[#93000a]"
          data-testid="error-banner"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-semibold block mb-0.5">Campaign Analytics Error</span>
            <span>{typeof error === 'string' ? error : error.message}</span>
          </div>
          {(onRetry || !propsData) && (
            <button
              type="button"
              onClick={onRetry || fetchData}
              className="px-3 py-1 bg-[#ba1a1a] text-white hover:bg-[#ba1a1a]/90 text-xs font-medium rounded-md transition-colors"
              data-testid="retry-btn"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#4e453d]" aria-busy="true" data-testid="loading-state">
          <RotateCw className="w-8 h-8 animate-spin text-[#59452b]" />
          <span className="text-xs font-medium">Aggregating campaign comparison trend data...</span>
        </div>
      )}

      {/* Empty / Minimum Campaign Selection Notice */}
      {!isLoading && selectedCampaignIds.length < 2 && (
        <div className="my-8 p-6 bg-[#f5f3ee] border border-[#d1c4b9] rounded-lg text-center" data-testid="empty-selection-notice">
          <Info className="w-8 h-8 text-[#59452b] mx-auto mb-2 opacity-80" />
          <h3 className="text-sm font-semibold text-[#1b1c19] mb-1">Select at least 2 campaigns</h3>
          <p className="text-xs text-[#4e453d] max-w-md mx-auto mb-4">
            Select 2 to 5 campaigns from the list above or enter custom campaign IDs to perform side-by-side trend analysis and cost comparisons.
          </p>
        </div>
      )}

      {/* Campaign Highlights Summary Bar */}
      {!isLoading && campaignHighlights && campaignData.length >= 1 && (
        <div className="my-6 grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="campaign-highlights">
          <div className="p-4 bg-white border border-[#d1c4b9]/80 rounded-lg shadow-2xs">
            <div className="flex items-center gap-2 text-[#59452b] mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider text-[#80756b]">Top Lead Volume</span>
            </div>
            <div className="text-base font-serif font-medium text-[#1b1c19]">
              {campaignHighlights.highestVolume.campaign_name}
            </div>
            <div className="text-xs text-[#4e453d] mt-1">
              <span className="font-semibold text-[#59452b]">{formatNumber(campaignHighlights.highestVolume.lead_volume)}</span> leads ({formatPercent(campaignHighlights.highestVolume.relative_volume_pct)} relative share)
            </div>
          </div>

          <div className="p-4 bg-white border border-[#d1c4b9]/80 rounded-lg shadow-2xs">
            <div className="flex items-center gap-2 text-[#a43b2c] mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider text-[#80756b]">Lowest Cost Per Lead</span>
            </div>
            <div className="text-base font-serif font-medium text-[#1b1c19]">
              {campaignHighlights.lowestCPL.campaign_name}
            </div>
            <div className="text-xs text-[#4e453d] mt-1">
              <span className="font-semibold text-[#a43b2c]">
                {campaignHighlights.lowestCPL.cost_per_lead_str || formatCurrency(campaignHighlights.lowestCPL.cost_per_lead)}
              </span> / lead
            </div>
          </div>

          <div className="p-4 bg-white border border-[#d1c4b9]/80 rounded-lg shadow-2xs">
            <div className="flex items-center gap-2 text-[#374a5f] mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider text-[#80756b]">Highest Engagement</span>
            </div>
            <div className="text-base font-serif font-medium text-[#1b1c19]">
              {campaignHighlights.highestEngagement.campaign_name}
            </div>
            <div className="text-xs text-[#4e453d] mt-1">
              <span className="font-semibold text-[#374a5f]">
                {campaignHighlights.highestEngagement.engagement_rate_str || formatPercent(campaignHighlights.highestEngagement.engagement_rate)}
              </span> engagement rate
            </div>
          </div>
        </div>
      )}

      {/* Overlay Chart & Trend Visualization Section [FR-006] */}
      {!isLoading && selectedCampaignIds.length >= 1 && (
        <div className="mt-6 bg-white border border-[#d1c4b9] rounded-lg p-5 shadow-2xs">
          {/* Chart Header & Metric Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#f0eee9]">
            <div>
              <h3 className="text-sm font-semibold text-[#1b1c19] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#59452b]" />
                Multi-Campaign Trend Overlay
              </h3>
              <p className="text-xs text-[#80756b]">
                Historical performance overlay across selected campaigns
              </p>
            </div>

            {/* Metric Toggle Buttons */}
            <div className="flex items-center bg-[#f5f3ee] p-1 rounded-md border border-[#d1c4b9]/60">
              <button
                type="button"
                onClick={() => setActiveMetric('relative_volume')}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
                  activeMetric === 'relative_volume'
                    ? 'bg-[#59452b] text-white shadow-xs'
                    : 'text-[#4e453d] hover:text-[#1b1c19]'
                )}
                data-testid="metric-toggle-volume"
              >
                Lead Volume
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('cost_per_lead')}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
                  activeMetric === 'cost_per_lead'
                    ? 'bg-[#59452b] text-white shadow-xs'
                    : 'text-[#4e453d] hover:text-[#1b1c19]'
                )}
                data-testid="metric-toggle-cpl"
              >
                Cost per Lead ($)
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('engagement_rate')}
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer',
                  activeMetric === 'engagement_rate'
                    ? 'bg-[#59452b] text-white shadow-xs'
                    : 'text-[#4e453d] hover:text-[#1b1c19]'
                )}
                data-testid="metric-toggle-engagement"
              >
                Engagement Rate (%)
              </button>
            </div>
          </div>

          {/* SVG Overlay Chart */}
          {overlayChartData && overlayChartData.dates.length > 0 ? (
            <div className="relative" data-testid="trend-overlay-chart">
              <div className="w-full h-64 relative overflow-hidden bg-[#fbf9f4]/40 rounded-lg border border-[#e4e2dd] p-4">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
                  {/* Grid background lines */}
                  <line x1="0" y1="40" x2="500" y2="40" stroke="#e4e2dd" strokeDasharray="3 3" />
                  <line x1="0" y1="90" x2="500" y2="90" stroke="#e4e2dd" strokeDasharray="3 3" />
                  <line x1="0" y1="140" x2="500" y2="140" stroke="#e4e2dd" strokeDasharray="3 3" />

                  {/* Render Campaign Overlay Lines & Data Points */}
                  {overlayChartData.campaignsPlot.map((cPlot) => {
                    const totalPoints = cPlot.points.length;
                    if (totalPoints === 0) return null;

                    const maxVal = overlayChartData.maxVal;

                    // Compute SVG points (X: 0 to 500, Y: 180 to 20)
                    const coords = cPlot.points.map((pt, idx) => {
                      const x = totalPoints === 1 ? 250 : (idx / (totalPoints - 1)) * 480 + 10;
                      const ratio = maxVal > 0 ? pt.value / maxVal : 0;
                      const y = 180 - ratio * 150; // invert Y
                      return { x, y, pt };
                    });

                    const pathD = coords.reduce(
                      (acc, curr, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`,
                      ''
                    );

                    return (
                      <g key={cPlot.campaign_id}>
                        {/* Overlay Path Line */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke={cPlot.colorToken.stroke}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="transition-all duration-300"
                        />

                        {/* Interactive Data Point Markers */}
                        {coords.map((c, pIdx) => (
                          <circle
                            key={`${cPlot.campaign_id}-pt-${pIdx}`}
                            cx={c.x}
                            cy={c.y}
                            r="4"
                            fill={cPlot.colorToken.stroke}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                            className="cursor-pointer hover:r-6 transition-all"
                            onMouseEnter={() =>
                              setHoveredPoint({
                                date: c.pt.date,
                                campaignName: cPlot.campaign_name,
                                valueStr: c.pt.formattedVal,
                                colorHex: cPlot.colorToken.stroke,
                                x: c.x,
                                y: c.y,
                              })
                            }
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        ))}
                      </g>
                    );
                  })}
                </svg>

                {/* Tooltip Popup */}
                {hoveredPoint && (
                  <div
                    className="absolute bg-[#1b1c19] text-white text-xs px-2.5 py-1.5 rounded shadow-lg pointer-events-none z-10 -translate-x-1/2 -translate-y-full mb-2"
                    style={{
                      left: `${(hoveredPoint.x / 500) * 100}%`,
                      top: `${(hoveredPoint.y / 200) * 100}%`,
                    }}
                    data-testid="chart-tooltip"
                  >
                    <div className="font-semibold text-amber-200">{hoveredPoint.campaignName}</div>
                    <div>{hoveredPoint.date}: <span className="font-bold">{hoveredPoint.valueStr}</span></div>
                  </div>
                )}
              </div>

              {/* X-Axis Timeline Date Labels */}
              <div className="flex justify-between items-center text-[10px] text-[#80756b] mt-2 px-1">
                {timeSeriesDates.map((dStr, idx) => (
                  <span key={`date-lbl-${idx}`}>{dStr}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#80756b]" data-testid="no-timeseries-data">
              No historical time-series data available for the selected campaign timeframe.
            </div>
          )}

          {/* Chart Legend */}
          <div className="mt-6 pt-4 border-t border-[#f0eee9] flex flex-wrap items-center gap-4">
            <span className="text-xs font-medium text-[#4e453d] uppercase tracking-wider">Legend:</span>
            {campaignData.map((cmp, idx) => {
              const colorToken = CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length];
              return (
                <div key={`legend-${cmp.campaign_id}`} className="flex items-center gap-1.5 text-xs text-[#1b1c19]">
                  <span className={cn('w-3 h-3 rounded-full', colorToken.badgeBg)} />
                  <span className="font-medium">{cmp.campaign_name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Table Section [FR-006] */}
      {!isLoading && campaignData && campaignData.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1b1c19]">
              Detailed Performance Metrics Table
            </h3>
            <span className="text-xs text-[#80756b]">
              Showing {campaignData.length} campaign{campaignData.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#d1c4b9] bg-white">
            <table className="w-full text-left border-collapse text-xs" data-testid="comparison-table">
              <thead>
                <tr className="bg-[#f5f3ee] border-b border-[#d1c4b9] text-[#4e453d] font-medium">
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4 text-right">Budget</th>
                  <th className="py-3 px-4 text-right">Lead Volume</th>
                  <th className="py-3 px-4 text-right">Relative Volume</th>
                  <th className="py-3 px-4 text-right">Cost per Lead</th>
                  <th className="py-3 px-4 text-right">Engagement Rate</th>
                  <th className="py-3 px-4 text-right">Quality Score</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e2dd]">
                {campaignData.map((item, idx) => {
                  const colorToken = CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length];

                  return (
                    <tr
                      key={item.campaign_id}
                      className="hover:bg-[#fbf9f4] transition-colors"
                      data-testid={`comparison-row-${item.campaign_id}`}
                    >
                      <td className="py-3 px-4 font-medium text-[#1b1c19]">
                        <div className="flex items-center gap-2">
                          <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', colorToken.badgeBg)} />
                          <span>{item.campaign_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-[#4e453d]">
                        {formatCurrency(item.budget, 0)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#1b1c19]">
                        {formatNumber(item.lead_volume)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#59452b] font-medium">
                        {formatPercent(item.relative_volume_pct)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#a43b2c] font-medium">
                        {item.cost_per_lead_str || formatCurrency(item.cost_per_lead)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#374a5f] font-medium">
                        {item.engagement_rate_str || formatPercent(item.engagement_rate)}
                      </td>
                      <td className="py-3 px-4 text-right text-[#1b1c19]">
                        {item.avg_quality_score ? item.avg_quality_score.toFixed(1) : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-[#1b1c19]">
                        {formatCurrency(item.total_revenue, 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignComparison;
