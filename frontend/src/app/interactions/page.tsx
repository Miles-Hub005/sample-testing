'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, rounded, shadows, spacing, typography } from '@/lib/tokens';
import { formatDate } from '@/lib/format';
import { DataTable, Column } from '@/components/crm/DataTable';
import {
  InteractionForm,
  InteractionFormData,
  CompanyOption,
  ContactOption,
  LeadOption,
  DEFAULT_INTERACTION_TYPES,
} from '@/components/crm/InteractionForm';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { ErrorAlert, SuccessAlert } from '@/components/shared/Alerts';
import { LoadingState } from '@/components/shared/States';
import {
  getPaginatedInteractions,
  getInteraction,
  createInteraction,
  updateInteraction,
  deleteInteraction,
  listCompanies,
  listContacts,
  listLeads,
  InteractionRead,
  CompanyRead,
  ContactRead,
  LeadRead,
  CRMApiError,
} from '@/services/crm';

/**
 * InteractionsPage Component
 * Route segment for `/interactions`
 * Displays a DataTable of interaction logs with search, sort, type filter, and pagination.
 * Offers Add Interaction, Detail View, Edit Interaction, and Delete Interaction modals.
 * Satisfies FR-5 (Interactions CRUD with associations), FR-10 (Breadcrumbs/Navigation), and FR-14 (Empty States).
 */
