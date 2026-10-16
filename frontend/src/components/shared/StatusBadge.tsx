import React from 'react';
import { colors, rounded, spacing, typography } from '@/lib/tokens';

export type StatusVariant = 'success' |'primary' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusBadgeProps {
  /** Text label displayed inside the status badge */
  label: string;
  /**
   * Status type or name. Determines color scheme and default icon.
   * Accepts standard variants ('success', 'warning', 'error', 'info', 'neutral')
   * or common status strings ('active', 'completed', 'overdue', 'pending', etc.)
   */
  status?: StatusVariant | string;
  /** Explicit variant override */
  variant?: StatusVariant;
  /**
   * Custom icon element, or set to null/false to suppress icon.
   * If left undefined, renders default status icon corresponding to variant.
   */
  icon?: React.ReactNode | null | boolean;
  /** Size variant of the badge */
  size?: 'sm' | 'md' | 'lg';
  /** Custom aria-label for screen readers */
  ariaLabel?: string;
  /** Custom aria-describedby attribute referencing an element with further description */
  ariaDescribedBy?: string;
  /** Additional CSS class names */
  className?: string;
  /** Custom inline style overrides */
  style?: React.CSSProperties;
}

const SuccessIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M13.3332 4L5.99984 11.3333L2.6665 8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const WarningIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M8 5V8.33333M8 11V11.3333M1.88666 12.6667H14.1133C14.7333 12.6667 15.12 11.9933 14.8067 11.46L8.69333 1.12667C8.38666 0.593333 7.61333 0.593333 7.30666 1.12667L1.19333 11.46C0.88 11.9933 1.26666 12.6667 1.88666 12.6667Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ErrorIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M8 5V8.33333M8 11H8.00667M14.6667 8C14.6667 11.6819 11.6819 14.6667 8 14.6667C4.3181 14.6667 1.33333 11.6819 1.33333 8C1.33333 4.3181 4.3181 1.33333 8 1.33333C11.6819 1.33333 14.6667 4.3181 14.6667 8Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const InfoIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8C14.6667 4.3181 11.6819 1.33333 8 1.33333C4.3181 1.33333 1.33333 4.3181 1.33333 8C1.33333 11.6819 4.3181 14.6667 8 14.6667ZM8 5H8.00667M8 7.33333V11"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NeutralIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="8" cy="8" r="4" fill="currentColor" />
  </svg>
);

const VARIANT_STYLES: Record<
  StatusVariant,
  {
    backgroundColor: string;
    borderColor: string;
    color: string;
    DefaultIcon: React.FC<{ size: number }>;
  }
> = {
  success: {
    backgroundColor: '#e8f5e9',
    borderColor: '#a5d6a7',
    color: '#1b5e20',
    DefaultIcon: SuccessIcon,
  },
  warning: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffe0b2',
    color: '#e65100',
    DefaultIcon: WarningIcon,
  },
  error: {
    backgroundColor: '#ffebee',
    borderColor: '#ffcdd2',
    color: '#b71c1c',
    DefaultIcon: ErrorIcon,
  },
  info: {
    backgroundColor: '#e1f5fe',
    borderColor: '#b3e5fc',
    color: '#01579b',
    DefaultIcon: InfoIcon,
  },
  neutral: {
    backgroundColor: colors.surface.containerHigh,
    borderColor: colors.borderVariant,
    color: colors.grays[800],
    DefaultIcon: NeutralIcon,
  },
};

const SIZE_STYLES = {
  sm: {
    padding: `${spacing.xs} ${spacing.sm}`,
    fontSize: typography.sizes['label-caps'].fontSize,
    iconSize: 12,
    gap: spacing.xs,
  },
  md: {
    padding: '6px 12px',
    fontSize: typography.sizes.caption.fontSize,
    iconSize: 14,
    gap: '6px',
  },
  lg: {
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: typography.sizes['body-sm'].fontSize,
    iconSize: 16,
    gap: spacing.sm,
  },
};

/**
 * Maps status strings or explicit variants to a resolved StatusVariant.
 */
export function resolveVariant(
  status?: StatusVariant | string,
  explicitVariant?: StatusVariant
): StatusVariant {
  if (explicitVariant) return explicitVariant;
  if (!status) return 'neutral';

  const normalized = status.toLowerCase().trim();

  if (
    ['success', 'completed', 'active', 'won', 'paid', 'approved', 'resolved'].includes(
      normalized
    )
  ) {
    return 'success';
  }
  if (
    ['warning', 'pending', 'in_progress', 'due_soon', 'review', 'medium'].includes(
      normalized
    )
  ) {
    return 'warning';
  }
  if (
    ['error', 'danger', 'overdue', 'lost', 'failed', 'cancelled', 'high', 'critical'].includes(
      normalized
    )
  ) {
    return 'error';
  }
  if (['info', 'new', 'open', 'draft', 'low'].includes(normalized)) {
    return 'info';
  }
  if (['neutral', 'inactive', 'archived', 'closed'].includes(normalized)) {
    return 'neutral';
  }

  return 'neutral';
}

/**
 * StatusBadge component displays a status indicator badge with text label, icon,
 * and accessible styling conforming to accessibility guidelines (not color-only).
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  status,
  variant: explicitVariant,
  icon,
  size = 'md',
  ariaLabel,
  ariaDescribedBy,
  className = '',
  style = {},
}) => {
  const resolvedVariant = resolveVariant(status, explicitVariant);
  const variantStyle = VARIANT_STYLES[resolvedVariant];
  const sizeStyle = SIZE_STYLES[size] || SIZE_STYLES.md;

  const computedAriaLabel = ariaLabel || `${label} status`;

  let renderedIcon: React.ReactNode = null;
  if (icon === false || icon === null) {
    renderedIcon = null;
  } else if (React.isValidElement(icon)) {
    renderedIcon = icon;
  } else if (icon === true || icon === undefined) {
    const DefaultIconComponent = variantStyle.DefaultIcon;
    renderedIcon = <DefaultIconComponent size={sizeStyle.iconSize} />;
  }

  return (
    <span
      role="status"
      aria-label={computedAriaLabel}
      aria-describedby={ariaDescribedBy}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: sizeStyle.gap,
        padding: sizeStyle.padding,
        fontSize: sizeStyle.fontSize,
        fontWeight: '500',
        fontFamily: typography.fontFamily.sans,
        lineHeight: '1.2',
        borderRadius: rounded.full,
        border: `1px solid ${variantStyle.borderColor}`,
        backgroundColor: variantStyle.backgroundColor,
        color: variantStyle.color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {renderedIcon}
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
