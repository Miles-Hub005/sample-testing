'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  BarChart2,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  MoveRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Deal } from '../../services/deals';
import { DealCard, formatDealValue } from './DealCard';
import { cn } from '../../lib/utils';

/**
 * Standard default milestone progression stages in the sales pipeline board.
 */
export const DEFAULT_PIPELINE_STAGES: string[] = [
  'Qualification',
  'Discovery',
  'Solution Proposal',
  'Contract Negotiation',
  'Closed Won',
  'Closed Lost',
];

/**
 * Visual styling configuration for stage column headers, badges, and drop zones.
 */
export interface StageStyleConfig {
  headerBorderTop: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotBg: string;
  dropHighlightBg: string;
}

/**
 * Determines stage color styling based on normalized milestone stage name.
 */
export function getStageStyle(stage: string): StageStyleConfig {
  const normalized = stage.toLowerCase().trim();

  if (normalized.includes('qualif')) {
    return {
      headerBorderTop: 'border-t-blue-500',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-blue-800',
      badgeBorder: 'border-blue-200',
      dotBg: 'bg-blue-500',
      dropHighlightBg: 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/30',
    };
  }

  if (normalized.includes('discover')) {
    return {
      headerBorderTop: 'border-t-indigo-500',
      badgeBg: 'bg-indigo-50',
      badgeText: 'text-indigo-800',
      badgeBorder: 'border-indigo-200',
      dotBg: 'bg-indigo-500',
      dropHighlightBg: 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-400/30',
    };
  }

  if (normalized.includes('proposal') || normalized.includes('solution')) {
    return {
      headerBorderTop: 'border-t-amber-500',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-200',
      dotBg: 'bg-amber-500',
      dropHighlightBg: 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/30',
    };
  }

  if (normalized.includes('negotia') || normalized.includes('contract')) {
    return {
      headerBorderTop: 'border-t-purple-500',
      badgeBg: 'bg-purple-50',
      badgeText: 'text-purple-800',
      badgeBorder: 'border-purple-200',
      dotBg: 'bg-purple-500',
      dropHighlightBg: 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-400/30',
    };
  }

  if (normalized.includes('won')) {
    return {
      headerBorderTop: 'border-t-emerald-500',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-800',
      badgeBorder: 'border-emerald-200',
      dotBg: 'bg-emerald-500',
      dropHighlightBg: 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/30',
    };
  }

  if (normalized.includes('lost')) {
    return {
      headerBorderTop: 'border-t-rose-500',
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-800',
      badgeBorder: 'border-rose-200',
      dotBg: 'bg-rose-500',
      dropHighlightBg: 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-400/30',
    };
  }

  return {
    headerBorderTop: 'border-t-slate-500',
    badgeBg: 'bg-slate-50',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-200',
    dotBg: 'bg-slate-500',
    dropHighlightBg: 'bg-slate-50/70 border-slate-400 ring-2 ring-slate-400/30',
  };
}

/**
 * Toast notification object structure for inline user feedback.
 */
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

/**
 * Props accepted by the interactive Visual Board component.
 */
export interface BoardProps {
  /**
   * List of deal objects to display across stage columns.
   */
  deals?: Deal[];

  /**
   * List of milestone stage columns to render.
   * Defaults to DEFAULT_PIPELINE_STAGES.
   */
  stages?: string[];

  /**
   * Whether the board is in a loading state.
   * When true, renders skeleton column placeholders.
   */
  isLoading?: boolean;

  /**
   * Callback invoked when a deal is moved to a new milestone stage.
   * Supports async execution. If the promise rejects, stage changes revert.
   */
  onStageChange?: (dealId: string, newStage: string) => Promise<void> | void;

  /**
   * Callback invoked when a deal card is selected/clicked.
   */
  onDealSelect?: (deal: Deal) => void;

  /**
   * Callback invoked when the user clicks to create a new deal in a specific stage.
   */
  onAddDeal?: (stage?: string) => void;

  /**
   * ID of the currently selected deal for visual highlight.
   */
  selectedDealId?: string | null;

  /**
   * Custom CSS class names to apply to the root container.
   */
  className?: string;

  /**
   * Optional test identifier for testing framework automation.
   */
  'data-testid'?: string;
}

/**
 * Visual interactive Board component rendering milestone columns with drag-and-drop
 * stage transitions, optimistic UI updates, and accessibility features [FR-001, FR-003, NFR-001].
 */
