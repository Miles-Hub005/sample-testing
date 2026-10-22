'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  X,
  AlertCircle,
  Loader2,
  Clock,
  Building,
  Shield,
  Activity,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import {
  Stakeholder,
  StakeholderActivity,
  CreateStakeholderRequest,
  CreateStakeholderActivityRequest,
  InfluenceLevel,
  ActivityType,
  dealsApi,
} from '../../services/deals';
import { cn } from '../../lib/utils';

export interface StakeholderMapProps {
  /**
   * The ID of the deal to manage stakeholders and activity feeds for.
   */
  dealId?: string;

  /**
   * Optional initial list of mapped stakeholders.
   */
  initialStakeholders?: Stakeholder[];

  /**
   * Optional initial list of stakeholder activities.
   */
  initialActivities?: StakeholderActivity[];

  /**
   * Callback invoked when a new stakeholder contact is successfully created.
   */
  onStakeholderCreated?: (stakeholder: Stakeholder) => void;

  /**
   * Callback invoked when a new stakeholder activity is successfully logged.
   */
  onActivityLogged?: (activity: StakeholderActivity) => void;

  /**
   * Optional custom title for the component.
   */
  title?: string;

  /**
   * Custom CSS class names to append to the wrapper container.
   */
  className?: string;

  /**
   * Optional test identifier for testing framework targets.
   */
  'data-testid'?: string;
}

/**
 * Visual styling configuration for influence level badges.
 */
export interface InfluenceStyle {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
}

/**
 * Utility to map influence levels to color-coded badge styles.
 */
export function getInfluenceStyle(level?: InfluenceLevel | string | null): InfluenceStyle {
  const norm = (level || '').toLowerCase().trim();

  if (norm === 'high') {
    return {
      label: 'High Influence',
      badgeBg: 'bg-rose-50',
      badgeText: 'text-rose-800',
      badgeBorder: 'border-rose-200',
      dotColor: 'bg-rose-500',
    };
  }

  if (norm === 'medium' || norm === 'med') {
    return {
      label: 'Medium Influence',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-200',
      dotColor: 'bg-amber-500',
    };
  }

  return {
    label: 'Low Influence',
    badgeBg: 'bg-slate-50',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
    dotColor: 'bg-slate-400',
  };
}

/**
 * Activity type icon and color configuration.
 */
export interface ActivityTypeConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconText: string;
  badgeBg: string;
  badgeText: string;
}

/**
 * Returns configuration for interaction activity types (Email, Meeting, Call, Note).
 */
export function getActivityTypeConfig(type?: ActivityType | string | null): ActivityTypeConfig {
  const norm = (type || '').toLowerCase().trim();

  if (norm.includes('email') || norm.includes('mail')) {
    return {
      label: 'Email',
      icon: Mail,
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-700',
      badgeBg: 'bg-blue-50',
      badgeText: 'text-blue-800',
    };
  }

  if (norm.includes('meet') || norm.includes('calendar') || norm.includes('demo')) {
    return {
      label: 'Meeting',
      icon: Users,
      iconBg: 'bg-purple-100',
      iconText: 'text-purple-700',
      badgeBg: 'bg-purple-50',
      badgeText: 'text-purple-800',
    };
  }

  if (norm.includes('call') || norm.includes('phone')) {
    return {
      label: 'Call',
      icon: Phone,
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-800',
    };
  }

  return {
    label: 'Note',
    icon: FileText,
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
  };
}

/**
 * Formats ISO timestamp strings into human-readable chronological dates.
 */
