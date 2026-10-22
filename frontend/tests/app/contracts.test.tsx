import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ContractsPage from '../../src/app/contracts/page';
import { apiClient } from '../../src/services/apiClient';
import * as contractApi from '../../src/services/contract_api';

// Mock apiClient and contract_api
vi.mock('../../src/services/apiClient', async () => {
  const actual = await vi.importActual('../../src/services/apiClient');
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      getMe: vi.fn(),
    },
  };
});

vi.mock('../../src/services/contract_api', async () => {
  const actual = await vi.importActual('../../src/services/contract_api');
  return {
    ...actual,
    listContracts: vi.fn(),
    getContractDetail: vi.fn(),
    createContract: vi.fn(),
  };
});

describe('ContractsPage Repository Component', () => {
  const mockUser = {
    user_id: 'usr_contract_123',
    email: 'contract.manager@tenant.org',
    tenant_id: 'tnt_contract_777',
    roles: ['ClientViewer', 'ContractAdmin'],
  };

  const mockContractsList = {
    items: [
      {
        id: 'c-101',
        title: 'Enterprise Master Services Agreement',
        category: 'Contract',
        status: 'ACTIVE',
        counterparty: 'Acme Global Corp',
        start_on: '2026-01-01',
        expires_on: '2027-01-01',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'c-102',
        title: 'Cloud Infrastructure SOW',
        category: 'SOW',
        status: 'PENDING_SIGNATURE',
        counterparty: 'CloudTech Solutions',
        start_on: '2026-02-01',
        expires_on: '2026-12-31',
        created_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-01-15T00:00:00Z',
      },
    ],
    total_count: 2,
    page: 1,
    limit: 10,
  };

  const mockContractDetail = {
    id: 'c-101',
    title: 'Enterprise Master Services Agreement',
    category: 'Contract',
    status: 'ACTIVE',
    counterparty: 'Acme Global Corp',
    start_on: '2026-01-01',
    expires_on: '2027-01-01',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    clauses: [
      {
        id: 'cl-1',
        contract_id: 'c-101',
        clause_type: 'Liability',
        title: 'Limitation of Liability Clause',
        body_text: 'Liability shall not exceed total fees paid in 12 months.',
        is_highlighted: true,
      },
    ],
    highlighted_clauses: [
      {
        id: 'cl-1',
        contract_id: 'c-101',
        clause_type: 'Liability',
        title: 'Limitation of Liability Clause',
        body_text: 'Liability shall not exceed total fees paid in 12 months.',
        is_highlighted: true,
      },
    ],
    slas: [
      {
        id: 'sla-1',
        contract_id: 'c-101',
        metric_name: 'Uptime SLA',
        target_value: '99.9%',
        penalty_terms: '5% credit per 0.1% breach',
      },
    ],
    evaluated_slas: [],
    document_versions: [],
    amendments: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.getMe as any).mockResolvedValue(mockUser);
    (contractApi.listContracts as any).mockResolvedValue(mockContractsList);
    (contractApi.getContractDetail as any).mockResolvedValue(mockContractDetail);
  });

  it('renders page header, user session details, and list of repository contracts', async () => {
    render(<ContractsPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /contract repository/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Enterprise Master Services Agreement')).toBeInTheDocument();
    });

    expect(screen.getByText('Acme Global Corp')).toBeInTheDocument();
    expect(screen.getByText('Cloud Infrastructure SOW')).toBeInTheDocument();
    expect(screen.getByText('CloudTech Solutions')).toBeInTheDocument();
    expect(screen.getByText('Signature Hub')).toBeInTheDocument();
  });

  it('filters contracts by category, status, counterparty, and expiration date [FR-11]', async () => {
    render(<ContractsPage />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Master Services Agreement')).toBeInTheDocument();
    });

    // Filter by Category
    const categorySelect = screen.getByTestId('category-filter');
    fireEvent.change(categorySelect, { target: { value: 'SOW' } });

    await waitFor(() => {
      expect(contractApi.listContracts).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'SOW' })
      );
    });

    // Filter by Status
    const statusSelect = screen.getByTestId('status-filter');
    fireEvent.change(statusSelect, { target: { value: 'PENDING_SIGNATURE' } });

    await waitFor(() => {
      expect(contractApi.listContracts).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING_SIGNATURE' })
      );
    });

    // Filter by Counterparty
    const counterpartyInput = screen.getByTestId('counterparty-search');
    fireEvent.change(counterpartyInput, { target: { value: 'Acme' } });

    await waitFor(() => {
      expect(contractApi.listContracts).toHaveBeenCalledWith(
        expect.objectContaining({ counterparty: 'Acme' })
      );
    });

    // Filter by Expiration Date
    const expirationInput = screen.getByTestId('expiration-filter');
    fireEvent.change(expirationInput, { target: { value: '2026-12-31' } });

    await waitFor(() => {
      expect(contractApi.listContracts).toHaveBeenCalledWith(
        expect.objectContaining({ expires_before: '2026-12-31' })
      );
    });

    // Reset Filters
    const clearBtn = screen.getByTestId('clear-filters-btn');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(categorySelect).toHaveValue('ALL');
      expect(statusSelect).toHaveValue('ALL');
      expect(counterpartyInput).toHaveValue('');
      expect(expirationInput).toHaveValue('');
    });
  });

  it('opens quick clause/SLA inspector drawer when clicking Inspect [FR-1]', async () => {
    render(<ContractsPage />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Master Services Agreement')).toBeInTheDocument();
    });

    const inspectBtns = screen.getAllByTestId('quick-inspect-btn');
    fireEvent.click(inspectBtns[0]);

    await waitFor(() => {
      expect(screen.getByTestId('clause-inspection-drawer')).toBeInTheDocument();
    });

    expect(contractApi.getContractDetail).toHaveBeenCalledWith('c-101');

    await waitFor(() => {
      expect(screen.getByText('Limitation of Liability Clause')).toBeInTheDocument();
      expect(screen.getByText('Uptime SLA')).toBeInTheDocument();
    });
  });

  it('opens new contract modal and creates a contract successfully', async () => {
    const newContractResponse = {
      id: 'c-200',
      title: 'New Vendor Agreement',
      category: 'Contract',
      status: 'DRAFT',
      counterparty: 'Vendor Inc',
      start_on: '2026-03-01',
      expires_on: '2027-03-01',
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
      clauses: [],
      highlighted_clauses: [],
      slas: [],
      evaluated_slas: [],
      document_versions: [],
      amendments: [],
    };

    (contractApi.createContract as any).mockResolvedValueOnce(newContractResponse);

    render(<ContractsPage />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Master Services Agreement')).toBeInTheDocument();
    });

    const createBtn = screen.getByTestId('create-contract-btn');
    fireEvent.click(createBtn);

    expect(screen.getByTestId('create-contract-modal')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/agreement title/i), {
      target: { value: 'New Vendor Agreement' },
    });
    fireEvent.change(screen.getByLabelText(/counterparty/i), {
      target: { value: 'Vendor Inc' },
    });

    const submitBtn = screen.getByRole('button', { name: /create contract/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(contractApi.createContract).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Vendor Agreement',
          counterparty: 'Vendor Inc',
        })
      );
    });
  });

  it('displays error alert when fetching contract list fails', async () => {
    (contractApi.listContracts as any).mockRejectedValueOnce(
      new Error('Failed to connect to contract database')
    );

    render(<ContractsPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/repository error/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to connect to contract database/i)).toBeInTheDocument();
  });
});
