'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  AmendmentDetailResponse,
  ContractDetailResponse,
  contractApi,
} from '../../services/contract_api';
import { cn } from '../../lib/utils';
import { StatusLabel } from '../common/StatusLabel';
import {
  AlertCircle,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react';

export interface AmendmentTimelineProps {
  /**
   * Target contract ID. Used for default API calls.
   */
  contractId?: string;

  /**
   * Full contract detail object from contract API.
   */
  contract?: ContractDetailResponse | null;

  /**
   * Explicit array of amendment audit records. Overrides `contract.amendments` if provided.
   */
  amendments?: AmendmentDetailResponse[];

  /**
   * Contract title for section header context.
   */
  contractTitle?: string;

  /**
   * Contract status for section header context.
   */
  contractStatus?: string;

  /**
   * Custom callback for appending a new amendment entry.
   */
  onAddAmendment?: (summary: string) => Promise<AmendmentDetailResponse | void>;

  /**
   * Event callback fired after a new amendment entry is appended successfully.
   */
  onAmendmentAdded?: (newAmendment: AmendmentDetailResponse) => void;

  /**
   * Read-only mode flag. Hides the append amendment entry form when true.
   */
  readOnly?: boolean;

  /**
   * Initial sort direction for the timeline ('asc' | 'desc'). Defaults to 'asc' (chronological).
   */
  initialSortOrder?: 'asc' | 'desc';

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
 * Utility to format ISO timestamp into readable locale date and time string.
 */
function formatTimestamp(isoString?: string | null): string {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Utility to format author display string.
 */
function formatAuthor(authorId?: string | null): string {
  if (!authorId || !authorId.trim()) {
    return 'Authorized System User';
  }
  return authorId.trim();
}

/**
 * AmendmentTimeline Component [FR-7, FR-8]
 *
 * Displays an append-only, immutable audit trail of contract amendments.
 * Ensures past audit records cannot be modified or deleted, and allows appending
 * time-stamped entries with sequence numbers.
 * Adheres strictly to WCAG 2.1 AA accessibility guidelines and Linen & Logic editorial styling.
 */
export const AmendmentTimeline: React.FC<AmendmentTimelineProps> = ({
  contractId: propContractId,
  contract,
  amendments: propAmendments,
  contractTitle: propContractTitle,
  contractStatus: propContractStatus,
  onAddAmendment,
  onAmendmentAdded,
  readOnly = false,
  initialSortOrder = 'asc',
  className,
  'data-testid': testId = 'amendment-timeline',
}) => {
  const searchInputId = useId();
  const sortSelectId = useId();
  const summaryInputId = useId();

  // Resolve contract ID
  const activeContractId = propContractId || contract?.id;
  const activeContractTitle = propContractTitle || contract?.title || 'Contract Agreement';
  const activeContractStatus = propContractStatus || contract?.status || 'ACTIVE';

  // State management
  const [items, setItems] = useState<AmendmentDetailResponse[]>(() => {
    if (propAmendments) return propAmendments;
    if (contract?.amendments) return contract.amendments;
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);

  // Form state for appending new amendment
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [summaryInput, setSummaryInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Sync state if props change
  useEffect(() => {
    if (propAmendments) {
      setItems(propAmendments);
    } else if (contract?.amendments) {
      setItems(contract.amendments);
    }
  }, [propAmendments, contract?.amendments]);

  // Fetch amendments from API if not supplied in props
  const fetchAmendments = useCallback(async () => {
    if (!activeContractId) return;
    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await contractApi.listAmendments(activeContractId);
      setItems(response.items || []);
    } catch (err: any) {
      const msg = err?.message || 'Failed to fetch amendment audit trail entries.';
      setFetchError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [activeContractId]);

  // Initial load if items empty and contractId provided
  useEffect(() => {
    if (!propAmendments && !contract?.amendments && activeContractId) {
      fetchAmendments();
    }
  }, [propAmendments, contract?.amendments, activeContractId, fetchAmendments]);

  // Filter and sort amendment records
  const filteredAmendments = useMemo(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
        const matchesSummary = item.summary?.toLowerCase().includes(query);
        const matchesAuthor = item.author_id?.toLowerCase().includes(query);
        const matchesSeq = item.sequence_number?.toString().includes(query);
        return matchesSummary || matchesAuthor || matchesSeq;
      });
    }

    result.sort((a, b) => {
      const seqA = a.sequence_number ?? 0;
      const seqB = b.sequence_number ?? 0;
      if (seqA !== seqB) {
        return sortOrder === 'asc' ? seqA - seqB : seqB - seqA;
      }
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return result;
  }, [items, searchQuery, sortOrder]);

  // Handle appending new amendment entry [FR-7]
  const handleSubmitNewAmendment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const trimmedSummary = summaryInput.trim();
    if (!trimmedSummary) {
      setSubmitError('Amendment summary description is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      let createdAmendment: AmendmentDetailResponse | void;

      if (onAddAmendment) {
        createdAmendment = await onAddAmendment(trimmedSummary);
      } else if (activeContractId) {
        createdAmendment = await contractApi.createAmendment(activeContractId, {
          summary: trimmedSummary,
        });
      } else {
        throw new Error('Contract ID is required to record a new amendment entry.');
      }

      // If returned object or fallback
      const nextSequence =
        items.length > 0 ? Math.max(...items.map((i) => i.sequence_number || 0)) + 1 : 1;

      const finalRecord: AmendmentDetailResponse = (createdAmendment as AmendmentDetailResponse) || {
        id: `amendment-${Date.now()}`,
        contract_id: activeContractId || '',
        sequence_number: nextSequence,
        summary: trimmedSummary,
        author_id: 'current-user',
        created_at: new Date().toISOString(),
      };

      // Append new entry without modifying past records [FR-7]
      setItems((prev) => [...prev, finalRecord]);
      setSummaryInput('');
      setSubmitSuccess(
        `Amendment #${finalRecord.sequence_number} recorded successfully in the append-only audit trail.`
      );
      setIsFormOpen(false);

      if (onAmendmentAdded) {
        onAmendmentAdded(finalRecord);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to record amendment entry in audit trail.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      data-testid={testId}
      aria-label={`Amendment audit trail for ${activeContractTitle}`}
      className={cn(
        'w-full bg-[#fbf9f4] border border-[#d1c4b9] rounded-lg p-6 shadow-sm font-sans space-y-6',
        className
      )}
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e4e2dd] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif font-normal text-[#1b1c19]">
              Amendment Audit Trail
            </h2>
            <StatusLabel
              status={activeContractStatus}
              size="sm"
              ariaLabel={`Contract status: ${activeContractStatus}`}
            />
          </div>
          <p className="text-sm text-[#4e453d] mt-1">
            Immutable, append-only history of formal contract modifications and addenda.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeContractId && (
            <button
              type="button"
              onClick={fetchAmendments}
              disabled={isLoading}
              aria-label="Refresh amendment audit log"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#59452b] bg-[#f0eee9] hover:bg-[#eae8e3] border border-[#d1c4b9] rounded transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41]"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              <span>Refresh</span>
            </button>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                setIsFormOpen((prev) => !prev);
                setSubmitError(null);
                setSubmitSuccess(null);
              }}
              aria-expanded={isFormOpen}
              aria-controls="add-amendment-form-container"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#ffffff] bg-[#59452b] hover:bg-[#735c41] rounded shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Record Amendment</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Security & Integrity Banner [FR-8] */}
      <div
        role="note"
        aria-label="Audit Log Security Information"
        className="flex items-start gap-3 p-4 bg-[#f5f3ee] border border-[#d1c4b9] rounded-md text-xs text-[#4e453d]"
      >
        <ShieldCheck className="w-5 h-5 text-[#59452b] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-[#1b1c19]">
            Protected Read-Only Audit Log
          </p>
          <p>
            All contract amendments are stored sequentially in an append-only audit log. In
            compliance with legal compliance rules, past entries cannot be edited, modified, or
            deleted.
          </p>
        </div>
      </div>

      {/* Global Status / Alert Notifications */}
      {fetchError && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {submitSuccess && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-sm"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {/* Append New Amendment Entry Form Container [FR-7] */}
      {!readOnly && isFormOpen && (
        <div
          id="add-amendment-form-container"
          className="p-5 bg-[#ffffff] border border-[#735c41] rounded-md shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#f0eee9] pb-3">
            <h3 className="text-base font-semibold text-[#1b1c19] flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-[#735c41]" />
              Record New Contract Amendment
            </h3>
            <span className="text-xs text-[#80756b]">
              Sequence #{items.length > 0 ? Math.max(...items.map((i) => i.sequence_number || 0)) + 1 : 1}
            </span>
          </div>

          <form onSubmit={handleSubmitNewAmendment} className="space-y-4">
            <div>
              <label
                htmlFor={summaryInputId}
                className="block text-xs font-medium text-[#4e453d] tracking-wider uppercase mb-1"
              >
                Amendment Summary / Scope Description <span className="text-red-600">*</span>
              </label>
              <textarea
                id={summaryInputId}
                rows={3}
                required
                value={summaryInput}
                onChange={(e) => setSummaryInput(e.target.value)}
                placeholder="Describe the changes, terms modified, extended deadlines, or price adjustments..."
                className="w-full px-3 py-2 text-sm text-[#1b1c19] bg-[#fbf9f4] border border-[#d1c4b9] rounded focus:outline-none focus:ring-2 focus:ring-[#735c41] focus:border-transparent placeholder:text-[#80756b]"
              />
              <p className="text-xs text-[#80756b] mt-1">
                This entry will be permanently recorded with your user identity and timestamp.
              </p>
            </div>

            {submitError && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 text-red-800 rounded text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setSubmitError(null);
                }}
                disabled={isSubmitting}
                className="px-3 py-1.5 text-xs font-medium text-[#4e453d] hover:bg-[#f5f3ee] border border-[#d1c4b9] rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !summaryInput.trim()}
                className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-[#ffffff] bg-[#59452b] hover:bg-[#735c41] disabled:bg-[#d1c4b9] rounded shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Append Audit Entry</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Controls Bar: Search & Sort Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#f5f3ee] p-3 rounded-md border border-[#e4e2dd]">
        <div className="relative flex-1">
          <label htmlFor={searchInputId} className="sr-only">
            Search amendment entries
          </label>
          <Search className="w-4 h-4 text-[#80756b] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id={searchInputId}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by summary, author, or sequence number..."
            className="w-full pl-9 pr-3 py-1.5 text-xs text-[#1b1c19] bg-[#ffffff] border border-[#d1c4b9] rounded focus:outline-none focus:ring-2 focus:ring-[#735c41] placeholder:text-[#80756b]"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label
            htmlFor={sortSelectId}
            className="text-xs font-medium text-[#4e453d] whitespace-nowrap flex items-center gap-1"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Order:</span>
          </label>
          <select
            id={sortSelectId}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            className="px-2.5 py-1.5 text-xs text-[#1b1c19] bg-[#ffffff] border border-[#d1c4b9] rounded focus:outline-none focus:ring-2 focus:ring-[#735c41]"
          >
            <option value="asc">Chronological (Seq #1 first)</option>
            <option value="desc">Reverse Chronological (Newest first)</option>
          </select>
        </div>
      </div>

      {/* Timeline List / Output Area */}
      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          aria-label="Loading amendment records"
          className="p-12 text-center space-y-3"
        >
          <RefreshCw className="w-6 h-6 text-[#735c41] animate-spin mx-auto" />
          <p className="text-sm text-[#4e453d]">Fetching amendment audit trail...</p>
        </div>
      ) : filteredAmendments.length === 0 ? (
        <div
          role="region"
          aria-label="Empty amendment list"
          className="p-10 text-center bg-[#ffffff] border border-dashed border-[#d1c4b9] rounded-md space-y-3"
        >
          <FileText className="w-8 h-8 text-[#80756b] mx-auto" />
          <h3 className="text-base font-serif font-normal text-[#1b1c19]">
            {searchQuery.trim()
              ? 'No matching amendment entries found.'
              : 'No amendment audit records.'}
          </h3>
          <p className="text-xs text-[#4e453d] max-w-md mx-auto">
            {searchQuery.trim()
              ? 'Try adjusting your search criteria or clearing filters.'
              : 'This contract currently has no recorded amendments. All future modifications will be appended here in sequence.'}
          </p>
        </div>
      ) : (
        <div className="relative pl-4 sm:pl-6 space-y-6 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#d1c4b9]">
          <ol
            aria-label="Amendment timeline audit entries"
            aria-readonly="true"
            className="space-y-6"
          >
            {filteredAmendments.map((amendment, index) => {
              const seqNum = amendment.sequence_number ?? index + 1;
              const formattedTime = formatTimestamp(amendment.created_at);
              const authorText = formatAuthor(amendment.author_id);

              return (
                <li
                  key={amendment.id || `amendment-seq-${seqNum}-${index}`}
                  data-testid={`amendment-item-${seqNum}`}
                  aria-readonly="true"
                  className="relative pl-6 sm:pl-8 group"
                >
                  {/* Timeline bullet / node */}
                  <div
                    aria-hidden="true"
                    className="absolute -left-[17px] sm:-left-[21px] top-1.5 w-6 h-6 rounded-full bg-[#fbf9f4] border-2 border-[#735c41] flex items-center justify-center text-[#735c41] shadow-xs"
                  >
                    <Lock className="w-3 h-3 text-[#59452b]" />
                  </div>

                  {/* Audit Card Container */}
                  <div className="p-4 sm:p-5 bg-[#ffffff] border border-[#d1c4b9] rounded-md shadow-xs hover:border-[#735c41] transition-colors space-y-3">
                    {/* Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0eee9] pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-[#735c41] text-[#ffffff] rounded">
                          Sequence #{seqNum}
                        </span>
                        <span className="text-xs text-[#80756b] font-mono">
                          ID: {amendment.id ? amendment.id.slice(0, 8) : `AM-${seqNum}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusLabel
                          status="active"
                          label="Immutable Entry"
                          size="sm"
                          showDot={false}
                          ariaLabel={`Sequence #${seqNum} is an immutable audit entry`}
                        />
                      </div>
                    </div>

                    {/* Summary Body */}
                    <div className="text-sm text-[#1b1c19] whitespace-pre-wrap leading-relaxed">
                      {amendment.summary || 'No summary description provided.'}
                    </div>

                    {/* Footer / Meta Attributes */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#4e453d] pt-2 border-t border-[#f5f3ee]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#80756b]" />
                        <time dateTime={amendment.created_at || undefined}>
                          {formattedTime}
                        </time>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#80756b]" />
                        <span>Author: {authorText}</span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
};

export default AmendmentTimeline;