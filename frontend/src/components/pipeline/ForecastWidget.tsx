'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Calendar,
  TrendingUp,
  AlertCircle,
  Clock,
  RefreshCw,
  History,
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  BarChart3,
  Activity,
  Zap,
} from 'lucide-react';
import {
  DealForecast,
  ForecastStatusCode,
  ForecastEvaluationLog,
  dealsApi,
} from '../../services/deals';
import { StatusLabel } from '../common/StatusLabel';
import { cn } from '../../lib/utils';

export interface ForecastWidgetProps {
  /**
   * Optional deal ID. If provided without initialForecast, the component fetches the forecast.
   */
  dealId?: string;

  /**
   * Optional initial forecast object to display immediately.
   */
  initialForecast?: DealForecast | null;

  /**
   * Optional deal title to display in header.
   */
  dealTitle?: string;

  /**
   * Callback invoked when a forecast recalculation completes.
   */
  onRecalculate?: (updatedForecast: DealForecast) => void;

  /**
   * Whether to enable the calculation history/log drawer. Defaults to true.
   */
  showLogHistory?: boolean;

  /**
   * Compact rendering mode for embedding in small cards or sidebars. Defaults to false.
   */
  compact?: boolean;

  /**
   * Optional auto-refresh interval in milliseconds.
   */
  autoRefreshIntervalMs?: number;

  /**
   * Custom CSS class names to append to the root element.
   */
  className?: string;

  /**
   * Optional test identifier for testing framework targets.
   */
  'data-testid'?: string;
}

/**
 * Formats an ISO date string into a human-readable display date (e.g. "Nov 15, 2026").
 */
export function formatForecastDate(dateStr?: string | null): string {
  if (!dateStr) {
    return 'Insufficient Data';
  }
  const dateObj = new Date(dateStr);
  if (Number.isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculates days remaining or overdue from current date to estimated completion date.
 */
export function formatDaysRemaining(dateStr?: string | null): {
  text: string;
  isPast: boolean;
  days: number | null;
} {
  if (!dateStr) {
    return { text: 'N/A', isPast: false, days: null };
  }
  const targetDate = new Date(dateStr);
  if (Number.isNaN(targetDate.getTime())) {
    return { text: 'N/A', isPast: false, days: null };
  }

  const now = new Date();
  // Normalize time to midnight for clean day differences
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffMs = targetMidnight.getTime() - nowMidnight.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { text: 'Est. Today', isPast: false, days: 0 };
  }
  if (diffDays > 0) {
    return {
      text: diffDays === 1 ? '1 day remaining' : `${diffDays} days remaining`,
      isPast: false,
      days: diffDays,
    };
  }
  const overdueDays = Math.abs(diffDays);
  return {
    text: overdueDays === 1 ? '1 day past est.' : `${overdueDays} days past est.`,
    isPast: true,
    days: diffDays,
  };
}

/**
 * Formats percentage score for display (e.g. 85 -> "85%", 85.4 -> "85.4%").
 */
export function formatConfidenceScore(score?: number | null): string {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return '--';
  }
  const numScore = Number(score);
  if (numScore % 1 === 0) {
    return `${numScore}%`;
  }
  return `${numScore.toFixed(1)}%`;
}

export interface ConfidenceLevelConfig {
  level: 'High' | 'Medium' | 'Low' | 'Unknown';
  colorClass: string;
  bgClass: string;
  borderClass: string;
  progressColor: string;
}

/**
 * Utility to map confidence score percentage to visual style configurations.
 */
export function getConfidenceLevelConfig(score?: number | null): ConfidenceLevelConfig {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return {
      level: 'Unknown',
      colorClass: 'text-slate-600',
      bgClass: 'bg-slate-100',
      borderClass: 'border-slate-200',
      progressColor: 'bg-slate-400',
    };
  }

  const val = Number(score);
  if (val >= 75) {
    return {
      level: 'High',
      colorClass: 'text-emerald-700',
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
      progressColor: 'bg-emerald-500',
    };
  }
  if (val >= 50) {
    return {
      level: 'Medium',
      colorClass: 'text-amber-700',
      bgClass: 'bg-amber-50',
      borderClass: 'border-amber-200',
      progressColor: 'bg-amber-500',
    };
  }
  return {
    level: 'Low',
    colorClass: 'text-rose-700',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    progressColor: 'bg-rose-500',
  };
}

/**
 * Formats calculated_on timestamp into readable relative or absolute time.
 */
