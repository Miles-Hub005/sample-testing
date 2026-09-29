'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { colors, radii, shadows, spacing, typography } from '../../lib/tokens';
import {
  tasksApi,
  companiesApi,
  leadsApi,
  contactsApi,
  Task,
  TaskCreate,
  TaskUpdate,
  TaskQueryParams,
  Company,
  Lead,
  Contact,
} from '../../services/crm';
import { DataTable, DataTableColumn } from '../../components/crm/DataTable';
import {
  TaskForm,
  TaskFormData,
  CompanyOption,
  LeadOption,
  ContactOption,
} from '../../components/crm/TaskForm';
import { ConfirmationDialog } from '../../components/shared/ConfirmationDialog';
import { Alert } from '../../components/shared/Alerts';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatDate } from '../../lib/format';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  'data-testid'?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '640px',
  'data-testid': testId = 'modal',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      data-testid={testId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(27, 28, 25, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: spacing[4],
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          backgroundColor: colors.surface.containerLowest,
          borderRadius: radii.lg,
          boxShadow: shadows.lifted,
          border: `1px solid ${colors.surface.outlineVariant}`,
          width: '100%',
          maxWidth,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            padding: `${spacing[4]} ${spacing[6]}`,
            borderBottom: `1px solid ${colors.surface.outlineVariant}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            id="modal-title"
            style={{
              fontFamily: typography.styles.headlineSm.fontFamily,
              fontSize: typography.styles.headlineSm.fontSize,
              fontWeight: typography.styles.headlineSm.fontWeight,
              color: colors.surface.onSurface,
              margin: 0,
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              fontWeight: 'bold',
              color: colors.surface.onSurfaceVariant,
              cursor: 'pointer',
              padding: spacing[1],
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </header>
        <div
          style={{
            padding: spacing[6],
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Deletion state
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState<string | null>(null);
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});

  const companyOptions: CompanyOption[] = useMemo(() => {
    return companies.map((c) => ({ id: c.id, name: c.name }));
  }, [companies]);

  const companyMap = useMemo(() => {
    const map: Record<number, string> = {};
    companies.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [companies]);

  const leadOptions: LeadOption[] = useMemo(() => {
    return leads.map((l) => ({
      id: l.id,
      title: l.title || l.name || `Lead #${l.id}`,
    }));
  }, [leads]);

  const leadMap = useMemo(() => {
    const map: Record<number, string> = {};
    leads.forEach((l) => {
      map[l.id] = l.title || l.name || `Lead #${l.id}`;
    });
    return map;
  }, [leads]);

  const contactOptions: ContactOption[] = useMemo(() => {
    return contacts.map((c) => ({ id: c.id, name: c.name }));
  }, [contacts]);

  const contactMap = useMemo(() => {
    const map: Record<number, string> = {};
    contacts.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [contacts]);

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await companiesApi.list({ page: 1, page_size: 100 });
      if (response.data) {
        if ('items' in response.data && Array.isArray(response.data.items)) {
          setCompanies(response.data.items);
        } else if (Array.isArray(response.data)) {
          setCompanies(response.data);
        }
      }
    } catch {
      // Ignore company fetch errors
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      const response = await leadsApi.list({ page: 1, page_size: 100 });
      if (response.data) {
        if ('items' in response.data && Array.isArray(response.data.items)) {
          setLeads(response.data.items);
        } else if (Array.isArray(response.data)) {
          setLeads(response.data);
        }
      }
    } catch {
      // Ignore lead fetch errors
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    try {
      const response = await contactsApi.list({ page: 1, page_size: 100 });
      if (response.data) {
        if ('items' in response.data && Array.isArray(response.data.items)) {
          setContacts(response.data.items);
        } else if (Array.isArray(response.data)) {
          setContacts(response.data);
        }
      }
    } catch {
      // Ignore contact fetch errors
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);
    try {
      const params: TaskQueryParams = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        order: sortOrder,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await tasksApi.list(params);
      if (response.error) {
        setPageError(
          typeof response.error === 'string' ? response.error : 'Failed to load tasks'
        );
        setTasks([]);
        setTotalItems(0);
      } else if (response.data) {
        if ('items' in response.data && Array.isArray(response.data.items)) {
          setTasks(response.data.items);
          setTotalItems(response.data.total ?? response.data.items.length);
        } else if (Array.isArray(response.data)) {
          setTasks(response.data);
          setTotalItems(response.data.length);
        }
      }
    } catch (err) {
      setPageError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while loading tasks.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, searchQuery, statusFilter]);

  useEffect(() => {
    fetchCompanies();
    fetchLeads();
    fetchContacts();
  }, [fetchCompanies, fetchLeads, fetchContacts]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleViewTask = async (task: Task) => {
    setIsDetailLoading(true);
    setViewingTask(task);
    try {
      const response = await tasksApi.get(task.id);
      if (response.data) {
        setViewingTask(response.data);
      }
    } catch {
      // Use existing task object if detail fetch fails
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCreateTask = async (formData: TaskFormData) => {
    setIsSubmitting(true);
    setFormServerError(null);
    setFormFieldErrors({});
    setSuccessMessage(null);

    const desc = formData.description || formData.title || '';
    const payload: TaskCreate = {
      title: desc,
      owner: formData.owner || '',
      due_date: formData.due_date,
      company_id: formData.company_id ?? null,
      lead_id: formData.lead_id ?? null,
      contact_id: formData.contact_id ?? null,
    };

    try {
      const response = await tasksApi.create(payload as any);
      if (response.error) {
        if (typeof response.error === 'object' && response.error !== null) {
          const errObj = response.error as {
            message?: string;
            fields?: Array<{ field: string; message: string }>;
          };
          setFormServerError(errObj.message || 'Failed to create task.');
          if (Array.isArray(errObj.fields)) {
            const fieldMap: Record<string, string> = {};
            errObj.fields.forEach((f) => {
              fieldMap[f.field] = f.message;
            });
            setFormFieldErrors(fieldMap);
          }
        } else if (typeof response.error === 'string') {
          setFormServerError(response.error);
        } else {
          setFormServerError('Failed to create task.');
        }
      } else {
        setIsAddModalOpen(false);
        setSuccessMessage('Task created successfully.');
        fetchTasks();
      }
    } catch (err) {
      setFormServerError(
        err instanceof Error ? err.message : 'An error occurred while saving the task.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTask = async (formData: TaskFormData) => {
    if (!editingTask) return;
    setIsSubmitting(true);
    setFormServerError(null);
    setFormFieldErrors({});
    setSuccessMessage(null);

    const desc = formData.description || formData.title || '';
    const payload: TaskUpdate = {
      title: desc,
      owner: formData.owner || '',
      due_date: formData.due_date,
      company_id: formData.company_id ?? null,
      lead_id: formData.lead_id ?? null,
      contact_id: formData.contact_id ?? null,
    };

    try {
      const response = await tasksApi.update(editingTask.id, {
        ...payload,
        completed: formData.completed,
      } as any);

      if (response.error) {
        if (typeof response.error === 'object' && response.error !== null) {
          const errObj = response.error as {
            message?: string;
            fields?: Array<{ field: string; message: string }>;
          };
          setFormServerError(errObj.message || 'Failed to update task.');
          if (Array.isArray(errObj.fields)) {
            const fieldMap: Record<string, string> = {};
            errObj.fields.forEach((f) => {
              fieldMap[f.field] = f.message;
            });
            setFormFieldErrors(fieldMap);
          }
        } else if (typeof response.error === 'string') {
          setFormServerError(response.error);
        } else {
          setFormServerError('Failed to update task.');
        }
      } else {
        setEditingTask(null);
        setSuccessMessage('Task updated successfully.');
        if (viewingTask?.id === editingTask.id) {
          setViewingTask(response.data || null);
        }
        fetchTasks();
      }
    } catch (err) {
      setFormServerError(
        err instanceof Error ? err.message : 'An error occurred while updating the task.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTaskCompleted = async (task: Task, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const newCompleted = !task.completed;
    try {
      const response = await tasksApi.update(task.id, {
        completed: newCompleted,
      } as any);
      if (!response.error) {
        setSuccessMessage(
          newCompleted ? 'Task marked as completed.' : 'Task marked as active/pending.'
        );
        if (viewingTask?.id === task.id && response.data) {
          setViewingTask(response.data);
        }
        fetchTasks();
      }
    } catch {
      setPageError('Failed to update task completion status.');
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await tasksApi.delete(deletingTask.id);
      if (response.error) {
        setDeleteError(
          typeof response.error === 'string'
            ? response.error
            : 'Failed to delete task record.'
        );
      } else {
        setDeletingTask(null);
        if (viewingTask?.id === deletingTask.id) {
          setViewingTask(null);
        }
        setSuccessMessage('Task deleted successfully.');
        fetchTasks();
      }
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'An error occurred while deleting task.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const getTaskStatusLabel = (task: Task): { label: string; rawStatus: string } => {
    if (task.completed) {
      return { label: 'Completed', rawStatus: 'completed' };
    }
    if (task.overdue) {
      return { label: 'Overdue', rawStatus: 'overdue' };
    }
    return { label: 'Pending', rawStatus: 'pending' };
  };

  const columns: DataTableColumn<Task>[] = [
    {
      key: 'title',
      header: 'Task Description',
      sortable: true,
      sortField: 'due_date',
      accessor: (task) => {
        const titleText = task.title || task.description || `Task #${task.id}`;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
            <input
              type="checkbox"
              checked={!!task.completed}
              onChange={() => handleToggleTaskCompleted(task)}
              onClick={(e) => e.stopPropagation()}
              data-testid={`toggle-complete-task-${task.id}`}
              style={{
                cursor: 'pointer',
                accentColor: colors.accent.primary,
                width: '16px',
                height: '16px',
              }}
              title={task.completed ? 'Mark pending' : 'Mark completed'}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleViewTask(task);
              }}
              data-testid={`task-title-link-${task.id}`}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: colors.accent.primary,
                fontFamily: typography.styles.bodyMd.fontFamily,
                fontSize: typography.styles.bodyMd.fontSize,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                textDecoration: task.completed ? 'line-through' : 'underline',
                opacity: task.completed ? 0.7 : 1,
              }}
            >
              {titleText}
            </button>
          </div>
        );
      },
    },
    {
      key: 'due_date',
      header: 'Due Date',
      sortable: true,
      sortField: 'due_date',
      accessor: (task) => formatDate(task.due_date),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: false,
      accessor: (task) => {
        const { label, rawStatus } = getTaskStatusLabel(task);
        return <StatusBadge status={rawStatus} label={label} size="sm" />;
      },
    },
    {
      key: 'association',
      header: 'Related To',
      sortable: false,
      accessor: (task) => {
        if (task.company_id && companyMap[task.company_id]) {
          return (
            <span style={{ fontSize: typography.styles.caption.fontSize }}>
              Company: {companyMap[task.company_id]}
            </span>
          );
        }
        if (task.lead_id && leadMap[task.lead_id]) {
          return (
            <span style={{ fontSize: typography.styles.caption.fontSize }}>
              Lead: {leadMap[task.lead_id]}
            </span>
          );
        }
        if (task.contact_id && contactMap[task.contact_id]) {
          return (
            <span style={{ fontSize: typography.styles.caption.fontSize }}>
              Contact: {contactMap[task.contact_id]}
            </span>
          );
        }
        return (
          <span style={{ color: colors.surface.onSurfaceVariant, fontSize: typography.styles.caption.fontSize }}>
            Unassigned
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      accessor: (task) => (
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: spacing[2] }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleViewTask(task)}
            data-testid={`view-task-${task.id}`}
            style={{
              background: 'none',
              border: `1px solid ${colors.surface.outlineVariant}`,
              borderRadius: radii.sm,
              padding: `${spacing[1]} ${spacing[2]}`,
              fontSize: typography.styles.caption.fontSize,
              color: colors.surface.onSurface,
              cursor: 'pointer',
            }}
          >
            View
          </button>
          <button
            onClick={() => {
              setEditingTask(task);
              setFormServerError(null);
              setFormFieldErrors({});
            }}
            data-testid={`edit-task-${task.id}`}
            style={{
              background: 'none',
              border: `1px solid ${colors.surface.outlineVariant}`,
              borderRadius: radii.sm,
              padding: `${spacing[1]} ${spacing[2]}`,
              fontSize: typography.styles.caption.fontSize,
              color: colors.surface.onSurface,
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
          <button
            onClick={() => {
              setDeletingTask(task);
              setDeleteError(null);
            }}
            data-testid={`delete-task-${task.id}`}
            style={{
              background: 'none',
              border: `1px solid ${colors.feedback.error}`,
              borderRadius: radii.sm,
              padding: `${spacing[1]} ${spacing[2]}`,
              fontSize: typography.styles.caption.fontSize,
              color: colors.feedback.error,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const extraToolbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing[2] }}>
      <label
        htmlFor="status-filter"
        style={{
          fontFamily: typography.styles.caption.fontFamily,
          fontSize: typography.styles.caption.fontSize,
          color: colors.surface.onSurfaceVariant,
        }}
      >
        Status:
      </label>
      <select
        id="status-filter"
        value={statusFilter}
        onChange={(e) => {
          setStatusFilter(e.target.value);
          setPage(1);
        }}
        data-testid="status-filter-select"
        style={{
          padding: `${spacing[2]} ${spacing[3]}`,
          fontSize: typography.styles.bodyMd.fontSize,
          fontFamily: typography.fontFamilies.sans,
          borderRadius: radii.sm,
          border: `1px solid ${colors.surface.outlineVariant}`,
          backgroundColor: colors.surface.containerLowest,
          color: colors.surface.onSurface,
          outline: 'none',
        }}
      >
        <option value="">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="overdue">Overdue</option>
        <option value="completed">Completed</option>
      </select>
    </div>
  );

  return (
    <div
      data-testid="tasks-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[6],
      }}
    >
      {/* Breadcrumb Navigation (FR-10) */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: `-${spacing[3]}` }}>
        <ol
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[2],
            listStyle: 'none',
            padding: 0,
            margin: 0,
            fontFamily: typography.styles.caption.fontFamily,
            fontSize: typography.styles.caption.fontSize,
            color: colors.surface.onSurfaceVariant,
          }}
        >
          <li>
            <Link href="/" style={{ color: colors.accent.primary, textDecoration: 'none' }}>
              Home
            </Link>
          </li>
          <li>/</li>
          <li aria-current="page" style={{ fontWeight: 600, color: colors.surface.onSurface }}>
            Tasks
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[4],
          borderBottom: `1px solid ${colors.surface.outlineVariant}`,
          paddingBottom: spacing[4],
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: typography.styles.displayLg.fontFamily,
              fontSize: typography.styles.headlineMd.fontSize,
              fontWeight: typography.styles.headlineMd.fontWeight,
              color: colors.surface.onSurface,
              margin: `0 0 ${spacing[1]} 0`,
            }}
          >
            Tasks
          </h1>
          <p
            style={{
              fontFamily: typography.styles.bodyMd.fontFamily,
              fontSize: typography.styles.bodyMd.fontSize,
              color: colors.surface.onSurfaceVariant,
              margin: 0,
            }}
          >
            Manage task follow-ups, due dates, completion status, and customer associations.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setFormServerError(null);
            setFormFieldErrors({});
          }}
          data-testid="add-task-button"
          style={{
            backgroundColor: colors.accent.primary,
            color: '#ffffff',
            border: 'none',
            borderRadius: radii.md,
            padding: `${spacing[2]} ${spacing[4]}`,
            fontFamily: typography.styles.labelCaps.fontFamily,
            fontSize: typography.styles.bodyMd.fontSize,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: shadows.sm,
          }}
        >
          + Add Task
        </button>
      </div>

      {/* Alert Banner */}
      {successMessage && (
        <Alert
          variant="success"
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
          data-testid="tasks-success-alert"
        />
      )}
      {pageError && (
        <Alert
          variant="error"
          message={pageError}
          onClose={() => setPageError(null)}
          data-testid="tasks-error-alert"
        />
      )}

      {/* Data Table */}
      <DataTable
        data={tasks}
        columns={columns}
        keyExtractor={(item) => item.id}
        totalItems={totalItems}
        page={page}
        pageSize={pageSize}
        onPageChange={(newPage) => setPage(newPage)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        searchQuery={searchQuery}
        onSearchChange={(query) => {
          setSearchQuery(query);
          setPage(1);
        }}
        searchPlaceholder="Search tasks by description..."
        isLoading={isLoading}
        emptyTitle="No tasks found"
        emptyDescription="Get started by creating your first task record."
        onAdd={() => {
          setIsAddModalOpen(true);
          setFormServerError(null);
          setFormFieldErrors({});
        }}
        addLabel="Add Task"
        extraToolbar={extraToolbar}
        onRowClick={(item) => handleViewTask(item)}
        data-testid="tasks-table"
      />

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Task"
        data-testid="add-task-modal"
      >
        <TaskForm
          companies={companyOptions}
          leads={leadOptions}
          contacts={contactOptions}
          onSubmit={handleCreateTask}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={isSubmitting}
          serverError={formServerError}
          serverFieldErrors={formFieldErrors}
          submitLabel="Create Task"
        />
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
        data-testid="edit-task-modal"
      >
        {editingTask && (
          <TaskForm
            initialValues={editingTask}
            companies={companyOptions}
            leads={leadOptions}
            contacts={contactOptions}
            onSubmit={handleUpdateTask}
            onCancel={() => setEditingTask(null)}
            isLoading={isSubmitting}
            serverError={formServerError}
            serverFieldErrors={formFieldErrors}
            submitLabel="Update Task"
          />
        )}
      </Modal>

      {/* View Task Detail Modal */}
      <Modal
        isOpen={!!viewingTask}
        onClose={() => setViewingTask(null)}
        title="Task Details"
        data-testid="view-task-modal"
      >
        {viewingTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
            {isDetailLoading && (
              <div style={{ fontSize: typography.styles.caption.fontSize, color: colors.surface.onSurfaceVariant }}>
                Refreshing details...
              </div>
            )}

            <div>
              <div
                style={{
                  fontSize: typography.styles.caption.fontSize,
                  color: colors.surface.onSurfaceVariant,
                  marginBottom: spacing[1],
                }}
              >
                Task Description
              </div>
              <div
                style={{
                  fontSize: typography.styles.bodyMd.fontSize,
                  fontWeight: 600,
                  color: colors.surface.onSurface,
                  textDecoration: viewingTask.completed ? 'line-through' : 'none',
                }}
              >
                {viewingTask.title || viewingTask.description || `Task #${viewingTask.id}`}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
              <div>
                <div
                  style={{
                    fontSize: typography.styles.caption.fontSize,
                    color: colors.surface.onSurfaceVariant,
                    marginBottom: spacing[1],
                  }}
                >
                  Due Date
                </div>
                <div style={{ fontSize: typography.styles.bodyMd.fontSize, color: colors.surface.onSurface }}>
                  {formatDate(viewingTask.due_date)}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: typography.styles.caption.fontSize,
                    color: colors.surface.onSurfaceVariant,
                    marginBottom: spacing[1],
                  }}
                >
                  Status
                </div>
                <div>
                  <StatusBadge
                    status={getTaskStatusLabel(viewingTask).rawStatus}
                    label={getTaskStatusLabel(viewingTask).label}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
              <div>
                <div
                  style={{
                    fontSize: typography.styles.caption.fontSize,
                    color: colors.surface.onSurfaceVariant,
                    marginBottom: spacing[1],
                  }}
                >
                  Related Company
                </div>
                <div style={{ fontSize: typography.styles.bodyMd.fontSize, color: colors.surface.onSurface }}>
                  {viewingTask.company_id && companyMap[viewingTask.company_id]
                    ? companyMap[viewingTask.company_id]
                    : 'Unassigned'}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: typography.styles.caption.fontSize,
                    color: colors.surface.onSurfaceVariant,
                    marginBottom: spacing[1],
                  }}
                >
                  Related Lead
                </div>
                <div style={{ fontSize: typography.styles.bodyMd.fontSize, color: colors.surface.onSurface }}>
                  {viewingTask.lead_id && leadMap[viewingTask.lead_id]
                    ? leadMap[viewingTask.lead_id]
                    : 'Unassigned'}
                </div>
              </div>
            </div>

            {viewingTask.contact_id ? (
              <div>
                <div
                  style={{
                    fontSize: typography.styles.caption.fontSize,
                    color: colors.surface.onSurfaceVariant,
                    marginBottom: spacing[1],
                  }}
                >
                  Related Contact
                </div>
                <div style={{ fontSize: typography.styles.bodyMd.fontSize, color: colors.surface.onSurface }}>
                  {contactMap[viewingTask.contact_id] || `Contact #${viewingTask.contact_id}`}
                </div>
              </div>
            ) : null}

            {viewingTask.owner ? (
              <div>
                <div
                  style={{
                    fontSize: typography.styles.caption.fontSize,
                    color: colors.surface.onSurfaceVariant,
                    marginBottom: spacing[1],
                  }}
                >
                  Owner
                </div>
                <div style={{ fontSize: typography.styles.bodyMd.fontSize, color: colors.surface.onSurface }}>
                  {viewingTask.owner}
                </div>
              </div>
            ) : null}

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-between',
                alignItems: 'center',
                gap: spacing[3],
                marginTop: spacing[4],
                paddingTop: spacing[4],
                borderTop: `1px solid ${colors.surface.outlineVariant}`,
              }}
            >
              <button
                onClick={(e) => handleToggleTaskCompleted(viewingTask, e)}
                style={{
                  padding: `${spacing[2]} ${spacing[3]}`,
                  fontSize: typography.styles.caption.fontSize,
                  fontFamily: typography.fontFamilies.sans,
                  borderRadius: radii.sm,
                  border: `1px solid ${colors.surface.outlineVariant}`,
                  backgroundColor: colors.surface.containerLow,
                  color: colors.surface.onSurface,
                  cursor: 'pointer',
                }}
              >
                {viewingTask.completed ? 'Mark Pending' : 'Mark Completed'}
              </button>

              <div style={{ display: 'flex', gap: spacing[2], marginLeft: 'auto' }}>
                <button
                  onClick={() => {
                    setEditingTask(viewingTask);
                    setViewingTask(null);
                    setFormServerError(null);
                    setFormFieldErrors({});
                  }}
                  data-testid="view-modal-edit-button"
                  style={{
                    padding: `${spacing[2]} ${spacing[4]}`,
                    fontSize: typography.styles.bodyMd.fontSize,
                    fontFamily: typography.fontFamilies.sans,
                    borderRadius: radii.sm,
                    border: `1px solid ${colors.surface.outlineVariant}`,
                    backgroundColor: 'transparent',
                    color: colors.surface.onSurface,
                    cursor: 'pointer',
                  }}
                >
                  Edit Task
                </button>
                <button
                  onClick={() => {
                    setDeletingTask(viewingTask);
                    setViewingTask(null);
                    setDeleteError(null);
                  }}
                  data-testid="view-modal-delete-button"
                  style={{
                    padding: `${spacing[2]} ${spacing[4]}`,
                    fontSize: typography.styles.bodyMd.fontSize,
                    fontFamily: typography.fontFamilies.sans,
                    borderRadius: radii.sm,
                    border: 'none',
                    backgroundColor: colors.feedback.error,
                    color: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deletingTask}
        title="Delete Task"
        message={
          deletingTask
            ? `Are you sure you want to delete task "${deletingTask.title || deletingTask.description || `Task #${deletingTask.id}`}? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Task"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleDeleteTask}
        onCancel={() => {
          setDeletingTask(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
