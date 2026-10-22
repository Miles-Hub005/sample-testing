import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  TerritoryHeatMap,
  formatCurrency,
  formatNumber,
  formatPercent,
  getDensityBand,
} from '../../src/components/analytics/TerritoryHeatMap';
import { TerritoryHeatmapResponse } from '../../src/services/analytics';
import * as analyticsService from '../../src/services/analytics';

// Mock analytics service
vi.mock('../../src/services/analytics', async () => {
  const actual = await vi.importActual('../../src/services/analytics');
  return {
    ...actual,
    getTerritoryHeatmap: vi.fn(),
  };
});

describe('TerritoryHeatMap Component & Helpers [FR-007, FR-008]', () => {
  const mockHeatmapData: TerritoryHeatmapResponse = {
    territories: [
      {
        territory_id: 'terr-1',
        territory_code: 'NA-WEST',
        territory_name: 'North America West',
        postal_code_patterns: '900*, 941*, 981*',
        lead_count: 450,
        total_deal_value: 350000,
        total_revenue: 280000,
        avg_deal_value: 777.78,
        density_score: 88.5,
      },
      {
        territory_id: 'terr-2',
        territory_code: 'EU-CENTRAL',
        territory_name: 'Europe Central',
        postal_code_patterns: '10*, 80*, 60*',
        lead_count: 220,
        total_deal_value: 180000,
        total_revenue: 140000,
        avg_deal_value: 818.18,
        density_score: 62.0,
      },
      {
        territory_id: 'terr-3',
        territory_code: 'APAC-SOUTH',
        territory_name: 'Asia Pacific South',
        postal_code_patterns: '2000*, 3000*',
        lead_count: 90,
        total_deal_value: 60000,
        total_revenue: 45000,
        avg_deal_value: 666.67,
        density_score: 35.0,
      },
    ],
    unassigned_drawer: {
      lead_count: 30,
      total_deal_value: 25000,
      total_revenue: 18000,
      unassigned_events: [
        {
          id: 'ev-101',
          lead_id: 'lead-991',
          stage_name: 'QUALIFIED',
          quality_score: 75,
          deal_value: 12000,
          revenue_amount: 9000,
          postal_code: 'UNKNOWN_99',
          event_timestamp: '2026-01-15T10:00:00Z',
        },
        {
          id: 'ev-102',
          lead_id: 'lead-992',
          stage_name: 'NEW_LEAD',
          quality_score: 50,
          deal_value: 13000,
          revenue_amount: 9000,
          postal_code: null,
          event_timestamp: '2026-01-16T14:30:00Z',
        },
      ],
    },
    summary: {
      total_mapped_leads: 760,
      total_unassigned_leads: 30,
      total_leads: 790,
      total_deal_value: 590000,
      total_revenue: 465000,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (analyticsService.getTerritoryHeatmap as any).mockResolvedValue(mockHeatmapData);
  });

  // Helper unit tests
  describe('Helper Formatting Functions', () => {
    it('formatCurrency formats null/undefined/numbers correctly', () => {
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(12500.5)).toBe('$12,500.50');
    });

    it('formatNumber formats counts with commas', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(1250)).toBe('1,250');
    });

    it('formatPercent formats float percentages', () => {
      expect(formatPercent(null)).toBe('0.0%');
      expect(formatPercent(85.432)).toBe('85.4%');
    });

    it('getDensityBand returns correct band properties', () => {
      expect(getDensityBand(85).label).toBe('High Density');
      expect(getDensityBand(60).label).toBe('Medium Density');
      expect(getDensityBand(35).label).toBe('Low Density');
      expect(getDensityBand(10).label).toBe('Minimal Density');
    });
  });

  // Component unit tests
  describe('TerritoryHeatMap Component Rendering [FR-007]', () => {
    it('renders header, summary KPI cards, and territory grid with pre-loaded data', () => {
      render(<TerritoryHeatMap data={mockHeatmapData} />);

      expect(screen.getByText('Territory Performance & Heat Map')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-mapped-leads')).toHaveTextContent('760');
      expect(screen.getByTestId('kpi-unassigned-leads')).toHaveTextContent('30');
      expect(screen.getByTestId('kpi-total-leads')).toHaveTextContent('790');

      // Territory cards
      expect(screen.getByText('North America West')).toBeInTheDocument();
      expect(screen.getByText('Europe Central')).toBeInTheDocument();
      expect(screen.getByText('Asia Pacific South')).toBeInTheDocument();
    });

    it('switches metric mode density scores, volume, deal value, revenue', () => {
      render(<TerritoryHeatMap data={mockHeatmapData} />);

      const leadsMetricBtn = screen.getByTestId('metric-mode-leads');
      fireEvent.click(leadsMetricBtn);

      const dealValBtn = screen.getByTestId('metric-mode-deal-value');
      fireEvent.click(dealValBtn);

      expect(dealValBtn).toHaveClass('bg-[#735c41]');
    });

    it('switches view mode between Grid, Map, and Table views', () => {
      render(<TerritoryHeatMap data={mockHeatmapData} />);

      // Switch to Map view
      const mapViewBtn = screen.getByTestId('view-mode-map');
      fireEvent.click(mapViewBtn);
      expect(screen.getByTestId('territory-map-view')).toBeInTheDocument();

      // Switch to Table view
      const tableViewBtn = screen.getByTestId('view-mode-table');
      fireEvent.click(tableViewBtn);
      expect(screen.getByTestId('territory-table-view')).toBeInTheDocument();

      // Switch back to Grid view
      const gridViewBtn = screen.getByTestId('view-mode-grid');
      fireEvent.click(gridViewBtn);
      expect(screen.getByTestId('territory-grid-view')).toBeInTheDocument();
    });

    it('opens territory detail modal when clicking a territory card', () => {
      render(<TerritoryHeatMap data={mockHeatmapData} />);

      const terrCard = screen.getByTestId('territory-card-terr-1');
      fireEvent.click(terrCard);

      expect(screen.getByTestId('territory-detail-modal')).toBeInTheDocument();
      expect(screen.getByText(/Territory Detail: North America West/i)).toBeInTheDocument();

      // Close modal
      const closeBtn = screen.getByTestId('close-detail-modal-btn');
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId('territory-detail-modal')).not.toBeInTheDocument();
    });
  });

  describe('Filter Panel & Unassigned Drawer [FR-008]', () => {
    it('opens filter panel, inputs filters, and invokes onFilterChange', async () => {
      const handleFilterChange = vi.fn();
      render(<TerritoryHeatMap data={mockHeatmapData} onFilterChange={handleFilterChange} />);

      // Open filter panel
      const toggleFiltersBtn = screen.getByTestId('toggle-filters-btn');
      fireEvent.click(toggleFiltersBtn);

      expect(screen.getByTestId('heatmap-filter-panel')).toBeInTheDocument();

      // Fill in lead status and min deal value
      const statusInput = screen.getByTestId('filter-lead-status-input');
      fireEvent.change(statusInput, { target: { value: 'QUALIFIED' } });

      const minDealInput = screen.getByTestId('filter-min-deal-input');
      fireEvent.change(minDealInput, { target: { value: '5000' } });

      // Apply filters
      const applyBtn = screen.getByTestId('apply-filters-btn');
      fireEvent.click(applyBtn);

      expect(handleFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_status: 'QUALIFIED',
          min_deal_value: 5000,
        })
      );
    });

    it('opens Unassigned Territory drawer, searches events, and closes drawer', () => {
      render(<TerritoryHeatMap data={mockHeatmapData} />);

      // Click KPI card or drawer button to open
      const openDrawerBtn = screen.getByTestId('open-unassigned-drawer-btn');
      fireEvent.click(openDrawerBtn);

      expect(screen.getByTestId('unassigned-drawer-panel')).toBeInTheDocument();
      expect(screen.getByTestId('unassigned-item-lead-991')).toBeInTheDocument();
      expect(screen.getByTestId('unassigned-item-lead-992')).toBeInTheDocument();

      // Search inside drawer
      const searchInput = screen.getByTestId('drawer-search-input');
      fireEvent.change(searchInput, { target: { value: 'lead-991' } });

      expect(screen.getByTestId('unassigned-item-lead-991')).toBeInTheDocument();
      expect(screen.queryByTestId('unassigned-item-lead-992')).not.toBeInTheDocument();

      // Close drawer
      const closeDrawerBtn = screen.getByTestId('close-unassigned-drawer-btn');
      fireEvent.click(closeDrawerBtn);

      expect(screen.queryByTestId('unassigned-drawer-panel')).not.toBeInTheDocument();
    });
  });

  describe('Data Fetching, Loading & Error States', () => {
    it('fetches data on mount when no data prop is provided', async () => {
      render(<TerritoryHeatMap />);

      await waitFor(() => {
        expect(analyticsService.getTerritoryHeatmap).toHaveBeenCalled();
      });

      expect(screen.getByText('North America West')).toBeInTheDocument();
    });

    it('displays loading state when isLoading prop is true', () => {
      render(<TerritoryHeatMap isLoading={true} />);

      expect(screen.getByTestId('heatmap-loading')).toBeInTheDocument();
    });

    it('displays error state and handles retry button', () => {
      const handleRetry = vi.fn();
      render(<TerritoryHeatMap error="Failed to load map data" onRetry={handleRetry} />);

      expect(screen.getByTestId('heatmap-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load map data')).toBeInTheDocument();

      const retryBtn = screen.getByTestId('error-retry-btn');
      fireEvent.click(retryBtn);

      expect(handleRetry).toHaveBeenCalled();
    });
  });
});
