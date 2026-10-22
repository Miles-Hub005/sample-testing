'use client';

import React, { useMemo, useState } from 'react';
import {
  ClauseResponse,
  ContractDetailResponse,
  EvaluatedSLAResponse,
  SLAResponse,
} from '../../services/contract_api';
import { cn } from '../../lib/utils';
import { StatusLabel } from '../common/StatusLabel';

export type ClauseViewerTab = 'all' | 'highlighted' | 'key_terms' | 'slas';

export interface ClauseViewerProps {
  /**
   * Full contract detail object from the contract API.
   */
  contract?: ContractDetailResponse | null;

  /**
   * List of clauses. Overrides `contract.clauses` if provided.
   */
  clauses?: ClauseResponse[];

  /**
   * List of highlighted clauses. Overrides `contract.highlighted_clauses` if provided.
   */
  highlightedClauses?: ClauseResponse[];

  /**
   * List of SLAs. Overrides `contract.slas` if provided.
   */
  slas?: SLAResponse[];

  /**
   * List of evaluated SLAs. Overrides `contract.evaluated_slas` if provided.
   */
  evaluatedSlas?: EvaluatedSLAResponse[];

  /**
   * Contract title for key terms display.
   */
  title?: string;

  /**
   * Contract category (Contract, SOW, NDA, Exhibit) for key terms display.
   */
  category?: string;

  /**
   * Contract status for key terms display.
   */
  status?: string;

  /**
   * Contract counterparty for key terms display.
   */
  counterparty?: string;

  /**
   * Effective start date.
   */
  startOn?: string | null;

  /**
   * Expiration date.
   */
  expiresOn?: string | null;

  /**
   * Parent contract ID if applicable.
   */
  parentContractId?: string | null;

  /**
   * Initial active tab. Defaults to 'all'.
   */
  initialTab?: ClauseViewerTab;

  /**
   * Callback fired when a clause card is clicked or selected.
   */
  onClauseSelect?: (clause: ClauseResponse) => void;

  /**
   * Optional custom container CSS classes.
   */
  className?: string;

  /**
   * Test identifier for unit and e2e testing.
   */
  'data-testid'?: string;
}

/**
 * ClauseViewer Component [FR-1]
 *
 * Displays contract clauses, highlighted clauses, key agreement terms, and active SLAs.
 * Adheres strictly to WCAG 2.1 AA accessibility standards and Linen & Logic editorial design guidelines.
 */
