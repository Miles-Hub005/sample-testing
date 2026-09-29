'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { colors, radii, shadows, spacing, typography } from '../../lib/tokens';
import {
  contactsApi,
  companiesApi,
  Contact,
  ContactCreate,
  ContactUpdate,
  ContactQueryParams,
  Company,
} from '../../services/crm';
import { DataTable, DataTableColumn } from '../../components/crm/DataTable';
import { ContactForm, ContactFormData, CompanyOption } from '../../components/crm/ContactForm';
import { ConfirmationDialog } from '../../components/shared/ConfirmationDialog';
import { Alert } from '../../components/shared/Alerts';
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

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
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

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Deletion state
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
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
      // Ignore company fetch errors, contact form will present empty company dropdown
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setPageError(null);
    try {
      const params: ContactQueryParams = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        order: sortOrder,
      };
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await contactsApi.list(params);
      if (response.error) {
        setPageError(typeof response.error === 'string' ? response.error : 'Failed to load contacts');
        setContacts([]);
        setTotalItems(0);
      } else if (response.data) {
        if ('items' in response.data && Array.isArray(response.data.items)) {
          setContacts(response.data.items);
          setTotalItems(response.data.total ?? response.data.items.length);
        } else if (Array.isArray(response.data)) {
          setContacts(response.data);
          setTotalItems(response.data.length);
        }
      }
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'An unexpected error occurred while loading contacts.');
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sortBy, sortOrder, searchQuery]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleViewContact = async (contact: Contact) => {
    setIsDetailLoading(true);
    setViewingContact({ ...contact });
    try {
      const res = await contactsApi.get(contact.id);
      if (res.data) {
        setViewingContact(res.data as Contact);
      }
    } catch (err) {
      // Retain basic contact data if detail fetch fails
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCreateSubmit = async (formData: ContactFormData) => {
    setIsSubmitting(true);
    setFormServerError(null);
    setFormFieldErrors({});
    try {
      const payload: ContactCreate = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        role: formData.role || null,
        company_id: formData.company_id ?? null,
        notes: formData.notes || null,
        owner: formData.owner || '',
      };
      const res = await contactsApi.create(payload);
      if (res.error) {
        const errData = res.error as any;
        if (errData?.fields && Array.isArray(errData.fields)) {
          const fieldErrMap: Record<string, string> = {};
          errData.fields.forEach((f: { field: string; message: string }) => {
            fieldErrMap[f.field] = f.message;
          });
          setFormFieldErrors(fieldErrMap);
        }
        setFormServerError(errData?.message || 'Failed to create contact.');
      } else if (res.data) {
        setIsAddModalOpen(false);
        setSuccessMessage(`Contact "${res.data.name}" created successfully.`);
        fetchContacts();
      }
    } catch (err) {
      setFormServerError(err instanceof Error ? err.message : 'Failed to create contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (formData: ContactFormData) => {
    if (!editingContact) return;
    setIsSubmitting(true);
    setFormServerError(null);
    setFormFieldErrors({});
    try {
      const payload: ContactUpdate = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        role: formData.role || null,
        company_id: formData.company_id ?? null,
        notes: formData.notes || null,
        owner: formData.owner || null,
      };
      const res = await contactsApi.update(editingContact.id, payload);
      if (res.error) {
        const errData = res.error as any;
        if (errData?.fields && Array.isArray(errData.fields)) {
          const fieldErrMap: Record<string, string> = {};
          errData.fields.forEach((f: { field: string; message: string }) => {
            fieldErrMap[f.field] = f.message;
          });
          setFormFieldErrors(fieldErrMap);
        }
        setFormServerError(errData?.message || 'Failed to update contact.');
      } else if (res.data) {
        setEditingContact(null);
        setSuccessMessage(`Contact "${res.data.name}" updated successfully.`);
        fetchContacts();
        if (viewingContact && viewingContact.id === res.data.id) {
          setViewingContact(res.data as Contact);
        }
      }
    } catch (err) {
      setFormServerError(err instanceof Error ? err.message : 'Failed to update contact.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingContact) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await contactsApi.delete(deletingContact.id);
      if (res.error) {
        const errData = res.error as any;
        setDeleteError(errData?.message || 'Failed to delete contact.');
      } else {
        const deletedName = deletingContact.name;
        setDeletingContact(null);
        setSuccessMessage(`Contact "${deletedName}" deleted successfully.`);
        fetchContacts();
        if (viewingContact && viewingContact.id === deletingContact.id) {
          setViewingContact(null);
        }
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'An error occurred during deletion.');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: DataTableColumn<Contact>[] = [
    {
      key: 'name',
      header: 'Contact Name',
      sortable: true,
      sortField: 'name',
      accessor: (contact) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleViewContact(contact);
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
          data-testid={`contact-name-link-${contact.id}`}
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
      accessor: (contact) => contact.email || '—',
    },
    {
      key: 'phone',
      header: 'Phone',
      accessor: (contact) => contact.phone || '—',
    },
    {
      key: 'role',
      header: 'Role',
      accessor: (contact) => contact.role || '—',
    },
    {
      key: 'company',
      header: 'Company',
      accessor: (contact) => {
        if (contact.company_id && companyMap[contact.company_id]) {
          return companyMap[contact.company_id];
        }
        return 'Unassigned';
      },
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      sortField: 'created_at',
      accessor: (contact) => formatDate(contact.created_at, { fallback: '—' }),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      accessor: (contact) => (
        <div
          style={{ display: 'flex', gap: spacing[2], justifyContent: 'flex-end' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleViewContact(contact)}
            data-testid={`view-contact-${contact.id}`}
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
              setEditingContact(contact);
              setFormServerError(null);
              setFormFieldErrors({});
            }}
            data-testid={`edit-contact-${contact.id}`}
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
              setDeletingContact(contact);
              setDeleteError(null);
            }}
            data-testid={`delete-contact-${contact.id}`}
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
      data-testid="contacts-page"
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
            Contacts
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
            Contacts
          </h1>
          <p
            style={{
              fontFamily: typography.styles.bodyMd.fontFamily,
              fontSize: typography.styles.bodyMd.fontSize,
              color: colors.surface.onSurfaceVariant,
              margin: 0,
            }}
          >
            Manage contacts and link them to company records.
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setFormServerError(null);
            setFormFieldErrors({});
          }}
          data-testid="add-contact-button"
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
          + Add Contact
        </button>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <Alert
          variant="success"
          title="Success"
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
          data-testid="contacts-success-alert"
        />
      )}

      {/* Global Page Error Banner */}
      {pageError && (
        <Alert
          variant="error"
          title="Error Loading Contacts"
          message={pageError}
          onClose={() => setPageError(null)}
          data-testid="contacts-error-alert"
        />
      )}

      {/* Data Table Component */}
      <DataTable
        data={contacts}
        columns={columns}
        keyExtractor={(item) => item.id}
        totalItems={totalItems}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search contacts by name or email..."
        isLoading={isLoading}
        emptyTitle="No contacts found"
        emptyDescription="Get started by adding your first contact record."
        onAdd={() => {
          setIsAddModalOpen(true);
          setFormServerError(null);
          setFormFieldErrors({});
        }}
        addLabel="Add Contact"
        onRowClick={(contact) => handleViewContact(contact)}
        data-testid="contacts-data-table"
      />

      {/* Add Contact Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Contact"
        data-testid="add-contact-modal"
      >
        <ContactForm
          companies={companyOptions}
          onSubmit={handleCreateSubmit}
          onCancel={() => setIsAddModalOpen(false)}
          isLoading={isSubmitting}
          submitLabel="Create Contact"
          serverError={formServerError}
          serverFieldErrors={formFieldErrors}
        />
      </Modal>

      {/* Edit Contact Modal */}
      <Modal
        isOpen={!!editingContact}
        onClose={() => setEditingContact(null)}
        title={`Edit ${editingContact?.name || 'Contact'}`}
        data-testid="edit-contact-modal"
      >
        {editingContact && (
          <ContactForm
            initialValues={editingContact}
            companies={companyOptions}
            onSubmit={handleUpdateSubmit}
            onCancel={() => setEditingContact(null)}
            isLoading={isSubmitting}
            submitLabel="Save Changes"
            serverError={formServerError}
            serverFieldErrors={formFieldErrors}
          />
        )}
      </Modal>

      {/* View Contact Detail Modal */}
      <Modal
        isOpen={!!viewingContact}
        onClose={() => setViewingContact(null)}
        title={viewingContact?.name || 'Contact Details'}
        data-testid="view-contact-modal"
      >
        {viewingContact && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
            {isDetailLoading && (
              <p style={{ color: colors.surface.onSurfaceVariant, fontSize: typography.styles.caption.fontSize }}>
                Refreshing details...
              </p>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: spacing[4],
                backgroundColor: colors.surface.containerLow,
                padding: spacing[4],
                borderRadius: radii.md,
                border: `1px solid ${colors.surface.outlineVariant}`,
              }}
            >
              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>Full Name</span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, fontWeight: 600, color: colors.surface.onSurface }}>
                  {viewingContact.name}
                </p>
              </div>

              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>Email</span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, color: colors.surface.onSurface }}>
                  <a
                    href={`mailto:${viewingContact.email}`}
                    style={{ color: colors.accent.primary, textDecoration: 'none' }}
                  >
                    {viewingContact.email}
                  </a>
                </p>
              </div>

              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>Phone</span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, color: colors.surface.onSurface }}>
                  {viewingContact.phone || '—'}
                </p>
              </div>

              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>Role / Job Title</span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, color: colors.surface.onSurface }}>
                  {viewingContact.role || '—'}
                </p>
              </div>

              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>Company</span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, color: colors.surface.onSurface }}>
                  {viewingContact.company_id && companyMap[viewingContact.company_id]
                    ? companyMap[viewingContact.company_id]
                    : 'Unassigned'}
                </p>
              </div>

              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>Owner</span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, color: colors.surface.onSurface }}>
                  {viewingContact.owner || '—'}
                </p>
              </div>

              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>Created Date</span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, color: colors.surface.onSurface }}>
                  {formatDate(viewingContact.created_at, { fallback: '—' })}
                </p>
              </div>

              <div>
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>Last Updated</span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, color: colors.surface.onSurface }}>
                  {formatDate(viewingContact.updated_at, { fallback: '—' })}
                </p>
              </div>
            </div>

            {/* Notes Section */}
            {viewingContact.notes && (
              <div
                style={{
                  backgroundColor: colors.surface.containerLow,
                  padding: spacing[4],
                  borderRadius: radii.md,
                  border: `1px solid ${colors.surface.outlineVariant}`,
                }}
              >
                <span style={{ ...typography.styles.labelCaps, color: colors.surface.onSurfaceVariant }}>Notes</span>
                <p style={{ margin: `${spacing[1]} 0 0 0`, color: colors.surface.onSurface, whiteSpace: 'pre-wrap' }}>
                  {viewingContact.notes}
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: spacing[3], justifyContent: 'flex-end', marginTop: spacing[2] }}>
              <button
                onClick={() => {
                  setEditingContact(viewingContact);
                  setViewingContact(null);
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
                Edit Contact
              </button>
              <button
                onClick={() => {
                  setDeletingContact(viewingContact);
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
                Delete Contact
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deletingContact}
        title="Delete Contact"
        message={
          <div>
            {deleteError && (
              <div style={{ marginBottom: spacing[3] }}>
                <Alert variant="error" message={deleteError} />
              </div>
            )}
            <p style={{ margin: 0 }}>
              Are you sure you want to delete contact <strong>{deletingContact?.name}</strong>?
            </p>
          </div>
        }
        confirmLabel="Delete Contact"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeletingContact(null);
          setDeleteError(null);
        }}
        isDanger={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
