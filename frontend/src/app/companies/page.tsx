'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { colors, radii, shadows, spacing, typography } from '../../lib/tokens';
import {
  companiesApi,
  Company,
  CompanyCreate,
  CompanyUpdate,
  CompanyQueryParams,
} from '../../services/crm';
import { DataTable, DataTableColumn } from '../../components/crm/DataTable';
import { CompanyForm, CompanyFormData } from '../../components/crm/CompanyForm';
import { ConfirmationDialog } from '../../components/shared/ConfirmationDialog';
import { Alert } from '../../components/shared/Alerts';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatDate } from '../../lib/format';

export interface CompanyDetailResponse extends Company {
  contacts?: Array<{
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    role?: string | null;
    owner?: string | null;
  }>;
  leads?: Array<{
    id: number;
    title: string;
    value: number;
    status: string;
    expected_close_date?: string | null;
  }>;
  tasks?: Array<{
    id: number;
    description: string;
    due_date: string;
    completed: boolean;
  }>;
  interactions?: Array<{
    id: number;
    date: string;
    type: string;
    summary: string;
  }>;
}

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

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [viewingCompany, setViewingCompany] = useState<CompanyDetailResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'contacts' | 'leads' | 'tasks' | 'interactions'>('overview');

  // Deletion state
  const [deletingCompany, setDeletingCompany] = useState<Company | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState<string | null>(null);
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);
    try {
      const params: CompanyQueryParams = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        order: sortOrder,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await companiesApi.list(params);
      if (response.error) {
        setPageError(typeof response.error === 'string' ? response.error : 'Failed to load companies');
        setCompanies([]);
        setTotalItems(0);
      } else if (response.data) {
        if ('items' in response.data && Array.isArray(response.data.items)) {
          setCompanies(response.data.items);
          setTotalItems(response.data.total ?? response.data.items.length);
        } else if (Array.isArray(response.data)) {
          setCompanies(response.data);
          setTotalItems(response.data.length);
        }
      }
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'An unexpected error occurred while loading companies.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, searchQuery]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleViewCompany = async (company: Company) => {
    setIsDetailLoading(true);
    setViewingCompany({ ...company });
    setActiveDetailTab('overview');
    try {
      const res = await companiesApi.get(company.id);
      if (res.data) {
        setViewingCompany(res.data as CompanyDetailResponse);
      }
    } catch (err) {
      // Retain basic company data if detail fetch fails
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCreateSubmit = async (formData: CompanyFormData) => {
    setIsSubmitting(true);
    setFormServerError(null);
    setFormFieldErrors({});
    try {
      const payload: CompanyCreate = {
        name: formData.name,
        industry: formData.industry || null,
        website: formData.website || null,
        notes: formData.notes || null,
        email: formData.email || null,
        owner: formData.owner || '',
      };
      const res = await companiesApi.create(payload);
      if (res.error) {
        const errData = res.error as any;
        if (errData?.fields && Array.isArray(errData.fields)) {
          const fieldErrMap: Record<string, string> = {};
          errData.fields.forEach((f: { field: string; message: string }) => {
            fieldErrMap[f.field] = f.message;
          });
          setFormFieldErrors(fieldErrMap);
        }
        setFormServerError(errData?.message || 'Failed to create company.');
      } else if (res.data) {
        setIsAddModalOpen(false);
        setSuccessMessage(`Company "${res.data.name}" created successfully.`);
        fetchCompanies();
      }
    } catch (err) {
      setFormServerError(err instanceof Error ? err.message : 'Failed to create company.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (formData: CompanyFormData) => {
    if (!editingCompany) return;
    setIsSubmitting(true);
    setFormServerError(null);
    setFormFieldErrors({});
    try {
      const payload: CompanyUpdate = {
        name: formData.name,
        industry: formData.industry || null,
        website: formData.website || null,
        notes: formData.notes || null,
        email: formData.email || null,
        owner: formData.owner || null,
      };
      const res = await companiesApi.update(editingCompany.id, payload);
      if (res.error) {
        const errData = res.error as any;
        if (errData?.fields && Array.isArray(errData.fields)) {
          const fieldErrMap: Record<string, string> = {};
          errData.fields.forEach((f: { field: string; message: string }) => {
            fieldErrMap[f.field] = f.message;
          });
          setFormFieldErrors(fieldErrMap);
        }
        setFormServerError(errData?.message || 'Failed to update company.');
      } else if (res.data) {
        setEditingCompany(null);
        setSuccessMessage(`Company "${res.data.name}" updated successfully.`);
        fetchCompanies();
        if (viewingCompany && viewingCompany.id === res.data.id) {
          handleViewCompany(res.data);
        }
      }
    } catch (err) {
      setFormServerError(err instanceof Error ? err.message : 'Failed to update company.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCompany) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await companiesApi.delete(deletingCompany.id);
      if (res.error) {
        const errData = res.error as any;
        if (errData?.error_code === 'DELETE_BLOCKED' || res.response?.status === 409) {
          setDeleteError(
            errData?.message ||
              'Cannot delete company with associated records (contacts, leads, tasks, or interactions).'
          );
        } else {
          setDeleteError(errData?.message || 'Failed to delete company.');
        }
      } else {
        const deletedName = deletingCompany.name;
        setDeletingCompany(null);
        setSuccessMessage(`Company "${deletedName}" deleted successfully.`);
        fetchCompanies();
        if (viewingCompany && viewingCompany.id === deletingCompany.id) {
          setViewingCompany(null);
        }
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'An error occurred during deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataTableColumn<Company>[] = [
    {
      key: 'name',
      header: 'Company Name',
      sortable: true,
      sortField: 'name',
      accessor: (company) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleViewCompany(company);
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
          data-testid={`company-name-link-${company.id}`}
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
      accessor: (company) => company.industry || '—',
    },
    {
      key: 'website',
      header: 'Website',
      accessor: (company) =>
        company.website ? (
          <a
            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              color: colors.accent.primary,
              textDecoration: 'none',
            }}
          >
            {company.website}
          </a>
        ) : (
          '—'
        ),
    },
    {
      key: 'owner',
      header: 'Owner',
      accessor: (company) => company.owner || '—',
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      sortField: 'created_at',
      accessor: (company) => formatDate(company.created_at, { fallback: '—' }),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      accessor: (company) => (
        <div
          style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleViewCompany(company)}
            data-testid={`view-company-${company.id}`}
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
              setEditingCompany(company);
              setFormServerError(null);
              setFormFieldErrors({});
            }}
            data-testid={`edit-company-${company.id}`}
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
              setDeletingCompany(company);
              setDeleteError(null);
            }}
            data-testid={`delete-company-${company.id}`}
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

  return (
    <div
      data-testid="companies-page"
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
            Companies
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
            Companies
          </h1>
          <p
            style={{
              fontFamily: typography.styles.bodyMd.fontFamily,
              fontSize: typography.styles.bodyMd.fontSize,
              color: colors.surface.onSurfaceVariant,
              margin: 0,
            }}
          >
            Manage company accounts and view associated contacts, deals, and activities.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setFormServerError(null);
            setFormFieldErrors({});
          }}
          data-testid="add-company-button"
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
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing[2],
          }}
        >
          + Add Company
        </button>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <Alert
          variant="success"
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
          data-testid="companies-success-alert"
        />
      )}

      {/* Page Error Alert */}
      {pageError && (
        <Alert
          variant="error"
          message={pageError}
          onClose={() => setPageError(null)}
          data-testid="companies-error-alert"
        />
      )}

      {/* Data Table */}
      <DataTable
        data={companies}
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
        searchPlaceholder="Search companies by name or industry..."
        isLoading={isLoading}
        emptyTitle="No companies found"
        emptyDescription="Get started by creating your first company record."
        onAdd={() => {
          setIsAddModalOpen(true);
          setFormServerError(null);
          setFormFieldErrors({});
        }}
        addLabel="Add Company"
        onRowClick={(item) => handleViewCompany(item)}
        data-testid="companies-table"
      />

      {/* Add Company Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Company"
        data-testid="add-company-modal"
      >
        <CompanyForm
          onSubmit={handleCreateSubmit}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={isSubmitting}
          submitLabel="Create Company"
          serverError={formServerError}
          serverFieldErrors={formFieldErrors}
        />
      </Modal>

      {/* Edit Company Modal */}
      <Modal
        isOpen={!!editingCompany}
        onClose={() => setEditingCompany(null)}
        title="Edit Company"
        data-testid="edit-company-modal"
      >
        {editingCompany && (
          <CompanyForm
            initialValues={editingCompany}
            onSubmit={handleUpdateSubmit}
            onCancel={() => setEditingCompany(null)}
            isLoading={isSubmitting}
            submitLabel="Save Changes"
            serverError={formServerError}
            serverFieldErrors={formFieldErrors}
          />
        )}
      </Modal>

      {/* Company Detail Modal (FR-13) */}
      <Modal
        isOpen={!!viewingCompany}
        onClose={() => setViewingCompany(null)}
        title={viewingCompany?.name || 'Company Details'}
        maxWidth="760px"
        data-testid="view-company-modal"
      >
        {viewingCompany && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[6] }}>
            {/* Tab Navigation */}
            <div
              style={{
                display: 'flex',
                gap: spacing[2],
                borderBottom: `1px solid ${colors.surface.outlineVariant}`,
                paddingBottom: spacing[2],
              }}
            >
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'contacts', label: `Contacts (${viewingCompany.contacts?.length || 0})` },
                { key: 'leads', label: `Leads (${viewingCompany.leads?.length || 0})` },
                { key: 'tasks', label: `Tasks (${viewingCompany.tasks?.length || 0})` },
                { key: 'interactions', label: `Interactions (${viewingCompany.interactions?.length || 0})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveDetailTab(tab.key as any)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom:
                      activeDetailTab === tab.key ? `2px solid ${colors.accent.primary}` : '2px solid transparent',
                    color: activeDetailTab === tab.key ? colors.accent.primary : colors.surface.onSurfaceVariant,
                    fontFamily: typography.styles.bodyMd.fontFamily,
                    fontSize: typography.styles.caption.fontSize,
                    fontWeight: activeDetailTab === tab.key ? 600 : 400,
                    padding: `${spacing[2]} ${spacing[3]}`,
                    cursor: 'pointer',
                  }}
                  data-testid={`company-detail-tab-${tab.key}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {isDetailLoading && (
              <div style={{ padding: spacing[4], textAlign: 'center', color: colors.surface.onSurfaceVariant }}>
                Loading details...
              </div>
            )}

            {!isDetailLoading && activeDetailTab === 'overview' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: spacing[4],
                }}
              >
                <div>
                  <span style={{ fontSize: typography.styles.caption.fontSize, color: colors.surface.onSurfaceVariant }}>
                    Industry
                  </span>
                  <div style={{ fontWeight: 500, marginTop: spacing[1] }}>{viewingCompany.industry || '—'}</div>
                </div>
                <div>
                  <span style={{ fontSize: typography.styles.caption.fontSize, color: colors.surface.onSurfaceVariant }}>
                    Website
                  </span>
                  <div style={{ fontWeight: 500, marginTop: spacing[1] }}>
                    {viewingCompany.website ? (
                      <a
                        href={
                          viewingCompany.website.startsWith('http')
                            ? viewingCompany.website
                            : `https://${viewingCompany.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: colors.accent.primary }}
                      >
                        {viewingCompany.website}
                      </a>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: typography.styles.caption.fontSize, color: colors.surface.onSurfaceVariant }}>
                    Primary Email
                  </span>
                  <div style={{ fontWeight: 500, marginTop: spacing[1] }}>{viewingCompany.email || '—'}</div>
                </div>
                <div>
                  <span style={{ fontSize: typography.styles.caption.fontSize, color: colors.surface.onSurfaceVariant }}>
                    Owner
                  </span>
                  <div style={{ fontWeight: 500, marginTop: spacing[1] }}>{viewingCompany.owner || '—'}</div>
                </div>
                <div>
                  <span style={{ fontSize: typography.styles.caption.fontSize, color: colors.surface.onSurfaceVariant }}>
                    Created Date
                  </span>
                  <div style={{ fontWeight: 500, marginTop: spacing[1] }}>
                    {formatDate(viewingCompany.created_at, { fallback: '—' })}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: typography.styles.caption.fontSize, color: colors.surface.onSurfaceVariant }}>
                    Notes
                  </span>
                  <div
                    style={{
                      marginTop: spacing[1],
                      padding: spacing[3],
                      backgroundColor: colors.surface.containerLow,
                      borderRadius: radii.sm,
                      whiteSpace: 'pre-wrap',
                      fontSize: typography.styles.bodyMd.fontSize,
                    }}
                  >
                    {viewingCompany.notes || 'No notes provided.'}
                  </div>
                </div>
              </div>
            )}

            {!isDetailLoading && activeDetailTab === 'contacts' && (
              <div>
                {!viewingCompany.contacts || viewingCompany.contacts.length === 0 ? (
                  <p style={{ color: colors.surface.onSurfaceVariant, fontStyle: 'italic' }}>
                    No contacts linked to this company.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                    {viewingCompany.contacts.map((contact) => (
                      <li
                        key={contact.id}
                        style={{
                          padding: spacing[3],
                          backgroundColor: colors.surface.containerLow,
                          borderRadius: radii.sm,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{contact.name}</div>
                          <div style={{ fontSize: typography.styles.caption.fontSize, color: colors.surface.onSurfaceVariant }}>
                            {contact.email} {contact.phone ? `• ${contact.phone}` : ''}
                          </div>
                        </div>
                        {contact.role && (
                          <span style={{ fontSize: typography.styles.caption.fontSize, color: colors.surface.onSurfaceVariant }}>
                            {contact.role}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {!isDetailLoading && activeDetailTab === 'leads' && (
              <div>
                {!viewingCompany.leads || viewingCompany.leads.length === 0 ? (
                  <p style={{ color: colors.surface.onSurfaceVariant, fontStyle: 'italic' }}>
                    No leads linked to this company.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                    {viewingCompany.leads.map((lead) => (
                      <li
                        key={lead.id}
                        style={{
                          padding: spacing[3],
                          backgroundColor: colors.surface.containerLow,
                          borderRadius: radii.sm,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600 }}>{lead.title}</div>
                          <div style={{ fontSize: typography.styles.caption.fontSize, color: colors.surface.onSurfaceVariant }}>
                            Value: ${lead.value?.toLocaleString()}
                          </div>
                        </div>
                        <StatusBadge status={lead.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {!isDetailLoading && activeDetailTab === 'tasks' && (
              <div>
                {!viewingCompany.tasks || viewingCompany.tasks.length === 0 ? (
                  <p style={{ color: colors.surface.onSurfaceVariant, fontStyle: 'italic' }}>
                    No tasks linked to this company.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                    {viewingCompany.tasks.map((task) => (
                      <li
                        key={task.id}
                        style={{
                          padding: spacing[3],
                          backgroundColor: colors.surface.containerLow,
                          borderRadius: radii.sm,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500, textDecoration: task.completed ? 'line-through' : 'none' }}>
                            {task.description}
                          </div>
                          <div style={{ fontSize: typography.styles.caption.fontSize, color: colors.surface.onSurfaceVariant }}>
                            Due: {formatDate(task.due_date, { fallback: '—' })}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: typography.styles.caption.fontSize,
                            fontWeight: 600,
                            color: task.completed ? colors.accent.primary : colors.secondary.main,
                          }}
                        >
                          {task.completed ? 'Completed' : 'Pending'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {!isDetailLoading && activeDetailTab === 'interactions' && (
              <div>
                {!viewingCompany.interactions || viewingCompany.interactions.length === 0 ? (
                  <p style={{ color: colors.surface.onSurfaceVariant, fontStyle: 'italic' }}>
                    No interactions recorded for this company.
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: spacing[2] }}>
                    {viewingCompany.interactions.map((interaction) => (
                      <li
                        key={interaction.id}
                        style={{
                          padding: spacing[3],
                          backgroundColor: colors.surface.containerLow,
                          borderRadius: radii.sm,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: spacing[1],
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{interaction.type}</span>
                          <span style={{ fontSize: typography.styles.caption.fontSize, color: colors.surface.onSurfaceVariant }}>
                            {formatDate(interaction.date, { fallback: '—' })}
                          </span>
                        </div>
                        <div style={{ fontSize: typography.styles.bodyMd.fontSize, color: colors.surface.onSurface }}>
                          {interaction.summary}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing[3], marginTop: spacing[4] }}>
              <button
                onClick={() => {
                  setEditingCompany(viewingCompany);
                  setViewingCompany(null);
                  setFormServerError(null);
                  setFormFieldErrors({});
                }}
                data-testid="detail-edit-button"
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
                Edit Company
              </button>
              <button
                onClick={() => setViewingCompany(null)}
                style={{
                  backgroundColor: colors.surface.containerLow,
                  color: colors.surface.onSurface,
                  border: `1px solid ${colors.surface.outlineVariant}`,
                  borderRadius: radii.md,
                  padding: `${spacing[2]} ${spacing[4]}`,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deletingCompany}
        title="Delete Company"
        message={
          <div>
            {deleteError && (
              <div style={{ marginBottom: spacing[3] }}>
                <Alert variant="error" message={deleteError} />
              </div>
            )}
            <p style={{ margin: 0 }}>
              Are you sure you want to delete company <strong>{deletingCompany?.name}</strong>?
            </p>
          </div>
        }
        confirmLabel="Delete Company"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeletingCompany(null);
          setDeleteError(null);
        }}
        isDanger={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
