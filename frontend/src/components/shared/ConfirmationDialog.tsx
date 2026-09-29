import React, { useEffect, useId, useRef } from 'react';
import { colors, radii, shadows, spacing, typography } from '../../lib/tokens';

export type ConfirmationDialogVariant = 'primary' | 'danger' | 'warning';

export interface ConfirmationDialogProps {
  /** Controls visibility of the modal dialog */
  isOpen: boolean;
  /** Dialog title text or node. Defaults to 'Confirm Action'. */
  title?: React.ReactNode;
  /** Primary body message or prompt text explaining the action */
  message?: React.ReactNode;
  /** Optional additional child elements rendered inside the body */
  children?: React.ReactNode;
  /** Label for the confirmation button. Defaults to 'Confirm'. */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to 'Cancel'. */
  cancelLabel?: string;
  /** Callback function executed when user clicks the Confirm button */
  onConfirm: () => void | Promise<void>;
  /** Callback function executed when user clicks Cancel, clicks backdrop, or presses Escape */
  onCancel: () => void;
  /** Visual theme for confirm button. 'danger' is recommended for destructive actions (e.g. deletion). Defaults to 'primary'. */
  variant?: ConfirmationDialogVariant;
  /** Shortcut boolean for variant="danger" */
  isDanger?: boolean;
  /** Disables action buttons and displays a loading state on the confirm button */
  isLoading?: boolean;
  /** Whether clicking the dark backdrop overlay triggers onCancel. Defaults to true. */
  closeOnBackdropClick?: boolean;
  /** Whether pressing the Escape key triggers onCancel. Defaults to true. */
  closeOnEscape?: boolean;
  /** Modal accessibility role. Defaults to 'alertdialog' if danger/warning variant, else 'dialog'. */
  role?: 'dialog' | 'alertdialog';
  /** Custom aria-label override if title is not a simple string */
  ariaLabel?: string;
  /** Custom element ID for aria-labelledby anchor */
  titleId?: string;
  /** Custom element ID for aria-describedby anchor */
  descriptionId?: string;
  /** Additional CSS class for the dialog card container */
  className?: string;
  /** Inline style overrides for the dialog card container */
  style?: React.CSSProperties;
}

/**
 * ConfirmationDialog component
 *
 * Provides a modal dialog window with backdrop, Cancel/Confirm action buttons,
 * and standard accessibility attributes (role="dialog" / role="alertdialog",
 * aria-modal="true", focus management, and Escape key handling).
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title = 'Confirm Action',
  message,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'primary',
  isDanger = false,
  isLoading = false,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  role,
  ariaLabel,
  titleId,
  descriptionId,
  className,
  style,
}) => {
  const generatedId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const resolvedVariant: ConfirmationDialogVariant = isDanger ? 'danger' : variant;
  const resolvedRole = role || (resolvedVariant === 'danger' || resolvedVariant === 'warning' ? 'alertdialog' : 'dialog');

  const resolvedTitleId = titleId || `confirmation-dialog-title-${generatedId}`;
  const resolvedDescriptionId = descriptionId || `confirmation-dialog-desc-${generatedId}`;

  // Focus cancel button or confirm button on mount/open
  useEffect(() => {
    if (isOpen) {
      // Small timeout ensures element is mounted in DOM
      const timer = setTimeout(() => {
        if (cancelButtonRef.current) {
          cancelButtonRef.current.focus();
        } else if (confirmButtonRef.current) {
          confirmButtonRef.current.focus();
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle Escape key press
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeOnEscape, isLoading, onCancel]);

  // Prevent background body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdropClick && !isLoading) {
      onCancel();
    }
  };

  const getConfirmButtonStyles = (): React.CSSProperties => {
    let bg = colors.accent.primary;
    let hoverBg = colors.accent.hover;

    if (resolvedVariant === 'danger') {
      bg = colors.secondary.main; // Sun-faded red / secondary
      hoverBg = colors.secondary.onContainer;
    } else if (resolvedVariant === 'warning') {
      bg = colors.warning.main;
      hoverBg = colors.warning.onContainer;
    }

    return {
      backgroundColor: bg,
      color: '#ffffff',
      border: 'none',
      borderRadius: radii.md,
      padding: `${spacing[2]} ${spacing[4]}`,
      fontFamily: typography.styles.labelCaps.fontFamily,
      fontSize: typography.styles.bodyMd.fontSize,
      fontWeight: '600',
      cursor: isLoading ? 'not-allowed' : 'pointer',
      opacity: isLoading ? 0.7 : 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[2],
      transition: 'background-color 0.15s ease, opacity 0.15s ease',
    };
  };

  const cancelBtnStyle: React.CSSProperties = {
    backgroundColor: colors.surface.containerLow,
    color: colors.surface.onSurface,
    border: `1px solid ${colors.surface.outlineVariant}`,
    borderRadius: radii.md,
    padding: `${spacing[2]} ${spacing[4]}`,
    fontFamily: typography.styles.bodyMd.fontFamily,
    fontSize: typography.styles.bodyMd.fontSize,
    fontWeight: '500',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    opacity: isLoading ? 0.6 : 1,
    transition: 'background-color 0.15s ease, border-color 0.15s ease',
  };

  return (
    <div
      data-testid="confirmation-dialog-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(27, 28, 25, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: spacing[4],
        boxSizing: 'border-box',
      }}
    >
      <div
        role={resolvedRole}
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        aria-describedby={message || children ? resolvedDescriptionId : undefined}
        aria-label={ariaLabel}
        className={className}
        data-testid="confirmation-dialog"
        style={{
          backgroundColor: colors.surface.containerLowest,
          borderRadius: radii.lg,
          boxShadow: shadows.lifted,
          border: `1px solid ${colors.surface.outlineVariant}`,
          padding: spacing[6],
          maxWidth: '480px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[4],
          boxSizing: 'border-box',
          ...style,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header / Title */}
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2
              id={resolvedTitleId}
              style={{
                margin: 0,
                fontFamily: typography.styles.headlineSm.fontFamily,
                fontSize: typography.styles.headlineSm.fontSize,
                fontWeight: typography.styles.headlineSm.fontWeight,
                color: resolvedVariant === 'danger' ? colors.secondary.main : colors.surface.onSurface,
                lineHeight: typography.styles.headlineSm.lineHeight,
              }}
            >
              {title}
            </h2>
          </div>
        )}

        {/* Content / Message */}
        {(message || children) && (
          <div
            id={resolvedDescriptionId}
            style={{
              fontFamily: typography.styles.bodyMd.fontFamily,
              fontSize: typography.styles.bodyMd.fontSize,
              lineHeight: typography.styles.bodyMd.lineHeight,
              color: colors.surface.onSurfaceVariant,
            }}
          >
            {message && <p style={{ margin: 0 }}>{message}</p>}
            {children}
          </div>
        )}

        {/* Actions Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: spacing[3],
            marginTop: spacing[2],
          }}
        >
          <button
            ref={cancelButtonRef}
            type="button"
            data-testid="confirmation-dialog-cancel"
            onClick={onCancel}
            disabled={isLoading}
            style={cancelBtnStyle}
          >
            {cancelLabel}
          </button>

          <button
            ref={confirmButtonRef}
            type="button"
            data-testid="confirmation-dialog-confirm"
            onClick={onConfirm}
            disabled={isLoading}
            style={getConfirmButtonStyles()}
          >
            {isLoading && (
              <svg
                aria-hidden="true"
                data-testid="confirmation-dialog-spinner"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{
                  animation: 'spin 1s linear infinite',
                }}
              >
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
