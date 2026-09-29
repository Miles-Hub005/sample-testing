import React, { useId } from 'react';
import { colors, radii, shadows, spacing, typography } from '../../lib/tokens';

export type AlertVariant = 'error' | 'success' | 'warning' | 'info';

export interface BaseAlertProps {
  /** Optional title or header text/node for the alert */
  title?: React.ReactNode;
  /** Primary message or body text/node for the alert */
  message?: React.ReactNode;
  /** Children node as alternative or addition to message */
  children?: React.ReactNode;
  /** Optional array of detailed error strings or list items (rendered as semantic ul/li) */
  details?: string[];
  /** Optional dismiss/close callback handler. If provided, renders a close button. */
  onClose?: () => void;
  /** Optional custom icon override. If omitted, standard status icon is rendered. */
  icon?: React.ReactNode;
  /** Whether to hide the status icon completely */
  hideIcon?: boolean;
  /** Custom ARIA role. Defaults to 'alert' for error and 'status' for success/info/warning. */
  role?: string;
  /** Custom ARIA live mode. Defaults to 'assertive' for error and 'polite' for success/info/warning. */
  ariaLive?: 'off' | 'polite' | 'assertive';
  /** Custom aria-label override for the alert container */
  ariaLabel?: string;
  /** Custom element ID for the root alert element */
  id?: string;
  /** Custom element ID for aria-labelledby anchor */
  titleId?: string;
  /** Custom element ID for aria-describedby anchor */
  descriptionId?: string;
  /** Custom aria-describedby attribute override */
  'aria-describedby'?: string;
  /** Custom aria-labelledby attribute override */
  'aria-labelledby'?: string;
  /** Additional CSS class name */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
  /** Action elements rendered alongside or below the alert (e.g. Retry button) */
  actions?: React.ReactNode;
  /** Custom test ID attribute for unit testing */
  'data-testid'?: string;
}

export interface AlertProps extends BaseAlertProps {
  /** Visual variant of the alert. Defaults to 'info'. */
  variant?: AlertVariant;
}

export interface ErrorAlertProps extends BaseAlertProps {
  /** Optional Error object or raw error string */
  error?: Error | string | null;
}

export interface SuccessAlertProps extends BaseAlertProps {}

/**
 * Standard Error Icon (Circle Exclamation)
 */
