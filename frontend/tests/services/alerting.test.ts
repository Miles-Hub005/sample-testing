import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  alertingApi,
  alertingService,
  buildQueryString,
  createTriggerRule,
  deleteTriggerRule,
  getInAppNotifications,
  getNotificationPreferences,
  getTriggerRules,
  listNotificationPreferences,
  listTriggerRules,
  sanitizeUrgency,
  updateNotificationPreference,
  type InAppNotification,
  type NotificationPreference,
  type TriggerRule,
} from '../../src/services/alerting';
import { apiFetch } from '../../src/services/apiClient';

vi.mock('../../src/services/apiClient', async () => {
  const actual = await vi.importActual('../../src/services/apiClient');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

describe('Alerting & Notification Hub API Client Wrapper Service [FR-5, FR-6, FR-7]', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Sanitization & Query Helper Functions', () => {
    it('buildQueryString formats query parameters correctly', () => {
      expect(buildQueryString()).toBe('');
      expect(buildQueryString({})).toBe('');

      const queryStr = buildQueryString({
        unread_only: true,
        role_name: 'financial_admin',
        empty: '',
        nil: null,
        undef: undefined,
      });

      expect(queryStr).toContain('unread_only=true');
      expect(queryStr).toContain('role_name=financial_admin');
      expect(queryStr).not.toContain('empty');
      expect(queryStr).not.toContain('nil');
    });

    it('sanitizeUrgency normalizes urgency string correctly', () => {
      expect(sanitizeUrgency('low')).toBe('Low');
      expect(sanitizeUrgency('  medium  ')).toBe('Medium');
      expect(sanitizeUrgency('HIGH')).toBe('High');
      expect(sanitizeUrgency('CustomUrgency')).toBe('CustomUrgency');
      expect(sanitizeUrgency('')).toBe('Medium');
      expect(sanitizeUrgency(null)).toBe('Medium');
      expect(sanitizeUrgency(undefined)).toBe('Medium');
    });
  });

  describe('In-App Notifications API Client Wrapper [FR-5]', () => {
    it('getInAppNotifications fetches all in-app notifications when unread_only is omitted', async () => {
      const mockNotifications: InAppNotification[] = [
        {
          notification_id: 'n-100',
          recipient_id: 'u-100',
          trigger_id: 't-100',
          urgency: 'High',
          channel: 'InApp',
          delivery_status: 'Sent',
          dispatched_at: '2026-10-06T12:00:00Z',
          correlation_id: 'c-100',
          message: 'Overdue invoice detected',
          read_status: false,
        },
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockNotifications as never);

      const res = await getInAppNotifications();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/notifications/in-app', {
        method: 'GET',
      });
      expect(res).toEqual(mockNotifications);
    });

    it('getInAppNotifications applies unread_only query parameter when specified', async () => {
      const mockNotifications: InAppNotification[] = [];
      vi.mocked(apiFetch).mockResolvedValueOnce(mockNotifications as never);

      const res = await getInAppNotifications({ unread_only: true });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/notifications/in-app?unread_only=true', {
        method: 'GET',
      });
      expect(res).toEqual(mockNotifications);
    });
  });

  describe('Custom Trigger Rules API Client Wrapper [FR-6]', () => {
    it('getTriggerRules lists all trigger rules', async () => {
      const mockTriggers: TriggerRule[] = [
        {
          trigger_id: 't-200',
          rule_name: 'Large Past Due Balance',
          financial_criteria: 'past_due_balance_exceeded',
          threshold_amount: 50000.0,
          urgency: 'High',
          is_active: true,
          created_at: '2026-10-06T10:00:00Z',
          updated_at: '2026-10-06T10:00:00Z',
        },
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockTriggers as never);

      const res = await getTriggerRules();

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/notifications/triggers', {
        method: 'GET',
      });
      expect(res).toEqual(mockTriggers);
    });

    it('listTriggerRules alias functions identically to getTriggerRules', async () => {
      const mockTriggers: TriggerRule[] = [];
      vi.mocked(apiFetch).mockResolvedValueOnce(mockTriggers as never);

      const res = await listTriggerRules();

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/notifications/triggers', {
        method: 'GET',
      });
      expect(res).toEqual(mockTriggers);
    });

    it('createTriggerRule sends POST request with sanitized payload', async () => {
      const input = {
        rule_name: ' High Value Quote Expired ',
        financial_criteria: ' quote_expired ',
        threshold_amount: 100000.0,
        urgency: 'high',
        is_active: true,
      };

      const mockResponse: TriggerRule = {
        trigger_id: 't-300',
        rule_name: 'High Value Quote Expired',
        financial_criteria: 'quote_expired',
        threshold_amount: 100000.0,
        urgency: 'High',
        is_active: true,
        created_at: '2026-10-06T11:00:00Z',
        updated_at: '2026-10-06T11:00:00Z',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce(mockResponse as never);

      const res = await createTriggerRule(input);

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/notifications/triggers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rule_name: 'High Value Quote Expired',
          financial_criteria: 'quote_expired',
          threshold_amount: 100000.0,
          urgency: 'High',
          is_active: true,
        }),
      });
      expect(res).toEqual(mockResponse);
    });

    it('deleteTriggerRule sends DELETE request for target trigger ID', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(undefined as never);

      await deleteTriggerRule(' t-200 ');

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/notifications/triggers/t-200', {
        method: 'DELETE',
      });
    });
  });

  describe('Role-Based Notification Preferences API Client Wrapper [FR-7]', () => {
    it('getNotificationPreferences fetches preferences with optional filters', async () => {
      const mockPreferences: NotificationPreference[] = [
        {
          preference_id: 'p-100',
          role_name: 'financial_admin',
          event_type: 'invoice_overdue',
          urgency: 'High',
          channels_json: ['InApp', 'Email', 'SMS'],
          version: 1,
          created_at: '2026-10-06T10:00:00Z',
          updated_at: '2026-10-06T10:00:00Z',
        },
      ];

      vi.mocked(apiFetch).mockResolvedValueOnce(mockPreferences as never);

      const res = await getNotificationPreferences({
        role_name: ' financial_admin ',
        event_type: ' invoice_overdue ',
      });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/notifications/preferences?role_name=financial_admin&event_type=invoice_overdue',
        { method: 'GET' }
      );
      expect(res).toEqual(mockPreferences);
    });

    it('listNotificationPreferences alias works as expected', async () => {
      const mockPreferences: NotificationPreference[] = [];
      vi.mocked(apiFetch).mockResolvedValueOnce(mockPreferences as never);

      const res = await listNotificationPreferences();

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/notifications/preferences', {
        method: 'GET',
      });
      expect(res).toEqual(mockPreferences);
    });

    it('updateNotificationPreference sends PUT request with optimistic locking version', async () => {
      const input = {
        role_name: ' financial_admin ',
        event_type: ' invoice_overdue ',
        urgency: 'high',
        channels_json: ['InApp', 'Email'],
        version: 2,
      };

      const mockResponse: NotificationPreference = {
        preference_id: 'p-100',
        role_name: 'financial_admin',
        event_type: 'invoice_overdue',
        urgency: 'High',
        channels_json: ['InApp', 'Email'],
        version: 3,
        created_at: '2026-10-06T10:00:00Z',
        updated_at: '2026-10-06T12:00:00Z',
      };

      vi.mocked(apiFetch).mockResolvedValueOnce(mockResponse as never);

      const res = await updateNotificationPreference(input);

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role_name: 'financial_admin',
          event_type: 'invoice_overdue',
          urgency: 'High',
          channels_json: ['InApp', 'Email'],
          version: 2,
        }),
      });
      expect(res).toEqual(mockResponse);
    });
  });

  describe('Service Export Object', () => {
    it('exports all functions under alertingService and alertingApi', () => {
      expect(alertingService.getInAppNotifications).toBe(getInAppNotifications);
      expect(alertingService.getTriggerRules).toBe(getTriggerRules);
      expect(alertingService.createTriggerRule).toBe(createTriggerRule);
      expect(alertingService.deleteTriggerRule).toBe(deleteTriggerRule);
      expect(alertingService.getNotificationPreferences).toBe(getNotificationPreferences);
      expect(alertingService.updateNotificationPreference).toBe(updateNotificationPreference);
      expect(alertingApi).toBe(alertingService);
    });
  });
});
