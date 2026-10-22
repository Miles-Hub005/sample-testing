import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClauseViewer } from '../../src/components/contracts/clause_viewer';
import { ContractDetailResponse } from '../../src/services/contract_api';

describe('ClauseViewer Component', () => {
  const mockContract: ContractDetailResponse = {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Enterprise Software Services Agreement',
    category: 'Contract',
    status: 'ACTIVE',
    counterparty: 'Acme Global Holdings',
    start_on: '2026-01-01',
    expires_on: '2027-01-01',
    parent_contract_id: null,
    created_at: '2026-01-01T08:00:00Z',
    updated_at: '2026-01-01T08:00:00Z',
    clauses: [
      {
        id: 'c1',
        contract_id: '11111111-1111-1111-1111-111111111111',
        clause_type: 'Confidentiality',
        title: 'Non-Disclosure Obligations',
        body_text:
          'Both parties agree to protect proprietary information and not disclose confidential data to third parties.',
        is_highlighted: true,
      },
      {
        id: 'c2',
        contract_id: '11111111-1111-1111-1111-111111111111',
        clause_type: 'Payment Terms',
        title: 'Net 30 Invoicing',
        body_text:
          'Invoices shall be rendered monthly and paid within 30 calendar days from receipt.',
        is_highlighted: false,
      },
      {
        id: 'c3',
        contract_id: '11111111-1111-1111-1111-111111111111',
        clause_type: 'Liability',
        title: 'Limitation of Liability',
        body_text:
          'Neither party shall be liable for indirect, special, or consequential damages arising under this agreement.',
        is_highlighted: true,
      },
    ],
    highlighted_clauses: [
      {
        id: 'c1',
        contract_id: '11111111-1111-1111-1111-111111111111',
        clause_type: 'Confidentiality',
        title: 'Non-Disclosure Obligations',
        body_text:
          'Both parties agree to protect proprietary information and not disclose confidential data to third parties.',
        is_highlighted: true,
      },
      {
        id: 'c3',
        contract_id: '11111111-1111-1111-1111-111111111111',
        clause_type: 'Liability',
        title: 'Limitation of Liability',
        body_text:
          'Neither party shall be liable for indirect, special, or consequential damages arising under this agreement.',
        is_highlighted: true,
      },
    ],
    slas: [
      {
        id: 's1',
        contract_id: '11111111-1111-1111-1111-111111111111',
        metric_name: 'Uptime Commitment',
        target_value: '99.9%',
        penalty_terms: '10% service credit per 0.1% outage',
      },
      {
        id: 's2',
        contract_id: '11111111-1111-1111-1111-111111111111',
        metric_name: 'Support First Response',
        target_value: '< 15 mins',
        penalty_terms: null,
      },
    ],
    evaluated_slas: [
      {
        sla_id: 's1',
        contract_id: '11111111-1111-1111-1111-111111111111',
        metric_name: 'Uptime Commitment',
        target_value: '99.9%',
        actual_value: '99.95%',
        status: 'MEETING',
        penalty_applicable: false,
        penalty_terms: '10% service credit per 0.1% outage',
      },
    ],
    document_versions: [],
    amendments: [],
  };

  it('renders contract header information, status badge, and metrics summary', () => {
    render(<ClauseViewer contract={mockContract} />);

    expect(
      screen.getByText('Enterprise Software Services Agreement')
    ).toBeInTheDocument();
    expect(screen.getByText('Acme Global Holdings')).toBeInTheDocument();
    expect(screen.getByText('All Clauses (3)')).toBeInTheDocument();
    expect(screen.getByText('Highlighted Clauses (2)')).toBeInTheDocument();
    expect(screen.getByText('Active SLAs (2)')).toBeInTheDocument();
  });

  it('renders all clauses by default in the All Clauses tab', () => {
    render(<ClauseViewer contract={mockContract} />);

    expect(screen.getByText('Non-Disclosure Obligations')).toBeInTheDocument();
    expect(screen.getByText('Net 30 Invoicing')).toBeInTheDocument();
    expect(screen.getByText('Limitation of Liability')).toBeInTheDocument();
  });

  it('filters clauses using search input', () => {
    render(<ClauseViewer contract={mockContract} />);

    const searchInput = screen.getByTestId('clause-search-input');
    fireEvent.change(searchInput, { target: { value: 'Invoicing' } });

    expect(screen.getByText('Net 30 Invoicing')).toBeInTheDocument();
    expect(
      screen.queryByText('Non-Disclosure Obligations')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Limitation of Liability')
    ).not.toBeInTheDocument();
  });

  it('filters clauses using clause type select dropdown', () => {
    render(<ClauseViewer contract={mockContract} />);

    const typeSelect = screen.getByTestId('clause-type-filter');
    fireEvent.change(typeSelect, { target: { value: 'Confidentiality' } });

    expect(screen.getByText('Non-Disclosure Obligations')).toBeInTheDocument();
    expect(screen.queryByText('Net 30 Invoicing')).not.toBeInTheDocument();
  });

  it('toggles show highlighted only filter', () => {
    render(<ClauseViewer contract={mockContract} />);

    const toggleBtn = screen.getByTestId('toggle-highlighted-only');
    fireEvent.click(toggleBtn);

    expect(screen.getByText('Non-Disclosure Obligations')).toBeInTheDocument();
    expect(screen.getByText('Limitation of Liability')).toBeInTheDocument();
    expect(screen.queryByText('Net 30 Invoicing')).not.toBeInTheDocument();
  });

  it('switches to Highlighted Clauses tab', () => {
    render(<ClauseViewer contract={mockContract} />);

    const highlightedTab = screen.getByTestId('tab-highlighted-clauses');
    fireEvent.click(highlightedTab);

    expect(
      screen.getByTestId('panel-highlighted-clauses')
    ).toBeInTheDocument();
    expect(screen.getByText('Non-Disclosure Obligations')).toBeInTheDocument();
    expect(screen.getByText('Limitation of Liability')).toBeInTheDocument();
    expect(screen.queryByText('Net 30 Invoicing')).not.toBeInTheDocument();
  });

  it('switches to Key Terms & Summary tab', () => {
    render(<ClauseViewer contract={mockContract} />);

    const keyTermsTab = screen.getByTestId('tab-key-terms');
    fireEvent.click(keyTermsTab);

    expect(screen.getByTestId('panel-key-terms')).toBeInTheDocument();
    expect(screen.getByTestId('key-terms-overview-card')).toBeInTheDocument();
    expect(screen.getByTestId('key-terms-timeline-card')).toBeInTheDocument();
    expect(screen.getByTestId('key-terms-structure-card')).toBeInTheDocument();

    expect(screen.getByText('Agreement Parameters')).toBeInTheDocument();
    expect(screen.getByText('Effective Dates & Term')).toBeInTheDocument();
  });

  it('switches to Active SLAs tab and displays metric targets and penalty terms', () => {
    render(<ClauseViewer contract={mockContract} />);

    const slasTab = screen.getByTestId('tab-slas');
    fireEvent.click(slasTab);

    expect(screen.getByTestId('panel-slas')).toBeInTheDocument();
    expect(screen.getByText('Uptime Commitment')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument();
    expect(
      screen.getByText('10% service credit per 0.1% outage')
    ).toBeInTheDocument();
    expect(screen.getByText('Support First Response')).toBeInTheDocument();
  });

  it('expands and collapses clause text when expand button is clicked', () => {
    render(<ClauseViewer contract={mockContract} />);

    const expandBtn = screen.getByTestId('toggle-expand-c1');
    expect(expandBtn).toHaveTextContent('Expand Text');

    fireEvent.click(expandBtn);
    expect(expandBtn).toHaveTextContent('Collapse');

    fireEvent.click(expandBtn);
    expect(expandBtn).toHaveTextContent('Expand Text');
  });

  it('invokes onClauseSelect when a clause card is clicked', () => {
    const handleSelect = vi.fn();
    render(<ClauseViewer contract={mockContract} onClauseSelect={handleSelect} />);

    const card = screen.getByTestId('clause-card-c1');
    fireEvent.click(card);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(mockContract.clauses[0]);
  });

  it('renders empty states gracefully when no clauses or SLAs exist', () => {
    render(<ClauseViewer clauses={[]} slas={[]} title="Empty Contract" />);

    expect(screen.getByTestId('no-clauses-empty-state')).toBeInTheDocument();

    const slasTab = screen.getByTestId('tab-slas');
    fireEvent.click(slasTab);
    expect(screen.getByTestId('no-slas-empty-state')).toBeInTheDocument();
  });
});
