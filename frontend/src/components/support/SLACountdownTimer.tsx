'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

// ============================================================================
// Types & Interfaces [FR-4, FR-5, NFR-1, NFR-4]
// ============================================================================

export type SLATimerVariant = 'card' | 'badge' | 'inline';
export type SLATimerSize = 'sm' | 'md' | 'lg';
export type SLATimerCategory = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface SLACountdownTimerProps {
  /**
   * Target due date for the SLA calculation (ISO string or Date object).
   */
  targetDueAt?: string | Date | null;

  /**
   * Target type identifier ('first_response', 'resolution', or custom).
   */
  targetType?: 'first_response' | 'resolution' | string;

  /**
   * Ticket priority level ('P1', 'P2', 'P3').
   */
  priority?: string;

  /**
   * Current ticket status ('open', 'pending', 'resolved', 'closed').
   */
  status?: string;

  /**
   * Explicit flag indicating whether the SLA target was fulfilled/completed.
   */
  isCompleted?: boolean;

  /**
   * Timestamp when target was fulfilled (e.g. first_responded_at or resolved_at).
   */
  completedAt?: string | Date | null;

  /**
   * Explicit breach flag from backend models or service.
   */
  isBreached?: boolean;

  /**
   * Timestamp when breached.
   */
  breachedAt?: string | Date | null;

  /**
   * Timestamp when proactive warning notification was sent.
   */
  warningSentAt?: string | Date | null;

  /**
   * Threshold in minutes before target due date to trigger warning state (default: 15 mins).
   */
  warningThresholdMinutes?: number;

  /**
   * Timer refresh interval in milliseconds for real-time sub-second accuracy (default: 100ms).
   */
  updateIntervalMs?: number;

  /**
   * Whether to display deciseconds / sub-second precision (default: true).
   */
  showSubSecond?: boolean;

  /**
   * Callback invoked when the countdown transitions into warning state.
   */
  onWarning?: () => void;

  /**
   * Callback invoked when the countdown transitions into breached state.
   */
  onBreach?: () => void;

  /**
   * Visual component layout variant ('card', 'badge', 'inline'). Default: 'card'.
   */
  variant?: SLATimerVariant;

  /**
   * Visual size variant ('sm', 'md', 'lg'). Default: 'md'.
   */
  size?: SLATimerSize;

  /**
   * Custom CSS class names to append to root element.
   */
  className?: string;

  /**
   * Test identifier attribute for automated integration testing.
   */
  'data-testid'?: string;
}

export interface SLADisplayState {
  diffMs: number;
  totalSeconds: number;
  isBreached: boolean;
  isWarning: boolean;
  isCompleted: boolean;
  hours: number;
  minutes: number;
  seconds: number;
  deciseconds: number;
  formattedTime: string;
  statusLabel: string;
  category: SLATimerCategory;
}

// ============================================================================
// Calculation & Formatting Helpers [FR-4, FR-5, NFR-1]
// ============================================================================

