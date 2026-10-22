import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ConversionFunnel,
  formatPercent,
  formatStageCount,
  computeFunnelSummary,
  detectBottlenecks,
  calculateStageLoss,
} from '../../src/components/analytics/ConversionFunnel';
import { FunnelStageItem } from '../../src/services/analytics';
import * as analyticsService from '../../src/services/analytics';

// Mock analytics service
vi.mock('../../src/services/analytics', async () => {
  const actual = await vi.importActual('../../src/services/analytics');
  return {
    ...actual,
    getConversionFunnelReport: vi.fn(),
  };
});

describe('ConversionFunnel Component & Helpers [FR-004, FR-005, NFR-001]', () => {
  const mockFunnelStages: FunnelStageItem[] = [
    {
      stage_name: 'LEAD',
      stage_count: 1000,
      conversion_rate: 100.0,
      dropoff_rate: 0.0,
      is_bottleneck: false,
      threshold_percent: 50.0,
      overall_conversion_rate: 100.0,
    },
    {
      stage_name: 'MQL',
      stage_count: 400,
      conversion_rate: 40.0,
      dropoff_rate: 60.0, // Exceeds threshold (60.0 > 50.0) -> Bottleneck!
      is_bottleneck: true,
      threshold_percent: 50.0,
      overall_conversion_rate: 40.0,
    },
    {
      stage_name: 'SQL',
      stage_count: 300,
      conversion_rate: 75.0,
      dropoff_rate: 25.0,
      is_bottleneck: false,
      threshold_percent: 40.0,
      overall_conversion_rate: 30.0,
    },
    {
      stage_name: 'CLOSED_WON',
      stage_count: 150,
      conversion_rate: 50.0,
      dropoff_rate: 50.0,
      is_bottleneck: false,
      threshold_percent: 60.0,
      overall_conversion_rate: 15.0,
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Helper Functions [FR-004, FR-005]', () => {
    it('formatPercent formats numbers to 1 decimal place with %', () => {
      expect(formatPercent(45.23)).toBe('45.2%');
      expect(formatPercent(100)).toBe('100.0%');
      expect(formatPercent(0)).toBe('0.0%');
      expect(formatPercent(null)).toBe('0.0%');
      expect(formatPercent(undefined)).toBe('0.0%');
      expect(formatPercent(NaN)).toBe('0.0%');
    });

    it('formatStageCount formats numeric counts with comma separators', () => {
      expect(formatStageCount(1250)).toBe('1,250');
      expect(formatStageCount(1000000)).toBe('1,000,000');
      expect(formatStageCount(0)).toBe('0');
      expect(formatStageCount(null)).toBe('0');
      expect(formatStageCount(undefined)).toBe('0');
    });

    it('computeFunnelSummary aggregates metrics across stages correctly', () => {
      const summary = computeFunnelSummary(mockFunnelStages);
      expect(summary.topStageCount).toBe(1000);
      expect(summary.convertedCount).toBe(150);
      expect(summary.overallConversionRate).toBe(15.0);
      expect(summary.totalDropoffs).toBe(850);
      expect(summary.bottleneckCount).toBe(1);
    });

    it('computeFunnelSummary handles empty stages array gracefully', () => {
      const summary = computeFunnelSummary([]);
      expect(summary.topStageCount).toBe(0);
      expect(summary.convertedCount).toBe(0);
      expect(summary.overallConversionRate).toBe(0);
      expect(summary.totalDropoffs).toBe(0);
      expect(summary.bottleneckCount).toBe(0);
    });

    it('detectBottlenecks identifies stages exceeding dropoff threshold or marked as bottleneck', () => {
      const bottlenecks = detectBottlenecks(mockFunnelStages);
      expect(bottlenecks).toHaveLength(1);
      expect(bottlenecks[0].stage_name).toBe('MQL');
    });

    it('calculateStageLoss computes lead loss from previous stage', () => {
      expect(calculateStageLoss(mockFunnelStages, 0)).toBe(0);
      expect(calculateStageLoss(mockFunnelStages, 1)).toBe(600); // 1000 - 400
      expect(calculateStageLoss(mockFunnelStages, 2)).toBe(100); // 400 - 300
      expect(calculateStageLoss(mockFunnelStages, 3)).toBe(150); // 300 - 150
      expect(calculateStageLoss(mockFunnelStages, 99)).toBe(0);
    });
  });

  describe('Component Rendering & Behavior [FR-004, FR-005]', () => {
    it('renders with pre-loaded data prop and displays summary cards, stages, and bottleneck alerts', () => {
      render(<ConversionFunnel data={mockFunnelStages} />);

      expect(screen.getByTestId('conversion-funnel')).toBeInTheDocument();
      expect(screen.getByText('Conversion Funnel Analysis')).toBeInTheDocument();

      // Summary KPI cards
      expect(screen.getByTestId('funnel-summary')).toBeInTheDocument();
      expect(screen.getByText('1,000')).toBeInTheDocument(); // Top volume
      expect(screen.getByText('150')).toBeInTheDocument(); // Converted leads
      expect(screen.getByText('15.0%')).toBeInTheDocument(); // Overall conversion

      // Bottleneck alert banner
      expect(screen.getByTestId('bottleneck-alert-banner')).toBeInTheDocument();
      expect(screen.getByText('Conversion Bottleneck Alert Detected!')).toBeInTheDocument();

      // Stage cards
      expect(screen.getByTestId('funnel-stage-card-LEAD')).toBeInTheDocument();
      expect(screen.getByTestId('funnel-stage-card-MQL')).toBeInTheDocument();
      expect(screen.getByTestId('funnel-stage-card-SQL')).toBeInTheDocument();
      expect(screen.getByTestId('funnel-stage-card-CLOSED_WON')).toBeInTheDocument();

      // Bottleneck badge on MQL stage
      expect(screen.getByTestId('bottleneck-badge-MQL')).toBeInTheDocument();

      // Stage breakdown table
      expect(screen.getByTestId('funnel-table')).toBeInTheDocument();
    });

    it('fetches conversion funnel report on mount when data prop is not provided', async () => {
      (analyticsService.getConversionFunnelReport as any).mockResolvedValueOnce(
        mockFunnelStages
      );

      render(<ConversionFunnel />);

      await waitFor(() => {
        expect(analyticsService.getConversionFunnelReport).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByTestId('funnel-stage-card-LEAD')).toBeInTheDocument();
    });

    it('submits filter query when Apply Filters button is clicked', async () => {
      (analyticsService.getConversionFunnelReport as any).mockResolvedValue(
        mockFunnelStages
      );

      render(<ConversionFunnel />);

      await waitFor(() => {
        expect(analyticsService.getConversionFunnelReport).toHaveBeenCalledTimes(1);
      });

      const funnelIdInput = screen.getByTestId('funnel-id-input');
      const startDateInput = screen.getByTestId('start-date-input');
      const endDateInput = screen.getByTestId('end-date-input');
      const channelIdInput = screen.getByTestId('channel-id-input');

      fireEvent.change(funnelIdInput, { target: { value: 'custom-funnel-123' } });
      fireEvent.change(startDateInput, { target: { value: '2026-01-01' } });
      fireEvent.change(endDateInput, { target: { value: '2026-01-31' } });
      fireEvent.change(channelIdInput, { target: { value: 'chan-paid' } });

      const applyBtn = screen.getByTestId('apply-filters-button');
      fireEvent.click(applyBtn);

      await waitFor(() => {
        expect(analyticsService.getConversionFunnelReport).toHaveBeenCalledWith({
          funnel_id: 'custom-funnel-123',
          start_date_val: '2026-01-01',
          end_date_val: '2026-01-31',
          channel_id: 'chan-paid',
          campaign_id: null,
          territory_id: null,
        });
      });
    });

    it('resets filter inputs when Reset Filters button is clicked', async () => {
      (analyticsService.getConversionFunnelReport as any).mockResolvedValue(
        mockFunnelStages
      );

      render(<ConversionFunnel />);

      await waitFor(() => {
        expect(analyticsService.getConversionFunnelReport).toHaveBeenCalledTimes(1);
      });

      const funnelIdInput = screen.getByTestId('funnel-id-input') as HTMLInputElement;
      fireEvent.change(funnelIdInput, { target: { value: 'test-funnel' } });
      expect(funnelIdInput.value).toBe('test-funnel');

      const resetBtn = screen.getByTestId('reset-filters-button');
      fireEvent.click(resetBtn);

      expect(funnelIdInput.value).toBe('');

      await waitFor(() => {
        expect(analyticsService.getConversionFunnelReport).toHaveBeenCalledWith({
          funnel_id: null,
          start_date_val: null,
          end_date_val: null,
          channel_id: null,
          campaign_id: null,
          territory_id: null,
        });
      });
    });

    it('renders loading state indicator when isLoading is true', () => {
      render(<ConversionFunnel isLoading={true} />);
      expect(screen.getByTestId('funnel-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading conversion funnel data...')).toBeInTheDocument();
    });

    it('renders error state view and triggers retry callback on Retry button click', () => {
      const onRetryMock = vi.fn();
      render(<ConversionFunnel error="Failed to load funnel data" onRetry={onRetryMock} />);

      expect(screen.getByTestId('funnel-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load funnel data')).toBeInTheDocument();

      const retryBtn = screen.getByTestId('retry-button');
      fireEvent.click(retryBtn);

      expect(onRetryMock).toHaveBeenCalledTimes(1);
    });

    it('renders empty data state when funnel stages array is empty', () => {
      render(<ConversionFunnel data={[]} />);

      expect(screen.getByTestId('funnel-empty')).toBeInTheDocument();
      expect(
        screen.getByText('No Conversion Funnel Data Available')
      ).toBeInTheDocument();
    });
  });
});
