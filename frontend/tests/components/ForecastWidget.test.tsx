import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ForecastWidget,
  formatForecastDate,
  formatDaysRemaining,
  formatConfidenceScore,
  getConfidenceLevelConfig,
  formatCalculatedOn,
} from '../../src/components/pipeline/ForecastWidget';
import { DealForecast, ForecastEvaluationLog, dealsApi } from '../../src/services/deals';

// Mock dealsApi
vi.mock('../../src/services/deals', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/deals')>();
  return {
    ...actual,
    dealsApi: {
      ...actual.dealsApi,
      getDealForecast: vi.fn(),
      recalculateDealForecast: vi.fn(),
      getForecastEvaluationLogs: vi.fn(),
    },
  };
});

describe('ForecastWidget Component [FR-008, FR-009, NFR-002]', () => {
  const mockReadyForecast: DealForecast = {
    id: 'fc-101',
    deal_id: 'deal-001',
    estimated_completion_date: '2026-11-15T00:00:00Z',
    confidence_score_pct: 85.5,
    status_code: 'READY',
    calculated_on: '2026-10-06T08:00:00Z',
  };

  const mockInsufficientForecast: DealForecast = {
    id: 'fc-102',
    deal_id: 'deal-002',
    estimated_completion_date: null,
    confidence_score_pct: null,
    status_code: 'INSUFFICIENT_DATA',
    calculated_on: '2026-10-06T08:00:00Z',
  };

  const mockLogs: ForecastEvaluationLog[] = [
    {
      id: 'log-1',
      deal_id: 'deal-001',
      forecast_id: 'fc-101',
      estimated_completion_date: '2026-11-15T00:00:00Z',
      confidence_score_pct: 85.5,
      status_code: 'READY',
      trigger_event: 'STAGE_CHANGE',
      calculated_on: '2026-10-06T08:00:00Z',
    },
    {
      id: 'log-2',
      deal_id: 'deal-001',
      forecast_id: 'fc-100',
      estimated_completion_date: '2026-12-01T00:00:00Z',
      confidence_score_pct: 72.0,
      status_code: 'READY',
      trigger_event: 'MANUAL_RECALCULATION',
      calculated_on: '2026-10-05T12:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Formatting & Utility Helpers', () => {
    it('formatForecastDate formats valid ISO dates cleanly', () => {
      expect(formatForecastDate('2026-11-15T00:00:00Z')).toBe('Nov 15, 2026');
      expect(formatForecastDate(null)).toBe('Insufficient Data');
      expect(formatForecastDate(undefined)).toBe('Insufficient Data');
      expect(formatForecastDate('invalid-date')).toBe('Invalid Date');
    });

    it('formatDaysRemaining calculates future and past day counts', () => {
      const now = new Date();
      const futureDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10).toISOString();
      const futureRes = formatDaysRemaining(futureDate);
      expect(futureRes.days).toBe(10);
      expect(futureRes.text).toBe('10 days remaining');
      expect(futureRes.isPast).toBe(false);

      const pastDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5).toISOString();
      const pastRes = formatDaysRemaining(pastDate);
      expect(pastRes.days).toBe(-5);
      expect(pastRes.text).toBe('5 days past est.');
      expect(pastRes.isPast).toBe(true);

      expect(formatDaysRemaining(null).text).toBe('N/A');
    });

    it('formatConfidenceScore formats percentage values', () => {
      expect(formatConfidenceScore(85)).toBe('85%');
      expect(formatConfidenceScore(85.5)).toBe('85.5%');
      expect(formatConfidenceScore(null)).toBe('--');
      expect(formatConfidenceScore(undefined)).toBe('--');
    });

    it('getConfidenceLevelConfig returns correct color and label tiers', () => {
      const high = getConfidenceLevelConfig(80);
      expect(high.level).toBe('High');
      expect(high.colorClass).toContain('emerald');

      const med = getConfidenceLevelConfig(60);
      expect(med.level).toBe('Medium');
      expect(med.colorClass).toContain('amber');

      const low = getConfidenceLevelConfig(30);
      expect(low.level).toBe('Low');
      expect(low.colorClass).toContain('rose');

      const unknown = getConfidenceLevelConfig(null);
      expect(unknown.level).toBe('Unknown');
    });

    it('formatCalculatedOn handles relative timestamps', () => {
      expect(formatCalculatedOn(null)).toBe('Not yet calculated');
      expect(formatCalculatedOn(new Date().toISOString())).toBe('Just now');
    });
  });

  describe('ForecastWidget Rendering with READY Forecast [FR-008, FR-009]', () => {
    it('renders READY forecast with estimated close date and percentage confidence score', () => {
      render(
        <ForecastWidget
          dealId="deal-001"
          initialForecast={mockReadyForecast}
          dealTitle="Enterprise Enterprise Cloud Migration"
        />
      );

      expect(screen.getByText('AI Timeline Completion Forecast')).toBeInTheDocument();
      expect(screen.getByText('Deal: Enterprise Enterprise Cloud Migration')).toBeInTheDocument();
      expect(screen.getByTestId('forecast-status-badge')).toBeInTheDocument();

      // Check Estimated Close Date
      expect(screen.getByTestId('estimated-completion-date-value')).toHaveTextContent('Nov 15, 2026');

      // Check Confidence Score & Gauge
      expect(screen.getByTestId('confidence-score-value')).toHaveTextContent('85.5%');
      expect(screen.getByTestId('confidence-level-badge')).toHaveTextContent('High Confidence');

      const meterBar = screen.getByRole('meter', { name: /confidence score/i });
      expect(meterBar).toBeInTheDocument();
      expect(meterBar).toHaveAttribute('aria-valuenow', '85.5');
    });

    it('renders compact mode correctly when compact prop is true', () => {
      render(
        <ForecastWidget
          dealId="deal-001"
          initialForecast={mockReadyForecast}
          compact={true}
        />
      );

      expect(screen.getByText('AI Forecast')).toBeInTheDocument();
      expect(screen.getByText('Nov 15, 2026')).toBeInTheDocument();
      expect(screen.getByText(/85\.5%/)).toBeInTheDocument();
    });
  });

  describe('ForecastWidget Rendering with INSUFFICIENT_DATA [FR-008]', () => {
    it('renders insufficient data status banner and dashes without throwing errors', () => {
      render(
        <ForecastWidget
          dealId="deal-002"
          initialForecast={mockInsufficientForecast}
        />
      );

      expect(screen.getByTestId('insufficient-data-title')).toHaveTextContent(
        'Insufficient CRM Transition History Data'
      );
      expect(screen.getByTestId('insufficient-date-placeholder')).toHaveTextContent(
        '-- (Insufficient Data)'
      );
      expect(screen.getByTestId('insufficient-score-placeholder')).toHaveTextContent('--%');
    });
  });

  describe('API Interactions & Recalculations [NFR-002, FR-010]', () => {
    it('fetches forecast automatically if dealId provided without initialForecast', async () => {
      vi.mocked(dealsApi.getDealForecast).mockResolvedValueOnce(mockReadyForecast);

      render(<ForecastWidget dealId="deal-001" />);

      expect(dealsApi.getDealForecast).toHaveBeenCalledWith('deal-001');

      await waitFor(() => {
        expect(screen.getByTestId('estimated-completion-date-value')).toHaveTextContent(
          'Nov 15, 2026'
        );
      });
    });

    it('triggers forecast recalculation when recalculate button is clicked', async () => {
      const updatedForecast: DealForecast = {
        ...mockReadyForecast,
        confidence_score_pct: 92.0,
      };
      vi.mocked(dealsApi.recalculateDealForecast).mockResolvedValueOnce(updatedForecast);

      const onRecalculateMock = vi.fn();

      render(
        <ForecastWidget
          dealId="deal-001"
          initialForecast={mockReadyForecast}
          onRecalculate={onRecalculateMock}
        />
      );

      const recalcBtn = screen.getByTestId('recalculate-forecast-btn');
      fireEvent.click(recalcBtn);

      expect(dealsApi.recalculateDealForecast).toHaveBeenCalledWith('deal-001');

      await waitFor(() => {
        expect(screen.getByTestId('forecast-success-banner')).toBeInTheDocument();
        expect(screen.getByTestId('confidence-score-value')).toHaveTextContent('92%');
        expect(onRecalculateMock).toHaveBeenCalledWith(updatedForecast);
      });
    });

    it('displays error banner when recalculation fails', async () => {
      vi.mocked(dealsApi.recalculateDealForecast).mockRejectedValueOnce(
        new Error('AI Engine Timeout')
      );

      render(
        <ForecastWidget
          dealId="deal-001"
          initialForecast={mockReadyForecast}
        />
      );

      const recalcBtn = screen.getByTestId('recalculate-forecast-btn');
      fireEvent.click(recalcBtn);

      await waitFor(() => {
        expect(screen.getByTestId('forecast-error-banner')).toHaveTextContent('AI Engine Timeout');
      });
    });

    it('toggles evaluation history log drawer and fetches logs', async () => {
      vi.mocked(dealsApi.getForecastEvaluationLogs).mockResolvedValueOnce(mockLogs);

      render(
        <ForecastWidget
          dealId="deal-001"
          initialForecast={mockReadyForecast}
          showLogHistory={true}
        />
      );

      const toggleBtn = screen.getByTestId('toggle-log-history-btn');
      fireEvent.click(toggleBtn);

      expect(dealsApi.getForecastEvaluationLogs).toHaveBeenCalledWith('deal-001', 10);

      await waitFor(() => {
        expect(screen.getByTestId('forecast-log-history-panel')).toBeInTheDocument();
        expect(screen.getByText('STAGE_CHANGE')).toBeInTheDocument();
        expect(screen.getByText('MANUAL_RECALCULATION')).toBeInTheDocument();
      });
    });
  });
});
