import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationHub } from '../../src/components/alerting/NotificationHub';
import {
  InAppNotification,
  TriggerRule,
  NotificationPreference,
} from '../../src/services/alerting';
import * as alertingService from '../../src/services/alerting';

// Mock alerting service
vi.mock('../../src/services/alerting', async () => {
  const actual = await vi.importActual('../../src/services/alerting');
  return {
    ...actual,
    getInAppNotifications: vi.fn(),
    getTriggerRules: vi.fn(),
    createTriggerRule: vi.fn(),
    deleteTriggerRule: vi.fn(),
    getNotificationPreferences: vi.fn(),
    updateNotificationPreference: vi.fn(),
  };
});

describe('NotificationHub Component [FR-5, FR-6, FR-7]', () => {
  const mockNotifications: InAppNotification[] = [
    {
      notification_id: 'n-101',
      recipient_id: 'u-101',
      trigger_id: 't-101',
      urgency: 'High',
      channel: 'InApp',
      delivery_status: 'Sent',
      dispatched_at: '2026-10-06T12:00:00Z',
      correlation_id: 'corr-101',
      message: 'Overdue invoice $15,000 detected',
      read_status: false,
    },
    {
      notification_id: 'n-102',
      recipient_id: 'u-101',
      trigger_id: null,
      urgency: 'Low',
      channel: 'Email',
      delivery_status: 'Sent',
      dispatched_at: '2026-10-05T09:30:00Z',
      correlation_id: 'corr-102',
      message: 'Quote Q-2026-001 approved',
      read_status: true,
    },
  ];

  const mockTriggers: TriggerRule[] = [
    {
      trigger_id: 't-101',
      rule_name: 'Overdue Invoice > $10k',
      financial_criteria: 'Invoice Past Due > 30 Days',
      threshold_amount: 10000.0,
      urgency: 'High',
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
    {
      trigger_id: 't-102',
      rule_name: 'Large Payment Received',
      financial_criteria: 'Payment Received',
      threshold_amount: 50000.0,
      urgency: 'Medium',
      is_active: false,
      created_at: '2026-10-02T00:00:00Z',
      updated_at: '2026-10-02T00:00:00Z',
    },
  ];

  const mockPreferences: NotificationPreference[] = [
    {
      preference_id: 'p-101',
      role_name: 'financial_admin',
      event_type: 'invoice_past_due',
      urgency: 'High',
      channels_json: ['InApp', 'Email'],
      version: 1,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
    {
      preference_id: 'p-102',
      role_name: 'sales_rep',
      event_type: 'quote_expired',
      urgency: 'Medium',
      channels_json: ['InApp'],
      version: 2,
      created_at: '2026-10-02T00:00:00Z',
      updated_at: '2026-10-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mocked(alertingService.getInAppNotifications).mockResolvedValue(mockNotifications);
    vi.mocked(alertingService.getTriggerRules).mockResolvedValue(mockTriggers);
    vi.mocked(alertingService.getNotificationPreferences).mockResolvedValue(mockPreferences);
  });

  describe('Tab Navigation & Structure', () => {
    it('renders header, title, and three primary tabs', () => {
      render(
        <NotificationHub
          notifications={mockNotifications}
          triggers={mockTriggers}
          preferences={mockPreferences}
        />
      );

      expect(screen.getByText('Centralized Notification Hub')).toBeInTheDocument();
      expect(screen.getByTestId('tab-alerts-btn')).toBeInTheDocument();
      expect(screen.getByTestId('tab-triggers-btn')).toBeInTheDocument();
      expect(screen.getByTestId('tab-preferences-btn')).toBeInTheDocument();
    });

    it('switches between tabs when clicked', () => {
      render(
        <NotificationHub
          notifications={mockNotifications}
          triggers={mockTriggers}
          preferences={mockPreferences}
        />
      );

      // Default tab: Alerts
      expect(screen.getByTestId('alerts-panel')).toBeInTheDocument();

      // Click Triggers tab
      fireEvent.click(screen.getByTestId('tab-triggers-btn'));
      expect(screen.getByTestId('triggers-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('alerts-panel')).not.toBeInTheDocument();

      // Click Preferences tab
      fireEvent.click(screen.getByTestId('tab-preferences-btn'));
      expect(screen.getByTestId('preferences-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('triggers-panel')).not.toBeInTheDocument();
    });
  });

  describe('In-App Alerts Tab [FR-5]', () => {
    it('displays in-app notifications with message, urgency, delivery status, and timestamp', () => {
      render(
        <NotificationHub
          notifications={mockNotifications}
          triggers={mockTriggers}
          preferences={mockPreferences}
        />
      );

      expect(screen.getByText('Overdue invoice $15,000 detected')).toBeInTheDocument();
      expect(screen.getByText('Quote Q-2026-001 approved')).toBeInTheDocument();
      expect(screen.getByText('Correlation: corr-101')).toBeInTheDocument();
      expect(screen.getByText('New')).toBeInTheDocument(); // Unread indicator badge
    });

    it('filters notifications by unread_only', () => {
      render(
        <NotificationHub
          notifications={mockNotifications}
          triggers={mockTriggers}
          preferences={mockPreferences}
        />
      );

      const checkbox = screen.getByTestId('unread-only-checkbox');
      fireEvent.click(checkbox);

      // Should show unread notification, but hide read one
      expect(screen.getByText('Overdue invoice $15,000 detected')).toBeInTheDocument();
      expect(screen.queryByText('Quote Q-2026-001 approved')).not.toBeInTheDocument();
    });

    it('filters notifications by search query', () => {
      render(
        <NotificationHub
          notifications={mockNotifications}
          triggers={mockTriggers}
          preferences={mockPreferences}
        />
      );

      const searchInput = screen.getByTestId('alert-search-input');
      fireEvent.change(searchInput, { target: { value: 'corr-102' } });

      expect(screen.queryByText('Overdue invoice $15,000 detected')).not.toBeInTheDocument();
      expect(screen.getByText('Quote Q-2026-001 approved')).toBeInTheDocument();
    });

    it('toggles read status when button clicked', () => {
      const onToggle = vi.fn();
      render(
        <NotificationHub
          notifications={mockNotifications}
          triggers={mockTriggers}
          preferences={mockPreferences}
          onNotificationReadToggle={onToggle}
        />
      );

      const btn = screen.getByTestId('toggle-read-btn-n-101');
      expect(btn).toHaveTextContent('Mark as Read');

      fireEvent.click(btn);
      expect(onToggle).toHaveBeenCalledWith('n-101');
      expect(btn).toHaveTextContent('Mark Unread');
    });

    it('marks all notifications as read when "Mark All Read" clicked', () => {
      render(
        <NotificationHub
          notifications={mockNotifications}
          triggers={mockTriggers}
          preferences={mockPreferences}
        />
      );

      const markAllBtn = screen.getByTestId('mark-all-read-btn');
      fireEvent.click(markAllBtn);

      expect(screen.queryByText('New')).not.toBeInTheDocument();
    });

    it('renders empty state when no alerts match filters', () => {
      render(
        <NotificationHub
          notifications={[]}
          triggers={mockTriggers}
          preferences={mockPreferences}
        />
      );

      expect(screen.getByTestId('alerts-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No System Alerts Found')).toBeInTheDocument();
    });
  });

  describe('Custom Financial Trigger Rules Tab [FR-6]', () => {
    it('displays custom trigger rules table with threshold formatted as currency', () => {
      render(
        <NotificationHub
          notifications={mockNotifications}
          triggers={mockTriggers}
          preferences={mockPreferences}
          initialTab="triggers"
        />
      );

      expect(screen.getByText('Overdue Invoice > $10k')).toBeInTheDocument();
      expect(screen.getByText('Invoice Past Due > 30 Days')).toBeInTheDocument();
      expect(screen.getByText('$10,000.00')).toBeInTheDocument();
      expect(screen.getByText('$50,000.00')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    it('opens create trigger form and validates required inputs', async () => {
      render(
        <NotificationHub
          notifications={mockNotifications}
          triggers={mockTriggers}
          preferences={mockPreferences}
          initialTab="triggers"
        />
      );

      // Open form
      fireEvent.click(screen.getByTestId('toggle-create-trigger-btn'));
      expect(screen.getByTestId('create-trigger-form-panel')).toBeInTheDocument();

      // Submit without filling fields
      fireEvent.click(screen.getByTestId('submit-trigger-btn'));
      expect(screen.getByText('Rule name is required.')).toBeInTheDocument();
    });

    it('submits create trigger form successfully and triggers callback', async () => {
      const createdRule: TriggerRule = {
        trigger_id: 't-999',
        rule_name: 'High AR Risk Alert',
        financial_criteria: 'AR Aging Bucket 90+ Exceeded',
        threshold_amount: 25000.0,
        urgency: 'High',
        is_active: true,
        created_at: '2026-10-06T00:00:00Z',
        updated_at: '2026-10-06T00:00:00Z',
      };

      vi.mocked(alertingService.createTriggerRule).mockResolvedValueOnce(createdRule);
      const onCreated = vi.fn();

      render(
        <NotificationHub
          notifications={mockNotifications}
          triggers={mockTriggers}
          preferences={mockPreferences}
          initialTab="triggers"
          onTriggerCreated={onCreated}
        />
      );

      fireEvent.click(screen.getByTestId('toggle-create-trigger-btn'));

      fireEvent.change(screen.getByTestId('rule-name-input'), {
        target: { value: 'High AR Risk Alert' },
      });
      fireEvent.change(screen.getByTestId('financial-criteria-input'), {
        target: { value: 'AR Aging Bucket 90+ Exceeded' },
      });
      fireEvent.change(screen.getByTestId('threshold-amount-input'), {
        target: { value: '25000' },
      });

      fireEvent.click(screen.getByTestId('submit-trigger-btn'));

      await waitFor(() => {
        expect(alertingService.createTriggerRule).toHaveBeenCalledWith({
          rule_name: 'High AR Risk Alert',
          financial_criteria: 'AR Aging Bucket 90+ Exceeded',
          threshold_amount: 25000,
          urgency: 'High',
          is_active: true,
        });
        expect(onCreated).toHaveBeenCalledWith(createdRule);
        expect(screen.getByText('High AR Risk Alert')).toBeInTheDocument();
      });
    });

    it('deletes trigger rule when delete button clicked', async () => {
      vi.mocked(alertingService.deleteTriggerRule).mockResolvedValueOnce();
      const onDeleted = vi.fn();

      render(
        <NotificationHub
          notifications={mockNotifications}
          triggers={mockTriggers}
          preferences={mockPreferences}
          initialTab="triggers"
          onTriggerDeleted={onDeleted}
        />
      );

      const deleteBtn = screen.getByTestId('delete-trigger-btn-t-101');
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(alertingService.deleteTriggerRule).toHaveBeenCalledWith('t-101');
        expect(onDeleted).toHaveBeenCalledWith('t-101');
        expect(screen.queryByText('Overdue Invoice > $10k')).not.toBeInTheDocument();
      });
    });
  });

  describe('Role Notification Preferences Tab [FR-7]', () => {
    it('renders role preferences cards with role name, event type, urgency, and active channels', () => {
      render(
        <NotificationHub
          notifications={mockNotifications}
          triggers={mockTriggers}
          preferences={mockPreferences}
          initialTab="preferences"
        />
      );

      expect(screen.getByText('Role: financial_admin')).toBeInTheDocument();
      expect(screen.getByText('invoice_past_due')).toBeInTheDocument();
      expect(screen.getByText('Role: sales_rep')).toBeInTheDocument();
      expect(screen.getByText('quote_expired')).toBeInTheDocument();
    });

    it('toggles channel checkboxes and saves updated preferences', async () => {
      const updatedPref: NotificationPreference = {
        ...mockPreferences[0],
        channels_json: ['InApp', 'Email', 'SMS'],
        version: 2,
      };

      vi.mocked(alertingService.updateNotificationPreference).mockResolvedValueOnce(
        updatedPref
      );
      const onUpdated = vi.fn();

      render(
        <NotificationHub
          notifications={mockNotifications}
          triggers={mockTriggers}
          preferences={mockPreferences}
          initialTab="preferences"
          onPreferenceUpdated={onUpdated}
        />
      );

      // Toggle SMS checkbox on p-101
      const smsCheckbox = screen.getByTestId('toggle-channel-sms-p-101');
      fireEvent.click(smsCheckbox);

      // Click save button
      const saveBtn = screen.getByTestId('save-pref-btn-p-101');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(alertingService.updateNotificationPreference).toHaveBeenCalledWith({
          role_name: 'financial_admin',
          event_type: 'invoice_past_due',
          urgency: 'High',
          channels_json: ['InApp', 'Email', 'SMS'],
          version: 1, // Sent current version 1
        });
        expect(onUpdated).toHaveBeenCalledWith(updatedPref);
      });
    });

    it('displays 409 Conflict version mismatch error banner if concurrency issue occurs', async () => {
      const conflictError: any = new Error('HTTP 409 Conflict: Version mismatch');
      conflictError.status = 409;

      vi.mocked(alertingService.updateNotificationPreference).mockRejectedValueOnce(
        conflictError
      );

      render(
        <NotificationHub
          notifications={mockNotifications}
          triggers={mockTriggers}
          preferences={mockPreferences}
          initialTab="preferences"
        />
      );

      const saveBtn = screen.getByTestId('save-pref-btn-p-101');
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(screen.getByTestId('pref-conflict-banner')).toBeInTheDocument();
        expect(
          screen.getByText(/Concurrency conflict detected: This role preference was updated by another process/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Self-fetching Behavior', () => {
    it('self-fetches notifications, triggers, and preferences when props omitted', async () => {
      render(<NotificationHub />);

      await waitFor(() => {
        expect(alertingService.getInAppNotifications).toHaveBeenCalledTimes(1);
        expect(alertingService.getTriggerRules).toHaveBeenCalledTimes(1);
        expect(alertingService.getNotificationPreferences).toHaveBeenCalledTimes(1);
      });
    });
  });
});
