'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  CSATRating,
  CSATRatingInput,
  supportService,
} from '../../services/support';

// ============================================================================
// Types & Interfaces [FR-9, NFR-2, NFR-4]
// ============================================================================

export interface RatingOption {
  score: number;
  label: string;
  shortLabel: string;
}

export const CSAT_RATING_OPTIONS: readonly RatingOption[] = [
  { score: 1, label: 'Very Dissatisfied', shortLabel: 'Poor' },
  { score: 2, label: 'Dissatisfied', shortLabel: 'Fair' },
  { score: 3, label: 'Neutral', shortLabel: 'Good' },
  { score: 4, label: 'Satisfied', shortLabel: 'Very Good' },
  { score: 5, label: 'Very Satisfied', shortLabel: 'Excellent' },
] as const;

export interface CSATRatingModalProps {
  /**
   * Support ticket identifier for CSAT rating submission. Required.
   */
  ticketId: string;

  /**
   * Optional ticket subject or title for contextual survey header.
   */
  ticketSubject?: string;

  /**
   * Controls whether the modal dialog is rendered and visible. Defaults to true.
   */
  isOpen?: boolean;

  /**
   * Callback invoked when the modal dialog is closed or dismissed.
   */
  onClose?: () => void;

  /**
   * Callback invoked when CSAT rating is successfully submitted.
   */
  onSubmitSuccess?: (rating: CSATRating) => void;

  /**
   * Callback invoked when CSAT rating submission fails.
   */
  onSubmitError?: (error: Error | string) => void;

  /**
   * Custom submission handler for dependency injection (overrides supportService.submitCSAT).
   */
  onSubmit?: (ticketId: string, payload: CSATRatingInput) => Promise<CSATRating>;

  /**
   * Existing CSAT rating object if already rated (renders completed read-only state).
   */
  existingRating?: CSATRating | null;

  /**
   * Initial rating score pre-selected (1–5).
   */
  initialScore?: number;

  /**
   * Initial feedback text pre-filled.
   */
  initialFeedback?: string;

  /**
   * Read-only display mode flag. When true, prevents modification or submission.
   */
  readOnly?: boolean;

  /**
   * Whether clicking the backdrop overlay closes the modal. Defaults to true.
   */
  closeOnBackdropClick?: boolean;

  /**
   * Custom CSS container class overrides.
   */
  className?: string;

