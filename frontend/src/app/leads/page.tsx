'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { colors, radii, shadows, spacing, typography } from '../../lib/tokens';
import {
  leadsApi,
  companiesApi,
  contactsApi,
  Lead,
  LeadCreate,
  LeadUpdate,
  LeadQueryParams,
  Company,
  Contact,
} from '../../services/crm';
import { DataTable, DataTableColumn } from '../../components/crm/DataTable';
import {
  LeadForm,
  LeadFormData,
  CompanyOption,
  ContactOption,
  LEAD_STATUS_OPTIONS,
} from '../../components/crm/LeadForm';
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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Deletion state
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
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
    } catch (err) {
      // Ignore company fetch errors, lead form will present empty company dropdown
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
    } catch (err) {
      // Ignore contact fetch errors, lead form will present empty contact dropdown
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);
    try {
      const params: LeadQueryParams = {
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

      const response = await leadsApi.list(params);
      if (response.error) {
        setPageError(
          typeof response.error === 'string' ? response.error : 'Failed to load leads'
        );
        setLeads([]);
        setTotalItems(0);
      } else if (response.data) {
        if ('items' in response.data && Array.isArray(response.data.items)) {
          setLeads(response.data.items);
          setTotalItems(response.data.total ?? response.data.items.length);
        } else if (Array.isArray(response.data)) {
          setLeads(response.data);
          setTotalItems(response.data.length);
        }
      }
    } catch (err) {
      setPageError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while loading leads.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, searchQuery, statusFilter]);

  useEffect(() => {
    fetchCompanies();
    fetchContacts();
  }, [fetchCompanies, fetchContacts]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleViewLead = async (lead: Lead) => {
    setIsDetailLoading(true);
    setViewingLead({ ...lead });
    try {
      const res = await leadsApi.get(lead.id);
      if (res.data) {
        setViewingLead(res.data as Lead);
      }
    } catch (err) {
      // Retain basic lead data if detail fetch fails
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCreateSubmit = async (formData: LeadFormData) => {
    setIsSubmitting(true);
    setFormServerError(null);
    setFormFieldErrors({});
    try {
      const payload: LeadCreate = {
        title: formData.title,
        name: formData.title,
        company_id: formData.company_id ?? null,
        contact_id: formData.contact_id ?? null,
        value: Number(formData.value),
        status: formData.status || 'Prospecting',
        expected_close_date: formData.expected_close_date || null,
        owner: formData.owner || '',
      };
      const res = await leadsApi.create(payload);
      if (res.error) {
        const errData = res.error as any;
        if (errData?.fields && Array.isArray(errData.fields)) {
          const fieldErrMap: Record<string, string> = {};
          errData.fields.forEach((f: { field: string; message: string }) => {
            fieldErrMap[f.field] = f.message;
          });
          setFormFieldErrors(fieldErrMap);
        }
        setFormServerError(errData?.message || 'Failed to create lead.');
      } else if (res.data) {
        setIsAddModalOpen(false);
        const createdTitle = res.data.title || res.data.name || 'Lead';
        setSuccessMessage(`Lead "${createdTitle}" created successfully.`);
        fetchLeads();
      }
    } catch (err) {
      setFormServerError(err instanceof Error ? err.message : 'Failed to create lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (formData: LeadFormData) => {
    if (!editingLead) return;
    setIsSubmitting(true);
    setFormServerError(null);
    setFormFieldErrors({});
    try {
      const payload: LeadUpdate = {
        title: formData.title,
        name: formData.title,
        company_id: formData.company_id ?? null,
        contact_id: formData.contact_id ?? null,
        value: Number(formData.value),
        status: formData.status,
        expected_close_date: formData.expected_close_date || null,
        owner: formData.owner || '',
      };
      const res = await leadsApi.update(editingLead.id, payload);
      if (res.error) {
        const errData = res.error as any;
        if (errData?.fields && Array.isArray(errData.fields)) {
          const fieldErrMap: Record<string, string> = {};
          errData.fields.forEach((f: { field: string; message: string }) => {
            fieldErrMap[f.field] = f.message;
          });
          setFormFieldErrors(fieldErrMap);
        }
        setFormServerError(errData?.message || 'Failed to update lead.');
      } else if (res.data) {
        setEditingLead(null);
        const updatedTitle = res.data.title || res.data.name || 'Lead';
        setSuccessMessage(`Lead "${updatedTitle}" updated successfully.`);
        fetchLeads();
        if (viewingLead && viewingLead.id === res.data.id) {
          handleViewLead(res.data as Lead);
        }
      }
    } catch (err) {
      setFormServerError(err instanceof Error ? err.message : 'Failed to update lead.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingLead) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await leadsApi.delete(deletingLead.id);
      if (res.error) {
        const errData = res.error as any;
        setDeleteError(errData?.message || 'Failed to delete lead.');
      } else {
        const deletedTitle = deletingLead.title || deletingLead.name || 'Lead';
        setDeletingLead(null);
        setSuccessMessage(`Lead "${deletedTitle}" deleted successfully.`);
        fetchLeads();
        if (viewingLead && viewingLead.id === deletingLead.id) {
          setViewingLead(null);
        }
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'An error occurred during deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataTableColumn<Lead>[] = [
    {
      key: 'title',
      header: 'Lead Title',
      sortable: true,
      sortField: 'title',
      accessor: (lead) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleViewLead(lead);
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: colors.accent.primary,
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            textDecoration: 'underline',
          }}
          data-testid={`lead-title-link-${lead.id}`}
        >
          {lead.title || lead.name || 'Untitled Lead'}
        </button>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      accessor: (lead) => {
        if (lead.company_id && companyMap[lead.company_id]) {
          return companyMap[lead.company_id];
        }
        return 'Unassigned';
      },
    },
    {
      key: 'contact',
      header: 'Contact',
      accessor: (lead) => {
        if (lead.contact_id && contactMap[lead.contact_id]) {
          return contactMap[lead.contact_id];
        }
        return 'Unassigned';
      },
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      sortField: 'value',
      align: 'right',
      accessor: (lead) => {
        const numVal = typeof lead.value === 'number' ? lead.value : Number(lead.value || 0);
        return `$${numVal.toLocaleString('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })}`;
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortField: 'status',
      accessor: (lead) => <StatusBadge status={lead.status} size="sm" />,
    },
    {
      key: 'expected_close_date',
      header: 'Expected Close',
      sortable: true,
      sortField: 'expected_close_date',
      accessor: (lead) => formatDate(lead.expected_close_date, { fallback: '—' }),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      accessor: (lead) => (
        <div
          style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleViewLead(lead)}
            data-testid={`view-lead-${lead.id}`}
            style={{
              backgroundColor: 'transparent',
              color: colors.surface.onSurface,
              border: `1px solid ${colors.surface.outlineVariant}`,
              borderRadius: radii.sm,
              padding: `${spacing[1]} ${spacing[3]}`,
              fontSize: typography.styles.caption.fontSize,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            View
          </button>
          <button
            onClick={() => {
              setEditingLead(lead);
              setFormServerError(null);
              setFormFieldErrors({});
            }}
            data-testid={`edit-lead-${lead.id}`}
            style={{
              backgroundColor: 'transparent',
              color: colors.accent.primary,
              border: `1px solid ${colors.surface.outlineVariant}`,
              borderRadius: radii.sm,
              padding: `${spacing[1]} ${spacing[3]}`,
              fontSize: typography.styles.caption.fontSize,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
          <button
            onClick={() => {
              setDeletingLead(lead);
              setDeleteError(null);
            }}
            data-testid={`delete-lead-${lead.id}`}
            style={{
              backgroundColor: 'transparent',
              color: colors.secondary.main,
              border: `1px solid ${colors.surface.outlineVariant}`,
              borderRadius: radii.sm,
              padding: `${spacing[1]} ${spacing[3]}`,
              fontSize: typography.styles.caption.fontSize,
              fontWeight: 500,
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
        htmlFor="status-filter-select"
        style={{
          fontSize: typography.styles.caption.fontSize,
          fontFamily: typography.styles.caption.fontFamily,
          color: colors.surface.onSurfaceVariant,
          fontWeight: 500,
        }}
      >
        Status:
      </label>
      <select
        id="status-filter-select"
        data-testid="status-filter-select"
        aria-label="Filter leads by status"
        value={statusFilter}
        onChange={(e) => {
          setStatusFilter(e.target.value);
          setPage(1);
        }}
        style={{
          padding: `${spacing[2]} ${spacing[3]}`,
          borderRadius: radii.md,
          border: `1px solid ${colors.surface.outlineVariant}`,
          backgroundColor: colors.surface.containerLowest,
          color: colors.surface.onSurface,
          fontSize: typography.styles.bodyMd.fontSize,
          fontFamily: typography.styles.bodyMd.fontFamily,
          cursor: 'pointer',
        }}
      >
        <option value="">All Statuses</option>
        {LEAD_STATUS_OPTIONS.map((statusOption) => (
          <option key={statusOption} value={statusOption}>
            {statusOption}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div
      data-testid="leads-page"
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
            Leads
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
            Leads
          </h1>
          <p
            style={{
              fontFamily: typography.styles.bodyMd.fontFamily,
              fontSize: typography.styles.bodyMd.fontSize,
              color: colors.surface.onSurfaceVariant,
              margin: 0,
            }}
          >
            Manage sales pipeline, track opportunities, and monitor deal statuses.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setFormServerError(null);
            setFormFieldErrors({});
          }}
          data-testid="add-lead-button"
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
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing[2],
          }}
        >
          + Add Lead
        </button>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <Alert
          variant="success"
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
          data-testid="leads-success-alert"
        />
      )}

      {/* Page Error Alert */}
      {pageError && (
        <Alert
          variant="error"
          message={pageError}
          onClose={() => setPageError(null)}
          data-testid="leads-error-alert"
        />
      )}

      {/* Data Table */}
      <DataTable
        data={leads}
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
        searchPlaceholder="Search leads by title or company..."
        isLoading={isLoading}
        emptyTitle="No leads found"
        emptyDescription="Get started by creating your first lead record."
        onAdd={() => {
          setIsAddModalOpen(true);
          setFormServerError(null);
          setFormFieldErrors({});
        }}
        addLabel="Add Lead"
        extraToolbar={extraToolbar}
        onRowClick={(item) => handleViewLead(item)}
        data-testid="leads-table"
      />

      {/* Add Lead Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Lead"
        data-testid="add-lead-modal"
      >
        <LeadForm
          companies={companyOptions}
          contacts={contactOptions}
          onSubmit={handleCreateSubmit}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={isSubmitting}
          submitLabel="Create Lead"
          serverError={formServerError}
          serverFieldErrors={formFieldErrors}
        />
      </Modal>

      {/* Edit Lead Modal */}
      <Modal
        isOpen={!!editingLead}
        onClose={() => setEditingLead(null)}
        title="Edit Lead"
        data-testid="edit-lead-modal"
      >
        {editingLead && (
          <LeadForm
            initialValues={editingLead}
            companies={companyOptions}
            contacts={contactOptions}
            onSubmit={handleUpdateSubmit}
            onCancel={() => setEditingLead(null)}
            isLoading={isSubmitting}
            submitLabel="Save Changes"
            serverError={formServerError}
            serverFieldErrors={formFieldErrors}
          />
        )}
      </Modal>

      {/* Lead Detail Modal */}
      <Modal
        isOpen={!!viewingLead}
        onClose={() => setViewingLead(null)}
        title="Lead Details"
        data-testid="view-lead-modal"
      >
        {viewingLead && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[5] }}>
            {/* Header info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: spacing[4],
                borderBottom: `1px solid ${colors.surface.outlineVariant}`,
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: typography.styles.headlineSm.fontFamily,
                    fontSize: typography.styles.headlineSm.fontSize,
                    fontWeight: typography.styles.headlineSm.fontWeight,
                    color: colors.surface.onSurface,
                    margin: `0 0 ${spacing[1]} 0`,
                  }}
                >
                  {viewingLead.title || viewingLead.name || 'Untitled Lead'}
                </h3>
                <p
                  style={{
                    fontFamily: typography.styles.caption.fontFamily,
                    fontSize: typography.styles.caption.fontSize,
                    color: colors.surface.onSurfaceVariant,
                    margin: 0,
                  }}
                >
                  ID: #{viewingLead.id}
                </p>
              </div>
              <StatusBadge status={viewingLead.status} size="lg" />
            </div>

            {/* Grid of detail fields */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: spacing[4],
              }}
            >
              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>
                  Value
                </span>
                <p
                  style={{
                    margin: `${spacing[1]} 0 0 0`,
                    color: colors.surface.onSurface,
                    fontWeight: 600,
                    fontSize: typography.styles.headlineSm.fontSize,
                  }}
                >
                  ${(typeof viewingLead.value === 'number'
                    ? viewingLead.value
                    : Number(viewingLead.value || 0)
                  ).toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>
                  Company
                </span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, color: colors.surface.onSurface }}>
                  {viewingLead.company_id && companyMap[viewingLead.company_id]
                    ? companyMap[viewingLead.company_id]
                    : 'Unassigned'}
                </p>
              </div>

              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>
                  Contact
                </span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, color: colors.surface.onSurface }}>
                  {viewingLead.contact_id && contactMap[viewingLead.contact_id]
                    ? contactMap[viewingLead.contact_id]
                    : 'Unassigned'}
                </p>
              </div>

              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>
                  Expected Close Date
                </span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, color: colors.surface.onSurface }}>
                  {formatDate(viewingLead.expected_close_date, { fallback: '—' })}
                </p>
              </div>

              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>
                  Owner
                </span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, color: colors.surface.onSurface }}>
                  {viewingLead.owner || '—'}
                </p>
              </div>

              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>
                  Created Date
                </span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, color: colors.surface.onSurface }}>
                  {formatDate(viewingLead.created_at, { fallback: '—' })}
                </p>
              </div>

              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>
                  Last Updated
                </span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, color: colors.surface.onSurface }}>
                  {formatDate(viewingLead.updated_at, { fallback: '—' })}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                gap: spacing[3],
                justifyContent: 'flex-end',
                marginTop: spacing[2],
              }}
            >
              <button
                onClick={() => {
                  setEditingLead(viewingLead);
                  setViewingLead(null);
                  setFormServerError(null);
                  setFormFieldErrors({});
                }}
                data-testid="view-modal-edit-button"
                style={{
                  backgroundColor: colors.accent.primary,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: radii.md,
                  padding: `${spacing[2]} ${spacing[4]}`,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Edit Lead
              </button>
              <button
                onClick={() => {
                  setDeletingLead(viewingLead);
                  setDeleteError(null);
                }}
                data-testid="view-modal-delete-button"
                style={{
                  backgroundColor: 'transparent',
                  color: colors.secondary.main,
                  border: `1px solid ${colors.secondary.main}`,
                  borderRadius: radii.md,
                  padding: `${spacing[2]} ${spacing[4]}`,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Delete Lead
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deletingLead}
        title="Delete Lead"
        message={
          <div>
            {deleteError && (
              <div style={{ marginBottom: spacing[3] }}>
                <Alert variant="error" message={deleteError} />
              </div>
            )}
            <p style={{ margin: 0 }}>
              Are you sure you want to delete lead{' '}
              <strong>{deletingLead?.title || deletingLead?.name}</strong>?
            </p>
          </div>
        }
        confirmLabel="Delete Lead"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeletingLead(null);
          setDeleteError(null);
        }}
        isDanger={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