export const Board: React.FC<BoardProps> = ({
  deals = [],
  stages: customStages,
  isLoading = false,
  onStageChange,
  onDealSelect,
  onAddDeal,
  selectedDealId = null,
  className,
  'data-testid': testId = 'pipeline-board',
}) => {
  // Local deals state for optimistic UI updates during drag-and-drop operations
  const [localDeals, setLocalDeals] = useState<Deal[]>(deals);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [activeStageSelectorDealId, setActiveStageSelectorDealId] = useState<string | null>(null);

  // Synchronize local state whenever prop deals change externally
  useEffect(() => {
    setLocalDeals(deals);
  }, [deals]);

  // Dismiss toast automatically after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Determine active milestone columns list
  const activeStages = useMemo(() => {
    if (customStages && customStages.length > 0) {
      return customStages;
    }
    // Check if localDeals contain any custom stages not in DEFAULT_PIPELINE_STAGES
    const extraStages = new Set<string>();
    localDeals.forEach((d) => {
      if (d.milestone_stage && !DEFAULT_PIPELINE_STAGES.includes(d.milestone_stage)) {
        extraStages.add(d.milestone_stage);
      }
    });

    if (extraStages.size === 0) {
      return DEFAULT_PIPELINE_STAGES;
    }

    return [...DEFAULT_PIPELINE_STAGES, ...Array.from(extraStages)];
  }, [customStages, localDeals]);

  // Filter deals based on search query
  const filteredDeals = useMemo(() => {
    if (!searchQuery.trim()) {
      return localDeals;
    }
    const query = searchQuery.toLowerCase().trim();
    return localDeals.filter(
      (deal) =>
        deal.title.toLowerCase().includes(query) ||
        deal.id.toLowerCase().includes(query) ||
        deal.milestone_stage.toLowerCase().includes(query)
    );
  }, [localDeals, searchQuery]);

  // Pipeline summary statistics
  const summaryStats = useMemo(() => {
    const totalCount = filteredDeals.length;
    const totalValue = filteredDeals.reduce((acc, d) => acc + (d.deal_value || 0), 0);
    const avgWinProb =
      totalCount > 0
        ? Math.round(
            (filteredDeals.reduce((acc, d) => {
              const prob = d.win_probability ?? 0;
              return acc + (prob <= 1.0 ? prob * 100 : prob);
            }, 0) /
              totalCount)
          )
        : 0;

    const wonCount = filteredDeals.filter((d) =>
      d.milestone_stage.toLowerCase().includes('won')
    ).length;

    return { totalCount, totalValue, avgWinProb, wonCount };
  }, [filteredDeals]);

  /**
   * Move a deal to a new target milestone stage with optimistic UI updates and error recovery [FR-003, NFR-001].
   */
  const handleMoveDeal = useCallback(
    async (dealId: string, newStage: string) => {
      const dealToMove = localDeals.find((d) => d.id === dealId);
      if (!dealToMove) return;
      if (dealToMove.milestone_stage === newStage) return;

      const previousStage = dealToMove.milestone_stage;

      // Optimistic UI update: immediately move deal to new stage (< 10ms)
      setLocalDeals((prev) =>
        prev.map((d) =>
          d.id === dealId
            ? {
                ...d,
                milestone_stage: newStage,
                updated_on: new Date().toISOString(),
              }
            : d
        )
      );

      // Close open stage dropdown selector if any
      setActiveStageSelectorDealId(null);

      // Execute backend stage transition call
      if (onStageChange) {
        try {
          await onStageChange(dealId, newStage);
          setToast({
            id: Date.now().toString(),
            type: 'success',
            message: `Updated "${dealToMove.title}" to ${newStage}`,
          });
        } catch (err: any) {
          // Revert optimistic change on API failure
          setLocalDeals((prev) =>
            prev.map((d) =>
              d.id === dealId
                ? {
                    ...d,
                    milestone_stage: previousStage,
                  }
                : d
            )
          );

          const errorMessage =
            err?.message || 'Failed to update deal stage. Reverting changes.';
          setToast({
            id: Date.now().toString(),
            type: 'error',
            message: errorMessage,
          });
        }
      } else {
        setToast({
          id: Date.now().toString(),
          type: 'success',
          message: `Moved "${dealToMove.title}" to ${newStage}`,
        });
      }
    },
    [localDeals, onStageChange]
  );

  // Drag and Drop Event Handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, deal: Deal) => {
      e.dataTransfer.setData('text/plain', deal.id);
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          dealId: deal.id,
          currentStage: deal.milestone_stage,
        })
      );
      e.dataTransfer.effectAllowed = 'move';
      setDraggingDealId(deal.id);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, stage: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverStage !== stage) {
        setDragOverStage(stage);
      }
    },
    [dragOverStage]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent, stage: string) => {
      e.preventDefault();
      // Clear drag over state if leaving current column container
      if (e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
      }
      if (dragOverStage === stage) {
        setDragOverStage(null);
      }
    },
    [dragOverStage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStage: string) => {
      e.preventDefault();
      setDragOverStage(null);

      let dealId = e.dataTransfer.getData('text/plain');
      if (!dealId && draggingDealId) {
        dealId = draggingDealId;
      }

      setDraggingDealId(null);

      if (dealId) {
        handleMoveDeal(dealId, targetStage);
      }
  },
    [draggingDealId, handleMoveDeal]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingDealId(null);
    setDragOverStage(null);
  }, []);

  return (
    <div
      data-testid={testId}
      className={cn('flex flex-col w-full space-y-4', className)}
    >
      {/* Toast Notification Container */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          data-testid="board-toast-notification"
          className={cn(
            'fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-sm font-medium border transition-all duration-200 animate-in fade-in slide-in-from-bottom-2',
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-blue-50 text-blue-900 border-blue-300'
          )}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          ) : toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss message"
            className="p-1 rounded-full hover:bg-black/10 transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Board Controls & Summary Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-surface-container-low rounded-lg border border-outline-variant/60">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search deals by title or ID..."
            data-testid="board-search-input"
            aria-label="Search deals"
            className="w-full pl-9 pr-9 py-2 bg-surface rounded-md border border-outline-variant text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Pipeline Summary Metrics */}
        <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-on-surface-variant">
          <div
            data-testid="board-summary-deals"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-outline-variant/40"
          >
            <Layers className="w-4 h-4 text-primary" />
            <span className="font-semibold text-on-surface">
              {summaryStats.totalCount}
            </span>{' '}
            Deals
          </div>

          <div
            data-testid="board-summary-value"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-outline-variant/40"
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-on-surface">
              {formatDealValue(summaryStats.totalValue)}
            </span>{' '}
            Pipeline
          </div>

          <div
            data-testid="board-summary-winrate"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-outline-variant/40"
          >
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Avg Win Prob:{' '}
            <span className="font-semibold text-on-surface">
              {summaryStats.avgWinProb}%
            </span>
          </div>

          {onAddDeal && (
            <button
              type="button"
              onClick={() => onAddDeal()}
              data-testid="board-add-deal-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary font-medium text-xs hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add Deal
            </button>
          )}
        </div>
      </div>

      {/* Main Board Columns Grid */}
      <div
        role="region"
        aria-label="Sales Pipeline Visual Board"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-4 min-h-[500px]"
      >
        {isLoading
          ? // Loading Skeleton Columns
            activeStages.map((stageName, idx) => (
              <div
                key={`skeleton-col-${idx}`}
                data-testid={`column-skeleton-${idx}`}
                className="flex flex-col bg-surface-container-low rounded-lg border border-outline-variant/40 p-3 min-w-[260px] animate-pulse space-y-3"
              >
                <div className="h-6 bg-surface-variant rounded-md w-3/4 mb-2"></div>
                <div className="h-4 bg-surface-variant rounded-md w-1/2 mb-4"></div>
                <div className="h-32 bg-surface-variant rounded-md w-full"></div>
                <div className="h-32 bg-surface-variant rounded-md w-full"></div>
              </div>
            ))
          : // Active Stage Columns
            activeStages.map((stageName) => {
              const stageStyle = getStageStyle(stageName);
              const columnDeals = filteredDeals.filter(
                (d) =>
                  d.milestone_stage.toLowerCase().trim() ===
                  stageName.toLowerCase().trim()
              );
              const columnTotalValue = columnDeals.reduce(
                (acc, d) => acc + (d.deal_value || 0),
                0
              );
              const isDropTarget = dragOverStage === stageName;

              return (
                <div
                  key={`column-${stageName}`}
                  data-testid={`stage-column-${stageName}`}
                  onDragOver={(e) => handleDragOver(e, stageName)}
                  onDragLeave={(e) => handleDragLeave(e, stageName)}
                  onDrop={(e) => handleDrop(e, stageName)}
                  className={cn(
                    'flex flex-col bg-surface-container-low/70 rounded-lg border border-outline-variant/50 border-t-4 transition-all duration-200 min-w-[260px] max-w-full',
                    stageStyle.headerBorderTop,
                    isDropTarget ? stageStyle.dropHighlightBg : 'hover:border-outline-variant'
                  )}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between p-3 border-b border-outline-variant/40 bg-surface/50 rounded-t-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span
                        className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', stageStyle.dotBg)}
                        aria-hidden="true"
                      />
                      <h2
                        data-testid={`column-header-${stageName}`}
                        className="font-semibold text-sm text-on-surface truncate"
                        title={stageName}
                      >
                        {stageName}
                      </h2>
                    </div>

                    {/* Column count badge */}
                    <span
                      data-testid={`column-count-${stageName}`}
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ml-1',
                        stageStyle.badgeBg,
                        stageStyle.badgeText,
                        stageStyle.badgeBorder
                      )}
                    >
                      {columnDeals.length}
                    </span>
                  </div>

                  {/* Column Summary Subheader */}
                  <div className="px-3 py-1.5 flex items-center justify-between text-xs text-on-surface-variant bg-surface-container-lowest/40 border-b border-outline-variant/30">
                    <span className="font-medium text-outline">Total Value:</span>
                    <span
                      data-testid={`column-total-value-${stageName}`}
                      className="font-semibold text-on-surface"
                    >
                      {formatDealValue(columnTotalValue)}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div
                    role="list"
                    aria-label={`${stageName} deals`}
                    data-testid={`column-cards-${stageName}`}
                    className="p-2 space-y-2 min-h-[160px] flex-1 overflow-y-auto max-h-[calc(100vh-280px)]"
                  >
                    {columnDeals.length === 0 ? (
                      /* Empty Column Placeholder */
                      <div
                        data-testid={`column-empty-${stageName}`}
                        className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-outline-variant/60 rounded-md my-2 text-outline bg-surface/30"
                      >
                        <BarChart2 className="w-6 h-6 mb-1 text-outline/60" />
                        <p className="text-xs font-medium">No deals in this stage</p>
                        {onAddDeal && (
                          <button
                            type="button"
                            onClick={() => onAddDeal(stageName)}
                            className="mt-2 text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add deal
                          </button>
                        )}
                      </div>
                    ) : (
                      columnDeals.map((deal) => {
                        const isSelected = selectedDealId === deal.id;
                        const isDragging = draggingDealId === deal.id;
                        const isSelectorOpen = activeStageSelectorDealId === deal.id;

                        return (
                          <div
                            key={deal.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, deal)}
                            onDragEnd={handleDragEnd}
                            className="relative group"
                          >
                            <DealCard
                              deal={deal}
                              isSelected={isSelected}
                              isDragging={isDragging}
                              onClick={onDealSelect}
                              onStageChange={(d, newStage) => handleMoveDeal(d.id, newStage)}
                            />

                            {/* Quick Stage Move Dropdown Button for Keyboard & Alternative Accessibility */}
                            <div className="mt-1 flex items-center justify-between px-1">
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveStageSelectorDealId(
                                      isSelectorOpen ? null : deal.id
                                    );
                                  }}
                                  data-testid={`move-stage-btn-${deal.id}`}
                                  aria-label={`Move deal ${deal.title} to stage`}
                                  className="text-[11px] text-outline hover:text-primary flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-surface-variant transition-colors"
                                >
                                  <MoveRight className="w-3 h-3" />
                                  <span>Move Stage</span>
                                </button>

                                {isSelectorOpen && (
                                  <div
                                    data-testid={`move-stage-menu-${deal.id}`}
                                    className="absolute left-0 bottom-6 z-30 w-48 bg-surface-container-lowest border border-outline rounded-md shadow-lg py-1 text-xs animate-in fade-in zoom-in-95"
                                  >
                                    <div className="px-2 py-1 font-semibold text-outline border-b border-outline-variant/40 mb-1">
                                      Target Stage:
                                    </div>
                                    {activeStages.map((targetStageOption) => {
                                      const isCurrent =
                                        targetStageOption.toLowerCase() ===
                                        deal.milestone_stage.toLowerCase();
                                      return (
                                        <button
                                          key={`opt-${targetStageOption}`}
                                          type="button"
                                          disabled={isCurrent}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMoveDeal(
                                              deal.id,
                                              targetStageOption
                                            );
                                          }}
                                          data-testid={`move-option-${deal.id}-${targetStageOption}`}
                                          className={cn(
                                            'w-full text-left px-3 py-1.5 hover:bg-surface-container transition-colors flex items-center justify-between',
                                            isCurrent
                                              ? 'font-bold text-primary bg-primary/5 cursor-default'
                                              : 'text-on-surface'
                                          )}
                                        >
                                          <span className="truncate">
                                            {targetStageOption}
                                          </span>
                                          {isCurrent && (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
      </div>
    </div>
  );
};
