'use client';

import React, { useEffect, useRef, useId } from 'react';
import { colors, rounded, shadows, spacing, typography } from '@/lib/tokens';

export type ConfirmationVariant = 'danger' | 'primary' | 'accent' | 'warning';

export interface ConfirmationDialogProps {
  /**
   * Controls whether the dialog modal is open and visible.
   */
  isOpen: boolean;
  /**
   * Dialog header/title text or node.
   * Default: "Confirm Action"
   */
  title?: React.ReactNode;
  /**
   * Dialog message/description text or node.
   * Default: "Are you sure you want to proceed?"
   */
  message?: React.ReactNode;
  /**
   * Additional body content rendered inside the dialog panel.
   */
  children?: React.ReactNode;
  /**
   * Label text for the confirm action button.
   * Default: "Confirm"
   */
  confirmLabel?: string;
  /**
   * Label text for the cancel button.
   * Default: "Cancel"
   */
  cancelLabel?: string;

  isConfirming?: boolean;
  /**
   * Visual variant for the confirm button.
   * Options: 'danger' | 'primary' | 'accent' | 'warning'
   * Default: 'danger'
   */
  confirmVariant?: ConfirmationVariant;
  /**
   * Callback fired when user clicks the confirm button.
   */
  onConfirm: () => void;
  /**
   * Callback fired when user clicks cancel, backdrop overlay, or presses Escape.
   */
  onCancel: () => void;
  /**
   * Whether the confirmation action is currently pending/submitting.
   * Disables interactive controls and shows loading indicator on confirm button.
   */
  isLoading?: boolean;
  /**
   * Accessible aria-label override for the dialog container.
   */
  ariaLabel?: string;
  /**
   * Accessible aria-describedby attribute or ID override.
   */
  ariaDescribedBy?: string;
  /**
   * Whether clicking the backdrop overlay triggers cancel.
   * Default: true
   */
  closeOnOverlayClick?: boolean;
  /**
   * Accessible ARIA role for the modal container ('dialog' | 'alertdialog').
   * Default: 'alertdialog' for 'danger' variant, otherwise 'dialog'.
   */
  role?: 'dialog' | 'alertdialog';
  /**
   * Additional CSS class name for the dialog container.
   */
  className?: string;
  /**
   * Custom inline styles for the dialog container panel.
   */
  style?: React.CSSProperties;
}

/**
 * ConfirmationDialog component provides an accessible modal confirmation prompt.
 * Features:
 * - Fixed background backdrop overlay blocking background interaction
 * - Modal keyboard accessibility (Escape key to cancel, focus trapping)
 * - Semantic ARIA role (dialog/alertdialog), aria-modal="true", aria-labelledby, aria-describedby
 * - Cancel and Confirm actions with configurable labels and visual variants
 * - Styled using Linen & Logic design system tokens
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
  ariaLabel,
  ariaDescribedBy,
  closeOnOverlayClick = true,
  role,
  className = '',
  style,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const generatedId = useId();
  const titleId = `confirmation-dialog-title-${generatedId}`;
  const descriptionId = `confirmation-dialog-desc-${generatedId}`;

  // Accessible role selection
  const computedRole = role || (confirmVariant === 'danger' ? 'alertdialog' : 'dialog');

  // Handle focus auto-focus and trapping
  useEffect(() => {
    if (!isOpen) return;

    // Save previously focused element to restore on close
    const previousActiveElement =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;

    // Focus cancel button by default for safety, or dialog panel
    if (cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    } else if (dialogRef.current) {
      dialogRef.current.focus();
    }

    // Lock body scrolling when modal is open
    const originalOverflow = typeof document !== 'undefined' ? document.body.style.overflow : '';
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    // Keydown handler for Escape key and Focus Trapping
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        event.preventDefault();
        if (!isLoading) {
          onCancel();
        }
        return;
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
      if (typeof document !== 'undefined') {
        document.body.style.overflow = originalOverflow;
      }
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        previousActiveElement.focus();
      }
    };
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) {
    return null;
  }

  // Visual button styling per confirmVariant
  const getConfirmButtonStyles = (): React.CSSProperties => {
    let backgroundColor: string;
    let color: string;

    switch (confirmVariant) {
      case 'danger':
        backgroundColor = colors.error;
        color = colors.surface.containerLowest;
        break;
      case 'warning':
        backgroundColor = colors.warning;
        color = colors.surface.containerLowest;
        break;
      case 'primary':
      case 'accent':
      default:
        backgroundColor = colors.accent.DEFAULT;
        color = colors.accent.onAccent;
        break;
    }

    return {
      backgroundColor,
      color,
      border: 'none',
      borderRadius: rounded.DEFAULT,
      padding: `${spacing.sm} ${spacing.lg}`,
      fontSize: typography.sizes['body-sm'].fontSize,
      fontFamily: typography.fontFamily.sans,
      fontWeight: '500',
      cursor: isLoading ? 'not-allowed' : 'pointer',
      opacity: isLoading ? 0.7 : 1,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      transition: 'background-color 150ms ease, opacity 150ms ease',
      outline: 'none',
    };
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnOverlayClick && !isLoading) {
      onCancel();
    }
  };

  const effectiveDescribedBy =
    ariaDescribedBy || (message || children ? descriptionId : undefined);

  return (
    <div
      data-testid="confirmation-dialog-backdrop"
      onClick={handleBackdropClick}
      aria-hidden="false"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(27, 28, 25, 0.5)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.gutter,
        boxSizing: 'border-box',
      }}
    >
      <div
        ref={dialogRef}
        role={computedRole}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : title ? titleId : undefined}
        aria-describedby={effectiveDescribedBy}
        tabIndex={-1}
        className={className}
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: colors.surface.containerLowest,
          borderRadius: rounded.lg,
          boxShadow: shadows.ambient,
          border: `1px solid ${colors.borderVariant}`,
          padding: spacing.xl,
          boxSizing: 'border-box',
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.lg,
          position: 'relative',
          ...style,
        }}
      >
        {/* Header / Title */}
        {title && (
          <div
            id={titleId}
            style={{
              fontFamily: typography.fontFamily.serif,
              fontSize: typography.sizes['headline-sm'].fontSize,
              fontWeight: typography.sizes['headline-sm'].fontWeight,
              lineHeight: typography.sizes['headline-sm'].lineHeight,
              color: colors.surface.onSurface,
            }}
          >
            {title}
          </div>
        )}

        {/* Content Body / Description */}
        {(message || children) && (
          <div
            id={descriptionId}
            style={{
              fontFamily: typography.fontFamily.sans,
              fontSize: typography.sizes['body-md'].fontSize,
              lineHeight: typography.sizes['body-md'].lineHeight,
              color: colors.surface.onSurfaceVariant,
            }}
          >
            {message}
            {children}
          </div>
        )}

        {/* Action Controls Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: spacing.md,
            marginTop: spacing.xs,
          }}
        >
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            style={{
              backgroundColor: colors.surface.containerLow,
              color: colors.surface.onSurface,
              border: `1px solid ${colors.borderVariant}`,
              borderRadius: rounded.DEFAULT,
              padding: `${spacing.sm} ${spacing.lg}`,
              fontSize: typography.sizes['body-sm'].fontSize,
              fontFamily: typography.fontFamily.sans,
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              outline: 'none',
              transition: 'background-color 150ms ease, opacity 150ms ease',
            }}
          >
            {cancelLabel}
          </button>

          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            style={getConfirmButtonStyles()}
          >
            {isLoading && (
              <span
                data-testid="confirmation-loading-spinner"
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  border: '2px solid currentColor',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