function padZero(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

/**
 * Formats SLA target type into human readable title string.
 */
export function formatSLATargetLabel(targetType?: string): string {
  if (!targetType) return 'SLA Target';
  const clean = targetType.trim().toLowerCase();
  if (clean === 'first_response') return 'First Response SLA';
  if (clean === 'resolution') return 'Resolution SLA';
  return targetType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Pure calculation function that determines current SLA display state,
 * sub-second time breakdowns, category, and formatted text strings.
 */
export function calculateSLADisplayState({
  targetDueAt,
  status,
  isCompleted: explicitCompleted,
  completedAt,
  isBreached: explicitBreached,
  breachedAt,
  warningSentAt,
  warningThresholdMinutes = 15,
  showSubSecond = true,
  now = new Date(),
}: {
  targetDueAt?: string | Date | null;
  status?: string;
  isCompleted?: boolean;
  completedAt?: string | Date | null;
  isBreached?: boolean;
  breachedAt?: string | Date | null;
  warningSentAt?: string | Date | null;
  warningThresholdMinutes?: number;
  showSubSecond?: boolean;
  now?: Date;
}): SLADisplayState {
  const normStatus = (status || '').trim().toLowerCase();
  const isStatusCompleted = normStatus === 'resolved' || normStatus === 'closed';
  const isCompleted = Boolean(explicitCompleted || completedAt || isStatusCompleted);

  if (isCompleted) {
    return {
      diffMs: 0,
      totalSeconds: 0,
      isBreached: false,
      isWarning: false,
      isCompleted: true,
      hours: 0,
      minutes: 0,
      seconds: 0,
      deciseconds: 0,
      formattedTime: 'Met',
      statusLabel: 'SLA Met',
      category: 'success',
    };
  }

  if (!targetDueAt) {
    return {
      diffMs: 0,
      totalSeconds: 0,
      isBreached: false,
      isWarning: false,
      isCompleted: false,
      hours: 0,
      minutes: 0,
      seconds: 0,
      deciseconds: 0,
      formattedTime: 'N/A',
      statusLabel: 'No Target Set',
      category: 'neutral',
    };
  }

  const dueDate = targetDueAt instanceof Date ? targetDueAt : new Date(targetDueAt);
  if (isNaN(dueDate.getTime())) {
    return {
      diffMs: 0,
      totalSeconds: 0,
      isBreached: false,
      isWarning: false,
      isCompleted: false,
      hours: 0,
      minutes: 0,
      seconds: 0,
      deciseconds: 0,
      formattedTime: 'Invalid Date',
      statusLabel: 'Invalid Target',
      category: 'neutral',
    };
  }

  const diffMs = dueDate.getTime() - now.getTime();
  const warningThresholdMs = warningThresholdMinutes * 60 * 1000;
  const isOverdue = diffMs <= 0;
  const isBreached = Boolean(explicitBreached || breachedAt || isOverdue);
  const isWarning =
    !isBreached && Boolean(warningSentAt || (diffMs > 0 && diffMs <= warningThresholdMs));

  const absMs = Math.abs(diffMs);
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(absMs / 3600000);
  const minutes = Math.floor((absMs % 3600000) / 60000);
  const seconds = Math.floor((absMs % 60000) / 1000);
  const deciseconds = Math.floor((absMs % 1000) / 100);

  const decStr = showSubSecond ? `.${deciseconds}` : '';
  let formattedTime = '';

  if (isBreached) {
    const timeStr =
      hours > 0
        ? `${hours}h ${padZero(minutes)}m ${padZero(seconds)}${decStr}s`
        : `${minutes}m ${padZero(seconds)}${decStr}s`;
    formattedTime = `Breached by ${timeStr}`;
  } else {
    formattedTime =
      hours > 0
        ? `${hours}h ${padZero(minutes)}m ${padZero(seconds)}${decStr}s`
        : `${minutes}m ${padZero(seconds)}${decStr}s`;
  }

  let category: SLATimerCategory = 'info';
  let statusLabel = 'SLA On Track';

  if (isBreached) {
    category = 'error';
    statusLabel = 'SLA Breached';
  } else if (isWarning) {
    category = 'warning';
    statusLabel = 'SLA Warning';
  }

  return {
    diffMs,
    totalSeconds,
    isBreached,
    isWarning,
    isCompleted: false,
    hours,
    minutes,
    seconds,
    deciseconds,
    formattedTime,
    statusLabel,
    category,
  };
}

// ============================================================================
// Component Implementation [FR-4, FR-5, NFR-1, NFR-4]
// ============================================================================

export const SLACountdownTimer: React.FC<SLACountdownTimerProps> = ({
  targetDueAt,
  targetType = 'first_response',
  priority,
  status,
  isCompleted,
  completedAt,
  isBreached,
  breachedAt,
  warningSentAt,
  warningThresholdMinutes = 15,
  updateIntervalMs = 100,
  showSubSecond = true,
  onWarning,
  onBreach,
  variant = 'card',
  size = 'md',
  className,
  'data-testid': testId,
}) => {
  const [now, setNow] = useState<Date>(() => new Date());

  const hasFiredWarningRef = useRef<boolean>(false);
  const hasFiredBreachRef = useRef<boolean>(false);

  // Real-time sub-second update ticker loop [NFR-1]
  useEffect(() => {
    let isMounted = true;
    const intervalId = setInterval(() => {
      if (isMounted) {
        setNow(new Date());
      }
    }, updateIntervalMs);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [updateIntervalMs]);

  // Derive current SLA countdown state
  const state = calculateSLADisplayState({
    targetDueAt,
    status,
    isCompleted,
    completedAt,
    isBreached,
    breachedAt,
    warningSentAt,
    warningThresholdMinutes,
    showSubSecond,
    now,
  });

  // Handle proactive breach and warning callbacks [FR-5]
  useEffect(() => {
    if (state.isWarning && !hasFiredWarningRef.current) {
      hasFiredWarningRef.current = true;
      if (onWarning) {
        onWarning();
      }
    }

    if (state.isBreached && !hasFiredBreachRef.current) {
      hasFiredBreachRef.current = true;
      if (onBreach) {
        onBreach();
      }
    }
  }, [state.isWarning, state.isBreached, onWarning, onBreach]);

  const targetTitle = formatSLATargetLabel(targetType);

  // Category style mapping
  const categoryStyles: Record<
    SLATimerCategory,
    {
      bg: string;
      border: string;
      text: string;
      badgeBg: string;
      badgeText: string;
      dot: string;
    }
  > = {
    success: {
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200',
      text: 'text-emerald-950',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-900',
      dot: 'bg-emerald-600',
    },
    warning: {
      bg: 'bg-amber-50/80',
      border: 'border-amber-300',
      text: 'text-amber-950',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-900',
      dot: 'bg-amber-600',
    },
    error: {
      bg: 'bg-rose-50/80',
      border: 'border-rose-300',
      text: 'text-rose-950',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-900',
      dot: 'bg-rose-600',
    },
    info: {
      bg: 'bg-sky-50/70',
      border: 'border-sky-200',
      text: 'text-sky-950',
      badgeBg: 'bg-sky-100',
      badgeText: 'text-sky-900',
      dot: 'bg-sky-600',
    },
    neutral: {
      bg: 'bg-surface-container',
      border: 'border-outline-variant',
      text: 'text-on-surface-variant',
      badgeBg: 'bg-surface-container-high',
      badgeText: 'text-on-surface',
      dot: 'bg-outline',
    },
  };

  const currentStyles = categoryStyles[state.category];

  // Size specific typography and padding
  const sizeStyles = {
    sm: {
      padding: 'p-2 sm:p-2.5',
      titleText: 'text-xs font-medium',
      timeText: 'text-sm font-semibold tracking-tight',
      iconSize: 'w-3.5 h-3.5',
      badgeText: 'text-[11px] px-1.5 py-0.5',
    },
    md: {
      padding: 'p-3.5 sm:p-4',
      titleText: 'text-xs uppercase tracking-wider font-semibold',
      timeText: 'text-lg sm:text-xl font-bold tracking-tight',
      iconSize: 'w-4 h-4',
      badgeText: 'text-xs px-2 py-0.5',
    },
    lg: {
      padding: 'p-5 sm:p-6',
      titleText: 'text-sm uppercase tracking-wider font-semibold',
      timeText: 'text-2xl sm:text-3xl font-extrabold tracking-tight',
      iconSize: 'w-5 h-5',
      badgeText: 'text-xs font-semibold px-2.5 py-1',
    },
  }[size];

  // Accessible screen reader announcement
  const ariaAnnouncement = `${targetTitle}: ${state.formattedTime}. Status: ${state.statusLabel}${
    priority ? `, Priority: ${priority}` : ''
  }.`;

  // Render Category Icon
  const renderIcon = () => {
    if (state.isCompleted) {
      return (
        <CheckCircle2
          className={cn(sizeStyles.iconSize, 'text-emerald-700')}
          aria-hidden="true"
        />
      );
    }
    if (state.isBreached) {
      return (
        <AlertCircle
          className={cn(sizeStyles.iconSize, 'text-rose-700 animate-pulse')}
          aria-hidden="true"
        />
      );
    }
    if (state.isWarning) {
      return (
        <AlertTriangle
          className={cn(sizeStyles.iconSize, 'text-amber-700 animate-pulse')}
          aria-hidden="true"
        />
      );
    }
    return (
      <Clock className={cn(sizeStyles.iconSize, 'text-sky-700')} aria-hidden="true" />
    );
  };

  // 1. Badge Variant
  if (variant === 'badge') {
    return (
      <div
        role="timer"
        aria-live="polite"
        aria-label={ariaAnnouncement}
        data-testid={testId || 'sla-countdown-badge'}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors',
          currentStyles.badgeBg,
          currentStyles.border,
          currentStyles.badgeText,
          sizeStyles.badgeText,
          className
        )}
      >
        {renderIcon()}
        <span>{state.formattedTime}</span>
      </div>
    );
  }

  // 2. Inline Variant
  if (variant === 'inline') {
    return (
      <div
        role="timer"
        aria-live="polite"
        aria-label={ariaAnnouncement}
        data-testid={testId || 'sla-countdown-inline'}
        className={cn(
          'inline-flex items-center gap-2 font-sans',
          currentStyles.text,
          className
        )}
      >
        {renderIcon()}
        <span className="font-semibold">{targetTitle}:</span>
        <span className="font-mono font-bold">{state.formattedTime}</span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
            currentStyles.badgeBg,
            currentStyles.border,
            currentStyles.badgeText
          )}
        >
          <span
            className={cn('h-1.5 w-1.5 rounded-full', currentStyles.dot)}
            aria-hidden="true"
          />
          {state.statusLabel}
        </span>
      </div>
    );
  }

  // 3. Card Variant (Default)
  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={ariaAnnouncement}
      data-testid={testId || 'sla-countdown-card'}
      className={cn(
        'relative rounded-lg border shadow-sm transition-all duration-200',
        currentStyles.bg,
        currentStyles.border,
        sizeStyles.padding,
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {renderIcon()}
          <span className={cn(sizeStyles.titleText, currentStyles.text)}>
            {targetTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {priority && (
            <span
              className={cn(
                'rounded border border-outline-variant bg-surface-container-lowest px-1.5 py-0.5 text-[10px] font-bold text-on-surface-variant'
              )}
            >
              {priority.toUpperCase()}
            </span>
          )}

          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border font-medium',
              currentStyles.badgeBg,
              currentStyles.border,
              currentStyles.badgeText,
              sizeStyles.badgeText
            )}
          >
            <span
              className={cn('h-1.5 w-1.5 rounded-full', currentStyles.dot)}
              aria-hidden="true"
            />
            {state.statusLabel}
          </span>
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div
          className={cn(
            'font-mono font-bold tracking-tight',
            sizeStyles.timeText,
            currentStyles.text
          )}
        >
          {state.formattedTime}
        </div>

        {targetDueAt && !state.isCompleted && (
          <div className="text-[11px] text-on-surface-variant/80 font-sans">
            Target Due:{' '}
            {new Date(targetDueAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SLACountdownTimer;
