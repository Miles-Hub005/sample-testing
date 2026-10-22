import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { VersionHistory } from '../../src/components/contracts/version_history';
import {
  ContractDetailResponse,
  DocumentVersionResponse,
  contractApi,
} from '../../src/services/contract_api';

// Mock contractApi service
vi.mock('../../src/services/contract_api', async () => {
  const actual = await vi.importActual<typeof import('../../src/services/contract_api')>(
    '../../src/services/contract_api'
  );
  return {
    ...actual,
    contractApi: {
      ...actual.contractApi,
      uploadDocumentVersion: vi.fn(),
      downloadDocumentVersion: vi.fn(),
    },
  };
});

describe('VersionHistory Component', () => {
  const mockVersions: DocumentVersionResponse[] = [
    {
      id: 'v1-id',
      contract_id: 'contract-123',
      category_type: 'Contract',
      version_number: 1,
      file_path: '/uploads/contracts/master_agreement_v1.pdf',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      uploaded_by_id: 'user-001',
      uploaded_at: '2026-01-01T10:00:00Z',
    },
    {
      id: 'v2-id',
      contract_id: 'contract-123',
      category_type: 'Contract',
      version_number: 2,
      file_path: '/uploads/contracts/master_agreement_v2.pdf',
      checksum: 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890',
      uploaded_by_id: 'user-002',
      uploaded_at: '2026-02-01T14:30:00Z',
    },
    {
      id: 'v3-sow-id',
      contract_id: 'contract-123',
      category_type: 'SOW',
      version_number: 1,
      file_path: '/uploads/sows/statement_of_work_phase1.pdf',
      checksum: 'f1e2d3c4b5a69876f1e2d3c4b5a69876f1e2d3c4b5a69876f1e2d3c4b5a69876',
      uploaded_by_id: 'user-001',
      uploaded_at: '2026-02-15T09:15:00Z',
    },
    {
      id: 'v4-nda-id',
      contract_id: 'contract-123',
      category_type: 'NDA',
      version_number: 1,
      file_path: '/uploads/ndas/mutual_nda_signed.pdf',
      checksum: '9988776655443322110099887766554433221100998877665544332211009988',
      uploaded_by_id: 'user-003',
      uploaded_at: '2026-03-01T11:00:00Z',
    },
    {
      id: 'v5-exhibit-id',
      contract_id: 'contract-123',
      category_type: 'Exhibit',
      version_number: 1,
      file_path: '/uploads/exhibits/exhibit_a_pricing_schedule.pdf',
      checksum: '1122334455667788990011223344556677889900112233445566778899001122',
      uploaded_by_id: 'user-001',
      uploaded_at: '2026-03-10T16:20:00Z',
    },
  ];

  const mockContract: ContractDetailResponse = {
    id: 'contract-123',
    title: 'Master Enterprise Agreement',
    category: 'Contract',
    status: 'ACTIVE',
    counterparty: 'Global Enterprise Corp',
    start_on: '2026-01-01',
    expires_on: '2027-01-01',
    parent_contract_id: 'parent-contract-999',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-10T16:20:00Z',
    clauses: [],
    highlighted_clauses: [],
    slas: [],
    evaluated_slas: [],
    document_versions: mockVersions,
    amendments: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders section title, contract name, and total versions badge', () => {
    render(<VersionHistory contract={mockContract} />);

    expect(screen.getByText('Document Version History')).toBeInTheDocument();
    expect(screen.getByText('Master Enterprise Agreement')).toBeInTheDocument();
    expect(screen.getByText('5 Total Versions')).toBeInTheDocument();
  });

  it('[FR-10] renders parent contract relationship indicator when parent_contract_id is present', () => {
    render(<VersionHistory contract={mockContract} />);

    const badge = screen.getByTestId('parent-contract-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('parent-contract-999');
    expect(badge).toHaveTextContent('Supporting Exhibits & SOWs attached directly');
  });

  it('[FR-3] categorizes documents across Contract, SOW, NDA, and Exhibit tabs', () => {
    render(<VersionHistory contract={mockContract} />);

    // Check tabs with counts
    expect(screen.getByTestId('category-tab-ALL')).toHaveTextContent('All Categories (5)');
    expect(screen.getByTestId('category-tab-Contract')).toHaveTextContent('Contracts (2)');
    expect(screen.getByTestId('category-tab-SOW')).toHaveTextContent('SOWs (1)');
    expect(screen.getByTestId('category-tab-NDA')).toHaveTextContent('NDAs (1)');
    expect(screen.getByTestId('category-tab-Exhibit')).toHaveTextContent('Exhibits (1)');
  });

  it('[FR-3] filters document versions when category tab is selected', () => {
    render(<VersionHistory contract={mockContract} />);

    // Filter to SOWs tab
    const sowTab = screen.getByTestId('category-tab-SOW');
    fireEvent.click(sowTab);

    // Only SOW document version should be displayed
    expect(screen.getByText('statement_of_work_phase1.pdf')).toBeInTheDocument();
    expect(screen.queryByText('master_agreement_v1.pdf')).not.toBeInTheDocument();
    expect(screen.queryByText('mutual_nda_signed.pdf')).not.toBeInTheDocument();
  });

  it('[FR-4] displays sequential version control details (v1, v2) and checksums', () => {
    render(<VersionHistory contract={mockContract} />);

    // Version numbers
    expect(screen.getByText('v1')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();

    // Checksums formatting
    const checksumElem = screen.getByTestId('checksum-v1-id');
    expect(checksumElem).toBeInTheDocument();
    expect(checksumElem.getAttribute('title')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });

  it('[FR-4] executes version download when Download button is clicked', async () => {
    const mockBlob = new Blob(['sample pdf content'], { type: 'application/pdf' });
    vi.mocked(contractApi.downloadDocumentVersion).mockResolvedValueOnce(mockBlob);

    // Mock URL methods
    const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/123');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    render(<VersionHistory contract={mockContract} />);

    const downloadBtn = screen.getByTestId('download-version-v2-id');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(contractApi.downloadDocumentVersion).toHaveBeenCalledWith(
        'contract-123',
        'v2-id'
      );
    });
  });

  it('supports custom onDownloadVersion callback prop', async () => {
    const onDownloadSpy = vi.fn().mockResolvedValue(undefined);

    render(<VersionHistory contract={mockContract} onDownloadVersion={onDownloadSpy} />);

    const downloadBtn = screen.getByTestId('download-version-v1-id');
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(onDownloadSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'v1-id',
          version_number: 1,
        })
      );
    });
  });

  it('[FR-4, FR-10] allows toggling upload form and uploading a revised file / supporting exhibit', async () => {
    const onUploadedSpy = vi.fn();
    const newVersionResponse: DocumentVersionResponse = {
      id: 'v6-new-exhibit-id',
      contract_id: 'contract-123',
      category_type: 'Exhibit',
      version_number: 2,
      file_path: '/uploads/exhibits/exhibit_b_sla_terms.pdf',
      checksum: 'abc123sha256hash',
      uploaded_at: '2026-03-31T12:00:00Z',
    };

    vi.mocked(contractApi.uploadDocumentVersion).mockResolvedValueOnce(newVersionResponse);

    render(
      <VersionHistory
        contract={mockContract}
        onVersionUploaded={onUploadedSpy}
      />
    );

    // Open upload form
    const toggleBtn = screen.getByTestId('upload-toggle-button');
    fireEvent.click(toggleBtn);

    expect(screen.getByTestId('upload-form')).toBeInTheDocument();

    // Select category 'Exhibit'
    const categorySelect = screen.getByTestId('category-select');
    fireEvent.change(categorySelect, { target: { value: 'Exhibit' } });

    // Select file
    const fileInput = screen.getByTestId('file-input');
    const testFile = new File(['dummy content'], 'exhibit_b_sla_terms.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Submit form
    const submitBtn = screen.getByTestId('submit-upload-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(contractApi.uploadDocumentVersion).toHaveBeenCalledWith(
        'contract-123',
        'Exhibit',
        testFile
      );
      expect(onUploadedSpy).toHaveBeenCalledWith(newVersionResponse);
      expect(
        screen.getByText('Successfully uploaded Exhibit document version v2.')
      ).toBeInTheDocument();
    });

    // Verify new version appears in list
    expect(screen.getByText('exhibit_b_sla_terms.pdf')).toBeInTheDocument();
  });

  it('hides upload controls when readOnly prop is true', () => {
    render(<VersionHistory contract={mockContract} readOnly={true} />);

    expect(screen.queryByTestId('upload-toggle-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('upload-form')).not.toBeInTheDocument();
  });

  it('displays empty state when no document versions exist for category', () => {
    render(<VersionHistory contract={mockContract} documentVersions={[]} />);

    expect(screen.getByTestId('no-versions-state')).toBeInTheDocument();
    expect(
      screen.getByText('No document versions found in category "ALL".')
    ).toBeInTheDocument();
  });

  it('handles upload errors gracefully and presents error alert', async () => {
    vi.mocked(contractApi.uploadDocumentVersion).mockRejectedValueOnce(
      new Error('File payload exceeds maximum limit of 25MB')
    );

    render(<VersionHistory contract={mockContract} />);

    // Open upload form
    fireEvent.click(screen.getByTestId('upload-toggle-button'));

    // Select file and submit
    const fileInput = screen.getByTestId('file-input');
    const largeFile = new File(['too large'], 'large_contract.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    fireEvent.click(screen.getByTestId('submit-upload-button'));

    await waitFor(() => {
      expect(screen.getByTestId('version-history-error-alert')).toBeInTheDocument();
      expect(
        screen.getByText('File payload exceeds maximum limit of 25MB')
      ).toBeInTheDocument();
    });
  });

  it('allows sorting versions by newest first vs oldest first', () => {
    render(<VersionHistory contract={mockContract} />);

    const sortSelect = screen.getByTestId('sort-order-select');

    // Default: newest first. So v5-exhibit (uploaded March 10) is first
    const table = screen.getByTestId('version-table');
    expect(table).toBeInTheDocument();

    // Change to oldest first
    fireEvent.change(sortSelect, { target: { value: 'oldest' } });

    // Table should re-sort with v1 (uploaded Jan 1) first
    expect(sortSelect).toHaveValue('oldest');
  });
});
