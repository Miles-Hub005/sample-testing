import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SupportAnalyticsPage from '../../src/app/support/analytics/page';
import { apiClient } from '../../src/services/apiClient';
import { supportService, SupportAnalytics } from '../../src/services/support';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock apiClient
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

// Mock supportService
vi.mock('../../src/services/support', async () => {
  const actual = await vi.importActual('../../src/services/support');
  return {
    ...actual,
    supportService: {
      ...actual.supportService,
      getSupportAnalytics: vi.fn(),
    },
  };
});

describe('SupportAnalyticsPage Component [FR-8, NFR-1, NFR-2, NFR-3]', () => {
  const mockUser = {
    user_id: 'usr_supp_analytics_123',
    email: 'support.lead@tenant.org',
    tenant_id: 'tnt_supp_888',
    roles: ['ClientViewer', 'SupportAgent', 'SecurityAdmin'],
  };

  const mockAnalyticsData: SupportAnalytics = {
    time_window: {
      start_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date().toISOString(),
    },
    total_tickets: 150,
    open_tickets_count: 15,
    resolved_tickets_count: 135,
    average_response_time_minutes: 12.5,
    mean_time_to_resolution_hours: 4.2,
    sla_breach_rate_percent: 3.5,
    average_csat_score: 4.9,
    csat_response_count: 50,
    priority_breakdown: {
      P1: 20,
      P2: 50,
      P3: 80,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.getMe as any).mockResolvedValue(mockUser);
    (supportService.getSupportAnalytics as any).mockResolvedValue(mockAnalyticsData);
  });

  it('renders page header, title, back navigation link, and status badges', async () => {
    render(<SupportAnalyticsPage />);

    // Verify main title
    expect(
      screen.getByRole('heading', { level: 1, name: /operational support analytics/i })
    ).toBeInTheDocument();

    // Verify back link to support help desk
    const backLink = screen.getByText(/back to support help desk/i);
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/support');

    // Verify status badges
    expect(screen.getByText(/sla engine active/i)).toBeInTheDocument();
    expect(screen.getByText(/analytics stream syncing/i)).toBeInTheDocument();
  });

  it('loads user session context and displays user email, tenant ID, and assigned roles', async () => {
    render(<SupportAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('support.lead@tenant.org')).toBeInTheDocument();
    });

    expect(screen.getByText('tnt_supp_888')).toBeInTheDocument();
    expect(screen.getByText('ClientViewer')).toBeInTheDocument();
    expect(screen.getByText('SupportAgent')).toBeInTheDocument();
    expect(screen.getByText('SecurityAdmin')).toBeInTheDocument();
  });

  it('fetches and renders core support analytics KPI metric cards', async () => {
    render(<SupportAnalyticsPage />);

    await waitFor(() => {
      expect(supportService.getSupportAnalytics).toHaveBeenCalled();
    });

    // Verify KPI metric values
    expect(screen.getByText('12.5 min')).toBeInTheDocument(); // Avg First Response Time
    expect(screen.getByText('4.2 hrs')).toBeInTheDocument(); // MTTR
    expect(screen.getByText('3.5%')).toBeInTheDocument(); // SLA Breach Rate
    expect(screen.getByText('4.9')).toBeInTheDocument(); // CSAT Score
    expect(screen.getByText('(50 Ratings)')).toBeInTheDocument();
  });

  it('renders ticket volume and priority breakdown cards with target SLAs', async () => {
    render(<SupportAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText('Priority Breakdown & SLA Target Benchmarks')).toBeInTheDocument();
    });

    // Priority Cards
    expect(screen.getByText('P1 - Critical')).toBeInTheDocument();
    expect(screen.getByText('P2 - High Priority')).toBeInTheDocument();
    expect(screen.getByText('P3 - Standard')).toBeInTheDocument();

    // SLA Benchmarks text
    expect(screen.getByText('1 Hour (60 min)')).toBeInTheDocument();
    expect(screen.getByText('Tier 3 - Escalations')).toBeInTheDocument();
  });

  it('handles filter controls changes and refetches analytics data', async () => {
    render(<SupportAnalyticsPage />);

    await waitFor(() => {
      expect(supportService.getSupportAnalytics).toHaveBeenCalledTimes(1);
    });

    // Change Priority Filter
    const prioritySelect = screen.getByTestId('priority-filter-select');
    fireEvent.change(prioritySelect, { target: { value: 'P1' } });

    // Click Apply Filters button
    const applyBtn = screen.getByTestId('apply-filters-btn');
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(supportService.getSupportAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'P1',
        })
      );
    });

    // Change Preset Window to 7d
    const preset7dBtn = screen.getByRole('button', { name: /last 7 days/i });
    fireEvent.click(preset7dBtn);

    await waitFor(() => {
      expect(supportService.getSupportAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'P1',
        })
      );
    });

    // Reset Filters
    const resetBtn = screen.getByTestId('reset-filters-btn');
    fireEvent.click(resetBtn);

    const applyAfterReset = screen.getByTestId('apply-filters-btn');
    fireEvent.click(applyAfterReset);

    await waitFor(() => {
      expect(supportService.getSupportAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: undefined,
        })
      );
    });
  });

  it('triggers refresh button and handles service error gracefully', async () => {
    (supportService.getSupportAnalytics as any).mockRejectedValueOnce(
      new Error('API analytics gateway timeout')
    );

    render(<SupportAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/api analytics gateway timeout/i)).toBeInTheDocument();
    });

    // Verify fallback data is rendered despite error
    expect(screen.getByTestId('kpi-metrics-grid')).toBeInTheDocument();

    // Click Refresh button
    (supportService.getSupportAnalytics as any).mockResolvedValueOnce(mockAnalyticsData);
    const refreshBtn = screen.getByTestId('refresh-analytics-btn');
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.queryByText(/api analytics gateway timeout/i)).not.toBeInTheDocument();
    });
  });
});
