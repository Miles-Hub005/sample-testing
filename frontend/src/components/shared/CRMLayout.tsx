import React from 'react';
import Link from 'next/link';
import { colors, radii, shadows, spacing, typography } from '../../lib/tokens';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface CRMLayoutProps {
  /** Page content rendered inside the main content area */
  children: React.ReactNode;
  /** Navigation items to render in the header. Defaults to CRM module links. */
  navItems?: NavItem[];
  /** Currently active link href for highlighting */
  activeHref?: string;
  /** Brand or platform title shown in header. Defaults to 'CRM Platform'. */
  title?: string;
  /** Optional custom aria-label for the header element */
  headerAriaLabel?: string;
  /** Optional custom aria-label for the nav element */
  navAriaLabel?: string;
  /** Optional custom aria-label for the main content element */
  mainAriaLabel?: string;
  /** Optional additional class name for the root wrapper */
  className?: string;
  /** Optional extra elements rendered on the right side of header (e.g. user menu or actions) */
  headerExtra?: React.ReactNode;
  /** Whether to render breadcrumb navigation above content. Defaults to true. */
  showBreadcrumb?: boolean;
  /** Optional explicit breadcrumb items override */
  breadcrumbItems?: BreadcrumbItem[];
}

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: 'Companies', href: '/companies' },
  { label: 'Contacts', href: '/contacts' },
  { label: 'Leads', href: '/leads' },
  { label: 'Tasks', href: '/tasks' },
  { label: 'Interactions', href: '/interactions' },
  { label: 'Dashboard', href: '/dashboard' },
];

/**
 * CRMLayout component providing a standard CRM navigation header,
 * main content area, breadcrumb navigation, and accessible aria-label attributes.
 */
export const CRMLayout: React.FC<CRMLayoutProps> = ({
  children,
  navItems = DEFAULT_NAV_ITEMS,
  activeHref,
  title = 'CRM Platform',
  headerAriaLabel = 'CRM Header',
  navAriaLabel = 'CRM Main Navigation',
  mainAriaLabel = 'Main Content',
  className,
  headerExtra,
  showBreadcrumb = true,
  breadcrumbItems,
}) => {
  return (
    <div
      className={className}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.surface.base,
        color: colors.surface.onSurface,
        fontFamily: typography.styles.bodyMd.fontFamily,
      }}
    >
      <header
        aria-label={headerAriaLabel}
        style={{
          backgroundColor: colors.surface.containerLowest,
          borderBottom: `1px solid ${colors.surface.outlineVariant}`,
          boxShadow: shadows.subtle,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          width: '100%',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: `${spacing[4]} ${spacing[6]}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: spacing[4],
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[3] }}>
            <Link
              href="/"
              aria-label="CRM Platform Home"
              style={{
                fontFamily: typography.styles.headlineSm.fontFamily,
                fontSize: typography.styles.headlineSm.fontSize,
                fontWeight: typography.styles.headlineSm.fontWeight,
                color: colors.accent.primary,
                textDecoration: 'none',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: spacing[4] }}>
            <nav
              aria-label={navAriaLabel}
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ul
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing[1],
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                }}
              >
                {navItems.map((item) => {
                  const isActive =
                    item.active || (activeHref ? activeHref === item.href : false);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        aria-label={item.label}
                        style={{
                          display: 'inline-block',
                          padding: `${spacing[2]} ${spacing[3]}`,
                          borderRadius: radii.default,
                          fontFamily: typography.styles.labelCaps.fontFamily,
                          fontSize: typography.styles.labelCaps.fontSize,
                          fontWeight: isActive
                            ? '600'
                            : typography.styles.labelCaps.fontWeight,
                          letterSpacing: typography.styles.labelCaps.letterSpacing,
                          textTransform: 'uppercase',
                          textDecoration: 'none',
                          color: isActive
                            ? colors.accent.primary
                            : colors.surface.onSurfaceVariant,
                          backgroundColor: isActive
                            ? colors.surface.containerLow
                            : 'transparent',
                          transition: 'background-color 0.2s ease, color 0.2s ease',
                        }}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {headerExtra && <div>{headerExtra}</div>}
          </div>
        </div>
      </header>

      <main
        aria-label={mainAriaLabel}
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          padding: `${spacing[6]} ${spacing[6]}`,
          boxSizing: 'border-box',
        }}
      >
        {showBreadcrumb && <Breadcrumb items={breadcrumbItems} />}
        {children}
      </main>
    </div>
  );
};

export default CRMLayout;
