import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CompaniesPage from '../../src/app/companies/page';
import * as crmService from '../../src/services/crm';

vi.mock('../../src/services/crm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/crm')>();
  return {
    ...actual,
    companiesApi: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('CompaniesPage Component', () => {
  const mockCompanies = [
    {
      id: 1,
      name: 'Acme Corp',
      industry: 'Manufacturing',
      website: 'https://acme.com',
      notes: 'Key client',
      email: 'contact@acme.com',
      owner: 'Alice',
      created_at: '2026-01-15T10:00:00Z',
      updated_at: '2026-01-15T10:00:00Z',
    },
    {
      id: 2,
      name: 'Globex',
      industry: 'Technology',
      website: 'https://globex.com',
      notes: 'SaaS account',
      email: 'info@globex.com',
      owner: 'Bob',
      created_at: '2026-02-01T10:00:00Z',
      updated_at: '2026-02-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (crmService.companiesApi.list as any).mockResolvedValue({
      data: {
        items: mockCompanies,
        total: 2,
        page: 1,
        page_size: 20,
        pages: 1,
      },
      error: null,
    });
  });

  it('renders page header, breadcrumbs, and company data table', async () => {
    render(<CompaniesPage />);

    expect(screen.getByTestId('companies-page')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Companies' })).toBeDefined();
    expect(screen.getByTestId('add-company-button')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeDefined();
      expect(screen.getByText('Globex')).toBeDefined();
    });
  });

  it('opens Add Company modal when Add Company button is clicked', async () => {
    render(<CompaniesPage />);

    const addButton = screen.getByTestId('add-company-button');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('add-company-modal')).toBeDefined();
      expect(screen.getByTestId('company-form')).toBeDefined();
    });
  });

  it('submits new company and re-fetches list on successful creation', async () => {
    (crmService.companiesApi.create as any).mockResolvedValue({
      data: {
        id: 3,
        name: 'Initech',
        industry: 'Software',
        website: 'https://initech.com',
        notes: '',
        email: 'info@initech.com',
        owner: 'Charlie',
        created_at: '2026-03-01T10:00:00Z',
        updated_at: '2026-03-01T10:00:00Z',
      },
      error: null,
    });

    render(<CompaniesPage />);

    fireEvent.click(screen.getByTestId('add-company-button'));

    await waitFor(() => {
      expect(screen.getByTestId('company-name-input')).toBeDefined();
    });

    fireEvent.change(screen.getByTestId('company-name-input'), {
      target: { value: 'Initech' },
    });

    fireEvent.click(screen.getByTestId('company-submit-button'));

    await waitFor(() => {
      expect(crmService.companiesApi.create).toHaveBeenCalledWith({
        name: 'Initech',
        industry: null,
        website: null,
        notes: null,
        email: null,
        owner: '',
      });
      expect(screen.getByTestId('companies-success-alert')).toBeDefined();
    });
  });

  it('opens view detail modal when View button or company name link is clicked', async () => {
    (crmService.companiesApi.get as any).mockResolvedValue({
      data: {
        ...mockCompanies[0],
        contacts: [{ id: 101, name: 'John Doe', email: 'john@acme.com' }],
        leads: [],
        tasks: [],
        interactions: [],
      },
      error: null,
    });

    render(<CompaniesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('view-company-1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('view-company-1'));

    await waitFor(() => {
      expect(screen.getByTestId('view-company-modal')).toBeDefined();
      expect(screen.getByTestId('company-detail-tab-contacts')).toBeDefined();
    });

    // Switch to contacts tab
    fireEvent.click(screen.getByTestId('company-detail-tab-contacts'));
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
    });
  });

  it('opens confirmation dialog and handles company deletion', async () => {
    (crmService.companiesApi.delete as any).mockResolvedValue({
      data: null,
      error: null,
    });

    render(<CompaniesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-company-1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('delete-company-1'));

    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to delete company/i)).toBeDefined();
    });

    const confirmDeleteBtn = screen.getByRole('button', { name: 'Delete Company' });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(crmService.companiesApi.delete).toHaveBeenCalledWith(1);
      expect(screen.getByTestId('companies-success-alert')).toBeDefined();
    });
  });
});
