import React, { useId } from 'react';
import { colors, radii, spacing, typography } from '../../lib/tokens';

export type LoadingStateSize = 'sm' | 'md' | 'lg';

export interface LoadingSpinnerProps {
  /** Size of spinner. Preset string or explicit numeric pixel diameter. Defaults to 'md'. */
  size?: LoadingStateSize | number;
  /** Custom stroke color for spinner. Defaults to primary accent token. */
  color?: string;
  /** Additional CSS class name */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
  /** Custom test ID attribute */
  'data-testid'?: string;
}

/**
 * Animated Loading Spinner SVG Component
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = colors.accent.primary,
  className,
  style,
  'data-testid': testId = 'loading-spinner',
}) => {
  let pixelSize = 32;
  let strokeWidth = 3;

  if (typeof size === 'number') {
    pixelSize = size;
    strokeWidth = Math.max(2, Math.round(size / 10));
  } else if (size === 'sm') {
    pixelSize = 20;
    strokeWidth = 2.5;
  } else if (size === 'lg') {
    pixelSize = 48;
    strokeWidth = 3.5;
  }

  return (
    <>
      <style>{`
        @keyframes crm-spinner-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <svg
        data-testid={testId}
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={className}
        style={{
          animation: 'crm-spinner-rotate 0.8s linear infinite',
          display: 'inline-block',
          verticalAlign: 'middle',
          flexShrink: 0,
          ...style,
        }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={colors.surface.outlineVariant}
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        <path
          d="M12 2 C6.477 2 2 6.477 2 12"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    </>
  );
};

export interface LoadingStateProps {
  /** Primary loading message text or node. Defaults to 'Loading...'. */
  message?: React.ReactNode;
  /** Optional secondary description or subtext node */
  description?: React.ReactNode;
  /** Overall size preset. Defaults to 'md'. */
  size?: LoadingStateSize;
  /** Custom spinner component or node override */
  spinner?: React.ReactNode;
  /** Renders loading state centered in full viewport height */
  fullPage?: boolean;
  /** Takes full width of parent container */
  fullWidth?: boolean;
  /** Minimum height style override for container */
  minHeight?: string | number;
  /** ARIA role attribute. Defaults to 'status'. */
  role?: string;
  /** ARIA live attribute. Defaults to 'polite'. */
  ariaLive?: 'polite' | 'assertive' | 'off';
  /** Custom ARIA label for accessibility */
  ariaLabel?: string;
  /** Element ID for root container */
  id?: string;
  /** Element ID for message text element */
  messageId?: string;
  /** Element ID for description text element */
  descriptionId?: string;
  /** Custom aria-describedby attribute override */
  'aria-describedby'?: string;
  /** Custom aria-labelledby attribute override */
  'aria-labelledby'?: string;
  /** Additional CSS class name */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
  /** Custom test ID attribute for unit testing */
  'data-testid'?: string;
}

