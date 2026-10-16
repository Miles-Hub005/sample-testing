'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, rounded, shadows, spacing, typography } from '@/lib/tokens';
import { formatDate } from '@/lib/format';
import { DataTable, Column } from '@/components/crm/DataTable';
import { TaskForm, TaskFormData, CompanyOption, LeadOption } from '@/components/crm/TaskForm';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { ErrorAlert, SuccessAlert } from '@/components/shared/Alerts';
import { LoadingState } from '@/components/shared/States';
import {
  getPaginatedTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  listCompanies,
  listLeads,
  TaskRead,
  CompanyRead,
  LeadRead,
  CRMApiError,
} from '@/services/crm';

/**
 * TasksPage Component
 * Route segment for `/tasks`
 * Displays a DataTable of tasks with search, sort, status filter, and pagination.
 * Offers Add Task, Detail View, Edit Task, Quick Complete Toggle, and Delete Task modals.
 * Satisfies FR-4 (Tasks CRUD with due dates), FR-10 (Breadcrumbs/Navigation), and FR-14 (Empty States).
 */
export default function TasksPage() {
  // Data state
  const [tasks, setTasks] = useState<TaskRead[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [searchValue, setSearchValue] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('due_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc');

  // Company and Lead options for dropdowns and lookup maps
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);

  // Loading & error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal & Selection states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const [selectedTask, setSelectedTask] = useState<TaskRead | null>(null);
  const [taskDetail, setTaskDetail] = useState<TaskRead | null>(null);

  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [formApiError, setFormApiError] = useState<CRMApiError | string | null>(null);

  // Map of company ID to company name for fast lookup
  const companyMap = useMemo(() => {
    const map: Record<number, string> = {};
    companies.forEach((comp) => {
      map[comp.id] = comp.name;
    });
    return map;
  }, [companies]);

  // Map of lead ID to lead title for fast lookup
  const leadMap = useMemo(() => {
    const map: Record<number, string> = {};
    leads.forEach((l) => {
      map[l.id] = l.title;
    });
    return map;
  }, [leads]);

  // Fetch company options for dropdown and display
  const fetchCompanies = useCallback(async () => {
    try {
      const companyList: CompanyRead[] = await listCompanies({ page_size: 1000 });
      if (Array.isArray(companyList)) {
        setCompanies(companyList.map((c) => ({ id: c.id, name: c.name })));
      }
    } catch {
      // Non-critical background fetch failure for company list
    }
  }, []);

  // Fetch lead options for dropdown and display
  const fetchLeads = useCallback(async () => {
    try {
      const leadList: LeadRead[] = await listLeads({ page_size: 1000 });
      if (Array.isArray(leadList)) {
        setLeads(
          leadList.map((l) => ({
            id: l.id,
            title: l.title || l.name || `Lead #${l.id}`,
          }))
        );
      }
    } catch {
      // Non-critical background fetch failure for lead list
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
    fetchLeads();
  }, [fetchCompanies, fetchLeads]);

  // Fetch paginated tasks list
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sortParam = sortColumn
        ? sortDirection === 'desc'
          ? `-${sortColumn}`
          : sortColumn
        : undefined;

      const response = await getPaginatedTasks({
        page,
        page_size: pageSize,
        search: searchValue || undefined,
        sort: sortParam,
        status: statusFilter || undefined,
      });

      setTasks(response.items || []);
      setTotalItems(response.total ?? (response.items ? response.items.length : 0));
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load tasks.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchValue, statusFilter, sortColumn, sortDirection]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Modal control helpers
  const handleOpenAddModal = () => {
    setFormApiError(null);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setFormApiError(null);
  };

  const handleOpenEditModal = (task: TaskRead) => {
    setSelectedTask(task);
    setFormApiError(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedTask(null);
    setFormApiError(null);
  };

  const handleOpenDetailModal = async (task: TaskRead) => {
    setSelectedTask(task);
    setTaskDetail(task);
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);

    try {
      const detail = await getTask(task.id);
      setTaskDetail(detail);
    } catch {
      // Fallback to initial selectedTask if detailed fetch fails
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTask(null);
    setTaskDetail(null);
  };

  const handleOpenDeleteModal = (task: TaskRead) => {
    setSelectedTask(task);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedTask(null);
  };

  // Form submit handlers
  const handleCreateTask = async (data: TaskFormData) => {
    setIsSubmitting(true);
    setFormApiError(null);
    try {
      await createTask(data);
      const desc = data.description || 'New Task';
      setSuccessMessage(`Task "${desc.trim()}" created successfully.`);
      handleCloseAddModal();
      fetchTasks();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setFormApiError(err);
      } else if (err instanceof Error) {
        setFormApiError(err.message);
      } else {
        setFormApiError('Failed to create task.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (data: TaskFormData) => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    setFormApiError(null);
    try {
      await updateTask(selectedTask.id, data);
      const desc = data.description || selectedTask.description || 'Task';
      setSuccessMessage(`Task "${desc.trim()}" updated successfully.`);
      handleCloseEditModal();
      fetchTasks();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setFormApiError(err);
      } else if (err instanceof Error) {
        setFormApiError(err.message);
      } else {
        setFormApiError('Failed to update task.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (task: TaskRead) => {
    try {
      const updated = await updateTask(task.id, { completed: !task.completed });
      setSuccessMessage(
        `Task "${task.description}" marked as ${updated.completed ? 'completed' : 'pending'}.`
      );
      fetchTasks();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setError(`Failed to update status: ${err.message}`);
      } else if (err instanceof Error) {
        setError(`Failed to update status: ${err.message}`);
      } else {
        setError('Failed to update task status.');
      }
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    setIsDeleting(true);
    try {
      await deleteTask(selectedTask.id);
      setSuccessMessage(`Task "${selectedTask.description}" deleted successfully.`);
      handleCloseDeleteModal();
      fetchTasks();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setError(`Failed to delete task: ${err.message}`);
      } else if (err instanceof Error) {
        setError(`Failed to delete task: ${err.message}`);
      } else {
        setError('Failed to delete task.');
      }
      handleCloseDeleteModal();
    } finally {
      setIsDeleting(false);
    }
  };

  // Status Filter Control element
  const statusFilterControl = (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
      <label
        htmlFor="status-filter-select"
        style={{
          fontSize: typography.sizes.caption.fontSize,
          fontWeight: 500,
          color: colors.surface.onSurfaceVariant,
        }}
      >
        Filter Status:
      </label>
      <select
        id="status-filter-select"
        value={statusFilter}
        aria-label="Filter tasks by status"
        onChange={(e) => {
          setStatusFilter(e.target.value);
          setPage(1);
        }}
        style={{
          padding: `${spacing.xs} ${spacing.sm}`,
          borderRadius: rounded.sm,
          border: `1px solid ${colors.borderVariant}`,
          backgroundColor: colors.surface.containerLowest,
          color: colors.surface.onSurface,
          fontSize: typography.sizes.caption.fontSize,
        }}
      >
        <option value="">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
        <option value="overdue">Overdue</option>
      </select>
    </div>
  );

  // DataTable Column Definitions
  const columns: Column<TaskRead>[] = [
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      sortField: 'description',
      render: (task) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            style={{
              fontWeight: 500,
              color: colors.surface.onSurface,
              textDecoration: task.completed ? 'line-through' : 'none',
              opacity: task.completed ? 0.7 : 1,
            }}
          >
            {task.description}
          </span>
          {task.title && (
            <span
              style={{
                fontSize: typography.sizes.caption.fontSize,
                color: colors.surface.onSurfaceVariant,
              }}
            >
              {task.title}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      sortField: 'due_date',
      render: (task) => formatDate(task.due_date) || '—',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortField: 'completed',
      render: (task) => {
        if (task.completed) {
          return <StatusBadge label="Completed" status="completed" variant="success" />;
        }
        if (task.overdue) {
          return <StatusBadge label="Overdue" status="overdue" variant="error" />;
        }
        return <StatusBadge label="Pending" status="pending" variant="warning" />;
      },
    },
    {
      key: 'company_id',
      header: 'Company',
      render: (task) => {
        if (!task.company_id) return '—';
        const companyName = companyMap[task.company_id];
        return companyName || `Company #${task.company_id}`;
      },
    },
    {
      key: 'lead_id',
      header: 'Lead',
      render: (task) => {
        if (!task.lead_id) return '—';
        const leadTitle = leadMap[task.lead_id];
        return leadTitle || `Lead #${task.lead_id}`;
      },
    },
    {
      key: 'owner',
      header: 'Owner',
      sortable: true,
      sortField: 'owner',
      render: (task) => task.owner || '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (task) => {
        const displayDesc = task.description || 'Task';
        return (
          <div
            style={{ display: 'flex', gap: spacing.xs, justifyContent: 'flex-end', alignItems: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => handleToggleComplete(task)}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: rounded.sm,
                border: `1px solid ${task.completed ? colors.borderVariant : colors.accent.DEFAULT}`,
                backgroundColor: 'transparent',
                color: task.completed ? colors.surface.onSurfaceVariant : colors.accent.DEFAULT,
                fontSize: '13px',
                cursor: 'pointer',
              }}
              aria-label={
                task.completed ? `Mark ${displayDesc} as pending` : `Mark ${displayDesc} as completed`
              }
            >
              {task.completed ? 'Undo' : 'Complete'}
            </button>
            <button
              type="button"
              onClick={() => handleOpenDetailModal(task)}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: rounded.sm,
                border: `1px solid ${colors.borderVariant}`,
                backgroundColor: 'transparent',
                color: colors.surface.onSurface,
                fontSize: '13px',
                cursor: 'pointer',
              }}
              aria-label={`View details for ${displayDesc}`}
            >
              View
            </button>
            <button
              type="button"
              onClick={() => handleOpenEditModal(task)}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: rounded.sm,
                border: `1px solid ${colors.borderVariant}`,
                backgroundColor: 'transparent',
                color: colors.surface.onSurface,
                fontSize: '13px',
                cursor: 'pointer',
              }}
              aria-label={`Edit ${displayDesc}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleOpenDeleteModal(task)}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: rounded.sm,
                border: `1px solid ${colors.semantic.errorBorder}`,
                backgroundColor: 'transparent',
                color: colors.semantic.error,
                fontSize: '13px',
                cursor: 'pointer',
              }}
              aria-label={`Delete ${displayDesc}`}
            >
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <section
      aria-label="Tasks Management"
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
            <a
              href="/"
              style={{
                color: colors.accent.DEFAULT,
                textDecoration: 'none',
              }}
            >
              Dashboard
            </a>
          </li>
          <li aria-hidden="true" style={{ color: colors.grays[400] }}>
            /
          </li>
          <li
            aria-current="page"
            style={{ fontWeight: 500, color: colors.surface.onSurface }}
          >
            Tasks
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: spacing.md,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: typography.sizes['headline-sm'].fontSize,
              fontWeight: typography.sizes['headline-sm'].fontWeight,
              color: colors.surface.onSurface,
              margin: 0,
            }}
          >
            Tasks
          </h1>
          <p
            style={{
              fontSize: typography.sizes.body.fontSize,
              color: colors.surface.onSurfaceVariant,
              margin: `${spacing.xs} 0 0 0`,
            }}
          >
            Manage task assignments, due dates, completion statuses, and entity links.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: `${spacing.sm} ${spacing.lg}`,
            backgroundColor: colors.accent.DEFAULT,
            color: colors.accent.onAccent,
            border: 'none',
            borderRadius: rounded.md,
            fontSize: typography.sizes.body.fontSize,
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: shadows.sm,
          }}
        >
          + Add Task
        </button>
      </div>

      {/* Feedback Alerts */}
      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
      {successMessage && (
        <SuccessAlert message={successMessage} onClose={() => setSuccessMessage(null)} />
      )}

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={tasks}
        totalItems={totalItems}
        loading={loading}
        searchValue={searchValue}
        searchPlaceholder="Search tasks by description, owner..."
        onSearchChange={(val) => {
          setSearchValue(val);
          setPage(1);
        }}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={(col, dir) => {
          setSortColumn(col);
          setSortDirection(dir);
        }}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
        filters={statusFilterControl}
        emptyTitle="No tasks found"
        emptyMessage="Get started by creating your first task."
        emptyActionLabel="Add Task"
        onEmptyAction={handleOpenAddModal}
        getRowKey={(item) => item.id}
        onRowClick={handleOpenDetailModal}
        ariaLabel="Tasks data table"
      />

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-task-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: spacing.md,
          }}
          onClick={handleCloseAddModal}
        >
          <div
            style={{
              backgroundColor: colors.surface.containerLowest,
              borderRadius: rounded.lg,
              boxShadow: shadows.lg,
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: spacing.lg,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <TaskForm
              title="Add New Task"
              submitLabel="Create Task"
              companies={companies}
              leads={leads}
              onSubmit={handleCreateTask}
              onCancel={handleCloseAddModal}
              isSubmitting={isSubmitting}
              apiError={formApiError}
            />
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {isEditModalOpen && selectedTask && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-task-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: spacing.md,
          }}
          onClick={handleCloseEditModal}
        >
          <div
            style={{
              backgroundColor: colors.surface.containerLowest,
              borderRadius: rounded.lg,
              boxShadow: shadows.lg,
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: spacing.lg,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <TaskForm
              title={`Edit Task #${selectedTask.id}`}
              submitLabel="Save Changes"
              initialValues={selectedTask}
              companies={companies}
              leads={leads}
              onSubmit={handleUpdateTask}
              onCancel={handleCloseEditModal}
              isSubmitting={isSubmitting}
              apiError={formApiError}
            />
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {isDetailModalOpen && selectedTask && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-task-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: spacing.md,
          }}
          onClick={handleCloseDetailModal}
        >
          <div
            style={{
              backgroundColor: colors.surface.containerLowest,
              borderRadius: rounded.lg,
              boxShadow: shadows.lg,
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: spacing.xl,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.md,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: `1px solid ${colors.borderVariant}`,
                paddingBottom: spacing.sm,
              }}
            >
              <div>
                <h2
                  id="detail-task-modal-title"
                  style={{
                    fontSize: typography.sizes['headline-sm'].fontSize,
                    fontWeight: typography.sizes['headline-sm'].fontWeight,
                    color: colors.surface.onSurface,
                    margin: 0,
                  }}
                >
                  {taskDetail?.description || selectedTask.description}
                </h2>
                {taskDetail?.title && (
                  <p
                    style={{
                      fontSize: typography.sizes.body.fontSize,
                      color: colors.surface.onSurfaceVariant,
                      margin: `${spacing.xs} 0 0 0`,
                    }}
                  >
                    {taskDetail.title}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseDetailModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: colors.surface.onSurfaceVariant,
                }}
                aria-label="Close detail modal"
              >
                ✕
              </button>
            </div>

            {isDetailLoading ? (
              <LoadingState message="Loading task details..." />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
                <div>
                  <span
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.surface.onSurfaceVariant,
                      display: 'block',
                    }}
                  >
                    Status
                  </span>
                  <div style={{ marginTop: spacing.xs }}>
                    {(taskDetail?.completed ?? selectedTask.completed) ? (
                      <StatusBadge label="Completed" status="completed" variant="success" />
                    ) : (taskDetail?.overdue ?? selectedTask.overdue) ? (
                      <StatusBadge label="Overdue" status="overdue" variant="error" />
                    ) : (
                      <StatusBadge label="Pending" status="pending" variant="warning" />
                    )}
                  </div>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.surface.onSurfaceVariant,
                      display: 'block',
                    }}
                  >
                    Due Date
                  </span>
                  <span
                    style={{
                      fontSize: typography.sizes.body.fontSize,
                      fontWeight: 500,
                      color: colors.surface.onSurface,
                    }}
                  >
                    {formatDate(taskDetail?.due_date || selectedTask.due_date) || '—'}
                  </span>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.surface.onSurfaceVariant,
                      display: 'block',
                    }}
                  >
                    Owner
                  </span>
                  <span
                    style={{
                      fontSize: typography.sizes.body.fontSize,
                      fontWeight: 500,
                      color: colors.surface.onSurface,
                    }}
                  >
                    {taskDetail?.owner || selectedTask.owner || '—'}
                  </span>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.surface.onSurfaceVariant,
                      display: 'block',
                    }}
                  >
                    Linked Company
                  </span>
                  <span
                    style={{
                      fontSize: typography.sizes.body.fontSize,
                      fontWeight: 500,
                      color: colors.surface.onSurface,
                    }}
                  >
                    {(taskDetail?.company_id || selectedTask.company_id)
                      ? companyMap[(taskDetail?.company_id || selectedTask.company_id)!] ||
                        `Company #${taskDetail?.company_id || selectedTask.company_id}`
                      : '—'}
                  </span>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.surface.onSurfaceVariant,
                      display: 'block',
                    }}
                  >
                    Linked Lead
                  </span>
                  <span
                    style={{
                      fontSize: typography.sizes.body.fontSize,
                      fontWeight: 500,
                      color: colors.surface.onSurface,
                    }}
                  >
                    {(taskDetail?.lead_id || selectedTask.lead_id)
                      ? leadMap[(taskDetail?.lead_id || selectedTask.lead_id)!] ||
                        `Lead #${taskDetail?.lead_id || selectedTask.lead_id}`
                      : '—'}
                  </span>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.surface.onSurfaceVariant,
                      display: 'block',
                    }}
                  >
                    Created At
                  </span>
                  <span
                    style={{
                      fontSize: typography.sizes.body.fontSize,
                      color: colors.surface.onSurface,
                    }}
                  >
                    {formatDate(taskDetail?.created_at || selectedTask.created_at) || '—'}
                  </span>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: spacing.sm,
                borderTop: `1px solid ${colors.borderVariant}`,
                paddingTop: spacing.md,
                marginTop: spacing.sm,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  handleToggleComplete(selectedTask);
                  handleCloseDetailModal();
                }}
                style={{
                  padding: `${spacing.xs} ${spacing.md}`,
                  borderRadius: rounded.md,
                  border: `1px solid ${colors.accent.DEFAULT}`,
                  backgroundColor: 'transparent',
                  color: colors.accent.DEFAULT,
                  fontSize: typography.sizes.body.fontSize,
                  cursor: 'pointer',
                }}
              >
                {selectedTask.completed ? 'Mark as Pending' : 'Mark as Complete'}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCloseDetailModal();
                  handleOpenEditModal(selectedTask);
                }}
                style={{
                  padding: `${spacing.xs} ${spacing.md}`,
                  borderRadius: rounded.md,
                  border: `1px solid ${colors.borderVariant}`,
                  backgroundColor: 'transparent',
                  color: colors.surface.onSurface,
                  fontSize: typography.sizes.body.fontSize,
                  cursor: 'pointer',
                }}
              >
                Edit Task
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCloseDetailModal();
                  handleOpenDeleteModal(selectedTask);
                }}
                style={{
                  padding: `${spacing.xs} ${spacing.md}`,
                  borderRadius: rounded.md,
                  border: `1px solid ${colors.semantic.errorBorder}`,
                  backgroundColor: 'transparent',
                  color: colors.semantic.error,
                  fontSize: typography.sizes.body.fontSize,
                  cursor: 'pointer',
                }}
              >
                Delete Task
              </button>
              <button
                type="button"
                onClick={handleCloseDetailModal}
                style={{
                  padding: `${spacing.xs} ${spacing.md}`,
                  borderRadius: rounded.md,
                  border: 'none',
                  backgroundColor: colors.surface.containerHigh,
                  color: colors.surface.onSurface,
                  fontSize: typography.sizes.body.fontSize,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        title="Delete Task"
        message={`Are you sure you want to delete task "${selectedTask?.description}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteTask}
        onCancel={handleCloseDeleteModal}
        isLoading={isDeleting}
      />
    </section>
  );
}
