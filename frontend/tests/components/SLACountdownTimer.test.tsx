import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  SLACountdownTimer,
  calculateSLADisplayState,
  formatSLATargetLabel,
} from '../../src/components/support/SLACountdownTimer';

describe('SLACountdownTimer Component & Helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Pure Calculation Helper (calculateSLADisplayState)', () => {
    it('formats SLA target type labels accurately', () => {
      expect(formatSLATargetLabel('first_response')).toBe('First Response SLA');
      expect(formatSLATargetLabel('resolution')).toBe('Resolution SLA');
      expect(formatSLATargetLabel('custom_sla_target')).toBe('Custom Sla Target');
      expect(formatSLATargetLabel(undefined)).toBe('SLA Target');
    });

    it('returns Met state when isCompleted is true or ticket is resolved/closed', () => {
      const state1 = calculateSLADisplayState({ isCompleted: true });
      expect(state1.isCompleted).toBe(true);
      expect(state1.formattedTime).toBe('Met');
      expect(state1.statusLabel).toBe('SLA Met');
      expect(state1.category).toBe('success');

      const state2 = calculateSLADisplayState({ status: 'resolved' });
      expect(state2.isCompleted).toBe(true);
      expect(state2.formattedTime).toBe('Met');
      expect(state2.category).toBe('success');

      const state3 = calculateSLADisplayState({ status: 'closed' });
      expect(state3.isCompleted).toBe(true);
      expect(state3.formattedTime).toBe('Met');
    });

    it('returns N/A state when targetDueAt is absent', () => {
      const state = calculateSLADisplayState({ targetDueAt: null });
      expect(state.formattedTime).toBe('N/A');
      expect(state.statusLabel).toBe('No Target Set');
      expect(state.category).toBe('neutral');
    });

    it('returns Invalid Target state for malformed targetDueAt date strings', () => {
      const state = calculateSLADisplayState({ targetDueAt: 'invalid-date-string' });
      expect(state.formattedTime).toBe('Invalid Date');
      expect(state.statusLabel).toBe('Invalid Target');
      expect(state.category).toBe('neutral');
    });

    it('calculates active countdown time with sub-second accuracy', () => {
      const now = new Date('2026-10-06T10:00:00.000Z');
      const targetDueAt = new Date('2026-10-06T11:15:30.400Z');

      const state = calculateSLADisplayState({
        targetDueAt,
        now,
        warningThresholdMinutes: 10,
        showSubSecond: true,
      });

      expect(state.isBreached).toBe(false);
      expect(state.isWarning).toBe(false);
      expect(state.hours).toBe(1);
      expect(state.minutes).toBe(15);
      expect(state.seconds).toBe(30);
      expect(state.deciseconds).toBe(4);
      expect(state.formattedTime).toBe('1h 15m 30.4s');
      expect(state.statusLabel).toBe('SLA On Track');
      expect(state.category).toBe('info');
    });

    it('identifies warning state when due date falls within threshold window or warningSentAt is set', () => {
      const now = new Date('2026-10-06T10:00:00.000Z');
      const targetDueAt = new Date('2026-10-06T10:08:12.300Z'); // 8 mins away (< 15 mins threshold)

      const state1 = calculateSLADisplayState({
        targetDueAt,
        now,
        warningThresholdMinutes: 15,
      });

      expect(state1.isWarning).toBe(true);
      expect(state1.isBreached).toBe(false);
      expect(state1.statusLabel).toBe('SLA Warning');
      expect(state1.category).toBe('warning');
      expect(state1.formattedTime).toBe('8m 12.3s');

      // warningSentAt forces warning state
      const futureTarget = new Date('2026-10-06T12:00:00.000Z');
      const state2 = calculateSLADisplayState({
        targetDueAt: futureTarget,
        now,
        warningSentAt: '2026-10-06T09:50:00.000Z',
      });
      expect(state2.isWarning).toBe(true);
      expect(state2.statusLabel).toBe('SLA Warning');
      expect(state2.category).toBe('warning');
    });

    it('identifies breached state when due date has passed or explicit breach flag is present', () => {
      const now = new Date('2026-10-06T10:00:00.000Z');
      const overdueTarget = new Date('2026-10-06T09:45:10.200Z'); // 14 mins 49.8s overdue

      const state1 = calculateSLADisplayState({
        targetDueAt: overdueTarget,
        now,
        showSubSecond: true,
      });

      expect(state1.isBreached).toBe(true);
      expect(state1.statusLabel).toBe('SLA Breached');
      expect(state1.category).toBe('error');
      expect(state1.formattedTime).toBe('Breached by 14m 49.8s');

      // Explicit isBreached flag
      const state2 = calculateSLADisplayState({
        targetDueAt: new Date('2026-10-06T10:30:00.000Z'),
        now,
        isBreached: true,
      });
      expect(state2.isBreached).toBe(true);
      expect(state2.category).toBe('error');
    });
  });

  describe('Component Rendering & Variants (SLACountdownTimer)', () => {
    it('renders default card layout with target label, priority badge, and status', () => {
      const now = new Date('2026-10-06T10:00:00.000Z');
      vi.setSystemTime(now);

      const targetDueAt = new Date('2026-10-06T11:30:00.000Z').toISOString();

      render(
        <SLACountdownTimer
          targetDueAt={targetDueAt}
          targetType="first_response"
          priority="P1"
          data-testid="sla-timer-card"
        />
      );

      const card = screen.getByTestId('sla-timer-card');
      expect(card).toBeDefined();
      expect(screen.getByText('First Response SLA')).toBeDefined();
      expect(screen.getByText('P1')).toBeDefined();
      expect(screen.getByText('SLA On Track')).toBeDefined();
      expect(screen.getByText('1h 30m 00.0s')).toBeDefined();
    });

    it('renders badge variant when variant="badge"', () => {
      const now = new Date('2026-10-06T10:00:00.000Z');
      vi.setSystemTime(now);

      const targetDueAt = new Date('2026-10-06T10:05:00.000Z').toISOString();

      render(
        <SLACountdownTimer
          targetDueAt={targetDueAt}
          targetType="resolution"
          variant="badge"
          data-testid="sla-badge"
        />
      );

      const badge = screen.getByTestId('sla-badge');
      expect(badge).toBeDefined();
      expect(badge.textContent).toContain('5m 00.0s');
    });

    it('renders inline variant when variant="inline"', () => {
      const now = new Date('2026-10-06T10:00:00.000Z');
      vi.setSystemTime(now);

      const targetDueAt = new Date('2026-10-06T10:02:00.000Z').toISOString();

      render(
        <SLACountdownTimer
          targetDueAt={targetDueAt}
          targetType="first_response"
          variant="inline"
          data-testid="sla-inline"
        />
      );

      const inline = screen.getByTestId('sla-inline');
      expect(inline).toBeDefined();
      expect(screen.getByText('First Response SLA:')).toBeDefined();
      expect(screen.getByText('2m 00.0s')).toBeDefined();
      expect(screen.getByText('SLA Warning')).toBeDefined();
    });
  });

  describe('Real-time Updates & Callbacks [NFR-1, FR-5]', () => {
    it('updates countdown timer in real-time across sub-second intervals', () => {
      const startTime = new Date('2026-10-06T10:00:00.000Z');
      vi.setSystemTime(startTime);

      const targetDueAt = new Date('2026-10-06T10:00:10.000Z').toISOString(); // 10s initially

      render(
        <SLACountdownTimer
          targetDueAt={targetDueAt}
          updateIntervalMs={100}
          showSubSecond={true}
          data-testid="realtime-timer"
        />
      );

      expect(screen.getByText('10.0s')).toBeDefined();

      // Advance by 500ms
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByText('9.5s')).toBeDefined();

      // Advance by 1200ms
      act(() => {
        vi.advanceTimersByTime(1200);
      });

      expect(screen.getByText('8.3s')).toBeDefined();
    });

    it('triggers onWarning and onBreach callbacks when timer thresholds cross', () => {
      const onWarning = vi.fn();
      const onBreach = vi.fn();

      const startTime = new Date('2026-10-06T10:00:00.000Z');
      vi.setSystemTime(startTime);

      // Target due in 16 minutes (warning threshold set at 15 minutes)
      const targetDueAt = new Date('2026-10-06T10:16:00.000Z').toISOString();

      render(
        <SLACountdownTimer
          targetDueAt={targetDueAt}
          warningThresholdMinutes={15}
          updateIntervalMs={100}
          onWarning={onWarning}
          onBreach={onBreach}
        />
      );

      expect(onWarning).not.toHaveBeenCalled();
      expect(onBreach).not.toHaveBeenCalled();

      // Advance by 2 minutes (now 14 mins remaining < 15 mins threshold)
      act(() => {
        vi.advanceTimersByTime(2 * 60 * 1000);
      });

      expect(onWarning).toHaveBeenCalledTimes(1);
      expect(onBreach).not.toHaveBeenCalled();

      // Advance by 15 minutes (now past due)
      act(() => {
        vi.advanceTimersByTime(15 * 60 * 1000);
      });

      expect(onBreach).toHaveBeenCalledTimes(1);
    });
  });

  describe('WCAG 2.1 AA Accessibility & ARIA Support', () => {
    it('sets role="timer" and aria-live="polite" with descriptive aria-label', () => {
      const now = new Date('2026-10-06T10:00:00.000Z');
      vi.setSystemTime(now);

      const targetDueAt = new Date('2026-10-06T10:20:00.000Z').toISOString();

      render(
        <SLACountdownTimer
          targetDueAt={targetDueAt}
          targetType="first_response"
          priority="P2"
          data-testid="accessible-timer"
        />
      );

      const timerElement = screen.getByRole('timer');
      expect(timerElement.getAttribute('aria-live')).toBe('polite');
      expect(timerElement.getAttribute('aria-label')).toBe(
        'First Response SLA: 20m 00.0s. Status: SLA On Track, Priority: P2.'
      );
    });

    it('hides decorative visual status icons from screen readers using aria-hidden="true"', () => {
      const { container } = render(
        <SLACountdownTimer
          targetDueAt={new Date('2026-10-06T11:00:00.000Z').toISOString()}
        />
      );

      const icon = container.querySelector('svg');
      expect(icon).not.toBeNull();
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
