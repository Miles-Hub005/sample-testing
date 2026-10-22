'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  FileText,
  CheckSquare,
  Plus,
  Trash2,
  Filter,
  RotateCw,
  Search,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  X,
  Send,
  ListTodo,
  Tag,
  Briefcase,
  SlidersHorizontal,
  XCircle,
  Check,
} from 'lucide-react';
import {
  getCalendarMeetings,
  submitMeetingNotes,
  LeadMeeting,
  FollowupTask,
  CalendarQueryParams,
  SubmitMeetingNotesRequest,
  SubmitNotesResponse,
  TaskInput,
} from '../../services/analytics';
import { cn } from '../../lib/utils';

// ============================================================================
// Types & Props Contract [FR-009, FR-010]
// ============================================================================

export interface MeetingCalendarProps {
  /**
   * Pre-loaded meeting items. If provided, used directly or refetched on filter changes.
   */
  data?: LeadMeeting[];

  /**
   * Initial query parameters for filtering meeting calendar data.
   */
  initialFilters?: CalendarQueryParams;

  /**
   * Callback invoked whenever calendar filter parameters change.
   */
  onFilterChange?: (filters: CalendarQueryParams) => void;

  /**
   * Callback invoked after meeting notes and tasks are submitted successfully.
   */
  onNotesSubmit?: (meetingId: string, result: SubmitNotesResponse) => void;

  /**
   * Controlled loading state flag.
   */
  isLoading?: boolean;

  /**
   * Controlled error message or Error object.
   */
  error?: string | Error | null;

  /**
   * Callback for retrying data fetch upon error.
   */
  onRetry?: () => void;

  /**
   * Custom CSS class name to append to the container.
   */
  className?: string;

  /**
   * Testing identifier.
   */
  'data-testid'?: string;
}

export type MeetingViewMode = 'all' | 'pending_notes' | 'completed';

// ============================================================================
// Helper & Formatting Functions [FR-009, FR-010]
// ============================================================================

/**
 * Format ISO time string into readable date & time string.
 */
export function formatMeetingTime(timeStr?: string | null): string {
  if (!timeStr || timeStr.trim() === '') {
    return 'Unscheduled';
  }
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) {
      return timeStr;
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return timeStr;
  }
}

/**
 * Format date string into YYYY-MM-DD or readable short date string.
 */
