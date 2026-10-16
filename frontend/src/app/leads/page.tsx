'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, rounded, shadows, spacing, typography } from '@/lib/tokens';
import { formatCurrency, formatDate } from '@/lib/format';
import { DataTable, Column } from '@/components/crm/DataTable';
import { LeadForm, LeadFormData, CompanyOption, ContactOption, DEFAULT_LEAD_STATUSES } from '@/components/crm/LeadForm';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { ErrorAlert, SuccessAlert } from '@/components/shared/Alerts';
import { LoadingState } from '@/components/shared/States';
import {
  getPaginatedLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  listCompanies,
  listContacts,
  LeadRead,
  CompanyRead,
  ContactRead,
  CRMApiError,
} from '@/services/crm';

/**
 * LeadsPage Component
 * Route segment for `/leads`
 * Displays a DataTable of leads with search, sort, status filter, and pagination.
 * Offers Add Lead, Detail View, Edit Lead, and Delete Lead modals.
 * Satisfies FR-3 (Leads CRUD with pipeline status), FR-10 (Breadcrumbs/Navigation), and FR-14 (Empty States).
 */
export default function LeadsPage() {
  // Data state
  const [leads, setLeads] = useState<LeadRead[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [searchValue, setSearchValue] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc');

  // Company and Contact options for dropdowns and name lookup maps
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);

  // Loading & error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal & Selection states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const [selectedLead, setSelectedLead] = useState<LeadRead | null>(null);
  const [leadDetail, setLeadDetail] = useState<LeadRead | null>(null);

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

  // Map of contact ID to contact name for fast lookup
  const contactMap = useMemo(() => {
    const map: Record<number, string> = {};
    contacts.forEach((cont) => {
      map[cont.id] = cont.name;
    });
    return map;
  }, [contacts]);

  // Fetch company options for dropdown and display
  const fetchCompanies = useCallback(async () => {
    try {
      const companyList: CompanyRead[] = await listCompanies({ page_size: 1000 });
      if (Array.isArray(companyList)) {
        setCompanies(companyList.map((c) => ({ id: c.id, name: c.name })));
      }
    } catch {
      // Background fetch failure for company list
    }
  }, []);

  // Fetch contact options for dropdown and display
  const fetchContacts = useCallback(async () => {
    try {
      const contactList: ContactRead[] = await listContacts({ page_size: 1000 });
      if (Array.isArray(contactList)) {
        setContacts(contactList.map((c) => ({ id: c.id, name: c.name })));
      }
    } catch {
      // Background fetch failure for contact list
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
    fetchContacts();
  }, [fetchCompanies, fetchContacts]);

  // Fetch paginated leads list
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sortParam = sortColumn
        ? sortDirection === 'desc'
          ? `-${sortColumn}`
          : sortColumn
        : undefined;

      const response = await getPaginatedLeads({
        page,
        page_size: pageSize,
        search: searchValue || undefined,
        sort: sortParam,
        status: statusFilter || undefined,
      });

      setLeads(response.items || []);
      setTotalItems(response.total ?? (response.items ? response.items.length : 0));
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load leads.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchValue, statusFilter, sortColumn, sortDirection]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Modal control helpers
  const handleOpenAddModal = () => {
    setFormApiError(null);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setFormApiError(null);
  };

  const handleOpenEditModal = (lead: LeadRead) => {
    setSelectedLead(lead);
    setFormApiError(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedLead(null);
    setFormApiError(null);
  };

  const handleOpenDetailModal = async (lead: LeadRead) => {
    setSelectedLead(lead);
    setLeadDetail(lead);
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);

    try {
      const detail = await getLead(lead.id);
      setLeadDetail(detail);
    } catch {
      // Fallback to initial selectedLead if detailed fetch fails
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedLead(null);
    setLeadDetail(null);
  };

  const handleOpenDeleteModal = (lead: LeadRead) => {
    setSelectedLead(lead);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedLead(null);
  };

  // Form submit handlers
  const handleCreateLead = async (data: LeadFormData) => {
    setIsSubmitting(true);
    setFormApiError(null);
    try {
      await createLead(data);
      const leadTitle = data.title || 'New Lead';
      setSuccessMessage(`Lead "${leadTitle.trim()}" created successfully.`);
      handleCloseAddModal();
      fetchLeads();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setFormApiError(err);
      } else if (err instanceof Error) {
        setFormApiError(err.message);
      } else {
        setFormApiError('Failed to create lead.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLead = async (data: LeadFormData) => {
    if (!selectedLead) return;
    setIsSubmitting(true);
    setFormApiError(null);
    try {
      await updateLead(selectedLead.id, data);
      const leadTitle = data.title || selectedLead.title || 'Lead';
      setSuccessMessage(`Lead "${leadTitle.trim()}" updated successfully.`);
      handleCloseEditModal();
      fetchLeads();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setFormApiError(err);
      } else if (err instanceof Error) {
        setFormApiError(err.message);
      } else {
        setFormApiError('Failed to update lead.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    setIsDeleting(true);
    try {
      await deleteLead(selectedLead.id);
      const leadTitle = selectedLead.title || selectedLead.name || 'Lead';
      setSuccessMessage(`Lead "${leadTitle}" deleted successfully.`);
      handleCloseDeleteModal();
      fetchLeads();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setError(`Failed to delete lead: ${err.message}`);
      } else if (err instanceof Error) {
        setError(`Failed to delete lead: ${err.message}`);
      } else {
        setError('Failed to delete lead.');
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
        onChange={(e) => {
          setStatusFilter(e.target.value);
          setPage(1);
        }}
        aria-label="Filter leads by status"
        style={{
          padding: `${spacing.xs} ${spacing.sm}`,
          borderRadius: rounded.sm,
          border: `1px solid ${colors.borderVariant}`,
          backgroundColor: colors.surface.containerLowest,
          fontSize: typography.sizes['body-md'].fontSize,
          color: colors.surface.onSurface,
          cursor: 'pointer',
        }}
      >
        <option value="">All Statuses</option>
        {DEFAULT_LEAD_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </div>
  );

  // Table columns definition
  const columns: Column<LeadRead>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      sortField: 'title',
      render: (lead) => {
        const displayTitle = lead.title || lead.name || 'Untitled Lead';
        return (
          <button
            onClick={() => handleOpenDetailModal(lead)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              color: colors.accent.DEFAULT,
              fontWeight: 500,
              textDecoration: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              fontSize: 'inherit',
            }}
            aria-label={`View details for ${displayTitle}`}
          >
            {displayTitle}
          </button>
        );
      },
    },
    {
      key: 'company_id',
      header: 'Company',
      render: (lead) => {
        if (!lead.company_id) return '—';
        const companyName = companyMap[lead.company_id];
        return companyName || `Company #${lead.company_id}`;
      },
    },
    {
      key: 'contact_id',
      header: 'Contact',
      render: (lead) => {
        if (!lead.contact_id) return '—';
        const contactName = contactMap[lead.contact_id];
        return contactName || `Contact #${lead.contact_id}`;
      },
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
      sortField: 'value',
      align: 'right',
      render: (lead) => {
        if (lead.value === undefined || lead.value === null) return '—';
        return formatCurrency(lead.value);
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortField: 'status',
      render: (lead) => <StatusBadge label={lead.status} status={lead.status} />,
    },
    {
      key: 'expected_close_date',
      header: 'Expected Close',
      sortable: true,
      sortField: 'expected_close_date',
      render: (lead) => formatDate(lead.expected_close_date) || '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (lead) => {
        const displayTitle = lead.title || lead.name || 'Lead';
        return (
          <div
            style={{ display: 'flex', gap: spacing.xs, justifyContent: 'flex-end' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleOpenDetailModal(lead)}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                backgroundColor: colors.surface.containerHigh,
                border: `1px solid ${colors.borderVariant}`,
                borderRadius: rounded.sm,
                fontSize: '13px',
                cursor: 'pointer',
                color: colors.surface.onSurface,
              }}
              aria-label={`View ${displayTitle}`}
            >
              View
            </button>
            <button
              onClick={() => handleOpenEditModal(lead)}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                backgroundColor: colors.surface.containerHigh,
                border: `1px solid ${colors.borderVariant}`,
                borderRadius: rounded.sm,
                fontSize: '13px',
                cursor: 'pointer',
                color: colors.surface.onSurface,
              }}
              aria-label={`Edit ${displayTitle}`}
            >
              Edit
            </button>
            <button
              onClick={() => handleOpenDeleteModal(lead)}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                backgroundColor: colors.error,
                color: colors.surface.containerLowest,
                border: 'none',
                borderRadius: rounded.sm,
                fontSize: '13px',
                cursor: 'pointer',
              }}
              aria-label={`Delete ${displayTitle}`}
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
      aria-label="Leads Management"
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
            Leads
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
              margin: 0,
              fontFamily: typography.fontFamily.serif,
              fontSize: typography.sizes['headline-md'].fontSize,
              fontWeight: typography.sizes['headline-md'].fontWeight,
              color: colors.surface.onSurface,
            }}
          >
            Leads
          </h1>
          <p
            style={{
              margin: `${spacing.xs} 0 0 0`,
              fontSize: typography.sizes['body-md'].fontSize,
              color: colors.surface.onSurfaceVariant,
            }}
          >
            Manage pipeline leads, opportunity values, and deal stages.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          style={{
            padding: `${spacing.sm} ${spacing.lg}`,
            backgroundColor: colors.accent.DEFAULT,
            color: colors.accent.onAccent,
            border: 'none',
            borderRadius: rounded.md,
            fontSize: typography.sizes['body-md'].fontSize,
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: shadows.sm,
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
          }}
          aria-label="Add Lead"
        >

          Add Lead
        </button>
      </div>

      {/* Notification Alerts */}
      {error && <ErrorAlert message={error} onClose={() => setError(null)} />}
      {successMessage && (
        <SuccessAlert message={successMessage} onClose={() => setSuccessMessage(null)} />
      )}

      {/* Leads DataTable */}
      <DataTable
        columns={columns}
        data={leads}
        totalItems={totalItems}
        loading={loading}
        searchValue={searchValue}
        searchPlaceholder="Search leads..."
        onSearchChange={(val) => {
          setSearchValue(val);
          setPage(1);
        }}
        filters={statusFilterControl}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSortChange={(col, dir) => {
          setSortColumn(col);
          setSortDirection(dir);
        }}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(ps) => {
          setPageSize(ps);
          setPage(1);
        }}
        emptyTitle={
          searchValue || statusFilter ? 'No matching leads found' : 'No leads found'
        }
        emptyMessage={
          searchValue || statusFilter
            ? 'No leads match your search or filter criteria. Try clearing or adjusting your search or status filter.'
            : 'Get started by creating your first lead to track deals in your pipeline.'
        }
        emptyActionLabel="Add Lead"
        onEmptyAction={handleOpenAddModal}
        getRowKey={(item) => item.id}
        onRowClick={(item) => handleOpenDetailModal(item)}
        ariaLabel="Leads Table"
      />

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-lead-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: spacing.md,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseAddModal();
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: rounded.lg,
            }}
          >
            <LeadForm
              companies={companies}
              contacts={contacts}
              onSubmit={handleCreateLead}
              onCancel={handleCloseAddModal}
              isSubmitting={isSubmitting}
              apiError={formApiError}
              submitLabel="Create Lead"
              title="Add New Lead"
            />
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {isEditModalOpen && selectedLead && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-lead-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: spacing.md,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseEditModal();
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: rounded.lg,
            }}
          >
            <LeadForm
              initialValues={selectedLead}
              companies={companies}
              contacts={contacts}
              onSubmit={handleUpdateLead}
              onCancel={handleCloseEditModal}
              isSubmitting={isSubmitting}
              apiError={formApiError}
              submitLabel="Save Changes"
              title="Edit Lead"
            />
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {isDetailModalOpen && selectedLead && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-lead-modal-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: spacing.md,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseDetailModal();
          }}
        >
          <div
            style={{
              maxWidth: '640px',
              width: '100%',
              backgroundColor: colors.surface.background,
              borderRadius: rounded.lg,
              padding: spacing.xl,
              boxShadow: shadows.lg,
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: spacing.lg,
              }}
            >
              <div>
                <h2
                  id="detail-lead-modal-title"
                  style={{
                    margin: 0,
                    fontFamily: typography.fontFamily.serif,
                    fontSize: typography.sizes['headline-sm'].fontSize,
                    color: colors.surface.onSurface,
                  }}
                >
                  {(leadDetail || selectedLead).title || (leadDetail || selectedLead).name || 'Lead Details'}
                </h2>
                <div style={{ marginTop: spacing.xs }}>
                  <StatusBadge
                    label={(leadDetail || selectedLead).status}
                    status={(leadDetail || selectedLead).status}
                  />
                </div>
              </div>
              <button
                onClick={handleCloseDetailModal}
                aria-label="Close modal"
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: colors.surface.onSurfaceVariant,
                  padding: spacing.xs,
                }}
              >
                ✕
              </button>
            </div>

            {isDetailLoading ? (
              <LoadingState message="Loading lead details..." />
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: spacing.md,
                    marginBottom: spacing.lg,
                    fontSize: typography.sizes['body-md'].fontSize,
                  }}
                >
                  <div>
                    <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                      Lead Value
                    </span>
                    <strong style={{ fontSize: '18px', color: colors.accent.DEFAULT }}>
                      {(leadDetail || selectedLead).value !== undefined
                        ? formatCurrency((leadDetail || selectedLead).value)
                        : '—'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                      Pipeline Status
                    </span>
                    <strong>{(leadDetail || selectedLead).status || '—'}</strong>
                  </div>

                  <div>
                    <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                      Company
                    </span>
                    <strong>
                      {(leadDetail || selectedLead).company_id
                        ? companyMap[(leadDetail || selectedLead).company_id!] ||
                          `Company #${(leadDetail || selectedLead).company_id}`
                        : '—'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                      Contact
                    </span>
                    <strong>
                      {(leadDetail || selectedLead).contact_id
                        ? contactMap[(leadDetail || selectedLead).contact_id!] ||
                          `Contact #${(leadDetail || selectedLead).contact_id}`
                        : '—'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                      Expected Close Date
                    </span>
                    <strong>
                      {formatDate((leadDetail || selectedLead).expected_close_date) || '—'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                      Owner
                    </span>
                    <strong>{(leadDetail || selectedLead).owner || '—'}</strong>
                  </div>

                  <div>
                    <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                      Created Date
                    </span>
                    <strong>{formatDate((leadDetail || selectedLead).created_at) || '—'}</strong>
                  </div>

                  <div>
                    <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                      Last Updated
                    </span>
                    <strong>{formatDate((leadDetail || selectedLead).updated_at) || '—'}</strong>
                  </div>
                </div>

                {(leadDetail || selectedLead).notes && (
                  <div style={{ marginBottom: spacing.lg }}>
                    <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                      Notes
                    </span>
                    <p
                      style={{
                        margin: `${spacing.xs} 0 0 0`,
                        whiteSpace: 'pre-wrap',
                        fontSize: typography.sizes['body-md'].fontSize,
                        color: colors.surface.onSurface,
                      }}
                    >
                      {(leadDetail || selectedLead).notes}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: spacing.md,
                borderTop: `1px solid ${colors.borderVariant}`,
                paddingTop: spacing.md,
              }}
            >
              <button
                onClick={() => {
                  const leadToEdit = selectedLead;
                  handleCloseDetailModal();
                  handleOpenEditModal(leadToEdit);
                }}
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  backgroundColor: colors.surface.containerHigh,
                  color: colors.surface.onSurface,
                  border: `1px solid ${colors.borderVariant}`,
                  borderRadius: rounded.md,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Edit Lead
              </button>
              <button
                onClick={handleCloseDetailModal}
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  backgroundColor: colors.accent.DEFAULT,
                  color: colors.accent.onAccent,
                  border: 'none',
                  borderRadius: rounded.md,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Lead Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        title="Delete Lead"
        message={`Are you sure you want to delete lead "${selectedLead?.title || selectedLead?.name || 'this lead'}"? This action cannot be undone.`}
        confirmLabel="Delete Lead"
        cancelLabel="Cancel"
        isDanger={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteLead}
        onCancel={handleCloseDeleteModal}
      />
    </section>
  );
}
