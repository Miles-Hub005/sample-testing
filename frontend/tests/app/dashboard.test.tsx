import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DashboardPage from '../../src/app/dashboard/page';
import { apiClient } from '../../src/services/apiClient';
import * as dashboardService from '../../src/services/dashboard';
import { DashboardSummaryResponse, DomainDetailResponse } from '../../src/services/dashboard';

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

// Mock dashboard service
vi.mock('../../src/services/dashboard', async () => {
  const actual = await vi.importActual('../../src/services/dashboard');
  return {
    ...actual,
    getDashboardSummary: vi.fn(),
    getDomainDetail: vi.fn(),
  };
});

describe('DashboardPage Component', () => {
  const mockUser = {
    user_id: 'usr_1234567890',
    email: 'alex.dev@tenant.org',
    tenant_id: 'tnt_99998888',
    roles: ['ClientViewer', 'SecurityAdmin'],
  };

  const mockSummaryResponse: DashboardSummaryResponse = {
    status: 'COMPLETE',
    generated_at: '2026-10-06T08:00:00Z',
    metrics: [
      {
        domain: 'lead_gen',
        metric_key: 'lead_volume',
        display_name: 'Lead Volume',
        raw_value: 1250,
        baseline_value: 1000,
        formatted_value: '1,250',
        percentage_change: 25.0,
        status: 'VALID',
        unit: 'count',
      },
      {
        domain: 'sales_pipeline',
        metric_key: 'pipeline_value',
        display_name: 'Pipeline Value',
        raw_value: 450000,
        baseline_value: 400000,
        formatted_value: '$450,000',
        percentage_change: 12.5,
        status: 'VALID',
        unit: 'currency',
      },
      {
        domain: 'support',
        metric_key: 'open_tickets',
        display_name: 'Open Tickets',
        raw_value: 0,
        baseline_value: 5,
        formatted_value: '0',
        percentage_change: -100.0,
        status: 'ZERO',
        unit: 'count',
      },
      {
        domain: 'financials',
        metric_key: 'recurring_revenue',
        display_name: 'Recurring Revenue',
        raw_value: 125000,
        baseline_value: 100000,
        formatted_value: '$125,000',
        percentage_change: 25.0,
        status: 'VALID',
        unit: 'currency',
      },
    ],
  };

  const mockDomainDetailResponse: DomainDetailResponse = {
    domain: 'lead_gen',
    status: 'COMPLETE',
    detailed_metrics: [
      {
        domain: 'lead_gen',
        metric_key: 'lead_volume',
        display_name: 'Lead Volume',
        raw_value: 1250,
        baseline_value: 1000,
        formatted_value: '1,250',
        percentage_change: 25.0,
        status: 'VALID',
        unit: 'count',
      },
    ],
    breakdown_items: [{ label: 'Inbound Search', value: 750 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.getMe as any).mockResolvedValue(mockUser);
    (dashboardService.getDashboardSummary as any).mockResolvedValue(mockSummaryResponse);
    (dashboardService.getDomainDetail as any).mockResolvedValue(mockDomainDetailResponse);
  });

  it('renders loading state initially and then populates user identity upon success', async () => {
    render(<DashboardPage />);

    // Verify header title
    expect(
      screen.getByRole('heading', { level: 1, name: /dashboard overview/i })
    ).toBeInTheDocument();

    // Verify loading indicator is present initially
    expect(
      screen.getByText(/authenticating identity and loading context/i)
    ).toBeInTheDocument();

    // Wait for user details to be loaded and rendered
    await waitFor(() => {
      expect(screen.getByText('alex.dev@tenant.org')).toBeInTheDocument();
    });

    expect(screen.getByText('tnt_99998888')).toBeInTheDocument();
    expect(screen.getByText('ClientViewer')).toBeInTheDocument();
    expect(screen.getByText('SecurityAdmin')).toBeInTheDocument();
  });

  it('renders metric cards, accessibility landmarks, and links to domain areas', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('alex.dev@tenant.org')).toBeInTheDocument();
    });

    // Check Key Metrics Section
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /key performance & governance metrics/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/rbac access evaluations/i)).toBeInTheDocument();
    expect(screen.getByText(/audit logging pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/tenant isolation guard/i)).toBeInTheDocument();

    // Check Platform Domain Sections & Links
    expect(
      screen.getByRole('heading', { level: 2, name: /platform domain sections/i })
    ).toBeInTheDocument();

    const performanceLink = screen.getByRole('link', { name: /performance/i });
    expect(performanceLink).toHaveAttribute('href', '/performance');

    const contractsLink = screen.getByRole('link', { name: /contracts/i });
    expect(contractsLink).toHaveAttribute('href', '/contracts');

    const supportLink = screen.getByRole('link', { name: /support/i });
    expect(supportLink).toHaveAttribute('href', '/support');

    const financialsLink = screen.getByRole('link', { name: /financials/i });
    expect(financialsLink).toHaveAttribute('href', '/financials');

    const knowledgeLink = screen.getByRole('link', { name: /knowledge base/i });
    expect(knowledgeLink).toHaveAttribute('href', '/knowledge');
  });

  it('renders an accessible error alert when apiClient.getMe fails', async () => {
    (apiClient.getMe as any).mockRejectedValueOnce(
      new Error('Session expired or unauthorized')
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/authentication session alert/i)).toBeInTheDocument();
    expect(screen.getByText('Session expired or unauthorized')).toBeInTheDocument();
  });

  it('fetches and renders consolidated executive operational KPI cards across all four domains (FR-1)', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: /executive operational kpis/i,
        })
      ).toBeInTheDocument();
    });

    // Verify summary cards for all 4 domains are rendered
    await waitFor(() => {
      expect(screen.getByTestId('summary-metric-card-lead_volume')).toBeInTheDocument();
      expect(screen.getByTestId('summary-metric-card-pipeline_value')).toBeInTheDocument();
      expect(screen.getByTestId('summary-metric-card-open_tickets')).toBeInTheDocument();
      expect(
        screen.getByTestId('summary-metric-card-recurring_revenue')
      ).toBeInTheDocument();
    });

    // Verify zero value preservation ("0")
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('executes 30-second REST polling refresh loop (FR-5)', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    render(<DashboardPage />);

    // Initial call on mount
    expect(dashboardService.getDashboardSummary).toHaveBeenCalledTimes(1);

    // Fast-forward 30 seconds (30000ms)
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    // Should have triggered a second polling call
    expect(dashboardService.getDashboardSummary).toHaveBeenCalledTimes(2);

    // Fast-forward another 30 seconds
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(dashboardService.getDashboardSummary).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });

  it('refetches summary metrics when timeframe selector button is clicked', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('timeframe-selector')).toBeInTheDocument();
    });

    const tf7dButton = screen.getByTestId('timeframe-7d');
    fireEvent.click(tf7dButton);

    await waitFor(() => {
      expect(dashboardService.getDashboardSummary).toHaveBeenCalledWith('7d');
    });
  });

  it('renders QuickViewPanel and handles domain selection drilldown (Story 3)', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId('quick-view-panel')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /core domain quick-view drilldowns/i,
      })
    ).toBeInTheDocument();
  });

  it('renders warning alert state when summary aggregation status is PARTIAL (FR-3)', async () => {
    const partialSummary: DashboardSummaryResponse = {
      ...mockSummaryResponse,
      status: 'PARTIAL',
    };
    (dashboardService.getDashboardSummary as any).mockResolvedValueOnce(
      partialSummary
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/partial operational metrics loaded/i)
      ).toBeInTheDocument();
    });
  });
});
