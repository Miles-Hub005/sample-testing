import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  Dashboard,
  formatCurrency,
  formatDate,
  formatStatusLabel,
  normalizeStateString,
  calculateDashboardSummary,
} from '../../src/components/financial/Dashboard';
import { Quote, Invoice, Payment } from '../../src/services/financial';
import * as financialService from '../../src/services/financial';

// Mock the financial service module
vi.mock('../../src/services/financial', async () => {
  const actual = await vi.importActual('../../src/services/financial');
  return {
    ...actual,
    getQuotes: vi.fn(),
    getInvoices: vi.fn(),
    getPayments: vi.fn(),
  };
});

describe('Dashboard Component & Helper Functions [FR-1, FR-2, FR-3]', () => {
  const mockQuotes: Quote[] = [
    {
      quote_id: 'Q-2026-001',
      customer_id: 'CUST-001',
      approval_state: 'Approved',
      expiration_date_time: '2026-12-31T23:59:59Z',
      total_amount: 15000.0,
      created_at: '2026-10-01T00:00:00Z',
    },
    {
      quote_id: 'Q-2026-002',
      customer_id: 'CUST-002',
      approval_state: 'Pending_Approval',
      expiration_date_time: '2026-11-15T23:59:59Z',
      total_amount: 8500.5,
      created_at: '2026-10-05T00:00:00Z',
    },
    {
      quote_id: 'Q-2026-003',
      customer_id: 'CUST-001',
      approval_state: 'Expired',
      expiration_date_time: '2026-09-01T23:59:59Z',
      total_amount: 3200.0,
      created_at: '2026-08-01T00:00:00Z',
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
      total_amount: 15000.0,
      outstanding_amount: 5000.0,
    },
    {
      invoice_id: 'INV-2026-102',
      quote_id: 'Q-2026-002',
      customer_id: 'CUST-002',
      status: 'Past_Due',
      issue_date_time: '2026-08-01T00:00:00Z',
      due_date_time: '2026-09-01T00:00:00Z',
      total_amount: 8500.5,
      outstanding_amount: 8500.5,
    },
    {
      invoice_id: 'INV-2026-103',
      quote_id: null,
      customer_id: 'CUST-003',
      status: 'Paid',
      issue_date_time: '2026-07-01T00:00:00Z',
      due_date_time: '2026-08-01T00:00:00Z',
      total_amount: 4200.0,
      outstanding_amount: 0.0,
    },
  ];

  const mockPayments: Payment[] = [
    {
      payment_id: 'PAY-2026-501',
      invoice_id: 'INV-2026-101',
      payment_date_time: '2026-10-10T14:30:00Z',
      amount_paid: 10000.0,
      payment_method: 'Corporate VISA (•••• 4242)',
    },
    {
      payment_id: 'PAY-2026-502',
      invoice_id: 'INV-2026-103',
      payment_date_time: '2026-07-15T09:15:00Z',
      amount_paid: 4200.0,
      payment_method: 'ACH Wire Transfer',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(financialService.getQuotes).mockResolvedValue(mockQuotes);
    vi.mocked(financialService.getInvoices).mockResolvedValue(mockInvoices);
    vi.mocked(financialService.getPayments).mockResolvedValue(mockPayments);
  });

  // ==========================================================================
  // Helper Function Tests
  // ==========================================================================

  describe('Helper Functions [FR-1, FR-2, FR-3]', () => {
    it('formatCurrency formats numeric USD amounts accurately', () => {
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(1250.5)).toBe('$1,250.50');
      expect(formatCurrency(15000)).toBe('$15,000.00');
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
      expect(formatCurrency(NaN)).toBe('$0.00');
    });

    it('formatDate converts ISO date strings into readable date formats', () => {
      expect(formatDate('2026-10-01T00:00:00Z')).toContain('Oct');
      expect(formatDate('2026-10-01T00:00:00Z')).toContain('2026');
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate('')).toBe('N/A');
      expect(formatDate('invalid-date')).toBe('invalid-date');
    });

    it('formatStatusLabel formats snake_case status keys into Title Case', () => {
      expect(formatStatusLabel('pending_approval')).toBe('Pending Approval');
      expect(formatStatusLabel('past_due')).toBe('Past Due');
      expect(formatStatusLabel('approved')).toBe('Approved');
      expect(formatStatusLabel(null)).toBe('Unknown');
    });

    it('normalizeStateString normalizes spaces, dashes, and underscores', () => {
      expect(normalizeStateString('Pending Approval')).toBe('pending_approval');
      expect(normalizeStateString('Pending_Approval')).toBe('pending_approval');
      expect(normalizeStateString('PAST-DUE')).toBe('past_due');
      expect(normalizeStateString(null)).toBe('');
    });

    it('calculateDashboardSummary computes accurate totals across quotes, invoices, and payments', () => {
      const summary = calculateDashboardSummary(mockQuotes, mockInvoices, mockPayments);

      expect(summary.totalQuotesCount).toBe(3);
      expect(summary.totalQuotesValue).toBe(26700.5);
      expect(summary.approvedQuotesCount).toBe(1);
      expect(summary.pendingQuotesCount).toBe(1);

      expect(summary.totalInvoicesCount).toBe(3);
      expect(summary.totalInvoicesValue).toBe(27700.5);
      expect(summary.totalOutstandingAmount).toBe(13500.5);
      expect(summary.pastDueInvoicesCount).toBe(1);

      expect(summary.totalPaymentsCount).toBe(2);
      expect(summary.totalPaymentsValue).toBe(14200.0);
    });

    it('calculateDashboardSummary handles empty or null arrays safely', () => {
      const summary = calculateDashboardSummary(null, undefined, []);
      expect(summary.totalQuotesCount).toBe(0);
      expect(summary.totalQuotesValue).toBe(0);
      expect(summary.totalInvoicesCount).toBe(0);
      expect(summary.totalOutstandingAmount).toBe(0);
      expect(summary.totalPaymentsCount).toBe(0);
      expect(summary.totalPaymentsValue).toBe(0);
    });
  });

  // ==========================================================================
  // Component Rendering Tests
  // ==========================================================================

  describe('Component Rendering [FR-1, FR-2, FR-3]', () => {
    it('renders dashboard heading, KPI summary cards, and all overview section tables', () => {
      render(
        <Dashboard
          quotes={mockQuotes}
          invoices={mockInvoices}
          payments={mockPayments}
        />
      );

      // Heading & Title
      expect(screen.getByText('Financial Transparency Dashboard')).toBeInTheDocument();

      // KPI summary metrics
      expect(screen.getByTestId('kpi-card-quotes')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-card-invoices')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-card-payments')).toBeInTheDocument();

      // Verify formatted currency values in KPI cards
      expect(screen.getByText('$26,700.50')).toBeInTheDocument(); // Quotes Total
      expect(screen.getByText('$13,500.50')).toBeInTheDocument(); // Outstanding Invoices Total
      expect(screen.getByText('$14,200.00')).toBeInTheDocument(); // Payments Collected Total

      // Sections in All Overview tab
      expect(screen.getByText('Authorized Quotes [FR-1]')).toBeInTheDocument();
      expect(screen.getByText('Status-Filtered Invoices [FR-2]')).toBeInTheDocument();
      expect(screen.getByText('Payment History Records [FR-3]')).toBeInTheDocument();

      // Tables rendered
      expect(screen.getByTestId('quotes-table')).toBeInTheDocument();
      expect(screen.getByTestId('invoices-table')).toBeInTheDocument();
      expect(screen.getByTestId('payments-table')).toBeInTheDocument();
    });

    it('displays quotes with approval states and explicit expiration dates [FR-1]', () => {
      render(
        <Dashboard
          quotes={mockQuotes}
          invoices={[]}
          payments={[]}
          initialTab="quotes"
        />
      );

      expect(screen.getByTestId('quote-row-Q-2026-001')).toBeInTheDocument();
      expect(screen.getByTestId('quote-row-Q-2026-002')).toBeInTheDocument();
      expect(screen.getByTestId('quote-row-Q-2026-003')).toBeInTheDocument();

      // Check approval state labels
      expect(screen.getAllByText('Approved').length).toBeGreaterThan(0);
      expect(screen.getByText('Pending Approval')).toBeInTheDocument();
      expect(screen.getAllByText('Expired').length).toBeGreaterThan(0);

      // Check explicit expiration date
      expect(screen.getByText('Dec 31, 2026')).toBeInTheDocument();
    });

    it('displays invoices with status filters and outstanding balances [FR-2]', () => {
      render(
        <Dashboard
          quotes={[]}
          invoices={mockInvoices}
          payments={[]}
          initialTab="invoices"
        />
      );

      expect(screen.getByTestId('invoice-row-INV-2026-101')).toBeInTheDocument();
      expect(screen.getByTestId('invoice-row-INV-2026-102')).toBeInTheDocument();
      expect(screen.getByTestId('invoice-row-INV-2026-103')).toBeInTheDocument();

      // Check invoice status labels
      expect(screen.getByText('Current')).toBeInTheDocument();
      expect(screen.getByText('Past Due')).toBeInTheDocument();
      expect(screen.getByText('Paid')).toBeInTheDocument();

      // Check outstanding amounts
      expect(screen.getByText('$5,000.00')).toBeInTheDocument();
      expect(screen.getByText('$8,500.50')).toBeInTheDocument();
    });

    it('displays payment history records linked to corresponding invoices [FR-3]', () => {
      render(
        <Dashboard
          quotes={[]}
          invoices={mockInvoices}
          payments={mockPayments}
          initialTab="payments"
        />
      );

      expect(screen.getByTestId('payment-row-PAY-2026-501')).toBeInTheDocument();
      expect(screen.getByTestId('payment-row-PAY-2026-502')).toBeInTheDocument();

      // Check linked invoice IDs
      expect(screen.getByText('INV-2026-101')).toBeInTheDocument();
      expect(screen.getByText('INV-2026-103')).toBeInTheDocument();

      // Check payment amounts
      expect(screen.getByText('$10,000.00')).toBeInTheDocument();
      expect(screen.getByText('$4,200.00')).toBeInTheDocument();
      expect(screen.getByText('Corporate VISA (•••• 4242)')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Filtering & Tab Navigation Tests
  // ==========================================================================

  describe('Filtering & Navigation Interactivity [FR-1, FR-2, FR-3]', () => {
    it('switches tabs smoothly when clicking navigation tab buttons', () => {
      render(
        <Dashboard
          quotes={mockQuotes}
          invoices={mockInvoices}
          payments={mockPayments}
        />
      );

      // Click Quotes Tab
      fireEvent.click(screen.getByTestId('tab-quotes'));
      expect(screen.getByRole('heading', { name: /Authorized Quotes/i })).toBeInTheDocument();

      // Click Invoices Tab
      fireEvent.click(screen.getByTestId('tab-invoices'));
      expect(screen.getByRole('heading', { name: /Status-Filtered Invoices/i })).toBeInTheDocument();

      // Click Payments Tab
      fireEvent.click(screen.getByTestId('tab-payments'));
      expect(screen.getByRole('heading', { name: /Payment History Records/i })).toBeInTheDocument();
    });

    it('filters quotes by quote approval state dropdown [FR-1]', () => {
      render(
        <Dashboard
          quotes={mockQuotes}
          invoices={mockInvoices}
          payments={mockPayments}
          initialTab="quotes"
        />
      );

      const filterSelect = screen.getByTestId('quote-approval-filter');
      fireEvent.change(filterSelect, { target: { value: 'Approved' } });

      expect(screen.getByTestId('quote-row-Q-2026-001')).toBeInTheDocument();
      expect(screen.queryByTestId('quote-row-Q-2026-002')).not.toBeInTheDocument();
      expect(screen.queryByTestId('quote-row-Q-2026-003')).not.toBeInTheDocument();
    });

    it('filters invoices by invoice status dropdown [FR-2]', () => {
      render(
        <Dashboard
          quotes={mockQuotes}
          invoices={mockInvoices}
          payments={mockPayments}
          initialTab="invoices"
        />
      );

      const filterSelect = screen.getByTestId('invoice-status-filter');
      fireEvent.change(filterSelect, { target: { value: 'Past_Due' } });

      expect(screen.getByTestId('invoice-row-INV-2026-102')).toBeInTheDocument();
      expect(screen.queryByTestId('invoice-row-INV-2026-101')).not.toBeInTheDocument();
      expect(screen.queryByTestId('invoice-row-INV-2026-103')).not.toBeInTheDocument();
    });

    it('filters records by Customer ID input field', () => {
      render(
        <Dashboard
          quotes={mockQuotes}
          invoices={mockInvoices}
          payments={mockPayments}
          initialTab="quotes"
        />
      );

      const custInput = screen.getByTestId('customer-id-input');
      fireEvent.change(custInput, { target: { value: 'CUST-002' } });

      expect(screen.getByTestId('quote-row-Q-2026-002')).toBeInTheDocument();
      expect(screen.queryByTestId('quote-row-Q-2026-001')).not.toBeInTheDocument();
    });

    it('links invoice selection to payment view and invokes onSelectInvoice callback [FR-3]', () => {
      const onSelectInvoiceMock = vi.fn();
      render(
        <Dashboard
          quotes={mockQuotes}
          invoices={mockInvoices}
          payments={mockPayments}
          initialTab="invoices"
          onSelectInvoice={onSelectInvoiceMock}
        />
      );

      // Find "Payments" action button on first invoice row (INV-2026-101)
      const payButton = screen.getByRole('button', {
        name: /View payments linked to invoice INV-2026-101/i,
      });
      fireEvent.click(payButton);

      expect(onSelectInvoiceMock).toHaveBeenCalledWith('INV-2026-101');
      // Verify switch to payments tab and linked invoice filter applied
      expect(screen.getByTestId('payment-row-PAY-2026-501')).toBeInTheDocument();
      expect(screen.queryByTestId('payment-row-PAY-2026-502')).not.toBeInTheDocument();
    });

    it('clears all active filters when Clear Filters button is clicked', () => {
      render(
        <Dashboard
          quotes={mockQuotes}
          invoices={mockInvoices}
          payments={mockPayments}
          initialTab="quotes"
        />
      );

      // Apply filter
      fireEvent.change(screen.getByTestId('quote-approval-filter'), {
        target: { value: 'Approved' },
      });
      expect(screen.queryByTestId('quote-row-Q-2026-002')).not.toBeInTheDocument();

      // Click Clear Filters
      const clearButton = screen.getByTestId('reset-filters-button');
      fireEvent.click(clearButton);

      expect(screen.getByTestId('quote-row-Q-2026-001')).toBeInTheDocument();
      expect(screen.getByTestId('quote-row-Q-2026-002')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Empty, Loading, and Error State Tests
  // ==========================================================================

  describe('Empty, Loading, and Error States', () => {
    it('renders empty state indicators when no quotes, invoices, or payments exist', () => {
      render(<Dashboard quotes={[]} invoices={[]} payments={[]} initialTab="all" />);

      expect(screen.getByTestId('quotes-empty-state')).toBeInTheDocument();
      expect(screen.getByTestId('invoices-empty-state')).toBeInTheDocument();
      expect(screen.getByTestId('payments-empty-state')).toBeInTheDocument();
    });

    it('renders loading indicator when isLoading prop is true', () => {
      render(
        <Dashboard
          quotes={mockQuotes}
          invoices={mockInvoices}
          payments={mockPayments}
          isLoading={true}
        />
      );

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      expect(screen.getByText('Loading financial transparency data...')).toBeInTheDocument();
    });

    it('renders error banner and handles retry button click', () => {
      const onRetryMock = vi.fn();
      render(
        <Dashboard
          quotes={[]}
          invoices={[]}
          payments={[]}
          error="Network timeout accessing financial service."
          onRetry={onRetryMock}
        />
      );

      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      expect(screen.getByText('Network timeout accessing financial service.')).toBeInTheDocument();

      const retryBtn = screen.getByTestId('retry-button');
      fireEvent.click(retryBtn);

      expect(onRetryMock).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Self-Fetching Mode Tests
  // ==========================================================================

  describe('Self-Fetching Mode', () => {
    it('fetches quotes, invoices, and payments automatically when props are omitted', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        expect(financialService.getQuotes).toHaveBeenCalled();
        expect(financialService.getInvoices).toHaveBeenCalled();
        expect(financialService.getPayments).toHaveBeenCalled();
      });

      expect(screen.getByTestId('quote-row-Q-2026-001')).toBeInTheDocument();
      expect(screen.getByTestId('invoice-row-INV-2026-101')).toBeInTheDocument();
      expect(screen.getByTestId('payment-row-PAY-2026-501')).toBeInTheDocument();
    });
  });
});
