import React from 'react';
import { colors, spacing, typography } from '@/lib/tokens';

export interface BreadcrumbItem {
  /** Display label for the breadcrumb item */
  label: string;
  /** Target link URL. If omitted or item is last, renders as text */
  href?: string;
}

export interface BreadcrumbsProps {
  /** Array of breadcrumb items to render in trail */
  items?: BreadcrumbItem[];
  /** Custom aria-label for navigation container */
  ariaLabel?: string;
  /** Custom className for container */
  className?: string;
}

/**
 * Breadcrumbs component provides accessible trail navigation (FR-10).
 * Displays current location hierarchy with active link states and semantic HTML.
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items = [],
  ariaLabel = 'Breadcrumb',
  className = '',
}) => {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label={ariaLabel} className={className} style={{ marginBottom: spacing.md }}>
      <ol
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.xs,
          listStyle: 'none',
          margin: 0,
          padding: 0,
          fontSize: typography.sizes.caption.fontSize,
          color: colors.surface.onSurfaceVariant,
        }}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={index}>
              {index > 0 && (
                <li aria-hidden="true" style={{ color: colors.surface.onSurfaceVariant }}>
                  /
                </li>
              )}
              <li>
                {isLast || !item.href ? (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    style={{
                      color: colors.surface.onSurface,
                      fontWeight: 500,
                    }}
                  >
                    {item.label}
                  </span>
                ) : (
                  <a
                    href={item.href}
                    style={{
                      color: colors.accent.DEFAULT,
                      textDecoration: 'none',
                    }}
                  >
                    {item.label}
                  </a>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