export const ClauseViewer: React.FC<ClauseViewerProps> = ({
  contract,
  clauses: explicitClauses,
  highlightedClauses: explicitHighlightedClauses,
  slas: explicitSlas,
  evaluatedSlas: explicitEvaluatedSlas,
  title: explicitTitle,
  category: explicitCategory,
  status: explicitStatus,
  counterparty: explicitCounterparty,
  startOn: explicitStartOn,
  expiresOn: explicitExpiresOn,
  parentContractId: explicitParentContractId,
  initialTab = 'all',
  onClauseSelect,
  className,
  'data-testid': testId = 'clause-viewer',
}) => {
  const [activeTab, setActiveTab] = useState<ClauseViewerTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showHighlightedOnly, setShowHighlightedOnly] = useState(false);
  const [expandedClauseIds, setExpandedClauseIds] = useState<Set<string>>(
    new Set()
  );

  // Derive consolidated data from props or contract detail object
  const allClauses: ClauseResponse[] = useMemo(() => {
    return explicitClauses ?? contract?.clauses ?? [];
  }, [explicitClauses, contract]);

  const highlightedList: ClauseResponse[] = useMemo(() => {
    if (explicitHighlightedClauses) return explicitHighlightedClauses;
    if (contract?.highlighted_clauses && contract.highlighted_clauses.length > 0) {
      return contract.highlighted_clauses;
    }
    return allClauses.filter((c) => c.is_highlighted);
  }, [explicitHighlightedClauses, contract, allClauses]);

  const allSlas: SLAResponse[] = useMemo(() => {
    return explicitSlas ?? contract?.slas ?? [];
  }, [explicitSlas, contract]);

  const allEvaluatedSlas: EvaluatedSLAResponse[] = useMemo(() => {
    return explicitEvaluatedSlas ?? contract?.evaluated_slas ?? [];
  }, [explicitEvaluatedSlas, contract]);

  // Derived key terms metadata
  const keyTermsData = useMemo(() => {
    return {
      title: explicitTitle ?? contract?.title ?? 'Untitled Agreement',
      category: explicitCategory ?? contract?.category ?? 'Contract',
      status: explicitStatus ?? contract?.status ?? 'DRAFT',
      counterparty:
        explicitCounterparty ?? contract?.counterparty ?? 'Unspecified',
      startOn: explicitStartOn ?? contract?.start_on ?? null,
      expiresOn: explicitExpiresOn ?? contract?.expires_on ?? null,
      parentContractId:
        explicitParentContractId ?? contract?.parent_contract_id ?? null,
      createdOn: contract?.created_at ?? null,
      updatedOn: contract?.updated_at ?? null,
    };
  }, [
    explicitTitle,
    explicitCategory,
    explicitStatus,
    explicitCounterparty,
    explicitStartOn,
    explicitExpiresOn,
    explicitParentContractId,
    contract,
  ]);

  // Extract unique clause types for the filter dropdown
  const uniqueClauseTypes = useMemo(() => {
    const types = new Set<string>();
    allClauses.forEach((c) => {
      if (c.clause_type) types.add(c.clause_type);
    });
    return Array.from(types).sort();
  }, [allClauses]);

  // Filter clauses based on search query, clause type, and highlighted toggle
  const filteredClauses = useMemo(() => {
    return allClauses.filter((clause) => {
      // Highlighted only filter
      if (showHighlightedOnly && !clause.is_highlighted) {
        return false;
      }
      if (activeTab === 'highlighted' && !clause.is_highlighted) {
        return false;
      }

      // Clause type filter
      if (selectedType !== 'all' && clause.clause_type !== selectedType) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = clause.title?.toLowerCase().includes(query);
        const matchesType = clause.clause_type?.toLowerCase().includes(query);
        const matchesBody = clause.body_text?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesType && !matchesBody) {
          return false;
        }
      }

      return true;
    });
  }, [allClauses, showHighlightedOnly, activeTab, selectedType, searchQuery]);

  // Filter SLAs based on search query
  const filteredSlas = useMemo(() => {
    if (!searchQuery.trim()) return allSlas;
    const query = searchQuery.toLowerCase().trim();
    return allSlas.filter((sla) => {
      const matchesMetric = sla.metric_name?.toLowerCase().includes(query);
      const matchesTarget = sla.target_value?.toLowerCase().includes(query);
      const matchesPenalty = sla.penalty_terms?.toLowerCase().includes(query);
      return matchesMetric || matchesTarget || matchesPenalty;
    });
  }, [allSlas, searchQuery]);

  // Toggle expansion state for a specific clause card
  const toggleClauseExpanded = (clauseId: string) => {
    setExpandedClauseIds((prev) => {
      const next = new Set(prev);
      if (next.has(clauseId)) {
        next.delete(clauseId);
      } else {
        next.add(clauseId);
      }
      return next;
    });
  };

  // Helper to format ISO date strings for editorial display
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Not specified';
    try {
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return dateStr;
      return parsed.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      data-testid={testId}
      className={cn(
        'w-full bg-[#fbf9f4] border border-[#d1c4b9] rounded-lg shadow-sm overflow-hidden text-[#1b1c19]',
        className
      )}
    >
      {/* Component Header */}
      <div className="px-6 py-5 bg-[#f5f3ee] border-b border-[#d1c4b9] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-[#715a3f] font-semibold">
              {keyTermsData.category}
            </span>
            <span className="text-[#80756b]">•</span>
            <StatusLabel status={keyTermsData.status} size="sm" />
          </div>
          <h2 className="text-2xl font-serif text-[#59452b] mt-1 font-normal tracking-tight">
            {keyTermsData.title}
          </h2>
          <p className="text-sm text-[#4e453d] mt-0.5">
            Counterparty:{' '}
            <span className="font-medium text-[#1b1c19]">
              {keyTermsData.counterparty}
            </span>
          </p>
        </div>

        {/* Action / Summary Quick Metrics */}
        <div className="flex items-center gap-3 self-start md:self-auto text-xs text-[#4e453d]">
          <div className="bg-[#f0eee9] px-3 py-1.5 rounded border border-[#d1c4b9] text-center">
            <span className="block font-semibold text-[#59452b] text-sm">
              {allClauses.length}
            </span>
            <span>Total Clauses</span>
          </div>
          <div className="bg-[#fdddbb]/40 px-3 py-1.5 rounded border border-[#735c41]/30 text-center">
            <span className="block font-semibold text-[#735c41] text-sm">
              {highlightedList.length}
            </span>
            <span>Highlighted</span>
          </div>
          <div className="bg-[#f0eee9] px-3 py-1.5 rounded border border-[#d1c4b9] text-center">
            <span className="block font-semibold text-[#374a5f] text-sm">
              {allSlas.length}
            </span>
            <span>Active SLAs</span>
          </div>
        </div>
      </div>

      {/* Accessible Tab Navigation */}
      <div
        role="tablist"
        aria-label="Contract Information Tabs"
        className="flex border-b border-[#d1c4b9] bg-[#eae8e3] px-6 gap-2 overflow-x-auto scrollbar-none"
      >
        <button
          role="tab"
          id="tab-all-clauses"
          aria-selected={activeTab === 'all'}
          aria-controls="panel-all-clauses"
          data-testid="tab-all-clauses"
          onClick={() => setActiveTab('all')}
          className={cn(
            'py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#735c41]',
            activeTab === 'all'
              ? 'border-[#59452b] text-[#59452b] bg-[#fbf9f4] font-semibold rounded-t-md -mb-[1px]'
              : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#80756b]'
          )}
        >
          All Clauses ({allClauses.length})
        </button>

        <button
          role="tab"
          id="tab-highlighted-clauses"
          aria-selected={activeTab === 'highlighted'}
          aria-controls="panel-highlighted-clauses"
          data-testid="tab-highlighted-clauses"
          onClick={() => setActiveTab('highlighted')}
          className={cn(
            'py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#735c41]',
            activeTab === 'highlighted'
              ? 'border-[#735c41] text-[#735c41] bg-[#fbf9f4] font-semibold rounded-t-md -mb-[1px]'
              : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#80756b]'
          )}
        >
          <svg
            className="w-4 h-4 text-[#735c41]"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Highlighted Clauses ({highlightedList.length})
        </button>

        <button
          role="tab"
          id="tab-key-terms"
          aria-selected={activeTab === 'key_terms'}
          aria-controls="panel-key-terms"
          data-testid="tab-key-terms"
          onClick={() => setActiveTab('key_terms')}
          className={cn(
            'py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#735c41]',
            activeTab === 'key_terms'
              ? 'border-[#59452b] text-[#59452b] bg-[#fbf9f4] font-semibold rounded-t-md -mb-[1px]'
              : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#80756b]'
          )}
        >
          Key Terms & Summary
        </button>

        <button
          role="tab"
          id="tab-slas"
          aria-selected={activeTab === 'slas'}
          aria-controls="panel-slas"
          data-testid="tab-slas"
          onClick={() => setActiveTab('slas')}
          className={cn(
            'py-3 px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#735c41]',
            activeTab === 'slas'
              ? 'border-[#374a5f] text-[#374a5f] bg-[#fbf9f4] font-semibold rounded-t-md -mb-[1px]'
              : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#80756b]'
          )}
        >
          Active SLAs ({allSlas.length})
        </button>
      </div>

      {/* Toolbar / Search & Filter Controls (For Clauses & SLAs tabs) */}
      {(activeTab === 'all' ||
        activeTab === 'highlighted' ||
        activeTab === 'slas') && (
        <div className="p-4 bg-[#f0eee9] border-b border-[#d1c4b9] flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <label htmlFor="clause-search-input" className="sr-only">
              Search clauses, key terms, or SLAs
            </label>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#80756b]">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              id="clause-search-input"
              data-testid="clause-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'slas'
                  ? 'Search SLA metrics or penalties...'
                  : 'Search by clause title, type, or text...'
              }
              className="w-full pl-9 pr-8 py-2 bg-[#ffffff] border border-[#d1c4b9] rounded-md text-sm text-[#1b1c19] placeholder-[#80756b] focus:outline-none focus:ring-2 focus:ring-[#735c41] focus:border-transparent"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#80756b] hover:text-[#1b1c19]"
                aria-label="Clear search input"
              >
                ✕
              </button>
            )}
          </div>

          {/* Additional Clause Filters */}
          {activeTab !== 'slas' && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Type Filter Dropdown */}
              {uniqueClauseTypes.length > 0 && (
                <div>
                  <label htmlFor="clause-type-filter" className="sr-only">
                    Filter by clause type
                  </label>
                  <select
                    id="clause-type-filter"
                    data-testid="clause-type-filter"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="py-2 px-3 bg-[#ffffff] border border-[#d1c4b9] rounded-md text-sm text-[#1b1c19] focus:outline-none focus:ring-2 focus:ring-[#735c41]"
                  >
                    <option value="all">All Clause Types</option>
                    {uniqueClauseTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Highlighted Only Toggle Button */}
              {activeTab === 'all' && (
                <button
                  type="button"
                  data-testid="toggle-highlighted-only"
                  aria-pressed={showHighlightedOnly}
                  onClick={() => setShowHighlightedOnly(!showHighlightedOnly)}
                  className={cn(
                    'py-2 px-3 rounded-md text-sm font-medium border flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#735c41]',
                    showHighlightedOnly
                      ? 'bg-[#fdddbb] border-[#735c41] text-[#58432a]'
                      : 'bg-[#ffffff] border-[#d1c4b9] text-[#4e453d] hover:bg-[#f5f3ee]'
                  )}
                >
                  <svg
                    className={cn(
                      'w-4 h-4',
                      showHighlightedOnly
                        ? 'text-[#735c41] fill-current'
                        : 'text-[#80756b]'
                    )}
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Highlighted Only
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab Panel Content */}
      <div className="p-6">
        {/* Tab 1: All Clauses */}
        {activeTab === 'all' && (
          <div
            id="panel-all-clauses"
            role="tabpanel"
            aria-labelledby="tab-all-clauses"
            data-testid="panel-all-clauses"
            className="space-y-4"
          >
            {filteredClauses.length === 0 ? (
              <div
                data-testid="no-clauses-empty-state"
                className="p-8 text-center bg-[#f5f3ee] border border-dashed border-[#d1c4b9] rounded-lg"
              >
                <p className="text-[#59452b] font-medium text-base">
                  No clauses match your search criteria.
                </p>
                <p className="text-[#4e453d] text-sm mt-1">
                  Try clearing filters or searching for different terms.
                </p>
                {(searchQuery || selectedType !== 'all' || showHighlightedOnly) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedType('all');
                      setShowHighlightedOnly(false);
                    }}
                    className="mt-4 px-4 py-2 bg-[#59452b] text-[#ffffff] text-sm rounded hover:bg-[#735c41] transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredClauses.map((clause) => {
                  const isExpanded = expandedClauseIds.has(clause.id);
                  return (
                    <article
                      key={clause.id}
                      data-testid={`clause-card-${clause.id}`}
                      data-highlighted={clause.is_highlighted}
                      onClick={() => onClauseSelect?.(clause)}
                      className={cn(
                        'border rounded-lg p-5 transition-all cursor-pointer relative',
                        clause.is_highlighted
                          ? 'bg-[#fdfbf7] border-l-4 border-l-[#735c41] border-[#d1c4b9] shadow-xs'
                          : 'bg-[#ffffff] border-[#d1c4b9] hover:border-[#80756b]'
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-2 mb-1.5">
                            <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-[#f0eee9] text-[#4e453d] border border-[#d1c4b9]">
                              {clause.clause_type}
                            </span>
                            {clause.is_highlighted && (
                              <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-[#fdddbb] text-[#58432a] border border-[#735c41]/30 flex items-center gap-1">
                                <svg
                                  className="w-3 h-3 text-[#735c41]"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  aria-hidden="true"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                Highlighted Clause
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-serif font-medium text-[#1b1c19]">
                            {clause.title}
                          </h3>
                        </div>

                        <button
                          type="button"
                          data-testid={`toggle-expand-${clause.id}`}
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} clause text for ${clause.title}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleClauseExpanded(clause.id);
                          }}
                          className="self-end sm:self-start text-xs font-medium text-[#735c41] hover:text-[#59452b] px-2 py-1 bg-[#f5f3ee] rounded border border-[#d1c4b9]"
                        >
                          {isExpanded ? 'Collapse' : 'Expand Text'}
                        </button>
                      </div>

                      {/* Clause Body Text */}
                      <div
                        className={cn(
                          'mt-3 text-sm text-[#1b1c19] leading-relaxed whitespace-pre-wrap font-sans',
                          !isExpanded && 'line-clamp-3'
                        )}
                      >
                        {clause.body_text}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Highlighted Clauses */}
        {activeTab === 'highlighted' && (
          <div
            id="panel-highlighted-clauses"
            role="tabpanel"
            aria-labelledby="tab-highlighted-clauses"
            data-testid="panel-highlighted-clauses"
            className="space-y-4"
          >
            <div className="p-4 bg-[#fdddbb]/30 border border-[#735c41]/30 rounded-md text-sm text-[#58432a] flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#59452b]">
                  Key Contract Highlights & Critical Provisions
                </p>
                <p className="text-xs text-[#4e453d] mt-0.5">
                  Showing {highlightedList.length} clause(s) marked for elevated operational, financial, or legal review.
                </p>
              </div>
            </div>

            {highlightedList.length === 0 ? (
              <div
                data-testid="no-highlighted-empty-state"
                className="p-8 text-center bg-[#f5f3ee] border border-dashed border-[#d1c4b9] rounded-lg"
              >
                <p className="text-[#59452b] font-medium text-base">
                  No highlighted clauses defined for this contract.
                </p>
                <p className="text-[#4e453d] text-sm mt-1">
                  Clauses marked with highlight flags will appear here for rapid inspection.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {highlightedList.map((clause) => {
                  const isExpanded = expandedClauseIds.has(clause.id);
                  return (
                    <article
                      key={clause.id}
                      data-testid={`highlighted-clause-card-${clause.id}`}
                      onClick={() => onClauseSelect?.(clause)}
                      className="bg-[#fdfbf7] border-l-4 border-l-[#735c41] border border-[#d1c4b9] rounded-lg p-5 shadow-xs transition-all cursor-pointer"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-[#f0eee9] text-[#4e453d] border border-[#d1c4b9]">
                              {clause.clause_type}
                            </span>
                            <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-[#fdddbb] text-[#58432a] border border-[#735c41]/30 flex items-center gap-1">
                              ★ Highlighted
                            </span>
                          </div>
                          <h3 className="text-lg font-serif font-medium text-[#1b1c19]">
                            {clause.title}
                          </h3>
                        </div>

                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleClauseExpanded(clause.id);
                          }}
                          className="self-end sm:self-start text-xs font-medium text-[#735c41] hover:text-[#59452b] px-2 py-1 bg-[#f5f3ee] rounded border border-[#d1c4b9]"
                        >
                          {isExpanded ? 'Collapse' : 'Expand Text'}
                        </button>
                      </div>

                      <div
                        className={cn(
                          'mt-3 text-sm text-[#1b1c19] leading-relaxed whitespace-pre-wrap font-sans',
                          !isExpanded && 'line-clamp-4'
                        )}
                      >
                        {clause.body_text}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Key Terms & Summary */}
        {activeTab === 'key_terms' && (
          <div
            id="panel-key-terms"
            role="tabpanel"
            aria-labelledby="tab-key-terms"
            data-testid="panel-key-terms"
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Agreement Parameters */}
              <div
                data-testid="key-terms-overview-card"
                className="bg-[#ffffff] border border-[#d1c4b9] rounded-lg p-5"
              >
                <h3 className="text-base font-serif font-semibold text-[#59452b] border-b border-[#f0eee9] pb-2 mb-4">
                  Agreement Parameters
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-[#80756b] uppercase tracking-wider font-medium">
                      Document Title
                    </dt>
                    <dd className="text-[#1b1c19] font-medium mt-0.5">
                      {keyTermsData.title}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#80756b] uppercase tracking-wider font-medium">
                      Category
                    </dt>
                    <dd className="text-[#1b1c19] font-medium mt-0.5">
                      {keyTermsData.category}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#80756b] uppercase tracking-wider font-medium">
                      Status
                    </dt>
                    <dd className="mt-1">
                      <StatusLabel status={keyTermsData.status} size="sm" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#80756b] uppercase tracking-wider font-medium">
                      Counterparty
                    </dt>
                    <dd className="text-[#1b1c19] font-medium mt-0.5">
                      {keyTermsData.counterparty}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Card 2: Term & Timeline */}
              <div
                data-testid="key-terms-timeline-card"
                className="bg-[#ffffff] border border-[#d1c4b9] rounded-lg p-5"
              >
                <h3 className="text-base font-serif font-semibold text-[#59452b] border-b border-[#f0eee9] pb-2 mb-4">
                  Effective Dates & Term
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-[#80756b] uppercase tracking-wider font-medium">
                      Effective Start Date
                    </dt>
                    <dd className="text-[#1b1c19] font-medium mt-0.5">
                      {formatDate(keyTermsData.startOn)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#80756b] uppercase tracking-wider font-medium">
                      Expiration Date
                    </dt>
                    <dd className="text-[#1b1c19] font-medium mt-0.5">
                      {formatDate(keyTermsData.expiresOn)}
                    </dd>
                  </div>
                  {keyTermsData.parentContractId && (
                    <div className="col-span-2">
                      <dt className="text-xs text-[#80756b] uppercase tracking-wider font-medium">
                        Parent Agreement ID
                      </dt>
                      <dd className="text-[#374a5f] font-mono text-xs mt-0.5 underline">
                        {keyTermsData.parentContractId}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Card 3: Key Structure Summary */}
            <div
              data-testid="key-terms-structure-card"
              className="bg-[#ffffff] border border-[#d1c4b9] rounded-lg p-5"
            >
              <h3 className="text-base font-serif font-semibold text-[#59452b] border-b border-[#f0eee9] pb-2 mb-4">
                Structure & Coverage Overview
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 text-center">
                <div className="p-3 bg-[#f5f3ee] rounded border border-[#d1c4b9]">
                  <span className="block text-2xl font-serif text-[#59452b] font-medium">
                    {allClauses.length}
                  </span>
                  <span className="text-xs text-[#4e453d]">Total Clauses</span>
                </div>
                <div className="p-3 bg-[#fdddbb]/30 rounded border border-[#735c41]/30">
                  <span className="block text-2xl font-serif text-[#735c41] font-medium">
                    {highlightedList.length}
                  </span>
                  <span className="text-xs text-[#4e453d]">Highlighted Clauses</span>
                </div>
                <div className="p-3 bg-[#f5f3ee] rounded border border-[#d1c4b9]">
                  <span className="block text-2xl font-serif text-[#374a5f] font-medium">
                    {allSlas.length}
                  </span>
                  <span className="text-xs text-[#4e453d]">Active Service Levels</span>
                </div>
              </div>

              {uniqueClauseTypes.length > 0 && (
                <div>
                  <h4 className="text-xs text-[#80756b] uppercase tracking-wider font-medium mb-2">
                    Clause Type Distribution
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {uniqueClauseTypes.map((type) => {
                      const count = allClauses.filter(
                        (c) => c.clause_type === type
                      ).length;
                      return (
                        <span
                          key={type}
                          className="px-3 py-1 bg-[#f0eee9] text-[#1b1c19] text-xs font-medium rounded-full border border-[#d1c4b9]"
                        >
                          {type}: <span className="font-semibold">{count}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Active SLAs */}
        {activeTab === 'slas' && (
          <div
            id="panel-slas"
            role="tabpanel"
            aria-labelledby="tab-slas"
            data-testid="panel-slas"
            className="space-y-4"
          >
            {filteredSlas.length === 0 ? (
              <div
                data-testid="no-slas-empty-state"
                className="p-8 text-center bg-[#f5f3ee] border border-dashed border-[#d1c4b9] rounded-lg"
              >
                <p className="text-[#59452b] font-medium text-base">
                  No active SLAs or service targets recorded for this contract.
                </p>
                <p className="text-[#4e453d] text-sm mt-1">
                  Service level commitments, targets, and penalty terms will be displayed here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSlas.map((sla) => {
                  // Find matching evaluated SLA if exists
                  const evaluated = allEvaluatedSlas.find(
                    (e) => e.sla_id === sla.id || e.metric_name === sla.metric_name
                  );

                  const statusVal = evaluated?.status || 'ACTIVE';
                  const hasPenalty = Boolean(
                    sla.penalty_terms || evaluated?.penalty_terms
                  );

                  return (
                    <div
                      key={sla.id}
                      data-testid={`sla-card-${sla.id}`}
                      className="bg-[#ffffff] border border-[#d1c4b9] rounded-lg p-5 flex flex-col justify-between hover:shadow-xs transition-shadow"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-base font-serif font-medium text-[#1b1c19]">
                            {sla.metric_name}
                          </h3>
                          <StatusLabel status={statusVal} size="sm" />
                        </div>

                        <div className="mt-3 p-3 bg-[#f5f3ee] rounded border border-[#d1c4b9]">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#4e453d] text-xs uppercase tracking-wider font-medium">
                              Target Commitment:
                            </span>
                            <span className="font-semibold text-[#59452b]">
                              {sla.target_value}
                            </span>
                          </div>

                          {evaluated?.actual_value !== undefined && (
                            <div className="flex items-center justify-between text-sm mt-1 pt-1 border-t border-[#d1c4b9]">
                              <span className="text-[#4e453d] text-xs uppercase tracking-wider font-medium">
                                Evaluated Value:
                              </span>
                              <span className="font-semibold text-[#1b1c19]">
                                {String(evaluated.actual_value)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Penalty terms display */}
                        {hasPenalty && (
                          <div className="mt-3 p-3 bg-[#ffdad6]/40 border border-[#ba1a1a]/30 rounded text-xs text-[#93000a]">
                            <span className="font-semibold block mb-0.5">
                              ⚠️ Penalty Terms:
                            </span>
                            <span>
                              {sla.penalty_terms || evaluated?.penalty_terms}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#f0eee9] flex items-center justify-between text-xs text-[#80756b]">
                        <span>SLA ID: {sla.id.slice(0, 8)}...</span>
                        {evaluated?.penalty_applicable && (
                          <span className="text-[#ba1a1a] font-medium">
                            Penalty Applicable
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClauseViewer;
