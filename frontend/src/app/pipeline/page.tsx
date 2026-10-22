'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart2,
  DollarSign,
  TrendingUp,
  RotateCw,
  Plus,
  Layers,
  CheckSquare,
  Users,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Clock,
  X,
  AlertTriangle,
  Calendar,
  User,
  ShieldCheck,
  Building,
  Filter,
  Search,
} from 'lucide-react';
import { StatusLabel } from '../../components/common/StatusLabel';
import { Board } from '../../components/pipeline/Board';
import { DealCard, formatDealValue, formatWinProbability } from '../../components/pipeline/DealCard';
import { StakeholderMap } from '../../components/pipeline/StakeholderMap';
import { ForecastWidget } from '../../components/pipeline/ForecastWidget';
import { apiClient, UserMeResponse } from '../../services/apiClient';
import {
  dealsApi,
  Deal,
  MilestoneStage,
  ActionItem,
  CreateDealRequest,
  CreateActionItemRequest,
} from '../../services/deals';
import { cn } from '../../lib/utils';

/**
 * Filter tabs available in the Intelligence Workspace for selected deal.
 */
export type IntelligenceTab = 'all' | 'action_items' | 'stakeholders' | 'forecast';

/**
 * Filter options for action item status list.
 */
export type ActionItemFilter = 'ALL' | 'PENDING' | 'COMPLETED' | 'ESCALATED';

/**
 * Visual Deal Pipeline & Sales Intelligence Page Route [FR-001, FR-003, Story 1, Story 2, Story 3, Story 4].
 *
 * Combines:
 * - Interactive visual milestone pipeline board with stage drag-and-drop / selector (Story 1).
 * - Action item ownership, SLA tracking, and escalation management (Story 2).
 * - Stakeholder contact mapping and chronological interaction activity feeds (Story 3).
 * - AI timeline completion forecasting with confidence scoring and calculation logs (Story 4).
 */