/**
 * LoadingState Component
 *
 * Renders a spinner, primary loading message, optional description,
 * and accessible ARIA attributes (`role="status"`, `aria-live="polite"`, `aria-busy="true"`).
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  description,
  size = 'md',
  spinner,
  fullPage = false,
  fullWidth = true,
  minHeight,
  role = 'status',
  ariaLive = 'polite',
  ariaLabel,
  id,
  messageId,
  descriptionId,
  'aria-describedby': ariaDescribedBy,
  'aria-labelledby': ariaLabelledBy,
  className,
  style,
  'data-testid': testId = 'loading-state',
}) => {
  const generatedId = useId();

  const resolvedId = id || `loading-state-${generatedId}`;
  const resolvedMessageId = messageId || `loading-message-${generatedId}`;
  const resolvedDescriptionId = descriptionId || `loading-desc-${generatedId}`;

  const resolvedAriaLabel =
    ariaLabel || (typeof message === 'string' ? message : 'Loading state');

  let defaultMinHeight = '120px';
  if (fullPage) {
    defaultMinHeight = '60vh';
  } else if (size === 'sm') {
    defaultMinHeight = '60px';
  } else if (size === 'lg') {
    defaultMinHeight = '200px';
  }

  const containerMinHeight = minHeight ?? defaultMinHeight;

  const fontStyle =
    size === 'sm'
      ? typography.styles.caption
      : size === 'lg'
      ? typography.styles.bodyLg
      : typography.styles.bodyMd;

  const paddingStyle =
    size === 'sm' ? spacing[3] : size === 'lg' ? spacing[8] : spacing[6];

  return (
    <div
      id={resolvedId}
      role={role}
      aria-live={ariaLive}
      aria-busy="true"
      aria-label={resolvedAriaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={
        ariaDescribedBy || (description ? resolvedDescriptionId : undefined)
      }
      data-testid={testId}
      className={className}
      style={{
        display: 'flex',
        flexDirection: size === 'sm' && !description ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: paddingStyle,
        minHeight: containerMinHeight,
        width: fullWidth ? '100%' : 'auto',
        gap: size === 'sm' ? spacing[2] : spacing[3],
        color: colors.surface.onSurfaceVariant,
        fontFamily: fontStyle.fontFamily,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {spinner !== undefined ? (
        spinner
      ) : (
        <LoadingSpinner size={size} />
      )}

      {(message || description) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: spacing[1],
          }}
        >
          {message && (
            <span
              id={resolvedMessageId}
              data-testid="loading-message"
              style={{
                fontSize: fontStyle.fontSize,
                fontWeight: typography.styles.labelCaps.fontWeight,
                color: colors.surface.onSurface,
                lineHeight: fontStyle.lineHeight,
              }}
            >
              {message}
            </span>
          )}

          {description && (
            <span
              id={resolvedDescriptionId}
              data-testid="loading-description"
              style={{
                fontSize: typography.styles.caption.fontSize,
                color: colors.surface.onSurfaceVariant,
                lineHeight: typography.styles.caption.lineHeight,
              }}
            >
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export interface EmptyStateIconProps {
  /** Width and height pixel dimension. Defaults to 48. */
  size?: number;
  /** Primary stroke or fill color. Defaults to outline color token. */
  color?: string;
  /** Additional CSS class name */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
  /** Custom test ID attribute */
  'data-testid'?: string;
}

/**
 * Default Empty State Document/Inbox Icon SVG Component
 */
export const EmptyStateIcon: React.FC<EmptyStateIconProps> = ({
  size = 48,
  color = colors.surface.outline,
  className,
  style,
  'data-testid': testId = 'empty-state-icon',
}) => (
  <svg
    data-testid={testId}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
    style={{ display: 'block', ...style }}
  >
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="13" y2="17" />
  </svg>
);

export interface EmptyStateProps {
  /** Title or headline for empty state. Defaults to 'No items found'. */
  title?: React.ReactNode;
  /** Secondary description explaining empty state or action prompt */
  description?: React.ReactNode;
  /** Alias for message/description or title when provided alone */
  message?: React.ReactNode;
  /** Custom icon or graphic element override */
  icon?: React.ReactNode;
  /** Set to true to hide the icon completely */
  hideIcon?: boolean;
  /** Primary action node (e.g. Button or Link component) */
  action?: React.ReactNode;
  /** Label for primary button if action node is omitted */
  actionLabel?: string;
  /** Callback fired when default primary button is clicked */
  onAction?: () => void;
  /** Secondary action node or element */
  secondaryAction?: React.ReactNode;
  /** ARIA role attribute. Defaults to 'region'. */
  role?: string;
  /** Custom ARIA label for container */
  ariaLabel?: string;
  /** Root container element ID */
  id?: string;
  /** Element ID for title element */
  titleId?: string;
  /** Element ID for description element */
  descriptionId?: string;
  /** Custom aria-describedby attribute override */
  'aria-describedby'?: string;
  /** Custom aria-labelledby attribute override */
  'aria-labelledby'?: string;
  /** Additional CSS class name */
  className?: string;
  /** Inline style overrides for root container */
  style?: React.CSSProperties;
  /** Custom test ID attribute for unit testing */
  'data-testid'?: string;
}

