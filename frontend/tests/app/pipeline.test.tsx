import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PipelinePage from '../../src/app/pipeline/page';
import { apiClient } from '../../src/services/apiClient';
import { dealsApi, Deal, ActionItem, Stakeholder } from '../../src/services/deals';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock apiClient and dealsApi
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

vi.mock('../../src/services/deals', async () => {
  const actual = await vi.importActual('../../src/services/deals');
  return {
    ...actual,
    getPipelineDeals: vi.fn(),
    getDealSummary: vi.fn(),
    createDeal: vi.fn(),
    updateDealStage: vi.fn(),
    listActionItems: vi.fn(),
    createActionItem: vi.fn(),
    completeActionItem: vi.fn(),
    deleteActionItem: vi.fn(),
    getDealStakeholders: vi.fn(),
    getDealForecast: vi.fn(),
    recalculateDealForecast: vi.fn(),
    getForecastEvaluationLogs: vi.fn(),
    dealsApi: {
      ...actual.dealsApi,
      getPipelineDeals: vi.fn(),
      getDealSummary: vi.fn(),
      createDeal: vi.fn(),
      updateDealStage: vi.fn(),
      listActionItems: vi.fn(),
      createActionItem: vi.fn(),
      completeActionItem: vi.fn(),
      deleteActionItem: vi.fn(),
      getDealStakeholders: vi.fn(),
      getDealForecast: vi.fn(),
      recalculateDealForecast: vi.fn(),
      getForecastEvaluationLogs: vi.fn(),
    },
  };
});

