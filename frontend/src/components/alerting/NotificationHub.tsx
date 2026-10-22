'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  Sliders,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  ShieldAlert,
  Clock,
  Mail,
  MessageSquare,
  AlertCircle,
  Info,
  X,
  Zap,
  Save,
  Volume2,
  RotateCw,
} from 'lucide-react';
import {
  InAppNotification,
  TriggerRule,
  NotificationPreference,
  CreateTriggerInput,
  UpdatePreferenceInput,
  UrgencyLevel,
  ALLOWED_URGENCIES,
  ALLOWED_CHANNELS,
  getInAppNotifications,
  getTriggerRules,
  createTriggerRule,
  deleteTriggerRule,
  getNotificationPreferences,
  updateNotificationPreference,
  sanitizeUrgency,
} from '../../services/alerting';
import { StatusLabel } from '../common/StatusLabel';
import { cn } from '../../lib/utils';

// ============================================================================
// Types & Props Contract [FR-5, FR-6, FR-7]
// ============================================================================

export type ActiveAlertTab = 'alerts' | 'triggers' | 'preferences';

export interface NotificationHubProps {
  /**
   * Pre-loaded in-app notifications. If omitted or null, component self-fetches via getInAppNotifications().
   */
  notifications?: InAppNotification[] | null;

  /**
   * Pre-loaded custom trigger rules. If omitted or null, component self-fetches via getTriggerRules().
   */
  triggers?: TriggerRule[] | null;

  /**
   * Pre-loaded role notification preferences. If omitted or null, component self-fetches via getNotificationPreferences().
   */
  preferences?: NotificationPreference[] | null;

  /**
   * Initial active tab (default: 'alerts').
   */
  initialTab?: ActiveAlertTab;

  /**
   * Controlled loading indicator.
   */
  isLoading?: boolean;

  /**
   * Controlled error message or Error object.
   */
  error?: string | Error | null;

  /**
   * Callback invoked when a trigger rule is created.
   */
  onTriggerCreated?: (trigger: TriggerRule) => void;

  /**
   * Callback invoked when a trigger rule is deleted.
   */
  onTriggerDeleted?: (triggerId: string) => void;

  /**
   * Callback invoked when a preference is updated.
   */
  onPreferenceUpdated?: (preference: NotificationPreference) => void;

  /**
   * Callback invoked when notification read state is toggled.
   */
  onNotificationReadToggle?: (notificationId: string) => void;
}

// ============================================================================
// Helper Formatting Functions
// ============================================================================

/**
 * Formats a number as USD currency string.
 */
function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats an ISO timestamp string into a readable format.
 */
