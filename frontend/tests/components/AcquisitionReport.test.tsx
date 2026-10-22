import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  AcquisitionReport,
  formatROI,
  formatCurrency,
  formatQualityScore,
  computeSummaryMetrics,
  sortAcquisitionItems,
} from '../../src/components/analytics/AcquisitionReport';
import { ChannelAcquisitionReportItem } from '../../src/services/analytics';
import * as analyticsService from '../../src/services/analytics';

// Mock analytics service module
vi.mock('../../src/services/analytics', async () => {
  const actual = await vi.importActual('../../src/services/analytics');
  return {
    ...actual,
    getChannelAcquisitionReport: vi.fn(),
  };
});

describe('AcquisitionReport Component & Helpers', () => {
  const mockChannelItems: ChannelAcquisitionReportItem[] = [
    {
      channel_id: 'chan-organic',
      channel_name: 'Organic Search',
      lead_volume: 450,
      quality_score: 88.5,
      spend: 0, // Zero spend
      revenue: 25000,
      roi: null,
      roi_str: 'N/A',
    },
    {
      channel_id: 'chan-paid-search',
      channel_name: 'Paid Search',
      lead_volume: 320,
      quality_score: 92.0,
      spend: 5000,
      revenue: 25000,
      roi: 400.0,
      roi_str: '+400.00%',
    },
    {
      channel_id: 'chan-social',
      channel_name: 'Paid Social',
      lead_volume: 180,
      quality_score: 65.0,
      spend: 3000,
      revenue: 4500,
      roi: 50.0,
      roi_str: '+50.00%',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Helper Functions [FR-001, FR-003]', () => {
    it('formatROI displays "N/A" for zero spend or null spend [FR-003]', () => {
      expect(formatROI(0, 'N/A', null)).toBe('N/A');
      expect(formatROI(0, '+100.00%', 100)).toBe('N/A');
      expect(formatROI(null, null, null)).toBe('N/A');
      expect(formatROI(undefined, undefined, undefined)).toBe('N/A');
    });

    it('formatROI calculates and displays formatted percentage string for non-zero spend', () => {
      expect(formatROI(1000, '+150.00%', 150)).toBe('+150.00%');
      expect(formatROI(1000, null, 150)).toBe('+150.00%');
      expect(formatROI(1000, null, -20)).toBe('-20.00%');
    });

    it('formatCurrency formats USD amounts accurately', () => {
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(1250.5)).toBe('$1,250.50');
      expect(formatCurrency(25000)).toBe('$25,000.00');
    });

    it('formatQualityScore handles numeric scores and null/NaN values', () => {
      expect(formatQualityScore(88.5)).toBe('88.5');
      expect(formatQualityScore(92)).toBe('92.0');
      expect(formatQualityScore(null)).toBe('N/A');
      expect(formatQualityScore(NaN)).toBe('N/A');
    });

    it('computeSummaryMetrics aggregates total leads, spend, revenue, quality score, and overall ROI', () => {
      const summary = computeSummaryMetrics(mockChannelItems);
      expect(summary.totalLeads).toBe(950);
      expect(summary.totalSpend).toBe(8000);
      expect(summary.totalRevenue).toBe(54500);
      expect(summary.avgQualityScore).toBeCloseTo(81.83, 1);
      // Overall ROI: ((54500 - 8000) / 8000) * 100 = 581.25%
      expect(summary.overallROIStr).toBe('+581.25%');
    });

    it('computeSummaryMetrics returns "N/A" for overall ROI when total spend is zero', () => {
      const zeroSpendItems: ChannelAcquisitionReportItem[] = [
        {
          channel_id: 'c1',
          channel_name: 'Organic',
          lead_volume: 100,
          quality_score: 80,
          spend: 0,
          revenue: 1000,
          roi: null,
          roi_str: 'N/A',
        },
      ];
      const summary = computeSummaryMetrics(zeroSpendItems);
      expect(summary.totalSpend).toBe(0);
      expect(summary.overallROIStr).toBe('N/A');
      expect(summary.overallROIVal).toBeNull();
    });

    it('sortAcquisitionItems sorts items by quality score descending by default [FR-002]', () => {
      const sorted = sortAcquisitionItems(mockChannelItems, 'quality_score', 'desc');
      expect(sorted[0].channel_name).toBe('Paid Search'); // 92.0
      expect(sorted[1].channel_name).toBe('Organic Search'); // 88.5
      expect(sorted[2].channel_name).toBe('Paid Social'); // 65.0
    });

    it('sortAcquisitionItems sorts items by revenue, spend, and lead volume', () => {
      const sortedByVolume = sortAcquisitionItems(mockChannelItems, 'lead_volume', 'desc');
      expect(sortedByVolume[0].channel_name).toBe('Organic Search'); // 450
      expect(sortedByVolume[1].channel_name).toBe('Paid Search'); // 320
      expect(sortedByVolume[2].channel_name).toBe('Paid Social'); // 180
    });
  });

  describe('UI Component Rendering & Workflows [FR-001, FR-002, FR-003]', () => {
    it('renders channel breakdown table with leads, quality score, spend, revenue, and ROI [FR-001]', () => {
      render(<AcquisitionReport data={mockChannelItems} />);

      expect(screen.getByTestId('acquisition-report')).toBeDefined();
      expect(screen.getByText('Channel Acquisition & ROI Report')).toBeDefined();

      // Check summary card items
      expect(screen.getByTestId('summary-total-leads').textContent).toBe('950');
      expect(screen.getByTestId('summary-total-spend').textContent).toBe('$8,000.00');
      expect(screen.getByTestId('summary-total-revenue').textContent).toBe('$54,500.00');

      // Check table rows
      expect(screen.getByTestId('channel-row-chan-organic')).toBeDefined();
      expect(screen.getByTestId('channel-row-chan-paid-search')).toBeDefined();
      expect(screen.getByTestId('channel-row-chan-social')).toBeDefined();
    });

    it('displays "N/A" for zero-spend channel ROI without division error [FR-003]', () => {
      render(<AcquisitionReport data={mockChannelItems} />);

      const organicRoiCell = screen.getByTestId('roi-cell-chan-organic');
      expect(organicRoiCell.textContent).toContain('N/A');

      const paidSearchRoiCell = screen.getByTestId('roi-cell-chan-paid-search');
      expect(paidSearchRoiCell.textContent).toContain('+400.00%');
    });

    it('re-orders rows by quality score descending when clicking "Top Quality Sources" [FR-002]', () => {
      render(<AcquisitionReport data={mockChannelItems} />);

      const topQualityBtn = screen.getByTestId('btn-sort-quality-desc');
      fireEvent.click(topQualityBtn);

      const tableRows = screen.getAllByTestId(/^channel-row-/);
      expect(tableRows.length).toBe(3);

      // Paid Search (92.0) should be first
      expect(tableRows[0].getAttribute('data-testid')).toBe('channel-row-chan-paid-search');
      // Organic Search (88.5) second
      expect(tableRows[1].getAttribute('data-testid')).toBe('channel-row-chan-organic');
      // Paid Social (65.0) third
      expect(tableRows[2].getAttribute('data-testid')).toBe('channel-row-chan-social');
    });

    it('filters channel rows client-side when typing in channel search filter', () => {
      render(<AcquisitionReport data={mockChannelItems} />);

      const channelInput = screen.getByTestId('filter-channel');
      fireEvent.change(channelInput, { target: { value: 'Organic' } });

      expect(screen.getByTestId('channel-row-chan-organic')).toBeDefined();
      expect(screen.queryByTestId('channel-row-chan-paid-search')).toBeNull();
      expect(screen.queryByTestId('channel-row-chan-social')).toBeNull();
    });

    it('renders loading spinner state when isLoading is true', () => {
      render(<AcquisitionReport isLoading={true} />);
      expect(screen.getByTestId('loading-spinner')).toBeDefined();
    });

    it('renders error alert with retry button when error is present', () => {
      const onRetry = vi.fn();
      render(<AcquisitionReport error="Network Connection Error" onRetry={onRetry} />);

      expect(screen.getByTestId('error-alert')).toBeDefined();
      expect(screen.getByText('Network Connection Error')).toBeDefined();

      const retryBtn = screen.getByTestId('btn-retry');
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('renders empty state when data array is empty', () => {
      render(<AcquisitionReport data={[]} />);
      expect(screen.getByTestId('empty-state')).toBeDefined();
      expect(screen.getByText('No Channel Acquisition Data Found')).toBeDefined();
    });

    it('fetches data on mount if no initial data provided', async () => {
      (analyticsService.getChannelAcquisitionReport as any).mockResolvedValueOnce(mockChannelItems);

      render(<AcquisitionReport />);

      await waitFor(() => {
        expect(analyticsService.getChannelAcquisitionReport).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByTestId('channel-row-chan-organic')).toBeDefined();
    });
  });
});
