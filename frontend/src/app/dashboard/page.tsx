'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { colors, radii, shadows, spacing, typography } from '../../lib/tokens';
import {
  dashboardApi,
  DashboardResponse,
  PipelineStatusSummary,
  Task,
  Interaction,
} from '../../services/crm';
import { LoadingSpinner, EmptyState } from '../../components/shared/States';
import { Alert } from '../../components/shared/Alerts';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatDate } from '../../lib/format';

/**
 * Helper to format pipeline numeric values as currency ($XX,XXX).
 */
function formatPipelineValue(value: number | string | null | undefined): string {
  const num = typeof value === 'number' ? value : Number(value || 0);
  if (isNaN(num)) return '$0';
  return `$${num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await dashboardApi.get();
      if (response.error) {
        const errObj = response.error as any;
        setError(
          typeof errObj === 'string'
            ? errObj
            : errObj?.message || 'Failed to load dashboard metrics.'
        );
        setDashboardData(null);
      } else if (response.data) {
        setDashboardData(response.data as DashboardResponse);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while fetching dashboard metrics.'
      );
      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const pipelineByStatus: PipelineStatusSummary[] = useMemo(() => {
    return dashboardData?.pipeline_by_status ?? [];
  }, [dashboardData]);

  const upcomingTasks: Task[] = useMemo(() => {
    return dashboardData?.upcoming_tasks ?? [];
  }, [dashboardData]);

  const overdueTasks: Task[] = useMemo(() => {
    return dashboardData?.overdue_tasks ?? [];
  }, [dashboardData]);

  const recentInteractions: Interaction[] = useMemo(() => {
    return dashboardData?.recent_interactions ?? [];
  }, [dashboardData]);

  const totalPipelineValue = useMemo(() => {
    return pipelineByStatus.reduce((acc, stage) => {
      const val = typeof stage.total_value === 'number' ? stage.total_value : Number(stage.total_value || 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [pipelineByStatus]);

  const totalLeadsCount = useMemo(() => {
    return pipelineByStatus.reduce((acc, stage) => {
      const cnt = typeof stage.count === 'number' ? stage.count : Number(stage.count || 0);
      return acc + (isNaN(cnt) ? 0 : cnt);
    }, 0);
  }, [pipelineByStatus]);

  const primaryBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.accent.primary,
    color: colors.accent.onPrimary,
    fontFamily: typography.styles.bodyMd.fontFamily,
    fontSize: typography.styles.caption.fontSize,
    fontWeight: 500,
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: radii.default,
    textDecoration: 'none',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  };

  const secondaryBtnStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface.containerLowest,
    color: colors.surface.onSurface,
    fontFamily: typography.styles.bodyMd.fontFamily,
    fontSize: typography.styles.caption.fontSize,
    fontWeight: 500,
    padding: `${spacing[2]} ${spacing[4]}`,
    borderRadius: radii.default,
    border: `1px solid ${colors.surface.outlineVariant}`,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.surface.containerLowest,
    borderRadius: radii.lg,
    border: `1px solid ${colors.surface.outlineVariant}`,
    boxShadow: shadows.subtle,
    padding: spacing[6],
    display: 'flex',
    flexDirection: 'column',
    gap: spacing[4],
  };

  return (
    <div
      data-testid="dashboard-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[8],
        maxWidth: '1280px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Page Header */}
      <header
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: `1px solid ${colors.surface.outlineVariant}`,
          paddingBottom: spacing[6],
          flexWrap: 'wrap',
          gap: spacing[4],
        }}
      >
        <div>
          <h1
            id="dashboard-heading"
            style={{
              fontFamily: typography.styles.displayLg.fontFamily,
              fontSize: typography.styles.displayLg.fontSize,
              fontWeight: typography.styles.displayLg.fontWeight,
              lineHeight: typography.styles.displayLg.lineHeight,
              letterSpacing: typography.styles.displayLg.letterSpacing,
              color: colors.surface.onSurface,
              margin: `0 0 ${spacing[2]} 0`,
            }}
          >
            Dashboard
          </h1>
          <p
            style={{
              fontFamily: typography.styles.bodyLg.fontFamily,
              fontSize: typography.styles.bodyLg.fontSize,
              lineHeight: typography.styles.bodyLg.lineHeight,
              color: colors.surface.onSurfaceVariant,
              margin: 0,
            }}
          >
            Real-time overview of sales pipeline, upcoming task priorities, and recent activity.
          </p>
        </div>

        <div style={{ display: 'flex', gap: spacing[3], alignItems: 'center' }}>
          <button
            type="button"
            onClick={fetchDashboard}
            disabled={isLoading}
            data-testid="refresh-dashboard-btn"
            style={secondaryBtnStyle}
            aria-label="Refresh dashboard data"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <Alert
          variant="error"
          title="Dashboard Error"
          onClose={() => setError(null)}
          data-testid="dashboard-error"
        >
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div
          data-testid="dashboard-loading"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `${spacing[12]} ${spacing[6]}`,
            gap: spacing[4],
          }}
        >
          <LoadingSpinner size="lg" />
          <p
            style={{
              fontFamily: typography.styles.bodyMd.fontFamily,
              color: colors.surface.onSurfaceVariant,
              margin: 0,
            }}
          >
            Loading metrics...
          </p>
        </div>
      ) : (
        <>
          {/* Top KPI Cards Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: spacing[6],
            }}
          >
            <div style={cardStyle} data-testid="kpi-total-pipeline">
              <span
                style={{
                  fontSize: typography.styles.caption.fontSize,
                  fontFamily: typography.styles.caption.fontFamily,
                  color: colors.surface.onSurfaceVariant,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Total Pipeline Value
              </span>
              <div
                style={{
                  fontFamily: typography.styles.headlineMd.fontFamily,
                  fontSize: typography.styles.headlineMd.fontSize,
                  fontWeight: typography.styles.headlineMd.fontWeight,
                  color: colors.accent.primary,
                }}
              >
                {formatPipelineValue(totalPipelineValue)}
              </div>
              <span
                style={{
                  fontSize: typography.styles.caption.fontSize,
                  color: colors.surface.onSurfaceVariant,
                }}
              >
                {totalLeadsCount} {totalLeadsCount === 1 ? 'active lead' : 'active leads'} total
              </span>
            </div>

            <div style={cardStyle} data-testid="kpi-tasks-summary">
              <span
                style={{
                  fontSize: typography.styles.caption.fontSize,
                  fontFamily: typography.styles.caption.fontFamily,
                  color: colors.surface.onSurfaceVariant,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Upcoming & Overdue Tasks
              </span>
              <div
                style={{
                  fontFamily: typography.styles.headlineMd.fontFamily,
                  fontSize: typography.styles.headlineMd.fontSize,
                  fontWeight: typography.styles.headlineMd.fontWeight,
                  color: overdueTasks.length > 0 ? colors.secondary.main : colors.surface.onSurface,
                }}
              >
                {upcomingTasks.length + overdueTasks.length}
              </div>
              <span
                style={{
                  fontSize: typography.styles.caption.fontSize,
                  color: overdueTasks.length > 0 ? colors.secondary.main : colors.surface.onSurfaceVariant,
                  fontWeight: overdueTasks.length > 0 ? 500 : 400,
                }}
              >
                {overdueTasks.length} {overdueTasks.length === 1 ? 'overdue task' : 'overdue tasks'}
              </span>
            </div>

            <div style={cardStyle} data-testid="kpi-interactions-summary">
              <span
                style={{
                  fontSize: typography.styles.caption.fontSize,
                  fontFamily: typography.styles.caption.fontFamily,
                  color: colors.surface.onSurfaceVariant,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Recent Interactions
              </span>
              <div
                style={{
                  fontFamily: typography.styles.headlineMd.fontFamily,
                  fontSize: typography.styles.headlineMd.fontSize,
                  fontWeight: typography.styles.headlineMd.fontWeight,
                  color: colors.surface.onSurface,
                }}
              >
                {recentInteractions.length}
              </div>
              <span
                style={{
                  fontSize: typography.styles.caption.fontSize,
                  color: colors.surface.onSurfaceVariant,
                }}
              >
                Recent customer touchpoints
              </span>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: spacing[8],
            }}
          >
            {/* Widget 1: Pipeline Summary Widget */}
            <section
              aria-labelledby="pipeline-summary-heading"
              data-testid="pipeline-summary-widget"
              style={cardStyle}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${colors.surface.outlineVariant}`,
                  paddingBottom: spacing[4],
                }}
              >
                <div>
                  <h2
                    id="pipeline-summary-heading"
                    style={{
                      fontFamily: typography.styles.headlineSm.fontFamily,
                      fontSize: typography.styles.headlineSm.fontSize,
                      fontWeight: typography.styles.headlineSm.fontWeight,
                      margin: 0,
                      color: colors.surface.onSurface,
                    }}
                  >
                    Pipeline Summary
                  </h2>
                  <p
                    style={{
                      fontSize: typography.styles.caption.fontSize,
                      color: colors.surface.onSurfaceVariant,
                      margin: `${spacing[1]} 0 0 0`,
                    }}
                  >
                    Lead counts and monetary value by stage
                  </p>
                </div>
                <Link href="/leads" style={secondaryBtnStyle}>
                  View Leads
                </Link>
              </div>

              {pipelineByStatus.length === 0 || totalLeadsCount === 0 ? (
                <EmptyState
                  title="No leads in pipeline"
                  description="Start tracking prospective sales deals by adding leads to your pipeline."
                  action={
                    <Link href="/leads" style={primaryBtnStyle} data-testid="add-lead-btn">
                      Add Lead
                    </Link>
                  }
                  data-testid="pipeline-empty-state"
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
                  {pipelineByStatus.map((stage) => {
                    const statusKey = stage.status.toLowerCase().replace(/\s+/g, '-');
                    const stageCount = typeof stage.count === 'number' ? stage.count : Number(stage.count || 0);
                    const stageValue = typeof stage.total_value === 'number' ? stage.total_value : Number(stage.total_value || 0);
                    const percentage = totalPipelineValue > 0 ? Math.min(100, Math.round((stageValue / totalPipelineValue) * 100)) : 0;

                    return (
                      <div
                        key={stage.status}
                        data-testid={`pipeline-stage-${statusKey}`}
                        style={{
                          padding: spacing[4],
                          backgroundColor: colors.surface.containerLow,
                          borderRadius: radii.md,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: spacing[2],
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: spacing[2],
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
                            <StatusBadge status={stage.status} size="sm" />
                            <span
                              style={{
                                fontSize: typography.styles.caption.fontSize,
                                color: colors.surface.onSurfaceVariant,
                                fontWeight: 500,
                              }}
                            >
                              {stageCount} {stageCount === 1 ? 'lead' : 'leads'}
                            </span>
                          </div>
                          <span
                            data-testid={`pipeline-value-${statusKey}`}
                            style={{
                              fontFamily: typography.styles.bodyMd.fontFamily,
                              fontWeight: 600,
                              color: colors.surface.onSurface,
                            }}
                          >
                            {formatPipelineValue(stageValue)}
                          </span>
                        </div>

                        {/* Progress Bar Visualizer */}
                        <div
                          style={{
                            width: '100%',
                            height: '6px',
                            backgroundColor: colors.surface.outlineVariant,
                            borderRadius: radii.full,
                            overflow: 'hidden',
                            marginTop: spacing[1],
                          }}
                        >
                          <div
                            style={{
                              width: `${percentage}%`,
                              height: '100%',
                              backgroundColor: colors.accent.primary,
                              borderRadius: radii.full,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Widget 2: Upcoming & Overdue Tasks Widget */}
            <section
              aria-labelledby="upcoming-tasks-heading"
              data-testid="upcoming-tasks-widget"
              style={cardStyle}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${colors.surface.outlineVariant}`,
                  paddingBottom: spacing[4],
                }}
              >
                <div>
                  <h2
                    id="upcoming-tasks-heading"
                    style={{
                      fontFamily: typography.styles.headlineSm.fontFamily,
                      fontSize: typography.styles.headlineSm.fontSize,
                      fontWeight: typography.styles.headlineSm.fontWeight,
                      margin: 0,
                      color: colors.surface.onSurface,
                    }}
                  >
                    Upcoming Tasks
                  </h2>
                  <p
                    style={{
                      fontSize: typography.styles.caption.fontSize,
                      color: colors.surface.onSurfaceVariant,
                      margin: `${spacing[1]} 0 0 0`,
                    }}
                  >
                    Action items due in the next 7 days and overdue tasks
                  </p>
                </div>
                <Link href="/tasks" style={secondaryBtnStyle}>
                  View Tasks
                </Link>
              </div>

              {overdueTasks.length === 0 && upcomingTasks.length === 0 ? (
                <EmptyState
                  title="No upcoming tasks"
                  description="You have no tasks due in the next 7 days."
                  action={
                    <Link href="/tasks" style={primaryBtnStyle} data-testid="add-task-btn">
                      Add Task
                    </Link>
                  }
                  data-testid="tasks-empty-state"
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
                  {/* Overdue Tasks Section */}
                  {overdueTasks.map((task) => {
                    const taskTitle = (task as any).description || (task as any).title || 'Task';
                    return (
                      <div
                        key={`overdue-${task.id}`}
                        data-testid={`overdue-task-${task.id}`}
                        style={{
                          padding: spacing[4],
                          backgroundColor: 'rgba(186, 26, 26, 0.05)',
                          borderRadius: radii.md,
                          borderLeft: `4px solid ${colors.secondary.main}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: spacing[2],
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[2] }}>
                          <span
                            style={{
                              fontFamily: typography.styles.bodyMd.fontFamily,
                              fontWeight: 500,
                              color: colors.surface.onSurface,
                            }}
                          >
                            {taskTitle}
                          </span>
                          <StatusBadge status="overdue" label="Overdue" size="sm" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: typography.styles.caption.fontSize,
                              color: colors.secondary.main,
                              fontWeight: 500,
                            }}
                          >
                            Due: {formatDate(task.due_date, { fallback: 'Overdue' })}
                          </span>
                          <Link
                            href="/tasks"
                            style={{
                              fontSize: typography.styles.caption.fontSize,
                              color: colors.accent.primary,
                              textDecoration: 'none',
                              fontWeight: 500,
                            }}
                          >
                            Manage →
                          </Link>
                        </div>
                      </div>
                    );
                  })}

                  {/* Upcoming Tasks Section */}
                  {upcomingTasks.map((task) => {
                    const taskTitle = (task as any).description || (task as any).title || 'Task';
                    const isCompleted = Boolean((task as any).completed);
                    return (
                      <div
                        key={`upcoming-${task.id}`}
                        data-testid={`upcoming-task-${task.id}`}
                        style={{
                          padding: spacing[4],
                          backgroundColor: colors.surface.containerLow,
                          borderRadius: radii.md,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: spacing[2],
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[2] }}>
                          <span
                            style={{
                              fontFamily: typography.styles.bodyMd.fontFamily,
                              fontWeight: 500,
                              color: isCompleted ? colors.surface.onSurfaceVariant : colors.surface.onSurface,
                              textDecoration: isCompleted ? 'line-through' : 'none',
                            }}
                          >
                            {taskTitle}
                          </span>
                          <StatusBadge
                            status={isCompleted ? 'completed' : 'pending'}
                            label={isCompleted ? 'Completed' : 'Upcoming'}
                            size="sm"
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: typography.styles.caption.fontSize,
                              color: colors.surface.onSurfaceVariant,
                            }}
                          >
                            Due: {formatDate(task.due_date, { fallback: 'Soon' })}
                          </span>
                          <Link
                            href="/tasks"
                            style={{
                              fontSize: typography.styles.caption.fontSize,
                              color: colors.accent.primary,
                              textDecoration: 'none',
                              fontWeight: 500,
                            }}
                          >
                            View →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Widget 3: Recent Interactions Widget */}
            <section
              aria-labelledby="recent-interactions-heading"
              data-testid="recent-interactions-widget"
              style={cardStyle}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${colors.surface.outlineVariant}`,
                  paddingBottom: spacing[4],
                }}
              >
                <div>
                  <h2
                    id="recent-interactions-heading"
                    style={{
                      fontFamily: typography.styles.headlineSm.fontFamily,
                      fontSize: typography.styles.headlineSm.fontSize,
                      fontWeight: typography.styles.headlineSm.fontWeight,
                      margin: 0,
                      color: colors.surface.onSurface,
                    }}
                  >
                    Recent Interactions
                  </h2>
                  <p
                    style={{
                      fontSize: typography.styles.caption.fontSize,
                      color: colors.surface.onSurfaceVariant,
                      margin: `${spacing[1]} 0 0 0`,
                    }}
                  >
                    Latest logged touchpoints, calls, emails, and notes
                  </p>
                </div>
                <Link href="/interactions" style={secondaryBtnStyle}>
                  View All
                </Link>
              </div>

              {recentInteractions.length === 0 ? (
                <EmptyState
                  title="No recent interactions"
                  description="Log calls, emails, meetings, or notes to track activity history."
                  action={
                    <Link href="/interactions" style={primaryBtnStyle} data-testid="add-interaction-btn">
                      Add Interaction
                    </Link>
                  }
                  data-testid="interactions-empty-state"
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
                  {recentInteractions.map((interaction) => {
                    const intType = (interaction as any).type || 'note';
                    const intSummary = (interaction as any).summary || (interaction as any).notes || 'Interaction record';
                    const intDate = (interaction as any).date || (interaction as any).timestamp || (interaction as any).created_at;

                    return (
                      <div
                        key={interaction.id}
                        data-testid={`recent-interaction-${interaction.id}`}
                        style={{
                          padding: spacing[4],
                          backgroundColor: colors.surface.containerLow,
                          borderRadius: radii.md,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: spacing[2],
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing[2] }}>
                          <StatusBadge status={intType} size="sm" />
                          <span
                            style={{
                              fontSize: typography.styles.caption.fontSize,
                              color: colors.surface.onSurfaceVariant,
                            }}
                          >
                            {formatDate(intDate, { includeTime: true, fallback: 'Recent' })}
                          </span>
                        </div>
                        <p
                          style={{
                            fontFamily: typography.styles.bodyMd.fontFamily,
                            fontSize: typography.styles.bodyMd.fontSize,
                            color: colors.surface.onSurface,
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {intSummary}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