function formatDate(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

// Predefined financial criteria options for quick selection
const COMMON_FINANCIAL_CRITERIA = [
  'Invoice Past Due > 30 Days',
  'Quote Amount Exceeds Threshold',
  'Payment Failed',
  'AR Aging Bucket 90+ Exceeded',
  'High Value Payment Received',
  'Quote Approval State Expired',
];

// Predefined roles for quick preference mapping
const COMMON_ROLES = ['financial_admin', 'sales_rep', 'executive', 'billing_specialist'];

// Predefined event types for preference mapping
const COMMON_EVENT_TYPES = [
  'quote_expired',
  'invoice_past_due',
  'payment_failed',
  'ar_threshold_breach',
  'large_discount_applied',
];

// ============================================================================
// NotificationHub Component Implementation [FR-5, FR-6, FR-7]
// ============================================================================

export const NotificationHub: React.FC<NotificationHubProps> = ({
  notifications: propsNotifications,
  triggers: propsTriggers,
  preferences: propsPreferences,
  initialTab = 'alerts',
  isLoading: propsIsLoading,
  error: propsError,
  onTriggerCreated,
  onTriggerDeleted,
  onPreferenceUpdated,
  onNotificationReadToggle,
}) => {
  // Navigation & Tab state
  const [activeTab, setActiveTab] = useState<ActiveAlertTab>(initialTab);

  // Alert Notifications state [FR-5]
  const [notifications, setNotifications] = useState<InAppNotification[]>(
    propsNotifications || []
  );
  const [alertsLoading, setAlertsLoading] = useState<boolean>(!propsNotifications);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [unreadOnlyFilter, setUnreadOnlyFilter] = useState<boolean>(false);
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [alertSearchQuery, setAlertSearchQuery] = useState<string>('');

  // Custom Trigger Rules state [FR-6]
  const [triggers, setTriggers] = useState<TriggerRule[]>(propsTriggers || []);
  const [triggersLoading, setTriggersLoading] = useState<boolean>(!propsTriggers);
  const [triggersError, setTriggersError] = useState<string | null>(null);
  const [triggerSearchQuery, setTriggerSearchQuery] = useState<string>('');
  const [isCreateTriggerOpen, setIsCreateTriggerOpen] = useState<boolean>(false);
  const [deletingTriggerId, setDeletingTriggerId] = useState<string | null>(null);

  // New Trigger Form state [FR-6]
  const [newRuleName, setNewRuleName] = useState<string>('');
  const [newFinancialCriteria, setNewFinancialCriteria] = useState<string>('');
  const [newThresholdAmount, setNewThresholdAmount] = useState<string>('');
  const [newUrgency, setNewUrgency] = useState<UrgencyLevel>('High');
  const [newIsActive, setNewIsActive] = useState<boolean>(true);
  const [triggerFormError, setTriggerFormError] = useState<string | null>(null);
  const [isSubmittingTrigger, setIsSubmittingTrigger] = useState<boolean>(false);

  // Role Notification Preferences state [FR-7]
  const [preferences, setPreferences] = useState<NotificationPreference[]>(
    propsPreferences || []
  );
  const [preferencesLoading, setPreferencesLoading] = useState<boolean>(!propsPreferences);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [savingPrefId, setSavingPrefId] = useState<string | null>(null);
  const [prefConflictError, setPrefConflictError] = useState<string | null>(null);

  // Add New Preference Modal / Form state [FR-7]
  const [isAddPrefOpen, setIsAddPrefOpen] = useState<boolean>(false);
  const [newPrefRole, setNewPrefRole] = useState<string>('financial_admin');
  const [newPrefEventType, setNewPrefEventType] = useState<string>('invoice_past_due');
  const [newPrefUrgency, setNewPrefUrgency] = useState<UrgencyLevel>('High');
  const [newPrefChannels, setNewPrefChannels] = useState<string[]>(['InApp', 'Email']);
  const [newPrefFormError, setNewPrefFormError] = useState<string | null>(null);
  const [isSubmittingPref, setIsSubmittingPref] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // Data Fetching Effects [FR-5, FR-6, FR-7]
  // --------------------------------------------------------------------------

  // Sync props to internal state when props change
  useEffect(() => {
    if (propsNotifications) {
      setNotifications(propsNotifications);
      setAlertsLoading(false);
    }
  }, [propsNotifications]);

  useEffect(() => {
    if (propsTriggers) {
      setTriggers(propsTriggers);
      setTriggersLoading(false);
    }
  }, [propsTriggers]);

  useEffect(() => {
    if (propsPreferences) {
      setPreferences(propsPreferences);
      setPreferencesLoading(false);
    }
  }, [propsPreferences]);

  // Fetch Notifications [FR-5]
  const fetchNotifications = useCallback(async () => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const data = await getInAppNotifications({ unread_only: unreadOnlyFilter });
      setNotifications(data || []);
    } catch (err: any) {
      setAlertsError(err?.message || 'Failed to fetch in-app notifications.');
    } finally {
      setAlertsLoading(false);
    }
  }, [unreadOnlyFilter]);

  // Fetch Triggers [FR-6]
  const fetchTriggers = useCallback(async () => {
    setTriggersLoading(true);
    setTriggersError(null);
    try {
      const data = await getTriggerRules();
      setTriggers(data || []);
    } catch (err: any) {
      setTriggersError(err?.message || 'Failed to fetch custom trigger rules.');
    } finally {
      setTriggersLoading(false);
    }
  }, []);

  // Fetch Preferences [FR-7]
  const fetchPreferences = useCallback(async () => {
    setPreferencesLoading(true);
    setPreferencesError(null);
    setPrefConflictError(null);
    try {
      const data = await getNotificationPreferences();
      setPreferences(data || []);
    } catch (err: any) {
      setPreferencesError(err?.message || 'Failed to fetch notification preferences.');
    } finally {
      setPreferencesLoading(false);
    }
  }, []);

  // Self-fetch on mount if props not supplied
  useEffect(() => {
    if (!propsNotifications) {
      fetchNotifications();
    }
  }, [propsNotifications, fetchNotifications]);

  useEffect(() => {
    if (!propsTriggers) {
      fetchTriggers();
    }
  }, [propsTriggers, fetchTriggers]);

  useEffect(() => {
    if (!propsPreferences) {
      fetchPreferences();
    }
  }, [propsPreferences, fetchPreferences]);

  // Combined Loading & Error overrides
  const overallLoading =
    propsIsLoading ||
    (activeTab === 'alerts' && alertsLoading) ||
    (activeTab === 'triggers' && triggersLoading) ||
    (activeTab === 'preferences' && preferencesLoading);

  const overallError =
    propsError ||
    (activeTab === 'alerts' && alertsError) ||
    (activeTab === 'triggers' && triggersError) ||
    (activeTab === 'preferences' && (preferencesError || prefConflictError));

  // --------------------------------------------------------------------------
  // Derived / Filtered Data Computations [FR-5, FR-6, FR-7]
  // --------------------------------------------------------------------------

  // In-App Notifications filtered [FR-5]
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // Unread filter
      if (unreadOnlyFilter && item.read_status) {
        return false;
      }
      // Urgency filter
      if (urgencyFilter !== 'all') {
        if (
          sanitizeUrgency(item.urgency).toLowerCase() !== urgencyFilter.toLowerCase()
        ) {
          return false;
        }
      }
      // Search query filter
      if (alertSearchQuery.trim()) {
        const query = alertSearchQuery.toLowerCase();
        const msgMatch = (item.message || '').toLowerCase().includes(query);
        const corrMatch = (item.correlation_id || '').toLowerCase().includes(query);
        const channelMatch = (item.channel || '').toLowerCase().includes(query);
        if (!msgMatch && !corrMatch && !channelMatch) {
          return false;
        }
      }
      return true;
    });
  }, [notifications, unreadOnlyFilter, urgencyFilter, alertSearchQuery]);

  const unreadAlertCount = useMemo(() => {
    return notifications.filter((n) => !n.read_status).length;
  }, [notifications]);

  // Trigger Rules filtered [FR-6]
  const filteredTriggers = useMemo(() => {
    if (!triggerSearchQuery.trim()) {
      return triggers;
    }
    const q = triggerSearchQuery.toLowerCase();
    return triggers.filter(
      (t) =>
        t.rule_name.toLowerCase().includes(q) ||
        t.financial_criteria.toLowerCase().includes(q) ||
        t.urgency.toLowerCase().includes(q)
    );
  }, [triggers, triggerSearchQuery]);

  // Preferences filtered [FR-7]
  const filteredPreferences = useMemo(() => {
    return preferences.filter((p) => {
      if (roleFilter !== 'all' && p.role_name.toLowerCase() !== roleFilter.toLowerCase()) {
        return false;
      }
      if (
        eventFilter !== 'all' &&
        p.event_type.toLowerCase() !== eventFilter.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [preferences, roleFilter, eventFilter]);

  // Extract unique roles and event types for preference filters
  const uniqueRoles = useMemo(() => {
    const rolesSet = new Set<string>(COMMON_ROLES);
    preferences.forEach((p) => {
      if (p.role_name) rolesSet.add(p.role_name);
    });
    return Array.from(rolesSet);
  }, [preferences]);

  const uniqueEventTypes = useMemo(() => {
    const eventsSet = new Set<string>(COMMON_EVENT_TYPES);
    preferences.forEach((p) => {
      if (p.event_type) eventsSet.add(p.event_type);
    });
    return Array.from(eventsSet);
  }, [preferences]);

  // --------------------------------------------------------------------------
  // Event Handlers — Alerts [FR-5]
  // --------------------------------------------------------------------------

  const handleToggleReadStatus = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((item) =>
        item.notification_id === notificationId
          ? { ...item, read_status: !item.read_status }
          : item
      )
    );
    if (onNotificationReadToggle) {
      onNotificationReadToggle(notificationId);
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read_status: true })));
  };

  // --------------------------------------------------------------------------
  // Event Handlers — Trigger Rules [FR-6]
  // --------------------------------------------------------------------------

  const handleCreateTriggerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriggerFormError(null);

    // Form Validation
    if (!newRuleName.trim()) {
      setTriggerFormError('Rule name is required.');
      return;
    }
    if (!newFinancialCriteria.trim()) {
      setTriggerFormError('Financial criteria selection or description is required.');
      return;
    }
    const parsedThreshold = parseFloat(newThresholdAmount);
    if (isNaN(parsedThreshold) || parsedThreshold < 0) {
      setTriggerFormError('Threshold amount must be a valid non-negative number.');
      return;
    }

    const payload: CreateTriggerInput = {
      rule_name: newRuleName.trim(),
      financial_criteria: newFinancialCriteria.trim(),
      threshold_amount: parsedThreshold,
      urgency: newUrgency,
      is_active: newIsActive,
    };

    setIsSubmittingTrigger(true);
    try {
      const created = await createTriggerRule(payload);
      setTriggers((prev) => [created, ...prev]);

      // Reset form
      setNewRuleName('');
      setNewFinancialCriteria('');
      setNewThresholdAmount('');
      setNewUrgency('High');
      setNewIsActive(true);
      setIsCreateTriggerOpen(false);

      if (onTriggerCreated) {
        onTriggerCreated(created);
      }
    } catch (err: any) {
      setTriggerFormError(err?.message || 'Failed to create custom trigger rule.');
    } finally {
      setIsSubmittingTrigger(false);
    }
  };

  const handleDeleteTrigger = async (triggerId: string) => {
    setDeletingTriggerId(triggerId);
    setTriggersError(null);
    try {
      await deleteTriggerRule(triggerId);
      setTriggers((prev) => prev.filter((t) => t.trigger_id !== triggerId));
      if (onTriggerDeleted) {
        onTriggerDeleted(triggerId);
      }
    } catch (err: any) {
      setTriggersError(err?.message || `Failed to delete trigger rule ID: ${triggerId}`);
    } finally {
      setDeletingTriggerId(null);
    }
  };

  // --------------------------------------------------------------------------
  // Event Handlers — Notification Preferences [FR-7]
  // --------------------------------------------------------------------------

  const handleToggleChannelInPreference = (prefId: string, channel: string) => {
    setPreferences((prev) =>
      prev.map((pref) => {
        if (pref.preference_id !== prefId) return pref;
        const currentChannels = pref.channels_json || [];
        const exists = currentChannels.includes(channel);
        const updatedChannels = exists
          ? currentChannels.filter((c) => c !== channel)
          : [...currentChannels, channel];
        return { ...pref, channels_json: updatedChannels };
      })
    );
  };

  const handleSavePreference = async (pref: NotificationPreference) => {
    setSavingPrefId(pref.preference_id);
    setPrefConflictError(null);

    const payload: UpdatePreferenceInput = {
      role_name: pref.role_name,
      event_type: pref.event_type,
      urgency: pref.urgency,
      channels_json: pref.channels_json,
      version: pref.version, // Pass current version for optimistic locking [FR-7]
    };

    try {
      const updated = await updateNotificationPreference(payload);
      setPreferences((prev) =>
        prev.map((item) =>
          item.preference_id === pref.preference_id ? updated : item
        )
      );
      if (onPreferenceUpdated) {
        onPreferenceUpdated(updated);
      }
    } catch (err: any) {
      if (err?.status === 409 || err?.message?.includes('409') || err?.message?.toLowerCase().includes('conflict') || err?.message?.toLowerCase().includes('version')) {
        setPrefConflictError(
          'Concurrency conflict detected: This role preference was updated by another process or user. Please reload preferences to get the latest version.'
        );
      } else {
        setPreferencesError(err?.message || 'Failed to update notification preference.');
      }
    } finally {
      setSavingPrefId(null);
    }
  };

  const handleCreateNewPreferenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewPrefFormError(null);

    if (!newPrefRole.trim()) {
      setNewPrefFormError('Role name is required.');
      return;
    }
    if (!newPrefEventType.trim()) {
      setNewPrefFormError('Event type is required.');
      return;
    }
    if (newPrefChannels.length === 0) {
      setNewPrefFormError('At least one notification channel must be selected.');
      return;
    }

    const payload: UpdatePreferenceInput = {
      role_name: newPrefRole.trim(),
      event_type: newPrefEventType.trim(),
      urgency: newPrefUrgency,
      channels_json: newPrefChannels,
      version: 1,
    };

    setIsSubmittingPref(true);
    try {
      const createdOrUpdated = await updateNotificationPreference(payload);
      setPreferences((prev) => {
        const idx = prev.findIndex(
          (p) =>
            p.role_name.toLowerCase() === createdOrUpdated.role_name.toLowerCase() &&
            p.event_type.toLowerCase() === createdOrUpdated.event_type.toLowerCase()
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = createdOrUpdated;
          return next;
        }
        return [createdOrUpdated, ...prev];
      });

      setIsAddPrefOpen(false);
      if (onPreferenceUpdated) {
        onPreferenceUpdated(createdOrUpdated);
      }
    } catch (err: any) {
      setNewPrefFormError(err?.message || 'Failed to save new role preference.');
    } finally {
      setIsSubmittingPref(false);
    }
  };

  const handleToggleChannelInNewPref = (channel: string) => {
    setNewPrefChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  // ============================================================================
  // Render JSX Structure
  // ============================================================================

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-4 sm:p-6 lg:p-8 bg-[#fbf9f4] text-[#1b1c19]">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e4e2dd] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-7 h-7 text-[#735c41]" />
            <h1 className="text-2xl sm:text-3xl font-serif text-[#1b1c19] tracking-tight">
              Centralized Notification Hub
            </h1>
          </div>
          <p className="mt-1 text-sm text-[#4e453d]">
            Manage in-app system alerts, configure custom financial trigger rules, and update role-based notification channels.
          </p>
        </div>

        {/* Tab Counters & Badges Summary */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded bg-[#f0eee9] border border-[#d1c4b9] text-xs font-medium text-[#4e453d] flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-[#735c41]" />
            <span>Unread Alerts: </span>
            <span className="font-bold text-[#735c41]">{unreadAlertCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded bg-[#f0eee9] border border-[#d1c4b9] text-xs font-medium text-[#4e453d] flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#a43b2c]" />
            <span>Active Triggers: </span>
            <span className="font-bold text-[#1b1c19]">{triggers.filter((t) => t.is_active).length}</span>
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {overallError && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-md bg-[#ffdad6] border border-[#ba1a1a] text-[#93000a] flex items-start gap-3"
          data-testid="notification-hub-error-banner"
        >
          <AlertCircle className="w-5 h-5 text-[#ba1a1a] shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Attention Required</p>
            <p className="mt-0.5">{typeof overallError === 'string' ? overallError : overallError.message}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'alerts') fetchNotifications();
              else if (activeTab === 'triggers') fetchTriggers();
              else fetchPreferences();
            }}
            className="px-3 py-1 rounded bg-[#ba1a1a] text-white text-xs font-medium hover:bg-[#93000a] transition-colors flex items-center gap-1 shrink-0"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Reload
          </button>
        </div>
      )}

      {/* Main Tab Navigation Header [FR-5, FR-6, FR-7] */}
      <div className="border-b border-[#e4e2dd]" role="tablist" aria-label="Notification Hub Sections">
        <nav className="flex space-x-6 sm:space-x-8" aria-label="Tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'alerts'}
            aria-controls="tab-panel-alerts"
            id="tab-alerts"
            onClick={() => setActiveTab('alerts')}
            className={cn(
              'py-3 px-1 border-b-2 font-medium text-sm sm:text-base transition-colors flex items-center gap-2',
              activeTab === 'alerts'
                ? 'border-[#735c41] text-[#735c41] font-semibold'
                : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#80756b]'
            )}
            data-testid="tab-alerts-btn"
          >
            <Bell className="w-4 h-4" />
            <span>In-App Alerts</span>
            {unreadAlertCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-[#735c41] text-white font-bold">
                {unreadAlertCount}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'triggers'}
            aria-controls="tab-panel-triggers"
            id="tab-triggers"
            onClick={() => setActiveTab('triggers')}
            className={cn(
              'py-3 px-1 border-b-2 font-medium text-sm sm:text-base transition-colors flex items-center gap-2',
              activeTab === 'triggers'
                ? 'border-[#735c41] text-[#735c41] font-semibold'
                : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#80756b]'
            )}
            data-testid="tab-triggers-btn"
          >
            <Zap className="w-4 h-4" />
            <span>Custom Trigger Rules</span>
            <span className="ml-1 px-2 py-0.5 text-xs rounded bg-[#e4e2dd] text-[#4e453d]">
              {triggers.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'preferences'}
            aria-controls="tab-panel-preferences"
            id="tab-preferences"
            onClick={() => setActiveTab('preferences')}
            className={cn(
              'py-3 px-1 border-b-2 font-medium text-sm sm:text-base transition-colors flex items-center gap-2',
              activeTab === 'preferences'
                ? 'border-[#735c41] text-[#735c41] font-semibold'
                : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#80756b]'
            )}
            data-testid="tab-preferences-btn"
          >
            <Sliders className="w-4 h-4" />
            <span>Role Preferences</span>
            <span className="ml-1 px-2 py-0.5 text-xs rounded bg-[#e4e2dd] text-[#4e453d]">
              {preferences.length}
            </span>
          </button>
        </nav>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: IN-APP ALERTS [FR-5]                                          */}
      {/* ==================================================================== */}
      {activeTab === 'alerts' && (
        <div
          id="tab-panel-alerts"
          role="tabpanel"
          aria-labelledby="tab-alerts"
          className="space-y-6"
          data-testid="alerts-panel"
        >
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#f5f3ee] p-4 rounded-lg border border-[#e4e2dd]">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#80756b]" />
                <input
                  type="text"
                  placeholder="Search alerts by message or correlation ID..."
                  value={alertSearchQuery}
                  onChange={(e) => setAlertSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-[#d1c4b9] rounded focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                  data-testid="alert-search-input"
                />
                {alertSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAlertSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#80756b] hover:text-[#1b1c19]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Urgency Filter Dropdown */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#80756b]" />
                <select
                  aria-label="Filter alerts by urgency"
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="py-1.5 px-3 text-sm bg-white border border-[#d1c4b9] rounded focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                  data-testid="alert-urgency-filter"
                >
                  <option value="all">All Urgencies</option>
                  <option value="High">High Urgency</option>
                  <option value="Medium">Medium Urgency</option>
                  <option value="Low">Low Urgency</option>
                </select>
              </div>

              {/* Unread Only Toggle */}
              <label className="flex items-center gap-2 text-sm text-[#4e453d] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={unreadOnlyFilter}
                  onChange={(e) => setUnreadOnlyFilter(e.target.checked)}
                  className="rounded border-[#d1c4b9] text-[#735c41] focus:ring-[#735c41] w-4 h-4"
                  data-testid="unread-only-checkbox"
                />
                <span>Unread Only</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={notifications.length === 0 || unreadAlertCount === 0}
                className="px-3 py-1.5 text-xs font-medium text-[#735c41] bg-white border border-[#d1c4b9] rounded hover:bg-[#f0eee9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                data-testid="mark-all-read-btn"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark All Read
              </button>

              <button
                type="button"
                onClick={fetchNotifications}
                disabled={alertsLoading}
                className="p-1.5 text-[#4e453d] bg-white border border-[#d1c4b9] rounded hover:bg-[#f0eee9] transition-colors disabled:opacity-50"
                title="Refresh alerts"
                data-testid="refresh-alerts-btn"
              >
                <RefreshCw className={cn('w-4 h-4', alertsLoading && 'animate-spin')} />
              </button>
            </div>
          </div>

          {/* Loading Skeleton */}
          {overallLoading && filteredNotifications.length === 0 && (
            <div className="space-y-3" data-testid="alerts-loading-skeleton">
              {[1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white border border-[#e4e2dd] rounded-lg animate-pulse flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-[#e4e2dd] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[#e4e2dd] rounded w-3/4" />
                    <div className="h-3 bg-[#e4e2dd] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!overallLoading && filteredNotifications.length === 0 && (
            <div
              className="p-12 text-center bg-white rounded-lg border border-[#e4e2dd] space-y-3"
              data-testid="alerts-empty-state"
            >
              <Bell className="w-10 h-10 mx-auto text-[#80756b] opacity-60" />
              <h3 className="text-lg font-serif text-[#1b1c19]">No System Alerts Found</h3>
              <p className="text-sm text-[#4e453d] max-w-md mx-auto">
                {unreadOnlyFilter || urgencyFilter !== 'all' || alertSearchQuery
                  ? 'No notifications match your active search or filter parameters. Try clearing your filters.'
                  : 'Your notification center is up to date. All system alerts and trigger notifications will appear here.'}
              </p>
              {(unreadOnlyFilter || urgencyFilter !== 'all' || alertSearchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setUnreadOnlyFilter(false);
                    setUrgencyFilter('all');
                    setAlertSearchQuery('');
                  }}
                  className="mt-2 px-3 py-1.5 text-xs font-medium bg-[#f0eee9] text-[#735c41] border border-[#d1c4b9] rounded hover:bg-[#e4e2dd] transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}

          {/* Notifications List */}
          {filteredNotifications.length > 0 && (
            <div className="space-y-3" data-testid="notifications-list">
              {filteredNotifications.map((notification) => {
                const isUnread = !notification.read_status;
                const urgency = sanitizeUrgency(notification.urgency);

                return (
                  <div
                    key={notification.notification_id}
                    className={cn(
                      'p-4 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4',
                      isUnread
                        ? 'bg-white border-[#735c41]/40 shadow-sm'
                        : 'bg-[#fbf9f4] border-[#e4e2dd] opacity-90'
                    )}
                    data-testid={`notification-card-${notification.notification_id}`}
                  >
                    <div className="flex items-start gap-3.5 flex-1">
                      {/* Urgency Icon Indicator */}
                      <div className="mt-0.5 shrink-0">
                        {urgency === 'High' ? (
                          <div className="p-2 rounded-full bg-[#ffdad6] text-[#ba1a1a]">
                            <ShieldAlert className="w-5 h-5" />
                          </div>
                        ) : urgency === 'Medium' ? (
                          <div className="p-2 rounded-full bg-[#fdddbb] text-[#735c41]">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-full bg-[#d0e4ff] text-[#374a5f]">
                            <Info className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Urgency Status Badge */}
                          <StatusLabel
                            status={urgency.toLowerCase()}
                            label={`${urgency} Urgency`}
                            size="sm"
                          />

                          {/* Delivery Status */}
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded border font-medium',
                              notification.delivery_status === 'Sent'
                                ? 'bg-[#d1fae5] text-[#064e3b] border-[#6ee7b7]'
                                : notification.delivery_status === 'Fallback'
                                ? 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]'
                                : 'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]'
                            )}
                          >
                            Channel: {notification.channel} ({notification.delivery_status})
                          </span>

                          {/* Unread indicator tag */}
                          {isUnread && (
                            <span className="text-xs font-bold text-[#735c41] bg-[#f5d6b4] px-2 py-0.5 rounded-full">
                              New
                            </span>
                          )}
                        </div>

                        {/* Alert Message */}
                        <p
                          className={cn(
                            'text-sm sm:text-base leading-snug mt-1',
                            isUnread ? 'font-semibold text-[#1b1c19]' : 'text-[#4e453d]'
                          )}
                        >
                          {notification.message || 'System threshold or financial event alert triggered.'}
                        </p>

                        {/* Metadata Footer */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#80756b] pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(notification.dispatched_at)}
                          </span>

                          {notification.correlation_id && (
                            <span className="font-mono text-[11px] bg-[#f0eee9] px-1.5 py-0.5 rounded border border-[#e4e2dd]">
                              Correlation: {notification.correlation_id}
                            </span>
                          )}

                          {notification.trigger_id && (
                            <span>Trigger ID: {notification.trigger_id}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Button */}
                    <div className="sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleReadStatus(notification.notification_id)}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 border',
                          isUnread
                            ? 'bg-[#735c41] text-white border-[#58432a] hover:bg-[#58432a]'
                            : 'bg-white text-[#4e453d] border-[#d1c4b9] hover:bg-[#f0eee9]'
                        )}
                        data-testid={`toggle-read-btn-${notification.notification_id}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {isUnread ? 'Mark as Read' : 'Mark Unread'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: CUSTOM FINANCIAL TRIGGER RULES [FR-6]                          */}
      {/* ==================================================================== */}
      {activeTab === 'triggers' && (
        <div
          id="tab-panel-triggers"
          role="tabpanel"
          aria-labelledby="tab-triggers"
          className="space-y-6"
          data-testid="triggers-panel"
        >
          {/* Header Action Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#f5f3ee] p-4 rounded-lg border border-[#e4e2dd]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#80756b]" />
              <input
                type="text"
                placeholder="Search trigger rules by name or criteria..."
                value={triggerSearchQuery}
                onChange={(e) => setTriggerSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-[#d1c4b9] rounded focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                data-testid="trigger-search-input"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={fetchTriggers}
                disabled={triggersLoading}
                className="p-1.5 text-[#4e453d] bg-white border border-[#d1c4b9] rounded hover:bg-[#f0eee9] transition-colors disabled:opacity-50"
                title="Refresh triggers"
                data-testid="refresh-triggers-btn"
              >
                <RefreshCw className={cn('w-4 h-4', triggersLoading && 'animate-spin')} />
              </button>

              <button
                type="button"
                onClick={() => setIsCreateTriggerOpen(!isCreateTriggerOpen)}
                className="px-4 py-1.5 text-sm font-medium bg-[#735c41] text-white rounded hover:bg-[#58432a] transition-colors flex items-center gap-1.5 shadow-sm"
                data-testid="toggle-create-trigger-btn"
              >
                {isCreateTriggerOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isCreateTriggerOpen ? 'Close Form' : 'Create Trigger Rule'}
              </button>
            </div>
          </div>

          {/* Inline Create Trigger Form Modal/Panel [FR-6] */}
          {isCreateTriggerOpen && (
            <div
              className="p-6 bg-white rounded-lg border border-[#735c41]/30 shadow-md space-y-4"
              data-testid="create-trigger-form-panel"
            >
              <div className="flex items-center justify-between border-b border-[#e4e2dd] pb-3">
                <div className="flex items-center gap-2 text-[#735c41] font-serif font-semibold text-lg">
                  <Zap className="w-5 h-5 text-[#a43b2c]" />
                  <span>Configure New Custom Financial Trigger Rule</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateTriggerOpen(false)}
                  className="text-[#80756b] hover:text-[#1b1c19]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {triggerFormError && (
                <div className="p-3 rounded bg-[#ffdad6] text-[#93000a] text-sm border border-[#ba1a1a]">
                  {triggerFormError}
                </div>
              )}

              <form onSubmit={handleCreateTriggerSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Rule Name */}
                  <div className="space-y-1">
                    <label htmlFor="rule-name-input" className="block text-xs font-semibold uppercase tracking-wider text-[#4e453d]">
                      Rule Name *
                    </label>
                    <input
                      id="rule-name-input"
                      type="text"
                      required
                      placeholder="e.g. Overdue Invoice > $10k Threshold"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#fbf9f4] border border-[#d1c4b9] rounded focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                      data-testid="rule-name-input"
                    />
                  </div>

                  {/* Financial Criteria Selection */}
                  <div className="space-y-1">
                    <label htmlFor="financial-criteria-input" className="block text-xs font-semibold uppercase tracking-wider text-[#4e453d]">
                      Financial Criteria *
                    </label>
                    <input
                      id="financial-criteria-input"
                      type="text"
                      list="criteria-suggestions"
                      required
                      placeholder="Select or enter financial condition..."
                      value={newFinancialCriteria}
                      onChange={(e) => setNewFinancialCriteria(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#fbf9f4] border border-[#d1c4b9] rounded focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                      data-testid="financial-criteria-input"
                    />
                    <datalist id="criteria-suggestions">
                      {COMMON_FINANCIAL_CRITERIA.map((crit) => (
                        <option key={crit} value={crit} />
                      ))}
                    </datalist>
                  </div>

                  {/* Threshold Amount */}
                  <div className="space-y-1">
                    <label htmlFor="threshold-amount-input" className="block text-xs font-semibold uppercase tracking-wider text-[#4e453d]">
                      Threshold Amount ($ USD) *
                    </label>
                    <input
                      id="threshold-amount-input"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="10000.00"
                      value={newThresholdAmount}
                      onChange={(e) => setNewThresholdAmount(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#fbf9f4] border border-[#d1c4b9] rounded focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                      data-testid="threshold-amount-input"
                    />
                  </div>

                  {/* Urgency Level */}
                  <div className="space-y-1">
                    <label htmlFor="urgency-input" className="block text-xs font-semibold uppercase tracking-wider text-[#4e453d]">
                      Urgency Level *
                    </label>
                    <select
                      id="urgency-input"
                      value={newUrgency}
                      onChange={(e) => setNewUrgency(e.target.value as UrgencyLevel)}
                      className="w-full px-3 py-2 text-sm bg-[#fbf9f4] border border-[#d1c4b9] rounded focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                      data-testid="urgency-select"
                    >
                      <option value="High">High Urgency</option>
                      <option value="Medium">Medium Urgency</option>
                      <option value="Low">Low Urgency</option>
                    </select>
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="new-trigger-active-toggle"
                    checked={newIsActive}
                    onChange={(e) => setNewIsActive(e.target.checked)}
                    className="rounded border-[#d1c4b9] text-[#735c41] focus:ring-[#735c41] w-4 h-4"
                    data-testid="active-checkbox"
                  />
                  <label htmlFor="new-trigger-active-toggle" className="text-sm font-medium text-[#1b1c19] cursor-pointer">
                    Enable trigger rule immediately upon creation
                  </label>
                </div>

                {/* Submit Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[#e4e2dd]">
                  <button
                    type="button"
                    onClick={() => setIsCreateTriggerOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-[#4e453d] bg-[#f0eee9] border border-[#d1c4b9] rounded hover:bg-[#e4e2dd] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTrigger}
                    className="px-5 py-2 text-sm font-medium bg-[#735c41] text-white rounded hover:bg-[#58432a] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    data-testid="submit-trigger-btn"
                  >
                    {isSubmittingTrigger && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Save Trigger Rule
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Trigger Rules List Table */}
          {filteredTriggers.length === 0 && !triggersLoading && (
            <div
              className="p-12 text-center bg-white rounded-lg border border-[#e4e2dd] space-y-3"
              data-testid="triggers-empty-state"
            >
              <Zap className="w-10 h-10 mx-auto text-[#80756b] opacity-60" />
              <h3 className="text-lg font-serif text-[#1b1c19]">No Custom Trigger Rules Configured</h3>
              <p className="text-sm text-[#4e453d] max-w-md mx-auto">
                Define custom financial rules and threshold amounts to automatically generate multi-channel notifications when criteria are met.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateTriggerOpen(true)}
                className="mt-2 px-4 py-2 text-sm font-medium bg-[#735c41] text-white rounded hover:bg-[#58432a] transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create First Trigger Rule
              </button>
            </div>
          )}

          {filteredTriggers.length > 0 && (
            <div className="bg-white rounded-lg border border-[#e4e2dd] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" data-testid="triggers-table">
                  <thead>
                    <tr className="bg-[#f5f3ee] border-b border-[#e4e2dd] text-xs font-semibold text-[#4e453d] uppercase tracking-wider">
                      <th className="py-3 px-4">Rule Name</th>
                      <th className="py-3 px-4">Financial Criteria</th>
                      <th className="py-3 px-4">Threshold Amount</th>
                      <th className="py-3 px-4">Urgency</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e4e2dd] text-sm">
                    {filteredTriggers.map((rule) => (
                      <tr
                        key={rule.trigger_id}
                        className="hover:bg-[#fbf9f4] transition-colors"
                        data-testid={`trigger-row-${rule.trigger_id}`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-[#1b1c19]">
                          {rule.rule_name}
                        </td>
                        <td className="py-3.5 px-4 text-[#4e453d]">
                          {rule.financial_criteria}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-[#735c41]">
                          {formatCurrency(rule.threshold_amount)}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusLabel
                            status={sanitizeUrgency(rule.urgency).toLowerCase()}
                            label={rule.urgency}
                            size="sm"
                          />
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'px-2.5 py-0.5 rounded-full text-xs font-medium border inline-flex items-center gap-1',
                              rule.is_active
                                ? 'bg-[#d1fae5] text-[#064e3b] border-[#6ee7b7]'
                                : 'bg-[#f0eee9] text-[#80756b] border-[#d1c4b9]'
                            )}
                          >
                            <span className={cn('w-1.5 h-1.5 rounded-full', rule.is_active ? 'bg-[#064e3b]' : 'bg-[#80756b]')} />
                            {rule.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTrigger(rule.trigger_id)}
                            disabled={deletingTriggerId === rule.trigger_id}
                            className="p-1.5 text-[#ba1a1a] hover:bg-[#ffdad6] rounded transition-colors disabled:opacity-50"
                            title="Delete trigger rule"
                            data-testid={`delete-trigger-btn-${rule.trigger_id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: ROLE-BASED NOTIFICATION PREFERENCES [FR-7]                    */}
      {/* ==================================================================== */}
      {activeTab === 'preferences' && (
        <div
          id="tab-panel-preferences"
          role="tabpanel"
          aria-labelledby="tab-preferences"
          className="space-y-6"
          data-testid="preferences-panel"
        >
          {/* Optimistic locking conflict warning banner [FR-7] */}
          {prefConflictError && (
            <div
              className="p-4 rounded-md bg-[#fff3cd] border border-[#ffeba1] text-[#856404] flex items-start gap-3"
              data-testid="pref-conflict-banner"
            >
              <AlertCircle className="w-5 h-5 text-[#856404] shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-semibold">Version Conflict Warning</p>
                <p className="mt-0.5">{prefConflictError}</p>
              </div>
              <button
                type="button"
                onClick={fetchPreferences}
                className="px-3 py-1 rounded bg-[#856404] text-white text-xs font-medium hover:bg-[#533f03] transition-colors flex items-center gap-1 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Preferences
              </button>
            </div>
          )}

          {/* Filter Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#f5f3ee] p-4 rounded-lg border border-[#e4e2dd]">
            <div className="flex flex-wrap items-center gap-4 flex-1">
              {/* Role Name Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#4e453d]">
                  Role Filter:
                </span>
                <select
                  aria-label="Filter preferences by role name"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="py-1.5 px-3 text-sm bg-white border border-[#d1c4b9] rounded focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                  data-testid="role-filter-select"
                >
                  <option value="all">All Roles</option>
                  {uniqueRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#4e453d]">
                  Event Type:
                </span>
                <select
                  aria-label="Filter preferences by event type"
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                  className="py-1.5 px-3 text-sm bg-white border border-[#d1c4b9] rounded focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                  data-testid="event-filter-select"
                >
                  <option value="all">All Event Types</option>
                  {uniqueEventTypes.map((event) => (
                    <option key={event} value={event}>
                      {event}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={fetchPreferences}
                disabled={preferencesLoading}
                className="p-1.5 text-[#4e453d] bg-white border border-[#d1c4b9] rounded hover:bg-[#f0eee9] transition-colors disabled:opacity-50"
                title="Refresh preferences"
                data-testid="refresh-preferences-btn"
              >
                <RefreshCw className={cn('w-4 h-4', preferencesLoading && 'animate-spin')} />
              </button>

              <button
                type="button"
                onClick={() => setIsAddPrefOpen(!isAddPrefOpen)}
                className="px-4 py-1.5 text-sm font-medium bg-[#735c41] text-white rounded hover:bg-[#58432a] transition-colors flex items-center gap-1.5 shadow-sm"
                data-testid="toggle-add-pref-btn"
              >
                {isAddPrefOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isAddPrefOpen ? 'Close Form' : 'Add Role Preference'}
              </button>
            </div>
          </div>

          {/* Add Preference Form Modal/Panel [FR-7] */}
          {isAddPrefOpen && (
            <div
              className="p-6 bg-white rounded-lg border border-[#735c41]/30 shadow-md space-y-4"
              data-testid="add-pref-form-panel"
            >
              <div className="flex items-center justify-between border-b border-[#e4e2dd] pb-3">
                <div className="flex items-center gap-2 text-[#735c41] font-serif font-semibold text-lg">
                  <Sliders className="w-5 h-5 text-[#735c41]" />
                  <span>Configure Role Notification Channel Preferences</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddPrefOpen(false)}
                  className="text-[#80756b] hover:text-[#1b1c19]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {newPrefFormError && (
                <div className="p-3 rounded bg-[#ffdad6] text-[#93000a] text-sm border border-[#ba1a1a]">
                  {newPrefFormError}
                </div>
              )}

              <form onSubmit={handleCreateNewPreferenceSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Role Name */}
                  <div className="space-y-1">
                    <label htmlFor="pref-role-input" className="block text-xs font-semibold uppercase tracking-wider text-[#4e453d]">
                      Role Name *
                    </label>
                    <input
                      id="pref-role-input"
                      type="text"
                      list="role-suggestions"
                      required
                      placeholder="e.g. financial_admin"
                      value={newPrefRole}
                      onChange={(e) => setNewPrefRole(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#fbf9f4] border border-[#d1c4b9] rounded focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                      data-testid="new-pref-role-input"
                    />
                    <datalist id="role-suggestions">
                      {uniqueRoles.map((r) => (
                        <option key={r} value={r} />
                      ))}
                    </datalist>
                  </div>

                  {/* Event Type */}
                  <div className="space-y-1">
                    <label htmlFor="pref-event-input" className="block text-xs font-semibold uppercase tracking-wider text-[#4e453d]">
                      Event Type *
                    </label>
                    <input
                      id="pref-event-input"
                      type="text"
                      list="event-suggestions"
                      required
                      placeholder="e.g. invoice_past_due"
                      value={newPrefEventType}
                      onChange={(e) => setNewPrefEventType(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#fbf9f4] border border-[#d1c4b9] rounded focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                      data-testid="new-pref-event-input"
                    />
                    <datalist id="event-suggestions">
                      {uniqueEventTypes.map((ev) => (
                        <option key={ev} value={ev} />
                      ))}
                    </datalist>
                  </div>

                  {/* Urgency */}
                  <div className="space-y-1">
                    <label htmlFor="pref-urgency-input" className="block text-xs font-semibold uppercase tracking-wider text-[#4e453d]">
                      Urgency Level *
                    </label>
                    <select
                      id="pref-urgency-input"
                      value={newPrefUrgency}
                      onChange={(e) => setNewPrefUrgency(e.target.value as UrgencyLevel)}
                      className="w-full px-3 py-2 text-sm bg-[#fbf9f4] border border-[#d1c4b9] rounded focus:outline-none focus:ring-1 focus:ring-[#735c41]"
                      data-testid="new-pref-urgency-select"
                    >
                      <option value="High">High Urgency</option>
                      <option value="Medium">Medium Urgency</option>
                      <option value="Low">Low Urgency</option>
                    </select>
                  </div>
                </div>

                {/* Subscribed Notification Channels */}
                <div className="space-y-2 pt-2">
                  <span className="block text-xs font-semibold uppercase tracking-wider text-[#4e453d]">
                    Subscribed Dispatch Channels *
                  </span>
                  <div className="flex flex-wrap items-center gap-6">
                    {ALLOWED_CHANNELS.map((ch) => {
                      const isChecked = newPrefChannels.includes(ch);
                      return (
                        <label
                          key={ch}
                          className="flex items-center gap-2 text-sm text-[#1b1c19] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleChannelInNewPref(ch)}
                            className="rounded border-[#d1c4b9] text-[#735c41] focus:ring-[#735c41] w-4 h-4"
                            data-testid={`channel-checkbox-${ch.toLowerCase()}`}
                          />
                          <span>
                            {ch === 'InApp' ? 'In-App Center' : ch === 'Email' ? 'Email Dispatch' : 'SMS Gateway'}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[#e4e2dd]">
                  <button
                    type="button"
                    onClick={() => setIsAddPrefOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-[#4e453d] bg-[#f0eee9] border border-[#d1c4b9] rounded hover:bg-[#e4e2dd] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPref}
                    className="px-5 py-2 text-sm font-medium bg-[#735c41] text-white rounded hover:bg-[#58432a] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    data-testid="submit-pref-btn"
                  >
                    {isSubmittingPref && <RefreshCw className="w-4 h-4 animate-spin" />}
                    Save Preference
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Preferences Cards Grid */}
          {filteredPreferences.length === 0 && !preferencesLoading && (
            <div
              className="p-12 text-center bg-white rounded-lg border border-[#e4e2dd] space-y-3"
              data-testid="preferences-empty-state"
            >
              <Sliders className="w-10 h-10 mx-auto text-[#80756b] opacity-60" />
              <h3 className="text-lg font-serif text-[#1b1c19]">No Notification Preferences Found</h3>
              <p className="text-sm text-[#4e453d] max-w-md mx-auto">
                No notification channel mappings match your selected role or event filters.
              </p>
            </div>
          )}

          {filteredPreferences.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="preferences-grid">
              {filteredPreferences.map((pref) => {
                const isSaving = savingPrefId === pref.preference_id;
                const channels = pref.channels_json || [];

                return (
                  <div
                    key={pref.preference_id}
                    className="p-5 bg-white rounded-lg border border-[#e4e2dd] shadow-sm flex flex-col justify-between gap-4"
                    data-testid={`pref-card-${pref.preference_id}`}
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-[#e4e2dd] pb-2.5">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#735c41]">
                            Role: {pref.role_name}
                          </span>
                          <h4 className="text-base font-medium text-[#1b1c19] mt-0.5">
                            {pref.event_type}
                          </h4>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusLabel
                            status={sanitizeUrgency(pref.urgency).toLowerCase()}
                            label={pref.urgency}
                            size="sm"
                          />
                          <span className="text-[11px] font-mono text-[#80756b]">
                            v{pref.version}
                          </span>
                        </div>
                      </div>

                      {/* Channels Checkboxes */}
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-[#4e453d] block">
                          Active Channels:
                        </span>
                        <div className="space-y-1.5">
                          {ALLOWED_CHANNELS.map((ch) => {
                            const isChecked = channels.includes(ch);
                            return (
                              <label
                                key={ch}
                                className="flex items-center gap-2 text-sm text-[#1b1c19] cursor-pointer hover:text-[#735c41] transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() =>
                                    handleToggleChannelInPreference(
                                      pref.preference_id,
                                      ch
                                    )
                                  }
                                  className="rounded border-[#d1c4b9] text-[#735c41] focus:ring-[#735c41] w-4 h-4"
                                  data-testid={`toggle-channel-${ch.toLowerCase()}-${pref.preference_id}`}
                                />
                                <span className="flex items-center gap-1.5">
                                  {ch === 'InApp' && <Bell className="w-3.5 h-3.5 text-[#735c41]" />}
                                  {ch === 'Email' && <Mail className="w-3.5 h-3.5 text-[#374a5f]" />}
                                  {ch === 'SMS' && <MessageSquare className="w-3.5 h-3.5 text-[#a43b2c]" />}
                                  {ch}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Footer Save Button */}
                    <div className="pt-3 border-t border-[#e4e2dd] flex items-center justify-between">
                      <span className="text-[11px] text-[#80756b]">
                        Last updated: {formatDate(pref.updated_at)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSavePreference(pref)}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-xs font-medium bg-[#735c41] text-white rounded hover:bg-[#58432a] transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                        data-testid={`save-pref-btn-${pref.preference_id}`}
                      >
                        {isSaving ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Channels'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationHub;
