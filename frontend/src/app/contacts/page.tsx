'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { colors, rounded, shadows, spacing, typography } from '@/lib/tokens';
import { formatDate } from '@/lib/format';
import { DataTable, Column } from '@/components/crm/DataTable';
import { ContactForm, ContactFormData, CompanyOption } from '@/components/crm/ContactForm';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { ErrorAlert, SuccessAlert } from '@/components/shared/Alerts';
import { LoadingState } from '@/components/shared/States';
import {
  getPaginatedContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  listCompanies,
  ContactRead,
  CompanyRead,
  CRMApiError,
} from '@/services/crm';

/**
 * ContactsPage Component
 * Route segment for `/contacts`
 * Displays a DataTable of contacts with search, sort, and pagination.
 * Offers Add Contact, Detail View, Edit Contact, and Delete Contact modals.
 * Satisfies FR-2 (Contacts CRUD with company link), FR-10 (Breadcrumbs/Navigation), and FR-14 (Empty States).
 */
export default function ContactsPage() {
  // Data state
  const [contacts, setContacts] = useState<ContactRead[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [searchValue, setSearchValue] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('asc');

  // Company dropdown options and name lookup map
  const [companies, setCompanies] = useState<CompanyOption[]>([]);

  // Loading & error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal & Selection states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  const [selectedContact, setSelectedContact] = useState<ContactRead | null>(null);
  const [contactDetail, setContactDetail] = useState<ContactRead | null>(null);

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

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Fetch paginated contacts list
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sortParam = sortColumn
        ? sortDirection === 'desc'
          ? `-${sortColumn}`
          : sortColumn
        : undefined;

      const response = await getPaginatedContacts({
        page,
        page_size: pageSize,
        search: searchValue || undefined,
        sort: sortParam,
      });

      setContacts(response.items || []);
      setTotalItems(response.total ?? (response.items ? response.items.length : 0));
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load contacts.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchValue, sortColumn, sortDirection]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Modal control helpers
  const handleOpenAddModal = () => {
    setFormApiError(null);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setFormApiError(null);
  };

  const handleOpenEditModal = (contact: ContactRead) => {
    setSelectedContact(contact);
    setFormApiError(null);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedContact(null);
    setFormApiError(null);
  };

  const handleOpenDetailModal = async (contact: ContactRead) => {
    setSelectedContact(contact);
    setContactDetail(contact);
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);

    try {
      const detail = await getContact(contact.id);
      setContactDetail(detail);
    } catch {
      // Fallback to initial selectedContact if detailed fetch fails
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedContact(null);
    setContactDetail(null);
  };

  const handleOpenDeleteModal = (contact: ContactRead) => {
    setSelectedContact(contact);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedContact(null);
  };

  // Form submit handlers
  const handleCreateContact = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setFormApiError(null);
    try {
      await createContact(data);
      setSuccessMessage(`Contact "${data.name.trim()}" created successfully.`);
      handleCloseAddModal();
      fetchContacts();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setFormApiError(err);
      } else if (err instanceof Error) {
        setFormApiError(err.message);
      } else {
        setFormApiError('Failed to create contact.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateContact = async (data: ContactFormData) => {
    if (!selectedContact) return;
    setIsSubmitting(true);
    setFormApiError(null);
    try {
      await updateContact(selectedContact.id, data);
      setSuccessMessage(`Contact "${data.name.trim()}" updated successfully.`);
      handleCloseEditModal();
      fetchContacts();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setFormApiError(err);
      } else if (err instanceof Error) {
        setFormApiError(err.message);
      } else {
        setFormApiError('Failed to update contact.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!selectedContact) return;
    setIsDeleting(true);
    try {
      await deleteContact(selectedContact.id);
      setSuccessMessage(`Contact "${selectedContact.name}" deleted successfully.`);
      handleCloseDeleteModal();
      fetchContacts();
    } catch (err: unknown) {
      if (err instanceof CRMApiError) {
        setError(`Failed to delete contact: ${err.message}`);
      } else if (err instanceof Error) {
        setError(`Failed to delete contact: ${err.message}`);
      } else {
        setError('Failed to delete contact.');
      }
      handleCloseDeleteModal();
    } finally {
      setIsDeleting(false);
    }
  };

  // Table columns definition
  const columns: Column<ContactRead>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      sortField: 'name',
      render: (contact) => (
        <button
          onClick={() => handleOpenDetailModal(contact)}
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
          aria-label={`View details for ${contact.name}`}
        >
          {contact.name}
        </button>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      sortField: 'email',
      render: (contact) => (
        <a
          href={`mailto:${contact.email}`}
          style={{ color: colors.accent.DEFAULT, textDecoration: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          {contact.email}
        </a>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (contact) => contact.phone || '—',
    },
    {
      key: 'company_id',
      header: 'Company',
      render: (contact) => {
        if (!contact.company_id) return '—';
        const companyName = companyMap[contact.company_id];
        return companyName || `Company #${contact.company_id}`;
      },
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      sortField: 'role',
      render: (contact) => contact.role || '—',
    },
    {
      key: 'owner',
      header: 'Owner',
      sortable: true,
      sortField: 'owner',
      render: (contact) => contact.owner || '—',
    },
    {
      key: 'created_at',
      header: 'Created Date',
      sortable: true,
      sortField: 'created_at',
      render: (contact) => formatDate(contact.created_at) || '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (contact) => (
        <div
          style={{ display: 'flex', gap: spacing.xs, justifyContent: 'flex-end' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleOpenDetailModal(contact)}
            style={{
              padding: `${spacing.xs} ${spacing.sm}`,
              backgroundColor: colors.surface.surfaceContainerHigh,
              border: `1px solid ${colors.borderVariant}`,
              borderRadius: rounded.sm,
              fontSize: '13px',
              cursor: 'pointer',
              color: colors.surface.onSurface,
            }}
            aria-label={`View ${contact.name}`}
          >
            View
          </button>
          <button
            onClick={() => handleOpenEditModal(contact)}
            style={{
              padding: `${spacing.xs} ${spacing.sm}`,
              backgroundColor: colors.surface.surfaceContainerHigh,
              border: `1px solid ${colors.borderVariant}`,
              borderRadius: rounded.sm,
              fontSize: '13px',
              cursor: 'pointer',
              color: colors.surface.onSurface,
            }}
            aria-label={`Edit ${contact.name}`}
          >
            Edit
          </button>
          <button
            onClick={() => handleOpenDeleteModal(contact)}
            style={{
              padding: `${spacing.xs} ${spacing.sm}`,
              backgroundColor: colors.status.errorContainer,
              color: colors.status.onErrorContainer,
              border: 'none',
              borderRadius: rounded.sm,
              fontSize: '13px',
              cursor: 'pointer',
            }}
            aria-label={`Delete ${contact.name}`}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <section
      aria-label="Contacts Management"
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
            Contacts
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
            Contacts
          </h1>
          <p
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: typography.sizes['body-md'].fontSize,
              color: colors.surface.onSurfaceVariant,
              margin: `${spacing.xs} 0 0 0`,
            }}
          >
            Manage individual contacts, roles, communication details, and company associations.
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
          aria-label="Add new contact"
        >
          <span>+</span> Add Contact
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

      {/* Main Contacts DataTable (FR-2, FR-14) */}
      <DataTable<ContactRead>
        columns={columns}
        data={contacts}
        totalItems={totalItems}
        loading={loading}
        error={error}
        searchValue={searchValue}
        searchPlaceholder="Search contacts by name, email, or role..."
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
        emptyTitle="No contacts found"
        emptyMessage="Get started by adding your first contact to build your network."
        emptyActionLabel="Add Contact"
        onEmptyAction={handleOpenAddModal}
        getRowKey={(item) => item.id}
        onRowClick={(item) => handleOpenDetailModal(item)}
        ariaLabel="Contacts Table"
      />

      {/* Add Contact Modal */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-contact-modal-title"
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
            <ContactForm
              companies={companies}
              onSubmit={handleCreateContact}
              onCancel={handleCloseAddModal}
              isSubmitting={isSubmitting}
              apiError={formApiError}
              submitLabel="Create Contact"
              title="Add New Contact"
            />
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {isEditModalOpen && selectedContact && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-contact-modal-title"
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
            <ContactForm
              initialValues={selectedContact}
              companies={companies}
              onSubmit={handleUpdateContact}
              onCancel={handleCloseEditModal}
              isSubmitting={isSubmitting}
              apiError={formApiError}
              submitLabel="Save Changes"
              title="Edit Contact"
            />
          </div>
        </div>
      )}

      {/* Contact Detail Modal */}
      {isDetailModalOpen && selectedContact && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="detail-contact-modal-title"
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
                id="detail-contact-modal-title"
                style={{
                  margin: 0,
                  fontFamily: typography.fontFamily.serif,
                  fontSize: typography.sizes['headline-sm'].fontSize,
                  color: colors.surface.onSurface,
                }}
              >
                {(contactDetail || selectedContact).name}
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

            {isDetailLoading ? (
              <LoadingState message="Loading contact details..." />
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
                      Email Address
                    </span>
                    <a
                      href={`mailto:${(contactDetail || selectedContact).email}`}
                      style={{ color: colors.accent.DEFAULT, textDecoration: 'none', fontWeight: 500 }}
                    >
                      {(contactDetail || selectedContact).email}
                    </a>
                  </div>

                  <div>
                    <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                      Phone
                    </span>
                    <strong>{(contactDetail || selectedContact).phone || '—'}</strong>
                  </div>

                  <div>
                    <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                      Role / Position
                    </span>
                    <strong>{(contactDetail || selectedContact).role || '—'}</strong>
                  </div>

                  <div>
                    <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                      Company
                    </span>
                    <strong>
                      {(contactDetail || selectedContact).company_id
                        ? companyMap[(contactDetail || selectedContact).company_id!] ||
                          `Company #${(contactDetail || selectedContact).company_id}`
                        : '—'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                      Owner
                    </span>
                    <strong>{(contactDetail || selectedContact).owner || '—'}</strong>
                  </div>

                  <div>
                    <span style={{ color: colors.surface.onSurfaceVariant, display: 'block', fontSize: '13px' }}>
                      Created At
                    </span>
                    <strong>{formatDate((contactDetail || selectedContact).created_at) || '—'}</strong>
                  </div>
                </div>

                {(contactDetail || selectedContact).notes && (
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
                      {(contactDetail || selectedContact).notes}
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
                  const contactToEdit = selectedContact;
                  handleCloseDetailModal();
                  handleOpenEditModal(contactToEdit);
                }}
                style={{
                  padding: `${spacing.sm} ${spacing.lg}`,
                  backgroundColor: colors.surface.surfaceContainerHigh,
                  color: colors.surface.onSurface,
                  border: `1px solid ${colors.borderVariant}`,
                  borderRadius: rounded.md,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Edit Contact
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
        title="Delete Contact"
        message={
          selectedContact
            ? `Are you sure you want to delete "${selectedContact.name}"? This action cannot be undone.`
            : 'Are you sure you want to delete this contact?'
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDeleteContact}
        onCancel={handleCloseDeleteModal}
        isLoading={isDeleting}
      />
    </section>
  );
}