export function formatDateOnly(dateStr?: string | null): string {
  if (!dateStr || dateStr.trim() === '') {
    return 'No Due Date';
  }
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr;
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

/**
 * Get lead status visual badge color styling classes.
 */
export function getStatusBadgeColor(status?: string | null): string {
  if (!status) return 'bg-gray-100 text-gray-700 border-gray-200';
  const norm = status.toUpperCase().trim();
  switch (norm) {
    case 'WON':
    case 'QUALIFIED':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'PROPOSAL':
    case 'CONTACTED':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'NEGOTIATION':
    case 'NEW':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'LOST':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    default:
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
  }
}

/**
 * Filter meetings array based on search term, status filter, and view mode.
 */
export function filterMeetings(
  meetings: LeadMeeting[],
  searchTerm: string,
  statusFilter: string,
  viewMode: MeetingViewMode = 'all'
): LeadMeeting[] {
  if (!Array.isArray(meetings)) return [];

  const query = searchTerm.toLowerCase().trim();
  const normStatus = statusFilter.toUpperCase().trim();

  return meetings.filter((meeting) => {
    // Search query matching lead_id, prep_notes, meeting_notes, or task descriptions
    const matchesSearch =
      query === '' ||
      meeting.lead_id.toLowerCase().includes(query) ||
      (meeting.prep_notes && meeting.prep_notes.toLowerCase().includes(query)) ||
      (meeting.meeting_notes && meeting.meeting_notes.toLowerCase().includes(query)) ||
      meeting.followup_tasks.some((t) =>
        t.task_description.toLowerCase().includes(query)
      );

    // Lead status matching
    const matchesStatus =
      normStatus === '' ||
      normStatus === 'ALL' ||
      (meeting.lead_status && meeting.lead_status.toUpperCase() === normStatus);

    // View mode filtering
    const hasNotes = Boolean(meeting.meeting_notes && meeting.meeting_notes.trim() !== '');
    const matchesViewMode =
      viewMode === 'all' ||
      (viewMode === 'pending_notes' && !hasNotes) ||
      (viewMode === 'completed' && hasNotes);

    return matchesSearch && matchesStatus && matchesViewMode;
  });
}

/**
 * Group meetings by date (YYYY-MM-DD) for calendar agenda grouping.
 */
export function groupMeetingsByDate(meetings: LeadMeeting[]): Record<string, LeadMeeting[]> {
  const groups: Record<string, LeadMeeting[]> = {};

  if (!Array.isArray(meetings)) return groups;

  meetings.forEach((meeting) => {
    let dateKey = 'Unscheduled';
    if (meeting.scheduled_time) {
      try {
        const d = new Date(meeting.scheduled_time);
        if (!isNaN(d.getTime())) {
          dateKey = d.toISOString().split('T')[0];
        }
      } catch {
        dateKey = 'Unscheduled';
      }
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(meeting);
  });

  return groups;
}

// ============================================================================
// Internal Interface: Form Task Row
// ============================================================================

interface DynamicTaskRow {
  id: string;
  task_description: string;
  assigned_user_id: string;
  due_date_val: string;
}

// ============================================================================
// Component Implementation [FR-009, FR-010]
// ============================================================================

export const MeetingCalendar: React.FC<MeetingCalendarProps> = ({
  data: propsData,
  initialFilters,
  onFilterChange,
  onNotesSubmit,
  isLoading: propsIsLoading,
  error: propsError,
  onRetry,
  className,
  'data-testid': testId = 'meeting-calendar',
}) => {
  // State: Filter controls
  const [userIdFilter, setUserIdFilter] = useState<string>(
    initialFilters?.user_id || ''
  );
  const [leadIdFilter, setLeadIdFilter] = useState<string>(
    initialFilters?.lead_id || ''
  );
  const [startDateFilter, setStartDateFilter] = useState<string>(
    initialFilters?.start_date_val
      ? typeof initialFilters.start_date_val === 'string'
        ? initialFilters.start_date_val
        : initialFilters.start_date_val.toISOString().split('T')[0]
      : ''
  );
  const [endDateFilter, setEndDateFilter] = useState<string>(
    initialFilters?.end_date_val
      ? typeof initialFilters.end_date_val === 'string'
        ? initialFilters.end_date_val
        : initialFilters.end_date_val.toISOString().split('T')[0]
      : ''
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<MeetingViewMode>('all');

  // State: Data and API handling
  const [internalMeetings, setInternalMeetings] = useState<LeadMeeting[]>(
    propsData || []
  );
  const [internalLoading, setInternalLoading] = useState<boolean>(
    !propsData && propsIsLoading === undefined
  );
  const [internalError, setInternalError] = useState<string | null>(null);

  // State: Selected Meeting & Note Submission Form
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [formNotes, setFormNotes] = useState<string>('');
  const [formLeadStatus, setFormLeadStatus] = useState<string>('QUALIFIED');
  const [taskRows, setTaskRows] = useState<DynamicTaskRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null);

  // Synchronize propsData with internalMeetings
  useEffect(() => {
    if (propsData) {
      setInternalMeetings(propsData);
    }
  }, [propsData]);

  // Combined fetch handler
  const fetchMeetings = useCallback(async () => {
    setInternalLoading(true);
    setInternalError(null);

    const queryParams: CalendarQueryParams = {
      user_id: userIdFilter.trim() !== '' ? userIdFilter.trim() : null,
      lead_id: leadIdFilter.trim() !== '' ? leadIdFilter.trim() : null,
      start_date_val: startDateFilter.trim() !== '' ? startDateFilter.trim() : null,
      end_date_val: endDateFilter.trim() !== '' ? endDateFilter.trim() : null,
    };

    if (onFilterChange) {
      onFilterChange(queryParams);
    }

    try {
      const res = await getCalendarMeetings(queryParams);
      setInternalMeetings(res || []);
    } catch (err: any) {
      const errorMsg =
        err?.message || 'Failed to retrieve meeting calendar data. Please try again.';
      setInternalError(errorMsg);
    } finally {
      setInternalLoading(false);
    }
  }, [userIdFilter, leadIdFilter, startDateFilter, endDateFilter, onFilterChange]);

  // Initial load
  useEffect(() => {
    if (!propsData) {
      fetchMeetings();
    }
  }, []); // Run on mount

  // Selected meeting object derived from internalMeetings
  const selectedMeeting = useMemo(() => {
    if (!selectedMeetingId) return null;
    return internalMeetings.find((m) => m.id === selectedMeetingId) || null;
  }, [selectedMeetingId, internalMeetings]);

  // When a meeting is selected, populate form initial state
  useEffect(() => {
    if (selectedMeeting) {
      setFormNotes(selectedMeeting.meeting_notes || '');
      setFormLeadStatus(selectedMeeting.lead_status || 'QUALIFIED');
      setTaskRows([]);
      setSubmitSuccessMsg(null);
      setSubmitErrorMsg(null);
    }
  }, [selectedMeetingId]);

  // Filtered meetings list
  const filteredMeetings = useMemo(() => {
    return filterMeetings(
      internalMeetings,
      searchQuery,
      leadStatusFilter,
      viewMode
    );
  }, [internalMeetings, searchQuery, leadStatusFilter, viewMode]);

  // Grouped meetings by date
  const groupedMeetings = useMemo(() => {
    return groupMeetingsByDate(filteredMeetings);
  }, [filteredMeetings]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = internalMeetings.length;
    const completedNotes = internalMeetings.filter(
      (m) => m.meeting_notes && m.meeting_notes.trim() !== ''
    ).length;
    const pendingNotes = total - completedNotes;
    const totalTasks = internalMeetings.reduce(
      (acc, m) => acc + (m.followup_tasks ? m.followup_tasks.length : 0),
      0
    );

    return {
      total,
      completedNotes,
      pendingNotes,
      totalTasks,
    };
  }, [internalMeetings]);

  // Reset Filters handler
  const handleResetFilters = () => {
    setUserIdFilter('');
    setLeadIdFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setSearchQuery('');
    setLeadStatusFilter('ALL');
    setViewMode('all');

    if (!propsData) {
      setTimeout(() => {
        getCalendarMeetings({})
          .then((res) => setInternalMeetings(res || []))
          .catch((err) =>
            setInternalError(err?.message || 'Failed to reload calendar.')
          );
      }, 0);
    }
  };

  // Add a task row
  const handleAddTaskRow = () => {
    const newRow: DynamicTaskRow = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      task_description: '',
      assigned_user_id: userIdFilter || 'usr-sales-rep',
      due_date_val: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    };
    setTaskRows((prev) => [...prev, newRow]);
  };

  // Remove a task row
  const handleRemoveTaskRow = (id: string) => {
    setTaskRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Update a task row field
  const handleUpdateTaskRow = (
    id: string,
    field: keyof DynamicTaskRow,
    value: string
  ) => {
    setTaskRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Submit Meeting Notes Form
  const handleSubmitNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;

    // Validate tasks if task rows exist
    for (let i = 0; i < taskRows.length; i++) {
      const task = taskRows[i];
      if (!task.task_description.trim()) {
        setSubmitErrorMsg(`Task #${i + 1} is missing a task description.`);
        return;
      }
      if (!task.assigned_user_id.trim()) {
        setSubmitErrorMsg(`Task #${i + 1} requires an assigned user ID.`);
        return;
      }
      if (!task.due_date_val.trim()) {
        setSubmitErrorMsg(`Task #${i + 1} requires a due date.`);
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitSuccessMsg(null);
    setSubmitErrorMsg(null);

    const formattedTasks: TaskInput[] = taskRows.map((r) => ({
      task_description: r.task_description.trim(),
      assigned_user_id: r.assigned_user_id.trim(),
      due_date_val: r.due_date_val.trim(),
      is_completed: false,
    }));

    const payload: SubmitMeetingNotesRequest = {
      meeting_notes: formNotes.trim(),
      prep_notes: selectedMeeting.prep_notes || null,
      lead_status: formLeadStatus,
      tasks: formattedTasks.length > 0 ? formattedTasks : null,
    };

    try {
      const res = await submitMeetingNotes(selectedMeeting.id, payload);

      // Update internal state
      setInternalMeetings((prev) =>
        prev.map((m) => {
          if (m.id === selectedMeeting.id) {
            const updatedTasks = [
              ...(m.followup_tasks || []),
              ...(res.created_tasks || []),
            ];
            return {
              ...m,
              meeting_notes: formNotes.trim(),
              lead_status: formLeadStatus,
              followup_tasks: updatedTasks,
            };
          }
          return m;
        })
      );

      const taskCountText =
        formattedTasks.length > 0
          ? ` and ${formattedTasks.length} follow-up task(s) assigned`
          : '';
      setSubmitSuccessMsg(
        `Meeting notes logged${taskCountText} successfully!`
      );
      setTaskRows([]);

      if (onNotesSubmit) {
        onNotesSubmit(selectedMeeting.id, res);
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        'Failed to log meeting notes and tasks. Please verify form inputs.';
      setSubmitErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = propsIsLoading !== undefined ? propsIsLoading : internalLoading;
  const effectiveError = propsError || internalError;

  return (
    <div
      data-testid={testId}
      className={cn(
        'w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden text-gray-900',
        className
      )}
    >
      {/* Component Header */}
      <div className="p-6 border-b border-gray-100 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                <CalendarIcon className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                Meeting Prep & Follow-Up Calendar
              </h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Access scheduled lead briefings, log meeting outcomes, update lead statuses, and generate assigned follow-up tasks [FR-009, FR-010].
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="refresh-calendar-btn"
              onClick={onRetry || fetchMeetings}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors shadow-xs"
            >
              <RotateCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              <span>Refresh Calendar</span>
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Scheduled Meetings</span>
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {summaryMetrics.total}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Notes Logged</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-700 mt-1">
              {summaryMetrics.completedNotes}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Pending Notes</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-700 mt-1">
              {summaryMetrics.pendingNotes}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Follow-Up Tasks</span>
              <ListTodo className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-blue-700 mt-1">
              {summaryMetrics.totalTasks}
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-5 p-4 bg-white rounded-lg border border-gray-200 space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5 text-gray-500" />
              <span>Calendar Filters & Search</span>
            </div>
            <button
              type="button"
              data-testid="reset-filters-btn"
              onClick={handleResetFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <label className="block text-2xs font-medium text-gray-500 mb-1">
                Search Briefings & Notes
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  data-testid="calendar-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Lead ID, notes, tasks..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Lead Status Dropdown */}
            <div>
              <label className="block text-2xs font-medium text-gray-500 mb-1">
                Lead Status
              </label>
              <select
                data-testid="status-filter-select"
                value={leadStatusFilter}
                onChange={(e) => setLeadStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">NEW</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="QUALIFIED">QUALIFIED</option>
                <option value="PROPOSAL">PROPOSAL</option>
                <option value="NEGOTIATION">NEGOTIATION</option>
                <option value="WON">WON</option>
                <option value="LOST">LOST</option>
              </select>
            </div>

            {/* User ID Input */}
            <div>
              <label className="block text-2xs font-medium text-gray-500 mb-1">
                Assigned User ID
              </label>
              <input
                type="text"
                data-testid="user-id-filter-input"
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
                onBlur={fetchMeetings}
                placeholder="e.g. usr-101"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-2xs font-medium text-gray-500 mb-1">
                Start Date
              </label>
              <input
                type="date"
                data-testid="start-date-filter-input"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                onBlur={fetchMeetings}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-2xs font-medium text-gray-500 mb-1">
                End Date
              </label>
              <input
                type="date"
                data-testid="end-date-filter-input"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                onBlur={fetchMeetings}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <span className="text-2xs font-medium text-gray-500">View Notes Filter:</span>
            <div className="inline-flex rounded-md shadow-2xs">
              <button
                type="button"
                data-testid="view-all-btn"
                onClick={() => setViewMode('all')}
                className={cn(
                  'px-2.5 py-1 text-2xs font-medium rounded-l-md border',
                  viewMode === 'all'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                )}
              >
                All Meetings ({summaryMetrics.total})
              </button>
              <button
                type="button"
                data-testid="view-pending-btn"
                onClick={() => setViewMode('pending_notes')}
                className={cn(
                  'px-2.5 py-1 text-2xs font-medium border-t border-b border-r',
                  viewMode === 'pending_notes'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                )}
              >
                Pending Notes ({summaryMetrics.pendingNotes})
              </button>
              <button
                type="button"
                data-testid="view-completed-btn"
                onClick={() => setViewMode('completed')}
                className={cn(
                  'px-2.5 py-1 text-2xs font-medium rounded-r-md border-t border-b border-r',
                  viewMode === 'completed'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                )}
              >
                Notes Logged ({summaryMetrics.completedNotes})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        {/* Error Alert */}
        {effectiveError && (
          <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-semibold text-rose-900">Meeting Calendar Error</p>
              <p className="mt-0.5">{effectiveError instanceof Error ? effectiveError.message : String(effectiveError)}</p>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 text-xs font-medium rounded-md transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Loading State Skeleton */}
        {isLoading && (
          <div className="space-y-4 py-8 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-gray-100 rounded-lg p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredMeetings.length === 0 && (
          <div
            data-testid="empty-calendar-state"
            className="text-center py-12 px-4 border-2 border-dashed border-gray-200 rounded-xl bg-slate-50/50"
          >
            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">
              No Scheduled Meetings Found
            </h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              There are no meetings matching your search query or filter settings. Adjust the date range or clear search criteria to view briefings.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Meeting Cards Grid / Agenda Layout */}
        {!isLoading && filteredMeetings.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Meetings Agenda List */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span>Scheduled Briefings & Meetings ({filteredMeetings.length})</span>
                </h3>
                <span className="text-2xs text-gray-500 font-medium">
                  Select a meeting to view prep briefing & log notes
                </span>
              </div>

              {Object.entries(groupedMeetings).map(([dateKey, dateMeetings]) => (
                <div key={dateKey} className="space-y-3">
                  <div className="sticky top-0 z-10 bg-gray-100/90 backdrop-blur-xs px-3 py-1 rounded-md text-xs font-bold text-gray-700 flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{dateKey === 'Unscheduled' ? 'Unscheduled Meetings' : formatDateOnly(dateKey)}</span>
                    <span className="ml-auto text-2xs font-normal text-gray-500">
                      ({dateMeetings.length})
                    </span>
                  </div>

                  <div className="space-y-3 pl-1">
                    {dateMeetings.map((meeting) => {
                      const isSelected = meeting.id === selectedMeetingId;
                      const hasNotes = Boolean(
                        meeting.meeting_notes && meeting.meeting_notes.trim() !== ''
                      );

                      return (
                        <div
                          key={meeting.id}
                          data-testid={`meeting-card-${meeting.id}`}
                          onClick={() => setSelectedMeetingId(meeting.id)}
                          className={cn(
                            'p-4 rounded-xl border transition-all cursor-pointer relative',
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50/40 shadow-md ring-1 ring-indigo-500'
                              : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-xs'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-gray-900">
                                  Lead ID: {meeting.lead_id}
                                </span>
                                <span
                                  className={cn(
                                    'px-2 py-0.5 rounded-full text-3xs font-bold uppercase border',
                                    getStatusBadgeColor(meeting.lead_status)
                                  )}
                                >
                                  {meeting.lead_status || 'NEW'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <span>{formatMeetingTime(meeting.scheduled_time)}</span>
                              </div>
                            </div>

                            {/* Status Indicator Chip */}
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded text-3xs font-semibold flex items-center gap-1',
                                hasNotes
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              )}
                            >
                              {hasNotes ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Notes Logged</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  <span>Pending Notes</span>
                                </>
                              )}
                            </span>
                          </div>

                          {/* Preparation Briefing Snippet [FR-009] */}
                          <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-gray-700">
                            <div className="font-semibold text-gray-800 flex items-center gap-1.5 mb-1 text-2xs">
                              <FileText className="w-3 h-3 text-indigo-600" />
                              <span>Prep Briefing:</span>
                            </div>
                            <p className="line-clamp-2 text-gray-600">
                              {meeting.prep_notes || 'No preparation briefing notes available for this meeting.'}
                            </p>
                          </div>

                          {/* Existing Tasks Badge */}
                          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-2xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                              <span>
                                {meeting.followup_tasks ? meeting.followup_tasks.length : 0} Follow-Up Task(s)
                              </span>
                            </div>
                            <span className="text-indigo-600 font-medium flex items-center gap-0.5 hover:underline">
                              Open Form <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Selected Meeting Detail, Briefing, and Note Form [FR-009, FR-010] */}
            <div className="lg:col-span-6">
              {selectedMeeting ? (
                <div
                  data-testid="selected-meeting-panel"
                  className="p-5 rounded-xl border border-indigo-200 bg-white shadow-sm space-y-5 sticky top-4"
                >
                  {/* Selected Meeting Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-gray-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-md bg-indigo-100 text-indigo-700">
                          <Briefcase className="w-4 h-4" />
                        </span>
                        <h3 className="text-base font-bold text-gray-900">
                          Meeting Briefing & Notes: {selectedMeeting.lead_id}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {formatMeetingTime(selectedMeeting.scheduled_time)}
                        </span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-3xs font-bold uppercase border',
                            getStatusBadgeColor(selectedMeeting.lead_status)
                          )}
                        >
                          Status: {selectedMeeting.lead_status || 'NEW'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedMeetingId(null)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                      title="Close Panel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preparation Briefing Full Panel [FR-009] */}
                  <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Preparation Briefing / Context</span>
                    </div>
                    <div className="text-gray-800 leading-relaxed whitespace-pre-line bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs">
                      {selectedMeeting.prep_notes ||
                        'No specific preparation briefing uploaded. Review lead status and recent touchpoints before logging notes.'}
                    </div>
                  </div>

                  {/* Linked Existing Follow-Up Tasks List */}
                  {selectedMeeting.followup_tasks && selectedMeeting.followup_tasks.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-gray-900 mb-2">
                        <ListTodo className="w-4 h-4 text-indigo-600" />
                        <span>Existing Follow-Up Action Tasks ({selectedMeeting.followup_tasks.length})</span>
                      </div>
                      <div className="space-y-2">
                        {selectedMeeting.followup_tasks.map((task, idx) => (
                          <div
                            key={task.id || `existing-task-${idx}`}
                            className="p-2.5 bg-white rounded-lg border border-gray-200 flex items-start justify-between gap-2"
                          >
                            <div>
                              <p className="font-semibold text-gray-900">{task.task_description}</p>
                              <div className="flex items-center gap-3 text-2xs text-gray-500 mt-1">
                                <span>Assignee: {task.assigned_user_id}</span>
                                <span>Due: {formatDateOnly(task.due_date_val)}</span>
                              </div>
                            </div>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded text-3xs font-bold',
                                task.is_completed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              )}
                            >
                              {task.is_completed ? 'Completed' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meeting Note Entry Form & Task Assignment Controls [FR-010] */}
                  <form onSubmit={handleSubmitNotes} className="space-y-4 pt-2">
                    <div className="border-t border-gray-200 pt-3">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Log Meeting Notes & Transition Lead Status</span>
                      </h4>

                      {/* Success / Error Banners */}
                      {submitSuccessMsg && (
                        <div
                          data-testid="notes-submit-success-banner"
                          className="mb-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{submitSuccessMsg}</span>
                        </div>
                      )}

                      {submitErrorMsg && (
                        <div
                          data-testid="notes-submit-error-banner"
                          className="mb-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>{submitErrorMsg}</span>
                        </div>
                      )}

                      {/* Meeting Summary Notes Input */}
                      <div className="space-y-1">
                        <label className="block text-2xs font-semibold text-gray-700">
                          Meeting Summary Notes <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          data-testid="meeting-notes-textarea"
                          rows={4}
                          value={formNotes}
                          onChange={(e) => setFormNotes(e.target.value)}
                          placeholder="Log key discussion points, decision outcomes, budget constraints, and next steps..."
                          className="w-full p-2.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          required
                        />
                      </div>

                      {/* Lead Status Transition Dropdown */}
                      <div className="mt-3 space-y-1">
                        <label className="block text-2xs font-semibold text-gray-700">
                          Update Lead Status
                        </label>
                        <select
                          data-testid="lead-status-update-select"
                          value={formLeadStatus}
                          onChange={(e) => setFormLeadStatus(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-gray-800"
                        >
                          <option value="NEW">NEW</option>
                          <option value="CONTACTED">CONTACTED</option>
                          <option value="QUALIFIED">QUALIFIED</option>
                          <option value="PROPOSAL">PROPOSAL</option>
                          <option value="NEGOTIATION">NEGOTIATION</option>
                          <option value="WON">WON</option>
                          <option value="LOST">LOST</option>
                        </select>
                      </div>
                    </div>

                    {/* Follow-Up Task Assignment Controls [FR-010] */}
                    <div className="border-t border-gray-200 pt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-2xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Assign Follow-Up Action Tasks</span>
                          </h5>
                          <p className="text-3xs text-gray-500">
                            Create follow-up tasks with assignees and explicit due dates.
                          </p>
                        </div>

                        <button
                          type="button"
                          data-testid="add-task-row-btn"
                          onClick={handleAddTaskRow}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Task</span>
                        </button>
                      </div>

                      {/* Dynamic Task Rows */}
                      {taskRows.length === 0 ? (
                        <p className="text-2xs text-gray-400 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-center">
                          No new follow-up tasks added. Click "Add Task" to assign post-meeting action items.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {taskRows.map((row, idx) => (
                            <div
                              key={row.id}
                              data-testid={`task-row-${idx}`}
                              className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 relative"
                            >
                              <div className="flex items-center justify-between border-b border-slate-200/60 pb-1">
                                <span className="text-3xs font-bold text-indigo-900 uppercase">
                                  Task Action Item #{idx + 1}
                                </span>
                                <button
                                  type="button"
                                  data-testid={`remove-task-row-${idx}`}
                                  onClick={() => handleRemoveTaskRow(row.id)}
                                  className="text-gray-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                                  title="Remove task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="space-y-2">
                                <div>
                                  <label className="block text-3xs font-medium text-gray-600 mb-0.5">
                                    Task Description <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    data-testid={`task-description-input-${idx}`}
                                    value={row.task_description}
                                    onChange={(e) =>
                                      handleUpdateTaskRow(
                                        row.id,
                                        'task_description',
                                        e.target.value
                                      )
                                    }
                                    placeholder="e.g. Send updated SLA pricing deck to lead"
                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                    required
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-3xs font-medium text-gray-600 mb-0.5">
                                      Assigned User ID <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      data-testid={`task-assignee-input-${idx}`}
                                      value={row.assigned_user_id}
                                      onChange={(e) =>
                                        handleUpdateTaskRow(
                                          row.id,
                                          'assigned_user_id',
                                          e.target.value
                                        )
                                      }
                                      placeholder="usr-101"
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-3xs font-medium text-gray-600 mb-0.5">
                                      Due Date <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                      type="date"
                                      data-testid={`task-due-date-input-${idx}`}
                                      value={row.due_date_val}
                                      onChange={(e) =>
                                        handleUpdateTaskRow(
                                          row.id,
                                          'due_date_val',
                                          e.target.value
                                        )
                                      }
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                      required
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Submit Form Actions */}
                    <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedMeetingId(null)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        data-testid="submit-notes-btn"
                        disabled={isSubmitting || !formNotes.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {isSubmitting ? (
                          <>
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Notes...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Notes & Assign Tasks</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div
                  data-testid="no-meeting-selected-placeholder"
                  className="p-8 border-2 border-dashed border-gray-200 rounded-xl bg-slate-50/50 text-center text-gray-500 sticky top-4"
                >
                  <Briefcase className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-gray-800">
                    No Meeting Selected
                  </h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
                    Select a meeting briefing from the list on the left to read preparation notes, log meeting summary outcomes, update lead status, and assign follow-up action items.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingCalendar;