  /**
   * Custom data-testid attribute for testing.
   */
  'data-testid'?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Helper to retrieve rating description text from numerical score [FR-9].
 */
export function getRatingOption(score: number): RatingOption | undefined {
  if (score < 1 || score > 5) return undefined;
  return CSAT_RATING_OPTIONS.find((opt) => opt.score === Math.round(score));
}

/**
 * Format timestamp string cleanly for display [FR-9].
 */
export function formatSubmittedAt(dateString?: string | null): string {
  if (!dateString) return 'Recently';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

// ============================================================================
// CSATRatingModal Component [FR-9, NFR-2, NFR-4]
// ============================================================================

export function CSATRatingModal({
  ticketId,
  ticketSubject,
  isOpen = true,
  onClose,
  onSubmitSuccess,
  onSubmitError,
  onSubmit,
  existingRating = null,
  initialScore = 0,
  initialFeedback = '',
  readOnly = false,
  closeOnBackdropClick = true,
  className,
  'data-testid': testId = 'csat-rating-modal',
}: CSATRatingModalProps) {
  // Form State
  const [score, setScore] = useState<number>(() => {
    if (existingRating && typeof existingRating.score === 'number') {
      return existingRating.score;
    }
    return initialScore >= 1 && initialScore <= 5 ? initialScore : 0;
  });
  const [hoverScore, setHoverScore] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>(() => {
    if (existingRating && existingRating.feedback_text) {
      return existingRating.feedback_text;
    }
    return initialFeedback || '';
  });

  // Async Execution State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedRating, setSubmittedRating] = useState<CSATRating | null>(existingRating);
  const [submitted, setSubmitted] = useState<boolean>(Boolean(existingRating));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Refs for accessibility focus management
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Synchronize state when existingRating or initial values change
  useEffect(() => {
    if (existingRating) {
      setScore(existingRating.score || 0);
      setFeedbackText(existingRating.feedback_text || '');
      setSubmittedRating(existingRating);
      setSubmitted(true);
    }
  }, [existingRating]);

  // Focus trap and autofocus on modal open
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  // Handle Escape key press for accessible closing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && onClose && !submitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, submitting]);

  // Backdrop click handler
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && closeOnBackdropClick && onClose && !submitting) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose, submitting]
  );

  // Rating selection handler
  const handleSelectScore = useCallback(
    (selectedScore: number) => {
      if (readOnly || submitted) return;
      setScore(selectedScore);
      setValidationError(null);
      setErrorMessage(null);
    },
    [readOnly, submitted]
  );

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setValidationError(null);

    if (readOnly || submitted) return;

    if (!ticketId || !ticketId.trim()) {
      const errStr = 'Ticket ID is required to submit a CSAT rating.';
      setValidationError(errStr);
      if (onSubmitError) onSubmitError(new Error(errStr));
      return;
    }

    if (!score || score < 1 || score > 5) {
      const valErr = 'Please select a rating score from 1 to 5 stars before submitting.';
      setValidationError(valErr);
      return;
    }

    const payload: CSATRatingInput = {
      score,
      feedback_text: feedbackText.trim() ? feedbackText.trim() : null,
    };

    try {
      setSubmitting(true);
      const submitFn = onSubmit || supportService.submitCSAT;
      const result = await submitFn(ticketId.trim(), payload);

      setSubmittedRating(result);
      setSubmitted(true);
      if (onSubmitSuccess) {
        onSubmitSuccess(result);
      }
    } catch (err: any) {
      const errorObj = err instanceof Error ? err : new Error(err?.message || String(err));
      const msg = errorObj.message || 'Failed to submit CSAT rating. Please try again.';
      setErrorMessage(msg);
      if (onSubmitError) {
        onSubmitError(errorObj);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const activeOption = getRatingOption(hoverScore || score);
  const displayScore = hoverScore || score;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
      onClick={handleBackdropClick}
      data-testid={testId}
      role="dialog"
      aria-modal="true"
      aria-labelledby="csat-modal-title"
      aria-describedby="csat-modal-description"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-lg bg-[#fbf9f4] border border-[#d1c4b9] rounded-xl shadow-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#59452b]',
          className
        )}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 bg-[#f0eee9] border-b border-[#d1c4b9]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#59452b] text-white rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-[#f5d6b4]" />
            </div>
            <div>
              <h2
                id="csat-modal-title"
                className="text-xl font-serif font-medium text-[#1b1c19] tracking-tight"
              >
                {submitted ? 'Thank You for Your Feedback' : 'Customer Satisfaction Survey'}
              </h2>
              <p id="csat-modal-description" className="text-xs text-[#80756b] mt-0.5">
                {ticketSubject ? (
                  <span className="truncate max-w-xs inline-block align-bottom">
                    Ticket: <strong className="font-medium text-[#4e453d]">{ticketSubject}</strong>
                  </span>
                ) : (
                  <span>Ticket ID: {ticketId}</span>
                )}
              </p>
            </div>
          </div>

          {onClose && (
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="p-1.5 text-[#80756b] hover:text-[#1b1c19] hover:bg-[#eae8e3] rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#59452b] disabled:opacity-50"
              aria-label="Close survey modal"
              data-testid="csat-modal-close-button"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Submission Success View */}
          {submitted ? (
            <div
              className="py-4 text-center space-y-4"
              data-testid="csat-success-container"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-serif font-medium text-[#1b1c19]">
                  Rating Submitted Successfully!
                </h3>
                <p className="text-sm text-[#4e453d] max-w-sm mx-auto">
                  Your feedback helps us continuously improve our support service quality and response SLA.
                </p>
              </div>

              {/* Submitted Rating Summary Card */}
              <div className="bg-white border border-[#d1c4b9] rounded-lg p-4 text-left space-y-2 max-w-md mx-auto shadow-xs">
                <div className="flex items-center justify-between text-xs text-[#80756b] pb-2 border-b border-[#f0eee9]">
                  <span>Submitted Rating</span>
                  <span>{formatSubmittedAt(submittedRating?.submitted_at)}</span>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <div className="flex space-x-1" data-testid="submitted-stars">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <Star
                        key={`submitted-star-${starVal}`}
                        className={cn(
                          'w-5 h-5',
                          starVal <= (submittedRating?.score || score)
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-stone-300'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-[#1b1c19]">
                    {submittedRating?.score || score} / 5
                  </span>
                  {getRatingOption(submittedRating?.score || score) && (
                    <span className="text-xs bg-[#f0eee9] text-[#59452b] px-2 py-0.5 rounded font-medium">
                      {getRatingOption(submittedRating?.score || score)?.label}
                    </span>
                  )}
                </div>

                {(submittedRating?.feedback_text || feedbackText) && (
                  <div className="mt-2 text-xs text-[#4e453d] italic bg-[#fbf9f4] p-2.5 rounded border border-[#eae8e3]">
                    "{submittedRating?.feedback_text || feedbackText}"
                  </div>
                )}
              </div>

              {onClose && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#59452b] hover:bg-[#735c41] text-white font-medium text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#59452b] focus:ring-offset-2"
                    data-testid="csat-done-button"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Active Rating Input Form */
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="csat-form">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-[#1b1c19]">
                  How would you rate your support resolution experience?
                </p>
                <p className="text-xs text-[#80756b]">
                  Please select a score from 1 (Very Dissatisfied) to 5 (Very Satisfied).
                </p>
              </div>

              {/* Interactive Star Rating Selector */}
              <div className="flex flex-col items-center space-y-3 py-2">
                <div
                  className="flex items-center space-x-2"
                  role="radiogroup"
                  aria-label="CSAT Satisfaction Rating"
                  data-testid="csat-star-rating-group"
                >
                  {[1, 2, 3, 4, 5].map((starVal) => {
                    const isSelectedOrHovered = starVal <= displayScore;
                    const optionInfo = getRatingOption(starVal);

                    return (
                      <button
                        key={`star-button-${starVal}`}
                        type="button"
                        disabled={readOnly || submitting}
                        onClick={() => handleSelectScore(starVal)}
                        onMouseEnter={() => !readOnly && setHoverScore(starVal)}
                        onMouseLeave={() => !readOnly && setHoverScore(0)}
                        className={cn(
                          'p-2 rounded-full transition-all duration-150 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#59452b]',
                          isSelectedOrHovered
                            ? 'text-amber-500'
                            : 'text-stone-300 hover:text-amber-300'
                        )}
                        role="radio"
                        aria-checked={score === starVal}
                        aria-label={`Rate ${starVal} out of 5 stars - ${optionInfo?.label}`}
                        data-testid={`csat-star-${starVal}`}
                      >
                        <Star
                          className={cn(
                            'w-8 h-8 sm:w-9 sm:h-9 transition-colors',
                            isSelectedOrHovered ? 'fill-amber-400' : 'fill-transparent'
                          )}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Selected Rating Score Label */}
                <div className="h-6 flex items-center justify-center">
                  {activeOption ? (
                    <span
                      className="text-xs font-semibold uppercase tracking-wider text-[#59452b] bg-[#f0eee9] px-3 py-1 rounded-full border border-[#d1c4b9]"
                      data-testid="csat-active-rating-label"
                    >
                      {activeOption.score} - {activeOption.label}
                    </span>
                  ) : (
                    <span className="text-xs text-[#80756b] italic" data-testid="csat-no-rating-label">
                      Select a star rating
                    </span>
                  )}
                </div>
              </div>

              {/* Validation & Server Error Messages */}
              {validationError && (
                <div
                  className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs"
                  data-testid="csat-validation-error"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {errorMessage && (
                <div
                  className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-xs"
                  data-testid="csat-server-error"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Feedback Textarea Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="csat-feedback-text"
                  className="flex items-center space-x-1 text-xs font-medium text-[#1b1c19]"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#59452b]" />
                  <span>Additional Feedback / Comments (Optional)</span>
                </label>
                <textarea
                  id="csat-feedback-text"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  disabled={readOnly || submitting}
                  rows={3}
                  maxLength={1000}
                  placeholder="What went well or how can we improve our support quality?"
                  className="w-full p-3 text-xs bg-white text-[#1b1c19] border border-[#d1c4b9] rounded-md shadow-xs placeholder-[#80756b] focus:outline-none focus:ring-2 focus:ring-[#59452b] focus:border-[#59452b] disabled:bg-[#f0eee9] disabled:cursor-not-allowed resize-none"
                  data-testid="csat-feedback-textarea"
                />
                <div className="flex justify-between text-[11px] text-[#80756b]">
                  <span>Your feedback is shared directly with the support lead.</span>
                  <span>{feedbackText.length} / 1000</span>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2 border-t border-[#d1c4b9]">
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-medium text-[#4e453d] bg-[#f0eee9] hover:bg-[#eae8e3] border border-[#d1c4b9] rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#59452b] disabled:opacity-50"
                    data-testid="csat-cancel-button"
                  >
                    Cancel
                  </button>
                )}

                {!readOnly && (
                  <button
                    type="submit"
                    disabled={submitting || score === 0}
                    className={cn(
                      'flex items-center space-x-2 px-5 py-2 text-xs font-medium text-white bg-[#59452b] hover:bg-[#735c41] rounded-md transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-[#59452b] focus:ring-offset-2',
                      (submitting || score === 0) && 'opacity-60 cursor-not-allowed'
                    )}
                    data-testid="csat-submit-button"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Submit Rating</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
