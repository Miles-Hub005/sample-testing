import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analyticsApi,
  buildQueryString,
  createReportConfigAuditLog,
  deleteReportConfiguration,
  formatDateParam,
  getCalendarMeetings,
  getCampaignComparisonReport,
  getChannelAcquisitionReport,
  getConversionFunnelReport,
  getTerritoryHeatmap,
  submitMeetingNotes,
  submitReportExportTask,
} from '../../src/services/analytics';
import { apiFetch } from '../../src/services/apiClient';

vi.mock('../../src/services/apiClient', async () => {
  const actual = await vi.importActual('../../src/services/apiClient');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

describe('Lead Acquisition & Marketing Analytics API Client Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Formatting & Query Building Helpers', () => {
    it('formatDateParam converts Date instances and trims strings', () => {
      const now = new Date('2026-10-06T12:00:00Z');
      expect(formatDateParam(now)).toBe('2026-10-06T12:00:00.000Z');
      expect(formatDateParam(' 2026-10-06T12:00:00Z ')).toBe('2026-10-06T12:00:00Z');
      expect(formatDateParam('   ')).toBeNull();
      expect(formatDateParam(null)).toBeNull();
      expect(formatDateParam(undefined)).toBeNull();
    });

    it('buildQueryString formats parameters correctly and ignores empty/null fields', () => {
      expect(buildQueryString()).toBe('');
      expect(buildQueryString({})).toBe('');

      const now = new Date('2026-10-06T00:00:00Z');
      const queryStr = buildQueryString({
        channel_id: 'chan-123',
        sort_by: 'quality_score',
        sort_order: 'desc',
        start_date_val: now,
        campaign_ids: ['cmp-1', 'cmp-2'],
        min_deal_value: 500,
        empty_str: '',
        nil_val: null,
        undef_val: undefined,
      });

      expect(queryStr).toContain('channel_id=chan-123');
      expect(queryStr).toContain('sort_by=quality_score');
      expect(queryStr).toContain('sort_order=desc');
      expect(queryStr).toContain('start_date_val=2026-10-06T00%3A00%3A00.000Z');
      expect(queryStr).toContain('campaign_ids=cmp-1%2Ccmp-2');
      expect(queryStr).toContain('min_deal_value=500');
      expect(queryStr).not.toContain('empty_str');
      expect(queryStr).not.toContain('nil_val');
      expect(queryStr).not.toContain('undef_val');
    });
  });

  describe('Channel Acquisition Analytics [FR-001, FR-002, FR-003]', () => {
    it('getChannelAcquisitionReport calls correct endpoint with query string', async () => {
      const mockData = [
        {
          channel_id: 'c1',
          channel_name: 'Paid Search',
          lead_volume: 150,
          quality_score: 85.5,
          spend: 3000,
          revenue: 15000,
          roi: 400,
          roi_str: '400.00%',
        },
      ];

      (apiFetch as any).mockResolvedValueOnce(mockData);

      const result = await getChannelAcquisitionReport({
        sort_by: 'revenue',
        sort_order: 'desc',
        channel_id: 'c1',
      });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/analytics/acquisition?channel_id=c1&sort_by=revenue&sort_order=desc'
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('Conversion Funnel Analytics [FR-004, FR-005]', () => {
    it('getConversionFunnelReport fetches funnel stages with filters', async () => {
      const mockFunnel = [
        {
          stage_name: 'LEAD',
          stage_count: 500,
          conversion_rate: 100,
          dropoff_rate: 0,
          is_bottleneck: false,
          threshold_percent: 40,
          overall_conversion_rate: 100,
        },
        {
          stage_name: 'MQL',
          stage_count: 200,
          conversion_rate: 40,
          dropoff_rate: 60,
          is_bottleneck: true,
          threshold_percent: 40,
          overall_conversion_rate: 40,
        },
      ];

      (apiFetch as any).mockResolvedValueOnce(mockFunnel);

      const result = await getConversionFunnelReport({
        funnel_id: 'default',
        channel_id: 'c1',
      });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/analytics/funnel?funnel_id=default&channel_id=c1');
      expect(result).toEqual(mockFunnel);
    });
  });

  describe('Campaign Comparison Report [FR-006]', () => {
    it('getCampaignComparisonReport fetches campaign comparison trend data', async () => {
      const mockCampaigns = [
        {
          campaign_id: 'cmp-1',
          campaign_name: 'Q4 Product Launch',
          budget: 10000,
          lead_volume: 300,
          relative_volume_pct: 100,
          cost_per_lead: 33.33,
          cost_per_lead_str: '$33.33',
          total_revenue: 50000,
          avg_quality_score: 82.0,
          engagement_rate: 12.5,
          engagement_rate_str: '12.50%',
          time_series: [],
          trend_points: [],
        },
      ];

      (apiFetch as any).mockResolvedValueOnce(mockCampaigns);

      const result = await getCampaignComparisonReport({
        campaign_ids: ['cmp-1'],
      });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/analytics/campaigns/compare?campaign_ids=cmp-1');
      expect(result).toEqual(mockCampaigns);
    });
  });

  describe('Territory Heat Map Analytics [FR-007, FR-008]', () => {
    it('getTerritoryHeatmap fetches heat map response with unassigned drawer', async () => {
      const mockHeatmap = {
        territories: [
          {
            territory_id: 't1',
            territory_code: 'US-WEST',
            territory_name: 'US West Region',
            lead_count: 120,
            total_deal_value: 450000,
            total_revenue: 200000,
            avg_deal_value: 3750,
            density_score: 85,
          },
        ],
        unassigned_drawer: {
          lead_count: 5,
          total_deal_value: 12000,
          total_revenue: 0,
          unassigned_events: [],
        },
        summary: {
          total_mapped_leads: 120,
          total_unassigned_leads: 5,
          total_leads: 125,
          total_deal_value: 462000,
          total_revenue: 200000,
        },
      };

      (apiFetch as any).mockResolvedValueOnce(mockHeatmap);

      const result = await getTerritoryHeatmap({
        min_deal_value: 1000,
        territory_id: 't1',
      });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/analytics/territory/heatmap?min_deal_value=1000&territory_id=t1'
      );
      expect(result).toEqual(mockHeatmap);
    });
  });

  describe('Config Audit & Deletion [FR-011]', () => {
    it('createReportConfigAuditLog posts audit record payload', async () => {
      const mockAudit = {
        id: 'audit-1',
        user_id: 'usr-123',
        action_type: 'UPDATE_THRESHOLD',
        config_delta: 'Changed threshold to 50%',
        created_on: '2026-10-06T12:00:00Z',
      };

      (apiFetch as any).mockResolvedValueOnce(mockAudit);

      const result = await createReportConfigAuditLog({
        user_id: 'usr-123',
        action_type: 'UPDATE_THRESHOLD',
        config_delta: 'Changed threshold to 50%',
      });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/analytics/config/audit', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'usr-123',
          action_type: 'UPDATE_THRESHOLD',
          config_delta: 'Changed threshold to 50%',
        }),
      });
      expect(result).toEqual(mockAudit);
    });

    it('deleteReportConfiguration executes DELETE request', async () => {
      (apiFetch as any).mockResolvedValueOnce({});

      await deleteReportConfiguration('cfg-999');

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/analytics/config/cfg-999', {
        method: 'DELETE',
      });
    });

    it('deleteReportConfiguration throws error for empty ID', async () => {
      await expect(deleteReportConfiguration('   ')).rejects.toThrow('Configuration ID is required.');
    });
  });

  describe('Async Report Exports [FR-012]', () => {
    it('submitReportExportTask submits export task request', async () => {
      const mockTaskResponse = { task_id: 'task-uuid-1234' };
      (apiFetch as any).mockResolvedValueOnce(mockTaskResponse);

      const startDate = new Date('2026-01-01T00:00:00Z');
      const result = await submitReportExportTask({
        report_type: 'acquisition',
        export_format: 'csv',
        start_date_val: startDate,
      });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/analytics/exports', {
        method: 'POST',
        body: JSON.stringify({
          report_type: 'acquisition',
          export_format: 'csv',
          start_date_val: '2026-01-01T00:00:00.000Z',
          end_date_val: null,
        }),
      });
      expect(result).toEqual(mockTaskResponse);
    });
  });

  describe('Meeting Calendar & Notes [FR-009, FR-010]', () => {
    it('getCalendarMeetings fetches scheduled meetings', async () => {
      const mockMeetings = [
        {
          id: 'meet-1',
          lead_id: 'lead-1',
          scheduled_time: '2026-10-10T10:00:00Z',
          prep_notes: 'Review pricing tiers',
          meeting_notes: null,
          followup_tasks: [],
        },
      ];

      (apiFetch as any).mockResolvedValueOnce(mockMeetings);

      const result = await getCalendarMeetings({ user_id: 'usr-1' });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/marketing/calendar/meetings?user_id=usr-1');
      expect(result).toEqual(mockMeetings);
    });

    it('submitMeetingNotes posts meeting notes and follow-up tasks', async () => {
      const mockResponse = {
        meeting: { id: 'meet-1', meeting_notes: 'Great call' },
        created_tasks: [
          {
            id: 'task-1',
            meeting_id: 'meet-1',
            lead_id: 'lead-1',
            assigned_user_id: 'usr-1',
            task_description: 'Send follow-up proposal',
            is_completed: false,
          },
        ],
        lead_status: 'QUALIFIED',
        lead_id: 'lead-1',
      };

      (apiFetch as any).mockResolvedValueOnce(mockResponse);

      const payload = {
        meeting_notes: 'Great call',
        lead_status: 'QUALIFIED',
        tasks: [
          {
            task_description: 'Send follow-up proposal',
            assigned_user_id: 'usr-1',
          },
        ],
      };

      const result = await submitMeetingNotes('meet-1', payload);

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/marketing/calendar/meetings/meet-1/notes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(mockResponse);
    });

    it('submitMeetingNotes throws error if meeting ID is missing', async () => {
      await expect(submitMeetingNotes('', { meeting_notes: 'test' })).rejects.toThrow(
        'Meeting ID is required.'
      );
    });
  });

  describe('analyticsApi Consolidated Export Object', () => {
    it('exports all service functions', () => {
      expect(analyticsApi.getChannelAcquisitionReport).toBe(getChannelAcquisitionReport);
      expect(analyticsApi.getConversionFunnelReport).toBe(getConversionFunnelReport);
      expect(analyticsApi.getCampaignComparisonReport).toBe(getCampaignComparisonReport);
      expect(analyticsApi.getTerritoryHeatmap).toBe(getTerritoryHeatmap);
      expect(analyticsApi.createReportConfigAuditLog).toBe(createReportConfigAuditLog);
      expect(analyticsApi.deleteReportConfiguration).toBe(deleteReportConfiguration);
      expect(analyticsApi.submitReportExportTask).toBe(submitReportExportTask);
      expect(analyticsApi.getCalendarMeetings).toBe(getCalendarMeetings);
      expect(analyticsApi.submitMeetingNotes).toBe(submitMeetingNotes);
    });
  });
});
