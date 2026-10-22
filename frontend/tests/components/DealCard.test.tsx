import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DealCard,
  formatDealValue,
  formatAgeInDays,
  formatWinProbability,
  getWinProbabilityPct,
  getProbabilityStyle,
} from '../../src/components/pipeline/DealCard';
import { Deal } from '../../src/services/deals';

describe('DealCard Component [FR-002]', () => {
  const sampleDeal: Deal = {
    id: 'deal-101',
    title: 'Enterprise Software Expansion',
    deal_value: 125000,
    milestone_stage: 'Solution Proposal',
    win_probability: 0.65,
    age_in_days: 14,
    action_items_count: 3,
    stakeholders_count: 2,
    forecast: {
      id: 'fc-1',
      deal_id: 'deal-101',
      status_code: 'READY',
      estimated_completion_date: '2026-11-15T00:00:00Z',
      confidence_score_pct: 85,
    },
  };

  describe('Utility Formatting Helpers', () => {
    it('formatDealValue formats currency correctly', () => {
      expect(formatDealValue(125000)).toBe('$125,000');
      expect(formatDealValue(125000.5)).toBe('$125,000.50');
      expect(formatDealValue(0)).toBe('$0');
      expect(formatDealValue(null)).toBe('$0');
      expect(formatDealValue(undefined)).toBe('$0');
    });

    it('formatAgeInDays formats age in days correctly', () => {
      expect(formatAgeInDays(14)).toBe('14 days');
      expect(formatAgeInDays(1)).toBe('1 day');
      expect(formatAgeInDays(0)).toBe('0 days');
      expect(formatAgeInDays(null, null)).toBe('0 days');

      // Test fallback to created_on date calculation
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatAgeInDays(null, tenDaysAgo)).toBe('10 days');
    });

    it('formatWinProbability formats win probability score', () => {
      expect(formatWinProbability(0.65)).toBe('65%');
      expect(formatWinProbability(0.4)).toBe('40%');
      expect(formatWinProbability(75)).toBe('75%');
      expect(formatWinProbability(0)).toBe('0%');
      expect(formatWinProbability(null)).toBe('0%');
      expect(formatWinProbability(undefined)).toBe('0%');
    });

    it('getWinProbabilityPct converts probability to number between 0 and 100', () => {
      expect(getWinProbabilityPct(0.65)).toBe(65);
      expect(getWinProbabilityPct(80)).toBe(80);
      expect(getWinProbabilityPct(0)).toBe(0);
      expect(getWinProbabilityPct(null)).toBe(0);
    });

    it('getProbabilityStyle returns correct color configurations', () => {
      const highStyle = getProbabilityStyle(0.85);
      expect(highStyle.bgClass).toContain('emerald');

      const medStyle = getProbabilityStyle(0.55);
      expect(medStyle.bgClass).toContain('amber');

      const lowStyle = getProbabilityStyle(0.25);
      expect(lowStyle.bgClass).toContain('rose');
    });
  });

  describe('Component Rendering & Interaction', () => {
    it('renders deal title, deal value, age in days, and win probability score [FR-002]', () => {
      render(<DealCard deal={sampleDeal} />);

      const card = screen.getByTestId('deal-card-deal-101');
      expect(card).toBeDefined();

      // Check deal title
      const title = screen.getByTestId('deal-title-deal-101');
      expect(title.textContent).toBe('Enterprise Software Expansion');

      // Check deal value
      const valueEl = screen.getByTestId('deal-value-deal-101');
      expect(valueEl.textContent).toContain('$125,000');

      // Check deal age in days
      const ageEl = screen.getByTestId('deal-age-deal-101');
      expect(ageEl.textContent).toContain('14 days');

      // Check win probability score
      const probEl = screen.getByTestId('deal-win-probability-deal-101');
      expect(probEl.textContent).toContain('65%');
    });

    it('renders milestone stage badge when milestone_stage is present', () => {
      render(<DealCard deal={sampleDeal} />);

      const stageBadge = screen.getByTestId('deal-stage-badge-deal-101');
      expect(stageBadge).toBeDefined();
      expect(stageBadge.textContent).toContain('Solution Proposal');
    });

    it('renders action items counter, stakeholders counter, and forecast indicator', () => {
      render(<DealCard deal={sampleDeal} />);

      const actionCounter = screen.getByTestId('deal-action-items-deal-101');
      expect(actionCounter.textContent).toContain('3');

      const stakeholderCounter = screen.getByTestId('deal-stakeholders-deal-101');
      expect(stakeholderCounter.textContent).toContain('2');

      const forecastEl = screen.getByTestId('deal-forecast-deal-101');
      expect(forecastEl).toBeDefined();
      expect(forecastEl.textContent).toContain('Nov 15');
    });

    it('renders escalation alert icon when deal contains an escalated action item', () => {
      const dealWithEscalation: Deal = {
        ...sampleDeal,
        id: 'deal-102',
        action_items: [
          {
            id: 'ai-1',
            deal_id: 'deal-102',
            title: 'Send legal terms',
            assigned_owner_id: 'user-1',
            target_due_date: '2026-10-01T00:00:00Z',
            sla_threshold_hours: 24,
            is_completed: false,
            is_escalated: true,
          },
        ],
      };

      render(<DealCard deal={dealWithEscalation} />);

      const actionCounter = screen.getByTestId('deal-action-items-deal-102');
      expect(actionCounter.textContent).toContain('1');
      expect(actionCounter.className).toContain('text-secondary');
    });

    it('triggers onClick handler when card is clicked or activated via keypress', () => {
      const handleClick = vi.fn();
      render(<DealCard deal={sampleDeal} onClick={handleClick} />);

      const card = screen.getByTestId('deal-card-deal-101');

      // Test click event
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(sampleDeal);

      // Test Enter key down
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(2);

      // Test Space key down
      fireEvent.keyDown(card, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('applies selected and dragging CSS classes correctly', () => {
      render(<DealCard deal={sampleDeal} isSelected={true} isDragging={true} className="custom-card-class" />);

      const card = screen.getByTestId('deal-card-deal-101');
      expect(card.className).toContain('ring-2 ring-primary');
      expect(card.className).toContain('opacity-60 shadow-lg');
      expect(card.className).toContain('custom-card-class');
    });

    it('uses custom data-testid if provided via props', () => {
      render(<DealCard deal={sampleDeal} data-testid="custom-deal-card-id" />);

      const card = screen.getByTestId('custom-deal-card-id');
      expect(card).toBeDefined();
    });
  });
});
