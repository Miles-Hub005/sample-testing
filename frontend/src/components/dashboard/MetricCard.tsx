'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RotateCw,
  AlertTriangle,
} from 'lucide-react';
import { MetricSchema, MetricStatus, MetricUnit } from '../../services/dashboard';
import { StatusLabel } from '../common/StatusLabel';
import { cn } from '../../lib/utils';

export interface MetricCardProps {
  /**
   * Metric data schema containing value, baseline, status, unit, display name, etc.
   */
  metric: MetricSchema;

  /**
   * Optional callback function triggered when the retry button is clicked on an UNAVAILABLE metric.
   */
  onRetry?: () => void | Promise<void>;

  /**
   * Indicates whether a retry request is currently in-progress.
   */
  isRetrying?: boolean;

  /**
   * Optional callback function triggered when the card is clicked (e.g. for quick-view drilldown).
   */
  onClick?: () => void;

  /**
   * Optional custom CSS class name to append to the card wrapper.
   */
  className?: string;

  /**
   * Optional test identifier for testing libraries.
   */
  'data-testid'?: string;
}

/**
 * Formats a numeric value based on unit if formatted_value is absent.
 */
export function formatFallbackValue(
  value: number | null | undefined,
  unit: MetricUnit,
  status: MetricStatus
): string {
  if (status === 'UNAVAILABLE') {
    return 'Unavailable';
  }

  if (status === 'ZERO' || value === 0) {
    if (unit === 'currency') return '$0';
    if (unit === 'percentage') return '0%';
    return '0';
  }

  if (value === null || value === undefined) {
    return '0';
  }

  switch (unit) {
    case 'currency':
      return `$${value.toLocaleString('en-US', {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      })}`;
    case 'percentage':
      return `${value.toLocaleString('en-US', {
        minimumFractionDigits: value % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 2,
      })}%`;
    case 'count':
    default:
      return value.toLocaleString('en-US');
  }
}

/**
 * Formats baseline value display text.
 */
export function formatBaselineValue(
  baseline: number | null | undefined,
  unit: MetricUnit
): string | null {
  if (baseline === null || baseline === undefined) {
    return null;
  }
  return formatFallbackValue(baseline, unit, 'VALID');
}

/**
 * Computes comparative percentage change if not provided directly in metric schema.
 */
export function getPercentageChange(metric: MetricSchema): number | null {
  if (metric.percentage_change !== null && metric.percentage_change !== undefined) {
    return metric.percentage_change;
  }

  if (
    metric.raw_value !== null &&
    metric.raw_value !== undefined &&
    metric.baseline_value !== null &&
    metric.baseline_value !== undefined &&
    metric.baseline_value !== 0
  ) {
    const diff = metric.raw_value - metric.baseline_value;
    const change = (diff / Math.abs(metric.baseline_value)) * 100;
    return Number(change.toFixed(1));
  }

  return null;
}

