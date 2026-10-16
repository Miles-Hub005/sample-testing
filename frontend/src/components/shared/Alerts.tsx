'use client';

import React, { useId, useState } from 'react';
import { colors, rounded, spacing, typography } from '@/lib/tokens';

export type AlertVariant = 'error' | 'success';

export interface AlertProps {
  /**
   * Title text or node for the alert header.
   */
  title?: React.ReactNode;
  /**
   * Main message text or node.
   */
  message?: React.ReactNode;
  /**
   * Additional or custom content rendered inside the alert body.
   */
  children?: React.ReactNode;
  /**
   * Array of error or detail strings to display as a list (e.g. field validation errors).
   */
  details?: string[];
  /**
   * Alias for details. Array of error messages.
   */
  errors?: string[];
  /**
   * Custom icon element, or set to null/false to hide icon.
   * If left undefined, renders default icon for alert variant.
   */
  icon?: React.ReactNode | null | boolean;
  /**
   * Controls whether a dismiss (close) button is shown.
   * Defaults to true if onDismiss/onClose callback is provided.
   */
  dismissible?: boolean;
  /**
   * Callback fired when the dismiss button is clicked.
   */
  onDismiss?: () => void;
  /**
   * Alias for onDismiss. Callback fired when dismiss button is clicked.
   */
  onClose?: () => void;
  /**
   * Accessible ARIA label for the dismiss button. Default: "Dismiss alert"
   */
  dismissLabel?: string;
  /**
   * ID attribute for the root alert container element.
   */
  id?: string;
  /**
   * Custom ARIA label for screen readers.
   */
  ariaLabel?: string;
  'aria-label'?: string;
  /**
   * Custom aria-labelledby attribute referencing an element ID.
   */
  ariaLabelledBy?: string;
  'aria-labelledby'?: string;
  /**
   * Custom aria-describedby attribute referencing an element ID.
   */
  ariaDescribedBy?: string;
  'aria-describedby'?: string;
  /**
   * ARIA live region policy ('assertive' | 'polite' | 'off').
   */
  ariaLive?: 'assertive' | 'polite' | 'off';
  'aria-live'?: 'assertive' | 'polite' | 'off';
  /**
   * ARIA role for the alert container. Default: 'alert'
   */
  role?: string;
  /**
   * Additional CSS class name.
   */
  className?: string;
  /**
   * Custom inline style overrides.
   */
  style?: React.CSSProperties;
}

export interface ErrorAlertProps extends AlertProps {}
export interface SuccessAlertProps extends AlertProps {}

const ErrorIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path
      d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 6V11M10 14H10.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SuccessIcon: React.FC<{ size?: number; className?: string }> = ({ size = 20, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path
      d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 10L9 12.5L13.5 7.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CloseIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path
      d="M12 4L4 12M4 4L12 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface BaseAlertProps extends AlertProps {
  variant?: AlertVariant;
}

export const Alert: React.FC<BaseAlertProps> = ({
  title,
  message,
  children,
  details,
  errors,
  icon,
  dismissible,
  onDismiss,
  onClose,
  dismissLabel = 'Dismiss alert',
  id,
  ariaLabel,
  'aria-label': ariaLabelKebab,
  ariaLabelledBy,
  'aria-labelledby': ariaLabelledByKebab,
  ariaDescribedBy,
  'aria-describedby': ariaDescribedByKebab,
  ariaLive,
  'aria-live': ariaLiveKebab,
  role = 'alert',
  variant = 'error',
  className = '',
  style,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const autoId = useId();
  const rootId = id || `alert-${autoId}`;
  const titleId = `${rootId}-title`;
  const descriptionId = `${rootId}-description`;

  if (dismissed) {
    return null;
  }

  const detailList = details || errors || [];
  const hasDescription = Boolean(message || children || detailList.length > 0);

  const computedLabel = ariaLabel || ariaLabelKebab;
  const computedLabelledBy =
    ariaLabelledBy || ariaLabelledByKebab || (title ? titleId : undefined);
  const computedDescribedBy =
    ariaDescribedBy || ariaDescribedByKebab || (hasDescription ? descriptionId : undefined);
  const computedLive =
    ariaLive || ariaLiveKebab || (variant === 'error' ? 'assertive' : 'polite');

  const showDismiss = dismissible ?? Boolean(onDismiss || onClose);

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
    if (onClose) onClose();
  };

  const isError = variant === 'error';

  const variantStyles = isError
    ? {
        backgroundColor: '#fff5f5',
        borderColor: 'rgba(186, 26, 26, 0.3)',
        color: colors.error,
        titleColor: '#7f1d1d',
        bodyColor: colors.grays[800],
        dismissHoverBg: 'rgba(186, 26, 26, 0.1)',
      }
    : {
        backgroundColor: '#f4fbf5',
        borderColor: 'rgba(46, 125, 50, 0.3)',
        color: colors.success,
        titleColor: '#14532d',
        bodyColor: colors.grays[800],
        dismissHoverBg: 'rgba(46, 125, 50, 0.1)',
      };

  const renderIcon = () => {
    if (icon === false || icon === null) return null;
    if (React.isValidElement(icon)) return icon;
    return isError ? <ErrorIcon size={20} /> : <SuccessIcon size={20} />;
  };

  const alertIcon = renderIcon();

  return (
    <div
      id={rootId}
      role={role}
      aria-live={computedLive}
      aria-label={computedLabel}
      aria-labelledby={computedLabelledBy}
      aria-describedby={computedDescribedBy}
      className={`alert alert-${variant} ${className}`.trim()}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: rounded.md,
        backgroundColor: variantStyles.backgroundColor,
        border: `1px solid ${variantStyles.borderColor}`,
        color: variantStyles.color,
        boxSizing: 'border-box',
        width: '100%',
        position: 'relative',
        ...style,
      }}
    >
      {alertIcon && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '2px',
          }}
        >
          {alertIcon}
        </div>
      )}

      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        {title && (
          <h3
            id={titleId}
            style={{
              margin: 0,
              fontFamily: typography.fontFamily.sans,
              fontSize: typography.sizes['body-md'].fontSize,
              fontWeight: 600,
              lineHeight: 1.4,
              color: variantStyles.titleColor,
            }}
          >
            {title}
          </h3>
        )}

        {hasDescription && (
          <div
            id={descriptionId}
            style={{
              marginTop: title ? spacing.xs : 0,
              color: variantStyles.bodyColor,
              fontFamily: typography.fontFamily.sans,
              fontSize: typography.sizes['body-sm'].fontSize,
              lineHeight: 1.5,
            }}
          >
            {message && <div style={{ margin: 0 }}>{message}</div>}

            {detailList.length > 0 && (
              <ul
                style={{
                  margin: message ? `${spacing.xs} 0 0 0` : 0,
                  paddingLeft: spacing.xl,
                  listStyleType: 'disc',
                }}
              >
                {detailList.map((item, index) => (
                  <li key={index} style={{ marginTop: index > 0 ? '2px' : 0 }}>
                    {item}
                  </li>
                ))}
              </ul>
            )}

            {children}
          </div>
        )}
      </div>

      {showDismiss && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={dismissLabel}
          style={{
            flexShrink: 0,
            background: 'transparent',
            border: 'none',
            padding: '4px',
            margin: '-4px -4px -4px 0',
            borderRadius: rounded.sm,
            color: 'currentColor',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.8,
            transition: 'opacity 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.backgroundColor = variantStyles.dismissHoverBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.8';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <CloseIcon size={16} />
        </button>
      )}
    </div>
  );
};

export const ErrorAlert: React.FC<ErrorAlertProps> = (props) => (
  <Alert {...props} variant="error" />
);

export const SuccessAlert: React.FC<SuccessAlertProps> = (props) => (
  <Alert {...props} variant="success" />
);

export default Alert;
