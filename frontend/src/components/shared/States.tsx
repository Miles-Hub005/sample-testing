'use client';

import React, { useId } from 'react';
import { colors, rounded, spacing, typography } from '@/lib/tokens';

export type StateSize = 'sm' | 'md' | 'lg';

export interface LoadingStateProps {
  /**
   * Primary loading message or label text.
   * Default: "Loading..."
   */
  message?: React.ReactNode;
  /**
   * Alias for message prop.
   */
  label?: React.ReactNode;
  /**
   * Secondary supporting text or description detailing what is being loaded.
   */
  description?: React.ReactNode;
  /**
   * Size variant for spinner and typography.
   * Options: 'sm' | 'md' | 'lg'
   * Default: 'md'
   */
  size?: StateSize;
  /**
   * Render horizontal compact layout instead of vertically centered block.
   * Default: false
   */
  inline?: boolean;
  /**
   * Full screen/page overlay layout.
   * Default: false
   */
  fullScreen?: boolean;
  /**
   * Alias for fullScreen prop.
   */
  fullPage?: boolean;
  /**
   * Minimum height for container to prevent layout shifts during initial load (NFR-3).
   * Default: '200px' when not inline/fullScreen, otherwise 'auto' or '100vh'.
   */
  minHeight?: string | number;
  /**
   * Custom spinner element. Pass null or false to hide spinner.
   */
  spinner?: React.ReactNode | null | boolean;
  /**
   * Custom color for the spinner. Default: colors.accent.DEFAULT
   */
  spinnerColor?: string;
  /**
   * Unique ID for root container element.
   */
  id?: string;
  /**
   * Accessible ARIA label string.
   */
  ariaLabel?: string;
  'aria-label'?: string;
  /**
   * ID of element providing accessibility label.
   */
  ariaLabelledBy?: string;
  'aria-labelledby'?: string;
  /**
   * ID of element providing accessibility description.
   */
  ariaDescribedBy?: string;
  'aria-describedby'?: string;
  /**
   * ARIA live region policy ('polite' | 'assertive' | 'off').
   * Default: 'polite'
   */
  ariaLive?: 'polite' | 'assertive' | 'off';
  'aria-live'?: 'polite' | 'assertive' | 'off';
  /**
   * Accessible ARIA role for loading state.
   * Default: 'status'
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
  /**
   * Additional custom child content.
   */
  children?: React.ReactNode;
}

export interface EmptyStateProps {
  /**
   * Header title displayed in empty state.
   * Default: "No records found"
   */
  title?: React.ReactNode;
  /**
   * Supporting message or description explaining the empty state or instructions.
   */
  message?: React.ReactNode;
  /**
   * Alias for message prop.
   */
  description?: React.ReactNode;
  /**
   * Custom icon element, or set to null/false to suppress icon.
   * If left undefined, renders default empty state icon.
   */
  icon?: React.ReactNode | null | boolean;
  /**
   * Custom primary call-to-action node (e.g. Button component).
   */
  action?: React.ReactNode;
  /**
   * Label for default primary call-to-action button.
   */
  actionLabel?: string;
  /**
   * Callback fired when primary CTA button is clicked.
   */
  onAction?: () => void;
  /**
   * Custom secondary call-to-action node.
   */
  secondaryAction?: React.ReactNode;
  /**
   * Label for default secondary CTA button.
   */
  secondaryActionLabel?: string;
  /**
   * Callback fired when secondary CTA button is clicked.
   */
  onSecondaryAction?: () => void;
  /**
   * Size variant affecting spacing and typography.
   * Options: 'sm' | 'md' | 'lg'
   * Default: 'md'
   */
  size?: StateSize;
  /**
   * Minimum height for container to prevent layout shifts (NFR-3).
   * Default: '240px'
   */
  minHeight?: string | number;
  /**
   * Unique ID for root container element.
   */
  id?: string;
  /**
   * Accessible ARIA label string.
   */
  ariaLabel?: string;
  'aria-label'?: string;
  /**
   * ID of element providing accessibility label.
   */
  ariaLabelledBy?: string;
  'aria-labelledby'?: string;
  /**
   * ID of element providing accessibility description.
   */
  ariaDescribedBy?: string;
  'aria-describedby'?: string;
  /**
   * ARIA live region policy ('polite' | 'assertive' | 'off').
   * Default: 'polite'
   */
  ariaLive?: 'polite' | 'assertive' | 'off';
  'aria-live'?: 'polite' | 'assertive' | 'off';
  /**
   * Accessible ARIA role for empty state.
   * Default: 'region'
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
  /**
   * Additional custom child content.
   */
  children?: React.ReactNode;
}

