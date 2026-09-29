'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, radii, shadows, spacing, typography } from '../../lib/tokens';
import {
  interactionsApi,
  companiesApi,
  contactsApi,
  leadsApi,
  Interaction,
  InteractionCreate,
  InteractionUpdate,
  InteractionQueryParams,
  Company,
  Contact,
  Lead,
} from '../../services/crm';
import { DataTable, DataTableColumn } from '../../components/crm/DataTable';
import {
  InteractionForm,
  InteractionFormData,
  CompanyOption,
  ContactOption,
  LeadOption,
  INTERACTION_TYPE_OPTIONS,
} from '../../components/crm/InteractionForm';
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

export default function InteractionsPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);

  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);
  const [viewingInteraction, setViewingInteraction] = useState<Interaction | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Deletion state
  const [deletingInteraction, setDeletingInteraction] = useState<Interaction | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState<string | null>(null);
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({});

  const companyOptions: CompanyOption[] = useMemo(() => {
    return companies.map((c) => ({ id: c.id, name: c.name }));
  }, [companies]);

  const contactOptions: ContactOption[] = useMemo(() => {
    return contacts.map((c) => ({ id: c.id, name: c.name }));
  }, [contacts]);

  const leadOptions: LeadOption[] = useMemo(() => {
    return leads.map((l) => ({ id: l.id, title: l.title || l.name, name: l.title || l.name }));
  }, [leads]);

  const companyMap = useMemo(() => {
    const map: Record<number, string> = {};
    companies.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [companies]);

  const contactMap = useMemo(() => {
    const map: Record<number, string> = {};
    contacts.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [contacts]);

  const leadMap = useMemo(() => {
    const map: Record<number, string> = {};
    leads.forEach((l) => {
      map[l.id] = l.title || l.name || `Lead #${l.id}`;
    });
    return map;
  }, [leads]);

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

  const fetchInteractions = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);
    try {
      const params: InteractionQueryParams & Record<string, any> = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        order: sortOrder,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (typeFilter && typeFilter !== 'all') {
        params.type_filter = typeFilter;
        params.type = typeFilter;
      }

      const response = await interactionsApi.list(params as any);
      if (response.error) {
        setPageError(
          typeof response.error === 'string' ? response.error : 'Failed to load interactions'
        );
        setInteractions([]);
        setTotalItems(0);
      } else if (response.data) {
        if ('items' in response.data && Array.isArray(response.data.items)) {
          setInteractions(response.data.items as Interaction[]);
          setTotalItems(response.data.total ?? response.data.items.length);
        } else if (Array.isArray(response.data)) {
          setInteractions(response.data as Interaction[]);
          setTotalItems(response.data.length);
        }
      }
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : 'An unexpected error occurred while loading interactions.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, searchQuery, typeFilter]);

  useEffect(() => {
    fetchCompanies();
    fetchContacts();
    fetchLeads();
  }, [fetchCompanies, fetchContacts, fetchLeads]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  const handleViewInteraction = async (interaction: Interaction) => {
    setIsDetailLoading(true);
    setViewingInteraction(interaction);
    try {
      const response = await interactionsApi.get(interaction.id);
      if (response.data) {
        setViewingInteraction(response.data as Interaction);
      }
    } catch {
      // Retain existing interaction object if detail fetch fails
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCreateInteraction = async (formData: InteractionFormData) => {
    setIsSubmitting(true);
    setFormServerError(null);
    setFormFieldErrors({});
    setSuccessMessage(null);

    const summaryText = formData.summary || formData.notes || '';
    const dateVal = formData.date || new Date().toISOString();

    const payload: InteractionCreate = {
      date: dateVal,
      timestamp: dateVal,
      type: formData.type || 'note',
      summary: summaryText,
      notes: summaryText,
      company_id: formData.company_id ?? null,
      contact_id: formData.contact_id ?? null,
      lead_id: formData.lead_id ?? null,
      owner: formData.owner || '',
    };

    try {
      const response = await interactionsApi.create(payload);
      if (response.error) {
        const errObj = response.error as any;
        if (typeof errObj === 'object' && errObj !== null) {
          setFormServerError(errObj.message || 'Failed to create interaction.');
          if (Array.isArray(errObj.fields)) {
            const fieldMap: Record<string, string> = {};
            errObj.fields.forEach((f: { field: string; message: string }) => {
              fieldMap[f.field] = f.message;
            });
            setFormFieldErrors(fieldMap);
          }
        } else if (typeof response.error === 'string') {
          setFormServerError(response.error);
        } else {
          setFormServerError('Failed to create interaction.');
        }
      } else {
        setIsAddModalOpen(false);
        setSuccessMessage('Interaction created successfully.');
        fetchInteractions();
      }
    } catch (err) {
      setFormServerError(
        err instanceof Error ? err.message : 'An error occurred while saving interaction.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateInteraction = async (formData: InteractionFormData) => {
    if (!editingInteraction) return;
    setIsSubmitting(true);
    setFormServerError(null);
    setFormFieldErrors({});
    setSuccessMessage(null);

    const summaryText = formData.summary || formData.notes || '';
    const dateVal = formData.date || new Date().toISOString();

    const payload: InteractionUpdate = {
      date: dateVal,
      timestamp: dateVal,
      type: formData.type || 'note',
      summary: summaryText,
      notes: summaryText,
      company_id: formData.company_id ?? null,
      contact_id: formData.contact_id ?? null,
      lead_id: formData.lead_id ?? null,
      owner: formData.owner || '',
    };

    try {
      const response = await interactionsApi.update(editingInteraction.id, payload);
      if (response.error) {
        const errObj = response.error as any;
        if (typeof errObj === 'object' && errObj !== null) {
          setFormServerError(errObj.message || 'Failed to update interaction.');
          if (Array.isArray(errObj.fields)) {
            const fieldMap: Record<string, string> = {};
            errObj.fields.forEach((f: { field: string; message: string }) => {
              fieldMap[f.field] = f.message;
            });
            setFormFieldErrors(fieldMap);
          }
        } else if (typeof response.error === 'string') {
          setFormServerError(response.error);
        } else {
          setFormServerError('Failed to update interaction.');
        }
      } else {
        setEditingInteraction(null);
        setSuccessMessage('Interaction updated successfully.');
        if (viewingInteraction?.id === editingInteraction.id) {
          setViewingInteraction(response.data as Interaction || null);
        }
        fetchInteractions();
      }
    } catch (err) {
      setFormServerError(
        err instanceof Error ? err.message : 'An error occurred while updating interaction.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInteraction = async () => {
    if (!deletingInteraction) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await interactionsApi.delete(deletingInteraction.id);
      if (response.error) {
        const errObj = response.error as any;
        setDeleteError(
          typeof response.error === 'string'
            ? response.error
            : errObj?.message || 'Failed to delete interaction record.'
        );
      } else {
        setDeletingInteraction(null);
        if (viewingInteraction?.id === deletingInteraction.id) {
          setViewingInteraction(null);
        }
        setSuccessMessage('Interaction deleted successfully.');
        fetchInteractions();
      }
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'An error occurred while deleting interaction.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataTableColumn<Interaction>[] = [
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      sortField: 'type',
      accessor: (item) => {
        const typeVal = item.type || 'note';
        const typeLabel =
          INTERACTION_TYPE_OPTIONS.find((t) => t.value === typeVal)?.label ||
          typeVal.charAt(0).toUpperCase() + typeVal.slice(1);

        return <StatusBadge status={typeVal} label={typeLabel} size="sm" />;
      },
    },
    {
      key: 'summary',
      header: 'Summary / Notes',
      sortable: true,
      sortField: 'summary',
      accessor: (item) => {
        const text = item.summary || item.notes || `Interaction #${item.id}`;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewInteraction(item);
            }}
            data-testid={`interaction-summary-link-${item.id}`}
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
              textDecoration: 'underline',
            }}
          >
            {text}
          </button>
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      sortField: 'date',
      accessor: (item) => formatDate(item.date || item.timestamp || item.created_at),
    },
    {
      key: 'association',
      header: 'Related To',
      sortable: false,
      accessor: (item) => {
        if (item.company_id && companyMap[item.company_id]) {
          return (
            <span style={{ fontSize: typography.styles.caption.fontSize }}>
              Company: {companyMap[item.company_id]}
            </span>
          );
        }
        if (item.contact_id && contactMap[item.contact_id]) {
          return (
            <span style={{ fontSize: typography.styles.caption.fontSize }}>
              Contact: {contactMap[item.contact_id]}
            </span>
          );
        }
        if (item.lead_id && leadMap[item.lead_id]) {
          return (
            <span style={{ fontSize: typography.styles.caption.fontSize }}>
              Lead: {leadMap[item.lead_id]}
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
      accessor: (item) => (
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: spacing[2] }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleViewInteraction(item)}
            data-testid={`view-interaction-${item.id}`}
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
              setEditingInteraction(item);
              setFormServerError(null);
              setFormFieldErrors({});
            }}
            data-testid={`edit-interaction-${item.id}`}
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
              setDeletingInteraction(item);
              setDeleteError(null);
            }}
            data-testid={`delete-interaction-${item.id}`}
            style={{
              background: 'none',
              border: `1px solid ${colors.accent.secondary}`,
              borderRadius: radii.sm,
              padding: `${spacing[1]} ${spacing[2]}`,
              fontSize: typography.styles.caption.fontSize,
              color: colors.accent.secondary,
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
        htmlFor="type-filter"
        style={{
          fontSize: typography.styles.caption.fontSize,
          fontWeight: 500,
          color: colors.surface.onSurfaceVariant,
        }}
      >
        Type:
      </label>
      <select
        id="type-filter"
        value={typeFilter}
        onChange={(e) => {
          setTypeFilter(e.target.value);
          setPage(1);
        }}
        data-testid="type-filter-select"
        style={{
          padding: `${spacing[1]} ${spacing[3]}`,
          borderRadius: radii.md,
          border: `1px solid ${colors.surface.outlineVariant}`,
          backgroundColor: colors.surface.containerLowest,
          color: colors.surface.onSurface,
          fontSize: typography.styles.caption.fontSize,
          cursor: 'pointer',
        }}
      >
        <option value="all">All Types</option>
        {INTERACTION_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: `${spacing[6]} ${spacing[4]}`,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[6],
      }}
    >
      {/* Top Header */}
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
            Interactions
          </h1>
          <p
            style={{
              fontFamily: typography.styles.bodyMd.fontFamily,
              fontSize: typography.styles.bodyMd.fontSize,
              color: colors.surface.onSurfaceVariant,
              margin: 0,
            }}
          >
            Record and view calls, emails, meetings, and notes for companies, contacts, and leads.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setFormServerError(null);
            setFormFieldErrors({});
          }}
          data-testid="add-interaction-button"
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
          + Add Interaction
        </button>
      </div>

      {/* Alert Banners */}
      {successMessage && (
        <Alert
          variant="success"
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
          data-testid="interactions-success-alert"
        />
      )}
      {pageError && (
        <Alert
          variant="error"
          message={pageError}
          onClose={() => setPageError(null)}
          data-testid="interactions-error-alert"
        />
      )}

      {/* Data Table */}
      <DataTable
        data={interactions}
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
        searchPlaceholder="Search interactions by summary..."
        isLoading={isLoading}
        emptyTitle="No interactions found"
        emptyDescription="Get started by logging your first customer interaction or note."
        onAdd={() => {
          setIsAddModalOpen(true);
          setFormServerError(null);
          setFormFieldErrors({});
        }}
        addLabel="Add Interaction"
        extraToolbar={extraToolbar}
        onRowClick={(item) => handleViewInteraction(item)}
        data-testid="interactions-table"
      />

      {/* Add Interaction Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Interaction"
        data-testid="add-interaction-modal"
      >
        <InteractionForm
          companies={companyOptions}
          contacts={contactOptions}
          leads={leadOptions}
          onSubmit={handleCreateInteraction}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={isSubmitting}
          serverError={formServerError}
          serverFieldErrors={formFieldErrors}
          submitLabel="Create Interaction"
        />
      </Modal>

      {/* Edit Interaction Modal */}
      <Modal
        isOpen={!!editingInteraction}
        onClose={() => setEditingInteraction(null)}
        title="Edit Interaction"
        data-testid="edit-interaction-modal"
      >
        {editingInteraction && (
          <InteractionForm
            initialValues={editingInteraction}
            companies={companyOptions}
            contacts={contactOptions}
            leads={leadOptions}
            onSubmit={handleUpdateInteraction}
            onCancel={() => setEditingInteraction(null)}
            isLoading={isSubmitting}
            serverError={formServerError}
            serverFieldErrors={formFieldErrors}
            submitLabel="Update Interaction"
          />
        )}
      </Modal>

      {/* View Interaction Detail Modal */}
      <Modal
        isOpen={!!viewingInteraction}
        onClose={() => setViewingInteraction(null)}
        title="Interaction Details"
        data-testid="view-interaction-modal"
      >
        {viewingInteraction && (
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
                Type
              </div>
              <div>
                <StatusBadge
                  status={viewingInteraction.type || 'note'}
                  label={
                    INTERACTION_TYPE_OPTIONS.find(
                      (t) => t.value === (viewingInteraction.type || 'note')
                    )?.label || viewingInteraction.type || 'Note'
                  }
                />
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
                Summary / Notes
              </div>
              <div
                style={{
                  fontSize: typography.styles.bodyMd.fontSize,
                  color: colors.surface.onSurface,
                  backgroundColor: colors.surface.containerLow,
                  padding: spacing[3],
                  borderRadius: radii.md,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {viewingInteraction.summary || viewingInteraction.notes || '—'}
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
                  Date
                </div>
                <div style={{ fontSize: typography.styles.bodyMd.fontSize, color: colors.surface.onSurface }}>
                  {formatDate(viewingInteraction.date || viewingInteraction.timestamp || viewingInteraction.created_at)}
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
                  Owner
                </div>
                <div style={{ fontSize: typography.styles.bodyMd.fontSize, color: colors.surface.onSurface }}>
                  {viewingInteraction.owner || '—'}
                </div>
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
                Related Entity
              </div>
              <div style={{ fontSize: typography.styles.bodyMd.fontSize, color: colors.surface.onSurface }}>
                {viewingInteraction.company_id && companyMap[viewingInteraction.company_id]
                  ? `Company: ${companyMap[viewingInteraction.company_id]}`
                  : viewingInteraction.contact_id && contactMap[viewingInteraction.contact_id]
                  ? `Contact: ${contactMap[viewingInteraction.contact_id]}`
                  : viewingInteraction.lead_id && leadMap[viewingInteraction.lead_id]
                  ? `Lead: ${leadMap[viewingInteraction.lead_id]}`
                  : 'Unassigned'}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: spacing[3],
                marginTop: spacing[4],
                paddingTop: spacing[4],
                borderTop: `1px solid ${colors.surface.outlineVariant}`,
              }}
            >
              <button
                onClick={() => {
                  const toEdit = viewingInteraction;
                  setViewingInteraction(null);
                  setEditingInteraction(toEdit);
                  setFormServerError(null);
                  setFormFieldErrors({});
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.surface.outlineVariant}`,
                  borderRadius: radii.md,
                  padding: `${spacing[2]} ${spacing[4]}`,
                  fontSize: typography.styles.bodyMd.fontSize,
                  color: colors.surface.onSurface,
                  cursor: 'pointer',
                }}
              >
                Edit Interaction
              </button>
              <button
                onClick={() => {
                  const toDelete = viewingInteraction;
                  setViewingInteraction(null);
                  setDeletingInteraction(toDelete);
                  setDeleteError(null);
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: `1px solid ${colors.accent.secondary}`,
                  borderRadius: radii.md,
                  padding: `${spacing[2]} ${spacing[4]}`,
                  fontSize: typography.styles.bodyMd.fontSize,
                  color: colors.accent.secondary,
                  cursor: 'pointer',
                }}
              >
                Delete Interaction
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog for Deletion */}
      <ConfirmationDialog
        isOpen={!!deletingInteraction}
        title="Delete Interaction"
        message={
          deleteError
            ? deleteError
            : `Are you sure you want to delete this interaction? This action cannot be undone.`
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteInteraction}
        onCancel={() => {
          setDeletingInteraction(null);
          setDeleteError(null);
        }}
        isDanger
        isLoading={isDeleting}
        data-testid="delete-interaction-dialog"
      />
    </div>
  );
}
