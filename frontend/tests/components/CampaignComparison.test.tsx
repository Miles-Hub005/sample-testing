import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  CampaignComparison,
  formatCurrency,
  formatPercent,
  formatNumber,
  MAX_CAMPAIGNS_LIMIT,
} from '../../src/components/analytics/CampaignComparison';
import { CampaignComparisonItem } from '../../src/services/analytics';
import * as analyticsService from '../../src/services/analytics';

// Mock analytics service
vi.mock('../../src/services/analytics', async () => {
  const actual = await vi.importActual('../../src/services/analytics');
  return {
    ...actual,
    getCampaignComparisonReport: vi.fn(),
  };
});

describe('CampaignComparison Component & Helpers [FR-006]', () => {
  const mockCampaignData: CampaignComparisonItem[] = [
    {
      campaign_id: 'cmp-1',
      campaign_name: 'Q4 Product Launch',
      budget: 20000,
      start_date_val: '2026-01-01',
      end_date_val: '2026-01-31',
      lead_volume: 500,
      relative_volume_pct: 62.5,
      cost_per_lead: 40.0,
      cost_per_lead_str: '$40.00',
      total_revenue: 120000,
      avg_quality_score: 85.5,
      engagement_rate: 18.2,
      engagement_rate_str: '18.2%',
      time_series: [
        {
          date_val: '2026-01-07',
          lead_volume: 100,
          cost_per_lead: 42.0,
          cost_per_lead_str: '$42.00',
          engagement_rate: 16.0,
          revenue: 20000,
        },
        {
          date_val: '2026-01-14',
          lead_volume: 200,
          cost_per_lead: 38.0,
          cost_per_lead_str: '$38.00',
          engagement_rate: 19.5,
          revenue: 50000,
        },
        {
          date_val: '2026-01-21',
          lead_volume: 200,
          cost_per_lead: 40.0,
          cost_per_lead_str: '$40.00',
          engagement_rate: 18.0,
          revenue: 50000,
        },
      ],
    },
    {
      campaign_id: 'cmp-2',
      campaign_name: 'Retargeting Blitz',
      budget: 10000,
      start_date_val: '2026-01-01',
      end_date_val: '2026-01-31',
      lead_volume: 300,
      relative_volume_pct: 37.5,
      cost_per_lead: 33.33,
      cost_per_lead_str: '$33.33',
      total_revenue: 75000,
      avg_quality_score: 78.0,
      engagement_rate: 14.5,
      engagement_rate_str: '14.5%',
      time_series: [
        {
          date_val: '2026-01-07',
          lead_volume: 80,
          cost_per_lead: 35.0,
          cost_per_lead_str: '$35.00',
          engagement_rate: 13.0,
          revenue: 15000,
        },
        {
          date_val: '2026-01-14',
          lead_volume: 110,
          cost_per_lead: 32.0,
          cost_per_lead_str: '$32.00',
          engagement_rate: 15.0,
          revenue: 30000,
        },
        {
          date_val: '2026-01-21',
          lead_volume: 110,
          cost_per_lead: 33.0,
          cost_per_lead_str: '$33.00',
          engagement_rate: 15.2,
          revenue: 30000,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Helper Functions [FR-006]', () => {
    it('formatCurrency formats numbers into USD currency strings', () => {
      expect(formatCurrency(1250.5)).toBe('$1,250.50');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
      expect(formatCurrency(NaN)).toBe('$0.00');
      expect(formatCurrency(10000, 0)).toBe('$10,000');
    });

    it('formatPercent formats numbers into percentage strings', () => {
      expect(formatPercent(12.345, 1)).toBe('12.3%');
      expect(formatPercent(100, 1)).toBe('100.0%');
      expect(formatPercent(0)).toBe('0.0%');
      expect(formatPercent(null)).toBe('0.0%');
      expect(formatPercent(undefined)).toBe('0.0%');
      expect(formatPercent(NaN)).toBe('0.0%');
    });

    it('formatNumber formats numbers with comma separators', () => {
      expect(formatNumber(15000)).toBe('15,000');
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
      expect(formatNumber(-10)).toBe('0');
    });

    it('MAX_CAMPAIGNS_LIMIT is equal to 5', () => {
      expect(MAX_CAMPAIGNS_LIMIT).toBe(5);
    });
  });

  describe('Component Rendering with Pre-loaded Data [FR-006]', () => {
    it('renders header, campaign highlights, overlay chart, and table', () => {
      render(<CampaignComparison data={mockCampaignData} />);

      expect(screen.getByTestId('campaign-comparison')).toBeInTheDocument();
      expect(screen.getByText('Campaign Comparison Analytics')).toBeInTheDocument();

      // Check highlights
      expect(screen.getByTestId('campaign-highlights')).toBeInTheDocument();
      expect(screen.getByText('Q4 Product Launch')).toBeInTheDocument();
      expect(screen.getByText('Retargeting Blitz')).toBeInTheDocument();

      // Check overlay chart section
      expect(screen.getByTestId('trend-overlay-chart')).toBeInTheDocument();

      // Check detailed comparison table
      expect(screen.getByTestId('comparison-table')).toBeInTheDocument();
      expect(screen.getByTestId('comparison-row-cmp-1')).toBeInTheDocument();
      expect(screen.getByTestId('comparison-row-cmp-2')).toBeInTheDocument();
    });

    it('allows toggling active trend metric in overlay chart', () => {
      render(<CampaignComparison data={mockCampaignData} />);

      const cplBtn = screen.getByTestId('metric-toggle-cpl');
      fireEvent.click(cplBtn);
      expect(cplBtn).toHaveClass('bg-[#59452b]');

      const engagementBtn = screen.getByTestId('metric-toggle-engagement');
      fireEvent.click(engagementBtn);
      expect(engagementBtn).toHaveClass('bg-[#59452b]');

      const volumeBtn = screen.getByTestId('metric-toggle-volume');
      fireEvent.click(volumeBtn);
      expect(volumeBtn).toHaveClass('bg-[#59452b]');
    });
  });

  describe('Campaign Selection & Maximum 5 Limit Enforcement [FR-006]', () => {
    it('enforces maximum 5 campaigns selection limit with warning message', async () => {
      const available = [
        { campaign_id: 'cmp-1', campaign_name: 'Camp 1' },
        { campaign_id: 'cmp-2', campaign_name: 'Camp 2' },
        { campaign_id: 'cmp-3', campaign_name: 'Camp 3' },
        { campaign_id: 'cmp-4', campaign_name: 'Camp 4' },
        { campaign_id: 'cmp-5', campaign_name: 'Camp 5' },
        { campaign_id: 'cmp-6', campaign_name: 'Camp 6' },
      ];

      render(
        <CampaignComparison
          data={[]}
          availableCampaigns={available}
          initialFilters={{ campaign_ids: ['cmp-1', 'cmp-2', 'cmp-3', 'cmp-4', 'cmp-5'] }}
        />
      );

      // Attempt to select 6th campaign
      const camp6Toggle = screen.getByTestId('campaign-toggle-cmp-6');
      fireEvent.click(camp6Toggle);

      // Warning should appear
      expect(screen.getByTestId('limit-warning')).toBeInTheDocument();
      expect(screen.getByText('Maximum 5 campaigns limit reached')).toBeInTheDocument();
    });

    it('allows adding custom campaign ID via text input', () => {
      const onFilterChange = vi.fn();
      render(
        <CampaignComparison
          data={mockCampaignData}
          onFilterChange={onFilterChange}
          initialFilters={{ campaign_ids: ['cmp-1'] }}
        />
      );

      const input = screen.getByTestId('custom-campaign-input');
      const addBtn = screen.getByTestId('add-custom-campaign-btn');

      fireEvent.change(input, { target: { value: 'cmp-custom-99' } });
      fireEvent.click(addBtn);

      expect(onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign_ids: ['cmp-1', 'cmp-custom-99'],
        })
      );
    });

    it('displays empty selection notice when fewer than 2 campaigns selected', () => {
      render(
        <CampaignComparison
          data={[]}
          initialFilters={{ campaign_ids: ['cmp-1'] }}
        />
      );

      expect(screen.getByTestId('empty-selection-notice')).toBeInTheDocument();
      expect(screen.getByText('Select at least 2 campaigns')).toBeInTheDocument();
    });
  });

  describe('API Fetching & Error Handling [FR-006]', () => {
    it('fetches comparison data automatically when data prop is omitted', async () => {
      (analyticsService.getCampaignComparisonReport as any).mockResolvedValueOnce(mockCampaignData);

      render(<CampaignComparison initialFilters={{ campaign_ids: ['cmp-1', 'cmp-2'] }} />);

      await waitFor(() => {
        expect(analyticsService.getCampaignComparisonReport).toHaveBeenCalledWith({
          campaign_ids: ['cmp-1', 'cmp-2'],
          start_date_val: undefined,
          end_date_val: undefined,
        });
      });

      expect(screen.getByTestId('campaign-highlights')).toBeInTheDocument();
    });

    it('renders error banner and handles retry click on API error', async () => {
      (analyticsService.getCampaignComparisonReport as any).mockRejectedValueOnce(
        new Error('Network error loading campaign comparison data')
      );

      render(<CampaignComparison initialFilters={{ campaign_ids: ['cmp-1', 'cmp-2'] }} />);

      await waitFor(() => {
        expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      });

      expect(screen.getByText('Network error loading campaign comparison data')).toBeInTheDocument();

      // Retry
      (analyticsService.getCampaignComparisonReport as any).mockResolvedValueOnce(mockCampaignData);
      const retryBtn = screen.getByTestId('retry-btn');
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByTestId('comparison-table')).toBeInTheDocument();
      });
    });

    it('applies date filter and triggers compare button action', async () => {
      (analyticsService.getCampaignComparisonReport as any).mockResolvedValue(mockCampaignData);

      render(
        <CampaignComparison
          initialFilters={{ campaign_ids: ['cmp-1', 'cmp-2'] }}
        />
      );

      const startDateInput = screen.getByTestId('start-date-input');
      const endDateInput = screen.getByTestId('end-date-input');
      const compareBtn = screen.getByTestId('compare-btn');

      fireEvent.change(startDateInput, { target: { value: '2026-01-01' } });
      fireEvent.change(endDateInput, { target: { value: '2026-01-31' } });
      fireEvent.click(compareBtn);

      await waitFor(() => {
        expect(analyticsService.getCampaignComparisonReport).toHaveBeenCalledWith({
          campaign_ids: ['cmp-1', 'cmp-2'],
          start_date_val: '2026-01-01',
          end_date_val: '2026-01-31',
        });
      });
    });
  });
});
