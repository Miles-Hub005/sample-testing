'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { colors, spacing, typography } from '../../lib/tokens';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export interface BreadcrumbProps {
  /** Optional custom breadcrumb items. If omitted, generated automatically from current pathname. */
  items?: BreadcrumbItem[];
  /** Custom label for the root home link. Defaults to 'Home'. */
  homeLabel?: string;
  /** Custom aria-label for the nav element. Defaults to 'Breadcrumb'. */
  ariaLabel?: string;
  /** Optional custom className */
  className?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  companies: 'Companies',
  contacts: 'Contacts',
  leads: 'Leads',
  tasks: 'Tasks',
  interactions: 'Interactions',
};

/**
 * Breadcrumb navigation component displaying current location hierarchy.
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  homeLabel = 'Home',
  ariaLabel = 'Breadcrumb',
  className,
}) => {
  let pathname = '/';
  try {
    const rawPath = usePathname();
    if (rawPath) {
      pathname = rawPath;
    }
  } catch {
    pathname = '/';
  }

  const breadcrumbs = React.useMemo(() => {
    if (items && items.length > 0) {
      return items;
    }

    const segments = pathname.split('/').filter(Boolean);
    const list: BreadcrumbItem[] = [{ label: homeLabel, href: '/' }];

    let currentHref = '';
    for (const segment of segments) {
      currentHref += `/${segment}`;
      const lower = segment.toLowerCase();
      const label =
        ROUTE_LABELS[lower] ||
        segment.charAt(0).toUpperCase() + segment.slice(1);
      list.push({ label, href: currentHref });
    }

    return list;
  }, [items, pathname, homeLabel]);

  return (
    <nav aria-label={ariaLabel} className={className} style={{ marginBottom: spacing[4] }}>
      <ol
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: spacing[2],
          listStyle: 'none',
          margin: 0,
          padding: 0,
          fontFamily: typography.styles.caption.fontFamily,
          fontSize: typography.styles.caption.fontSize,
          color: colors.surface.onSurfaceVariant,
        }}
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <li
              key={`${item.href}-${index}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: spacing[2],
              }}
            >
              {index > 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    color: colors.surface.outline,
                    userSelect: 'none',
                  }}
                >
                  /
                </span>
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  style={{
                    fontWeight: '600',
                    color: colors.surface.onSurface,
                  }}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  style={{
                    color: colors.accent.primary,
                    textDecoration: 'none',
                    transition: 'color 0.2s ease',
                  }}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
