import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AmendmentTimeline } from '../../src/components/contracts/amendment_timeline';
import {
  AmendmentDetailResponse,
  ContractDetailResponse,
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
      listAmendments: vi.fn(),
      createAmendment: vi.fn(),
    },
  };
});

describe('AmendmentTimeline Component', () => {
  const mockAmendments: AmendmentDetailResponse[] = [
    {
      id: 'amend-001',
      contract_id: 'contract-123',
      sequence_number: 1,
      summary: 'Initial amendment extending completion deadline by 30 days.',
      author_id: 'user-001',
      created_at: '2026-02-01T10:00:00Z',
    },
    {
      id: 'amend-002',
      contract_id: 'contract-123',
      sequence_number: 2,
      summary: 'Adjusted milestone schedule and added Exhibit B pricing terms.',
      author_id: 'user-002',
      created_at: '2026-02-15T14:30:00Z',
    },
    {
      id: 'amend-003',
      contract_id: 'contract-123',
      sequence_number: 3,
      summary: 'Updated support SLA response window to 4 hours.',
      author_id: 'user-001',
      created_at: '2026-03-01T09:15:00Z',
    },
  ];

  const mockContract: ContractDetailResponse = {
    id: 'contract-123',
    title: 'Master Services Agreement',
    category: 'Contract',
    status: 'ACTIVE',
    counterparty: 'Acme Enterprises',
    start_on: '2026-01-01',
    expires_on: '2027-01-01',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-03-01T09:15:00Z',
    clauses: [],
    highlighted_clauses: [],
    slas: [],
    evaluated_slas: [],
    document_versions: [],
    amendments: mockAmendments,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders amendment timeline component with section header and audit protection banner [FR-7, FR-8]', () => {
    render(
      <AmendmentTimeline
        contract={mockContract}
        amendments={mockAmendments}
        contractTitle="Master Services Agreement"
      />
    );

    expect(screen.getByRole('heading', { name: /Amendment Audit Trail/i })).toBeInTheDocument();
    expect(screen.getByText(/Protected Read-Only Audit Log/i)).toBeInTheDocument();
    expect(
      screen.getByText(/past entries cannot be edited, modified, or deleted/i)
    ).toBeInTheDocument();
  });

  it('renders all amendment records with sequence numbers, summaries, authors, and immutable badges [FR-7, FR-8]', () => {
    render(<AmendmentTimeline amendments={mockAmendments} />);

    expect(screen.getByText(/Sequence #1/i)).toBeInTheDocument();
    expect(screen.getByText(/Initial amendment extending completion deadline/i)).toBeInTheDocument();
    expect(screen.getByText(/Author: user-001/i)).toBeInTheDocument();

    expect(screen.getByText(/Sequence #2/i)).toBeInTheDocument();
    expect(screen.getByText(/Adjusted milestone schedule/i)).toBeInTheDocument();
    expect(screen.getByText(/Author: user-002/i)).toBeInTheDocument();

    expect(screen.getByText(/Sequence #3/i)).toBeInTheDocument();
    expect(screen.getByText(/Updated support SLA response window/i)).toBeInTheDocument();

    const immutableBadges = screen.getAllByText(/Immutable Entry/i);
    expect(immutableBadges.length).toBe(3);
  });

  it('fetches amendments via contractApi when contractId is provided without amendments prop', async () => {
    vi.mocked(contractApi.listAmendments).mockResolvedValueOnce({
      items: mockAmendments,
      total_count: 3,
    });

    render(<AmendmentTimeline contractId="contract-123" />);

    expect(contractApi.listAmendments).toHaveBeenCalledWith('contract-123');

    await waitFor(() => {
      expect(screen.getByText(/Initial amendment extending completion deadline/i)).toBeInTheDocument();
    });
  });

  it('filters amendment records based on search query', () => {
    render(<AmendmentTimeline amendments={mockAmendments} />);

    const searchInput = screen.getByPlaceholderText(/Search by summary, author, or sequence/i);
    fireEvent.change(searchInput, { target: { value: 'SLA' } });

    expect(screen.getByText(/Updated support SLA response window/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Initial amendment extending completion deadline/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Adjusted milestone schedule/i)).not.toBeInTheDocument();
  });

  it('toggles sort order between chronological asc and reverse desc', () => {
    render(<AmendmentTimeline amendments={mockAmendments} />);

    const sortSelect = screen.getByLabelText(/Order:/i);
    expect(sortSelect).toHaveValue('asc');

    // In asc order, Sequence #1 should appear before Sequence #3 in DOM order
    const listItemsBefore = screen.getAllByTestId(/amendment-item-/i);
    expect(listItemsBefore[0]).toHaveTextContent(/Sequence #1/i);
    expect(listItemsBefore[2]).toHaveTextContent(/Sequence #3/i);

    // Change sort order to desc
    fireEvent.change(sortSelect, { target: { value: 'desc' } });

    const listItemsAfter = screen.getAllByTestId(/amendment-item-/i);
    expect(listItemsAfter[0]).toHaveTextContent(/Sequence #3/i);
    expect(listItemsAfter[2]).toHaveTextContent(/Sequence #1/i);
  });

  it('appends a new amendment entry successfully via record form [FR-7]', async () => {
    const onAmendmentAdded = vi.fn();
    const newRecord: AmendmentDetailResponse = {
      id: 'amend-004',
      contract_id: 'contract-123',
      sequence_number: 4,
      summary: 'Added new payment milestone terms for Phase 2 deliverables.',
      author_id: 'user-005',
      created_at: new Date().toISOString(),
    };

    vi.mocked(contractApi.createAmendment).mockResolvedValueOnce(newRecord);

    render(
      <AmendmentTimeline
        contractId="contract-123"
        amendments={mockAmendments}
        onAmendmentAdded={onAmendmentAdded}
      />
    );

    const recordButton = screen.getByRole('button', { name: /Record Amendment/i });
    fireEvent.click(recordButton);

    const textarea = screen.getByLabelText(/Amendment Summary \/ Scope Description/i);
    fireEvent.change(textarea, {
      target: { value: 'Added new payment milestone terms for Phase 2 deliverables.' },
    });

    const submitButton = screen.getByRole('button', { name: /Append Audit Entry/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(contractApi.createAmendment).toHaveBeenCalledWith('contract-123', {
        summary: 'Added new payment milestone terms for Phase 2 deliverables.',
      });
      expect(onAmendmentAdded).toHaveBeenCalledWith(expect.objectContaining({
        sequence_number: 4,
        summary: 'Added new payment milestone terms for Phase 2 deliverables.',
      }));
    });

    expect(screen.getByText(/Sequence #4/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Added new payment milestone terms for Phase 2 deliverables/i)
    ).toBeInTheDocument();
  });

  it('invokes custom onAddAmendment callback if provided', async () => {
    const customAddAmendment = vi.fn().mockResolvedValue({
      id: 'amend-custom',
      contract_id: 'contract-123',
      sequence_number: 4,
      summary: 'Custom amendment via callback.',
      author_id: 'user-custom',
      created_at: new Date().toISOString(),
    });

    render(
      <AmendmentTimeline
        contractId="contract-123"
        amendments={mockAmendments}
        onAddAmendment={customAddAmendment}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Record Amendment/i }));
    fireEvent.change(screen.getByLabelText(/Amendment Summary \/ Scope Description/i), {
      target: { value: 'Custom amendment via callback.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Append Audit Entry/i }));

    await waitFor(() => {
      expect(customAddAmendment).toHaveBeenCalledWith('Custom amendment via callback.');
    });

    expect(screen.getByText(/Custom amendment via callback/i)).toBeInTheDocument();
  });

  it('hides the record amendment button and form when readOnly is true [FR-8]', () => {
    render(<AmendmentTimeline amendments={mockAmendments} readOnly={true} />);

    expect(screen.queryByRole('button', { name: /Record Amendment/i })).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Amendment Summary \/ Scope Description/i)
    ).not.toBeInTheDocument();
  });

  it('displays empty state when no amendment entries exist', () => {
    render(<AmendmentTimeline amendments={[]} />);

    expect(screen.getByText(/No amendment audit records/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This contract currently has no recorded amendments/i)
    ).toBeInTheDocument();
  });

  it('displays error alert when amendment fetch fails', async () => {
    vi.mocked(contractApi.listAmendments).mockRejectedValueOnce(
      new Error('Unauthorized access to contract audit trail.')
    );

    render(<AmendmentTimeline contractId="contract-123" />);

    await waitFor(() => {
      expect(
        screen.getByText(/Unauthorized access to contract audit trail/i)
      ).toBeInTheDocument();
    });
  });

  it('displays error alert when form submission fails', async () => {
    vi.mocked(contractApi.createAmendment).mockRejectedValueOnce(
      new Error('Contract is in TERMINATED status and cannot be amended.')
    );

    render(<AmendmentTimeline contractId="contract-123" amendments={mockAmendments} />);

    fireEvent.click(screen.getByRole('button', { name: /Record Amendment/i }));
    fireEvent.change(screen.getByLabelText(/Amendment Summary \/ Scope Description/i), {
      target: { value: 'Attempting invalid amendment' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Append Audit Entry/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Contract is in TERMINATED status and cannot be amended/i)
      ).toBeInTheDocument();
    });
  });
});