export default function PipelinePage() {
  // User Session & Authentication Context
  const [user, setUser] = useState<UserMeResponse | null>(null);

  // Pipeline Deals State
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState<boolean>(true);
  const [dealsError, setDealsError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Selected Deal & Intelligence Workspace State
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<IntelligenceTab>('all');

  // Action Items State (for selected deal)
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loadingActionItems, setLoadingActionItems] = useState<boolean>(false);
  const [actionItemsError, setActionItemsError] = useState<string | null>(null);
  const [actionItemFilter, setActionItemFilter] = useState<ActionItemFilter>('ALL');

  // New Action Item Form Modal State
  const [isAddActionItemOpen, setIsAddActionItemOpen] = useState<boolean>(false);
  const [actionItemTitle, setActionItemTitle] = useState<string>('');
  const [actionItemOwner, setActionItemOwner] = useState<string>('');
  const [actionItemDueDate, setActionItemDueDate] = useState<string>('');
  const [actionItemSlaHours, setActionItemSlaHours] = useState<number>(24);
  const [actionItemSubmitting, setActionItemSubmitting] = useState<boolean>(false);
  const [actionItemSubmitError, setActionItemSubmitError] = useState<string | null>(null);

  // New Deal Creation Modal State
  const [isCreateDealOpen, setIsCreateDealOpen] = useState<boolean>(false);
  const [newDealTitle, setNewDealTitle] = useState<string>('');
  const [newDealValue, setNewDealValue] = useState<string>('');
  const [newDealStage, setNewDealStage] = useState<string>('Qualification');
  const [newDealWinProb, setNewDealWinProb] = useState<string>('20');
  const [createDealSubmitting, setCreateDealSubmitting] = useState<boolean>(false);
  const [createDealError, setCreateDealError] = useState<string | null>(null);

  // Load User Info
  useEffect(() => {
    let isMounted = true;
    apiClient
      .getMe()
      .then((data) => {
        if (isMounted) setUser(data);
      })
      .catch(() => {
        // Non-fatal session lookup failure
      });
    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Fetch pipeline deals from backend API [FR-001].
   */
  const fetchDeals = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoadingDeals(true);
    } else {
      setIsRefreshing(true);
    }
    setDealsError(null);

    try {
      const data = await dealsApi.getPipelineDeals();
      setDeals(data);

      // Auto-select first deal if no deal is currently selected or if selected deal no longer exists
      if (data && data.length > 0) {
        setSelectedDealId((prevId) => {
          if (prevId && data.some((d) => d.id === prevId)) {
            return prevId;
          }
          return data[0].id;
        });
      } else {
        setSelectedDealId(null);
      }
    } catch (err: any) {
      setDealsError(err?.message || 'Failed to load deal pipeline records.');
    } finally {
      setLoadingDeals(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch deals on initial mount
  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Selected Deal Object lookup
  const selectedDeal = useMemo(() => {
    if (!selectedDealId) return null;
    return deals.find((d) => d.id === selectedDealId) || null;
  }, [deals, selectedDealId]);

  /**
   * Fetch action items when selected deal changes [FR-004].
   */
  const fetchActionItems = useCallback(async (dealId: string) => {
    setLoadingActionItems(true);
    setActionItemsError(null);
    try {
      const items = await dealsApi.listActionItems(dealId);
      setActionItems(items);
    } catch (err: any) {
      setActionItemsError(err?.message || 'Failed to load action items for selected deal.');
      setActionItems([]);
    } finally {
      setLoadingActionItems(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDealId) {
      fetchActionItems(selectedDealId);
    } else {
      setActionItems([]);
    }
  }, [selectedDealId, fetchActionItems]);

  /**
   * Handle updating deal milestone stage directly from visual pipeline [FR-003].
   */
  const handleStageChange = useCallback(
    async (dealId: string, newStage: string) => {
      try {
        const updatedDeal = await dealsApi.updateDealStage(dealId, {
          milestone_stage: newStage,
        });

        // Update local state
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, ...updatedDeal } : d))
        );
      } catch (err: any) {
        // Re-throw error so Board component can revert optimistic update and show toast
        throw err;
      }
    },
    []
  );

  /**
   * Handle new deal submission.
   */
  const handleCreateDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDealTitle.trim()) {
      setCreateDealError('Deal title is required.');
      return;
    }

    const valueNum = parseFloat(newDealValue) || 0;
    const probNum = (parseFloat(newDealWinProb) || 0) / 100;

    setCreateDealSubmitting(true);
    setCreateDealError(null);

    try {
      const created = await dealsApi.createDeal({
        title: newDealTitle.trim(),
        deal_value: valueNum,
        milestone_stage: newDealStage.trim(),
        win_probability: probNum,
      });

      setDeals((prev) => [created, ...prev]);
      setSelectedDealId(created.id);
      setIsCreateDealOpen(false);

      // Reset form
      setNewDealTitle('');
      setNewDealValue('');
      setNewDealStage('Qualification');
      setNewDealWinProb('20');
    } catch (err: any) {
      setCreateDealError(err?.message || 'Failed to create new deal.');
    } finally {
      setCreateDealSubmitting(false);
    }
  };

  /**
   * Open New Deal modal with optional pre-selected stage.
   */
  const handleOpenCreateDealModal = (stage?: string) => {
    if (stage) {
      setNewDealStage(stage);
    }
    setCreateDealError(null);
    setIsCreateDealOpen(true);
  };

  /**
   * Handle action item creation for selected deal [FR-004].
   */
  const handleCreateActionItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDealId) return;

    if (!actionItemTitle.trim()) {
      setActionItemSubmitError('Action item title is required.');
      return;
    }
    if (!actionItemOwner.trim()) {
      setActionItemSubmitError('Assigned owner ID is required.');
      return;
    }
    if (!actionItemDueDate) {
      setActionItemSubmitError('Target due date is required.');
      return;
    }

    setActionItemSubmitting(true);
    setActionItemSubmitError(null);

    try {
      // Format due date to ISO string
      const dueIso = new Date(actionItemDueDate).toISOString();
      const newItem = await dealsApi.createActionItem(selectedDealId, {
        title: actionItemTitle.trim(),
        assigned_owner_id: actionItemOwner.trim(),
        target_due_date: dueIso,
        sla_threshold_hours: actionItemSlaHours || 24,
      });

      setActionItems((prev) => [newItem, ...prev]);
      setIsAddActionItemOpen(false);

      // Reset form
      setActionItemTitle('');
      setActionItemOwner('');
      setActionItemDueDate('');
      setActionItemSlaHours(24);
    } catch (err: any) {
      setActionItemSubmitError(err?.message || 'Failed to create action item.');
    } finally {
      setActionItemSubmitting(false);
    }
  };

  /**
   * Complete action item and clear escalation [FR-004].
   */
  const handleCompleteActionItem = async (itemId: string) => {
    if (!selectedDealId) return;
    try {
      const updated = await dealsApi.completeActionItem(selectedDealId, itemId, {
        completed_on: new Date().toISOString(),
      });
      setActionItems((prev) =>
        prev.map((item) => (item.id === itemId ? updated : item))
      );
    } catch (err: any) {
      setActionItemsError(err?.message || 'Failed to complete action item.');
    }
  };

  /**
   * Delete action item record [FR-004].
   */
  const handleDeleteActionItem = async (itemId: string) => {
    if (!selectedDealId) return;
    try {
      await dealsApi.deleteActionItem(selectedDealId, itemId);
      setActionItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err: any) {
      setActionItemsError(err?.message || 'Failed to delete action item.');
    }
  };

  // Filtered action items based on active status filter tab
  const filteredActionItems = useMemo(() => {
    if (actionItemFilter === 'PENDING') {
      return actionItems.filter((item) => !item.is_completed);
    }
    if (actionItemFilter === 'COMPLETED') {
      return actionItems.filter((item) => item.is_completed);
    }
    if (actionItemFilter === 'ESCALATED') {
      return actionItems.filter((item) => item.is_escalated && !item.is_completed);
    }
    return actionItems;
  }, [actionItems, actionItemFilter]);

  // Overall pipeline metrics calculations
  const totalPipelineValue = useMemo(() => {
    return deals.reduce((acc, d) => acc + (d.deal_value || 0), 0);
  }, [deals]);

  const totalEscalatedCount = useMemo(() => {
    return actionItems.filter((item) => item.is_escalated && !item.is_completed).length;
  }, [actionItems]);

  return (
    <div
      className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] font-sans antialiased pb-16"
      data-testid="pipeline-page"
    >
      {/* Header Section */}
      <header className="bg-white border-b border-[#e4e2dd] sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-[#735c41]/10 text-[#59452b]">
                  <Layers className="w-5 h-5" />
                </span>
                <h1 className="text-2xl font-serif text-[#1b1c19] tracking-tight" data-testid="page-title">
                  Visual Deal Pipeline
                </h1>
                <StatusLabel variant="info" text="Sales Intelligence" className="text-xs ml-2" />
              </div>
              <p className="text-xs text-[#80756b] mt-1">
                Interactive milestone pipeline board, automated SLA escalation tracking, stakeholder mapping, and AI completion forecasting.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden lg:flex items-center gap-2 text-xs text-[#80756b] bg-[#f5f3ee] px-3 py-1.5 rounded-md border border-[#e4e2dd]">
                  <User className="w-3.5 h-3.5 text-[#735c41]" />
                  <span className="font-medium text-[#1b1c19]">{user.email}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => fetchDeals(true)}
                disabled={isRefreshing || loadingDeals}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#4e453d] bg-white border border-[#c2b9a7] rounded-md hover:bg-[#f5f3ee] focus:outline-hidden focus:ring-2 focus:ring-[#735c41] transition-colors disabled:opacity-50"
                title="Refresh deal pipeline data"
              >
                <RotateCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
                Refresh
              </button>

              <button
                type="button"
                onClick={() => handleOpenCreateDealModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#59452b] hover:bg-[#735c41] rounded-md shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#735c41] transition-colors"
                data-testid="add-deal-btn"
              >
                <Plus className="w-4 h-4" />
                New Deal
              </button>
            </div>
          </div>

          {/* Quick Metrics Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#f0eee9]">
            <div className="bg-[#f8f6f0] p-3 rounded-md border border-[#e4e2dd] flex items-center gap-3">
              <div className="p-2 rounded-md bg-amber-100 text-[#59452b]">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#80756b] uppercase tracking-wider">
                  Total Pipeline
                </p>
                <p className="text-base font-semibold text-[#1b1c19]">
                  {formatDealValue(totalPipelineValue)}
                </p>
              </div>
            </div>

            <div className="bg-[#f8f6f0] p-3 rounded-md border border-[#e4e2dd] flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-100 text-blue-800">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#80756b] uppercase tracking-wider">
                  Active Deals
                </p>
                <p className="text-base font-semibold text-[#1b1c19]">{deals.length}</p>
              </div>
            </div>

            <div className="bg-[#f8f6f0] p-3 rounded-md border border-[#e4e2dd] flex items-center gap-3">
              <div className="p-2 rounded-md bg-emerald-100 text-emerald-800">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#80756b] uppercase tracking-wider">
                  Selected Deal Value
                </p>
                <p className="text-base font-semibold text-[#1b1c19]">
                  {selectedDeal ? formatDealValue(selectedDeal.deal_value) : '$0'}
                </p>
              </div>
            </div>

            <div className="bg-[#f8f6f0] p-3 rounded-md border border-[#e4e2dd] flex items-center gap-3">
              <div
                className={cn(
                  'p-2 rounded-md',
                  totalEscalatedCount > 0
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-700'
                )}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#80756b] uppercase tracking-wider">
                  Escalated Items
                </p>
                <p className="text-base font-semibold text-[#1b1c19]">
                  {totalEscalatedCount > 0 ? (
                    <span className="text-rose-700 font-bold">{totalEscalatedCount} Breached</span>
                  ) : (
                    '0 SLA Breaches'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Error Banner */}
        {dealsError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-md flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{dealsError}</span>
            </div>
            <button
              type="button"
              onClick={() => fetchDeals()}
              className="px-2.5 py-1 font-medium bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-md transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Section 1: Visual Interactive Pipeline Board (Story 1 & FR-001, FR-003) */}
        <section className="bg-white border border-[#e4e2dd] rounded-lg p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#f0eee9]">
            <div>
              <h2 className="text-lg font-serif text-[#1b1c19] flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-[#735c41]" />
                Stage Milestone Progression Board
              </h2>
              <p className="text-xs text-[#80756b]">
                Drag deal cards or click stage selectors to update milestone progression directly [FR-001, FR-003].
              </p>
            </div>
            {selectedDeal && (
              <div className="flex items-center gap-2 text-xs bg-[#f5f3ee] px-3 py-1.5 rounded-md border border-[#e4e2dd]">
                <span className="text-[#80756b]">Active Focus:</span>
                <span className="font-medium text-[#1b1c19] truncate max-w-[200px]">
                  {selectedDeal.title}
                </span>
                <span className="text-[#80756b]">({selectedDeal.milestone_stage})</span>
              </div>
            )}
          </div>

          <Board
            deals={deals}
            isLoading={loadingDeals}
            selectedDealId={selectedDealId}
            onDealSelect={(deal) => setSelectedDealId(deal.id)}
            onStageChange={handleStageChange}
            onAddDeal={handleOpenCreateDealModal}
            data-testid="pipeline-board"
          />
        </section>

        {/* Section 2: Selected Deal Intelligence Workspace */}
        {selectedDeal ? (
          <section
            className="bg-white border border-[#e4e2dd] rounded-lg shadow-xs overflow-hidden"
            data-testid="selected-deal-workspace"
          >
            {/* Workspace Header */}
            <div className="bg-[#f8f6f0] border-b border-[#e4e2dd] p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusLabel variant="info" text={selectedDeal.milestone_stage} />
                    <h3 className="text-xl font-serif text-[#1b1c19] tracking-tight">
                      {selectedDeal.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#80756b] mt-2 flex-wrap">
                    <span>
                      Value:{' '}
                      <strong className="text-[#1b1c19]">
                        {formatDealValue(selectedDeal.deal_value)}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Win Probability:{' '}
                      <strong className="text-[#1b1c19]">
                        {formatWinProbability(selectedDeal.win_probability)}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Age:{' '}
                      <strong className="text-[#1b1c19]">
                        {selectedDeal.age_in_days ?? 0} days
                      </strong>
                    </span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-[#80756b]">
                      ID: {selectedDeal.id}
                    </span>
                  </div>
                </div>

                {/* Workspace Tab Navigation */}
                <div className="flex items-center bg-white p-1 rounded-md border border-[#e4e2dd] shadow-2xs self-start md:self-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5',
                      activeTab === 'all'
                        ? 'bg-[#59452b] text-white shadow-2xs'
                        : 'text-[#4e453d] hover:bg-[#f5f3ee]'
                    )}
                    data-testid="all-tab"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Unified Workspace
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('action_items')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5',
                      activeTab === 'action_items'
                        ? 'bg-[#59452b] text-white shadow-2xs'
                        : 'text-[#4e453d] hover:bg-[#f5f3ee]'
                    )}
                    data-testid="action-items-tab"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Action Items ({actionItems.length})
                    {totalEscalatedCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('stakeholders')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5',
                      activeTab === 'stakeholders'
                        ? 'bg-[#59452b] text-white shadow-2xs'
                        : 'text-[#4e453d] hover:bg-[#f5f3ee]'
                    )}
                    data-testid="stakeholders-tab"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Stakeholders
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('forecast')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5',
                      activeTab === 'forecast'
                        ? 'bg-[#59452b] text-white shadow-2xs'
                        : 'text-[#4e453d] hover:bg-[#f5f3ee]'
                    )}
                    data-testid="forecast-tab"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    AI Forecast
                  </button>
                </div>
              </div>
            </div>

            {/* Workspace Content Panel */}
            <div className="p-6 space-y-8">
              {/* Tab: Action Items (Story 2 & FR-004) */}
              {(activeTab === 'all' || activeTab === 'action_items') && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f0eee9]">
                    <div>
                      <h4 className="text-base font-serif text-[#1b1c19] flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-[#735c41]" />
                        Action Item Ownership & Automated Escalation (Story 2)
                      </h4>
                      <p className="text-xs text-[#80756b]">
                        Tasks assigned to deal owners with automated SLA threshold breach detection.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status Filter buttons */}
                      <div className="flex items-center bg-[#f5f3ee] p-1 rounded-md border border-[#e4e2dd]">
                        {(['ALL', 'PENDING', 'COMPLETED', 'ESCALATED'] as ActionItemFilter[]).map(
                          (filter) => (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => setActionItemFilter(filter)}
                              className={cn(
                                'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                                actionItemFilter === filter
                                  ? 'bg-white text-[#1b1c19] shadow-2xs border border-[#d1c4b9]'
                                  : 'text-[#80756b] hover:text-[#1b1c19]'
                              )}
                            >
                              {filter}
                            </button>
                          )
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setActionItemSubmitError(null);
                          setIsAddActionItemOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#59452b] hover:bg-[#735c41] rounded-md shadow-2xs transition-colors"
                        data-testid="add-action-item-btn"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Action Item
                      </button>
                    </div>
                  </div>

                  {actionItemsError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs">
                      {actionItemsError}
                    </div>
                  )}

                  {loadingActionItems ? (
                    <div className="p-8 text-center text-xs text-[#80756b] animate-pulse">
                      Loading action items...
                    </div>
                  ) : filteredActionItems.length === 0 ? (
                    <div className="p-8 text-center bg-[#fbf9f4] border border-dashed border-[#d1c4b9] rounded-md">
                      <CheckSquare className="w-8 h-8 text-[#80756b] mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium text-[#1b1c19]">No action items found</p>
                      <p className="text-[11px] text-[#80756b] mt-0.5">
                        {actionItemFilter !== 'ALL'
                          ? `No items matching filter "${actionItemFilter}".`
                          : 'Assign action items to track task completion and SLA compliance.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {filteredActionItems.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'p-4 rounded-md border transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3',
                            item.is_escalated && !item.is_completed
                              ? 'bg-rose-50/60 border-rose-200 shadow-2xs'
                              : item.is_completed
                              ? 'bg-[#f8f6f0] border-[#e4e2dd] opacity-80'
                              : 'bg-white border-[#e4e2dd] hover:border-[#c2b9a7]'
                          )}
                          data-testid={`action-item-card-${item.id}`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.is_escalated && !item.is_completed && (
                                <StatusLabel
                                  variant="error"
                                  text="SLA ESCALATED"
                                  className="text-[10px]"
                                />
                              )}
                              {item.is_completed ? (
                                <StatusLabel
                                  variant="success"
                                  text="COMPLETED"
                                  className="text-[10px]"
                                />
                              ) : (
                                <StatusLabel
                                  variant="warning"
                                  text="PENDING"
                                  className="text-[10px]"
                                />
                              )}
                              <h5
                                className={cn(
                                  'text-xs font-semibold text-[#1b1c19]',
                                  item.is_completed && 'line-through text-[#80756b]'
                                )}
                              >
                                {item.title}
                              </h5>
                            </div>

                            <div className="flex items-center gap-4 text-[11px] text-[#80756b] flex-wrap">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-[#735c41]" />
                                Owner: <strong className="text-[#1b1c19]">{item.assigned_owner_id}</strong>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#735c41]" />
                                Due:{' '}
                                <strong className="text-[#1b1c19]">
                                  {new Date(item.target_due_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </strong>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#735c41]" />
                                SLA Threshold: {item.sla_threshold_hours}h
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-auto">
                            {!item.is_completed && (
                              <button
                                type="button"
                                onClick={() => handleCompleteActionItem(item.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-md transition-colors"
                                title="Mark action item complete"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Complete
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteActionItem(item.id)}
                              className="p-1.5 text-[#80756b] hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                              title="Delete action item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Stakeholders & Interaction Activity Feed (Story 3) */}
              {(activeTab === 'all' || activeTab === 'stakeholders') && (
                <div className="pt-4 border-t border-[#f0eee9]">
                  <StakeholderMap dealId={selectedDeal.id} data-testid="stakeholder-map" />
                </div>
              )}

              {/* Tab: AI Timeline Completion Forecast (Story 4) */}
              {(activeTab === 'all' || activeTab === 'forecast') && (
                <div className="pt-4 border-t border-[#f0eee9]">
                  <ForecastWidget
                    dealId={selectedDeal.id}
                    dealTitle={selectedDeal.title}
                    data-testid="forecast-widget"
                  />
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="bg-white border border-[#e4e2dd] rounded-lg p-12 text-center text-xs text-[#80756b]">
            <Layers className="w-10 h-10 text-[#80756b] mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-[#1b1c19]">No Deal Selected</p>
            <p className="mt-1">
              Select a deal from the visual board above to inspect action items, stakeholder contacts, and AI forecasts.
            </p>
          </div>
        )}
      </main>

      {/* Modal: Create New Deal */}
      {isCreateDealOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto"
          data-testid="create-deal-modal"
        >
          <div className="bg-white border border-[#e4e2dd] rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0eee9] pb-3">
              <h3 className="text-lg font-serif text-[#1b1c19]">Create New Deal</h3>
              <button
                type="button"
                onClick={() => setIsCreateDealOpen(false)}
                className="text-[#80756b] hover:text-[#1b1c19] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createDealError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs">
                {createDealError}
              </div>
            )}

            <form onSubmit={handleCreateDealSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#1b1c19] mb-1">
                  Deal Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDealTitle}
                  onChange={(e) => setNewDealTitle(e.target.value)}
                  placeholder="e.g. Acme Enterprise ERP Rollout"
                  className="w-full px-3 py-2 bg-white border border-[#c2b9a7] rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#735c41] text-[#1b1c19]"
                  data-testid="create-deal-title-input"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1b1c19] mb-1">
                  Deal Value (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newDealValue}
                  onChange={(e) => setNewDealValue(e.target.value)}
                  placeholder="e.g. 150000"
                  className="w-full px-3 py-2 bg-white border border-[#c2b9a7] rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#735c41] text-[#1b1c19]"
                  data-testid="create-deal-value-input"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1b1c19] mb-1">
                  Initial Milestone Stage
                </label>
                <select
                  value={newDealStage}
                  onChange={(e) => setNewDealStage(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#c2b9a7] rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#735c41] text-[#1b1c19]"
                  data-testid="create-deal-stage-select"
                >
                  <option value="Qualification">Qualification</option>
                  <option value="Discovery">Discovery</option>
                  <option value="Solution Proposal">Solution Proposal</option>
                  <option value="Contract Negotiation">Contract Negotiation</option>
                  <option value="Closed Won">Closed Won</option>
                  <option value="Closed Lost">Closed Lost</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#1b1c19] mb-1">
                  Win Probability (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newDealWinProb}
                  onChange={(e) => setNewDealWinProb(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#c2b9a7] rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#735c41] text-[#1b1c19]"
                  data-testid="create-deal-prob-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0eee9]">
                <button
                  type="button"
                  onClick={() => setIsCreateDealOpen(false)}
                  className="px-3.5 py-1.5 font-medium text-[#4e453d] bg-white border border-[#c2b9a7] rounded-md hover:bg-[#f5f3ee] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDealSubmitting}
                  className="px-4 py-1.5 font-medium text-white bg-[#59452b] hover:bg-[#735c41] rounded-md shadow-2xs transition-colors disabled:opacity-50"
                  data-testid="submit-create-deal-btn"
                >
                  {createDealSubmitting ? 'Creating...' : 'Create Deal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Action Item */}
      {isAddActionItemOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto"
          data-testid="create-action-item-modal"
        >
          <div className="bg-white border border-[#e4e2dd] rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0eee9] pb-3">
              <h3 className="text-lg font-serif text-[#1b1c19]">Add Action Item</h3>
              <button
                type="button"
                onClick={() => setIsAddActionItemOpen(false)}
                className="text-[#80756b] hover:text-[#1b1c19] p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionItemSubmitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-md text-xs">
                {actionItemSubmitError}
              </div>
            )}

            <form onSubmit={handleCreateActionItemSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#1b1c19] mb-1">
                  Task Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={actionItemTitle}
                  onChange={(e) => setActionItemTitle(e.target.value)}
                  placeholder="e.g. Schedule technical review with Lead Architect"
                  className="w-full px-3 py-2 bg-white border border-[#c2b9a7] rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#735c41] text-[#1b1c19]"
                  data-testid="action-item-title-input"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1b1c19] mb-1">
                  Assigned Owner ID <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={actionItemOwner}
                  onChange={(e) => setActionItemOwner(e.target.value)}
                  placeholder="e.g. owner_usr_9988"
                  className="w-full px-3 py-2 bg-white border border-[#c2b9a7] rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#735c41] text-[#1b1c19]"
                  data-testid="action-item-owner-input"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1b1c19] mb-1">
                  Target Due Date <span className="text-rose-600">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={actionItemDueDate}
                  onChange={(e) => setActionItemDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#c2b9a7] rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#735c41] text-[#1b1c19]"
                  data-testid="action-item-duedate-input"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1b1c19] mb-1">
                  SLA Threshold Hours
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={actionItemSlaHours}
                  onChange={(e) => setActionItemSlaHours(parseInt(e.target.value, 10) || 24)}
                  className="w-full px-3 py-2 bg-white border border-[#c2b9a7] rounded-md focus:outline-hidden focus:ring-2 focus:ring-[#735c41] text-[#1b1c19]"
                  data-testid="action-item-sla-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#f0eee9]">
                <button
                  type="button"
                  onClick={() => setIsAddActionItemOpen(false)}
                  className="px-3.5 py-1.5 font-medium text-[#4e453d] bg-white border border-[#c2b9a7] rounded-md hover:bg-[#f5f3ee] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionItemSubmitting}
                  className="px-4 py-1.5 font-medium text-white bg-[#59452b] hover:bg-[#735c41] rounded-md shadow-2xs transition-colors disabled:opacity-50"
                  data-testid="submit-action-item-btn"
                >
                  {actionItemSubmitting ? 'Saving...' : 'Assign Action Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