/**
 * EmptyState Component
 *
 * Renders an empty state placeholder with icon, title, description,
 * primary/secondary action buttons, and accessible markup (`role="region"`, `aria-labelledby`, `aria-describedby`).
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  message,
  icon,
  hideIcon = false,
  action,
  actionLabel,
  onAction,
  secondaryAction,
  role = 'region',
  ariaLabel,
  id,
  titleId,
  descriptionId,
  'aria-describedby': ariaDescribedBy,
  'aria-labelledby': ariaLabelledBy,
  className,
  style,
  'data-testid': testId = 'empty-state',
}) => {
  const generatedId = useId();

  const resolvedId = id || `empty-state-${generatedId}`;
  const resolvedTitleId = titleId || `empty-state-title-${generatedId}`;
  const resolvedDescriptionId =
    descriptionId || `empty-state-desc-${generatedId}`;

  // Resolve title and description from flexible props
  let displayTitle: React.ReactNode;
  let displayDescription: React.ReactNode;

  if (title !== undefined) {
    displayTitle = title;
    displayDescription = description !== undefined ? description : message;
  } else if (message !== undefined) {
    displayTitle = message;
    displayDescription = description;
  } else {
    displayTitle = 'No items found';
    displayDescription = description;
  }

  const resolvedAriaLabel =
    ariaLabel || (typeof displayTitle === 'string' ? displayTitle : 'Empty state');

  return (
    <div
      id={resolvedId}
      role={role}
      aria-label={ariaLabelledBy ? undefined : resolvedAriaLabel}
      aria-labelledby={ariaLabelledBy || resolvedTitleId}
      aria-describedby={
        ariaDescribedBy || (displayDescription ? resolvedDescriptionId : undefined)
      }
      data-testid={testId}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: `${spacing[8]} ${spacing[6]}`,
        backgroundColor: colors.surface.containerLow,
        border: `1px dashed ${colors.surface.outlineVariant}`,
        borderRadius: radii.md,
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {!hideIcon && (
        <div style={{ marginBottom: spacing[4] }}>
          {icon !== undefined ? icon : <EmptyStateIcon />}
        </div>
      )}

      {displayTitle && (
        <h3
          id={resolvedTitleId}
          data-testid="empty-state-title"
          style={{
            margin: 0,
            fontFamily: typography.styles.headlineSm.fontFamily,
            fontSize: typography.styles.headlineSm.fontSize,
            fontWeight: typography.styles.headlineSm.fontWeight,
            lineHeight: typography.styles.headlineSm.lineHeight,
            color: colors.surface.onSurface,
          }}
        >
          {displayTitle}
        </h3>
      )}

      {displayDescription && (
        <p
          id={resolvedDescriptionId}
          data-testid="empty-state-description"
          style={{
            margin: 0,
            marginTop: spacing[2],
            fontFamily: typography.styles.bodyMd.fontFamily,
            fontSize: typography.styles.bodyMd.fontSize,
            fontWeight: typography.styles.bodyMd.fontWeight,
            lineHeight: typography.styles.bodyMd.lineHeight,
            color: colors.surface.onSurfaceVariant,
            maxWidth: '480px',
          }}
        >
          {displayDescription}
        </p>
      )}

      {(action || actionLabel || secondaryAction) && (
        <div
          data-testid="empty-state-actions"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[3],
            marginTop: spacing[6],
            flexWrap: 'wrap',
          }}
        >
          {action ? (
            action
          ) : actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              data-testid="empty-state-action"
              style={{
                backgroundColor: colors.accent.primary,
                color: colors.accent.onPrimary,
                fontFamily: typography.styles.bodyMd.fontFamily,
                fontSize: typography.styles.caption.fontSize,
                fontWeight: '500',
                padding: `${spacing[2]} ${spacing[4]}`,
                borderRadius: radii.default,
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              {actionLabel}
            </button>
          ) : null}

          {secondaryAction}
        </div>
      )}
    </div>
  );
};
