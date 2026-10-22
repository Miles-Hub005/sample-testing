import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SignaturesHubPage from '../../src/app/contracts/signatures/page';
import { apiClient } from '../../src/services/apiClient';
import { contractApi } from '../../src/services/contract_api';

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
    contractApi: {
      ...actual.contractApi,
      listPendingSignatures: vi.fn(),
      executeSignature: vi.fn(),
    },
  };
});

describe('SignaturesHubPage Component [FR-5, FR-6, NFR-5]', () => {
  const mockUser = {
    user_id: 'usr_sig_777',
    email: 'signatory@company.com',
    tenant_id: 'tenant_123',
    roles: ['ClientViewer', 'ContractAdmin'],
  };

  const mockPendingResponse = {
    items: [
      {
        signature_request_id: 'sig-req-101',
        contract_id: 'c-101',
        contract_title: 'Enterprise Master Services Agreement',
        counterparty: 'Acme Global Corp',
        signatory_id: 'usr_sig_777',
        status: 'PENDING',
        created_at: '2026-10-01T12:00:00Z',
      },
      {
        signature_request_id: 'sig-req-102',
        contract_id: 'c-102',
        contract_title: 'Cloud Infrastructure SOW',
        counterparty: 'CloudTech Solutions',
        signatory_id: 'usr_sig_777',
        status: 'PENDING',
        created_at: '2026-10-02T14:30:00Z',
      },
    ],
    total_count: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.getMe as any).mockResolvedValue(mockUser);
    (contractApi.listPendingSignatures as any).mockResolvedValue(mockPendingResponse);
  });

  it('renders signature hub page header and stat cards', async () => {
    render(<SignaturesHubPage />);

    expect(screen.getByTestId('signatures-hub-page')).toBeInTheDocument();
    expect(screen.getByText('Centralized E-Signature Hub')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('pending-count-card')).toBeInTheDocument();
      expect(screen.getByTestId('counterparties-count-card')).toBeInTheDocument();
      expect(screen.getByTestId('signatory-role-card')).toBeInTheDocument();
    });

    expect(screen.getByText('2')).toBeInTheDocument(); // total count
  });

  it('lists pending signature requests with contract title and counterparty [FR-5]', async () => {
    render(<SignaturesHubPage />);

    await waitFor(() => {
      expect(screen.getByTestId('pending-signatures-list')).toBeInTheDocument();
    });

    expect(screen.getByText('Enterprise Master Services Agreement')).toBeInTheDocument();
    expect(screen.getByText('Cloud Infrastructure SOW')).toBeInTheDocument();
    expect(screen.getByText('Acme Global Corp')).toBeInTheDocument();
    expect(screen.getByText('CloudTech Solutions')).toBeInTheDocument();

    expect(screen.getByTestId('sign-btn-sig-req-101')).toBeInTheDocument();
    expect(screen.getByTestId('sign-btn-sig-req-102')).toBeInTheDocument();
  });

  it('filters pending signatures by search query', async () => {
    render(<SignaturesHubPage />);

    await waitFor(() => {
      expect(screen.getByText('Enterprise Master Services Agreement')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-signatures-input');
    fireEvent.change(searchInput, { target: { value: 'CloudTech' } });

    expect(screen.queryByText('Enterprise Master Services Agreement')).not.toBeInTheDocument();
    expect(screen.getByText('Cloud Infrastructure SOW')).toBeInTheDocument();
  });

  it('opens signature modal on clicking execute signature button [FR-6]', async () => {
    render(<SignaturesHubPage />);

    await waitFor(() => {
      expect(screen.getByTestId('sign-btn-sig-req-101')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('sign-btn-sig-req-101'));

    expect(screen.getByTestId('signature-modal')).toBeInTheDocument();
    expect(screen.getByText('Digital Signature Execution')).toBeInTheDocument();
  });

  it('renders empty state when no pending signature requests exist', async () => {
    (contractApi.listPendingSignatures as any).mockResolvedValue({
      items: [],
      total_count: 0,
    });

    render(<SignaturesHubPage />);

    await waitFor(() => {
      expect(screen.getByTestId('no-pending-signatures')).toBeInTheDocument();
    });

    expect(screen.getByText('No Pending Signatures Required')).toBeInTheDocument();
  });

  it('renders error state and retries on failure', async () => {
    (contractApi.listPendingSignatures as any).mockRejectedValueOnce(
      new Error('Network error loading signatures')
    );

    render(<SignaturesHubPage />);

    await waitFor(() => {
      expect(screen.getByTestId('signatures-error')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error loading signatures')).toBeInTheDocument();

    // Mock successful response on retry
    (contractApi.listPendingSignatures as any).mockResolvedValueOnce(mockPendingResponse);

    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));

    await waitFor(() => {
      expect(screen.getByTestId('pending-signatures-list')).toBeInTheDocument();
    });
  });
});
