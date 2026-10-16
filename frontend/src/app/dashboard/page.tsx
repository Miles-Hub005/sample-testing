'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, rounded, shadows, spacing, typography } from '@/lib/tokens';
import { formatCurrency, formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ErrorAlert } from '@/components/shared/Alerts';
import { LoadingState, EmptyState } from '@/components/shared/States';
import {
  getDashboard,
  listCompanies,
  listContacts,
  listLeads,
  DashboardSummary,
  PipelineStatusSummary,
  DashboardTaskRead,
  DashboardInteractionRead,
  CompanyRead,
  ContactRead,
  LeadRead,
  CRMApiError,
} from '@/services/crm';

/**
 * DashboardPage Component
 * Route segment for `/dashboard`
 * Displays pipeline totals by lead status, upcoming tasks (next 7 days), and recent interactions (last 10).
 * Features friendly empty states with action buttons when widgets have no data.
 * Satisfies FR-6 (Dashboard Aggregations), FR-14 (Empty States), and US-5 (Dashboard Metrics).
 */
export default function DashboardPage() {
  // Main dashboard summary state
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);

  // Background lookup entity states for human-readable entity references
  const [companies, setCompanies] = useState<CompanyRead[]>([]);
  const [contacts, setContacts] = useState<ContactRead[]>([]);
  const [leads, setLeads] = useState<LeadRead[]>([]);

  // Loading and error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Maps for quick entity ID to entity name lookups
  const companyMap = useMemo(() => {
    const map: Record<number, string> = {};
    companies.forEach((comp) => {
      map[comp.id] = comp.name;
    });
    return map;
  }, [companies]);

  const contactMap = useMemo(() => {
    const map: Record<number, string> = {};
    contacts.forEach((cont) => {
      map[cont.id] = cont.name;
    });
    return map;
  }, [contacts]);

  const leadMap = useMemo(() => {
    const map: Record<number, string> = {};
    leads.forEach((l) => {
      map[l.id] = l.title || `Lead #${l.id}`;
    });
    return map;
  }, [leads]);

  // Fetch dashboard aggregation data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await getDashboard();
      setDashboardData(summary);
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setError(`Failed to load dashboard: ${err.message}`);
      } else if (err instanceof Error) {
        setError(`Failed to load dashboard: ${err.message}`);
      } else {
        setError('Failed to load dashboard metrics.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch background lookup entity lists
  const fetchEntityLookups = useCallback(async () => {
    try {
      const [compRes, contRes, leadRes] = await Promise.allSettled([
        listCompanies({ page_size: 1000 }),
        listContacts({ page_size: 1000 }),
        listLeads({ page_size: 1000 }),
      ]);

      if (compRes.status === 'fulfilled' && Array.isArray(compRes.value)) {
        setCompanies(compRes.value);
      }
      if (contRes.status === 'fulfilled' && Array.isArray(contRes.value)) {
        setContacts(contRes.value);
      }
      if (leadRes.status === 'fulfilled' && Array.isArray(leadRes.value)) {
        setLeads(leadRes.value);
      }
    } catch {
      // Non-critical background entity lookup failure
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
    fetchEntityLookups();
  }, [fetchDashboardData, fetchEntityLookups]);

  // Aggregate total pipeline value and count
  const pipelineMetrics = useMemo(() => {
    if (!dashboardData || !dashboardData.pipeline_by_status) {
      return { totalValue: 0, totalCount: 0 };
    }
    const totalValue = dashboardData.pipeline_by_status.reduce(
      (sum, item) => sum + (item.total_value || 0),
      0
    );
    const totalCount = dashboardData.pipeline_by_status.reduce(
      (sum, item) => sum + (item.count || 0),
      0
    );
    return { totalValue, totalCount };
  }, [dashboardData]);

  // Check if pipeline has records
  const isPipelineEmpty = useMemo(() => {
    if (!dashboardData || !dashboardData.pipeline_by_status) return true;
    return (
      dashboardData.pipeline_by_status.length === 0 ||
      dashboardData.pipeline_by_status.every(
        (item) => item.count === 0 && (item.total_value === 0 || !item.total_value)
      )
    );
  }, [dashboardData]);

  // Check if upcoming tasks are empty
  const isTasksEmpty = useMemo(() => {
    if (!dashboardData) return true;
    const upcomingEmpty = !dashboardData.upcoming_tasks || dashboardData.upcoming_tasks.length === 0;
    const overdueEmpty = !dashboardData.overdue_tasks || dashboardData.overdue_tasks.length === 0;
    return upcomingEmpty && overdueEmpty;
  }, [dashboardData]);

  // Check if recent interactions are empty
  const isInteractionsEmpty = useMemo(() => {
    if (!dashboardData) return true;
    return !dashboardData.recent_interactions || dashboardData.recent_interactions.length === 0;
  }, [dashboardData]);

  return (
    <section
      aria-label="Executive Dashboard"
      style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}
    >
      {/* Breadcrumbs Navigation (FR-10) */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: `-${spacing.sm}` }}>
        <ol
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            listStyle: 'none',
            margin: 0,
            padding: 0,
            fontSize: typography.sizes.caption.fontSize,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          <li>
            <a href="/" style={{ color: colors.accent.DEFAULT, textDecoration: 'none' }}>
              Home
            </a>
          </li>
          <li>/</li>
          <li aria-current="page" style={{ color: colors.surface.onSurface, fontWeight: 500 }}>
            Dashboard
          </li>
        </ol>
      </nav>

      {/* Header Banner */}
      <header
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: `1px solid ${colors.borderVariant}`,
          paddingBottom: spacing.md,
          flexWrap: 'wrap',
          gap: spacing.md,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: typography.fontFamily.serif,
              fontSize: typography.sizes['headline-md'].fontSize,
              fontWeight: typography.sizes['headline-md'].fontWeight,
              lineHeight: typography.sizes['headline-md'].lineHeight,
              color: colors.surface.onSurface,
              margin: 0,
            }}
          >
            Dashboard
          </h1>
          <p
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: typography.sizes['body-md'].fontSize,
              color: colors.surface.onSurfaceVariant,
              margin: `${spacing.xs} 0 0 0`,
            }}
          >
            Overview of sales pipeline totals, upcoming task commitments, and recent interaction logs.
          </p>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
          <a
            href="/leads"
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.surface.surfaceContainerHigh,
              color: colors.surface.onSurface,
              border: `1px solid ${colors.borderVariant}`,
              borderRadius: rounded.md,
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Manage Leads
          </a>
          <a
            href="/tasks"
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.surface.surfaceContainerHigh,
              color: colors.surface.onSurface,
              border: `1px solid ${colors.borderVariant}`,
              borderRadius: rounded.md,
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Manage Tasks
          </a>
          <a
            href="/interactions"
            style={{
              padding: `${spacing.sm} ${spacing.md}`,
              backgroundColor: colors.accent.DEFAULT,
              color: colors.accent.onAccent,
              border: 'none',
              borderRadius: rounded.md,
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Log Interaction
          </a>
        </div>
      </header>

      {/* Error Alert Display */}
      {error && (
        <ErrorAlert
          title="Dashboard Error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Main Content Loading State */}
      {loading ? (
        <LoadingState label="Loading dashboard summary..." minHeight="300px" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xl }}>
          {/* ============================================================ */}
          {/* WIDGET 1: PIPELINE SUMMARY WIDGET (FR-6, US-5)               */}
          {/* ============================================================ */}
          <section
            aria-label="Pipeline Summary Widget"
            style={{
              backgroundColor: colors.surface.containerLow,
              borderRadius: rounded.lg,
              border: `1px solid ${colors.borderVariant}`,
              padding: spacing.xl,
              boxShadow: shadows.sm,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: spacing.lg,
                borderBottom: `1px solid ${colors.borderVariant}`,
                paddingBottom: spacing.sm,
                flexWrap: 'wrap',
                gap: spacing.sm,
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: typography.fontFamily.serif,
                    fontSize: typography.sizes['headline-sm'].fontSize,
                    color: colors.surface.onSurface,
                    margin: 0,
                  }}
                >
                  Sales Pipeline Summary
                </h2>
                <p
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: typography.sizes.caption.fontSize,
                    color: colors.surface.onSurfaceVariant,
                    margin: `${spacing.xs} 0 0 0`,
                  }}
                >
                  Opportunity distribution and valuation across sales pipeline deal stages.
                </p>
              </div>

              {!isPipelineEmpty && (
                <div
                  style={{
                    display: 'flex',
                    gap: spacing.lg,
                    alignItems: 'center',
                    backgroundColor: colors.surface.containerLowest,
                    padding: `${spacing.xs} ${spacing.md}`,
                    borderRadius: rounded.md,
                    border: `1px solid ${colors.borderVariant}`,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: typography.sizes['label-caps'].fontSize,
                        color: colors.surface.onSurfaceVariant,
                        display: 'block',
                      }}
                    >
                      Total Pipeline Value
                    </span>
                    <strong
                      style={{
                        fontSize: '18px',
                        color: colors.accent.DEFAULT,
                      }}
                    >
                      {formatCurrency(pipelineMetrics.totalValue)}
                    </strong>
                  </div>
                  <div
                    style={{
                      height: '24px',
                      width: '1px',
                      backgroundColor: colors.borderVariant,
                    }}
                  />
                  <div>
                    <span
                      style={{
                        fontSize: typography.sizes['label-caps'].fontSize,
                        color: colors.surface.onSurfaceVariant,
                        display: 'block',
                      }}
                    >
                      Total Leads
                    </span>
                    <strong
                      style={{
                        fontSize: '18px',
                        color: colors.surface.onSurface,
                      }}
                    >
                      {pipelineMetrics.totalCount}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Pipeline Stage Cards or Empty State */}
            {isPipelineEmpty ? (
              <EmptyState
                title="No pipeline records"
                message="No active leads found in the sales pipeline. Create leads to start tracking revenue opportunities."
                actionLabel="Add Lead"
                onAction={() => {
                  window.location.href = '/leads';
                }}
                minHeight="180px"
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: spacing.md,
                }}
              >
                {dashboardData?.pipeline_by_status.map((item: PipelineStatusSummary) => (
                  <div
                    key={item.status}
                    style={{
                      backgroundColor: colors.surface.containerLowest,
                      borderRadius: rounded.md,
                      border: `1px solid ${colors.borderVariant}`,
                      padding: spacing.md,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: spacing.xs,
                      boxShadow: shadows.sm,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <StatusBadge label={item.status} status={item.status} size="sm" />
                      <span
                        style={{
                          fontSize: typography.sizes.caption.fontSize,
                          color: colors.surface.onSurfaceVariant,
                          fontWeight: 500,
                        }}
                      >
                        {item.count} {item.count === 1 ? 'lead' : 'leads'}
                      </span>
                    </div>

                    <div style={{ marginTop: spacing.xs }}>
                      <span
                        style={{
                          fontSize: typography.sizes['label-caps'].fontSize,
                          color: colors.surface.onSurfaceVariant,
                          display: 'block',
                          textTransform: 'uppercase',
                        }}
                      >
                        Value
                      </span>
                      <span
                        style={{
                          fontSize: '16px',
                          fontWeight: 600,
                          color: colors.surface.onSurface,
                        }}
                      >
                        {formatCurrency(item.total_value)}
                      </span>
                    </div>

                    {/* Proportional Stage Indicator */}
                    <div
                      style={{
                        height: '4px',
                        backgroundColor: colors.surface.containerHigh,
                        borderRadius: rounded.full,
                        overflow: 'hidden',
                        marginTop: spacing.xs,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${
                            pipelineMetrics.totalValue > 0
                              ? Math.min(
                                  100,
                                  Math.round(
                                    ((item.total_value || 0) / pipelineMetrics.totalValue) *
                                      100
                                  )
                                )
                              : 0
                          }%`,
                          backgroundColor: colors.accent.DEFAULT,
                          borderRadius: rounded.full,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* TWO COLUMN GRID FOR TASKS & INTERACTIONS (FR-6, US-5)       */}
          {/* ============================================================ */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: spacing.xl,
            }}
          >
            {/* WIDGET 2: UPCOMING TASKS WIDGET */}
            <section
              aria-label="Upcoming Tasks Widget"
              style={{
                backgroundColor: colors.surface.containerLow,
                borderRadius: rounded.lg,
                border: `1px solid ${colors.borderVariant}`,
                padding: spacing.xl,
                boxShadow: shadows.sm,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing.lg,
                  borderBottom: `1px solid ${colors.borderVariant}`,
                  paddingBottom: spacing.sm,
                }}
              >
                <div>
                  <h2
                    style={{
                      fontFamily: typography.fontFamily.serif,
                      fontSize: typography.sizes['headline-sm'].fontSize,
                      color: colors.surface.onSurface,
                      margin: 0,
                    }}
                  >
                    Upcoming Tasks
                  </h2>
                  <span
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.surface.onSurfaceVariant,
                    }}
                  >
                    Action items due in the next 7 days
                  </span>
                </div>

                <a
                  href="/tasks"
                  style={{
                    fontSize: typography.sizes.caption.fontSize,
                    color: colors.accent.DEFAULT,
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  View All Tasks &rarr;
                </a>
              </div>

              {/* Overdue Tasks Section (if present) */}
              {dashboardData?.overdue_tasks && dashboardData.overdue_tasks.length > 0 && (
                <div
                  style={{
                    marginBottom: spacing.md,
                    padding: spacing.md,
                    backgroundColor: colors.status.errorContainer,
                    borderRadius: rounded.md,
                    border: `1px solid ${colors.status.onErrorContainer}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: spacing.xs,
                    }}
                  >
                    <strong
                      style={{
                        fontSize: typography.sizes['body-sm'].fontSize,
                        color: colors.status.onErrorContainer,
                      }}
                    >
                      Overdue Tasks ({dashboardData.overdue_tasks.length})
                    </strong>
                    <StatusBadge label="Action Required" status="error" size="sm" />
                  </div>
                  <ul style={{ margin: 0, paddingLeft: spacing.md, listStyleType: 'disc' }}>
                    {dashboardData.overdue_tasks.slice(0, 3).map((task: DashboardTaskRead) => (
                      <li
                        key={task.id}
                        style={{
                          fontSize: typography.sizes.caption.fontSize,
                          color: colors.surface.onSurface,
                          marginBottom: spacing.xs,
                        }}
                      >
                        <strong>{task.title || task.description}</strong> - Due:{' '}
                        {formatDate(task.due_date)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Upcoming Tasks List or Empty State */}
              {isTasksEmpty ? (
                <EmptyState
                  title="No upcoming tasks"
                  message="You have no pending tasks scheduled for the next 7 days."
                  actionLabel="Add Task"
                  onAction={() => {
                    window.location.href = '/tasks';
                  }}
                  minHeight="180px"
                />
              ) : (
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: spacing.sm,
                  }}
                >
                  {dashboardData?.upcoming_tasks.map((task: DashboardTaskRead) => {
                    const companyName = task.company_id ? companyMap[task.company_id] : null;
                    const leadTitle = task.lead_id ? leadMap[task.lead_id] : null;
                    const entityLabel = companyName || leadTitle || null;

                    return (
                      <li
                        key={task.id}
                        style={{
                          backgroundColor: colors.surface.containerLowest,
                          borderRadius: rounded.md,
                          border: `1px solid ${colors.borderVariant}`,
                          padding: spacing.md,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: spacing.xs,
                          boxShadow: shadows.sm,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: spacing.sm,
                          }}
                        >
                          <span
                            style={{
                              fontSize: typography.sizes['body-sm'].fontSize,
                              fontWeight: 500,
                              color: colors.surface.onSurface,
                            }}
                          >
                            {task.title || task.description}
                          </span>
                          <StatusBadge
                            label={
                              task.overdue
                                ? 'Overdue'
                                : task.completed
                                ? 'Completed'
                                : 'Pending'
                            }
                            status={
                              task.overdue
                                ? 'error'
                                : task.completed
                                ? 'success'
                                : 'warning'
                            }
                            size="sm"
                          />
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: typography.sizes.caption.fontSize,
                            color: colors.surface.onSurfaceVariant,
                            marginTop: spacing.xs,
                          }}
                        >
                          <span>Due: {formatDate(task.due_date) || 'No date set'}</span>
                          {entityLabel && (
                            <span
                              style={{
                                backgroundColor: colors.surface.containerHigh,
                                padding: `2px ${spacing.xs}`,
                                borderRadius: rounded.sm,
                                fontSize: '11px',
                              }}
                            >
                              {entityLabel}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* WIDGET 3: RECENT INTERACTIONS WIDGET */}
            <section
              aria-label="Recent Interactions Widget"
              style={{
                backgroundColor: colors.surface.containerLow,
                borderRadius: rounded.lg,
                border: `1px solid ${colors.borderVariant}`,
                padding: spacing.xl,
                boxShadow: shadows.sm,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: spacing.lg,
                  borderBottom: `1px solid ${colors.borderVariant}`,
                  paddingBottom: spacing.sm,
                }}
              >
                <div>
                  <h2
                    style={{
                      fontFamily: typography.fontFamily.serif,
                      fontSize: typography.sizes['headline-sm'].fontSize,
                      color: colors.surface.onSurface,
                      margin: 0,
                    }}
                  >
                    Recent Interactions
                  </h2>
                  <span
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.surface.onSurfaceVariant,
                    }}
                  >
                    Latest 10 communication logs
                  </span>
                </div>

                <a
                  href="/interactions"
                  style={{
                    fontSize: typography.sizes.caption.fontSize,
                    color: colors.accent.DEFAULT,
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  View All Interactions &rarr;
                </a>
              </div>

              {/* Recent Interactions List or Empty State */}
              {isInteractionsEmpty ? (
                <EmptyState
                  title="No recent interactions"
                  message="No interaction logs recorded yet. Log calls, emails, or notes to track engagement."
                  actionLabel="Log Interaction"
                  onAction={() => {
                    window.location.href = '/interactions';
                  }}
                  minHeight="180px"
                />
              ) : (
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: spacing.sm,
                  }}
                >
                  {dashboardData?.recent_interactions.map(
                    (interaction: DashboardInteractionRead) => {
                      const companyName = interaction.company_id
                        ? companyMap[interaction.company_id]
                        : null;
                      const contactName = interaction.contact_id
                        ? contactMap[interaction.contact_id]
                        : null;
                      const leadTitle = interaction.lead_id
                        ? leadMap[interaction.lead_id]
                        : null;
                      const entityLabel = companyName || contactName || leadTitle || null;

                      const interactionDateStr = formatDate(
                        interaction.interaction_date ||
                          interaction.timestamp ||
                          interaction.created_at
                      );

                      return (
                        <li
                          key={interaction.id}
                          style={{
                            backgroundColor: colors.surface.containerLowest,
                            borderRadius: rounded.md,
                            border: `1px solid ${colors.borderVariant}`,
                            padding: spacing.md,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: spacing.xs,
                            boxShadow: shadows.sm,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <StatusBadge
                              label={String(interaction.type)}
                              status={String(interaction.type)}
                              size="sm"
                            />
                            <span
                              style={{
                                fontSize: typography.sizes.caption.fontSize,
                                color: colors.surface.onSurfaceVariant,
                              }}
                            >
                              {interactionDateStr || 'Recent'}
                            </span>
                          </div>

                          <p
                            style={{
                              fontSize: typography.sizes['body-sm'].fontSize,
                              color: colors.surface.onSurface,
                              margin: `${spacing.xs} 0 0 0`,
                              lineHeight: 1.4,
                            }}
                          >
                            {interaction.summary || interaction.notes || 'Interaction note'}
                          </p>

                          {entityLabel && (
                            <div style={{ marginTop: spacing.xs }}>
                              <span
                                style={{
                                  backgroundColor: colors.surface.containerHigh,
                                  color: colors.surface.onSurfaceVariant,
                                  padding: `2px ${spacing.xs}`,
                                  borderRadius: rounded.sm,
                                  fontSize: '11px',
                                }}
                              >
                                {entityLabel}
                              </span>
                            </div>
                          )}
                        </li>
                      );
                    }
                  )}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