export function formatCalculatedOn(timestamp?: string | null): string {
  if (!timestamp) {
    return 'Not yet calculated';
  }
  const dateObj = new Date(timestamp);
  if (Number.isNaN(dateObj.getTime())) {
    return 'Unknown time';
  }

  const now = new Date();
  const diffSec = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffSec < 60) {
    return 'Just now';
  }
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins} ${mins === 1 ? 'min' : 'mins'} ago`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }

  return dateObj.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * ForecastWidget Component
 *
 * Displays AI-driven completion timeline estimation, percentage-based confidence score,
 * status indicator, dynamic recalculation controls, and evaluation history logs.
 *
 * Requirements satisfied: [FR-008, FR-009, NFR-002]
 */
export const ForecastWidget: React.FC<ForecastWidgetProps> = ({
  dealId,
  initialForecast = null,
  dealTitle,
  onRecalculate,
  showLogHistory = true,
  compact = false,
  autoRefreshIntervalMs,
  className = '',
  'data-testid': testId = 'forecast-widget',
}) => {
  const [forecast, setForecast] = useState<DealForecast | null>(initialForecast);
  const [isLoading, setIsLoading] = useState<boolean>(!initialForecast && Boolean(dealId));
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // History log state
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [logs, setLogs] = useState<ForecastEvaluationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Fetch forecast if dealId present and no initialForecast provided
  const fetchForecast = useCallback(async () => {
    if (!dealId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await dealsApi.getDealForecast(dealId);
      setForecast(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch AI forecast');
    } finally {
      setIsLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (!initialForecast && dealId) {
      fetchForecast();
    } else if (initialForecast) {
      setForecast(initialForecast);
    }
  }, [dealId, initialForecast, fetchForecast]);

  // Handle auto-refresh if interval is set
  useEffect(() => {
    if (!autoRefreshIntervalMs || autoRefreshIntervalMs <= 0 || !dealId) return;
    const interval = setInterval(() => {
      fetchForecast();
    }, autoRefreshIntervalMs);
    return () => clearInterval(interval);
  }, [autoRefreshIntervalMs, dealId, fetchForecast]);

  // Recalculate AI Forecast
  const handleRecalculate = async () => {
    if (!dealId || isRecalculating) return;
    setIsRecalculating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    const startTime = performance.now();

    try {
      const updated = await dealsApi.recalculateDealForecast(dealId);
      const durationMs = Math.round(performance.now() - startTime);
      setForecast(updated);
      setSuccessMsg(`Forecast recalculated in ${(durationMs / 1000).toFixed(1)}s`);
      if (onRecalculate) {
        onRecalculate(updated);
      }
      // If history is open, refresh logs
      if (isHistoryOpen) {
        fetchLogs();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to recalculate AI forecast');
    } finally {
      setIsRecalculating(false);
    }
  };

  // Fetch log history
  const fetchLogs = useCallback(async () => {
    if (!dealId) return;
    setIsLoadingLogs(true);
    try {
      const logData = await dealsApi.getForecastEvaluationLogs(dealId, 10);
      setLogs(logData);
    } catch {
      // Non-critical error
    } finally {
      setIsLoadingLogs(false);
    }
  }, [dealId]);

  const toggleHistory = () => {
    if (!isHistoryOpen && logs.length === 0) {
      fetchLogs();
    }
    setIsHistoryOpen((prev) => !prev);
  };

  const statusCode: ForecastStatusCode = forecast?.status_code || 'INSUFFICIENT_DATA';
  const isReady = statusCode === 'READY';
  const isInsufficient = statusCode === 'INSUFFICIENT_DATA';
  const isComputing = statusCode === 'COMPUTING' || isRecalculating;

  const confidenceConfig = getConfidenceLevelConfig(forecast?.confidence_score_pct);
  const daysInfo = formatDaysRemaining(forecast?.estimated_completion_date);
  const formattedDate = formatForecastDate(forecast?.estimated_completion_date);
  const confidenceScoreText = formatConfidenceScore(forecast?.confidence_score_pct);

  if (isLoading) {
    return (
      <div
        data-testid={testId}
        className={cn(
          'rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all',
          className
        )}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600 animate-pulse" />
            <span className="font-semibold text-slate-800 text-sm">AI Completion Forecast</span>
          </div>
        </div>
        <div className="py-8 flex flex-col items-center justify-center text-slate-500 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
          <span className="text-xs font-medium">Fetching AI forecast model...</span>
        </div>
      </div>
    );
  }

  // Compact card view (for embedding inside DealCard or small widget sidebars)
  if (compact) {
    return (
      <div
        data-testid={testId}
        className={cn(
          'rounded-lg border p-3 transition-all',
          isReady
            ? 'bg-amber-50/40 border-amber-200/80'
            : isInsufficient
            ? 'bg-slate-50 border-slate-200'
            : 'bg-blue-50/40 border-blue-200',
          className
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-xs font-semibold text-slate-800">AI Forecast</span>
          </div>
          <StatusLabel
            status={isReady ? 'active' : isInsufficient ? 'neutral' : 'processing'}
            label={isReady ? 'Ready' : isInsufficient ? 'Insufficient Data' : 'Computing'}
            size="sm"
          />
        </div>

        {isReady && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Est. Close:
              </span>
              <span className="font-semibold text-slate-900">{formattedDate}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                Confidence:
              </span>
              <span className={cn('font-bold', confidenceConfig.colorClass)}>
                {confidenceScoreText} ({confidenceConfig.level})
              </span>
            </div>
          </div>
        )}

        {isInsufficient && (
          <p className="text-[11px] text-slate-500 leading-tight">
            Insufficient CRM transition timestamps to calculate completion date.
          </p>
        )}

        {isComputing && (
          <div className="flex items-center gap-2 text-xs text-blue-700 py-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            <span>Evaluating CRM history...</span>
          </div>
        )}
      </div>
    );
  }

  // Full Editorial Widget View
  return (
    <div
      data-testid={testId}
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-sm transition-all overflow-hidden',
        className
      )}
    >
      {/* Widget Header */}
      <div className="bg-gradient-to-r from-amber-50/80 via-white to-slate-50/50 px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-100/70 border border-amber-200 text-amber-800">
            <Sparkles className="h-5 w-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                AI Timeline Completion Forecast
              </h3>
              <StatusLabel
                status={isReady ? 'active' : isInsufficient ? 'neutral' : 'processing'}
                label={isReady ? 'READY' : isInsufficient ? 'INSUFFICIENT DATA' : 'COMPUTING'}
                size="sm"
                data-testid="forecast-status-badge"
              />
            </div>
            {dealTitle && <p className="text-xs text-slate-500 truncate mt-0.5">Deal: {dealTitle}</p>}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {dealId && (
            <button
              type="button"
              onClick={handleRecalculate}
              disabled={isRecalculating}
              data-testid="recalculate-forecast-btn"
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all shadow-xs',
                'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300',
                'focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              title="Trigger AI completion timeline recalculation"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5 text-amber-600', isRecalculating && 'animate-spin')}
              />
              <span>{isRecalculating ? 'Recalculating...' : 'Recalculate'}</span>
            </button>
          )}

          {showLogHistory && dealId && (
            <button
              type="button"
              onClick={toggleHistory}
              data-testid="toggle-log-history-btn"
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all',
                isHistoryOpen
                  ? 'bg-slate-100 text-slate-900 border-slate-300'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              )}
              title="Toggle calculation history logs"
            >
              <History className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">History</span>
              {isHistoryOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Notifications / Banners */}
      {errorMsg && (
        <div
          data-testid="forecast-error-banner"
          className="mx-5 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-600 hover:text-rose-900 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {successMsg && (
        <div
          data-testid="forecast-success-banner"
          className="mx-5 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-900 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Widget Body */}
      <div className="p-5 space-y-5">
        {/* Computing / Recalculating state banner */}
        {isComputing && (
          <div
            data-testid="forecast-computing-banner"
            className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 flex items-start gap-3"
          >
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-xs sm:text-sm text-blue-900">
                AI Timeline Engine Analyzing CRM Data...
              </h4>
              <p className="text-xs text-blue-700 leading-relaxed">
                Evaluating historical stage duration metrics, recent stakeholder interactions, and
                open action item SLAs to project close timeline.
              </p>
            </div>
          </div>
        )}

        {/* Case 1: Forecast READY */}
        {isReady && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: Estimated Completion Date */}
            <div
              data-testid="forecast-date-card"
              className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col justify-between gap-3 transition-all hover:border-amber-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-amber-700" />
                  Estimated Close Date
                </span>
                {daysInfo.days !== null && (
                  <span
                    data-testid="days-remaining-badge"
                    className={cn(
                      'text-[11px] font-medium px-2 py-0.5 rounded-full border',
                      daysInfo.isPast
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : daysInfo.days === 0
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    )}
                  >
                    {daysInfo.text}
                  </span>
                )}
              </div>

              <div>
                <p
                  data-testid="estimated-completion-date-value"
                  className="text-2xl font-bold text-slate-900 tracking-tight"
                >
                  {formattedDate}
                </p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Calculated {formatCalculatedOn(forecast?.calculated_on)}
                </p>
              </div>
            </div>

            {/* Card 2: Percentage Confidence Score & Gauge */}
            <div
              data-testid="forecast-confidence-card"
              className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 flex flex-col justify-between gap-3 transition-all hover:border-amber-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-amber-700" />
                  AI Confidence Score
                </span>
                <span
                  data-testid="confidence-level-badge"
                  className={cn(
                    'text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                    confidenceConfig.bgClass,
                    confidenceConfig.colorClass,
                    confidenceConfig.borderClass
                  )}
                >
                  {confidenceConfig.level} Confidence
                </span>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span
                    data-testid="confidence-score-value"
                    className="text-2xl font-bold text-slate-900 tracking-tight"
                  >
                    {confidenceScoreText}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Target: &gt;75%</span>
                </div>

                {/* Meter Gauge Bar */}
                <div
                  role="meter"
                  aria-label="AI Forecast Confidence Score"
                  aria-valuenow={forecast?.confidence_score_pct ?? 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuetext={`${confidenceScoreText} confidence score`}
                  className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden"
                >
                  <div
                    data-testid="confidence-gauge-bar"
                    className={cn(
                      'h-full transition-all duration-500 rounded-full',
                      confidenceConfig.progressColor
                    )}
                    style={{
                      width: `${Math.min(100, Math.max(0, forecast?.confidence_score_pct ?? 0))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Case 2: INSUFFICIENT DATA State */}
        {isInsufficient && !isComputing && (
          <div
            data-testid="forecast-insufficient-banner"
            className="p-5 rounded-xl border border-amber-200 bg-amber-50/40 text-amber-900 space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <AlertCircle className="h-5 w-5 text-amber-700" />
              </div>
              <div className="space-y-1">
                <h4
                  data-testid="insufficient-data-title"
                  className="font-semibold text-sm text-slate-900 flex items-center gap-2"
                >
                  Insufficient CRM Transition History Data
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The AI forecasting engine requires historical deal milestone stage transition
                  timestamps and CRM activity data to compute a reliable completion timeline and
                  confidence score.
                </p>
              </div>
            </div>

            {/* Empty placeholders / dashes per requirement */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/80 border border-amber-200/60">
                <span className="text-slate-500 font-medium">Estimated Completion Date:</span>
                <span
                  data-testid="insufficient-date-placeholder"
                  className="font-bold text-slate-400"
                >
                  -- (Insufficient Data)
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/80 border border-amber-200/60">
                <span className="text-slate-500 font-medium">Confidence Score:</span>
                <span
                  data-testid="insufficient-score-placeholder"
                  className="font-bold text-slate-400"
                >
                  --%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-slate-500 italic flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                Log stakeholder activities or advance deal stages to build CRM history.
              </p>
              {dealId && (
                <button
                  type="button"
                  onClick={handleRecalculate}
                  disabled={isRecalculating}
                  className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline flex items-center gap-1"
                >
                  Retry AI Calculation
                </button>
              )}
            </div>
          </div>
        )}

        {/* Calculation History / Evaluation Logs Section */}
        {showLogHistory && isHistoryOpen && (
          <div
            data-testid="forecast-log-history-panel"
            className="pt-4 border-t border-slate-100 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-slate-500" />
                AI Forecast Evaluation History
              </h4>
              <span className="text-[11px] text-slate-500">
                Showing last {logs.length} evaluations
              </span>
            </div>

            {isLoadingLogs ? (
              <div className="py-6 flex items-center justify-center text-xs text-slate-500 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                <span>Loading forecast audit logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 text-center text-xs text-slate-500">
                No evaluation logs recorded yet for this deal.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    data-testid={`forecast-log-item-${log.id}`}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600">
                        <Zap className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{log.trigger_event}</p>
                        <p className="text-[11px] text-slate-500">
                          {formatCalculatedOn(log.calculated_on)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <StatusLabel
                        status={
                          log.status_code === 'READY'
                            ? 'active'
                            : log.status_code === 'INSUFFICIENT_DATA'
                            ? 'neutral'
                            : 'processing'
                        }
                        label={log.status_code}
                        size="sm"
                      />
                      <div className="text-right min-w-[100px]">
                        <p className="font-semibold text-slate-900">
                          {log.estimated_completion_date
                            ? formatForecastDate(log.estimated_completion_date)
                            : '--'}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Confidence: {formatConfidenceScore(log.confidence_score_pct)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Widget Footer */}
      <div className="bg-slate-50/80 px-5 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <BarChart3 className="h-3.5 w-3.5 text-slate-400" />
          Powered by CRM Sales Intelligence Model v2.4
        </span>
        {forecast?.calculated_on && (
          <span>Last sync: {formatCalculatedOn(forecast.calculated_on)}</span>
        )}
      </div>
    </div>
  );
};

export default ForecastWidget;
