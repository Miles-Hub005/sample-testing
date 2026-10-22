import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AnalyticsPage from '../../src/app/analytics/page';
import { apiClient } from '../../src/services/apiClient';
import * as analyticsService from '../../src/services/analytics';
import {
  ChannelAcquisitionReportItem,
  FunnelStageItem,
  CampaignComparisonItem,
  TerritoryHeatmapResponse,
  LeadMeeting,
} from '../../src/services/analytics';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock apiClient and analyticsService
vi.mock('../../src/services/apiClient', async () => {
  const actual = await vi.importActual('../../src/services/apiClient');
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      getMe: vi.fn(),
    },
  };
});

vi.mock('../../src/services/analytics', async () => {
  const actual = await vi.importActual('../../src/services/analytics');
  return {
    ...actual,
    getChannelAcquisitionReport: vi.fn(),
    getConversionFunnelReport: vi.fn(),
    getCampaignComparisonReport: vi.fn(),
    getTerritoryHeatmap: vi.fn(),
    getCalendarMeetings: vi.fn(),
    submitMeetingNotes: vi.fn(),
    submitReportExportTask: vi.fn(),
  };
});

describe('AnalyticsPage Component [FR-001, FR-004, FR-006, FR-007, FR-009, FR-012, NFR-001]', () => {
  const mockUser = {
    user_id: 'usr_analytics_admin',
    email: 'marketing.lead@example.com',
    tenant_id: 'tnt_analytics_001',
    roles: ['ClientViewer', 'MarketingAdmin'],
  };

  const mockAcquisitionData: ChannelAcquisitionReportItem[] = [
    {
      channel_id: 'chan-paid-search',
      channel_name: 'Paid Search',
      lead_volume: 350,
      quality_score: 88.0,
      spend: 5000,
      revenue: 25000,
      roi: 400.0,
      roi_str: '+400.00%',
    },
  ];

  const mockFunnelData: FunnelStageItem[] = [
    {
      stage_name: 'Lead Ingestion',
      stage_count: 1000,
      conversion_rate: 100.0,
      dropoff_rate: 0.0,
      is_bottleneck: false,
      threshold_percent: 25.0,
      overall_conversion_rate: 100.0,
    },
    {
      stage_name: 'Qualified Lead',
      stage_count: 400,
      conversion_rate: 40.0,
      dropoff_rate: 60.0,
      is_bottleneck: true,
      threshold_percent: 25.0,
      overall_conversion_rate: 40.0,
    },
  ];

  const mockCampaignData: CampaignComparisonItem[] = [
    {
      campaign_id: 'cmp-001',
      campaign_name: 'Q3 Growth Campaign',
      budget: 15000,
      lead_volume: 500,
      relative_volume_pct: 100.0,
      cost_per_lead: 30.0,
      cost_per_lead_str: '$30.00',
      total_revenue: 60000,
      avg_quality_score: 85.0,
      engagement_rate: 18.5,
      engagement_rate_str: '18.5%',
      time_series: [],
      trend_points: [],
    },
  ];

  const mockHeatmapData: TerritoryHeatmapResponse = {
    territories: [
      {
        territory_id: 'ter-us-east',
        territory_code: 'US-EAST',
        territory_name: 'US East Region',
        lead_count: 250,
        total_deal_value: 120000,
        total_revenue: 95000,
        avg_deal_value: 480,
        density_score: 85.5,
      },
    ],
    unassigned_drawer: {
      lead_count: 12,
      total_deal_value: 5000,
      total_revenue: 4000,
      unassigned_events: [],
    },
    summary: {
      total_mapped_leads: 250,
      total_unassigned_leads: 12,
      total_leads: 262,
      total_deal_value: 125000,
      total_revenue: 99000,
    },
  };

  const mockCalendarData: LeadMeeting[] = [
    {
      id: 'mtg-001',
      lead_id: 'lead-999',
      scheduled_time: '2026-10-15T14:00:00Z',
      prep_notes: 'Enterprise SLA review',
      meeting_notes: null,
      followup_tasks: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(apiClient.getMe).mockResolvedValue(mockUser);
    vi.mocked(analyticsService.getChannelAcquisitionReport).mockResolvedValue(mockAcquisitionData);
    vi.mocked(analyticsService.getConversionFunnelReport).mockResolvedValue(mockFunnelData);
    vi.mocked(analyticsService.getCampaignComparisonReport).mockResolvedValue(mockCampaignData);
    vi.mocked(analyticsService.getTerritoryHeatmap).mockResolvedValue(mockHeatmapData);
    vi.mocked(analyticsService.getCalendarMeetings).mockResolvedValue(mockCalendarData);
    vi.mocked(analyticsService.submitReportExportTask).mockResolvedValue({
      task_id: 'task-export-uuid-12345',
    });
  });

  it('renders analytics page header, title, user profile, and section headings', async () => {
    render(<AnalyticsPage />);

    expect(screen.getByText('Lead Acquisition & Marketing Analytics')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('marketing.lead@example.com')).toBeInTheDocument();
    });

    expect(screen.getByTestId('acquisition-report-section')).toBeInTheDocument();
    expect(screen.getByTestId('conversion-funnel-section')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-comparison-section')).toBeInTheDocument();
    expect(screen.getByTestId('territory-heatmap-section')).toBeInTheDocument();
    expect(screen.getByTestId('meeting-calendar-section')).toBeInTheDocument();
  });

  it('allows switching view tabs to focus on specific analytics domains', async () => {
    render(<AnalyticsPage />);

    // Click 'Acquisition' tab
    const acqTabBtn = screen.getByRole('button', { name: /acquisition/i });
    fireEvent.click(acqTabBtn);

    expect(screen.getByTestId('acquisition-report-section')).toBeInTheDocument();
    expect(screen.queryByTestId('conversion-funnel-section')).not.toBeInTheDocument();

    // Click 'Funnel' tab
    const funnelTabBtn = screen.getByRole('button', { name: /funnel/i });
    fireEvent.click(funnelTabBtn);

    expect(screen.getByTestId('conversion-funnel-section')).toBeInTheDocument();
    expect(screen.queryByTestId('acquisition-report-section')).not.toBeInTheDocument();

    // Click 'All Analytics' tab
    const allTabBtn = screen.getByRole('button', { name: /all analytics/i });
    fireEvent.click(allTabBtn);

    expect(screen.getByTestId('acquisition-report-section')).toBeInTheDocument();
    expect(screen.getByTestId('conversion-funnel-section')).toBeInTheDocument();
  });

  it('triggers global date filter updates and refresh button', async () => {
    render(<AnalyticsPage />);

    const startDateInput = screen.getByLabelText('Filter start date');
    const endDateInput = screen.getByLabelText('Filter end date');

    fireEvent.change(startDateInput, { target: { value: '2026-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-12-31' } });

    expect(startDateInput).toHaveValue('2026-01-01');
    expect(endDateInput).toHaveValue('2026-12-31');

    // Click Refresh Data button
    const refreshBtn = screen.getByRole('button', { name: /refresh analytics data/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(analyticsService.getChannelAcquisitionReport).toHaveBeenCalled();
    });
  });

  it('opens export modal, submits export request, and displays returned task ID [FR-012]', async () => {
    render(<AnalyticsPage />);

    // Click Export Report trigger button
    const exportBtn = screen.getByRole('button', { name: /export report/i });
    fireEvent.click(exportBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Export Analytics Report')).toBeInTheDocument();

    // Click submit export request button inside modal
    const submitBtn = screen.getByRole('button', { name: /submit export request/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(analyticsService.submitReportExportTask).toHaveBeenCalledWith(
        expect.objectContaining({
          report_type: 'acquisition',
          export_format: 'csv',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Export Task Queued')).toBeInTheDocument();
      expect(screen.getByText('task-export-uuid-12345')).toBeInTheDocument();
    });
  });
});
