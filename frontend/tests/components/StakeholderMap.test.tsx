import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  StakeholderMap,
  getInfluenceStyle,
  getActivityTypeConfig,
  formatActivityDate,
  getInitials,
} from '../../src/components/pipeline/StakeholderMap';
import { Stakeholder, StakeholderActivity, dealsApi } from '../../src/services/deals';

// Mock dealsApi
vi.mock('../../src/services/deals', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/deals')>();
  return {
    ...actual,
    dealsApi: {
      ...actual.dealsApi,
      getDealStakeholders: vi.fn(),
      createStakeholder: vi.fn(),
      logStakeholderActivity: vi.fn(),
    },
  };
});

describe('StakeholderMap Component [FR-006, FR-007]', () => {
  const sampleStakeholders: Stakeholder[] = [
    {
      id: 'stk-1',
      deal_id: 'deal-101',
      full_name: 'Sarah Jenkins',
      email: 'sjenkins@enterprise.com',
      org_role: 'Chief Technology Officer',
      influence_level: 'High',
      is_active: true,
      created_on: '2026-10-01T10:00:00Z',
    },
    {
      id: 'stk-2',
      deal_id: 'deal-101',
      full_name: 'Marcus Vance',
      email: 'mvance@enterprise.com',
      org_role: 'Procurement Director',
      influence_level: 'Medium',
      is_active: true,
      created_on: '2026-10-02T11:00:00Z',
    },
    {
      id: 'stk-3',
      deal_id: 'deal-101',
      full_name: 'Elena Rostova',
      email: 'erostova@enterprise.com',
      org_role: 'Legal Counsel',
      influence_level: 'Low',
      is_active: false,
      created_on: '2026-10-03T12:00:00Z',
    },
  ];

  const sampleActivities: StakeholderActivity[] = [
    {
      id: 'act-1',
      stakeholder_id: 'stk-1',
      deal_id: 'deal-101',
      activity_type: 'Meeting',
      summary: 'Executive solution alignment session with CTO.',
      occurred_on: '2026-10-10T14:30:00Z',
      created_on: '2026-10-10T14:30:00Z',
    },
    {
      id: 'act-2',
      stakeholder_id: 'stk-2',
      deal_id: 'deal-101',
      activity_type: 'Email',
      summary: 'Sent updated MSA and SLA proposal documents.',
      occurred_on: '2026-10-12T09:15:00Z',
      created_on: '2026-10-12T09:15:00Z',
    },
    {
      id: 'act-3',
      stakeholder_id: 'stk-1',
      deal_id: 'deal-101',
      activity_type: 'Call',
      summary: 'Follow-up call on technical architecture requirements.',
      occurred_on: '2026-10-14T16:00:00Z',
      created_on: '2026-10-14T16:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Utility Formatting Helpers', () => {
    it('getInfluenceStyle returns correct style configurations', () => {
      const high = getInfluenceStyle('High');
      expect(high.badgeBg).toContain('rose');
      expect(high.label).toBe('High Influence');

      const med = getInfluenceStyle('Medium');
      expect(med.badgeBg).toContain('amber');
      expect(med.label).toBe('Medium Influence');

      const low = getInfluenceStyle('Low');
      expect(low.badgeBg).toContain('slate');
      expect(low.label).toBe('Low Influence');
    });

    it('getActivityTypeConfig returns correct icon and badge configuration', () => {
      const emailCfg = getActivityTypeConfig('Email');
      expect(emailCfg.label).toBe('Email');
      expect(emailCfg.badgeBg).toContain('blue');

      const meetingCfg = getActivityTypeConfig('Meeting');
      expect(meetingCfg.label).toBe('Meeting');
      expect(meetingCfg.badgeBg).toContain('purple');

      const callCfg = getActivityTypeConfig('Call');
      expect(callCfg.label).toBe('Call');
      expect(callCfg.badgeBg).toContain('emerald');

      const noteCfg = getActivityTypeConfig('Note');
      expect(noteCfg.label).toBe('Note');
      expect(noteCfg.badgeBg).toContain('amber');
    });

    it('formatActivityDate formats dates cleanly', () => {
      expect(formatActivityDate(null)).toBe('Recently');
      expect(formatActivityDate(undefined)).toBe('Recently');

      const dateStr = '2026-10-10T14:30:00Z';
      const formatted = formatActivityDate(dateStr);
      expect(formatted).toBeDefined();
    });

    it('getInitials extracts initials from full name', () => {
      expect(getInitials('Sarah Jenkins')).toBe('SJ');
      expect(getInitials('Marcus')).toBe('MA');
      expect(getInitials('Elena Rostova')).toBe('ER');
      expect(getInitials('')).toBe('SC');
      expect(getInitials(null)).toBe('SC');
    });
  });

  describe('Stakeholder Contact Mapping [FR-006]', () => {
    it('renders mapped stakeholder contact details, roles, and influence badges', () => {
      render(
        <StakeholderMap
          initialStakeholders={sampleStakeholders}
          initialActivities={sampleActivities}
        />
      );

      // Check header title
      expect(screen.getByText('Stakeholder Map & Interaction Feed')).toBeDefined();

      // Check contact cards render
      expect(screen.getByTestId('stakeholder-card-stk-1')).toBeDefined();
      expect(screen.getByTestId('stakeholder-card-stk-2')).toBeDefined();
      expect(screen.getByTestId('stakeholder-card-stk-3')).toBeDefined();

      // Check names, roles, emails
      expect(screen.getByTestId('stakeholder-name-stk-1').textContent).toBe('Sarah Jenkins');
      expect(screen.getByTestId('stakeholder-role-stk-1').textContent).toBe(
        'Chief Technology Officer'
      );

      // Check active / inactive status badges [FR-006]
      const activeBadge = screen.getByTestId('active-status-stk-1');
      expect(activeBadge.textContent).toContain('Active');

      const inactiveBadge = screen.getByTestId('active-status-stk-3');
      expect(inactiveBadge.textContent).toContain('Inactive');

      // Check influence badges [FR-006]
      const highBadge = screen.getByTestId('influence-badge-stk-1');
      expect(highBadge.textContent).toContain('High Influence');

      const medBadge = screen.getByTestId('influence-badge-stk-2');
      expect(medBadge.textContent).toContain('Medium Influence');
    });

    it('filters stakeholders by search query and influence level', () => {
      render(
        <StakeholderMap
          initialStakeholders={sampleStakeholders}
          initialActivities={sampleActivities}
        />
      );

      // Search by name "Marcus"
      const searchInput = screen.getByTestId('stakeholder-search');
      fireEvent.change(searchInput, { target: { value: 'Marcus' } });

      expect(screen.getByTestId('stakeholder-card-stk-2')).toBeDefined();
      expect(screen.queryByTestId('stakeholder-card-stk-1')).toBeNull();

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });

      // Filter by High influence
      const influenceSelect = screen.getByTestId('influence-filter');
      fireEvent.change(influenceSelect, { target: { value: 'High' } });

      expect(screen.getByTestId('stakeholder-card-stk-1')).toBeDefined();
      expect(screen.queryByTestId('stakeholder-card-stk-2')).toBeNull();
    });

    it('opens modal and creates a new stakeholder contact', async () => {
      const onCreatedMock = vi.fn();

      render(
        <StakeholderMap
          initialStakeholders={sampleStakeholders}
          initialActivities={sampleActivities}
          onStakeholderCreated={onCreatedMock}
        />
      );

      // Click "Add Contact" button
      const addBtn = screen.getByTestId('add-stakeholder-btn');
      fireEvent.click(addBtn);

      // Verify modal opens
      const form = screen.getByTestId('add-stakeholder-form');
      expect(form).toBeDefined();

      // Fill in form fields
      const nameInput = screen.getByPlaceholderText('e.g. Sarah Jenkins');
      const emailInput = screen.getByPlaceholderText('e.g. sjenkins@acme.com');
      const roleInput = screen.getByPlaceholderText(
        'e.g. Chief Technology Officer / Economic Buyer'
      );

      fireEvent.change(nameInput, { target: { value: 'David Miller' } });
      fireEvent.change(emailInput, { target: { value: 'dmiller@enterprise.com' } });
      fireEvent.change(roleInput, { target: { value: 'VP Engineering' } });

      // Submit form
      fireEvent.submit(form);

      await waitFor(() => {
        expect(onCreatedMock).toHaveBeenCalled();
      });

      const newStakeholder = onCreatedMock.mock.calls[0][0];
      expect(newStakeholder.full_name).toBe('David Miller');
      expect(newStakeholder.email).toBe('dmiller@enterprise.com');
      expect(newStakeholder.org_role).toBe('VP Engineering');

      // Check newly created stakeholder is rendered in list
      expect(screen.getByText('David Miller')).toBeDefined();
    });
  });

  describe('Chronological Interaction Feed [FR-007]', () => {
    it('renders chronological activity feed entries with correct metadata', () => {
      render(
        <StakeholderMap
          initialStakeholders={sampleStakeholders}
          initialActivities={sampleActivities}
        />
      );

      const feed = screen.getByTestId('activity-feed');
      expect(feed).toBeDefined();

      // Check activity items
      expect(screen.getByTestId('activity-item-act-1')).toBeDefined();
      expect(screen.getByTestId('activity-item-act-2')).toBeDefined();
      expect(screen.getByTestId('activity-item-act-3')).toBeDefined();

      // Check summaries and associated contacts
      expect(
        screen.getByText('Executive solution alignment session with CTO.')
      ).toBeDefined();
      expect(
        screen.getByText('Sent updated MSA and SLA proposal documents.')
      ).toBeDefined();
      expect(
        screen.getByText('Follow-up call on technical architecture requirements.')
      ).toBeDefined();
    });

    it('filters activity feed by activity type and specific stakeholder', () => {
      render(
        <StakeholderMap
          initialStakeholders={sampleStakeholders}
          initialActivities={sampleActivities}
        />
      );

      // Filter activity feed by "Call" type
      const typeFilter = screen.getByTestId('activity-type-filter');
      fireEvent.change(typeFilter, { target: { value: 'Call' } });

      expect(screen.getByTestId('activity-item-act-3')).toBeDefined();
      expect(screen.queryByTestId('activity-item-act-1')).toBeNull();
      expect(screen.queryByTestId('activity-item-act-2')).toBeNull();

      // Reset filter
      fireEvent.change(typeFilter, { target: { value: 'ALL' } });

      // Filter feed by specific stakeholder via card "Filter Feed" button
      const card = screen.getByTestId('stakeholder-card-stk-2');
      const filterBtn = card.querySelectorAll('button')[0]; // "Filter Feed"
      fireEvent.click(filterBtn);

      // Act-2 belongs to stk-2, act-1 and act-3 belong to stk-1
      expect(screen.getByTestId('activity-item-act-2')).toBeDefined();
      expect(screen.queryByTestId('activity-item-act-1')).toBeNull();
      expect(screen.queryByTestId('activity-item-act-3')).toBeNull();
    });

    it('opens activity log modal and records new interaction activity', async () => {
      const onLoggedMock = vi.fn();

      render(
        <StakeholderMap
          initialStakeholders={sampleStakeholders}
          initialActivities={sampleActivities}
          onActivityLogged={onLoggedMock}
        />
      );

      // Click "Log Activity" button
      const logBtn = screen.getByTestId('log-activity-btn');
      fireEvent.click(logBtn);

      const form = screen.getByTestId('log-activity-form');
      expect(form).toBeDefined();

      // Fill summary textarea
      const summaryArea = screen.getByPlaceholderText(
        'Summarize key takeaways, action items, or decisions from this interaction...'
      );
      fireEvent.change(summaryArea, {
        target: { value: 'Demonstrated security compliance dashboard to procurement.' },
      });

      // Submit form
      fireEvent.submit(form);

      await waitFor(() => {
        expect(onLoggedMock).toHaveBeenCalled();
      });

      const logged = onLoggedMock.mock.calls[0][0];
      expect(logged.summary).toBe(
        'Demonstrated security compliance dashboard to procurement.'
      );

      // Verify newly logged activity appears in chronological feed
      expect(
        screen.getByText('Demonstrated security compliance dashboard to procurement.')
      ).toBeDefined();
    });
  });

  describe('API Loading, Error, and Empty States', () => {
    it('fetches deal stakeholders and activities from API when dealId is provided', async () => {
      (dealsApi.getDealStakeholders as any).mockResolvedValueOnce({
        stakeholders: sampleStakeholders,
        recent_activities: sampleActivities,
      });

      render(<StakeholderMap dealId="deal-999" />);

      // Verify loading state
      expect(screen.getByTestId('stakeholder-loading')).toBeDefined();

      await waitFor(() => {
        expect(dealsApi.getDealStakeholders).toHaveBeenCalledWith('deal-999');
      });

      // Verify stakeholders and activities loaded
      expect(screen.getByTestId('stakeholder-card-stk-1')).toBeDefined();
      expect(screen.getByTestId('activity-item-act-1')).toBeDefined();
    });

    it('renders error message when API call fails', async () => {
      (dealsApi.getDealStakeholders as any).mockRejectedValueOnce(
        new Error('Network error loading stakeholders')
      );

      render(<StakeholderMap dealId="deal-err" />);

      await waitFor(() => {
        expect(screen.getByTestId('stakeholder-error')).toBeDefined();
      });

      expect(
        screen.getByText('Network error loading stakeholders')
      ).toBeDefined();
    });

    it('renders empty states when no stakeholders or activities exist', () => {
      render(<StakeholderMap initialStakeholders={[]} initialActivities={[]} />);

      expect(screen.getByTestId('no-stakeholders-msg')).toBeDefined();
      expect(screen.getByTestId('no-activities-msg')).toBeDefined();
      expect(screen.getByText('No mapped stakeholders found.')).toBeDefined();
      expect(screen.getByText('No recent interaction activities.')).toBeDefined();
    });
  });
});
