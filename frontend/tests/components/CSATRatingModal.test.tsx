import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  CSATRatingModal,
  CSAT_RATING_OPTIONS,
  formatSubmittedAt,
  getRatingOption,
} from '../../src/components/support/CSATRatingModal';
import { supportService, CSATRating } from '../../src/services/support';

// Mock supportService
vi.mock('../../src/services/support', async () => {
  const actual = await vi.importActual('../../src/services/support');
  return {
    ...actual,
    supportService: {
      ...actual.supportService,
      submitCSAT: vi.fn(),
      getCSAT: vi.fn(),
    },
  };
});

describe('CSATRatingModal Component & Helper Functions', () => {
  const mockTicketId = 'tkt-csat-999';
  const mockSubject = 'VPN Connectivity Issue';

  const mockCSATRating: CSATRating = {
    id: 'csat-123',
    ticket_id: mockTicketId,
    score: 5,
    feedback_text: 'Support agent resolved my issue within minutes!',
    submitted_at: '2026-10-06T12:30:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pure Helper Functions', () => {
    it('getRatingOption returns correct rating options for 1-5', () => {
      expect(getRatingOption(1)?.label).toBe('Very Dissatisfied');
      expect(getRatingOption(2)?.label).toBe('Dissatisfied');
      expect(getRatingOption(3)?.label).toBe('Neutral');
      expect(getRatingOption(4)?.label).toBe('Satisfied');
      expect(getRatingOption(5)?.label).toBe('Very Satisfied');

      expect(getRatingOption(0)).toBeUndefined();
      expect(getRatingOption(6)).toBeUndefined();
      expect(getRatingOption(-2)).toBeUndefined();
    });

    it('formatSubmittedAt formats date strings correctly', () => {
      expect(formatSubmittedAt(null)).toBe('Recently');
      expect(formatSubmittedAt(undefined)).toBe('Recently');
      const formatted = formatSubmittedAt('2026-10-06T12:30:00Z');
      expect(formatted).toContain('2026');
      expect(formatSubmittedAt('invalid-date')).toBe('invalid-date');
    });
  });

  describe('Modal Rendering & Visibility', () => {
    it('renders null when isOpen is false', () => {
      const { container } = render(
        <CSATRatingModal ticketId={mockTicketId} isOpen={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders modal dialog structure when isOpen is true', () => {
      render(
        <CSATRatingModal
          ticketId={mockTicketId}
          ticketSubject={mockSubject}
          isOpen={true}
        />
      );

      expect(screen.getByTestId('csat-rating-modal')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Customer Satisfaction Survey')).toBeInTheDocument();
      expect(screen.getByText(mockSubject)).toBeInTheDocument();
      expect(screen.getByTestId('csat-no-rating-label')).toHaveTextContent('Select a star rating');
    });
  });

  describe('Star Rating Interactions', () => {
    it('updates selected rating option label on clicking stars', () => {
      render(<CSATRatingModal ticketId={mockTicketId} isOpen={true} />);

      const star4 = screen.getByTestId('csat-star-4');
      fireEvent.click(star4);

      const activeLabel = screen.getByTestId('csat-active-rating-label');
      expect(activeLabel).toHaveTextContent('4 - Satisfied');
    });

    it('shows hover score on star mouseover', () => {
      render(<CSATRatingModal ticketId={mockTicketId} isOpen={true} />);

      const star5 = screen.getByTestId('csat-star-5');
      fireEvent.mouseEnter(star5);

      const activeLabel = screen.getByTestId('csat-active-rating-label');
      expect(activeLabel).toHaveTextContent('5 - Very Satisfied');

      fireEvent.mouseLeave(star5);
      expect(screen.getByTestId('csat-no-rating-label')).toBeInTheDocument();
    });
  });

  describe('Validation & Form Submissions', () => {
    it('prevents submission and displays validation error if no score is selected', async () => {
      const handleSubmitError = vi.fn();

      render(
        <CSATRatingModal
          ticketId={mockTicketId}
          isOpen={true}
          onSubmitError={handleSubmitError}
        />
      );

      // Submit button is disabled when score === 0, but form submission manually triggered
      const form = screen.getByTestId('csat-form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByTestId('csat-validation-error')).toHaveTextContent(
          'Please select a rating score from 1 to 5 stars before submitting.'
        );
      });

      expect(supportService.submitCSAT).not.toHaveBeenCalled();
    });

    it('successfully submits CSAT rating via supportService default handler', async () => {
      (supportService.submitCSAT as any).mockResolvedValue(mockCSATRating);
      const handleSubmitSuccess = vi.fn();
      const handleClose = vi.fn();

      render(
        <CSATRatingModal
          ticketId={mockTicketId}
          ticketSubject={mockSubject}
          isOpen={true}
          onSubmitSuccess={handleSubmitSuccess}
          onClose={handleClose}
        />
      );

      // Select 5 stars
      fireEvent.click(screen.getByTestId('csat-star-5'));

      // Enter optional feedback text
      const textarea = screen.getByTestId('csat-feedback-textarea');
      fireEvent.change(textarea, {
        target: { value: 'Support agent resolved my issue within minutes!' },
      });

      // Submit form
      const submitButton = screen.getByTestId('csat-submit-button');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(supportService.submitCSAT).toHaveBeenCalledWith(mockTicketId, {
          score: 5,
          feedback_text: 'Support agent resolved my issue within minutes!',
        });
        expect(handleSubmitSuccess).toHaveBeenCalledWith(mockCSATRating);
      });

      // Assert success screen is displayed
      expect(screen.getByTestId('csat-success-container')).toBeInTheDocument();
      expect(screen.getByText('Rating Submitted Successfully!')).toBeInTheDocument();

      // Click Done button
      const doneBtn = screen.getByTestId('csat-done-button');
      fireEvent.click(doneBtn);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('supports custom injected onSubmit handler (Dependency Injection NFR-4)', async () => {
      const customSubmit = vi.fn().mockResolvedValue(mockCSATRating);

      render(
        <CSATRatingModal
          ticketId={mockTicketId}
          isOpen={true}
          onSubmit={customSubmit}
          initialScore={4}
        />
      );

      const form = screen.getByTestId('csat-form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(customSubmit).toHaveBeenCalledWith(mockTicketId, {
          score: 4,
          feedback_text: null,
        });
      });
      expect(supportService.submitCSAT).not.toHaveBeenCalled();
    });

    it('handles server submission failure gracefully', async () => {
      const mockError = new Error('Rating failed. Ticket must be resolved before rating.');
      (supportService.submitCSAT as any).mockRejectedValue(mockError);
      const handleSubmitError = vi.fn();

      render(
        <CSATRatingModal
          ticketId={mockTicketId}
          isOpen={true}
          initialScore={3}
          onSubmitError={handleSubmitError}
        />
      );

      const form = screen.getByTestId('csat-form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByTestId('csat-server-error')).toHaveTextContent(
          'Rating failed. Ticket must be resolved before rating.'
        );
        expect(handleSubmitError).toHaveBeenCalledWith(mockError);
      });
    });
  });

  describe('Existing Rating & Read-Only Display Mode', () => {
    it('renders existing rating in completed state directly', () => {
      render(
        <CSATRatingModal
          ticketId={mockTicketId}
          isOpen={true}
          existingRating={mockCSATRating}
        />
      );

      expect(screen.getByTestId('csat-success-container')).toBeInTheDocument();
      expect(screen.getByText('Rating Submitted Successfully!')).toBeInTheDocument();
      expect(screen.getByText('5 / 5')).toBeInTheDocument();
      expect(screen.getByText(`"${mockCSATRating.feedback_text}"`)).toBeInTheDocument();
    });

    it('disables rating input when readOnly is true', () => {
      render(
        <CSATRatingModal
          ticketId={mockTicketId}
          isOpen={true}
          readOnly={true}
          initialScore={2}
        />
      );

      expect(screen.queryByTestId('csat-submit-button')).not.toBeInTheDocument();
      const textarea = screen.getByTestId('csat-feedback-textarea');
      expect(textarea).toBeDisabled();
    });
  });

  describe('Modal Dismiss & Keyboard Accessibility', () => {
    it('calls onClose when close X button or Cancel button is clicked', () => {
      const handleClose = vi.fn();
      render(
        <CSATRatingModal ticketId={mockTicketId} isOpen={true} onClose={handleClose} />
      );

      const closeX = screen.getByTestId('csat-modal-close-button');
      fireEvent.click(closeX);
      expect(handleClose).toHaveBeenCalledTimes(1);

      const cancelBtn = screen.getByTestId('csat-cancel-button');
      fireEvent.click(cancelBtn);
      expect(handleClose).toHaveBeenCalledTimes(2);
    });

    it('triggers onClose when Escape key is pressed', () => {
      const handleClose = vi.fn();
      render(
        <CSATRatingModal ticketId={mockTicketId} isOpen={true} onClose={handleClose} />
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('triggers onClose when clicking backdrop overlay if closeOnBackdropClick is true', () => {
      const handleClose = vi.fn();
      render(
        <CSATRatingModal
          ticketId={mockTicketId}
          isOpen={true}
          onClose={handleClose}
          closeOnBackdropClick={true}
        />
      );

      const backdrop = screen.getByTestId('csat-rating-modal');
      fireEvent.click(backdrop);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
