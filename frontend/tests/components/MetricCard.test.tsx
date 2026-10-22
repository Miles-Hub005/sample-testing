import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MetricCard, formatFallbackValue, getPercentageChange } from '../../src/components/dashboard/MetricCard';
import { MetricSchema } from '../../src/services/dashboard';

describe('MetricCard Component', () => {
  const validMetric: MetricSchema = {
    domain: 'financials',
    metric_key: 'recurring_revenue',
    display_name: 'Recurring Revenue',
    raw_value: 12500,
    baseline_value: 10000,
    formatted_value: '$12,500',
    percentage_change: 25.0,
    status: 'VALID',
    unit: 'currency',
  };

  const zeroMetric: MetricSchema = {
    domain: 'support',
    metric_key: 'open_tickets',
    display_name: 'Open Critical Tickets',
    raw_value: 0,
    baseline_value: 5,
    formatted_value: '0',
    percentage_change: -100.0,
    status: 'ZERO',
    unit: 'count',
  };

  const unavailableMetric: MetricSchema = {
    domain: 'lead_gen',
    metric_key: 'conversion_rate',
    display_name: 'Lead Conversion Rate',
    raw_value: null,
    baseline_value: null,
    formatted_value: null,
    percentage_change: null,
    status: 'UNAVAILABLE',
    unit: 'percentage',
    error_detail: 'Lead Gen service upstream timeout (5000ms exceeded).',
  };

  describe('Value & Change Indicators Rendering [FR-2]', () => {
    it('renders valid metric with formatted value and positive percentage change', () => {
      render(<MetricCard metric={validMetric} />);

      const card = screen.getByTestId('metric-card-recurring_revenue');
      expect(card).toBeDefined();

      // Check header and name
      expect(screen.getByText('Recurring Revenue')).toBeDefined();
      expect(screen.getByText('FINANCIALS')).toBeDefined();

      // Check metric value
      const valueEl = screen.getByTestId('metric-value-recurring_revenue');
      expect(valueEl.textContent).toBe('$12,500');

      // Check percentage change indicator
      const indicator = screen.getByTestId('percentage-indicator-recurring_revenue');
      expect(indicator.textContent).toContain('+25.0%');

      // Check baseline display
      const baselineEl = screen.getByTestId('baseline-value-recurring_revenue');
      expect(baselineEl.textContent).toContain('$10,000');
    });

    it('renders negative percentage change indicator correctly', () => {
      const negativeMetric: MetricSchema = {
        ...validMetric,
        metric_key: 'monthly_leads',
        display_name: 'Monthly Leads',
        raw_value: 80,
        baseline_value: 100,
        formatted_value: '80',
        percentage_change: -20.0,
        unit: 'count',
      };

      render(<MetricCard metric={negativeMetric} />);

      const indicator = screen.getByTestId('percentage-indicator-monthly_leads');
      expect(indicator.textContent).toContain('-20.0%');
      expect(indicator.getAttribute('aria-label')).toContain('20.0 percent decrease relative to baseline');
    });

    it('calculates percentage change dynamically if missing in metric schema', () => {
      const missingChangeMetric: MetricSchema = {
        ...validMetric,
        metric_key: 'mrr',
        percentage_change: null,
        raw_value: 150,
        baseline_value: 100,
      };

      const calculated = getPercentageChange(missingChangeMetric);
      expect(calculated).toBe(50.0);

      render(<MetricCard metric={missingChangeMetric} />);
      const indicator = screen.getByTestId('percentage-indicator-mrr');
      expect(indicator.textContent).toContain('+50.0%');
    });

    it('formats raw value using fallback formatter if formatted_value is missing', () => {
      const noFormattedMetric: MetricSchema = {
        domain: 'financials',
        metric_key: 'total_mrr',
        display_name: 'Total MRR',
        raw_value: 25000,
        baseline_value: 20000,
        formatted_value: null,
        status: 'VALID',
        unit: 'currency',
      };

      render(<MetricCard metric={noFormattedMetric} />);

      const valueEl = screen.getByTestId('metric-value-total_mrr');
      expect(valueEl.textContent).toBe('$25,000');
    });
  });

  describe('Zero Active Metric Handling [FR-2, FR-4]', () => {
    it('renders zero count metric as valid "0" and distinct from unavailable state', () => {
      render(<MetricCard metric={zeroMetric} />);

      const card = screen.getByTestId('metric-card-open_tickets');
      expect(card).toBeDefined();

      const valueEl = screen.getByTestId('metric-value-open_tickets');
      expect(valueEl.textContent).toBe('0');

      // Status badge shows "Zero Value" or "info" badge, NOT "Unavailable"
      const statusBadge = screen.getByTestId('status-badge-zero-open_tickets');
      expect(statusBadge.textContent).toContain('Zero Value');

      const zeroIndicator = screen.getByTestId('zero-indicator-open_tickets');
      expect(zeroIndicator.textContent).toBe('Active zero count');
    });

    it('renders zero currency metric as "$0"', () => {
      const zeroCurrencyMetric: MetricSchema = {
        domain: 'financials',
        metric_key: 'churn_loss',
        display_name: 'Churn Loss',
        raw_value: 0,
        baseline_value: 1000,
        formatted_value: '$0',
        percentage_change: -100,
        status: 'ZERO',
        unit: 'currency',
      };

      render(<MetricCard metric={zeroCurrencyMetric} />);

      const valueEl = screen.getByTestId('metric-value-churn_loss');
      expect(valueEl.textContent).toBe('$0');
    });

    it('renders zero percentage metric as "0%"', () => {
      const zeroPercentageMetric: MetricSchema = {
        domain: 'lead_gen',
        metric_key: 'bounce_rate',
        display_name: 'Bounce Rate',
        raw_value: 0,
        baseline_value: 5,
        formatted_value: '0%',
        percentage_change: -100,
        status: 'ZERO',
        unit: 'percentage',
      };

      render(<MetricCard metric={zeroPercentageMetric} />);

      const valueEl = screen.getByTestId('metric-value-bounce_rate');
      expect(valueEl.textContent).toBe('0%');
    });
  });

  describe('Unavailable Outage State & Retry Handling [FR-3]', () => {
    it('renders unavailable state with error detail and retry button', () => {
      render(<MetricCard metric={unavailableMetric} />);

      const card = screen.getByTestId('metric-card-conversion_rate');
      expect(card).toBeDefined();

      expect(screen.getByTestId('status-badge-unavailable-conversion_rate')).toBeDefined();
      expect(screen.getByText('Lead Conversion Rate')).toBeDefined();

      const errorDetail = screen.getByTestId('error-detail-conversion_rate');
      expect(errorDetail.textContent).toContain('Lead Gen service upstream timeout');

      const retryBtn = screen.getByTestId('retry-button-conversion_rate');
      expect(retryBtn).toBeDefined();
      expect(retryBtn.textContent).toContain('Retry Fetch');
    });

    it('invokes onRetry callback when retry button is clicked', () => {
      const onRetryMock = vi.fn();
      render(<MetricCard metric={unavailableMetric} onRetry={onRetryMock} />);

      const retryBtn = screen.getByTestId('retry-button-conversion_rate');
      fireEvent.click(retryBtn);

      expect(onRetryMock).toHaveBeenCalledTimes(1);
    });

    it('prevents event propagation to card onClick when retry button is clicked on interactive card', () => {
      const onClickMock = vi.fn();
      const onRetryMock = vi.fn();
      render(<MetricCard metric={unavailableMetric} onClick={onClickMock} onRetry={onRetryMock} />);

      const retryBtn = screen.getByTestId('retry-button-conversion_rate');
      fireEvent.click(retryBtn);

      expect(onRetryMock).toHaveBeenCalledTimes(1);
      expect(onClickMock).not.toHaveBeenCalled();
    });

    it('displays loading spinner and disables retry button when isRetrying is true', () => {
      render(<MetricCard metric={unavailableMetric} isRetrying={true} />);

      const retryBtn = screen.getByTestId('retry-button-conversion_rate') as HTMLButtonElement;
      expect(retryBtn.disabled).toBe(true);
      expect(retryBtn.textContent).toContain('Retrying...');
    });
  });

  describe('Interactivity and Accessibility (WCAG 2.1 AA)', () => {
    it('triggers onClick handler when card is clicked', () => {
      const onClickMock = vi.fn();
      render(<MetricCard metric={validMetric} onClick={onClickMock} />);

      const card = screen.getByTestId('metric-card-recurring_revenue');
      fireEvent.click(card);

      expect(onClickMock).toHaveBeenCalledTimes(1);
    });

    it('triggers onClick handler on Enter or Space keydown', () => {
      const onClickMock = vi.fn();
      render(<MetricCard metric={validMetric} onClick={onClickMock} />);

      const card = screen.getByTestId('metric-card-recurring_revenue');
      fireEvent.keyDown(card, { key: 'Enter' });
      fireEvent.keyDown(card, { key: ' ' });

      expect(onClickMock).toHaveBeenCalledTimes(2);
    });

    it('provides accessible aria-label on card element', () => {
      render(<MetricCard metric={validMetric} />);

      const card = screen.getByTestId('metric-card-recurring_revenue');
      expect(card.getAttribute('aria-label')).toContain('Recurring Revenue metric card: $12,500');
    });
  });

  describe('Utility Formatters Tests', () => {
    it('formats fallback values for all units correctly', () => {
      expect(formatFallbackValue(100, 'currency', 'VALID')).toBe('$100');
      expect(formatFallbackValue(12.5, 'percentage', 'VALID')).toBe('12.5%');
      expect(formatFallbackValue(1500, 'count', 'VALID')).toBe('1,500');
      expect(formatFallbackValue(null, 'currency', 'ZERO')).toBe('$0');
      expect(formatFallbackValue(null, 'count', 'UNAVAILABLE')).toBe('Unavailable');
    });
  });
});
