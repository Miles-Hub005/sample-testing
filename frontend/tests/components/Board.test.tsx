import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  Board,
  DEFAULT_PIPELINE_STAGES,
  getStageStyle,
} from '../../src/components/pipeline/Board';
import { Deal } from '../../src/services/deals';

describe('Board Component [FR-001, FR-003, NFR-001]', () => {
  const sampleDeals: Deal[] = [
    {
      id: 'deal-001',
      title: 'Enterprise ERP Modernization',
      deal_value: 250000,
      milestone_stage: 'Qualification',
      win_probability: 0.2,
      age_in_days: 5,
    },
    {
      id: 'deal-002',
      title: 'Cloud Migration Strategy',
      deal_value: 180000,
      milestone_stage: 'Discovery',
      win_probability: 0.4,
      age_in_days: 12,
    },
    {
      id: 'deal-003',
      title: 'Global CRM Rollout',
      deal_value: 320000,
      milestone_stage: 'Solution Proposal',
      win_probability: 0.65,
      age_in_days: 20,
    },
    {
      id: 'deal-004',
      title: 'Cybersecurity Infrastructure Upgrade',
      deal_value: 95000,
      milestone_stage: 'Contract Negotiation',
      win_probability: 0.85,
      age_in_days: 35,
    },
    {
      id: 'deal-005',
      title: 'Analytics Platform Expansion',
      deal_value: 150000,
      milestone_stage: 'Closed Won',
      win_probability: 1.0,
      age_in_days: 45,
    },
  ];

  describe('Stage Styling & Helper Functions', () => {
    it('getStageStyle returns distinct color configurations per stage', () => {
      const qualStyle = getStageStyle('Qualification');
      expect(qualStyle.headerBorderTop).toContain('blue');

      const discStyle = getStageStyle('Discovery');
      expect(discStyle.headerBorderTop).toContain('indigo');

      const propStyle = getStageStyle('Solution Proposal');
      expect(propStyle.headerBorderTop).toContain('amber');

      const negStyle = getStageStyle('Contract Negotiation');
      expect(negStyle.headerBorderTop).toContain('purple');

      const wonStyle = getStageStyle('Closed Won');
      expect(wonStyle.headerBorderTop).toContain('emerald');

      const lostStyle = getStageStyle('Closed Lost');
      expect(lostStyle.headerBorderTop).toContain('rose');

      const customStyle = getStageStyle('Custom Custom Stage');
      expect(customStyle.headerBorderTop).toContain('slate');
    });

    it('DEFAULT_PIPELINE_STAGES contains expected standard stages', () => {
      expect(DEFAULT_PIPELINE_STAGES).toContain('Qualification');
      expect(DEFAULT_PIPELINE_STAGES).toContain('Discovery');
      expect(DEFAULT_PIPELINE_STAGES).toContain('Solution Proposal');
      expect(DEFAULT_PIPELINE_STAGES).toContain('Contract Negotiation');
      expect(DEFAULT_PIPELINE_STAGES).toContain('Closed Won');
      expect(DEFAULT_PIPELINE_STAGES).toContain('Closed Lost');
    });
  });

  describe('Component Rendering [FR-001]', () => {
    it('renders visual board with stage columns and deal cards [FR-001]', () => {
      render(<Board deals={sampleDeals} />);

      const boardEl = screen.getByTestId('pipeline-board');
      expect(boardEl).toBeDefined();

      // Check column headers exist for default stages
      DEFAULT_PIPELINE_STAGES.forEach((stage) => {
        const header = screen.getByTestId(`column-header-${stage}`);
        expect(header.textContent).toBe(stage);
      });

      // Check deal cards are present in their respective columns
      expect(screen.getByTestId('deal-card-deal-001')).toBeDefined();
      expect(screen.getByTestId('deal-card-deal-002')).toBeDefined();
      expect(screen.getByTestId('deal-card-deal-003')).toBeDefined();
      expect(screen.getByTestId('deal-card-deal-004')).toBeDefined();
      expect(screen.getByTestId('deal-card-deal-005')).toBeDefined();
    });

    it('calculates and renders summary bar pipeline stats', () => {
      render(<Board deals={sampleDeals} />);

      const summaryDeals = screen.getByTestId('board-summary-deals');
      expect(summaryDeals.textContent).toContain('5');

      const summaryValue = screen.getByTestId('board-summary-value');
      expect(summaryValue.textContent).toContain('$995,000');

      const summaryWinRate = screen.getByTestId('board-summary-winrate');
      expect(summaryWinRate.textContent).toContain('62%');
    });

    it('renders column count badges and total column deal values', () => {
      render(<Board deals={sampleDeals} />);

      // Qualification column should have 1 deal worth $250,000
      const qualCount = screen.getByTestId('column-count-Qualification');
      expect(qualCount.textContent).toBe('1');

      const qualVal = screen.getByTestId('column-total-value-Qualification');
      expect(qualVal.textContent).toBe('$250,000');

      // Closed Lost column has 0 deals worth $0
      const lostCount = screen.getByTestId('column-count-Closed Lost');
      expect(lostCount.textContent).toBe('0');

      const lostVal = screen.getByTestId('column-total-value-Closed Lost');
      expect(lostVal.textContent).toBe('$0');
    });

    it('renders "No deals in this stage" empty state placeholder for empty columns', () => {
      render(<Board deals={sampleDeals} />);

      const emptyLostPlaceholder = screen.getByTestId('column-empty-Closed Lost');
      expect(emptyLostPlaceholder).toBeDefined();
      expect(emptyLostPlaceholder.textContent).toContain('No deals in this stage');
    });

    it('renders loading skeleton cards when isLoading is true', () => {
      render(<Board deals={[]} isLoading={true} />);

      expect(screen.getByTestId('column-skeleton-0')).toBeDefined();
      expect(screen.getByTestId('column-skeleton-1')).toBeDefined();
    });
  });

  describe('Search & Filtering', () => {
    it('filters deals by search query', () => {
      render(<Board deals={sampleDeals} />);

      const searchInput = screen.getByTestId('board-search-input');
      fireEvent.change(searchInput, { target: { value: 'Enterprise' } });

      // Deal 001 should be visible, others filtered out from count summary
      const summaryDeals = screen.getByTestId('board-summary-deals');
      expect(summaryDeals.textContent).toContain('1');

      expect(screen.getByText('Enterprise ERP Modernization')).toBeDefined();
      expect(screen.queryByText('Cloud Migration Strategy')).toBeNull();
    });

    it('clears search input when clear button is clicked', () => {
      render(<Board deals={sampleDeals} />);

      const searchInput = screen.getByTestId('board-search-input');
      fireEvent.change(searchInput, { target: { value: 'Enterprise' } });

      const clearBtn = screen.getByLabelText('Clear search query');
      fireEvent.click(clearBtn);

      const summaryDeals = screen.getByTestId('board-summary-deals');
      expect(summaryDeals.textContent).toContain('5');
    });
  });

  describe('Stage Transitions & Interaction [FR-003, NFR-001]', () => {
    it('updates deal stage via Move Stage dropdown selector [FR-003]', async () => {
      const handleStageChange = vi.fn().mockResolvedValue(undefined);

      render(<Board deals={sampleDeals} onStageChange={handleStageChange} />);

      // Open Move Stage menu for deal-001 (currently Qualification)
      const moveBtn = screen.getByTestId('move-stage-btn-deal-001');
      fireEvent.click(moveBtn);

      const menu = screen.getByTestId('move-stage-menu-deal-001');
      expect(menu).toBeDefined();

      // Select 'Discovery' option
      const discoveryOpt = screen.getByTestId('move-option-deal-001-Discovery');
      fireEvent.click(discoveryOpt);

      expect(handleStageChange).toHaveBeenCalledWith('deal-001', 'Discovery');

      // Optimistic update should move deal-001 to Discovery
      await waitFor(() => {
        const discCount = screen.getByTestId('column-count-Discovery');
        expect(discCount.textContent).toBe('2');
      });
    });

    it('handles drag-and-drop stage updates [FR-003, NFR-001]', async () => {
      const handleStageChange = vi.fn().mockResolvedValue(undefined);

      render(<Board deals={sampleDeals} onStageChange={handleStageChange} />);

      const dealCard = screen.getByTestId('deal-card-deal-001');
      const targetColumn = screen.getByTestId('stage-column-Solution Proposal');

      // Drag start
      const dataTransfer = {
        setData: vi.fn(),
        getData: vi.fn().mockReturnValue('deal-001'),
        effectAllowed: '',
        dropEffect: '',
      };

      fireEvent.dragStart(dealCard, { dataTransfer });
      expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'deal-001');

      // Drag over
      fireEvent.dragOver(targetColumn, { dataTransfer });

      // Drop
      fireEvent.drop(targetColumn, { dataTransfer });

      expect(handleStageChange).toHaveBeenCalledWith('deal-001', 'Solution Proposal');

      await waitFor(() => {
        const proposalCount = screen.getByTestId('column-count-Solution Proposal');
        expect(proposalCount.textContent).toBe('2');
      });
    });

    it('reverts optimistic stage change on API failure and displays toast notification', async () => {
      const handleStageChange = vi
        .fn()
        .mockRejectedValue(new Error('Network connection timeout'));

      render(<Board deals={sampleDeals} onStageChange={handleStageChange} />);

      const moveBtn = screen.getByTestId('move-stage-btn-deal-001');
      fireEvent.click(moveBtn);

      const discoveryOpt = screen.getByTestId('move-option-deal-001-Discovery');
      fireEvent.click(discoveryOpt);

      // Verify callback was called
      expect(handleStageChange).toHaveBeenCalledWith('deal-001', 'Discovery');

      // Verify toast error message is displayed
      await waitFor(() => {
        const toastEl = screen.getByTestId('board-toast-notification');
        expect(toastEl.textContent).toContain('Network connection timeout');
      });

      // Verify deal reverted back to Qualification (qual count remains 1)
      const qualCount = screen.getByTestId('column-count-Qualification');
      expect(qualCount.textContent).toBe('1');
    });

    it('triggers onDealSelect when a deal card is clicked', () => {
      const handleSelect = vi.fn();

      render(<Board deals={sampleDeals} onDealSelect={handleSelect} />);

      const dealCard = screen.getByTestId('deal-card-deal-001');
      fireEvent.click(dealCard);

      expect(handleSelect).toHaveBeenCalledWith(sampleDeals[0]);
    });

    it('triggers onAddDeal when Add Deal button is clicked', () => {
      const handleAdd = vi.fn();

      render(<Board deals={sampleDeals} onAddDeal={handleAdd} />);

      const addBtn = screen.getByTestId('board-add-deal-btn');
      fireEvent.click(addBtn);

      expect(handleAdd).toHaveBeenCalled();
    });
  });
});
