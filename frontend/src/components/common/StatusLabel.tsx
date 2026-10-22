import React from 'react';
import { cn } from '../../lib/utils';

export type StatusVariant =
  | 'active'
  | 'success'
  | 'completed'
  | 'passed'
  | 'online'
  | 'warning'
  | 'pending'
  | 'in_progress'
  | 'in-progress'
  | 'review'
  | 'error'
  | 'alert'
  | 'forbidden'
  | 'failed'
  | 'rejected'
  | 'blocked'
  | 'info'
  | 'draft'
  | 'processing'
  | 'new'
  | 'neutral'
  | 'inactive'
  | 'offline'
  | 'archived'
  | 'disabled'
  | string;

export interface StatusLabelProps {
  /**
   * The status identifier or variant (e.g., 'active', 'pending', 'forbidden', 'error').
   */
  status?: StatusVariant;

  /**
   * Alias for status.
   */
  variant?: StatusVariant;

  /**
   * Custom human-readable label to display visually.
   * If not provided, the status string will be formatted automatically (e.g. 'in_progress' -> 'In Progress').
   */
  label?: string;

  /**
   * Alias for label.
   */
  text?: string;

  /**
   * ARIA label for screen readers.
   * If not provided, defaults to "Status: <label>".
   */
  ariaLabel?: string;

  /**
   * ARIA live region mode for dynamic status updates.
   * Options: 'polite' (default), 'assertive', or 'off'.
   */
  ariaLive?: 'polite' | 'assertive' | 'off';

  /**
   * Badge size variant: 'sm', 'md' (default), or 'lg'.
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether to display the visual status dot indicator. Defaults to true.
   */
  showDot?: boolean;

  /**
   * Custom CSS classes to append or override styles.
   */
  className?: string;

  /**
   * Optional test identifier for testing libraries.
   */
  'data-testid'?: string;
}

export interface StatusStyleConfig {
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  category: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

/**
 * Maps raw status strings to cohesive WCAG 2.1 AA compliant color configurations.
 * Contrast ratios strictly exceed 4.5:1 for normal text.
 */
export function getStatusStyleConfig(status: string): StatusStyleConfig {
  const normalized = (status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

  switch (normalized) {
    case 'active':
    case 'success':
    case 'completed':
    case 'passed':
    case 'online':
    case 'ok':
      return {
        // High contrast green: text #064e3b on bg #d1fae5 (> 11:1 ratio)
        bgClass: 'bg-emerald-100',
        textClass: 'text-emerald-950 font-medium',
        borderClass: 'border-emerald-300',
        dotClass: 'bg-emerald-600',
        category: 'success',
      };

    case 'warning':
    case 'pending':
    case 'in_progress':
    case 'review':
    case 'attention':
      return {
        // High contrast amber: text #451a03 on bg #fef3c7 (> 10:1 ratio)
        bgClass: 'bg-amber-100',
        textClass: 'text-amber-950 font-medium',
        borderClass: 'border-amber-300',
        dotClass: 'bg-amber-600',
        category: 'warning',
      };

    case 'error':
    case 'alert':
    case 'forbidden':
    case 'failed':
    case 'rejected':
    case 'blocked':
    case 'denied':
    case 'unauthorized':
      return {
        // High contrast red: text #450a0a on bg #fee2e2 (> 11:1 ratio)
        bgClass: 'bg-red-100',
        textClass: 'text-red-950 font-medium',
        borderClass: 'border-red-300',
        dotClass: 'bg-red-600',
        category: 'error',
      };

    case 'info':
    case 'draft':
    case 'processing':
    case 'new':
      return {
        // High contrast blue: text #172554 on bg #dbeafe (> 11:1 ratio)
        bgClass: 'bg-blue-100',
        textClass: 'text-blue-950 font-medium',
        borderClass: 'border-blue-300',
        dotClass: 'bg-blue-600',
        category: 'info',
      };

    case 'inactive':
    case 'offline':
    case 'archived':
    case 'disabled':
    case 'neutral':
    default:
      return {
        // High contrast stone/neutral: text #1c1917 on bg #f5f5f4 (> 12:1 ratio)
        bgClass: 'bg-stone-100',
        textClass: 'text-stone-900 font-medium',
        borderClass: 'border-stone-300',
        dotClass: 'bg-stone-500',
        category: 'neutral',
      };
  }
}

/**
 * Format raw status key into human-readable Title Case (e.g. 'in_progress' -> 'In Progress')
 */
export function formatStatusLabel(status: string): string {
  if (!status) return '';
  return status
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * StatusLabel Component
 *
 * A WCAG 2.1 AA compliant status badge featuring explicit ARIA live region support,
 * visual contrast compliance, and screen reader text alternatives.
 */
export const StatusLabel: React.FC<StatusLabelProps> = ({
  status: statusProp,
  variant,
  label,
  text,
  ariaLabel,
  ariaLive = 'polite',
  size = 'md',
  showDot = true,
  className = '',
  'data-testid': testId,
}) => {
  const status = statusProp || variant || 'neutral';
  const displayLabel = label || text || formatStatusLabel(status);
  const computedAriaLabel = ariaLabel || `Status: ${displayLabel}`;
  const styleConfig = getStatusStyleConfig(status);

  // Size styling classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-2',
    lg: 'px-3 py-1.5 text-sm gap-2.5',
  }[size];

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  }[size];

  return (
    <span
      role="status"
      aria-live={ariaLive}
      aria-label={computedAriaLabel}
      data-testid={testId || `status-label-${status}`}
      data-status-category={styleConfig.category}
      className={cn(
        'inline-flex items-center rounded-md border font-sans tracking-wide align-middle select-none',
        styleConfig.bgClass,
        styleConfig.textClass,
        styleConfig.borderClass,
        sizeClasses,
        className
      )}
    >
      {showDot && (
        <span
          aria-hidden="true"
          className={cn('rounded-full flex-shrink-0', styleConfig.dotClass, dotSizeClasses)}
        />
      )}
      <span>{displayLabel}</span>
      <span className="sr-only">{computedAriaLabel}</span>
    </span>
  );
};

export default StatusLabel;
