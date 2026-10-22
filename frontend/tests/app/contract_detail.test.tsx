import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ContractDetailPage from '../../src/app/contracts/[id]/page';
import { apiClient } from '../../src/services/apiClient';
import * as contractApi from '../../src/services/contract_api';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'c-101' }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock apiClient and contractApi
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
      getContractDetail: vi.fn(),
      uploadDocumentVersion: vi.fn(),
      deleteContract: vi.fn(),
    },
  };
});

describe('ContractDetailPage Component', () => {
  const mockUser = {
    user_id: 'usr_admin_999',
    email: 'admin.contracts@tenant.org',
    tenant_id: 'tnt_contract_777',
    roles: ['ClientViewer', 'ContractAdmin'],
  };

  const mockContractDetail: contractApi.ContractDetailResponse = {
    id: 'c-101',
    title: 'Master Enterprise Agreement 2026',
    category: 'Contract',
    status: 'ACTIVE',
    counterparty: 'Acme Corporation',
    start_on: '2026-01-01',
    expires_on: '2027-01-01',
    parent_contract_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    clauses: [
      {
        id: 'cl-1',
        contract_id: 'c-101',
        clause_type: 'Liability',
        title: 'Limitation of Liability Clause',
        body_text: 'Liability is capped at 12 months fees paid.',
        is_highlighted: true,
      },
    ],
    highlighted_clauses: [
      {
        id: 'cl-1',
        contract_id: 'c-101',
        clause_type: 'Liability',
        title: 'Limitation of Liability Clause',
        body_text: 'Liability is capped at 12 months fees paid.',
        is_highlighted: true,
      },
    ],
    slas: [
      {
        id: 'sla-1',
        contract_id: 'c-101',
        metric_name: 'Uptime SLA',
        target_value: '99.9%',
        penalty_terms: '10% monthly fee credit',
      },
    ],
    evaluated_slas: [
      {
        sla_id: 'sla-1',
        contract_id: 'c-101',
        metric_name: 'Uptime SLA',
        target_value: '99.9%',
        actual_value: '99.95%',
        status: 'MET',
        penalty_applicable: false,
      },
    ],
    document_versions: [
      {
        id: 'v1-id',
        contract_id: 'c-101',
        category_type: 'Contract',
        version_number: 1,
        file_path: '/uploads/master_agreement_v1.pdf',
        checksum: 'checksum_v1_hash_12345',
        uploaded_by_id: 'usr_admin_999',
        uploaded_at: '2026-01-01T10:00:00Z',
      },
    ],
    amendments: [
      {
        id: 'am-1',
        contract_id: 'c-101',
        sequence_number: 1,
        summary: 'Initial agreement execution finalized.',
        author_id: 'usr_admin_999',
        created_at: '2026-01-01T10:30:00Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getMe).mockResolvedValue(mockUser);
    vi.mocked(contractApi.contractApi.getContractDetail).mockResolvedValue(mockContractDetail);
  });

  it('renders loading state initially while fetching contract detail', () => {
    vi.mocked(contractApi.contractApi.getContractDetail).mockReturnValue(new Promise(() => {}));
    render(<ContractDetailPage />);

    expect(screen.getByTestId('contract-detail-loading')).toBeInTheDocument();
    expect(screen.getByText(/Loading contract details.../i)).toBeInTheDocument();
  });

  it('renders error state if contract detail API fails', async () => {
    vi.mocked(contractApi.contractApi.getContractDetail).mockRejectedValue(
      new Error('Contract not found')
    );

    render(<ContractDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('contract-detail-error')).toBeInTheDocument();
    });

    expect(screen.getByText(/Contract not found/i)).toBeInTheDocument();
    expect(screen.getByTestId('back-to-repository-link')).toBeInTheDocument();
  });

  it('renders contract detail page header, key terms, and active tabs upon successful load', async () => {
    render(<ContractDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('contract-detail-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('contract-title')).toHaveTextContent('Master Enterprise Agreement 2026');
    expect(screen.getByTestId('contract-category-badge')).toHaveTextContent('Contract');
    expect(screen.getByTestId('contract-status-badge')).toBeInTheDocument();

    expect(screen.getByText('Acme Corporation')).toBeInTheDocument();

    // Verify tabs are present
    expect(screen.getByTestId('tab-clauses')).toBeInTheDocument();
    expect(screen.getByTestId('tab-versions')).toBeInTheDocument();
    expect(screen.getByTestId('tab-amendments')).toBeInTheDocument();
    expect(screen.getByTestId('tab-signature')).toBeInTheDocument();

    // Default tab is clauses
    expect(screen.getByTestId('clauses-tab-panel')).toBeInTheDocument();
  });

  it('switches between tabs (Versions, Amendments, E-Signatures) when clicked', async () => {
    render(<ContractDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('contract-detail-page')).toBeInTheDocument();
    });

    // Click Document Versions tab
    fireEvent.click(screen.getByTestId('tab-versions'));
    expect(screen.getByTestId('versions-tab-panel')).toBeInTheDocument();

    // Click Amendment Audit Trail tab
    fireEvent.click(screen.getByTestId('tab-amendments'));
    expect(screen.getByTestId('amendments-tab-panel')).toBeInTheDocument();

    // Click E-Signatures tab
    fireEvent.click(screen.getByTestId('tab-signature'));
    expect(screen.getByTestId('signature-tab-panel')).toBeInTheDocument();
  });

  it('opens Attach Exhibit / SOW modal and submits file attachment [FR-10]', async () => {
    vi.mocked(contractApi.contractApi.uploadDocumentVersion).mockResolvedValue({
      id: 'v2-sow-id',
      contract_id: 'c-101',
      category_type: 'SOW',
      version_number: 1,
      file_path: '/uploads/sow_exhibit.pdf',
      checksum: 'hash_sow_123',
      uploaded_by_id: 'usr_admin_999',
      uploaded_at: '2026-02-01T12:00:00Z',
    });

    render(<ContractDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('contract-detail-page')).toBeInTheDocument();
    });

    // Open attach modal
    fireEvent.click(screen.getByTestId('attach-exhibit-btn'));
    expect(screen.getByTestId('attach-modal')).toBeInTheDocument();

    // Select category SOW
    const categorySelect = screen.getByTestId('attach-category-select');
    fireEvent.change(categorySelect, { target: { value: 'SOW' } });

    // Select file
    const fileInput = screen.getByTestId('attach-file-input');
    const dummyFile = new File(['sow content'], 'sow_exhibit.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [dummyFile] } });

    // Submit attachment
    fireEvent.click(screen.getByTestId('attach-submit-btn'));

    await waitFor(() => {
      expect(contractApi.contractApi.uploadDocumentVersion).toHaveBeenCalledWith(
        'c-101',
        'SOW',
        dummyFile
      );
    });
  });

  it('opens delete confirmation modal and deletes contract when confirmed', async () => {
    vi.mocked(contractApi.contractApi.deleteContract).mockResolvedValue(undefined);

    render(<ContractDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('contract-detail-page')).toBeInTheDocument();
    });

    // Click delete button
    fireEvent.click(screen.getByTestId('delete-contract-btn'));
    expect(screen.getByTestId('delete-modal')).toBeInTheDocument();

    // Confirm deletion
    fireEvent.click(screen.getByTestId('confirm-delete-btn'));

    await waitFor(() => {
      expect(contractApi.contractApi.deleteContract).toHaveBeenCalledWith('c-101');
      expect(mockPush).toHaveBeenCalledWith('/contracts');
    });
  });
});