export function formatActivityDate(dateString?: string | null): string {
  if (!dateString) {
    return 'Recently';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

  if (diffHours >= 0 && diffHours < 24) {
    if (diffHours === 0) {
      const diffMins = Math.max(1, Math.floor((now.getTime() - date.getTime()) / (1000 * 60)));
      return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
    }
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Extracts uppercase initials from full name string (e.g. "Jane Doe" -> "JD").
 */
export function getInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') {
    return 'SC';
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'SC';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * StakeholderMap Component [FR-006, FR-007]
 * Renders mapped contacts, influence level indicators, and chronological activity feeds for deal pipeline management.
 */
export const StakeholderMap: React.FC<StakeholderMapProps> = ({
  dealId,
  initialStakeholders,
  initialActivities,
  onStakeholderCreated,
  onActivityLogged,
  title = 'Stakeholder Map & Interaction Feed',
  className,
  'data-testid': dataTestId,
}) => {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(initialStakeholders || []);
  const [activities, setActivities] = useState<StakeholderActivity[]>(initialActivities || []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialStakeholders && !!dealId);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [influenceFilter, setInfluenceFilter] = useState<string>('ALL');
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('ALL');
  const [selectedStakeholderId, setSelectedStakeholderId] = useState<string | null>(null);

  // Modals & Form visibility
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Stakeholder Form State
  const [newFullName, setNewFullName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newOrgRole, setNewOrgRole] = useState<string>('');
  const [newInfluenceLevel, setNewInfluenceLevel] = useState<string>('Medium');

  // New Activity Form State
  const [logStakeholderId, setLogStakeholderId] = useState<string>('');
  const [logActivityType, setLogActivityType] = useState<string>('Meeting');
  const [logSummary, setLogSummary] = useState<string>('');
  const [logOccurredOn, setLogOccurredOn] = useState<string>('');

  // Synchronize props if provided
  useEffect(() => {
    if (initialStakeholders) {
      setStakeholders(initialStakeholders);
    }
  }, [initialStakeholders]);

  useEffect(() => {
    if (initialActivities) {
      setActivities(initialActivities);
    }
  }, [initialActivities]);

  // Load deal stakeholders and activity feed from API if dealId is provided and no initial data
  const loadStakeholderData = useCallback(async () => {
    if (!dealId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await dealsApi.getDealStakeholders(dealId);
      setStakeholders(res.stakeholders || []);
      setActivities(res.recent_activities || []);
    } catch (err: any) {
      console.error('Failed to load stakeholder map:', err);
      setError(err?.message || 'Failed to load stakeholder records and activity feed.');
    } finally {
      setIsLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (dealId && (!initialStakeholders || !initialActivities)) {
      loadStakeholderData();
    }
  }, [dealId, initialStakeholders, initialActivities, loadStakeholderData]);

  // Map stakeholder IDs to stakeholder objects for quick lookup in activity feed
  const stakeholderMapById = useMemo(() => {
    const map = new Map<string, Stakeholder>();
    stakeholders.forEach((s) => map.set(s.id, s));
    return map;
  }, [stakeholders]);

  // Filter stakeholders by search query and influence level
  const filteredStakeholders = useMemo(() => {
    return stakeholders.filter((s) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        s.full_name.toLowerCase().includes(query) ||
        s.email.toLowerCase().includes(query) ||
        s.org_role.toLowerCase().includes(query);

      const matchesInfluence =
        influenceFilter === 'ALL' ||
        s.influence_level.toLowerCase() === influenceFilter.toLowerCase();

      return matchesSearch && matchesInfluence;
    });
  }, [stakeholders, searchQuery, influenceFilter]);

  // Sort activities chronologically descending (most recent first)
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      const timeA = new Date(a.occurred_on || a.created_on || 0).getTime();
      const timeB = new Date(b.occurred_on || b.created_on || 0).getTime();
      return timeB - timeA;
    });
  }, [activities]);

  // Filter activities by activity type and selected stakeholder
  const filteredActivities = useMemo(() => {
    return sortedActivities.filter((act) => {
      const matchesType =
        activityTypeFilter === 'ALL' ||
        act.activity_type.toLowerCase() === activityTypeFilter.toLowerCase();

      const matchesStakeholder =
        !selectedStakeholderId || act.stakeholder_id === selectedStakeholderId;

      return matchesType && matchesStakeholder;
    });
  }, [sortedActivities, activityTypeFilter, selectedStakeholderId]);

  // Handle submit new stakeholder contact
  const handleAddStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newFullName.trim()) {
      setFormError('Please provide full name of contact.');
      return;
    }
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!newOrgRole.trim()) {
      setFormError('Please specify organizational role.');
      return;
    }

    const payload: CreateStakeholderRequest = {
      full_name: newFullName.trim(),
      email: newEmail.trim(),
      org_role: newOrgRole.trim(),
      influence_level: newInfluenceLevel,
    };

    setIsSubmitting(true);

    try {
      let created: Stakeholder;
      if (dealId) {
        created = await dealsApi.createStakeholder(dealId, payload);
      } else {
        // Fallback stub for local component mode
        created = {
          id: `stk-${Date.now()}`,
          deal_id: dealId || 'local-deal',
          full_name: payload.full_name,
          email: payload.email,
          org_role: payload.org_role,
          influence_level: payload.influence_level,
          is_active: true,
          created_on: new Date().toISOString(),
        };
      }

      setStakeholders((prev) => [created, ...prev]);
      if (onStakeholderCreated) {
        onStakeholderCreated(created);
      }

      // Reset form and close modal
      setNewFullName('');
      setNewEmail('');
      setNewOrgRole('');
      setNewInfluenceLevel('Medium');
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Error adding stakeholder:', err);
      setFormError(err?.message || 'Failed to add stakeholder contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Log Activity modal with optional target stakeholder pre-selected
  const handleOpenLogModal = (stakeholderId?: string) => {
    setFormError(null);
    if (stakeholderId) {
      setLogStakeholderId(stakeholderId);
    } else if (stakeholders.length > 0) {
      setLogStakeholderId(stakeholders[0].id);
    } else {
      setLogStakeholderId('');
    }
    setLogActivityType('Meeting');
    setLogSummary('');
    setLogOccurredOn(new Date().toISOString().slice(0, 16)); // format YYYY-MM-DDTHH:mm
    setIsLogModalOpen(true);
  };

  // Handle submit new activity record
  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!logStakeholderId) {
      setFormError('Please select a stakeholder contact.');
      return;
    }
    if (!logSummary.trim()) {
      setFormError('Please provide a summary of the interaction.');
      return;
    }

    const payload: CreateStakeholderActivityRequest = {
      activity_type: logActivityType,
      summary: logSummary.trim(),
      occurred_on: logOccurredOn ? new Date(logOccurredOn).toISOString() : new Date().toISOString(),
    };

    setIsSubmitting(true);

    try {
      let logged: StakeholderActivity;
      if (dealId) {
        logged = await dealsApi.logStakeholderActivity(dealId, logStakeholderId, payload);
      } else {
        // Fallback stub for local component mode
        logged = {
          id: `act-${Date.now()}`,
          stakeholder_id: logStakeholderId,
          deal_id: dealId || 'local-deal',
          activity_type: payload.activity_type,
          summary: payload.summary,
          occurred_on: payload.occurred_on,
          created_on: new Date().toISOString(),
        };
      }

      setActivities((prev) => [logged, ...prev]);
      if (onActivityLogged) {
        onActivityLogged(logged);
      }

      // Reset form and close modal
      setLogSummary('');
      setIsLogModalOpen(false);
    } catch (err: any) {
      console.error('Error logging activity:', err);
      setFormError(err?.message || 'Failed to log interaction activity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid={dataTestId || 'stakeholder-map'}
      className={cn(
        'w-full bg-surface text-on-surface rounded-xl border border-outline-variant p-6 shadow-sm space-y-6',
        className
      )}
    >
      {/* Component Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold tracking-tight text-on-surface">
              {title}
            </h2>
          </div>
          <p className="text-sm text-on-surface-variant mt-1">
            Map key decision makers, roles, and influence levels with a chronological feed of deal interactions.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            data-testid="add-stakeholder-btn"
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Contact
          </button>

          <button
            type="button"
            data-testid="log-activity-btn"
            disabled={stakeholders.length === 0}
            onClick={() => handleOpenLogModal()}
            className={cn(
              'inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors shadow-xs',
              stakeholders.length === 0
                ? 'bg-surface-container-high text-on-surface-variant opacity-60 cursor-not-allowed border-outline-variant'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container border-outline'
            )}
            title={stakeholders.length === 0 ? 'Map at least one stakeholder first' : 'Log interaction activity'}
          >
            <Activity className="w-4 h-4 mr-1.5 text-secondary" />
            Log Activity
          </button>
        </div>
      </div>

      {/* Loading & Global Error States */}
      {isLoading && (
        <div
          data-testid="stakeholder-loading"
          className="flex flex-col items-center justify-center py-12 text-on-surface-variant space-y-3"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">Loading stakeholder map and activity feed...</p>
        </div>
      )}

      {error && !isLoading && (
        <div
          data-testid="stakeholder-error"
          className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{error}</p>
            {dealId && (
              <button
                type="button"
                onClick={loadStakeholderData}
                className="mt-2 text-xs underline font-semibold text-rose-900 hover:text-rose-950"
              >
                Retry loading stakeholder data
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Layout (Dual Column: Stakeholder List + Activity Feed) */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Stakeholder Contact Cards (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-container-low p-3 rounded-lg border border-outline-variant">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-on-surface-variant" />
                <input
                  type="text"
                  data-testid="stakeholder-search"
                  placeholder="Search contacts by name, role, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-surface-container-lowest text-on-surface border border-outline-variant rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/* Influence Level Filter Dropdown */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-on-surface-variant" />
                <select
                  data-testid="influence-filter"
                  value={influenceFilter}
                  onChange={(e) => setInfluenceFilter(e.target.value)}
                  className="py-1.5 px-2.5 text-sm bg-surface-container-lowest text-on-surface border border-outline-variant rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                >
                  <option value="ALL">All Influence Levels</option>
                  <option value="High">High Influence</option>
                  <option value="Medium">Medium Influence</option>
                  <option value="Low">Low Influence</option>
                </select>
              </div>
            </div>

            {/* Stakeholder Count Overview */}
            <div className="flex items-center justify-between text-xs font-medium text-on-surface-variant px-1">
              <span>
                Mapped Contacts ({filteredStakeholders.length} of {stakeholders.length})
              </span>
              {selectedStakeholderId && (
                <button
                  type="button"
                  onClick={() => setSelectedStakeholderId(null)}
                  className="text-primary hover:underline"
                >
                  Clear contact filter
                </button>
              )}
            </div>

            {/* Stakeholder Contacts Grid / Cards List */}
            {filteredStakeholders.length === 0 ? (
              <div
                data-testid="no-stakeholders-msg"
                className="text-center py-10 px-4 bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant space-y-2"
              >
                <User className="w-10 h-10 text-outline mx-auto" />
                <p className="text-sm font-medium text-on-surface">No mapped stakeholders found.</p>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                  {searchQuery || influenceFilter !== 'ALL'
                    ? 'Try adjusting your search criteria or influence filter.'
                    : 'Get started by mapping key decision makers, sponsors, and influencers for this deal.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-2 inline-flex items-center text-xs font-medium text-primary hover:underline"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add stakeholder contact
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStakeholders.map((stk) => {
                  const influenceStyle = getInfluenceStyle(stk.influence_level);
                  const isSelected = selectedStakeholderId === stk.id;

                  return (
                    <div
                      key={stk.id}
                      data-testid={`stakeholder-card-${stk.id}`}
                      className={cn(
                        'group p-4 rounded-xl border transition-all shadow-2xs relative bg-surface-container-lowest',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 bg-surface-container-low/50'
                          : 'border-outline-variant hover:border-outline hover:shadow-xs'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Contact Avatar & Main Identity */}
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center flex-shrink-0 border border-primary/20">
                            {getInitials(stk.full_name)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h3
                                data-testid={`stakeholder-name-${stk.id}`}
                                className="font-semibold text-on-surface text-base group-hover:text-primary transition-colors"
                              >
                                {stk.full_name}
                              </h3>

                              {/* Active / Inactive Status Indicator [FR-006] */}
                              <span
                                data-testid={`active-status-${stk.id}`}
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                                  stk.is_active
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                )}
                              >
                                <span
                                  className={cn(
                                    'w-1.5 h-1.5 rounded-full mr-1',
                                    stk.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                                  )}
                                />
                                {stk.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            {/* Organizational Role */}
                            <div className="flex items-center text-xs text-on-surface-variant font-medium">
                              <Building className="w-3.5 h-3.5 mr-1 text-outline" />
                              <span data-testid={`stakeholder-role-${stk.id}`}>{stk.org_role}</span>
                            </div>

                            {/* Email Link */}
                            <div className="flex items-center text-xs text-on-surface-variant">
                              <Mail className="w-3.5 h-3.5 mr-1 text-outline" />
                              <a
                                href={`mailto:${stk.email}`}
                                className="hover:text-primary transition-colors underline decoration-outline-variant"
                              >
                                {stk.email}
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Influence Level Badge [FR-006] */}
                        <div className="flex flex-col items-end space-y-2">
                          <span
                            data-testid={`influence-badge-${stk.id}`}
                            className={cn(
                              'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shadow-2xs',
                              influenceStyle.badgeBg,
                              influenceStyle.badgeText,
                              influenceStyle.badgeBorder
                            )}
                          >
                            <span className={cn('w-2 h-2 rounded-full mr-1.5', influenceStyle.dotColor)} />
                            {stk.influence_level} Influence
                          </span>

                          {/* Quick Action Button: Filter Activity or Log Interaction */}
                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedStakeholderId(isSelected ? null : stk.id)
                              }
                              className={cn(
                                'text-xs px-2 py-1 rounded-md border transition-colors',
                                isSelected
                                  ? 'bg-primary text-on-primary border-primary'
                                  : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface border-outline-variant'
                              )}
                              title="Filter activity feed to this stakeholder"
                            >
                              {isSelected ? 'Show All Feed' : 'Filter Feed'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenLogModal(stk.id)}
                              className="text-xs px-2 py-1 rounded-md bg-secondary/10 text-secondary font-medium hover:bg-secondary/20 transition-colors"
                              title="Log activity for this stakeholder"
                            >
                              + Activity
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Chronological Activity Feed (5 cols) [FR-007] */}
          <div
            data-testid="activity-feed"
            className="lg:col-span-5 bg-surface-container-low/60 rounded-xl p-4 border border-outline-variant space-y-4"
          >
            {/* Activity Feed Header & Type Filter */}
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div>
                <h3 className="font-semibold text-on-surface text-base flex items-center">
                  <Activity className="w-4 h-4 mr-1.5 text-secondary" />
                  Interaction Feed
                </h3>
                {selectedStakeholderId && (
                  <p className="text-xs text-primary font-medium mt-0.5">
                    Filtered by: {stakeholderMapById.get(selectedStakeholderId)?.full_name}
                  </p>
                )}
              </div>

              {/* Activity Type Filter */}
              <select
                data-testid="activity-type-filter"
                value={activityTypeFilter}
                onChange={(e) => setActivityTypeFilter(e.target.value)}
                className="py-1 px-2 text-xs bg-surface-container-lowest text-on-surface border border-outline-variant rounded-md focus:outline-hidden"
              >
                <option value="ALL">All Interactions</option>
                <option value="Email">Emails</option>
                <option value="Meeting">Meetings</option>
                <option value="Call">Calls</option>
                <option value="Note">Notes</option>
              </select>
            </div>

            {/* Activities List Timeline [FR-007] */}
            {filteredActivities.length === 0 ? (
              <div
                data-testid="no-activities-msg"
                className="text-center py-12 px-4 bg-surface-container-lowest rounded-lg border border-dashed border-outline-variant space-y-2"
              >
                <MessageSquare className="w-8 h-8 text-outline mx-auto" />
                <p className="text-sm font-medium text-on-surface">No recent interaction activities.</p>
                <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                  Log emails, calls, meetings, or notes to maintain a chronological audit trail for this deal.
                </p>
                {stakeholders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenLogModal()}
                    className="mt-1 inline-flex items-center text-xs font-medium text-secondary hover:underline"
                  >
                    + Log first interaction
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-outline-variant/60 before:z-0">
                {filteredActivities.map((act) => {
                  const typeConfig = getActivityTypeConfig(act.activity_type);
                  const Icon = typeConfig.icon;
                  const stakeholder = stakeholderMapById.get(act.stakeholder_id);

                  return (
                    <div
                      key={act.id}
                      data-testid={`activity-item-${act.id}`}
                      className="relative z-10 flex items-start space-x-3 bg-surface-container-lowest p-3.5 rounded-lg border border-outline-variant shadow-2xs hover:border-outline transition-colors"
                    >
                      {/* Activity Type Icon Badge */}
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs',
                          typeConfig.iconBg,
                          typeConfig.iconText
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Activity Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          {/* Type Label & Stakeholder Name */}
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold',
                              typeConfig.badgeBg,
                              typeConfig.badgeText
                            )}
                          >
                            {typeConfig.label}
                          </span>

                          {/* Chronological Timestamp */}
                          <span className="text-xs text-on-surface-variant font-medium flex items-center">
                            <Clock className="w-3 h-3 mr-1 text-outline" />
                            {formatActivityDate(act.occurred_on || act.created_on)}
                          </span>
                        </div>

                        {/* Associated Stakeholder Name */}
                        <div className="text-xs font-medium text-on-surface flex items-center">
                          <User className="w-3 h-3 mr-1 text-outline" />
                          <span>{stakeholder ? stakeholder.full_name : 'Mapped Contact'}</span>
                          {stakeholder?.org_role && (
                            <span className="text-on-surface-variant font-normal ml-1">
                              ({stakeholder.org_role})
                            </span>
                          )}
                        </div>

                        {/* Summary / Notes */}
                        <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed pt-0.5">
                          {act.summary}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Stakeholder Contact */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-stakeholder-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs"
        >
          <div className="bg-surface text-on-surface rounded-xl border border-outline shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 id="add-stakeholder-title" className="text-lg font-semibold text-on-surface flex items-center">
                <User className="w-5 h-5 mr-2 text-primary" />
                Add Stakeholder Contact
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 text-rose-600" />
                {formError}
              </div>
            )}

            <form data-testid="add-stakeholder-form" onSubmit={handleAddStakeholder} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. sjenkins@acme.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Organizational Role <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chief Technology Officer / Economic Buyer"
                  value={newOrgRole}
                  onChange={(e) => setNewOrgRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Influence Level <span className="text-rose-600">*</span>
                </label>
                <select
                  value={newInfluenceLevel}
                  onChange={(e) => setNewInfluenceLevel(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                >
                  <option value="High">High Influence (Decision Maker / Champion)</option>
                  <option value="Medium">Medium Influence (Evaluator / End User)</option>
                  <option value="Low">Low Influence (Advisor / Observer)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-colors shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Add Stakeholder'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Log Activity Record */}
      {isLogModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="log-activity-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs"
        >
          <div className="bg-surface text-on-surface rounded-xl border border-outline shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <h3 id="log-activity-title" className="text-lg font-semibold text-on-surface flex items-center">
                <Activity className="w-5 h-5 mr-2 text-secondary" />
                Log Interaction Activity
              </h3>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 text-rose-600" />
                {formError}
              </div>
            )}

            <form data-testid="log-activity-form" onSubmit={handleLogActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Stakeholder Contact <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={logStakeholderId}
                  onChange={(e) => setLogStakeholderId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                >
                  <option value="" disabled>
                    Select stakeholder...
                  </option>
                  {stakeholders.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.org_role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Activity Type <span className="text-rose-600">*</span>
                </label>
                <select
                  value={logActivityType}
                  onChange={(e) => setLogActivityType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                >
                  <option value="Meeting">Meeting (Demo, Review, Sync)</option>
                  <option value="Email">Email (Correspondance, Proposal Sent)</option>
                  <option value="Call">Phone Call (Discovery, Negotiation)</option>
                  <option value="Note">Note (Internal Observation, SLA Update)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Interaction Summary / Details <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Summarize key takeaways, action items, or decisions from this interaction..."
                  value={logSummary}
                  onChange={(e) => setLogSummary(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Occurred Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={logOccurredOn}
                  onChange={(e) => setLogOccurredOn(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant rounded-md focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium bg-secondary text-on-secondary rounded-lg hover:bg-secondary/90 transition-colors shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Logging...
                    </>
                  ) : (
                    'Log Interaction'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StakeholderMap;
