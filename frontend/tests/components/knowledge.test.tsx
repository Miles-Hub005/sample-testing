import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SearchFilters } from '../../src/components/knowledge/SearchFilters';
import { PlaybookProgress } from '../../src/components/knowledge/PlaybookProgress';
import { MediaPlayer, formatTime, formatFileSize } from '../../src/components/knowledge/MediaPlayer';

describe('Knowledge Repository UI Components [FR-1 - FR-8, NFR-1 - NFR-3]', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. SearchFilters Component Tests [FR-1, FR-2, FR-7, FR-8]
  // ==========================================================================
  describe('SearchFilters Component', () => {
    const mockCategories = [
      { id: 'cat-1', name: 'RBAC & Security', description: 'Access control docs' },
      { id: 'cat-2', name: 'Multi-Tenancy', description: 'Tenant isolation' },
    ];

    const mockTags = [
      { id: 'tag-1', name: 'RBAC' },
      { id: 'tag-2', name: 'FastAPI' },
    ];

    it('renders search input field, category options, content type chips, and tag buttons', () => {
      render(
        <SearchFilters
          searchQuery=""
          categories={mockCategories}
          tags={mockTags}
        />
      );

      // Search input field
      const searchInput = screen.getByPlaceholderText(/search articles by title/i);
      expect(searchInput).toBeInTheDocument();

      // Content type filter options
      expect(screen.getByText('All Types')).toBeInTheDocument();
      expect(screen.getByText('FAQ')).toBeInTheDocument();
      expect(screen.getByText('Playbook')).toBeInTheDocument();
      expect(screen.getByText('Best Practice')).toBeInTheDocument();
      expect(screen.getByText('Training Video')).toBeInTheDocument();

      // Categories select box
      expect(screen.getByText('RBAC & Security')).toBeInTheDocument();
      expect(screen.getByText('Multi-Tenancy')).toBeInTheDocument();

      // Tags
      expect(screen.getByText('#RBAC')).toBeInTheDocument();
      expect(screen.getByText('#FastAPI')).toBeInTheDocument();
    });

    it('invokes onSearchChange callback when user types in search input', () => {
      const onSearchChange = vi.fn();
      render(<SearchFilters searchQuery="" onSearchChange={onSearchChange} />);

      const searchInput = screen.getByPlaceholderText(/search articles by title/i);
      fireEvent.change(searchInput, { target: { value: 'authentication' } });

      expect(onSearchChange).toHaveBeenCalledWith('authentication');
    });

    it('invokes onContentTypeChange when user clicks a content type chip', () => {
      const onContentTypeChange = vi.fn();
      render(
        <SearchFilters
          selectedContentType={null}
          onContentTypeChange={onContentTypeChange}
        />
      );

      const playbookChip = screen.getByText('Playbook');
      fireEvent.click(playbookChip);

      expect(onContentTypeChange).toHaveBeenCalledWith('Playbook');
    });

    it('invokes onCategoryChange when user selects a category from dropdown', () => {
      const onCategoryChange = vi.fn();
      render(
        <SearchFilters
          categories={mockCategories}
          selectedCategory={null}
          onCategoryChange={onCategoryChange}
        />
      );

      const selectBox = screen.getByLabelText(/filter articles by category/i);
      fireEvent.change(selectBox, { target: { value: 'cat-2' } });

      expect(onCategoryChange).toHaveBeenCalledWith('cat-2');
    });

    it('invokes onTagToggle when user clicks a tag button', () => {
      const onTagToggle = vi.fn();
      render(<SearchFilters tags={mockTags} onTagToggle={onTagToggle} />);

      const tagButton = screen.getByText('#FastAPI');
      fireEvent.click(tagButton);

      expect(onTagToggle).toHaveBeenCalledWith('tag-2');
    });

    it('displays active filter count and invokes onClearFilters when clear button clicked', () => {
      const onClearFilters = vi.fn();
      render(
        <SearchFilters
          searchQuery="search phrase"
          selectedContentType="FAQ"
          selectedCategory="cat-1"
          selectedTags={['tag-1']}
          onClearFilters={onClearFilters}
        />
      );

      expect(screen.getByText('4 active filters')).toBeInTheDocument();

      const clearBtn = screen.getByRole('button', { name: /clear all/i });
      fireEvent.click(clearBtn);

      expect(onClearFilters).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // 2. PlaybookProgress Component Tests [FR-3, FR-4]
  // ==========================================================================
  describe('PlaybookProgress Component', () => {
    const mockSteps = [
      {
        id: 'step-1',
        article_id: 'art-101',
        step_number: 1,
        title: 'Initial Security Setup',
        content: 'Configure environment secret parameters in backend/src/lib/config.py',
        checkpoint_instructions: 'Ensure no hardcoded credentials exist.',
      },
      {
        id: 'step-2',
        article_id: 'art-101',
        step_number: 2,
        title: 'Database Schema Initialization',
        content: 'Execute Base.metadata.create_all inside lifespan startup handler',
        checkpoint_instructions: 'Verify tables created in SQLite test database.',
      },
    ];

    it('renders step sequence, titles, execution content, and checkpoint verification', () => {
      render(<PlaybookProgress steps={mockSteps} completedStepIds={[]} />);

      expect(screen.getByText('Initial Security Setup')).toBeInTheDocument();
      expect(screen.getByText('Database Schema Initialization')).toBeInTheDocument();
      expect(
        screen.getByText(/configure environment secret parameters/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/ensure no hardcoded credentials exist/i)
      ).toBeInTheDocument();

      // Progress bar percentage
      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText('0 of 2 steps completed')).toBeInTheDocument();
    });

    it('calculates completion percentage and highlights completed steps', () => {
      render(<PlaybookProgress steps={mockSteps} completedStepIds={['step-1']} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('1 of 2 steps completed')).toBeInTheDocument();

      // Verify completion badge button on step 1
      const completedBadges = screen.getAllByText('Completed');
      expect(completedBadges.length).toBeGreaterThan(0);
    });

    it('invokes onToggleStep callback when user toggles step completion button', async () => {
      const onToggleStep = vi.fn();
      render(
        <PlaybookProgress
          steps={mockSteps}
          completedStepIds={[]}
          onToggleStep={onToggleStep}
        />
      );

      const markCompleteButtons = screen.getAllByRole('button', {
        name: /mark step 1 as completed/i,
      });
      fireEvent.click(markCompleteButtons[0]);

      expect(onToggleStep).toHaveBeenCalledWith('step-1', false);
    });

    it('displays loading state spinner when step is updating', () => {
      render(
        <PlaybookProgress
          steps={mockSteps}
          completedStepIds={[]}
          isUpdatingStepId="step-2"
        />
      );

      // Button for step 2 should be disabled while updating
      const step2Button = screen.getByRole('button', {
        name: /mark step 2 as completed/i,
      });
      expect(step2Button).toBeDisabled();
    });
  });

  // ==========================================================================
  // 3. MediaPlayer Component Tests [FR-5, FR-6]
  // ==========================================================================
  describe('MediaPlayer Component', () => {
    const mockAttachments = [
      {
        id: 'att-1',
        article_id: 'art-202',
        file_name: 'Architecture_Guide.pdf',
        file_url: 'https://cdn.example.com/docs/Architecture_Guide.pdf',
        file_size_bytes: 2048000, // ~2 MB
        created_at: '2026-10-06T08:00:00Z',
      },
    ];

    it('renders video fallback box when videoUrl is not provided', () => {
      render(
        <MediaPlayer
          videoUrl={null}
          title="Onboarding Video Stream"
          attachments={mockAttachments}
        />
      );

      expect(screen.getByText('No Video Stream Available')).toBeInTheDocument();
      expect(
        screen.getByText('No video stream URL is attached to this training module.')
      ).toBeInTheDocument();
    });

    it('renders downloadable technical documentation attachments list', () => {
      render(
        <MediaPlayer
          videoUrl="https://cdn.example.com/video.mp4"
          attachments={mockAttachments}
        />
      );

      expect(screen.getByText('Architecture_Guide.pdf')).toBeInTheDocument();
      expect(screen.getByText('2 MB')).toBeInTheDocument();

      const downloadLink = screen.getByText('Architecture_Guide.pdf').closest('a');
      expect(downloadLink).toHaveAttribute(
        'href',
        'https://cdn.example.com/docs/Architecture_Guide.pdf'
      );
    });

    it('formats time correctly using formatTime helper', () => {
      expect(formatTime(0)).toBe('00:00');
      expect(formatTime(65)).toBe('01:05');
      expect(formatTime(3665)).toBe('01:01:05');
    });

    it('formats file size correctly using formatFileSize helper', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(2097152)).toBe('2 MB');
    });
  });
});
