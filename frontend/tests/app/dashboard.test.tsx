import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DashboardPage from '../../src/app/dashboard/page';
import * as crmService from '../../src/services/crm';

vi.mock('../../src/services/crm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/crm')>();
  return {
    ...actual,
    dashboardApi: {
      get: vi.fn(),
    },
  };
});

describe('DashboardPage Component', () => {
  const mockDashboardData = {
    pipeline_by_status: [
      { status: 'Prospecting', count: 1, total_value: 10000 },
      { status: 'Negotiation', count: 3, total_value: 50000 },
      { status: 'Closed Won', count: 2, total_value: 80000 },
    ],
    upcoming_tasks: [
      {
        id: 1,
        title: 'Follow up on proposal',
        description: 'Follow up on proposal',
        due_date: '2026-10-15T00:00:00Z',
        completed: false,
        overdue: false,
        created_at: '2026-09-01T10:00:00Z',
        updated_at: '2026-09-01T10:00:00Z',
      },
    ],
    overdue_tasks: [
      {
        id: 2,
        title: 'Send updated contract',
        description: 'Send updated contract',
        due_date: '2026-09-01T00:00:00Z',
        completed: false,
        overdue: true,
        created_at: '2026-08-15T10:00:00Z',
        updated_at: '2026-08-15T10:00:00Z',
      },
    ],
    recent_interactions: [
      {
        id: 1,
        type: 'call',
        summary: 'Discussed pricing terms with key stakeholder',
        date: '2026-09-20T14:30:00Z',
        created_at: '2026-09-20T14:30:00Z',
      },
      {
        id: 2,
        type: 'meeting',
        summary: 'Product demo with evaluation team',
        date: '2026-09-18T10:00:00Z',
        created_at: '2026-09-18T10:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially and populates dashboard widgets on successful fetch', async () => {
    (crmService.dashboardApi.get as any).mockResolvedValue({
      data: mockDashboardData,
    });

    render(<DashboardPage />);

    expect(screen.getByTestId('dashboard-loading')).toBeDefined();

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).toBeNull();
    });

    // Check header and KPI values
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeDefined();
    expect(screen.getByTestId('pipeline-summary-widget')).toBeDefined();
    expect(screen.getByTestId('upcoming-tasks-widget')).toBeDefined();
    expect(screen.getByTestId('recent-interactions-widget')).toBeDefined();

    // Verify US-5: $50k in Negotiation stage
    expect(screen.getByTestId('pipeline-stage-negotiation')).toBeDefined();
    expect(screen.getByTestId('pipeline-value-negotiation').textContent).toContain('$50,000');

    // Verify upcoming & overdue tasks
    expect(screen.getByTestId('upcoming-task-1')).toBeDefined();
    expect(screen.getByTestId('overdue-task-2')).toBeDefined();

    // Verify recent interactions
    expect(screen.getByTestId('recent-interaction-1')).toBeDefined();
    expect(screen.getByTestId('recent-interaction-2')).toBeDefined();
  });

  it('renders empty states when no data exists (FR-14, US-5)', async () => {
    const emptyDashboard = {
      pipeline_by_status: [],
      upcoming_tasks: [],
      overdue_tasks: [],
      recent_interactions: [],
    };

    (crmService.dashboardApi.get as any).mockResolvedValue({
      data: emptyDashboard,
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).toBeNull();
    });

    expect(screen.getByTestId('pipeline-empty-state')).toBeDefined();
    expect(screen.getByTestId('tasks-empty-state')).toBeDefined();
    expect(screen.getByTestId('interactions-empty-state')).toBeDefined();

    // Buttons prompting user to add records
    expect(screen.getByTestId('add-lead-btn')).toBeDefined();
    expect(screen.getByTestId('add-task-btn')).toBeDefined();
    expect(screen.getByTestId('add-interaction-btn')).toBeDefined();
  });

  it('renders error message when dashboard API fetch fails', async () => {
    (crmService.dashboardApi.get as any).mockResolvedValue({
      error: { message: 'Failed to fetch dashboard metrics' },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-error')).toBeDefined();
    });

    expect(screen.getByTestId('dashboard-error').textContent).toContain('Failed to fetch dashboard metrics');
  });

  it('allows manual refresh via Refresh button', async () => {
    (crmService.dashboardApi.get as any).mockResolvedValue({
      data: mockDashboardData,
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).toBeNull();
    });

    const refreshBtn = screen.getByTestId('refresh-dashboard-btn');
    fireEvent.click(refreshBtn);

    expect(crmService.dashboardApi.get).toHaveBeenCalledTimes(2);
  });
});
