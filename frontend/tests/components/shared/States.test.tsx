import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  LoadingState,
  EmptyState,
  LoadingSpinner,
  EmptyStateIcon,
} from '../../../src/components/shared/States';

describe('States components', () => {
  describe('LoadingSpinner', () => {
    it('renders with default size md (32px) and default test id', () => {
      render(<LoadingSpinner />);
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toBeDefined();
      expect(spinner.getAttribute('width')).toBe('32');
      expect(spinner.getAttribute('height')).toBe('32');
      expect(spinner.getAttribute('aria-hidden')).toBe('true');
    });

    it('supports preset sizes sm and lg, and numeric size', () => {
      const { rerender } = render(<LoadingSpinner size="sm" />);
      let spinner = screen.getByTestId('loading-spinner');
      expect(spinner.getAttribute('width')).toBe('20');

      rerender(<LoadingSpinner size="lg" />);
      spinner = screen.getByTestId('loading-spinner');
      expect(spinner.getAttribute('width')).toBe('48');

      rerender(<LoadingSpinner size={64} />);
      spinner = screen.getByTestId('loading-spinner');
      expect(spinner.getAttribute('width')).toBe('64');
    });
  });

  describe('LoadingState', () => {
    it('renders default loading message and spinner', () => {
      render(<LoadingState />);
      const loadingState = screen.getByTestId('loading-state');
      expect(loadingState).toBeDefined();
      expect(screen.getByText('Loading...')).toBeDefined();
      expect(screen.getByTestId('loading-spinner')).toBeDefined();
    });

    it('has semantic role="status", aria-live="polite", and aria-busy="true"', () => {
      render(<LoadingState message="Fetching contacts..." />);
      const statusElement = screen.getByRole('status');
      expect(statusElement).toBeDefined();
      expect(statusElement.getAttribute('aria-live')).toBe('polite');
      expect(statusElement.getAttribute('aria-busy')).toBe('true');
      expect(statusElement.getAttribute('aria-label')).toBe('Fetching contacts...');
    });

    it('renders custom message and description with accessible aria-describedby', () => {
      render(
        <LoadingState
          message="Loading companies"
          description="Please wait while we sync database records."
        />
      );

      expect(screen.getByText('Loading companies')).toBeDefined();
      expect(screen.getByText('Please wait while we sync database records.')).toBeDefined();

      const statusElement = screen.getByRole('status');
      const describedById = statusElement.getAttribute('aria-describedby');
      expect(describedById).toBeTruthy();

      const descElement = document.getElementById(describedById!);
      expect(descElement).not.toBeNull();
      expect(descElement?.textContent).toBe('Please wait while we sync database records.');
    });

    it('renders custom spinner override when provided', () => {
      render(
        <LoadingState
          spinner={<span data-testid="custom-spinner">Custom Loading...</span>}
        />
      );

      expect(screen.getByTestId('custom-spinner')).toBeDefined();
      expect(screen.queryByTestId('loading-spinner')).toBeNull();
    });

    it('applies fullPage styling when fullPage is true', () => {
      render(<LoadingState fullPage={true} />);
      const loadingState = screen.getByTestId('loading-state');
      expect(loadingState.style.minHeight).toBe('60vh');
    });

    it('accepts custom role and aria-live props', () => {
      render(<LoadingState role="alert" ariaLive="assertive" message="Critical load" />);
      const alertElement = screen.getByRole('alert');
      expect(alertElement.getAttribute('aria-live')).toBe('assertive');
    });

    it('handles size="sm" and size="lg" minHeight styling', () => {
      const { rerender } = render(<LoadingState size="sm" />);
      let loadingState = screen.getByTestId('loading-state');
      expect(loadingState.style.minHeight).toBe('60px');

      rerender(<LoadingState size="lg" />);
      loadingState = screen.getByTestId('loading-state');
      expect(loadingState.style.minHeight).toBe('200px');
    });
  });

  describe('EmptyStateIcon', () => {
    it('renders with default size 48 and aria-hidden="true"', () => {
      render(<EmptyStateIcon />);
      const icon = screen.getByTestId('empty-state-icon');
      expect(icon).toBeDefined();
      expect(icon.getAttribute('width')).toBe('48');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('EmptyState', () => {
    it('renders with default title "No items found" and default icon', () => {
      render(<EmptyState />);
      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState).toBeDefined();

      const title = screen.getByTestId('empty-state-title');
      expect(title.textContent).toBe('No items found');
      expect(screen.getByTestId('empty-state-icon')).toBeDefined();
    });

    it('has role="region" and aria-labelledby pointing to title ID', () => {
      render(<EmptyState title="No leads available" />);
      const region = screen.getByRole('region');
      expect(region).toBeDefined();

      const labelledById = region.getAttribute('aria-labelledby');
      expect(labelledById).toBeTruthy();

      const titleElement = document.getElementById(labelledById!);
      expect(titleElement).not.toBeNull();
      expect(titleElement?.textContent).toBe('No leads available');
    });

    it('renders custom title and description with aria-describedby', () => {
      render(
        <EmptyState
          title="No Companies Found"
          description="Create your first company record to start tracking interactions."
        />
      );

      expect(screen.getByText('No Companies Found')).toBeDefined();
      expect(
        screen.getByText('Create your first company record to start tracking interactions.')
      ).toBeDefined();

      const region = screen.getByRole('region');
      const describedById = region.getAttribute('aria-describedby');
      expect(describedById).toBeTruthy();

      const descElement = document.getElementById(describedById!);
      expect(descElement?.textContent).toBe(
        'Create your first company record to start tracking interactions.'
      );
    });

    it('uses message prop as title if title is omitted', () => {
      render(<EmptyState message="No tasks due today" />);
      expect(screen.getByTestId('empty-state-title').textContent).toBe('No tasks due today');
    });

    it('hides icon when hideIcon is true', () => {
      render(<EmptyState title="Empty list" hideIcon={true} />);
      expect(screen.queryByTestId('empty-state-icon')).toBeNull();
    });

    it('renders custom icon when provided', () => {
      render(
        <EmptyState
          title="No tasks"
          icon={<span data-testid="custom-icon">Inline Icon</span>}
        />
      );

      expect(screen.getByTestId('custom-icon')).toBeDefined();
      expect(screen.queryByTestId('empty-state-icon')).toBeNull();
    });

    it('renders primary action button with actionLabel and fires onAction on click', () => {
      const handleAction = vi.fn();
      render(
        <EmptyState
          title="No contacts"
          actionLabel="Add Contact"
          onAction={handleAction}
        />
      );

      const actionButton = screen.getByTestId('empty-state-action');
      expect(actionButton.textContent).toBe('Add Contact');

      fireEvent.click(actionButton);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('renders custom action and secondaryAction nodes', () => {
      render(
        <EmptyState
          title="No leads"
          action={<button data-testid="custom-primary-btn">New Lead</button>}
          secondaryAction={<button data-testid="custom-secondary-btn">Import CSV</button>}
        />
      );

      expect(screen.getByTestId('custom-primary-btn')).toBeDefined();
      expect(screen.getByTestId('custom-secondary-btn')).toBeDefined();
    });

    it('does not rely on color alone (renders icon, title text, and dashed border styling)', () => {
      render(<EmptyState title="No items available" />);

      const emptyState = screen.getByTestId('empty-state');
      expect(screen.getByTestId('empty-state-title').textContent).toBe('No items available');
      expect(screen.getByTestId('empty-state-icon')).toBeDefined();
      expect(emptyState.style.border).toBeDefined();
      expect(emptyState.style.border).not.toBe('');
    });

    it('accepts custom className and style props', () => {
      render(
        <EmptyState
          title="Custom empty state"
          className="custom-empty-class"
          style={{ padding: '20px' }}
        />
      );

      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState.classList.contains('custom-empty-class')).toBe(true);
      expect(emptyState.style.padding).toBe('20px');
    });
  });
});