export const ErrorIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className,
  style,
}) => (
  <svg
    data-testid="error-alert-icon"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
    style={style}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

/**
 * Standard Success Icon (Check Circle)
 */
export const SuccessIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className,
  style,
}) => (
  <svg
    data-testid="success-alert-icon"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
    style={style}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

/**
 * Standard Warning Icon (Triangle Exclamation)
 */
export const WarningIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className,
  style,
}) => (
  <svg
    data-testid="warning-alert-icon"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
    style={style}
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/**
 * Standard Info Icon (Circle Info)
 */
export const InfoIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className,
  style,
}) => (
  <svg
    data-testid="info-alert-icon"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
    style={style}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

/**
 * Standard Close / Dismiss Icon (Cross)
 */
export const CloseIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({
  className,
  style,
}) => (
  <svg
    data-testid="alert-close-icon"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
    style={style}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/**
 * Base Alert component with semantic HTML and aria-describedby support.
 */
export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  message,
  children,
  details,
  onClose,
  icon,
  hideIcon = false,
  role,
  ariaLive,
  ariaLabel,
  id,
  titleId,
  descriptionId,
  'aria-describedby': ariaDescribedByProp,
  'aria-labelledby': ariaLabelledByProp,
  className,
  style,
  actions,
  'data-testid': testId,
}) => {
  const generatedId = useId();

  const resolvedRole = role || (variant === 'error' ? 'alert' : 'status');
  const resolvedAriaLive = ariaLive || (variant === 'error' ? 'assertive' : 'polite');

  const resolvedTitleId = titleId || (title ? `alert-title-${generatedId}` : undefined);
  const resolvedDescriptionId =
    descriptionId || ariaDescribedByProp || `alert-desc-${generatedId}`;
  const resolvedTitleLabelledBy = ariaLabelledByProp || resolvedTitleId;

  // Variant color definitions
  const variantStyles = {
    error: {
      background: colors.error.container,
      border: `1px solid ${colors.error.main}`,
      textColor: colors.error.onContainer,
      titleColor: colors.error.onContainer,
      iconColor: colors.error.main,
      defaultIcon: <ErrorIcon />,
      defaultTestId: 'error-alert',
    },
    success: {
      background: colors.success.container,
      border: `1px solid ${colors.success.main}`,
      textColor: colors.success.onContainer,
      titleColor: colors.success.onContainer,
      iconColor: colors.success.main,
      defaultIcon: <SuccessIcon />,
      defaultTestId: 'success-alert',
    },
    warning: {
      background: colors.warning.container,
      border: `1px solid ${colors.warning.main}`,
      textColor: colors.warning.onContainer,
      titleColor: colors.warning.onContainer,
      iconColor: colors.warning.main,
      defaultIcon: <WarningIcon />,
      defaultTestId: 'warning-alert',
    },
    info: {
      background: colors.surface.containerHigh,
      border: `1px solid ${colors.tertiary.main}`,
      textColor: colors.surface.onSurface,
      titleColor: colors.tertiary.main,
      iconColor: colors.tertiary.main,
      defaultIcon: <InfoIcon />,
      defaultTestId: 'info-alert',
    },
  }[variant];

  const renderedIcon = hideIcon ? null : icon || variantStyles.defaultIcon;

  return (
    <section
      id={id}
      role={resolvedRole}
      aria-live={resolvedAriaLive}
      aria-label={ariaLabel}
      aria-labelledby={resolvedTitleLabelledBy}
      aria-describedby={resolvedDescriptionId}
      data-testid={testId || variantStyles.defaultTestId}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: spacing[3],
        padding: `${spacing[3]} ${spacing[4]}`,
        backgroundColor: variantStyles.background,
        border: variantStyles.border,
        borderRadius: radii.md,
        color: variantStyles.textColor,
        boxShadow: shadows.subtle,
        fontFamily: typography.fontFamilies.sans,
        boxSizing: 'border-box',
        width: '100%',
        ...style,
      }}
    >
      {renderedIcon && (
        <div
          data-testid={`${variantStyles.defaultTestId}-icon-container`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px',
            color: variantStyles.iconColor,
          }}
        >
          {renderedIcon}
        </div>
      )}

      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        {title && (
          <h4
            id={resolvedTitleId}
            style={{
              margin: 0,
              marginBottom: message || children || (details && details.length > 0) ? spacing[1] : 0,
              fontFamily: typography.fontFamilies.sans,
              fontSize: '15px',
              fontWeight: 600,
              lineHeight: '1.4',
              color: variantStyles.titleColor,
            }}
          >
            {title}
          </h4>
        )}

        <div
          id={resolvedDescriptionId}
          style={{
            fontSize: typography.styles.caption.fontSize,
            lineHeight: typography.styles.caption.lineHeight,
            color: variantStyles.textColor,
          }}
        >
          {typeof message === 'string' ? (
            <p style={{ margin: 0 }}>{message}</p>
          ) : (
            message
          )}

          {children}

          {details && details.length > 0 && (
            <ul
              data-testid={`${variantStyles.defaultTestId}-details-list`}
              style={{
                margin: `${spacing[1]} 0 0 0`,
                paddingLeft: spacing[5],
                listStyleType: 'disc',
              }}
            >
              {details.map((detail, index) => (
                <li key={index} style={{ marginTop: index > 0 ? spacing[0.5] : 0 }}>
                  {detail}
                </li>
              ))}
            </ul>
          )}
        </div>

        {actions && (
          <div
            style={{
              marginTop: spacing[2],
              display: 'flex',
              alignItems: 'center',
              gap: spacing[2],
            }}
          >
            {actions}
          </div>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          aria-label="Dismiss alert"
          onClick={onClose}
          data-testid={`${variantStyles.defaultTestId}-close-button`}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: spacing[1],
            margin: '-4px -4px 0 0',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: variantStyles.textColor,
            opacity: 0.8,
            borderRadius: radii.sm,
            transition: 'opacity 0.15s ease',
          }}
        >
          <CloseIcon />
        </button>
      )}
    </section>
  );
};

/**
 * ErrorAlert component specifically styled for error and failure states.
 * Uses semantic HTML, role="alert", aria-live="assertive", and aria-describedby.
 */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  title = 'Error',
  message,
  children,
  ...props
}) => {
  const resolvedMessage =
    message ||
    (typeof error === 'string' ? error : error?.message) ||
    children;

  return (
    <Alert
      variant="error"
      title={title}
      message={resolvedMessage}
      data-testid="error-alert"
      {...props}
    >
      {!message && typeof error !== 'string' && !error?.message ? children : null}
    </Alert>
  );
};

/**
 * SuccessAlert component specifically styled for success and completion states.
 * Uses semantic HTML, role="status", aria-live="polite", and aria-describedby.
 */
export const SuccessAlert: React.FC<SuccessAlertProps> = ({
  title = 'Success',
  ...props
}) => {
  return (
    <Alert
      variant="success"
      title={title}
      data-testid="success-alert"
      {...props}
    />
  );
};
