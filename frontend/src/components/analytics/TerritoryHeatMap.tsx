'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin,
  Filter,
  RotateCw,
  Map,
  Layers,
  Search,
  AlertTriangle,
  ChevronRight,
  X,
  DollarSign,
  Users,
  BarChart3,
  Globe,
  SlidersHorizontal,
  TrendingUp,
  CheckCircle2,
  Inbox,
  Calendar,
} from 'lucide-react';
import {
  getTerritoryHeatmap,
  TerritoryHeatmapQueryParams,
  TerritoryHeatmapResponse,
} from '../../services/analytics';
import { cn } from '../../lib/utils';

// ============================================================================
// Types & Props Contract [FR-007, FR-008]
// ============================================================================

export interface TerritoryHeatMapProps {
  /**
   * Pre-loaded territory heat map data. If provided, used directly or refetched on filter changes.
   */
  data?: TerritoryHeatmapResponse;

  /**
   * Initial query parameters for filtering heat map data.
   */
  initialFilters?: TerritoryHeatmapQueryParams;

  /**
   * Callback invoked whenever filter criteria change.
   */
  onFilterChange?: (filters: TerritoryHeatmapQueryParams) => void;

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

export type HeatmapMetricMode =
  | 'density_score'
  | 'lead_count'
  | 'total_deal_value'
  | 'total_revenue'
  | 'avg_deal_value';

export type HeatmapViewMode = 'grid' | 'map' | 'table';

// ============================================================================
// Helper & Formatting Functions [FR-007, FR-008]
// ============================================================================

/**
 * Format numeric currency values into USD standard format ($#,##0.00 or $0.00).
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
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
 * Format raw integer or float numbers with standard US commas.
 */
export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) {
    return '0';
  }
  return Math.round(val).toLocaleString('en-US');
}

/**
 * Format floating point percentage with 1 decimal place.
 */
export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined || Number.isNaN(val)) {
    return '0.0%';
  }
  return `${val.toFixed(1)}%`;
}

/**
 * Density Band classification based on score (0-100).
 */
export interface DensityBand {
  label: string;
  badgeClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  barColor: string;
}

export function getDensityBand(score: number): DensityBand {
  if (score >= 75) {
    return {
      label: 'High Density',
      badgeClass: 'bg-[#b84a39]/15 text-[#b84a39] border-[#b84a39]/30',
      bgClass: 'bg-[#fcf7f5]',
      borderClass: 'border-[#b84a39]/40',
      textClass: 'text-[#b84a39]',
      barColor: 'bg-[#b84a39]',
    };
  }
  if (score >= 50) {
    return {
      label: 'Medium Density',
      badgeClass: 'bg-[#735c41]/15 text-[#735c41] border-[#735c41]/30',
      bgClass: 'bg-[#fdfbf7]',
      borderClass: 'border-[#735c41]/40',
      textClass: 'text-[#735c41]',
      barColor: 'bg-[#735c41]',
    };
  }
  if (score >= 25) {
    return {
      label: 'Low Density',
      badgeClass: 'bg-[#4a5d73]/15 text-[#4a5d73] border-[#4a5d73]/30',
      bgClass: 'bg-[#f7f9fc]',
      borderClass: 'border-[#4a5d73]/40',
      textClass: 'text-[#4a5d73]',
      barColor: 'bg-[#4a5d73]',
    };
  }
  return {
    label: 'Minimal Density',
    badgeClass: 'bg-[#80756b]/15 text-[#80756b] border-[#80756b]/30',
    bgClass: 'bg-[#f5f3ee]',
    borderClass: 'border-[#c2b9a7]/40',
    textClass: 'text-[#80756b]',
    barColor: 'bg-[#80756b]',
  };
}

// ============================================================================
// Main TerritoryHeatMap Component [FR-007, FR-008]
// ============================================================================

