'use client';

import React from 'react';
import {
  DollarSign,
  Clock,
  TrendingUp,
  CheckSquare,
  Users,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Deal } from '../../services/deals';
import { StatusLabel } from '../common/StatusLabel';
import { cn } from '../../lib/utils';

export interface DealCardProps {
  /**
   * The deal object containing title, deal_value, win_probability, age_in_days, etc.
   */
  deal: Deal;

  /**
   * Optional click callback when user interacts with the card.
   */
  onClick?: (deal: Deal) => void;

  /**
   * Optional stage change callback.
   */
  onStageChange?: (deal: Deal, newStage: string) => void;

  /**
   * Whether the card is visually selected in the pipeline board.
   */
  isSelected?: boolean;

  /**
   * Whether the card is currently being dragged.
   */
  isDragging?: boolean;

  /**
   * Custom CSS class names to append to the wrapper.
   */
  className?: string;

  /**
   * Optional test identifier for testing libraries.
   */
  'data-testid'?: string;
}

/**
 * Formats a numeric deal value as USD currency string.
 * Example: 120000 -> "$120,000", 120000.5 -> "$120,000.50", 0 -> "$0"
 */
export function formatDealValue(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '$0';
  }
  const numericVal = Number(value);
  if (numericVal === 0) {
    return '$0';
  }
  return `$${numericVal.toLocaleString('en-US', {
    minimumFractionDigits: numericVal % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats the deal age in days into a human-readable string.
 * Uses age_in_days if present, otherwise calculates from created_on date.
 * Example: 12 -> "12 days", 1 -> "1 day", 0 -> "0 days"
 */
export function formatAgeInDays(
  ageInDays?: number | null,
  createdOn?: string | null
): string {
  if (
    ageInDays !== undefined &&
    ageInDays !== null &&
    !Number.isNaN(Number(ageInDays))
  ) {
    const days = Math.max(0, Math.floor(Number(ageInDays)));
    return days === 1 ? '1 day' : `${days} days`;
  }

  if (createdOn) {
    const createdDate = new Date(createdOn);
    if (!Number.isNaN(createdDate.getTime())) {
      const now = new Date();
      const diffMs = now.getTime() - createdDate.getTime();
      const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      return days === 1 ? '1 day' : `${days} days`;
    }
  }

  return '0 days';
}

/**
 * Formats win probability score as a percentage string (0% - 100%).
 * Accepts probabilities in either decimal (0.0 - 1.0) or percentage (0 - 100) range.
 * Example: 0.6 -> "60%", 65 -> "65%", 0 -> "0%"
 */
export function formatWinProbability(probability?: number | null): string {
  if (
    probability === undefined ||
    probability === null ||
    Number.isNaN(Number(probability))
  ) {
    return '0%';
  }
  const numericProb = Number(probability);
  if (numericProb <= 0) {
    return '0%';
  }
  if (numericProb <= 1.0) {
    return `${Math.round(numericProb * 100)}%`;
  }
  return `${Math.round(Math.min(100, numericProb))}%`;
}

/**
 * Returns probability percentage as a number between 0 and 100.
 */
export function getWinProbabilityPct(probability?: number | null): number {
  if (
    probability === undefined ||
    probability === null ||
    Number.isNaN(Number(probability))
  ) {
    return 0;
  }
  const numericProb = Number(probability);
  if (numericProb <= 0) return 0;
  if (numericProb <= 1.0) return Math.round(numericProb * 100);
  return Math.round(Math.min(100, numericProb));
}

/**
 * Styling configuration for win probability badges and progress bars.
 */
export interface ProbabilityStyle {
  bgClass: string;
  textClass: string;
  borderClass: string;
  barClass: string;
}

/**
 * Calculates color coding based on win probability score:
 * - High (>= 70%): Emerald / Green
 * - Medium (40% - 69%): Amber / Primary
 * - Low (< 40%): Rose / Neutral
 */
export function getProbabilityStyle(probability?: number | null): ProbabilityStyle {
  const pct = getWinProbabilityPct(probability);

  if (pct >= 70) {
    return {
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-800',
      borderClass: 'border-emerald-200',
      barClass: 'bg-emerald-600',
    };
  } else if (pct >= 40) {
    return {
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-800',
      borderClass: 'border-amber-200',
      barClass: 'bg-amber-600',
    };
  } else {
    return {
      bgClass: 'bg-rose-50',
      textClass: 'text-rose-800',
      borderClass: 'border-rose-200',
      barClass: 'bg-rose-600',
    };
  }
}

/**
 * DealCard component rendering individual deal metrics on the visual pipeline board.
 * Requirements satisfied: [FR-002]
 */
export const DealCard: React.FC<DealCardProps> = ({
  deal,
  onClick,
  onStageChange,
  isSelected = false,
  isDragging = false,
  className,
  'data-testid': testId,
}) => {
  const formattedValue = formatDealValue(deal.deal_value);
  const formattedAge = formatAgeInDays(deal.age_in_days, deal.created_on);
  const formattedWinProb = formatWinProbability(deal.win_probability);
  const winProbPct = getWinProbabilityPct(deal.win_probability);
  const probStyle = getProbabilityStyle(deal.win_probability);

  // Check for escalated action items or urgent indicators
  const hasEscalatedItem = Boolean(
    deal.action_items?.some((item) => item.is_escalated && !item.is_completed)
  );

  const actionCount =
    deal.action_items_count ?? deal.action_items?.length ?? 0;
  const stakeholderCount =
    deal.stakeholders_count ?? deal.stakeholders?.length ?? 0;

  const handleClick = () => {
    if (onClick) {
      onClick(deal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick(deal);
    }
  };

  const testIdentifier = testId || `deal-card-${deal.id}`;

  return (
    <div
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid={testIdentifier}
      aria-label={`Deal: ${deal.title}, Value: ${formattedValue}, Win probability: ${formattedWinProb}, Age: ${formattedAge}`}
      className={cn(
        'group relative flex flex-col justify-between p-4 rounded-md border text-on-surface bg-surface-container-lowest transition-all duration-200 cursor-pointer select-none',
        'hover:shadow-md hover:border-outline hover:bg-white',
        isSelected ? 'ring-2 ring-primary border-primary bg-white' : 'border-outline-variant/60',
        isDragging ? 'opacity-60 shadow-lg cursor-grabbing scale-[1.02]' : '',
        className
      )}
    >
      {/* Header: Title and optional stage badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3
          data-testid={`deal-title-${deal.id}`}
          className="font-medium text-base text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug"
        >
          {deal.title}
        </h3>
        {deal.milestone_stage && (
          <div className="shrink-0">
            <StatusLabel
              status={deal.milestone_stage}
              size="sm"
              showDot={false}
              data-testid={`deal-stage-badge-${deal.id}`}
            />
          </div>
        )}
      </div>

      {/* Primary Metrics Grid: Deal Value, Age, Win Probability */}
      <div className="grid grid-cols-2 gap-2 mb-3 pt-2 border-t border-outline-variant/30">
        {/* Deal Value */}
        <div
          data-testid={`deal-value-${deal.id}`}
          className="flex flex-col"
          aria-label={`Deal Value: ${formattedValue}`}
        >
          <span className="text-xs font-medium uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            Value
          </span>
          <span className="text-lg font-semibold text-primary mt-0.5">
            {formattedValue}
          </span>
        </div>

        {/* Deal Age */}
        <div
          data-testid={`deal-age-${deal.id}`}
          className="flex flex-col"
          aria-label={`Deal Age: ${formattedAge}`}
        >
          <span className="text-xs font-medium uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-outline" aria-hidden="true" />
            Age
          </span>
          <span className="text-sm font-medium text-on-surface mt-0.5">
            {formattedAge}
          </span>
        </div>
      </div>

      {/* Win Probability Section */}
      <div
        data-testid={`deal-win-probability-${deal.id}`}
        className="mb-3"
        aria-label={`Win Probability: ${formattedWinProb}`}
      >
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-outline" aria-hidden="true" />
            Win Probability
          </span>
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-xs font-semibold border',
              probStyle.bgClass,
              probStyle.textClass,
              probStyle.borderClass
            )}
          >
            {formattedWinProb}
          </span>
        </div>

        {/* Progress Bar Visual Indicator */}
        <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
          <div
            className={cn('h-1.5 rounded-full transition-all duration-300', probStyle.barClass)}
            style={{ width: `${winProbPct}%` }}
            role="progressbar"
            aria-valuenow={winProbPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Win probability progress ${winProbPct}%`}
          />
        </div>
      </div>

      {/* Footer / Action Indicators */}
      {(actionCount > 0 || stakeholderCount > 0 || deal.forecast || hasEscalatedItem) && (
        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs text-on-surface-variant">
          <div className="flex items-center gap-3">
            {/* Action Items Counter */}
            {actionCount > 0 && (
              <span
                data-testid={`deal-action-items-${deal.id}`}
                className={cn(
                  'flex items-center gap-1 font-medium',
                  hasEscalatedItem ? 'text-secondary font-semibold' : 'text-on-surface-variant'
                )}
                title={`${actionCount} Action Items${hasEscalatedItem ? ' (Escalation Alert)' : ''}`}
              >
                {hasEscalatedItem ? (
                  <AlertCircle className="w-3.5 h-3.5 text-secondary animate-pulse" aria-hidden="true" />
                ) : (
                  <CheckSquare className="w-3.5 h-3.5 text-outline" aria-hidden="true" />
                )}
                {actionCount}
              </span>
            )}

            {/* Stakeholders Counter */}
            {stakeholderCount > 0 && (
              <span
                data-testid={`deal-stakeholders-${deal.id}`}
                className="flex items-center gap-1 font-medium text-on-surface-variant"
                title={`${stakeholderCount} Stakeholders mapped`}
              >
                <Users className="w-3.5 h-3.5 text-outline" aria-hidden="true" />
                {stakeholderCount}
              </span>
            )}
          </div>

          {/* AI Forecast Indicator */}
          {deal.forecast && (
            <div
              data-testid={`deal-forecast-${deal.id}`}
              className="flex items-center gap-1"
              title={`AI Forecast Status: ${deal.forecast.status_code}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-tertiary" aria-hidden="true" />
              {deal.forecast.status_code === 'READY' && deal.forecast.estimated_completion_date ? (
                <span className="text-[11px] font-medium text-tertiary">
                  {new Date(deal.forecast.estimated_completion_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-on-surface-variant/80">
                  {deal.forecast.status_code === 'INSUFFICIENT_DATA' ? 'No Forecast' : 'Calculating'}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
