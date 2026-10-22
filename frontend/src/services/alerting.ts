/**
 * Alerting API Client Service Wrapper
 *
 * Connects Next.js frontend components to FastAPI backend notification endpoints
 * (/api/v1/notifications) for fetching in-app alerts, managing custom financial trigger rules,
 * and updating role-based notification channel preferences with optimistic locking.
 *
 * Requirements satisfied: [FR-5, FR-6, FR-7]
 */

import { apiFetch } from './apiClient';

// ============================================================================
// Types, Interfaces & Enums [FR-5, FR-6, FR-7]
// ============================================================================

export type UrgencyLevel = 'Low' | 'Medium' | 'High' | string;
export type DeliveryStatus = 'Sent' | 'Failed' | 'Fallback' | string;

export const ALLOWED_URGENCIES = ['Low', 'Medium', 'High'] as const;
export const ALLOWED_CHANNELS = ['InApp', 'Email', 'SMS'] as const;

/**
 * In-app notification item for the centralized notification hub [FR-5].
 */
export interface InAppNotification {
  notification_id: string;
  recipient_id: string;
  trigger_id?: string | null;
  urgency: UrgencyLevel;
  channel: string;
  delivery_status: DeliveryStatus;
  dispatched_at: string;
  correlation_id: string;
  message?: string | null;
  read_status: boolean;
}

/**
 * Parameters for fetching in-app notifications [FR-5].
 */
export interface GetInAppNotificationsParams {
  unread_only?: boolean;
}

/**
 * Custom financial alert trigger rule representation [FR-6].
 */
export interface TriggerRule {
  trigger_id: string;
  rule_name: string;
  financial_criteria: string;
  threshold_amount: number;
  urgency: UrgencyLevel;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Input payload for creating a custom trigger rule [FR-6].
 */
export interface CreateTriggerInput {
  rule_name: string;
  financial_criteria: string;
  threshold_amount: number;
  urgency?: UrgencyLevel;
  is_active?: boolean;
}

/**
 * Role-based notification preference record with optimistic locking [FR-7].
 */
export interface NotificationPreference {
  preference_id: string;
  role_name: string;
  event_type: string;
  urgency: UrgencyLevel;
  channels_json: string[];
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Parameters for querying notification preferences [FR-7].
 */
export interface GetPreferencesParams {
  role_name?: string | null;
  event_type?: string | null;
}

/**
 * Input payload for updating notification preferences [FR-7].
 */
export interface UpdatePreferenceInput {
  role_name: string;
  event_type: string;
  urgency?: UrgencyLevel;
  channels_json: string[];
  version?: number;
}

// ============================================================================
// Sanitization & Query Helper Functions
// ============================================================================

/**
 * Sanitize and normalize urgency string to 'Low' | 'Medium' | 'High'.
 */
export function sanitizeUrgency(urgency?: string | null): string {
  if (!urgency || typeof urgency !== 'string') {
    return 'Medium';
  }
  const trimmed = urgency.trim();
  if (!trimmed) {
    return 'Medium';
  }
  const matched = ALLOWED_URGENCIES.find(
    (u) => u.toLowerCase() === trimmed.toLowerCase()
  );
  return matched || trimmed;
}

/**
 * Format parameters into URL query string.
 */
export function buildQueryString(
  params?: Record<string, string | number | boolean | null | undefined>
): string {
  if (!params) {
    return '';
  }

  const queryParts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }

  return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
}

// ============================================================================
// API Service Wrapper Methods [FR-5, FR-6, FR-7]
// ============================================================================

/**
 * Fetch in-app system alerts for the centralized notification hub [FR-5].
 *
 * @param params Filter options such as unread_only boolean flag
 * @returns List of in-app notifications
 */
export async function getInAppNotifications(
  params?: GetInAppNotificationsParams
): Promise<InAppNotification[]> {
  const queryParams: Record<string, boolean | undefined> = {};

  if (params?.unread_only !== undefined) {
    queryParams.unread_only = params.unread_only;
  }

  const queryString = buildQueryString(queryParams);
  return apiFetch<InAppNotification[]>(`/api/v1/notifications/in-app${queryString}`, {
    method: 'GET',
  });
}

/**
 * Retrieve all configured custom financial alert trigger rules [FR-6].
 *
 * @returns List of custom trigger rules
 */
export async function getTriggerRules(): Promise<TriggerRule[]> {
  return apiFetch<TriggerRule[]>('/api/v1/notifications/triggers', {
    method: 'GET',
  });
}

/**
 * Alias for getTriggerRules for consistency with backend operation naming [FR-6].
 */
export const listTriggerRules = getTriggerRules;

/**
 * Create a new custom financial alert trigger rule [FR-6].
 *
 * @param input Payload containing rule_name, financial_criteria, threshold_amount, urgency, is_active
 * @returns Newly created TriggerRule object
 */
export async function createTriggerRule(
  input: CreateTriggerInput
): Promise<TriggerRule> {
  const payload = {
    rule_name: input.rule_name.trim(),
    financial_criteria: input.financial_criteria.trim(),
    threshold_amount: input.threshold_amount,
    urgency: sanitizeUrgency(input.urgency),
    is_active: input.is_active ?? true,
  };

  return apiFetch<TriggerRule>('/api/v1/notifications/triggers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Delete an existing custom financial alert trigger rule by ID [FR-6].
 *
 * @param triggerId UUID of the trigger rule to delete
 */
export async function deleteTriggerRule(triggerId: string): Promise<void> {
  const cleanId = triggerId.trim();
  return apiFetch<void>(`/api/v1/notifications/triggers/${encodeURIComponent(cleanId)}`, {
    method: 'DELETE',
  });
}

/**
 * Retrieve role-based notification preferences filtered optionally by role_name or event_type [FR-7].
 *
 * @param params Query parameters for role_name and event_type filters
 * @returns Array of NotificationPreference records
 */
export async function getNotificationPreferences(
  params?: GetPreferencesParams
): Promise<NotificationPreference[]> {
  const queryParams: Record<string, string | undefined> = {};

  if (params?.role_name) {
    const trimmed = params.role_name.trim();
    if (trimmed) {
      queryParams.role_name = trimmed;
    }
  }

  if (params?.event_type) {
    const trimmed = params.event_type.trim();
    if (trimmed) {
      queryParams.event_type = trimmed;
    }
  }

  const queryString = buildQueryString(queryParams);
  return apiFetch<NotificationPreference[]>(
    `/api/v1/notifications/preferences${queryString}`,
    {
      method: 'GET',
    }
  );
}

/**
 * Alias for getNotificationPreferences for consistency with backend naming [FR-7].
 */
export const listNotificationPreferences = getNotificationPreferences;

/**
 * Update role-based notification channel preferences with optimistic locking [FR-7].
 *
 * @param input Payload containing role_name, event_type, urgency, channels_json, version
 * @returns Updated NotificationPreference record
 */
export async function updateNotificationPreference(
  input: UpdatePreferenceInput
): Promise<NotificationPreference> {
  const payload = {
    role_name: input.role_name.trim(),
    event_type: input.event_type.trim(),
    urgency: sanitizeUrgency(input.urgency),
    channels_json: input.channels_json,
    version: input.version ?? 1,
  };

  return apiFetch<NotificationPreference>('/api/v1/notifications/preferences', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

// ============================================================================
// Service Export Object
// ============================================================================

export const alertingService = {
  getInAppNotifications,
  getTriggerRules,
  listTriggerRules,
  createTriggerRule,
  deleteTriggerRule,
  getNotificationPreferences,
  listNotificationPreferences,
  updateNotificationPreference,
  sanitizeUrgency,
  buildQueryString,
};

export const alertingApi = alertingService;
export default alertingService;
