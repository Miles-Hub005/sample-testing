import React from 'react';
import { colors, radii, spacing, typography } from '../../lib/tokens';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type StatusSize = 'sm' | 'md' | 'lg';

export interface StatusBadgeProps {
  /** Raw status string or name (e.g. 'active', 'in_progress', 'completed', 'overdue') */
  status?: string;
  /** Explicit text label. If omitted, derived from status or variant. */
  label?: string;
  /** Visual variant. If omitted, automatically derived from status. */
  variant?: StatusVariant;
  /** Custom icon element. If omitted, default SVG icon for variant is used. */
  icon?: React.ReactNode;
  /** Badge size. Defaults to 'md'. */
  size?: StatusSize;
  /** Custom aria-label for accessibility */
  ariaLabel?: string;
  /** Additional CSS class name */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
}

/**
 * Automatically derives a StatusVariant from a raw status string.
 */
export function deriveVariantFromStatus(status?: string): StatusVariant {
  if (!status) return 'neutral';
  const s = status.toLowerCase().trim().replace(/[-_]/g, ' ');

  if (
    s.includes('success') ||
    s.includes('completed') ||
    s.includes('complete') ||
    s.includes('won') ||
    s.includes('qualified') ||
    s.includes('active') ||
    s.includes('done') ||
    s.includes('passed')
  ) {
    return 'success';
  }

  if (
    s.includes('warning') ||
    s.includes('pending') ||
    s.includes('in progress') ||
    s.includes('contacted') ||
    s.includes('scheduled') ||
    s.includes('waiting')
  ) {
    return 'warning';
  }

  if (
    s.includes('error') ||
    s.includes('overdue') ||
    s.includes('lost') ||
    s.includes('unqualified') ||
    s.includes('failed') ||
    s.includes('rejected') ||
    s.includes('blocked') ||
    s.includes('cancelled') ||
    s.includes('canceled')
  ) {
    return 'error';
  }

  if (
    s.includes('info') ||
    s.includes('new') ||
    s.includes('draft') ||
    s.includes('open')
  ) {
    return 'info';
  }

  return 'neutral';
}

/**
 * Formats status text to Title Case label if explicit label is not provided.
 */
export function formatStatusLabel(status?: string, variant?: StatusVariant): string {
  if (status) {
    return status
      .replace(/[-_]/g, ' ')
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  if (variant) {
    return variant.charAt(0).toUpperCase() + variant.slice(1);
  }
  return 'Status';
}

const DefaultSuccessIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    data-testid="status-badge-icon-success"
  >
    <path
      d="M13.25 4.75L6 12L2.75 8.75"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DefaultWarningIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    data-testid="status-badge-icon-warning"
  >
    <path
      d="M8 1.75L1.25 13.25H14.75L8 1.75Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 6V9"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <circle cx="8" cy="11.25" r="0.85" fill="currentColor" />
  </svg>
);

const DefaultErrorIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    data-testid="status-badge-icon-error"
  >
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

const DefaultInfoIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    data-testid="status-badge-icon-info"
  >
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M8 7.25V11"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <circle cx="8" cy="5" r="0.85" fill="currentColor" />
  </svg>
);

const DefaultNeutralIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    data-testid="status-badge-icon-neutral"
  >
    <circle cx="8" cy="8" r="3.5" fill="currentColor" />
  </svg>
);

/**
 * StatusBadge component providing accessible status indicators with
 * text labels, distinct icons, and design token styling (not color-only).
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  variant,
  icon,
  size = 'md',
  ariaLabel,
  className,
  style,
}) => {
  const resolvedVariant: StatusVariant = variant || deriveVariantFromStatus(status);
  const displayLabel = label || formatStatusLabel(status, resolvedVariant);

  const variantStyles = {
    success: {
      backgroundColor: colors.success.container,
      color: colors.success.onContainer,
      border: `1px solid ${colors.success.main}`,
    },
    warning: {
      backgroundColor: colors.warning.container,
      color: colors.warning.onContainer,
      border: `1px solid ${colors.warning.main}`,
    },
    error: {
      backgroundColor: colors.error.container,
      color: colors.error.onContainer,
      border: `1px solid ${colors.error.main}`,
    },
    info: {
      backgroundColor: '#eef4fa',
      color: colors.tertiary.main,
      border: `1px solid ${colors.tertiary.container}`,
    },
    neutral: {
      backgroundColor: colors.grays[100],
      color: colors.grays[900],
      border: `1px solid ${colors.grays[600]}`,
    },
  }[resolvedVariant];

  const sizeConfig = {
    sm: {
      padding: `${spacing[0.5]} ${spacing[2]}`,
      fontSize: '11px',
      iconSize: 12,
      gap: spacing[1],
    },
    md: {
      padding: `${spacing[1]} 10px`,
      fontSize: '12px',
      iconSize: 14,
      gap: '6px',
    },
    lg: {
      padding: `${spacing[1.5]} ${spacing[3]}`,
      fontSize: '14px',
      iconSize: 16,
      gap: spacing[2],
    },
  }[size];

  const renderDefaultIcon = () => {
    switch (resolvedVariant) {
      case 'success':
        return <DefaultSuccessIcon size={sizeConfig.iconSize} />;
      case 'warning':
        return <DefaultWarningIcon size={sizeConfig.iconSize} />;
      case 'error':
        return <DefaultErrorIcon size={sizeConfig.iconSize} />;
      case 'info':
        return <DefaultInfoIcon size={sizeConfig.iconSize} />;
      case 'neutral':
      default:
        return <DefaultNeutralIcon size={sizeConfig.iconSize} />;
    }
  };

  const renderedIcon = icon ?? renderDefaultIcon();
  const computedAriaLabel = ariaLabel || `Status: ${displayLabel}`;

  return (
    <span
      role="status"
      aria-label={computedAriaLabel}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizeConfig.gap,
        padding: sizeConfig.padding,
        borderRadius: radii.full,
        fontFamily: typography.styles.labelCaps.fontFamily,
        fontSize: sizeConfig.fontSize,
        fontWeight: 600,
        letterSpacing: '0.03em',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        width: 'fit-content',
        ...variantStyles,
        ...style,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {renderedIcon}
      </span>
      <span>{displayLabel}</span>
    </span>
  );
};
