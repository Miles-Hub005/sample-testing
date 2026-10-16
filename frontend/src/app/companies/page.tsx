'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { colors, rounded, shadows, spacing, typography } from '@/lib/tokens';
import { formatDate } from '@/lib/format';
import { DataTable, Column } from '@/components/crm/DataTable';
import { CompanyForm, CompanyFormData } from '@/components/crm/CompanyForm';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { ErrorAlert, SuccessAlert } from '@/components/shared/Alerts';
import { LoadingState } from '@/components/shared/States';
import {
  getPaginatedCompanies,
  getCompanyDetail,
  createCompany,
  updateCompany,
  deleteCompany,
  CompanyRead,
  CompanyDetailRead,
  CRMApiError,
} from '@/services/crm';

/**
 * CompaniesPage Component
 * Route segment for `/companies`
 * Displays a DataTable of companies with search, sort, and pagination.
 * Offers Add Company, Detail View, Edit Company, and Delete Company modals.
 * Satisfies FR-1 (Companies CRUD), FR-10 (Breadcrumbs/Navigation), and FR-14 (Empty States).
 */
export default function CompaniesPage() {
  // Data state
  const [companies, setCompanies] = useState<CompanyRead[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [searchValue, setSearchValue] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc');

  // Loading & error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal & Selection states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const [selectedCompany, setSelectedCompany] = useState<CompanyRead | null>(null);
  const [companyDetail, setCompanyDetail] = useState<CompanyDetailRead | null>(null);

  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [formApiError, setFormApiError] = useState<CRMApiError | string | null>(null);

  // Fetch paginated companies list
  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sortParam = sortColumn
        ? sortDirection === 'desc'
          ? `-${sortColumn}`
          : sortColumn
        : undefined;

      const response = await getPaginatedCompanies({
        page,
        page_size: pageSize,
        search: searchValue || undefined,
        sort: sortParam,
      });

      setCompanies(response.items || []);
      setTotalItems(response.total ?? (response.items ? response.items.length : 0));
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load companies.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchValue, sortColumn, sortDirection]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Modal control helpers
  const handleOpenAddModal = () => {
    setFormApiError(null);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setFormApiError(null);
  };

  const handleOpenEditModal = (company: CompanyRead) => {
    setSelectedCompany(company);
    setFormApiError(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedCompany(null);
    setFormApiError(null);
  };

  const handleOpenDetailModal = async (company: CompanyRead) => {
    setSelectedCompany(company);
    setCompanyDetail(null);
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);

    try {
      const detail = await getCompanyDetail(company.id);
      setCompanyDetail(detail);
    } catch {
      // If fetching detail fails, fallback to basic CompanyRead
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedCompany(null);
    setCompanyDetail(null);
  };

  const handleOpenDeleteModal = (company: CompanyRead) => {
    setSelectedCompany(company);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedCompany(null);
  };

  // Form submit handlers
  const handleCreateCompany = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    setFormApiError(null);
    try {
      await createCompany(data);
      setSuccessMessage(`Company "${data.name.trim()}" created successfully.`);
      handleCloseAddModal();
      fetchCompanies();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setFormApiError(err);
      } else if (err instanceof Error) {
        setFormApiError(err.message);
      } else {
        setFormApiError('Failed to create company.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCompany = async (data: CompanyFormData) => {
    if (!selectedCompany) return;
    setIsSubmitting(true);
    setFormApiError(null);
    try {
      await updateCompany(selectedCompany.id, data);
      setSuccessMessage(`Company "${data.name.trim()}" updated successfully.`);
      handleCloseEditModal();
      fetchCompanies();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setFormApiError(err);
      } else if (err instanceof Error) {
        setFormApiError(err.message);
      } else {
        setFormApiError('Failed to update company.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;
    setIsDeleting(true);
    try {
      await deleteCompany(selectedCompany.id);
      setSuccessMessage(`Company "${selectedCompany.name}" deleted successfully.`);
      handleCloseDeleteModal();
      fetchCompanies();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setError(`Failed to delete company: ${err.message}`);
      } else if (err instanceof Error) {
        setError(`Failed to delete company: ${err.message}`);
      } else {
        setError('Failed to delete company.');
      }
      handleCloseDeleteModal();
    } finally {
      setIsDeleting(false);
    }
  };

  // Table columns definition
  const columns: Column<CompanyRead>[] = [
    {
      key: 'name',
      header: 'Company Name',
      sortable: true,
      sortField: 'name',
      render: (company) => (
        <button
          onClick={() => handleOpenDetailModal(company)}
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
          aria-label={`View details for ${company.name}`}
        >
          {company.name}
        </button>
      ),
    },
    {
      key: 'industry',
      header: 'Industry',
      sortable: true,
      sortField: 'industry',
      render: (company) => company.industry || '—',
    },
    {
      key: 'website',
      header: 'Website',
      render: (company) => {
        if (!company.website) return '—';
        const url = company.website.startsWith('http')
          ? company.website
          : `https://${company.website}`;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: colors.accent.DEFAULT, textDecoration: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            {company.website}
          </a>
        );
      },
    },
    {
      key: 'owner',
      header: 'Owner',
      sortable: true,
      sortField: 'owner',
      render: (company) => company.owner || '—',
    },
    {
      key: 'created_at',
      header: 'Created Date',
      sortable: true,
      sortField: 'created_at',
      render: (company) => formatDate(company.created_at) || '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (company) => (
        <div
          style={{ display: 'flex', gap: spacing.xs, justifyContent: 'flex-end' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleOpenDetailModal(company)}
            style={{
              padding: `${spacing.xs} ${spacing.sm}`,
              backgroundColor: colors.surface.containerHigh,
              border: `1px solid ${colors.borderVariant}`,
              borderRadius: rounded.sm,
              fontSize: '13px',
              cursor: 'pointer',
              color: colors.surface.onSurface,
            }}
            aria-label={`View ${company.name}`}
          >
            View
          </button>
          <button
            onClick={() => handleOpenEditModal(company)}
            style={{
              padding: `${spacing.xs} ${spacing.sm}`,
              backgroundColor: colors.surface.containerHigh,
              border: `1px solid ${colors.borderVariant}`,
              borderRadius: rounded.sm,
              fontSize: '13px',
              cursor: 'pointer',
              color: colors.surface.onSurface,
            }}
            aria-label={`Edit ${company.name}`}
          >
            Edit
          </button>
          <button
            onClick={() => handleOpenDeleteModal(company)}
            style={{
              padding: `${spacing.xs} ${spacing.sm}`,
              backgroundColor: colors.status.errorContainer,
              color: colors.status.onErrorContainer,
              border: 'none',
              borderRadius: rounded.sm,
              fontSize: '13px',
              cursor: 'pointer',
            }}
            aria-label={`Delete ${company.name}`}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <section
      aria-label="Companies Management"
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
              style={{ color: colors.accent.DEFAULT, textDecoration: 'none' }}
            >
              Dashboard
            </a>
          </li>
          <li>/</li>
          <li aria-current="page" style={{ color: colors.surface.onSurface, fontWeight: 500 }}>
            Companies
          </li>
        </ol>
      </nav>

      {/* Header Banner */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: spacing.md,
          flexWrap: 'wrap',
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
            Companies
          </h1>
          <p
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: typography.sizes['body-md'].fontSize,
              color: colors.surface.onSurfaceVariant,
              margin: `${spacing.xs} 0 0 0`,
            }}
          >
            Manage company accounts, organizational details, and business relationships.
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
            fontWeight: 500,
            fontSize: typography.sizes['body-md'].fontSize,
            cursor: 'pointer',
            boxShadow: shadows.sm,
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
          }}
          aria-label="Add new company"
        >
          <span>+</span> Add Company
        </button>
      </header>

      {/* Notification Alerts */}
      {successMessage && (
        <SuccessAlert
          message={successMessage}
          onDismiss={() => setSuccessMessage(null)}
        />
      )}
      {error && (
        <ErrorAlert
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Main Companies DataTable (FR-1, FR-14) */}
      <DataTable<CompanyRead>
        columns={columns}
        data={companies}
        totalItems={totalItems}
        loading={loading}
        error={error}
        searchValue={searchValue}
        searchPlaceholder="Search companies by name or industry..."
        onSearchChange={(value) => {
          setSearchValue(value);
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
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(ps) => {
          setPageSize(ps);
          setPage(1);
        }}
        emptyTitle="No companies found"
        emptyMessage="Get started by adding your first company to track organizational relationships."
        emptyActionLabel="Add Company"
        onEmptyAction={handleOpenAddModal}
        getRowKey={(item) => item.id}
        onRowClick={(item) => handleOpenDetailModal(item)}
        ariaLabel="Companies Table"
      />

      {/* Add Company Modal */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-company-modal-title"
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
            <CompanyForm
              onSubmit={handleCreateCompany}
              onCancel={handleCloseAddModal}
              isSubmitting={isSubmitting}
              apiError={formApiError}
              submitLabel="Create Company"
              title="Add New Company"
            />
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {isEditModalOpen && selectedCompany && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-company-modal-title"
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
            <CompanyForm
              initialValues={selectedCompany}
              onSubmit={handleUpdateCompany}
              onCancel={handleCloseEditModal}
              isSubmitting={isSubmitting}
              apiError={formApiError}
              submitLabel="Save Changes"
              title="Edit Company"
            />
          </div>
        </div>
      )}

      {/* Company Detail Modal */}
      {isDetailModalOpen && selectedCompany && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-company-modal-title"
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
              <h2
                id="detail-company-modal-title"
                style={{
                  margin: 0,
                  fontFamily: typography.fontFamily.serif,
                  fontSize: typography.sizes['headline-sm'].fontSize,
                  color: colors.surface.onSurface,
                }}
              >
                {selectedCompany.name}
              </h2>
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
                  Industry
                </span>
                <strong>{selectedCompany.industry || '—'}</strong>
              </div>

              <div>
                <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                  Owner
                </span>
                <strong>{selectedCompany.owner || '—'}</strong>
              </div>

              <div>
                <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                  Website
                </span>
                {selectedCompany.website ? (
                  <a
                    href={
                      selectedCompany.website.startsWith('http')
                        ? selectedCompany.website
                        : `https://${selectedCompany.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: colors.accent.DEFAULT, textDecoration: 'none' }}
                  >
                    {selectedCompany.website}
                  </a>
                ) : (
                  <strong>—</strong>
                )}
              </div>

              <div>
                <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                  Contact Email
                </span>
                <strong>{selectedCompany.email || '—'}</strong>
              </div>

              <div>
                <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                  Created At
                </span>
                <strong>{formatDate(selectedCompany.created_at) || '—'}</strong>
              </div>

              <div>
                <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                  Updated At
                </span>
                <strong>{formatDate(selectedCompany.updated_at) || '—'}</strong>
              </div>
            </div>

            {selectedCompany.notes && (
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
                  {selectedCompany.notes}
                </p>
              </div>
            )}

            {/* Linked Records Summary */}
            <div
              style={{
                borderTop: `1px solid ${colors.borderVariant}`,
                paddingTop: spacing.md,
                marginBottom: spacing.lg,
              }}
            >
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  margin: `0 0 ${spacing.sm} 0`,
                  color: colors.surface.onSurface,
                }}
              >
                Linked Records
              </h3>

              {isDetailLoading ? (
                <LoadingState message="Loading associated records..." />
              ) : companyDetail ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: spacing.sm,
                    textAlign: 'center',
                    backgroundColor: colors.surface.surfaceContainerLow,
                    padding: spacing.sm,
                    borderRadius: rounded.md,
                  }}
                >
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>
                      {companyDetail.contacts?.length ?? 0}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.surface.onSurfaceVariant }}>
                      Contacts
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>
                      {companyDetail.leads?.length ?? 0}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.surface.onSurfaceVariant }}>
                      Leads
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>
                      {companyDetail.tasks?.length ?? 0}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.surface.onSurfaceVariant }}>
                      Tasks
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>
                      {companyDetail.interactions?.length ?? 0}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.surface.onSurfaceVariant }}>
                      Interactions
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: colors.surface.onSurfaceVariant }}>
                  No linked records details available.
                </div>
              )}
            </div>

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
                  const companyToEdit = selectedCompany;
                  handleCloseDetailModal();
                  handleOpenEditModal(companyToEdit);
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
                Edit Company
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteModalOpen}
        title="Delete Company"
        message={
          selectedCompany
            ? `Are you sure you want to delete "${selectedCompany.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this company?'
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDeleteCompany}
        onCancel={handleCloseDeleteModal}
        isLoading={isDeleting}
      />
    </section>
  );
}
