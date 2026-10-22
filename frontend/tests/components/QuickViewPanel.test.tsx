import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QuickViewPanel } from '../../src/components/dashboard/QuickViewPanel';
import { DomainDetailResponse } from '../../src/services/dashboard';
import * as dashboardService from '../../src/services/dashboard';

// Mock getDomainDetail from dashboard service
vi.mock('../../src/services/dashboard', async () => {
  const actual = await vi.importActual('../../src/services/dashboard');
  return {
    ...actual,
    getDomainDetail: vi.fn(),
  };
});

describe('QuickViewPanel Component', () => {
  const mockLeadGenDetail: DomainDetailResponse = {
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
      {
        domain: 'lead_gen',
        metric_key: 'conversion_rate',
        display_name: 'Lead Conversion Rate',
        raw_value: 12.5,
        baseline_value: 10.0,
        formatted_value: '12.5%',
        percentage_change: 25.0,
        status: 'VALID',
        unit: 'percentage',
      },
    ],
    breakdown_items: [
      { label: 'Inbound Web Search', value: 750 },
      { label: 'Outbound Campaigns', value: 350 },
      { label: 'Partner Referrals', value: 150 },
    ],
  };

  const mockSalesDetail: DomainDetailResponse = {
    domain: 'sales_pipeline',
    status: 'COMPLETE',
    detailed_metrics: [
      {
        domain: 'sales_pipeline',
        metric_key: 'deal_value',
        display_name: 'Pipeline Deal Value',
        raw_value: 450000,
        baseline_value: 400000,
        formatted_value: '$450,000',
        percentage_change: 12.5,
        status: 'VALID',
        unit: 'currency',
      },
      {
        domain: 'sales_pipeline',
        metric_key: 'win_rate',
        display_name: 'Sales Win Rate',
        raw_value: 32.0,
        baseline_value: 30.0,
        formatted_value: '32.0%',
        percentage_change: 6.7,
        status: 'VALID',
        unit: 'percentage',
      },
    ],
    breakdown_items: [
      { label: 'Prospecting Stage', value: 100000 },
      { label: 'Proposal Stage', value: 200000 },
      { label: 'Closing Stage', value: 150000 },
    ],
  };

  const mockSupportDetail: DomainDetailResponse = {
    domain: 'support',
    status: 'COMPLETE',
    detailed_metrics: [
      {
        domain: 'support',
        metric_key: 'open_tickets',
        display_name: 'Open Support Tickets',
        raw_value: 18,
        baseline_value: 20,
        formatted_value: '18',
        percentage_change: -10.0,
        status: 'VALID',
        unit: 'count',
      },
      {
        domain: 'support',
        metric_key: 'sla_compliance',
        display_name: 'SLA Compliance Rate',
        raw_value: 98.5,
        baseline_value: 95.0,
        formatted_value: '98.5%',
        percentage_change: 3.7,
        status: 'VALID',
        unit: 'percentage',
      },
    ],
    breakdown_items: [
      { label: 'P1 - Critical Severity', value: 2 },
      { label: 'P2 - High Severity', value: 5 },
      { label: 'P3 - Medium Severity', value: 11 },
    ],
  };

  const mockFinancialsDetail: DomainDetailResponse = {
    domain: 'financials',
    status: 'COMPLETE',
    detailed_metrics: [
      {
        domain: 'financials',
        metric_key: 'recurring_revenue',
        display_name: 'Recurring Revenue (MRR)',
        raw_value: 125000,
        baseline_value: 100000,
        formatted_value: '$125,000',
        percentage_change: 25.0,
        status: 'VALID',
        unit: 'currency',
      },
      {
        domain: 'financials',
        metric_key: 'outstanding_invoices',
        display_name: 'Outstanding Invoices',
        raw_value: 15000,
        baseline_value: 18000,
        formatted_value: '$15,000',
        percentage_change: -16.7,
        status: 'VALID',
        unit: 'currency',
      },
    ],
    breakdown_items: [
      { label: 'Enterprise Subscriptions', value: 85000 },
      { label: 'Professional Tier', value: 40000 },
    ],
  };

  const mockUnavailableDetail: DomainDetailResponse = {
    domain: 'lead_gen',
    status: 'UNAVAILABLE',
    detailed_metrics: [],
    breakdown_items: [],
    error_detail: 'Lead Gen API upstream timeout (5000ms exceeded).',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Lead Generation Quick-View [FR-6]', () => {
    it('expands and renders detailed Lead Gen metrics and channel breakdown items', async () => {
      (dashboardService.getDomainDetail as any).mockResolvedValueOnce(mockLeadGenDetail);

      render(<QuickViewPanel selectedDomain="lead_gen" timeframe="30d" />);

      // Verify domain heading
      expect(screen.getByTestId('quick-view-heading').textContent).toContain('Lead Generation Quick-View');

      // Wait for metrics to load
      await waitFor(() => {
        expect(screen.getByText('Lead Volume')).toBeInTheDocument();
      });

      expect(screen.getByText('Lead Conversion Rate')).toBeInTheDocument();
      expect(screen.getByText('Inbound Web Search')).toBeInTheDocument();
      expect(screen.getByText('Outbound Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Partner Referrals')).toBeInTheDocument();
    });
  });

  describe('Sales Pipeline Quick-View [FR-7]', () => {
    it('expands and renders detailed Sales Pipeline metrics and stage distributions', async () => {
      render(
        <QuickViewPanel
          selectedDomain="sales_pipeline"
          domainDetail={mockSalesDetail}
          timeframe="30d"
        />
      );

      // Verify domain heading
      expect(screen.getByTestId('quick-view-heading').textContent).toContain('Sales Pipeline Quick-View');

      // Verify metrics & breakdowns
      expect(screen.getByText('Pipeline Deal Value')).toBeInTheDocument();
      expect(screen.getByText('Sales Win Rate')).toBeInTheDocument();
      expect(screen.getByText('Prospecting Stage')).toBeInTheDocument();
      expect(screen.getByText('Proposal Stage')).toBeInTheDocument();
      expect(screen.getByText('Closing Stage')).toBeInTheDocument();
    });
  });

  describe('Support Ticketing Quick-View [FR-8]', () => {
    it('expands and renders detailed Support Ticketing metrics and severity breakdowns', async () => {
      render(
        <QuickViewPanel
          selectedDomain="support"
          domainDetail={mockSupportDetail}
          timeframe="30d"
        />
      );

      // Verify domain heading
      expect(screen.getByTestId('quick-view-heading').textContent).toContain('Support Ticketing Quick-View');

      // Verify metrics & breakdowns
      expect(screen.getByText('Open Support Tickets')).toBeInTheDocument();
      expect(screen.getByText('SLA Compliance Rate')).toBeInTheDocument();
      expect(screen.getByText('P1 - Critical Severity')).toBeInTheDocument();
      expect(screen.getByText('P2 - High Severity')).toBeInTheDocument();
    });
  });

  describe('Financial Summaries Quick-View [FR-9]', () => {
    it('expands and renders detailed Financial Summaries metrics and tier breakdowns', async () => {
      render(
        <QuickViewPanel
          selectedDomain="financials"
          domainDetail={mockFinancialsDetail}
          timeframe="30d"
        />
      );

      // Verify domain heading
      expect(screen.getByTestId('quick-view-heading').textContent).toContain('Financial Summaries Quick-View');

      // Verify metrics & breakdowns
      expect(screen.getByText('Recurring Revenue (MRR)')).toBeInTheDocument();
      expect(screen.getByText('Outstanding Invoices')).toBeInTheDocument();
      expect(screen.getByText('Enterprise Subscriptions')).toBeInTheDocument();
      expect(screen.getByText('Professional Tier')).toBeInTheDocument();
    });
  });

  describe('Outage & Error State Handling with Retry Action', () => {
    it('renders an accessible outage alert when domain status is UNAVAILABLE and handles retry', async () => {
      const handleRetryMock = vi.fn();

      render(
        <QuickViewPanel
          selectedDomain="lead_gen"
          domainDetail={mockUnavailableDetail}
          onRetry={handleRetryMock}
        />
      );

      // Verify error alert
      const errorContainer = screen.getByTestId('quick-view-error');
      expect(errorContainer).toBeInTheDocument();
      expect(screen.getByText('Lead Generation Metrics Unavailable')).toBeInTheDocument();
      expect(screen.getByText(/Lead Gen API upstream timeout/i)).toBeInTheDocument();

      // Click retry button
      const retryBtn = screen.getByTestId('quick-view-retry-button');
      fireEvent.click(retryBtn);

      expect(handleRetryMock).toHaveBeenCalledTimes(1);
    });

    it('triggers internal re-fetch on retry button click when onRetry callback is absent', async () => {
      (dashboardService.getDomainDetail as any)
        .mockResolvedValueOnce(mockUnavailableDetail)
        .mockResolvedValueOnce(mockLeadGenDetail);

      render(<QuickViewPanel selectedDomain="lead_gen" />);

      await waitFor(() => {
        expect(screen.getByTestId('quick-view-error')).toBeInTheDocument();
      });

      // Click retry button
      const retryBtn = screen.getByTestId('quick-view-retry-button');
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText('Lead Volume')).toBeInTheDocument();
      });

      expect(dashboardService.getDomainDetail).toHaveBeenCalledTimes(2);
    });
  });

  describe('Domain Tab Navigation Selection', () => {
    it('invokes onSelectDomain callback when a domain selector tab is clicked', () => {
      const handleSelectDomain = vi.fn();

      render(
        <QuickViewPanel
          selectedDomain="lead_gen"
          domainDetail={mockLeadGenDetail}
          onSelectDomain={handleSelectDomain}
        />
      );

      // Click Sales tab
      const salesTab = screen.getByTestId('domain-tab-sales_pipeline');
      fireEvent.click(salesTab);

      expect(handleSelectDomain).toHaveBeenCalledWith('sales_pipeline');
    });
  });

  describe('Loading State Rendering', () => {
    it('renders accessible loading state spinner when isLoading is true', () => {
      render(<QuickViewPanel selectedDomain="lead_gen" isLoading={true} />);

      const loadingContainer = screen.getByTestId('quick-view-loading');
      expect(loadingContainer).toBeInTheDocument();
      expect(loadingContainer.getAttribute('aria-busy')).toBe('true');
      expect(screen.getByText(/Loading Lead Generation metrics/i)).toBeInTheDocument();
    });
  });
});
