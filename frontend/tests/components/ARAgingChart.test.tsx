import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ARAgingChart,
  formatCurrency,
  formatInvoiceCount,
  formatPercent,
  calculateARTotals,
} from '../../src/components/financial/ARAgingChart';
import { ARAgingMetrics } from '../../src/services/financial';
import * as financialService from '../../src/services/financial';

// Mock the financial service module
vi.mock('../../src/services/financial', async () => {
  const actual = await vi.importActual('../../src/services/financial');
  return {
    ...actual,
    getARAgingMetrics: vi.fn(),
  };
});

describe('ARAgingChart Component & Helpers [FR-4]', () => {
  const mockPopulatedMetrics: ARAgingMetrics = {
    bucket_0_30: { total_outstanding: 15000.5, invoice_count: 5 },
    bucket_31_60: { total_outstanding: 5000.0, invoice_count: 2 },
    bucket_61_90: { total_outstanding: 2500.25, invoice_count: 1 },
    bucket_90_plus: { total_outstanding: 1000.0, invoice_count: 1 },
  };

  const mockZeroMetrics: ARAgingMetrics = {
    bucket_0_30: { total_outstanding: 0, invoice_count: 0 },
    bucket_31_60: { total_outstanding: 0, invoice_count: 0 },
    bucket_61_90: { total_outstanding: 0, invoice_count: 0 },
    bucket_90_plus: { total_outstanding: 0, invoice_count: 0 },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Helper Functions [FR-4]', () => {
    it('formatCurrency formats USD amounts correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(23500.75)).toBe('$23,500.75');
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
      expect(formatCurrency(NaN)).toBe('$0.00');
    });

    it('formatInvoiceCount formats invoice count strings accurately', () => {
      expect(formatInvoiceCount(0)).toBe('0 Invoices');
      expect(formatInvoiceCount(1)).toBe('1 Invoice');
      expect(formatInvoiceCount(5)).toBe('5 Invoices');
      expect(formatInvoiceCount(null)).toBe('0 Invoices');
      expect(formatInvoiceCount(-1)).toBe('0 Invoices');
    });

    it('formatPercent formats percentage values to 1 decimal place', () => {
      expect(formatPercent(0)).toBe('0.0%');
      expect(formatPercent(63.83)).toBe('63.8%');
      expect(formatPercent(100)).toBe('100.0%');
      expect(formatPercent(null)).toBe('0.0%');
      expect(formatPercent(-5)).toBe('0.0%');
    });

    it('calculateARTotals computes total outstanding balance and invoice counts', () => {
      const summary = calculateARTotals(mockPopulatedMetrics);
      expect(summary.totalOutstanding).toBe(23500.75);
      expect(summary.totalInvoices).toBe(9);
      expect(summary.isZeroData).toBe(false);
      expect(summary.buckets).toHaveLength(4);

      // Verify bucket percentages sum approximately to 100%
      const totalPct = summary.buckets.reduce((acc, b) => acc + b.percentage, 0);
      expect(totalPct).toBeCloseTo(100, 1);

      // Verify bucket labels
      expect(summary.buckets[0].label).toBe('0–30 Days');
      expect(summary.buckets[1].label).toBe('31–60 Days');
      expect(summary.buckets[2].label).toBe('61–90 Days');
      expect(summary.buckets[3].label).toBe('90+ Days');
    });

    it('calculateARTotals flags zero data state when all buckets are zero', () => {
      const summary = calculateARTotals(mockZeroMetrics);
      expect(summary.totalOutstanding).toBe(0);
      expect(summary.totalInvoices).toBe(0);
      expect(summary.isZeroData).toBe(true);
    });

    it('calculateARTotals handles null or undefined metrics gracefully', () => {
      const summary = calculateARTotals(null);
      expect(summary.totalOutstanding).toBe(0);
      expect(summary.totalInvoices).toBe(0);
      expect(summary.isZeroData).toBe(true);
    });
  });

  describe('ARAgingChart Component Rendering [FR-4]', () => {
    it('renders component header, title, and total AR balance with populated data', () => {
      render(<ARAgingChart data={mockPopulatedMetrics} title="Accounts Receivable (AR) Aging" />);

      expect(screen.getByText('Accounts Receivable (AR) Aging')).toBeInTheDocument();
      expect(screen.getByText('$23,500.75')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument(); // Total outstanding invoices
    });

    it('renders all 4 duration buckets (0-30, 31-60, 61-90, 90+ days) with correct amounts and counts', () => {
      render(<ARAgingChart data={mockPopulatedMetrics} />);

      expect(screen.getByTestId('ar-bucket-card-bucket_0_30')).toBeInTheDocument();
      expect(screen.getByTestId('ar-bucket-card-bucket_31_60')).toBeInTheDocument();
      expect(screen.getByTestId('ar-bucket-card-bucket_61_90')).toBeInTheDocument();
      expect(screen.getByTestId('ar-bucket-card-bucket_90_plus')).toBeInTheDocument();

      // Check bucket values
      expect(screen.getByText('$15,000.50')).toBeInTheDocument();
      expect(screen.getByText('$5,000.00')).toBeInTheDocument();
      expect(screen.getByText('$2,500.25')).toBeInTheDocument();
      expect(screen.getByText('$1,000.00')).toBeInTheDocument();

      // Check invoice counts
      expect(screen.getByText('5 Invoices')).toBeInTheDocument();
      expect(screen.getByText('2 Invoices')).toBeInTheDocument();
    });

    it('renders zero-data empty state when metrics data is zero across all buckets', () => {
      render(<ARAgingChart data={mockZeroMetrics} />);

      expect(screen.getByTestId('ar-aging-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No Outstanding Receivables')).toBeInTheDocument();
      expect(
        screen.getByText(/All client invoices are fully settled or no past-due balances exist/i)
      ).toBeInTheDocument();

      // Verify empty bucket cards inside zero state
      expect(screen.getByTestId('empty-bucket-bucket_0_30')).toBeInTheDocument();
      expect(screen.getByTestId('empty-bucket-bucket_31_60')).toBeInTheDocument();
      expect(screen.getByTestId('empty-bucket-bucket_61_90')).toBeInTheDocument();
      expect(screen.getByTestId('empty-bucket-bucket_90_plus')).toBeInTheDocument();
    });

    it('renders loading state when isLoading prop is true', () => {
      render(<ARAgingChart isLoading={true} />);

      expect(screen.getByTestId('ar-aging-loading')).toBeInTheDocument();
      expect(screen.getByText('Calculating duration bucket totals...')).toBeInTheDocument();
    });

    it('renders error state banner and triggers onRetry when retry button is clicked', () => {
      const mockRetry = vi.fn();
      render(
        <ARAgingChart
          error="Failed to load database connection"
          onRetry={mockRetry}
          data={null}
        />
      );

      expect(screen.getByTestId('ar-aging-error')).toBeInTheDocument();
      expect(screen.getByText('Failed to load database connection')).toBeInTheDocument();

      const retryBtn = screen.getByTestId('ar-aging-retry-btn');
      fireEvent.click(retryBtn);
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('fetches metrics via API service when data prop is omitted', async () => {
      vi.mocked(financialService.getARAgingMetrics).mockResolvedValueOnce(
        mockPopulatedMetrics
      );

      render(<ARAgingChart initialParams={{ customer_id: 'cust-101' }} />);

      await waitFor(() => {
        expect(financialService.getARAgingMetrics).toHaveBeenCalledWith({
          customer_id: 'cust-101',
        });
      });

      expect(await screen.findByText('$23,500.75')).toBeInTheDocument();
    });

    it('invokes onFilterChange and triggers re-fetch on filter form submit', async () => {
      vi.mocked(financialService.getARAgingMetrics).mockResolvedValue(mockPopulatedMetrics);
      const mockFilterChange = vi.fn();

      render(<ARAgingChart onFilterChange={mockFilterChange} />);

      const customerInput = screen.getByTestId('ar-customer-filter-input');
      fireEvent.change(customerInput, { target: { value: 'cust-999' } });

      const submitBtn = screen.getByTestId('ar-filter-submit-btn');
      fireEvent.click(submitBtn);

      expect(mockFilterChange).toHaveBeenCalledWith({
        customer_id: 'cust-999',
        as_of_date_val: undefined,
      });

      await waitFor(() => {
        expect(financialService.getARAgingMetrics).toHaveBeenCalledWith({
          customer_id: 'cust-999',
        });
      });
    });

    it('clears filter inputs when clear button is clicked', async () => {
      vi.mocked(financialService.getARAgingMetrics).mockResolvedValue(mockZeroMetrics);
      const mockFilterChange = vi.fn();

      render(<ARAgingChart customerId="cust-123" onFilterChange={mockFilterChange} />);

      const clearBtn = screen.getByTestId('ar-filter-clear-btn');
      fireEvent.click(clearBtn);

      expect(mockFilterChange).toHaveBeenCalledWith({});
    });
  });
});