export default function InteractionsPage() {
  // Data state
  const [interactions, setInteractions] = useState<InteractionRead[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [searchValue, setSearchValue] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');

  // Company, Contact, and Lead options for dropdowns and lookup maps
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
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

  const [selectedInteraction, setSelectedInteraction] = useState<InteractionRead | null>(null);
  const [interactionDetail, setInteractionDetail] = useState<InteractionRead | null>(null);

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

  // Map of lead ID to lead title for fast lookup
  const leadMap = useMemo(() => {
    const map: Record<number, string> = {};
    leads.forEach((l) => {
      map[l.id] = l.title || l.name || `Lead #${l.id}`;
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

  // Fetch contact options for dropdown and display
  const fetchContacts = useCallback(async () => {
    try {
      const contactList: ContactRead[] = await listContacts({ page_size: 1000 });
      if (Array.isArray(contactList)) {
        setContacts(contactList.map((c) => ({ id: c.id, name: c.name })));
      }
    } catch {
      // Non-critical background fetch failure for contact list
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
            name: l.name || l.title || `Lead #${l.id}`,
          }))
        );
      }
    } catch {
      // Non-critical background fetch failure for lead list
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
    fetchContacts();
    fetchLeads();
  }, [fetchCompanies, fetchContacts, fetchLeads]);

  // Fetch paginated interactions list
  const fetchInteractions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sortParam = sortColumn
        ? sortDirection === 'desc'
          ? `-${sortColumn}`
          : sortColumn
        : undefined;

      const response = await getPaginatedInteractions({
        page,
        page_size: pageSize,
        search: searchValue || undefined,
        sort: sortParam,
        type: typeFilter || undefined,
      });

      setInteractions(response.items || []);
      setTotalItems(response.total ?? (response.items ? response.items.length : 0));
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load interactions.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchValue, typeFilter, sortColumn, sortDirection]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  // Modal control helpers
  const handleOpenAddModal = () => {
    setFormApiError(null);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setFormApiError(null);
  };

  const handleOpenEditModal = (interaction: InteractionRead) => {
    setSelectedInteraction(interaction);
    setFormApiError(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedInteraction(null);
    setFormApiError(null);
  };

  const handleOpenDetailModal = async (interaction: InteractionRead) => {
    setSelectedInteraction(interaction);
    setInteractionDetail(interaction);
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);

    try {
      const detail = await getInteraction(interaction.id);
      setInteractionDetail(detail);
    } catch {
      // Fallback to initial selectedInteraction if detailed fetch fails
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedInteraction(null);
    setInteractionDetail(null);
  };

  const handleOpenDeleteModal = (interaction: InteractionRead) => {
    setSelectedInteraction(interaction);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedInteraction(null);
  };

  // Form submit handlers
  const handleCreateInteraction = async (data: InteractionFormData) => {
    setIsSubmitting(true);
    setFormApiError(null);
    try {
      await createInteraction(data);
      const displaySummary = data.summary || `${data.type} interaction`;
      setSuccessMessage(`Interaction "${displaySummary.trim()}" logged successfully.`);
      handleCloseAddModal();
      fetchInteractions();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setFormApiError(err);
      } else if (err instanceof Error) {
        setFormApiError(err.message);
      } else {
        setFormApiError('Failed to log interaction.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateInteraction = async (data: InteractionFormData) => {
    if (!selectedInteraction) return;
    setIsSubmitting(true);
    setFormApiError(null);
    try {
      await updateInteraction(selectedInteraction.id, data);
      const displaySummary = data.summary || selectedInteraction.summary || 'Interaction';
      setSuccessMessage(`Interaction "${displaySummary.trim()}" updated successfully.`);
      handleCloseEditModal();
      fetchInteractions();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setFormApiError(err);
      } else if (err instanceof Error) {
        setFormApiError(err.message);
      } else {
        setFormApiError('Failed to update interaction.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInteraction = async () => {
    if (!selectedInteraction) return;
    setIsDeleting(true);
    try {
      await deleteInteraction(selectedInteraction.id);
      const displaySummary = selectedInteraction.summary || `Interaction #${selectedInteraction.id}`;
      setSuccessMessage(`Interaction "${displaySummary.trim()}" deleted successfully.`);
      handleCloseDeleteModal();
      fetchInteractions();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setError(`Failed to delete interaction: ${err.message}`);
      } else if (err instanceof Error) {
        setError(`Failed to delete interaction: ${err.message}`);
      } else {
        setError('Failed to delete interaction.');
      }
      handleCloseDeleteModal();
    } finally {
      setIsDeleting(false);
    }
  };

  // Type Filter Control element
  const typeFilterControl = (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
      <label
        htmlFor="type-filter-select"
        style={{
          fontSize: typography.sizes.caption.fontSize,
          fontWeight: 500,
          color: colors.surface.onSurfaceVariant,
        }}
      >
        Filter Type:
      </label>
      <select
        id="type-filter-select"
        value={typeFilter}
        aria-label="Filter interactions by type"
        onChange={(e) => {
          setTypeFilter(e.target.value);
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
        <option value="">All Types</option>
        {DEFAULT_INTERACTION_TYPES.map((t) => (
          <option key={t} value={t}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );

  // Helper to render type badge variant
  const getTypeBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case 'call':
        return 'info';
      case 'email':
        return 'primary';
      case 'meeting':
        return 'success';
      case 'note':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  // DataTable Column Definitions
  const columns: Column<InteractionRead>[] = [
  {
    key: 'type',
    header: 'Type',
    sortable: true,
    sortField: 'type',
    render: (interaction) => {
      const typeStr = interaction.type || 'note';
      const formattedLabel =
        typeStr.charAt(0).toUpperCase() + typeStr.slice(1);

      return (
        <StatusBadge
          label={formattedLabel}
          status={typeStr}
          variant={
            getTypeBadgeVariant(typeStr) as
              | 'info'
              | 'success'
              | 'warning'
              | 'neutral'
          }
        />
      );
    },
  },
    {
      key: 'summary',
      header: 'Summary',
      sortable: true,
      sortField: 'summary',
      render: (interaction) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontWeight: 500, color: colors.surface.onSurface }}>
            {interaction.summary}
          </span>
          {interaction.notes && (
            <span
              style={{
                fontSize: typography.sizes.caption.fontSize,
                color: colors.surface.onSurfaceVariant,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '250px',
              }}
            >
              {interaction.notes}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      sortField: 'date',
      render: (interaction) => {
        const rawDate = interaction.date || interaction.interaction_date || interaction.timestamp;
        return formatDate(rawDate) || '—';
      },
    },
    {
      key: 'company_id',
      header: 'Company',
      render: (interaction) => {
        if (!interaction.company_id) return '—';
        const companyName = companyMap[interaction.company_id];
        return companyName || `Company #${interaction.company_id}`;
      },
    },
    {
      key: 'contact_id',
      header: 'Contact',
      render: (interaction) => {
        if (!interaction.contact_id) return '—';
        const contactName = contactMap[interaction.contact_id];
        return contactName || `Contact #${interaction.contact_id}`;
      },
    },
    {
      key: 'lead_id',
      header: 'Lead',
      render: (interaction) => {
        if (!interaction.lead_id) return '—';
        const leadTitle = leadMap[interaction.lead_id];
        return leadTitle || `Lead #${interaction.lead_id}`;
      },
    },
    {
      key: 'owner',
      header: 'Owner',
      sortable: true,
      sortField: 'owner',
      render: (interaction) => interaction.owner || '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (interaction) => {
        const displaySummary = interaction.summary || `Interaction #${interaction.id}`;
        return (
          <div
            style={{ display: 'flex', gap: spacing.xs, justifyContent: 'flex-end', alignItems: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => handleOpenDetailModal(interaction)}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: rounded.sm,
                border: `1px solid ${colors.borderVariant}`,
                backgroundColor: 'transparent',
                color: colors.surface.onSurface,
                fontSize: '13px',
                cursor: 'pointer',
              }}
              aria-label={`View details for ${displaySummary}`}
            >
              View
            </button>
            <button
              type="button"
              onClick={() => handleOpenEditModal(interaction)}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: rounded.sm,
                border: `1px solid ${colors.borderVariant}`,
                backgroundColor: 'transparent',
                color: colors.surface.onSurface,
                fontSize: '13px',
                cursor: 'pointer',
              }}
              aria-label={`Edit ${displaySummary}`}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleOpenDeleteModal(interaction)}
              style={{
                padding: `${spacing.xs} ${spacing.sm}`,
                borderRadius: rounded.sm,
                border: `1px solid ${colors.semantic.errorBorder}`,
                backgroundColor: 'transparent',
                color: colors.semantic.error,
                fontSize: '13px',
                cursor: 'pointer',
              }}
              aria-label={`Delete ${displaySummary}`}
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
      aria-label="Interactions Management"
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
            Interactions
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
            Interactions
          </h1>
          <p
            style={{
              fontSize: typography.sizes.body.fontSize,
              color: colors.surface.onSurfaceVariant,
              margin: `${spacing.xs} 0 0 0`,
            }}
          >
            Track activity logs, meetings, calls, emails, and notes linked to companies, contacts, and leads.
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
          + Add Interaction
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
        data={interactions}
        totalItems={totalItems}
        loading={loading}
        searchValue={searchValue}
        searchPlaceholder="Search interactions by summary, owner..."
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
        filters={typeFilterControl}
        emptyTitle="No interactions found"
        emptyMessage="Get started by logging your first interaction."
        emptyActionLabel="Add Interaction"
        onEmptyAction={handleOpenAddModal}
        getRowKey={(item) => item.id}
        onRowClick={handleOpenDetailModal}
        ariaLabel="Interactions data table"
      />

      {/* Add Interaction Modal */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-interaction-modal-title"
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
            <InteractionForm
              title="Log New Interaction"
              submitLabel="Log Interaction"
              companies={companies}
              contacts={contacts}
              leads={leads}
              onSubmit={handleCreateInteraction}
              onCancel={handleCloseAddModal}
              isSubmitting={isSubmitting}
              apiError={formApiError}
            />
          </div>
        </div>
      )}

      {/* Edit Interaction Modal */}
      {isEditModalOpen && selectedInteraction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-interaction-modal-title"
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
            <InteractionForm
              title={`Edit Interaction #${selectedInteraction.id}`}
              submitLabel="Save Changes"
              initialValues={selectedInteraction}
              companies={companies}
              contacts={contacts}
              leads={leads}
              onSubmit={handleUpdateInteraction}
              onCancel={handleCloseEditModal}
              isSubmitting={isSubmitting}
              apiError={formApiError}
            />
          </div>
        </div>
      )}

      {/* Interaction Detail Modal */}
      {isDetailModalOpen && selectedInteraction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-interaction-modal-title"
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
                  id="detail-interaction-modal-title"
                  style={{
                    fontSize: typography.sizes['headline-sm'].fontSize,
                    fontWeight: typography.sizes['headline-sm'].fontWeight,
                    color: colors.surface.onSurface,
                    margin: 0,
                  }}
                >
                  {interactionDetail?.summary || selectedInteraction.summary}
                </h2>
                <div style={{ marginTop: spacing.xs }}>
                  <StatusBadge
                    label={(interactionDetail?.type || selectedInteraction.type || 'note').toUpperCase()}
                    status={interactionDetail?.type || selectedInteraction.type}
                    variant={
                      getTypeBadgeVariant(
                        interactionDetail?.type || selectedInteraction.type || 'note'
                      ) as 'info' | 'primary' | 'success' | 'warning' | 'neutral'
                    }
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDetailModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: colors.surface.onSurfaceVariant,
                  cursor: 'pointer',
                  padding: spacing.xs,
                }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            {isDetailLoading ? (
              <LoadingState message="Loading interaction details..." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: spacing.md,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: typography.sizes.caption.fontSize,
                        color: colors.surface.onSurfaceVariant,
                        display: 'block',
                      }}
                    >
                      Date
                    </span>
                    <span
                      style={{
                        fontSize: typography.sizes.body.fontSize,
                        fontWeight: 500,
                        color: colors.surface.onSurface,
                      }}
                    >
                      {formatDate(
                        (interactionDetail || selectedInteraction).date ||
                          (interactionDetail || selectedInteraction).interaction_date ||
                          (interactionDetail || selectedInteraction).timestamp
                      ) || '—'}
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
                      {(interactionDetail || selectedInteraction).owner || '—'}
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
                      {(interactionDetail || selectedInteraction).company_id
                        ? companyMap[(interactionDetail || selectedInteraction).company_id!] ||
                          `Company #${(interactionDetail || selectedInteraction).company_id}`
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
                      Linked Contact
                    </span>
                    <span
                      style={{
                        fontSize: typography.sizes.body.fontSize,
                        fontWeight: 500,
                        color: colors.surface.onSurface,
                      }}
                    >
                      {(interactionDetail || selectedInteraction).contact_id
                        ? contactMap[(interactionDetail || selectedInteraction).contact_id!] ||
                          `Contact #${(interactionDetail || selectedInteraction).contact_id}`
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
                      {(interactionDetail || selectedInteraction).lead_id
                        ? leadMap[(interactionDetail || selectedInteraction).lead_id!] ||
                          `Lead #${(interactionDetail || selectedInteraction).lead_id}`
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
                      {formatDate((interactionDetail || selectedInteraction).created_at) || '—'}
                    </span>
                  </div>
                </div>

                {(interactionDetail || selectedInteraction).notes && (
                  <div
                    style={{
                      borderTop: `1px solid ${colors.borderVariant}`,
                      paddingTop: spacing.sm,
                    }}
                  >
                    <span
                      style={{
                        fontSize: typography.sizes.caption.fontSize,
                        color: colors.surface.onSurfaceVariant,
                        display: 'block',
                        marginBottom: spacing.xs,
                      }}
                    >
                      Additional Notes
                    </span>
                    <p
                      style={{
                        fontSize: typography.sizes.body.fontSize,
                        color: colors.surface.onSurface,
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {(interactionDetail || selectedInteraction).notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions Footer */}
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
                  handleCloseDetailModal();
                  handleOpenEditModal(selectedInteraction);
                }}
                style={{
                  padding: `${spacing.xs} ${spacing.md}`,
                  borderRadius: rounded.md,
                  border: `1px solid ${colors.borderVariant}`,
                  backgroundColor: colors.surface.containerLowest,
                  color: colors.surface.onSurface,
                  fontSize: typography.sizes.body.fontSize,
                  cursor: 'pointer',
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCloseDetailModal();
                  handleOpenDeleteModal(selectedInteraction);
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
                Delete
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
        title="Delete Interaction"
        message={`Are you sure you want to delete interaction "${selectedInteraction?.summary || ''}"? This action cannot be undone.`}
        confirmLabel="Delete Interaction"
        cancelLabel="Cancel"
        onConfirm={handleDeleteInteraction}
        onCancel={handleCloseDeleteModal}
        isConfirming={isDeleting}
        variant="danger"
      />
    </section>
  );
}