export const TerritoryHeatMap: React.FC<TerritoryHeatMapProps> = ({
  data: propsData,
  initialFilters = {},
  onFilterChange,
  isLoading: propsIsLoading,
  error: propsError,
  onRetry,
  className,
  'data-testid': testId = 'territory-heat-map',
}) => {
  // State management
  const [filters, setFilters] = useState<TerritoryHeatmapQueryParams>(initialFilters);
  const [internalData, setInternalData] = useState<TerritoryHeatmapResponse | null>(null);
  const [internalLoading, setInternalLoading] = useState<boolean>(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  // UI state
  const [metricMode, setMetricMode] = useState<HeatmapMetricMode>('density_score');
  const [viewMode, setViewMode] = useState<HeatmapViewMode>('grid');
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [unassignedSearch, setUnassignedSearch] = useState<string>('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(false);

  // Form input local state
  const [statusInput, setStatusInput] = useState<string>(initialFilters.lead_status || '');
  const [minValInput, setMinValInput] = useState<string>(
    initialFilters.min_deal_value !== undefined && initialFilters.min_deal_value !== null
      ? String(initialFilters.min_deal_value)
      : ''
  );
  const [maxValInput, setMaxValInput] = useState<string>(
    initialFilters.max_deal_value !== undefined && initialFilters.max_deal_value !== null
      ? String(initialFilters.max_deal_value)
      : ''
  );
  const [territoryInput, setTerritoryInput] = useState<string>(initialFilters.territory_id || '');
  const [startDateInput, setStartDateInput] = useState<string>(
    initialFilters.start_date_val ? String(initialFilters.start_date_val) : ''
  );
  const [endDateInput, setEndDateInput] = useState<string>(
    initialFilters.end_date_val ? String(initialFilters.end_date_val) : ''
  );

  // Data fetching logic
  const fetchData = useCallback(async (queryParams: TerritoryHeatmapQueryParams) => {
    setInternalLoading(true);
    setInternalError(null);
    try {
      const res = await getTerritoryHeatmap(queryParams);
      setInternalData(res);
    } catch (err: any) {
      const msg = err?.message || 'Failed to fetch territory heat map metrics.';
      setInternalError(msg);
    } finally {
      setInternalLoading(false);
    }
  }, []);

  // Fetch when propsData is not provided or filters change
  useEffect(() => {
    if (!propsData) {
      fetchData(filters);
    }
  }, [propsData, filters, fetchData]);

  // Derived effective data, loading, and error states
  const effectiveData = propsData || internalData;
  const isLoading = propsIsLoading !== undefined ? propsIsLoading : internalLoading;
  const rawError = propsError !== undefined ? propsError : internalError;
  const errorMessage =
    typeof rawError === 'string' ? rawError : rawError?.message || 'An unexpected error occurred.';

  // Handle filter submission
  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newFilters: TerritoryHeatmapQueryParams = {
      ...filters,
      lead_status: statusInput.trim() || null,
      min_deal_value: minValInput.trim() !== '' ? Number(minValInput) : null,
      max_deal_value: maxValInput.trim() !== '' ? Number(maxValInput) : null,
      territory_id: territoryInput.trim() || null,
      start_date_val: startDateInput.trim() || null,
      end_date_val: endDateInput.trim() || null,
    };

    setFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  // Reset filter controls
  const handleResetFilters = () => {
    setStatusInput('');
    setMinValInput('');
    setMaxValInput('');
    setTerritoryInput('');
    setStartDateInput('');
    setEndDateInput('');

    const resetParams: TerritoryHeatmapQueryParams = {};
    setFilters(resetParams);
    if (onFilterChange) {
      onFilterChange(resetParams);
    }
  };

  // Computed summary metrics
  const summary = useMemo(() => {
    if (!effectiveData) {
      return {
        total_mapped_leads: 0,
        total_unassigned_leads: 0,
        total_leads: 0,
        total_deal_value: 0,
        total_revenue: 0,
        mapped_ratio: 0,
      };
    }

    const sum = effectiveData.summary || {
      total_mapped_leads: 0,
      total_unassigned_leads: 0,
      total_leads: 0,
      total_deal_value: 0,
      total_revenue: 0,
    };

    const total = sum.total_leads || sum.total_mapped_leads + sum.total_unassigned_leads || 1;
    const mappedRatio = total > 0 ? (sum.total_mapped_leads / total) * 100 : 0;

    return {
      ...sum,
      total_leads: total,
      mapped_ratio: mappedRatio,
    };
  }, [effectiveData]);

  // Max value calculation for metric mode scaling
  const maxMetricVal = useMemo(() => {
    if (!effectiveData || !effectiveData.territories.length) return 1;
    return Math.max(
      1,
      ...effectiveData.territories.map((t) => {
        switch (metricMode) {
          case 'lead_count':
            return t.lead_count;
          case 'total_deal_value':
            return t.total_deal_value;
          case 'total_revenue':
            return t.total_revenue;
          case 'avg_deal_value':
            return t.avg_deal_value;
          case 'density_score':
          default:
            return t.density_score;
        }
      })
    );
  }, [effectiveData, metricMode]);

  // Sorted territories based on selected metric mode
  const sortedTerritories = useMemo(() => {
    if (!effectiveData) return [];
    return [...effectiveData.territories].sort((a, b) => {
      switch (metricMode) {
        case 'lead_count':
          return b.lead_count - a.lead_count;
        case 'total_deal_value':
          return b.total_deal_value - a.total_deal_value;
        case 'total_revenue':
          return b.total_revenue - a.total_revenue;
        case 'avg_deal_value':
          return b.avg_deal_value - a.avg_deal_value;
        case 'density_score':
        default:
          return b.density_score - a.density_score;
      }
    });
  }, [effectiveData, metricMode]);

  // Currently selected territory details
  const selectedTerritory = useMemo(() => {
    if (!selectedTerritoryId || !effectiveData) return null;
    return effectiveData.territories.find((t) => t.territory_id === selectedTerritoryId) || null;
  }, [selectedTerritoryId, effectiveData]);

  // Filtered unassigned drawer items
  const filteredUnassignedEvents = useMemo(() => {
    if (!effectiveData || !effectiveData.unassigned_drawer) return [];
    const events = effectiveData.unassigned_drawer.unassigned_events || [];
    if (!unassignedSearch.trim()) return events;

    const term = unassignedSearch.toLowerCase().trim();
    return events.filter(
      (ev) =>
        ev.lead_id.toLowerCase().includes(term) ||
        ev.stage_name.toLowerCase().includes(term) ||
        (ev.postal_code && ev.postal_code.toLowerCase().includes(term)) ||
        (ev.id && ev.id.toLowerCase().includes(term))
    );
  }, [effectiveData, unassignedSearch]);

  // Retry handler
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      fetchData(filters);
    }
  };

  return (
    <div
      data-testid={testId}
      className={cn(
        'w-full bg-[#fbf9f4] text-[#1b1c19] border border-[#d1c4b9] rounded-lg p-6 shadow-sm space-y-6',
        className
      )}
    >
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#d1c4b9] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#735c41]">
            <Globe className="w-5 h-5 text-[#735c41]" />
            <span className="text-xs font-medium uppercase tracking-widest">
              Geographic Intelligence
            </span>
          </div>
          <h2 className="text-2xl font-serif text-[#1b1c19] mt-1 font-normal">
            Territory Performance & Heat Map
          </h2>
          <p className="text-xs text-[#4e453d] mt-0.5">
            Visualize geographic lead concentration, deal values, and regional territory metrics
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            data-testid="toggle-filters-btn"
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded border transition-colors',
              isFilterPanelOpen
                ? 'bg-[#735c41] text-white border-[#735c41]'
                : 'bg-white text-[#4e453d] border-[#d1c4b9] hover:bg-[#f0eee9]'
            )}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {(filters.lead_status ||
              filters.min_deal_value ||
              filters.max_deal_value ||
              filters.territory_id ||
              filters.start_date_val) && (
              <span className="w-2 h-2 rounded-full bg-[#b84a39]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            data-testid="open-unassigned-drawer-btn"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded border border-[#d1c4b9] bg-white text-[#4e453d] hover:bg-[#f0eee9] transition-colors relative"
          >
            <Inbox className="w-3.5 h-3.5 text-[#735c41]" />
            <span>Unassigned Drawer</span>
            {summary.total_unassigned_leads > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#b84a39] text-white">
                {summary.total_unassigned_leads}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleRetry}
            disabled={isLoading}
            data-testid="refresh-heatmap-btn"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-[#d1c4b9] bg-white text-[#4e453d] hover:bg-[#f0eee9] transition-colors disabled:opacity-50"
          >
            <RotateCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Expandable Filter Panel [FR-008] */}
      {isFilterPanelOpen && (
        <form
          onSubmit={handleApplyFilters}
          data-testid="heatmap-filter-panel"
          className="bg-white border border-[#d1c4b9] rounded-md p-4 space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-[#f0eee9] pb-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[#735c41] uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Geographic & Value Filters</span>
            </div>
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(false)}
              className="text-[#80756b] hover:text-[#1b1c19] text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Lead Status Filter */}
            <div>
              <label className="block text-xs font-medium text-[#4e453d] mb-1">
                Lead Status
              </label>
              <input
                type="text"
                value={statusInput}
                onChange={(e) => setStatusInput(e.target.value)}
                placeholder="e.g. QUALIFIED, NEW, WON"
                data-testid="filter-lead-status-input"
                className="w-full text-xs px-3 py-1.5 rounded border border-[#d1c4b9] bg-[#fbf9f4] text-[#1b1c19] focus:outline-none focus:border-[#735c41]"
              />
            </div>

            {/* Min Deal Value */}
            <div>
              <label className="block text-xs font-medium text-[#4e453d] mb-1">
                Min Deal Value ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={minValInput}
                onChange={(e) => setMinValInput(e.target.value)}
                placeholder="e.g. 1000"
                data-testid="filter-min-deal-input"
                className="w-full text-xs px-3 py-1.5 rounded border border-[#d1c4b9] bg-[#fbf9f4] text-[#1b1c19] focus:outline-none focus:border-[#735c41]"
              />
            </div>

            {/* Max Deal Value */}
            <div>
              <label className="block text-xs font-medium text-[#4e453d] mb-1">
                Max Deal Value ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={maxValInput}
                onChange={(e) => setMaxValInput(e.target.value)}
                placeholder="e.g. 50000"
                data-testid="filter-max-deal-input"
                className="w-full text-xs px-3 py-1.5 rounded border border-[#d1c4b9] bg-[#fbf9f4] text-[#1b1c19] focus:outline-none focus:border-[#735c41]"
              />
            </div>

            {/* Territory ID / Select */}
            <div>
              <label className="block text-xs font-medium text-[#4e453d] mb-1">
                Territory / Region Code
              </label>
              <input
                type="text"
                value={territoryInput}
                onChange={(e) => setTerritoryInput(e.target.value)}
                placeholder="e.g. NA-WEST, EU-CENTRAL"
                data-testid="filter-territory-id-input"
                className="w-full text-xs px-3 py-1.5 rounded border border-[#d1c4b9] bg-[#fbf9f4] text-[#1b1c19] focus:outline-none focus:border-[#735c41]"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium text-[#4e453d] mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                data-testid="filter-start-date-input"
                className="w-full text-xs px-3 py-1.5 rounded border border-[#d1c4b9] bg-[#fbf9f4] text-[#1b1c19] focus:outline-none focus:border-[#735c41]"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-medium text-[#4e453d] mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                data-testid="filter-end-date-input"
                className="w-full text-xs px-3 py-1.5 rounded border border-[#d1c4b9] bg-[#fbf9f4] text-[#1b1c19] focus:outline-none focus:border-[#735c41]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0eee9]">
            <button
              type="button"
              onClick={handleResetFilters}
              data-testid="reset-filters-btn"
              className="px-3 py-1.5 text-xs font-medium text-[#80756b] hover:text-[#1b1c19] transition-colors"
            >
              Reset Filters
            </button>
            <button
              type="submit"
              data-testid="apply-filters-btn"
              className="px-4 py-1.5 text-xs font-medium bg-[#735c41] text-white rounded hover:bg-[#58432a] transition-colors shadow-sm"
            >
              Apply Filters
            </button>
          </div>
        </form>
      )}

      {/* Summary KPI Cards [FR-007] */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Mapped Leads */}
        <div className="bg-white p-3.5 rounded border border-[#d1c4b9] space-y-1">
          <div className="flex items-center justify-between text-[#80756b]">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Mapped Leads
            </span>
            <MapPin className="w-4 h-4 text-[#735c41]" />
          </div>
          <div className="text-xl font-serif text-[#1b1c19]" data-testid="kpi-mapped-leads">
            {formatNumber(summary.total_mapped_leads)}
          </div>
          <p className="text-[11px] text-[#4e453d]">
            {formatPercent(summary.mapped_ratio)} coverage
          </p>
        </div>

        {/* Card 2: Unassigned Leads */}
        <div
          onClick={() => setIsDrawerOpen(true)}
          className="bg-white p-3.5 rounded border border-[#d1c4b9] space-y-1 cursor-pointer hover:border-[#b84a39] transition-colors group"
        >
          <div className="flex items-center justify-between text-[#80756b]">
            <span className="text-[11px] font-medium uppercase tracking-wider group-hover:text-[#b84a39]">
              Unassigned Leads
            </span>
            <Inbox className="w-4 h-4 text-[#b84a39]" />
          </div>
          <div className="text-xl font-serif text-[#1b1c19]" data-testid="kpi-unassigned-leads">
            {formatNumber(summary.total_unassigned_leads)}
          </div>
          <p className="text-[11px] text-[#b84a39] flex items-center gap-1">
            <span>View in drawer</span>
            <ChevronRight className="w-3 h-3" />
          </p>
        </div>

        {/* Card 3: Total Leads */}
        <div className="bg-white p-3.5 rounded border border-[#d1c4b9] space-y-1">
          <div className="flex items-center justify-between text-[#80756b]">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Total Volume
            </span>
            <Users className="w-4 h-4 text-[#4a5d73]" />
          </div>
          <div className="text-xl font-serif text-[#1b1c19]" data-testid="kpi-total-leads">
            {formatNumber(summary.total_leads)}
          </div>
          <p className="text-[11px] text-[#4e453d]">All regional events</p>
        </div>

        {/* Card 4: Total Deal Value */}
        <div className="bg-white p-3.5 rounded border border-[#d1c4b9] space-y-1">
          <div className="flex items-center justify-between text-[#80756b]">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Pipeline Value
            </span>
            <DollarSign className="w-4 h-4 text-[#735c41]" />
          </div>
          <div className="text-xl font-serif text-[#1b1c19]" data-testid="kpi-deal-value">
            {formatCurrency(summary.total_deal_value)}
          </div>
          <p className="text-[11px] text-[#4e453d]">Total deal value</p>
        </div>

        {/* Card 5: Total Revenue */}
        <div className="bg-white p-3.5 rounded border border-[#d1c4b9] space-y-1">
          <div className="flex items-center justify-between text-[#80756b]">
            <span className="text-[11px] font-medium uppercase tracking-wider">
              Total Revenue
            </span>
            <TrendingUp className="w-4 h-4 text-[#735c41]" />
          </div>
          <div className="text-xl font-serif text-[#1b1c19]" data-testid="kpi-revenue">
            {formatCurrency(summary.total_revenue)}
          </div>
          <p className="text-[11px] text-[#4e453d]">Realized revenue</p>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div
          data-testid="heatmap-loading"
          className="flex flex-col items-center justify-center py-12 bg-white rounded border border-[#d1c4b9] text-[#735c41] space-y-3"
        >
          <RotateCw className="w-8 h-8 animate-spin text-[#735c41]" />
          <p className="text-sm font-medium">Loading geographic heat map data...</p>
        </div>
      )}

      {rawError && !isLoading && (
        <div
          data-testid="heatmap-error"
          className="bg-[#ffdad6] border border-[#ba1a1a] rounded p-4 text-[#93000a] flex items-start justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ba1a1a] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium">Error Loading Heat Map</h4>
              <p className="text-xs mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            data-testid="error-retry-btn"
            className="px-3 py-1 text-xs font-medium bg-[#ba1a1a] text-white rounded hover:bg-[#93000a] transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Heatmap Main Content Area */}
      {!isLoading && !rawError && effectiveData && (
        <div className="space-y-4">
          {/* Controls Bar: Metric Selector & View Mode */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded border border-[#d1c4b9]">
            {/* Metric Mode Toggle */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-xs text-[#80756b] font-medium mr-2 hidden md:inline">
                Density Metric:
              </span>

              <button
                type="button"
                onClick={() => setMetricMode('density_score')}
                data-testid="metric-mode-density"
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                  metricMode === 'density_score'
                    ? 'bg-[#735c41] text-white'
                    : 'bg-[#f0eee9] text-[#4e453d] hover:bg-[#e4e2dd]'
                )}
              >
                Density Score
              </button>

              <button
                type="button"
                onClick={() => setMetricMode('lead_count')}
                data-testid="metric-mode-leads"
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                  metricMode === 'lead_count'
                    ? 'bg-[#735c41] text-white'
                    : 'bg-[#f0eee9] text-[#4e453d] hover:bg-[#e4e2dd]'
                )}
              >
                Lead Volume
              </button>

              <button
                type="button"
                onClick={() => setMetricMode('total_deal_value')}
                data-testid="metric-mode-deal-value"
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                  metricMode === 'total_deal_value'
                    ? 'bg-[#735c41] text-white'
                    : 'bg-[#f0eee9] text-[#4e453d] hover:bg-[#e4e2dd]'
                )}
              >
                Deal Value
              </button>

              <button
                type="button"
                onClick={() => setMetricMode('total_revenue')}
                data-testid="metric-mode-revenue"
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded transition-colors',
                  metricMode === 'total_revenue'
                    ? 'bg-[#735c41] text-white'
                    : 'bg-[#f0eee9] text-[#4e453d] hover:bg-[#e4e2dd]'
                )}
              >
                Revenue
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#f0eee9]">
              <span className="text-xs text-[#80756b] font-medium mr-1 hidden sm:inline">
                View:
              </span>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                data-testid="view-mode-grid"
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1',
                  viewMode === 'grid'
                    ? 'bg-[#735c41] text-white'
                    : 'bg-[#f0eee9] text-[#4e453d] hover:bg-[#e4e2dd]'
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('map')}
                data-testid="view-mode-map"
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1',
                  viewMode === 'map'
                    ? 'bg-[#735c41] text-white'
                    : 'bg-[#f0eee9] text-[#4e453d] hover:bg-[#e4e2dd]'
                )}
              >
                <Map className="w-3.5 h-3.5" />
                <span>Heat Map</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('table')}
                data-testid="view-mode-table"
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1',
                  viewMode === 'table'
                    ? 'bg-[#735c41] text-white'
                    : 'bg-[#f0eee9] text-[#4e453d] hover:bg-[#e4e2dd]'
                )}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>
          </div>

          {/* Density Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white rounded border border-[#d1c4b9] text-xs">
            <span className="font-medium text-[#4e453d]">Heat Density Intensity:</span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#b84a39]" />
                <span className="text-[#4e453d]">High (&ge;75%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#735c41]" />
                <span className="text-[#4e453d]">Medium (50-74%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#4a5d73]" />
                <span className="text-[#4e453d]">Low (25-49%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#80756b]" />
                <span className="text-[#4e453d]">Minimal (&lt;25%)</span>
              </div>
            </div>
          </div>

          {/* Empty state if no territories match filters */}
          {sortedTerritories.length === 0 && (
            <div
              data-testid="no-territories-message"
              className="bg-white rounded border border-[#d1c4b9] p-8 text-center space-y-2 text-[#4e453d]"
            >
              <MapPin className="w-8 h-8 text-[#80756b] mx-auto" />
              <h3 className="text-base font-serif text-[#1b1c19]">No Mapped Territory Data</h3>
              <p className="text-xs max-w-md mx-auto text-[#80756b]">
                No geographic territories matched the selected filter criteria. Try broadening your
                filters or check the Unassigned Drawer.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-3 py-1.5 text-xs font-medium bg-[#735c41] text-white rounded hover:bg-[#58432a] transition-colors"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* View Mode: GRID [FR-007] */}
          {viewMode === 'grid' && sortedTerritories.length > 0 && (
            <div
              data-testid="territory-grid-view"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {sortedTerritories.map((item) => {
                const band = getDensityBand(item.density_score);
                const isSelected = selectedTerritoryId === item.territory_id;

                // Scale bar percentage relative to current max metric value
                let targetVal = item.density_score;
                if (metricMode === 'lead_count') targetVal = item.lead_count;
                if (metricMode === 'total_deal_value') targetVal = item.total_deal_value;
                if (metricMode === 'total_revenue') targetVal = item.total_revenue;
                if (metricMode === 'avg_deal_value') targetVal = item.avg_deal_value;

                const relativePercent = Math.min(100, Math.max(0, (targetVal / maxMetricVal) * 100));

                return (
                  <div
                    key={item.territory_id}
                    data-testid={`territory-card-${item.territory_id}`}
                    onClick={() =>
                      setSelectedTerritoryId(isSelected ? null : item.territory_id)
                    }
                    className={cn(
                      'bg-white rounded-md border p-4 transition-all cursor-pointer space-y-3 relative overflow-hidden',
                      isSelected
                        ? 'border-[#735c41] ring-1 ring-[#735c41] shadow-md'
                        : 'border-[#d1c4b9] hover:border-[#735c41]'
                    )}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-[#735c41] uppercase bg-[#f0eee9] px-1.5 py-0.5 rounded">
                            {item.territory_code}
                          </span>
                          <h4 className="text-sm font-semibold text-[#1b1c19]">
                            {item.territory_name}
                          </h4>
                        </div>
                        {item.postal_code_patterns && (
                          <p className="text-[11px] text-[#80756b] mt-0.5 font-mono truncate">
                            Postal: {item.postal_code_patterns}
                          </p>
                        )}
                      </div>

                      <span
                        className={cn(
                          'text-[10px] font-medium uppercase px-2 py-0.5 rounded border shrink-0',
                          band.badgeClass
                        )}
                      >
                        {band.label}
                      </span>
                    </div>

                    {/* Relative density bar */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-[#4e453d] mb-1">
                        <span className="capitalize">{metricMode.replace('_', ' ')}</span>
                        <span className="font-semibold text-[#1b1c19]">
                          {metricMode === 'density_score'
                            ? `${item.density_score.toFixed(1)}/100`
                            : metricMode === 'lead_count'
                            ? formatNumber(item.lead_count)
                            : formatCurrency(targetVal)}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#f0eee9] rounded-full overflow-hidden">
                        <div
                          className={cn('h-full transition-all duration-300', band.barColor)}
                          style={{ width: `${relativePercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f0eee9] text-xs">
                      <div>
                        <span className="text-[10px] text-[#80756b] block">Lead Volume</span>
                        <span className="font-medium text-[#1b1c19]">
                          {formatNumber(item.lead_count)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#80756b] block">Total Deal Value</span>
                        <span className="font-medium text-[#1b1c19]">
                          {formatCurrency(item.total_deal_value)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#80756b] block">Avg Deal Value</span>
                        <span className="font-medium text-[#1b1c19]">
                          {formatCurrency(item.avg_deal_value)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#80756b] block">Revenue</span>
                        <span className="font-medium text-[#1b1c19]">
                          {formatCurrency(item.total_revenue)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* View Mode: VISUAL HEAT MAP [FR-007] */}
          {viewMode === 'map' && sortedTerritories.length > 0 && (
            <div
              data-testid="territory-map-view"
              className="bg-white rounded-md border border-[#d1c4b9] p-6 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-[#f0eee9] pb-3">
                <div className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-[#735c41]" />
                  <h3 className="text-base font-serif text-[#1b1c19]">
                    Geographic Heat Concentration Layout
                  </h3>
                </div>
                <span className="text-xs text-[#80756b]">
                  Showing {sortedTerritories.length} mapped territories
                </span>
              </div>

              {/* SVG / Visual Heat Map Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {sortedTerritories.map((item) => {
                  const band = getDensityBand(item.density_score);
                  const isSelected = selectedTerritoryId === item.territory_id;

                  return (
                    <div
                      key={item.territory_id}
                      data-testid={`map-zone-${item.territory_id}`}
                      onClick={() =>
                        setSelectedTerritoryId(isSelected ? null : item.territory_id)
                      }
                      className={cn(
                        'p-5 rounded-lg border flex flex-col justify-between transition-all cursor-pointer min-h-[140px] relative',
                        band.bgClass,
                        band.borderClass,
                        isSelected && 'ring-2 ring-[#735c41] shadow-md'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#735c41]">
                            {item.territory_code}
                          </span>
                          <h4 className="text-sm font-semibold text-[#1b1c19]">
                            {item.territory_name}
                          </h4>
                        </div>
                        <span
                          className={cn(
                            'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                            band.badgeClass
                          )}
                        >
                          {item.density_score.toFixed(0)} Score
                        </span>
                      </div>

                      <div className="mt-4 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-[#80756b]">Leads:</span>
                          <span className="font-semibold text-[#1b1c19]">
                            {formatNumber(item.lead_count)}
                          </span>
                        </div>

                        <div className="flex justify-between text-xs">
                          <span className="text-[#80756b]">Deal Value:</span>
                          <span className="font-semibold text-[#1b1c19]">
                            {formatCurrency(item.total_deal_value)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* View Mode: TABLE [FR-007] */}
          {viewMode === 'table' && sortedTerritories.length > 0 && (
            <div
              data-testid="territory-table-view"
              className="bg-white rounded-md border border-[#d1c4b9] overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#1b1c19]">
                  <thead className="bg-[#f0eee9] text-[#4e453d] font-medium border-b border-[#d1c4b9]">
                    <tr>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Territory Name</th>
                      <th className="py-2.5 px-3">Postal Patterns</th>
                      <th className="py-2.5 px-3 text-right">Lead Count</th>
                      <th className="py-2.5 px-3 text-right">Total Deal Value</th>
                      <th className="py-2.5 px-3 text-right">Avg Deal Value</th>
                      <th className="py-2.5 px-3 text-right">Total Revenue</th>
                      <th className="py-2.5 px-3 text-center">Density Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0eee9]">
                    {sortedTerritories.map((item) => {
                      const band = getDensityBand(item.density_score);
                      return (
                        <tr
                          key={item.territory_id}
                          onClick={() => setSelectedTerritoryId(item.territory_id)}
                          data-testid={`table-row-${item.territory_id}`}
                          className="hover:bg-[#fbf9f4] transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-[#735c41]">
                            {item.territory_code}
                          </td>
                          <td className="py-2.5 px-3 font-medium">{item.territory_name}</td>
                          <td className="py-2.5 px-3 font-mono text-[#80756b]">
                            {item.postal_code_patterns || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            {formatNumber(item.lead_count)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            {formatCurrency(item.total_deal_value)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatCurrency(item.avg_deal_value)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            {formatCurrency(item.total_revenue)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded border inline-block',
                                band.badgeClass
                              )}
                            >
                              {item.density_score.toFixed(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Drilldown Modal / Detail Inspector Panel */}
          {selectedTerritory && (
            <div
              data-testid="territory-detail-modal"
              className="bg-white rounded-md border border-[#735c41] p-4 shadow-md space-y-3 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between border-b border-[#f0eee9] pb-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#735c41]" />
                  <h4 className="text-sm font-semibold text-[#1b1c19]">
                    Territory Detail: {selectedTerritory.territory_name} ({selectedTerritory.territory_code})
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTerritoryId(null)}
                  data-testid="close-detail-modal-btn"
                  className="text-[#80756b] hover:text-[#1b1c19] text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-[#fbf9f4] p-2.5 rounded border border-[#f0eee9]">
                  <span className="text-[10px] text-[#80756b] block">Lead Volume</span>
                  <span className="text-sm font-semibold text-[#1b1c19]">
                    {formatNumber(selectedTerritory.lead_count)}
                  </span>
                </div>

                <div className="bg-[#fbf9f4] p-2.5 rounded border border-[#f0eee9]">
                  <span className="text-[10px] text-[#80756b] block">Total Deal Value</span>
                  <span className="text-sm font-semibold text-[#1b1c19]">
                    {formatCurrency(selectedTerritory.total_deal_value)}
                  </span>
                </div>

                <div className="bg-[#fbf9f4] p-2.5 rounded border border-[#f0eee9]">
                  <span className="text-[10px] text-[#80756b] block">Avg Deal Value</span>
                  <span className="text-sm font-semibold text-[#1b1c19]">
                    {formatCurrency(selectedTerritory.avg_deal_value)}
                  </span>
                </div>

                <div className="bg-[#fbf9f4] p-2.5 rounded border border-[#f0eee9]">
                  <span className="text-[10px] text-[#80756b] block">Density Score</span>
                  <span className="text-sm font-semibold text-[#735c41]">
                    {selectedTerritory.density_score.toFixed(1)} / 100
                  </span>
                </div>
              </div>

              {selectedTerritory.postal_code_patterns && (
                <div className="text-xs text-[#4e453d] bg-[#f0eee9]/50 p-2 rounded">
                  <span className="font-semibold text-[#1b1c19]">Mapped Postal Patterns:</span>{' '}
                  <code className="font-mono text-[#735c41]">{selectedTerritory.postal_code_patterns}</code>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Unassigned Territory Drawer Panel [FR-008, Edge Cases] */}
      {isDrawerOpen && (
        <div
          data-testid="unassigned-drawer-panel"
          className="fixed inset-y-0 right-0 w-full max-w-lg bg-[#fbf9f4] border-l border-[#d1c4b9] shadow-2xl z-50 p-6 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300"
        >
          {/* Drawer Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#d1c4b9] pb-3">
              <div className="flex items-center gap-2">
                <Inbox className="w-5 h-5 text-[#b84a39]" />
                <div>
                  <h3 className="text-base font-serif text-[#1b1c19]">Unassigned Territory Drawer</h3>
                  <p className="text-xs text-[#80756b]">Unmapped or incomplete postal addresses</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                data-testid="close-unassigned-drawer-btn"
                className="p-1 rounded text-[#80756b] hover:text-[#1b1c19] hover:bg-[#e4e2dd] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Summary Banner */}
            <div className="bg-white p-3.5 rounded border border-[#d1c4b9] grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-[#80756b] block">Unassigned Leads</span>
                <span className="font-semibold text-sm text-[#b84a39]" data-testid="drawer-unassigned-count">
                  {formatNumber(effectiveData?.unassigned_drawer?.lead_count || summary.total_unassigned_leads)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#80756b] block">Deal Value</span>
                <span className="font-semibold text-sm text-[#1b1c19]">
                  {formatCurrency(effectiveData?.unassigned_drawer?.total_deal_value || 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#80756b] block">Revenue</span>
                <span className="font-semibold text-sm text-[#1b1c19]">
                  {formatCurrency(effectiveData?.unassigned_drawer?.total_revenue || 0)}
                </span>
              </div>
            </div>

            {/* Drawer Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#80756b] absolute left-3 top-2.5" />
              <input
                type="text"
                value={unassignedSearch}
                onChange={(e) => setUnassignedSearch(e.target.value)}
                placeholder="Search unassigned by lead ID, postal code, or stage..."
                data-testid="drawer-search-input"
                className="w-full text-xs pl-9 pr-3 py-2 rounded border border-[#d1c4b9] bg-white text-[#1b1c19] focus:outline-none focus:border-[#735c41]"
              />
            </div>
          </div>

          {/* Drawer Content List */}
          <div className="flex-1 my-4 overflow-y-auto space-y-3 pr-1">
            {filteredUnassignedEvents.length === 0 ? (
              <div
                data-testid="drawer-empty-state"
                className="text-center py-12 text-[#80756b] space-y-2 bg-white rounded border border-[#d1c4b9] p-4"
              >
                <CheckCircle2 className="w-8 h-8 text-[#735c41] mx-auto" />
                <p className="text-xs font-medium">No unassigned lead events found</p>
                <p className="text-[11px] text-[#80756b]">
                  {unassignedSearch
                    ? 'No events matched your search query.'
                    : 'All lead events are successfully mapped to defined territories.'}
                </p>
              </div>
            ) : (
              filteredUnassignedEvents.map((item) => (
                <div
                  key={item.id || item.lead_id}
                  data-testid={`unassigned-item-${item.lead_id}`}
                  className="bg-white p-3 rounded border border-[#d1c4b9] hover:border-[#b84a39] transition-colors space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-[#1b1c19]">
                      Lead: {item.lead_id}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-[#f0eee9] text-[#4e453d]">
                      {item.stage_name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#4e453d]">
                    <div>
                      <span className="text-[#80756b]">Postal Code:</span>{' '}
                      <span className="font-mono text-[#b84a39] font-medium">
                        {item.postal_code || 'Missing'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#80756b]">Quality Score:</span>{' '}
                      <span className="font-semibold text-[#1b1c19]">
                        {item.quality_score !== null && item.quality_score !== undefined
                          ? item.quality_score
                          : 'N/A'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#80756b]">Deal Value:</span>{' '}
                      <span className="font-semibold text-[#1b1c19]">
                        {formatCurrency(item.deal_value)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[#80756b]">Revenue:</span>{' '}
                      <span className="font-semibold text-[#1b1c19]">
                        {formatCurrency(item.revenue_amount)}
                      </span>
                    </div>
                  </div>

                  {item.event_timestamp && (
                    <div className="text-[10px] text-[#80756b] border-t border-[#f0eee9] pt-1.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#735c41]" />
                      <span>{item.event_timestamp}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer */}
          <div className="pt-3 border-t border-[#d1c4b9] flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              data-testid="close-drawer-bottom-btn"
              className="px-4 py-1.5 text-xs font-medium bg-[#735c41] text-white rounded hover:bg-[#58432a] transition-colors"
            >
              Close Drawer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TerritoryHeatMap;
