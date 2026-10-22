import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildQueryString,
  completeActionItem,
  createActionItem,
  createDeal,
  createStakeholder,
  dealsApi,
  deleteActionItem,
  getDealForecast,
  getDealStakeholders,
  getDealSummary,
  getForecastEvaluationLogs,
  getPipelineDeals,
  logStakeholderActivity,
  listActionItems,
  recalculateDealForecast,
  sanitizeMilestoneStage,
  updateDealStage,
} from '../../src/services/deals';
import { apiFetch, ApiError } from '../../src/services/apiClient';

vi.mock('../../src/services/apiClient', async () => {
  const actual = await vi.importActual('../../src/services/apiClient');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

describe('Deal Pipeline & Sales Intelligence API Client Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Sanitization and Query Building Helpers', () => {
    it('buildQueryString formats query parameters correctly', () => {
      expect(buildQueryString()).toBe('');
      expect(buildQueryString({})).toBe('');

      const queryStr = buildQueryString({
        stage: 'Solution Proposal',
        limit: 50,
        empty: '',
        nil: null,
        undef: undefined,
      });

      expect(queryStr).toContain('stage=Solution+Proposal');
      expect(queryStr).toContain('limit=50');
      expect(queryStr).not.toContain('empty');
      expect(queryStr).not.toContain('nil');
    });

    it('sanitizeMilestoneStage strips whitespace and handles null/undefined', () => {
      expect(sanitizeMilestoneStage('  Discovery  ')).toBe('Discovery');
      expect(sanitizeMilestoneStage('')).toBe('');
      expect(sanitizeMilestoneStage(null)).toBe('');
      expect(sanitizeMilestoneStage(undefined)).toBe('');
    });
  });

  describe('Pipeline Board & Deal Operations [FR-001, FR-002, FR-003]', () => {
    it('getPipelineDeals fetches deals without stage filter', async () => {
      const mockDeals = [
        {
          id: 'deal-1',
          title: 'Acme Renewal',
          deal_value: 50000,
          milestone_stage: 'Discovery',
          win_probability: 0.4,
          age_in_days: 12,
        },
      ];

      (apiFetch as any).mockResolvedValueOnce(mockDeals);

      const deals = await getPipelineDeals();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/deals/pipeline');
      expect(deals).toEqual(mockDeals);
    });

    it('getPipelineDeals fetches deals with stage filter', async () => {
      const mockDeals = [
        {
          id: 'deal-2',
          title: 'Beta Corp Deal',
          deal_value: 120000,
          milestone_stage: 'Proposal',
          win_probability: 0.6,
          age_in_days: 5,
        },
      ];

      (apiFetch as any).mockResolvedValueOnce(mockDeals);

      const deals = await getPipelineDeals(' Proposal ');

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/deals/pipeline?stage=Proposal');
      expect(deals).toEqual(mockDeals);
    });

    it('createDeal sends POST request with sanitized string payload', async () => {
      const mockResponse = {
        id: 'deal-3',
        title: 'New Opportunity',
        deal_value: 75000,
        milestone_stage: 'Qualification',
        win_probability: 0.2,
        age_in_days: 0,
      };

      (apiFetch as any).mockResolvedValueOnce(mockResponse);

      const result = await createDeal({
        title: '  New Opportunity  ',
        deal_value: 75000,
        milestone_stage: ' Qualification ',
        win_probability: 0.2,
      });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/deals', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Opportunity',
          deal_value: 75000,
          milestone_stage: 'Qualification',
          win_probability: 0.2,
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('getDealSummary fetches deal details by ID', async () => {
      const mockSummary = {
        id: 'deal-123',
        title: 'Global Enterprise Deal',
        deal_value: 200000,
        milestone_stage: 'Negotiation',
        win_probability: 0.8,
        age_in_days: 20,
        action_items_count: 3,
        stakeholders_count: 2,
      };

      (apiFetch as any).mockResolvedValueOnce(mockSummary);

      const summary = await getDealSummary('deal-123');

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/deals/deal-123');
      expect(summary).toEqual(mockSummary);
    });

    it('updateDealStage sends PATCH request to update milestone stage', async () => {
      const mockUpdated = {
        id: 'deal-123',
        title: 'Global Enterprise Deal',
        deal_value: 200000,
        milestone_stage: 'Contract Negotiation',
        win_probability: 0.8,
        age_in_days: 21,
      };

      (apiFetch as any).mockResolvedValueOnce(mockUpdated);

      const result = await updateDealStage('deal-123', {
        milestone_stage: ' Contract Negotiation ',
        win_probability: 0.8,
      });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/deals/deal-123/stage', {
        method: 'PATCH',
        body: JSON.stringify({
          milestone_stage: 'Contract Negotiation',
          win_probability: 0.8,
        }),
      });
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('Action Item Operations [FR-004]', () => {
    it('listActionItems fetches action items for a deal', async () => {
      const mockItems = [
        {
          id: 'item-1',
          deal_id: 'deal-123',
          title: 'Send Security Questionnaire',
          assigned_owner_id: 'user-sec',
          target_due_date: '2026-11-01T00:00:00Z',
          sla_threshold_hours: 24,
          is_completed: false,
          is_escalated: false,
        },
      ];

      (apiFetch as any).mockResolvedValueOnce(mockItems);

      const items = await listActionItems('deal-123');

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/deals/deal-123/action-items');
      expect(items).toEqual(mockItems);
    });

    it('createActionItem sends POST request to create an action item', async () => {
      const mockCreated = {
        id: 'item-2',
        deal_id: 'deal-123',
        title: 'Review Legal Terms',
        assigned_owner_id: 'legal-1',
        target_due_date: '2026-11-05T00:00:00Z',
        sla_threshold_hours: 48,
        is_completed: false,
        is_escalated: false,
      };

      (apiFetch as any).mockResolvedValueOnce(mockCreated);

      const result = await createActionItem('deal-123', {
        title: ' Review Legal Terms ',
        assigned_owner_id: ' legal-1 ',
        target_due_date: '2026-11-05T00:00:00Z',
        sla_threshold_hours: 48,
      });

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/deals/deal-123/action-items', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Review Legal Terms',
          assigned_owner_id: 'legal-1',
          target_due_date: '2026-11-05T00:00:00Z',
          sla_threshold_hours: 48,
        }),
      });
      expect(result).toEqual(mockCreated);
    });

    it('completeActionItem sends PATCH request to complete an item', async () => {
      const mockCompleted = {
        id: 'item-1',
        deal_id: 'deal-123',
        title: 'Send Security Questionnaire',
        assigned_owner_id: 'user-sec',
        target_due_date: '2026-11-01T00:00:00Z',
        sla_threshold_hours: 24,
        is_completed: true,
        completed_on: '2026-10-25T12:00:00Z',
        is_escalated: false,
      };

      (apiFetch as any).mockResolvedValueOnce(mockCompleted);

      const result = await completeActionItem('deal-123', 'item-1', {
        completed_on: '2026-10-25T12:00:00Z',
      });

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/deals/deal-123/action-items/item-1/complete', {
        method: 'PATCH',
        body: JSON.stringify({
          completed_on: '2026-10-25T12:00:00Z',
        }),
      });
      expect(result).toEqual(mockCompleted);
    });

    it('deleteActionItem sends DELETE request', async () => {
      (apiFetch as any).mockResolvedValueOnce({});

      await deleteActionItem('deal-123', 'item-1');

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/deals/deal-123/action-items/item-1', {
        method: 'DELETE',
      });
    });
  });

  describe('Stakeholder & Activity Feed Operations [FR-006]', () => {
    it('getDealStakeholders fetches mapped stakeholders and activities', async () => {
      const mockResponse = {
        stakeholders: [
          {
            id: 'sh-1',
            deal_id: 'deal-123',
            full_name: 'Sarah Connor',
            email: 'sconnor@cyberdyne.com',
            org_role: 'VP Engineering',
            influence_level: 'High',
            is_active: true,
          },
        ],
        recent_activities: [
          {
            id: 'act-1',
            stakeholder_id: 'sh-1',
            deal_id: 'deal-123',
            activity_type: 'Meeting',
            summary: 'Technical architecture review call',
            occurred_on: '2026-10-20T14:00:00Z',
          },
        ],
      };

      (apiFetch as any).mockResolvedValueOnce(mockResponse);

      const result = await getDealStakeholders('deal-123');

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/deals/deal-123/stakeholders');
      expect(result).toEqual(mockResponse);
    });

    it('createStakeholder maps a new contact to a deal', async () => {
      const mockCreated = {
        id: 'sh-2',
        deal_id: 'deal-123',
        full_name: 'Miles Dyson',
        email: 'mdyson@cyberdyne.com',
        org_role: 'CTO',
        influence_level: 'High',
        is_active: true,
      };

      (apiFetch as any).mockResolvedValueOnce(mockCreated);

      const result = await createStakeholder('deal-123', {
        full_name: ' Miles Dyson ',
        email: ' mdyson@cyberdyne.com ',
        org_role: ' CTO ',
        influence_level: ' High ',
      });

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/deals/deal-123/stakeholders', {
        method: 'POST',
        body: JSON.stringify({
          full_name: 'Miles Dyson',
          email: 'mdyson@cyberdyne.com',
          org_role: 'CTO',
          influence_level: 'High',
        }),
      });
      expect(result).toEqual(mockCreated);
    });

    it('logStakeholderActivity records an interaction event', async () => {
      const mockActivity = {
        id: 'act-2',
        stakeholder_id: 'sh-1',
        deal_id: 'deal-123',
        activity_type: 'Email',
        summary: 'Sent updated pricing proposal',
        occurred_on: '2026-10-22T09:30:00Z',
      };

      (apiFetch as any).mockResolvedValueOnce(mockActivity);

      const result = await logStakeholderActivity('deal-123', 'sh-1', {
        activity_type: ' Email ',
        summary: ' Sent updated pricing proposal ',
        occurred_on: '2026-10-22T09:30:00Z',
      });

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/deals/deal-123/stakeholders/sh-1/activities',
        {
          method: 'POST',
          body: JSON.stringify({
            activity_type: 'Email',
            summary: 'Sent updated pricing proposal',
            occurred_on: '2026-10-22T09:30:00Z',
          }),
        }
      );
      expect(result).toEqual(mockActivity);
    });
  });

  describe('AI Forecasting Operations [FR-008]', () => {
    it('getDealForecast fetches forecast and confidence score', async () => {
      const mockForecast = {
        id: 'fc-1',
        deal_id: 'deal-123',
        estimated_completion_date: '2026-12-15T00:00:00Z',
        confidence_score_pct: 82.5,
        status_code: 'READY',
        calculated_on: '2026-10-24T10:00:00Z',
      };

      (apiFetch as any).mockResolvedValueOnce(mockForecast);

      const forecast = await getDealForecast('deal-123');

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/deals/deal-123/forecast');
      expect(forecast).toEqual(mockForecast);
    });

    it('recalculateDealForecast triggers forecast recalculation', async () => {
      const mockForecast = {
        id: 'fc-1',
        deal_id: 'deal-123',
        estimated_completion_date: '2026-12-20T00:00:00Z',
        confidence_score_pct: 85.0,
        status_code: 'READY',
        calculated_on: '2026-10-25T11:00:00Z',
      };

      (apiFetch as any).mockResolvedValueOnce(mockForecast);

      const forecast = await recalculateDealForecast('deal-123');

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/deals/deal-123/forecast/recalculate', {
        method: 'POST',
      });
      expect(forecast).toEqual(mockForecast);
    });

    it('getForecastEvaluationLogs retrieves historical forecast logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          deal_id: 'deal-123',
          forecast_id: 'fc-1',
          estimated_completion_date: '2026-12-15T00:00:00Z',
          confidence_score_pct: 82.5,
          status_code: 'READY',
          trigger_event: 'MANUAL_REQUEST',
          calculated_on: '2026-10-24T10:00:00Z',
        },
      ];

      (apiFetch as any).mockResolvedValueOnce(mockLogs);

      const logs = await getForecastEvaluationLogs('deal-123', 25);

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/deals/deal-123/forecast/logs?limit=25');
      expect(logs).toEqual(mockLogs);
    });
  });

  describe('dealsApi Grouped Export Object', () => {
    it('exposes all API methods on dealsApi object', () => {
      expect(typeof dealsApi.getPipelineDeals).toBe('function');
      expect(typeof dealsApi.createDeal).toBe('function');
      expect(typeof dealsApi.getDealSummary).toBe('function');
      expect(typeof dealsApi.updateDealStage).toBe('function');
      expect(typeof dealsApi.listActionItems).toBe('function');
      expect(typeof dealsApi.createActionItem).toBe('function');
      expect(typeof dealsApi.completeActionItem).toBe('function');
      expect(typeof dealsApi.deleteActionItem).toBe('function');
      expect(typeof dealsApi.getDealStakeholders).toBe('function');
      expect(typeof dealsApi.createStakeholder).toBe('function');
      expect(typeof dealsApi.logStakeholderActivity).toBe('function');
      expect(typeof dealsApi.getDealForecast).toBe('function');
      expect(typeof dealsApi.recalculateDealForecast).toBe('function');
      expect(typeof dealsApi.getForecastEvaluationLogs).toBe('function');
    });
  });
});
