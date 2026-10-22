import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  MeetingCalendar,
  formatMeetingTime,
  formatDateOnly,
  getStatusBadgeColor,
  filterMeetings,
  groupMeetingsByDate,
} from '../../src/components/analytics/MeetingCalendar';
import { LeadMeeting, SubmitNotesResponse } from '../../src/services/analytics';
import * as analyticsService from '../../src/services/analytics';

// Mock analytics service module
vi.mock('../../src/services/analytics', async () => {
  const actual = await vi.importActual('../../src/services/analytics');
  return {
    ...actual,
    getCalendarMeetings: vi.fn(),
    submitMeetingNotes: vi.fn(),
  };
});

describe('MeetingCalendar Component & Helpers [FR-009, FR-010]', () => {
  const mockMeetings: LeadMeeting[] = [
    {
      id: 'mtg-101',
      lead_id: 'lead-001',
      scheduled_time: '2026-10-15T10:00:00Z',
      prep_notes: 'Key prospect interested in enterprise marketing analytics package and custom ROI reports.',
      meeting_notes: 'Discussed Q4 budget requirements. Lead requested revised SLA quote.',
      created_on: '2026-10-01T09:00:00Z',
      lead_status: 'QUALIFIED',
      followup_tasks: [
        {
          id: 'task-1',
          meeting_id: 'mtg-101',
          lead_id: 'lead-001',
          assigned_user_id: 'usr-101',
          due_date_val: '2026-10-18',
          is_completed: false,
          task_description: 'Send revised SLA proposal deck',
          created_on: '2026-10-15T11:00:00Z',
        },
      ],
    },
    {
      id: 'mtg-102',
      lead_id: 'lead-002',
      scheduled_time: '2026-10-16T14:30:00Z',
      prep_notes: 'Initial discovery call with regional sales team regarding territory coverage.',
      meeting_notes: '',
      created_on: '2026-10-02T10:00:00Z',
      lead_status: 'CONTACTED',
      followup_tasks: [],
    },
    {
      id: 'mtg-103',
      lead_id: 'lead-003',
      scheduled_time: '2026-10-17T09:00:00Z',
      prep_notes: 'Final contract review and pricing negotiation briefing.',
      meeting_notes: 'Agreement finalized.',
      created_on: '2026-10-03T11:00:00Z',
      lead_status: 'WON',
      followup_tasks: [],
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Helper Functions [FR-009, FR-010]', () => {
    it('formatMeetingTime formats ISO strings and handles null/invalid dates', () => {
      expect(formatMeetingTime(null)).toBe('Unscheduled');
      expect(formatMeetingTime('')).toBe('Unscheduled');
      expect(formatMeetingTime('invalid-date')).toBe('invalid-date');
      const formatted = formatMeetingTime('2026-10-15T10:00:00Z');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Oct');
    });

    it('formatDateOnly formats YYYY-MM-DD or ISO strings', () => {
      expect(formatDateOnly(null)).toBe('No Due Date');
      expect(formatDateOnly('')).toBe('No Due Date');
      expect(formatDateOnly('invalid-date')).toBe('invalid-date');
      const formatted = formatDateOnly('2026-10-18');
      expect(formatted).toContain('Oct');
      expect(formatted).toContain('18');
    });

    it('getStatusBadgeColor returns appropriate Tailwind CSS classes for lead statuses', () => {
      expect(getStatusBadgeColor('WON')).toContain('emerald');
      expect(getStatusBadgeColor('QUALIFIED')).toContain('emerald');
      expect(getStatusBadgeColor('CONTACTED')).toContain('blue');
      expect(getStatusBadgeColor('PROPOSAL')).toContain('blue');
      expect(getStatusBadgeColor('NEW')).toContain('amber');
      expect(getStatusBadgeColor('LOST')).toContain('rose');
      expect(getStatusBadgeColor(null)).toContain('gray');
    });

    it('filterMeetings filters by search term, status filter, and view mode', () => {
      // Search term
      const searchResult = filterMeetings(mockMeetings, 'enterprise', 'ALL', 'all');
      expect(searchResult.length).toBe(1);
      expect(searchResult[0].lead_id).toBe('lead-001');

      // Status filter
      const statusResult = filterMeetings(mockMeetings, '', 'CONTACTED', 'all');
      expect(statusResult.length).toBe(1);
      expect(statusResult[0].lead_id).toBe('lead-002');

      // View mode 'pending_notes'
      const pendingResult = filterMeetings(mockMeetings, '', 'ALL', 'pending_notes');
      expect(pendingResult.length).toBe(1);
      expect(pendingResult[0].lead_id).toBe('lead-002');

      // View mode 'completed'
      const completedResult = filterMeetings(mockMeetings, '', 'ALL', 'completed');
      expect(completedResult.length).toBe(2);
    });

    it('groupMeetingsByDate groups meetings by date key YYYY-MM-DD', () => {
      const grouped = groupMeetingsByDate(mockMeetings);
      expect(grouped['2026-10-15']).toBeDefined();
      expect(grouped['2026-10-15'].length).toBe(1);
      expect(grouped['2026-10-16']).toBeDefined();
      expect(grouped['2026-10-16'].length).toBe(1);
    });
  });

  describe('MeetingCalendar Component Rendering [FR-009]', () => {
    it('renders component title, metric cards, and scheduled meeting cards', () => {
      render(<MeetingCalendar data={mockMeetings} />);

      expect(screen.getByText('Meeting Prep & Follow-Up Calendar')).toBeInTheDocument();
      expect(screen.getByText('Scheduled Meetings')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total count

      expect(screen.getByText('Lead ID: lead-001')).toBeInTheDocument();
      expect(screen.getByText('Lead ID: lead-002')).toBeInTheDocument();
      expect(screen.getByText('Lead ID: lead-003')).toBeInTheDocument();
    });

    it('renders empty state when filtered meetings list is empty', () => {
      render(<MeetingCalendar data={[]} />);

      expect(screen.getByTestId('empty-calendar-state')).toBeInTheDocument();
      expect(screen.getByText('No Scheduled Meetings Found')).toBeInTheDocument();
    });

    it('renders error banner when error prop is provided', () => {
      render(
        <MeetingCalendar
          data={[]}
          error="Failed to load meeting calendar from server."
        />
      );

      expect(screen.getByText('Meeting Calendar Error')).toBeInTheDocument();
      expect(
        screen.getByText('Failed to load meeting calendar from server.')
      ).toBeInTheDocument();
    });

    it('fetches calendar meetings from API when data prop is omitted', async () => {
      vi.spyOn(analyticsService, 'getCalendarMeetings').mockResolvedValue(mockMeetings);

      render(<MeetingCalendar />);

      await waitFor(() => {
        expect(analyticsService.getCalendarMeetings).toHaveBeenCalled();
        expect(screen.getByText('Lead ID: lead-001')).toBeInTheDocument();
      });
    });
  });

  describe('Meeting Briefing Inspection & Note Submission [FR-009, FR-010]', () => {
    it('displays preparation briefing when a meeting card is clicked [FR-009]', () => {
      render(<MeetingCalendar data={mockMeetings} />);

      // Click on first meeting card
      const card = screen.getByTestId('meeting-card-mtg-101');
      fireEvent.click(card);

      expect(screen.getByTestId('selected-meeting-panel')).toBeInTheDocument();
      expect(screen.getByText('Meeting Briefing & Notes: lead-001')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Key prospect interested in enterprise marketing analytics package and custom ROI reports.'
        )
      ).toBeInTheDocument();
    });

    it('allows logging notes, adding follow-up task rows, and submitting form [FR-010]', async () => {
      const mockResponse: SubmitNotesResponse = {
        meeting: { id: 'mtg-102', lead_id: 'lead-002' },
        created_tasks: [
          {
            id: 'task-new-1',
            meeting_id: 'mtg-102',
            lead_id: 'lead-002',
            assigned_user_id: 'usr-202',
            due_date_val: '2026-10-25',
            is_completed: false,
            task_description: 'Schedule technical integration call',
            created_on: '2026-10-16T15:00:00Z',
          },
        ],
        lead_status: 'PROPOSAL',
        lead_id: 'lead-002',
      };

      vi.spyOn(analyticsService, 'submitMeetingNotes').mockResolvedValue(
        mockResponse
      );

      const onNotesSubmitMock = vi.fn();

      render(
        <MeetingCalendar
          data={mockMeetings}
          onNotesSubmit={onNotesSubmitMock}
        />
      );

      // Click meeting mtg-102 (pending notes)
      const card = screen.getByTestId('meeting-card-mtg-102');
      fireEvent.click(card);

      // Enter meeting notes
      const notesTextarea = screen.getByTestId('meeting-notes-textarea');
      fireEvent.change(notesTextarea, {
        target: {
          value: 'Discovery call completed. Client requested technical integration details.',
        },
      });

      // Update lead status
      const statusSelect = screen.getByTestId('lead-status-update-select');
      fireEvent.change(statusSelect, { target: { value: 'PROPOSAL' } });

      // Click Add Task button
      const addTaskBtn = screen.getByTestId('add-task-row-btn');
      fireEvent.click(addTaskBtn);

      // Fill in task inputs
      const descInput = screen.getByTestId('task-description-input-0');
      const assigneeInput = screen.getByTestId('task-assignee-input-0');
      const dueDateInput = screen.getByTestId('task-due-date-input-0');

      fireEvent.change(descInput, {
        target: { value: 'Schedule technical integration call' },
      });
      fireEvent.change(assigneeInput, { target: { value: 'usr-202' } });
      fireEvent.change(dueDateInput, { target: { value: '2026-10-25' } });

      // Submit form
      const submitBtn = screen.getByTestId('submit-notes-btn');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(analyticsService.submitMeetingNotes).toHaveBeenCalledWith(
          'mtg-102',
          {
            meeting_notes:
              'Discovery call completed. Client requested technical integration details.',
            prep_notes:
              'Initial discovery call with regional sales team regarding territory coverage.',
            lead_status: 'PROPOSAL',
            tasks: [
              {
                task_description: 'Schedule technical integration call',
                assigned_user_id: 'usr-202',
                due_date_val: '2026-10-25',
                is_completed: false,
              },
            ],
          }
        );
        expect(screen.getByTestId('notes-submit-success-banner')).toBeInTheDocument();
        expect(onNotesSubmitMock).toHaveBeenCalledWith('mtg-102', mockResponse);
      });
    });

    it('shows error banner when form submission fails', async () => {
      vi.spyOn(analyticsService, 'submitMeetingNotes').mockRejectedValue(
        new Error('Network error logging meeting notes.')
      );

      render(<MeetingCalendar data={mockMeetings} />);

      // Select mtg-101
      fireEvent.click(screen.getByTestId('meeting-card-mtg-101'));

      // Submit form
      const submitBtn = screen.getByTestId('submit-notes-btn');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('notes-submit-error-banner')).toBeInTheDocument();
        expect(
          screen.getByText('Network error logging meeting notes.')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Filtering & View Modes', () => {
    it('filters meetings when search query is typed', () => {
      render(<MeetingCalendar data={mockMeetings} />);

      const searchInput = screen.getByTestId('calendar-search-input');
      fireEvent.change(searchInput, { target: { value: 'enterprise' } });

      expect(screen.getByText('Lead ID: lead-001')).toBeInTheDocument();
      expect(screen.queryByText('Lead ID: lead-002')).not.toBeInTheDocument();
    });

    it('filters meetings by status dropdown', () => {
      render(<MeetingCalendar data={mockMeetings} />);

      const statusSelect = screen.getByTestId('status-filter-select');
      fireEvent.change(statusSelect, { target: { value: 'WON' } });

      expect(screen.getByText('Lead ID: lead-003')).toBeInTheDocument();
      expect(screen.queryByText('Lead ID: lead-001')).not.toBeInTheDocument();
    });

    it('switches view mode between All, Pending Notes, and Notes Logged', () => {
      render(<MeetingCalendar data={mockMeetings} />);

      // Switch to Pending Notes
      const pendingBtn = screen.getByTestId('view-pending-btn');
      fireEvent.click(pendingBtn);

      expect(screen.getByText('Lead ID: lead-002')).toBeInTheDocument();
      expect(screen.queryByText('Lead ID: lead-001')).not.toBeInTheDocument();

      // Switch to Notes Logged
      const completedBtn = screen.getByTestId('view-completed-btn');
      fireEvent.click(completedBtn);

      expect(screen.getByText('Lead ID: lead-001')).toBeInTheDocument();
      expect(screen.getByText('Lead ID: lead-003')).toBeInTheDocument();
      expect(screen.queryByText('Lead ID: lead-002')).not.toBeInTheDocument();
    });
  });
});
