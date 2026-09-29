import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContactsPage from '../../src/app/contacts/page';
import * as crmService from '../../src/services/crm';

vi.mock('../../src/services/crm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/crm')>();
  return {
    ...actual,
    contactsApi: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    companiesApi: {
      list: vi.fn(),
    },
  };
});

describe('ContactsPage Component', () => {
  const mockContacts = [
    {
      id: 1,
      name: 'Alice Johnson',
      email: 'alice@acme.com',
      phone: '555-0100',
      role: 'Sales Manager',
      company_id: 10,
      notes: 'Key decision maker',
      owner: 'Bob',
      created_at: '2026-01-15T10:00:00Z',
      updated_at: '2026-01-15T10:00:00Z',
    },
    {
      id: 2,
      name: 'Charlie Brown',
      email: 'charlie@globex.com',
      phone: '555-0200',
      role: 'Engineer',
      company_id: null,
      notes: 'Unassigned contact',
      owner: 'Dave',
      created_at: '2026-02-01T10:00:00Z',
      updated_at: '2026-02-01T10:00:00Z',
    },
  ];

  const mockCompanies = [
    {
      id: 10,
      name: 'Acme Corp',
      industry: 'Manufacturing',
      website: 'https://acme.com',
      notes: '',
      owner: '',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (crmService.contactsApi.list as any).mockResolvedValue({
      data: {
        items: mockContacts,
        total: 2,
        page: 1,
        page_size: 20,
        pages: 1,
      },
      error: null,
    });
    (crmService.companiesApi.list as any).mockResolvedValue({
      data: {
        items: mockCompanies,
        total: 1,
        page: 1,
        page_size: 100,
        pages: 1,
      },
      error: null,
    });
  });

  it('renders page header, breadcrumbs, and contacts data table', async () => {
    render(<ContactsPage />);

    expect(screen.getByTestId('contacts-page')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Contacts' })).toBeDefined();
    expect(screen.getByTestId('add-contact-button')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeDefined();
      expect(screen.getByText('Charlie Brown')).toBeDefined();
      expect(screen.getByText('Acme Corp')).toBeDefined();
      expect(screen.getByText('Unassigned')).toBeDefined();
    });
  });

  it('opens Add Contact modal when Add Contact button is clicked', async () => {
    render(<ContactsPage />);

    const addButton = screen.getByTestId('add-contact-button');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('add-contact-modal')).toBeDefined();
      expect(screen.getByTestId('contact-form')).toBeDefined();
    });
  });

  it('submits new contact and re-fetches list on successful creation', async () => {
    (crmService.contactsApi.create as any).mockResolvedValue({
      data: {
        id: 3,
        name: 'Eva Green',
        email: 'eva@example.com',
        phone: '555-0300',
        role: 'Director',
        company_id: null,
        notes: '',
        owner: '',
        created_at: '2026-03-01T10:00:00Z',
        updated_at: '2026-03-01T10:00:00Z',
      },
      error: null,
    });

    render(<ContactsPage />);

    fireEvent.click(screen.getByTestId('add-contact-button'));

    await waitFor(() => {
      expect(screen.getByTestId('contact-name-input')).toBeDefined();
    });

    fireEvent.change(screen.getByTestId('contact-name-input'), {
      target: { value: 'Eva Green' },
    });
    fireEvent.change(screen.getByTestId('contact-email-input'), {
      target: { value: 'eva@example.com' },
    });

    fireEvent.click(screen.getByTestId('contact-submit-button'));

    await waitFor(() => {
      expect(crmService.contactsApi.create).toHaveBeenCalledWith({
        name: 'Eva Green',
        email: 'eva@example.com',
        phone: null,
        role: null,
        company_id: null,
        notes: null,
        owner: '',
      });
      expect(screen.getByTestId('contacts-success-alert')).toBeDefined();
    });
  });

  it('opens view detail modal when View button or contact name link is clicked', async () => {
    (crmService.contactsApi.get as any).mockResolvedValue({
      data: mockContacts[0],
      error: null,
    });

    render(<ContactsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('view-contact-1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('view-contact-1'));

    await waitFor(() => {
      expect(screen.getByTestId('view-contact-modal')).toBeDefined();
      expect(screen.getByText('Key decision maker')).toBeDefined();
    });
  });

  it('opens edit modal and submits update successfully', async () => {
    (crmService.contactsApi.update as any).mockResolvedValue({
      data: {
        ...mockContacts[0],
        name: 'Alice Johnson-Smith',
      },
      error: null,
    });

    render(<ContactsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('edit-contact-1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('edit-contact-1'));

    await waitFor(() => {
      expect(screen.getByTestId('edit-contact-modal')).toBeDefined();
    });

    fireEvent.change(screen.getByTestId('contact-name-input'), {
      target: { value: 'Alice Johnson-Smith' },
    });

    fireEvent.click(screen.getByTestId('contact-submit-button'));

    await waitFor(() => {
      expect(crmService.contactsApi.update).toHaveBeenCalledWith(1, {
        name: 'Alice Johnson-Smith',
        email: 'alice@acme.com',
        phone: '555-0100',
        role: 'Sales Manager',
        company_id: 10,
        notes: 'Key decision maker',
        owner: 'Bob',
      });
      expect(screen.getByTestId('contacts-success-alert')).toBeDefined();
    });
  });

  it('opens delete confirmation dialog and deletes contact', async () => {
    (crmService.contactsApi.delete as any).mockResolvedValue({
      data: null,
      error: null,
    });

    render(<ContactsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-contact-1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('delete-contact-1'));

    await waitFor(() => {
      expect(screen.getByTestId('delete-contact-dialog')).toBeDefined();
    });

    const confirmButton = screen.getByTestId('confirmation-confirm-button');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(crmService.contactsApi.delete).toHaveBeenCalledWith(1);
      expect(screen.getByTestId('contacts-success-alert')).toBeDefined();
    });
  });
});