describe('PipelinePage Component [FR-001, FR-003, Story 1, Story 2, Story 3, Story 4]', () => {
  const mockUser = {
    user_id: 'usr_sales_101',
    email: 'sarah.sales@tenant.org',
    tenant_id: 'tnt_pipeline_888',
    roles: ['ClientViewer', 'SalesManager'],
  };

  const mockDealsList: Deal[] = [
    {
      id: 'deal-101',
      title: 'Global Logistics ERP Modernization',
      deal_value: 350000,
      milestone_stage: 'Qualification',
      win_probability: 0.25,
      age_in_days: 8,
    },
    {
      id: 'deal-102',
      title: 'FinTech Cloud Infrastructure Migration',
      deal_value: 180000,
      milestone_stage: 'Discovery',
      win_probability: 0.45,
      age_in_days: 14,
    },
  ];

  const mockActionItems: ActionItem[] = [
    {
      id: 'item-1',
      deal_id: 'deal-101',
      title: 'Schedule technical review with Lead Architect',
      assigned_owner_id: 'owner_usr_9988',
      target_due_date: '2026-11-01T15:00:00Z',
      sla_threshold_hours: 24,
      is_completed: false,
      is_escalated: true,
      created_on: '2026-10-20T10:00:00Z',
    },
    {
      id: 'item-2',
      deal_id: 'deal-101',
      title: 'Send updated pricing schedule',
      assigned_owner_id: 'owner_usr_1122',
      target_due_date: '2026-11-05T12:00:00Z',
      sla_threshold_hours: 48,
      is_completed: true,
      completed_on: '2026-10-22T09:00:00Z',
      is_escalated: false,
      created_on: '2026-10-21T08:00:00Z',
    },
  ];

  const mockStakeholdersResp = {
    stakeholders: [
      {
        id: 'stk-1',
        deal_id: 'deal-101',
        full_name: 'David Vance',
        email: 'david.vance@globallogistics.com',
        org_role: 'VP of Operations',
        influence_level: 'High',
        is_active: true,
      },
    ],
    recent_activities: [
      {
        id: 'act-1',
        stakeholder_id: 'stk-1',
        deal_id: 'deal-101',
        activity_type: 'Meeting',
        summary: 'Reviewed SLA requirements and deployment schedule.',
        occurred_on: '2026-10-22T14:00:00Z',
      },
    ],
  };

  const mockForecast = {
    id: 'fc-101',
    deal_id: 'deal-101',
    estimated_completion_date: '2026-12-15T00:00:00Z',
    confidence_score_pct: 82.5,
    status_code: 'READY',
    calculated_on: '2026-10-25T00:00:00Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    (apiClient.getMe as any).mockResolvedValue(mockUser);
    (dealsApi.getPipelineDeals as any).mockResolvedValue(mockDealsList);
    (dealsApi.listActionItems as any).mockResolvedValue(mockActionItems);
    (dealsApi.getDealStakeholders as any).mockResolvedValue(mockStakeholdersResp);
    (dealsApi.getDealForecast as any).mockResolvedValue(mockForecast);
    (dealsApi.getForecastEvaluationLogs as any).mockResolvedValue([]);
  });

  it('renders pipeline page header, user profile, and summary metrics [FR-001]', async () => {
    render(<PipelinePage />);

    expect(screen.getByTestId('pipeline-page')).toBeDefined();
    expect(screen.getByTestId('page-title').textContent).toContain('Visual Deal Pipeline');

    await waitFor(() => {
      expect(screen.getByText('sarah.sales@tenant.org')).toBeDefined();
      expect(screen.getByTestId('pipeline-board')).toBeDefined();
    });

    expect(screen.getByText('Total Pipeline')).toBeDefined();
    expect(screen.getByText('$530,000')).toBeDefined(); // 350,000 + 180,000
  });

  it('renders interactive visual pipeline board and auto-selects first deal [FR-001, FR-003]', async () => {
    render(<PipelinePage />);

    await waitFor(() => {
      expect(screen.getByText('Global Logistics ERP Modernization')).toBeDefined();
      expect(screen.getByText('FinTech Cloud Infrastructure Migration')).toBeDefined();
    });

    // Check workspace container rendered for selected deal
    expect(screen.getByTestId('selected-deal-workspace')).toBeDefined();
  });

  it('switches tabs in intelligence workspace for selected deal', async () => {
    render(<PipelinePage />);

    await waitFor(() => {
      expect(screen.getByTestId('selected-deal-workspace')).toBeDefined();
    });

    // Click Action Items tab
    const actionItemsTab = screen.getByTestId('action-items-tab');
    fireEvent.click(actionItemsTab);

    await waitFor(() => {
      expect(screen.getByText('Action Item Ownership & Automated Escalation (Story 2)')).toBeDefined();
      expect(screen.getByText('Schedule technical review with Lead Architect')).toBeDefined();
    });

    // Click Stakeholders tab
    const stakeholdersTab = screen.getByTestId('stakeholders-tab');
    fireEvent.click(stakeholdersTab);

    await waitFor(() => {
      expect(screen.getByTestId('stakeholder-map')).toBeDefined();
    });

    // Click Forecast tab
    const forecastTab = screen.getByTestId('forecast-tab');
    fireEvent.click(forecastTab);

    await waitFor(() => {
      expect(screen.getByTestId('forecast-widget')).toBeDefined();
    });
  });

  it('allows opening New Deal modal and creating a deal [FR-001]', async () => {
    const newCreatedDeal: Deal = {
      id: 'deal-103',
      title: 'New Enterprise Deal',
      deal_value: 200000,
      milestone_stage: 'Qualification',
      win_probability: 0.2,
      age_in_days: 0,
    };

    (dealsApi.createDeal as any).mockResolvedValueOnce(newCreatedDeal);

    render(<PipelinePage />);

    await waitFor(() => {
      expect(screen.getByTestId('add-deal-btn')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('add-deal-btn'));

    expect(screen.getByTestId('create-deal-modal')).toBeDefined();

    // Fill form
    fireEvent.change(screen.getByTestId('create-deal-title-input'), {
      target: { value: 'New Enterprise Deal' },
    });
    fireEvent.change(screen.getByTestId('create-deal-value-input'), {
      target: { value: '200000' },
    });

    // Submit form
    fireEvent.click(screen.getByTestId('submit-create-deal-btn'));

    await waitFor(() => {
      expect(dealsApi.createDeal).toHaveBeenCalledWith({
        title: 'New Enterprise Deal',
        deal_value: 200000,
        milestone_stage: 'Qualification',
        win_probability: 0.2,
      });
    });
  });

  it('allows adding and completing action items for selected deal (Story 2)', async () => {
    const createdActionItem: ActionItem = {
      id: 'item-3',
      deal_id: 'deal-101',
      title: 'Conduct security audit presentation',
      assigned_owner_id: 'owner_usr_5544',
      target_due_date: '2026-11-10T10:00:00Z',
      sla_threshold_hours: 24,
      is_completed: false,
      is_escalated: false,
    };

    const completedActionItem: ActionItem = {
      ...mockActionItems[0],
      is_completed: true,
      is_escalated: false,
    };

    (dealsApi.createActionItem as any).mockResolvedValueOnce(createdActionItem);
    (dealsApi.completeActionItem as any).mockResolvedValueOnce(completedActionItem);

    render(<PipelinePage />);

    await waitFor(() => {
      expect(screen.getByTestId('action-items-tab')).toBeDefined();
    });

    // Switch to Action Items tab
    fireEvent.click(screen.getByTestId('action-items-tab'));

    await waitFor(() => {
      expect(screen.getByTestId('add-action-item-btn')).toBeDefined();
    });

    // Click Add Action Item
    fireEvent.click(screen.getByTestId('add-action-item-btn'));

    expect(screen.getByTestId('create-action-item-modal')).toBeDefined();

    // Fill action item form
    fireEvent.change(screen.getByTestId('action-item-title-input'), {
      target: { value: 'Conduct security audit presentation' },
    });
    fireEvent.change(screen.getByTestId('action-item-owner-input'), {
      target: { value: 'owner_usr_5544' },
    });
    fireEvent.change(screen.getByTestId('action-item-duedate-input'), {
      target: { value: '2026-11-10T10:00' },
    });

    // Submit action item
    fireEvent.click(screen.getByTestId('submit-action-item-btn'));

    await waitFor(() => {
      expect(dealsApi.createActionItem).toHaveBeenCalledWith(
        'deal-101',
        expect.objectContaining({
          title: 'Conduct security audit presentation',
          assigned_owner_id: 'owner_usr_5544',
        })
      );
    });

    // Complete action item
    const completeBtns = screen.getAllByRole('button', { name: /Complete/i });
    expect(completeBtns.length).toBeGreaterThan(0);
    fireEvent.click(completeBtns[0]);

    await waitFor(() => {
      expect(dealsApi.completeActionItem).toHaveBeenCalledWith(
        'deal-101',
        'item-1',
        expect.anything()
      );
    });
  });
});
