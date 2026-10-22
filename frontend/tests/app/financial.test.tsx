import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FinancialPage from '../../src/app/financial/page';
import { apiClient } from '../../src/services/apiClient';
import * as financialService from '../../src/services/financial';
import { Quote, Invoice, Payment, ARAgingMetrics } from '../../src/services/financial';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock apiClient and financialService
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

vi.mock('../../src/services/financial', async () => {
  const actual = await vi.importActual('../../src/services/financial');
  return {
    ...actual,
    getQuotes: vi.fn(),
    getInvoices: vi.fn(),
    getPayments: vi.fn(),
    getARAgingMetrics: vi.fn(),
  };
});

describe('FinancialPage Route Component [/financial] [FR-1, FR-2, FR-3, FR-4]', () => {
  const mockUser = {
    user_id: 'usr_fin_999',
    email: 'finance.lead@tenant.org',
    tenant_id: 'tnt_fin_777',
    roles: ['ClientViewer', 'FinancialAdmin'],
  };

  const mockQuotes: Quote[] = [
    {
      quote_id: 'Q-2026-001',
      customer_id: 'CUST-001',
      approval_state: 'Approved',
      expiration_date_time: '2026-12-31T23:59:59Z',
      total_amount: 25000.0,
      created_at: '2026-10-01T00:00:00Z',
    },
    {
      quote_id: 'Q-2026-002',
      customer_id: 'CUST-002',
      approval_state: 'Pending_Approval',
      expiration_date_time: '2026-11-15T23:59:59Z',
      total_amount: 12500.0,
      created_at: '2026-10-05T00:00:00Z',
    },
  ];

  const mockInvoices: Invoice[] = [
    {
      invoice_id: 'INV-2026-101',
      quote_id: 'Q-2026-001',
      customer_id: 'CUST-001',
      status: 'Current',
      issue_date_time: '2026-10-01T00:00:00Z',
      due_date_time: '2026-10-31T00:00:00Z',
      total_amount: 25000.0,
      outstanding_amount: 5000.0,
    },
    {
      invoice_id: 'INV-2026-102',
      quote_id: 'Q-2026-002',
      customer_id: 'CUST-002',
      status: 'Past_Due',
      issue_date_time: '2026-08-01T00:00:00Z',
      due_date_time: '2026-09-01T00:00:00Z',
      total_amount: 12500.0,
      outstanding_amount: 12500.0,
    },
  ];

  const mockPayments: Payment[] = [
    {
      payment_id: 'PAY-2026-501',
      invoice_id: 'INV-2026-101',
      payment_date_time: '2026-10-10T14:30:00Z',
      amount_paid: 20000.0,
      payment_method: 'Corporate Wire Transfer',
    },
  ];

  const mockARAgingMetrics: ARAgingMetrics = {
    bucket_0_30: { total_outstanding: 5000.0, invoice_count: 1 },
    bucket_31_60: { total_outstanding: 12500.0, invoice_count: 1 },
    bucket_61_90: { total_outstanding: 0.0, invoice_count: 0 },
    bucket_90_plus: { total_outstanding: 0.0, invoice_count: 0 },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (apiClient.getMe as any).mockResolvedValue(mockUser);
    (financialService.getQuotes as any).mockResolvedValue(mockQuotes);
    (financialService.getInvoices as any).mockResolvedValue(mockInvoices);
    (financialService.getPayments as any).mockResolvedValue(mockPayments);
    (financialService.getARAgingMetrics as any).mockResolvedValue(mockARAgingMetrics);
  });

  it('renders page header, status badges, user identity context, and navigation links', async () => {
    render(<FinancialPage />);

    // Verify main page title
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /financial transparency & ar management/i,
      })
    ).toBeInTheDocument();

    // Verify status badges
    expect(screen.getByText(/billing engine active/i)).toBeInTheDocument();
    expect(screen.getByText(/audit trail verified/i)).toBeInTheDocument();
    expect(screen.getByText(/tenant isolated/i)).toBeInTheDocument();

    // Verify initial loading or loaded user details
    await waitFor(() => {
      expect(screen.getByText('finance.lead@tenant.org')).toBeInTheDocument();
    });

    expect(screen.getByText('tnt_fin_777')).toBeInTheDocument();
    expect(screen.getByText('FinancialAdmin')).toBeInTheDocument();

    // Verify link to Alert Triggers / Notifications
    const alertLink = screen.getByTestId('nav-notifications-link');
    expect(alertLink).toBeInTheDocument();
    expect(alertLink).toHaveAttribute('href', '/notifications');
  });

  it('renders customer ID search filter and applies/resets filter input', async () => {
    render(<FinancialPage />);

    await waitFor(() => {
      expect(screen.getByText('finance.lead@tenant.org')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('customer-id-input');
    const applyBtn = screen.getByTestId('apply-customer-filter-btn');

    // Type customer ID
    fireEvent.change(searchInput, { target: { value: 'CUST-001' } });
    expect(searchInput).toHaveValue('CUST-001');

    // Click Apply
    fireEvent.click(applyBtn);

    // Verify active filter indicator
    await waitFor(() => {
      expect(screen.getByText(/active customer filter/i)).toBeInTheDocument();
    });
    expect(screen.getByText('CUST-001')).toBeInTheDocument();

    // Reset filter
    const resetBtn = screen.getByTestId('clear-customer-filter-btn');
    fireEvent.click(resetBtn);

    expect(searchInput).toHaveValue('');
    expect(screen.queryByText(/active customer filter/i)).not.toBeInTheDocument();
  });

  it('switches between view tabs (Overview, AR Aging, Quotes, Invoices, Payments)', async () => {
    render(<FinancialPage />);

    await waitFor(() => {
      expect(screen.getByTestId('page-ar-aging-chart')).toBeInTheDocument();
      expect(screen.getByTestId('page-financial-dashboard')).toBeInTheDocument();
    });

    // Switch to AR Aging tab
    const arAgingTab = screen.getByTestId('tab-ar-aging');
    fireEvent.click(arAgingTab);

    await waitFor(() => {
      expect(screen.getByTestId('page-ar-aging-chart')).toBeInTheDocument();
    });

    // Switch to Quotes tab
    const quotesTab = screen.getByTestId('tab-quotes');
    fireEvent.click(quotesTab);

    await waitFor(() => {
      expect(screen.getByTestId('page-financial-dashboard')).toBeInTheDocument();
    });

    // Switch to Invoices tab
    const invoicesTab = screen.getByTestId('tab-invoices');
    fireEvent.click(invoicesTab);

    await waitFor(() => {
      expect(screen.getByTestId('page-financial-dashboard')).toBeInTheDocument();
    });

    // Switch to Payments tab
    const paymentsTab = screen.getByTestId('tab-payments');
    fireEvent.click(paymentsTab);

    await waitFor(() => {
      expect(screen.getByTestId('page-financial-dashboard')).toBeInTheDocument();
    });
  });

  it('handles manual refresh button click', async () => {
    render(<FinancialPage />);

    await waitFor(() => {
      expect(screen.getByText('finance.lead@tenant.org')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByTestId('refresh-financial-btn');
    fireEvent.click(refreshBtn);

    expect(screen.getByText(/syncing/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });
});