/**
 * MetricCard component for rendering active metric values, zero values, or unavailable outage states
 * along with comparative percentage indicators and baseline figures (FR-2, FR-3, FR-4).
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  onRetry,
  isRetrying = false,
  onClick,
  className,
  'data-testid': testId,
}) => {
  const {
    domain,
    metric_key,
    display_name,
    raw_value,
    baseline_value,
    formatted_value,
    status,
    unit,
    error_detail,
  } = metric;

  const cardTestId = testId || `metric-card-${metric_key}`;
  const isUnavailable = status === 'UNAVAILABLE';
  const isZero = status === 'ZERO';

  // Determine main displayed value
  const displayValue = isUnavailable
    ? 'Unavailable'
    : formatted_value && formatted_value.trim() !== ''
    ? formatted_value
    : formatFallbackValue(raw_value, unit, status);

  // Compute percentage change & baseline comparison
  const changeValue = !isUnavailable ? getPercentageChange(metric) : null;
  const baselineFormatted = !isUnavailable ? formatBaselineValue(baseline_value, unit) : null;

  // Format change percentage string and directional indicators
  let changeDirection: 'up' | 'down' | 'neutral' | 'none' = 'none';
  let changeBadgeClass = '';
  let changeText = '';
  let ariaChangeText = '';

  if (changeValue !== null && !isUnavailable) {
    if (changeValue > 0) {
      changeDirection = 'up';
      changeText = `+${changeValue.toFixed(1)}%`;
      ariaChangeText = `${changeValue.toFixed(1)} percent increase relative to baseline`;
      changeBadgeClass = 'text-[#064e3b] bg-[#d1fae5] border-[#a7f3d0]';
    } else if (changeValue < 0) {
      changeDirection = 'down';
      changeText = `${changeValue.toFixed(1)}%`;
      ariaChangeText = `${Math.abs(changeValue).toFixed(1)} percent decrease relative to baseline`;
      changeBadgeClass = 'text-[#93000a] bg-[#ffdad6] border-[#ffb4a7]';
    } else {
      changeDirection = 'neutral';
      changeText = '0.0%';
      ariaChangeText = 'No change relative to baseline';
      changeBadgeClass = 'text-[#4e453d] bg-[#f0eee9] border-[#e4e2dd]';
    }
  }

  // Handle keyboard navigation for interactive cards
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <article
      data-testid={cardTestId}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : 'region'}
      aria-label={`${display_name} metric card: ${displayValue}${
        ariaChangeText ? `, ${ariaChangeText}` : ''
      }`}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      className={cn(
        'relative flex flex-col justify-between p-5 rounded-lg border transition-all duration-200',
        'bg-[#fbf9f4] text-[#1b1c19]',
        onClick ? 'cursor-pointer hover:border-[#735c41] hover:shadow-md focus-visible:outline-2 focus-visible:outline-[#735c41]' : '',
        isUnavailable
          ? 'border-[#ba1a1a]/40 bg-[#ffdad6]/10'
          : isZero
          ? 'border-[#80756b]/40 bg-[#f5f3ee]'
          : 'border-[#e4e2dd] hover:border-[#d1c4b9]',
        className
      )}
    >
      {/* Header Row: Domain/Name & Status Badge */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#80756b] block truncate">
            {domain.replace(/_/g, ' ').toUpperCase()}
          </span>
          <h3 className="text-lg font-serif font-medium text-[#1b1c19] truncate leading-tight mt-0.5">
            {display_name}
          </h3>
        </div>

        <div>
          {isUnavailable ? (
            <StatusLabel
              status="error"
              label="Unavailable"
              size="sm"
              data-testid={`status-badge-unavailable-${metric_key}`}
            />
          ) : isZero ? (
            <StatusLabel
              status="info"
              label="Zero Value"
              size="sm"
              data-testid={`status-badge-zero-${metric_key}`}
            />
          ) : (
            <StatusLabel
              status="success"
              label="Valid"
              size="sm"
              data-testid={`status-badge-valid-${metric_key}`}
            />
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isUnavailable ? (
        /* Outage / Unavailable State */
        <div className="my-2 space-y-3">
          <div className="flex items-center gap-2 text-[#93000a]">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="text-2xl font-serif font-semibold text-[#93000a]">
              Unavailable
            </span>
          </div>

          <p
            className="text-xs text-[#4e453d] line-clamp-2"
            data-testid={`error-detail-${metric_key}`}
          >
            {error_detail || 'Domain service currently unreachable. Unable to fetch baseline or active metric.'}
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onRetry) {
                  onRetry();
                }
              }}
              disabled={isRetrying}
              aria-label={`Retry fetching metric for ${display_name}`}
              data-testid={`retry-button-${metric_key}`}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors',
                'bg-[#735c41] text-[#ffffff] hover:bg-[#59452b] active:bg-[#43331f]',
                'focus-visible:outline-2 focus-visible:outline-[#735c41] focus-visible:outline-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <RotateCw
                className={cn('w-3.5 h-3.5', isRetrying && 'animate-spin')}
                aria-hidden="true"
              />
              <span>{isRetrying ? 'Retrying...' : 'Retry Fetch'}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Valid or Zero Value Metric Display */
        <div className="my-1 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div
              className={cn(
                'text-3xl sm:text-4xl font-serif font-bold tracking-tight',
                isZero ? 'text-[#4e453d]' : 'text-[#1b1c19]'
              )}
              data-testid={`metric-value-${metric_key}`}
            >
              {displayValue}
            </div>

            {/* Comparative Percentage Change Indicator */}
            {changeDirection !== 'none' && (
              <div
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border',
                  changeBadgeClass
                )}
                data-testid={`percentage-indicator-${metric_key}`}
                aria-label={ariaChangeText}
              >
                {changeDirection === 'up' && (
                  <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                )}
                {changeDirection === 'down' && (
                  <TrendingDown className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                )}
                {changeDirection === 'neutral' && (
                  <Minus className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                )}
                <span>{changeText}</span>
              </div>
            )}
          </div>

          {/* Baseline Value Comparison Row */}
          <div className="flex items-center justify-between text-xs text-[#80756b] pt-1 border-t border-[#e4e2dd]/60">
            {baselineFormatted ? (
              <span data-testid={`baseline-value-${metric_key}`}>
                Baseline: <strong className="font-medium text-[#4e453d]">{baselineFormatted}</strong>
              </span>
            ) : (
              <span>No baseline record</span>
            )}

            {isZero && (
              <span className="text-[#80756b] italic" data-testid={`zero-indicator-${metric_key}`}>
                Active zero count
              </span>
            )}
          </div>
        </div>
      )}
    </article>
  );
};

export default MetricCard;