/**
 * Default Spinner SVG component with CSS animation
 */
const DefaultSpinner: React.FC<{
  size: StateSize;
  color?: string;
}> = ({ size, color = colors.accent.DEFAULT }) => {
  const sizePx = size === 'sm' ? 20 : size === 'lg' ? 44 : 32;
  const strokeWidth = size === 'sm' ? 2.5 : size === 'lg' ? 3.5 : 3;

  return (
    <>
      <style>{`
        @keyframes crm-spinner-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <svg
        width={sizePx}
        height={sizePx}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        style={{
          animation: 'crm-spinner-rotate 0.8s linear infinite',
          flexShrink: 0,
        }}
        data-testid="loading-spinner"
      >
        <circle
          cx="16"
          cy="16"
          r="12"
          stroke={colors.surface.containerHigh}
          strokeWidth={strokeWidth}
        />
        <path
          d="M16 4C9.37258 4 4 9.37258 4 16"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </svg>
    </>
  );
};

/**
 * Default Empty State Icon SVG
 */
const DefaultEmptyIcon: React.FC<{ size: StateSize }> = ({ size }) => {
  const dimension = size === 'sm' ? 36 : size === 'lg' ? 64 : 48;

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ flexShrink: 0, color: colors.grays[400] }}
      data-testid="empty-state-icon"
    >
      <rect
        x="6"
        y="10"
        width="36"
        height="28"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      <path
        d="M18 20H30M21 26H27"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * LoadingState component renders an accessible loading indicator with spinner,
 * message, subtext description, and design system tokens.
 *
 * Features:
 * - FR-5: Shared UI component export
 * - FR-15: ARIA role="status", aria-busy="true", aria-live="polite", aria-labelledby / aria-describedby
 * - NFR-3: Stable rendering with configurable minHeight to eliminate layout shift
 */
export const LoadingState: React.FC<LoadingStateProps> = (props) => {
  const {
    message: messageProp,
    label: labelProp,
    description,
    size = 'md',
    inline = false,
    fullScreen: fullScreenProp = false,
    fullPage: fullPageProp = false,
    minHeight: minHeightProp,
    spinner: customSpinner,
    spinnerColor = colors.accent.DEFAULT,
    id: customId,
    ariaLabel: customAriaLabel,
    'aria-label': ariaLabelAttr,
    ariaLabelledBy: customAriaLabelledBy,
    'aria-labelledby': ariaLabelledByAttr,
    ariaDescribedBy: customAriaDescribedBy,
    'aria-describedby': ariaDescribedByAttr,
    ariaLive: customAriaLive,
    'aria-live': ariaLiveAttr,
    role = 'status',
    className = '',
    style = {},
    children,
  } = props;

  const generatedId = useId();
  const id = customId || `loading-state-${generatedId.replace(/:/g, '')}`;

  const isFullScreen = fullScreenProp || fullPageProp;
  const messageText = messageProp ?? labelProp ?? 'Loading...';

  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  const ariaLabel = customAriaLabel ?? ariaLabelAttr;
  const ariaLabelledBy =
    customAriaLabelledBy ??
    ariaLabelledByAttr ??
    (ariaLabel ? undefined : messageText ? titleId : undefined);
  const ariaDescribedBy =
    customAriaDescribedBy ??
    ariaDescribedByAttr ??
    (description ? descriptionId : undefined);

  const ariaLive = customAriaLive ?? ariaLiveAttr ?? 'polite';

  const defaultMinHeight = isFullScreen
    ? '100vh'
    : inline
    ? 'auto'
    : '200px';
  const minHeight = minHeightProp ?? defaultMinHeight;

  // Typography sizing based on component size prop
  const titleFontSize =
    size === 'sm'
      ? typography.sizes['body-sm'].fontSize
      : size === 'lg'
      ? typography.sizes['headline-sm'].fontSize
      : typography.sizes['body-lg'].fontSize;

  const titleFontFamily =
    size === 'lg'
      ? typography.fontFamily.serif
      : typography.fontFamily.sans;

  const descFontSize =
    size === 'sm'
      ? typography.sizes.caption.fontSize
      : typography.sizes['body-sm'].fontSize;

  // Spinner rendering logic
  let spinnerNode: React.ReactNode = null;
  if (customSpinner !== null && customSpinner !== false) {
    if (customSpinner !== undefined) {
      spinnerNode = customSpinner;
    } else {
      spinnerNode = <DefaultSpinner size={size} color={spinnerColor} />;
    }
  }

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: inline ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: inline ? 'flex-start' : 'center',
    gap: inline
      ? spacing.sm
      : size === 'sm'
      ? spacing.sm
      : size === 'lg'
      ? spacing.xl
      : spacing.md,
    padding: inline ? `${spacing.xs} ${spacing.sm}` : spacing.lg,
    minHeight,
    width: isFullScreen ? '100vw' : '100%',
    boxSizing: 'border-box',
    ...(isFullScreen
      ? {
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 9999,
          backgroundColor: colors.surface.background,
        }
      : {}),
    ...style,
  };

  return (
    <div
      id={id}
      role={role}
      aria-busy="true"
      aria-live={ariaLive}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      className={className}
      style={containerStyle}
    >
      {spinnerNode}

      {(messageText || description || children) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: inline ? 'flex-start' : 'center',
            textAlign: inline ? 'left' : 'center',
            gap: spacing.xs,
          }}
        >
          {messageText && (
            <span
              id={titleId}
              style={{
                fontFamily: titleFontFamily,
                fontSize: titleFontSize,
                fontWeight: '500',
                color: colors.surface.onSurface,
                lineHeight: '1.4',
              }}
            >
              {messageText}
            </span>
          )}

          {description && (
            <span
              id={descriptionId}
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: descFontSize,
                color: colors.grays[500],
                lineHeight: '1.4',
              }}
            >
              {description}
            </span>
          )}

          {children}
        </div>
      )}
    </div>
  );
};

/**
 * EmptyState component renders an accessible placeholder when data or list items are empty.
 *
 * Features:
 * - FR-5: Shared UI component export
 * - FR-15: Accessible markup with aria-labelledby, aria-describedby, role="region" / "status"
 * - NFR-3: Stable layout with minHeight to eliminate cumulative layout shifts
 */
export const EmptyState: React.FC<EmptyStateProps> = (props) => {
  const {
    title = 'No records found',
    message: messageProp,
    description: descriptionProp,
    icon: customIcon,
    action,
    actionLabel,
    onAction,
    secondaryAction,
    secondaryActionLabel,
    onSecondaryAction,
    size = 'md',
    minHeight = '240px',
    id: customId,
    ariaLabel: customAriaLabel,
    'aria-label': ariaLabelAttr,
    ariaLabelledBy: customAriaLabelledBy,
    'aria-labelledby': ariaLabelledByAttr,
    ariaDescribedBy: customAriaDescribedBy,
    'aria-describedby': ariaDescribedByAttr,
    ariaLive: customAriaLive,
    'aria-live': ariaLiveAttr,
    role = 'region',
    className = '',
    style = {},
    children,
  } = props;

  const generatedId = useId();
  const id = customId || `empty-state-${generatedId.replace(/:/g, '')}`;

  const messageText = messageProp ?? descriptionProp;

  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  const ariaLabel = customAriaLabel ?? ariaLabelAttr;
  const ariaLabelledBy =
    customAriaLabelledBy ??
    ariaLabelledByAttr ??
    (ariaLabel ? undefined : title ? titleId : undefined);
  const ariaDescribedBy =
    customAriaDescribedBy ??
    ariaDescribedByAttr ??
    (messageText ? descriptionId : undefined);

  const ariaLive = customAriaLive ?? ariaLiveAttr ?? 'polite';

  // Icon resolution
  let iconNode: React.ReactNode = null;
  if (customIcon !== null && customIcon !== false) {
    if (customIcon !== undefined) {
      iconNode = customIcon;
    } else {
      iconNode = <DefaultEmptyIcon size={size} />;
    }
  }

  // Typography sizing based on size prop
  const titleFontSize =
    size === 'sm'
      ? typography.sizes['body-lg'].fontSize
      : size === 'lg'
      ? typography.sizes['headline-md'].fontSize
      : typography.sizes['headline-sm'].fontSize;

  const messageFontSize =
    size === 'sm'
      ? typography.sizes['body-sm'].fontSize
      : typography.sizes['body-md'].fontSize;

  return (
    <div
      id={id}
      role={role}
      aria-live={ariaLive}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: size === 'sm' ? spacing.lg : spacing['2xl'],
        minHeight,
        width: '100%',
        backgroundColor: colors.surface.containerLow,
        borderRadius: rounded.lg,
        boxSizing: 'border-box',
        gap: size === 'sm' ? spacing.sm : spacing.md,
        border: `1px dashed ${colors.borderVariant}`,
        ...style,
      }}
    >
      {iconNode}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: spacing.xs,
          maxWidth: '480px',
        }}
      >
        {title && (
          <h3
            id={titleId}
            style={{
              margin: 0,
              fontFamily: typography.fontFamily.serif,
              fontSize: titleFontSize,
              fontWeight: '400',
              color: colors.surface.onSurface,
              lineHeight: '1.3',
            }}
          >
            {title}
          </h3>
        )}

        {messageText && (
          <p
            id={descriptionId}
            style={{
              margin: 0,
              fontFamily: typography.fontFamily.sans,
              fontSize: messageFontSize,
              color: colors.grays[600],
              lineHeight: '1.5',
            }}
          >
            {messageText}
          </p>
        )}
      </div>

      {(action || actionLabel || secondaryAction || secondaryActionLabel) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.md,
            marginTop: spacing.sm,
            flexWrap: 'wrap',
          }}
        >
          {action ? (
            action
          ) : actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              style={{
                backgroundColor: colors.accent.DEFAULT,
                color: colors.accent.onAccent,
                border: 'none',
                borderRadius: rounded.md,
                padding: `${spacing.sm} ${spacing.lg}`,
                fontSize: typography.sizes['body-sm'].fontSize,
                fontWeight: '500',
                fontFamily: typography.fontFamily.sans,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              {actionLabel}
            </button>
          ) : null}

          {secondaryAction ? (
            secondaryAction
          ) : secondaryActionLabel && onSecondaryAction ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              style={{
                backgroundColor: 'transparent',
                color: colors.surface.onSurface,
                border: `1px solid ${colors.border}`,
                borderRadius: rounded.md,
                padding: `${spacing.sm} ${spacing.lg}`,
                fontSize: typography.sizes['body-sm'].fontSize,
                fontWeight: '500',
                fontFamily: typography.fontFamily.sans,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      )}

      {children}
    </div>
  );
};
