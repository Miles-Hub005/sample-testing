import React from 'react';
import { colors, spacing, typography, shadows, rounded } from '@/lib/tokens';
import { BreadcrumbItem, Breadcrumbs } from './Breadcrumbs';

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface CRMLayoutProps {
  /** Page or main content to render inside layout */
  children?: React.ReactNode;
  /** Application title displayed in the navigation header */
  title?: string;
  /** Custom navigation items for header nav */
  navItems?: NavItem[];
  /** Optional breadcrumbs items to render in main content area */
  breadcrumbs?: BreadcrumbItem[];
  /** Current path to auto-detect active item if active flag not explicitly passed */
  currentPath?: string;
  /** Optional custom aria-label for header element */
  headerAriaLabel?: string;
  /** Optional custom aria-label for navigation element */
  navAriaLabel?: string;
  /** Optional custom aria-label for main content area */
  mainAriaLabel?: string;
  /** Optional custom styling class for outer wrapper */
  className?: string;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Companies', href: '/companies' },
  { label: 'Contacts', href: '/contacts' },
  { label: 'Leads', href: '/leads' },
  { label: 'Tasks', href: '/tasks' },
  { label: 'Interactions', href: '/interactions' },
];

/**
 * CRMLayout component provides the standard layout shell across the CRM application.
 * Features:
 * - Header banner with brand title and navigation links
 * - Main content container for page content
 * - Full accessibility with semantic HTML and aria-label attributes
 */
export const CRMLayout: React.FC<CRMLayoutProps> = ({
  children,
  title = 'CRM Platform',
  navItems = DEFAULT_NAV_ITEMS,
  breadcrumbs,
  currentPath,
  headerAriaLabel = 'Application Header',
  navAriaLabel = 'Primary Navigation',
  mainAriaLabel = 'Main Content Area',
  className = '',
}) => {
  return (
    <div
      className={className}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.surface.background,
        color: colors.surface.onSurface,
        fontFamily: typography.fontFamily.sans,
      }}
    >
      {/* Accessible skip link for keyboard users */}
      {/* <a
        href="#main-content"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        onFocus={(e) => {
          e.currentTarget.style.position = 'fixed';
          e.currentTarget.style.top = spacing.md;
          e.currentTarget.style.left = spacing.md;
          e.currentTarget.style.width = 'auto';
          e.currentTarget.style.height = 'auto';
          e.currentTarget.style.zIndex = '9999';
          e.currentTarget.style.backgroundColor = colors.accent.DEFAULT;
          e.currentTarget.style.color = colors.accent.onAccent;
          e.currentTarget.style.padding = `${spacing.sm} ${spacing.md}`;
          e.currentTarget.style.borderRadius = rounded.md;
          e.currentTarget.style.textDecoration = 'none';
        }}
        onBlur={(e) => {
          e.currentTarget.style.position = 'absolute';
          e.currentTarget.style.left = '-9999px';
          e.currentTarget.style.width = '1px';
          e.currentTarget.style.height = '1px';
        }}
      >
        Skip to main content
      </a> */}

      {/* Navigation Header */}
      <header
        role="banner"
        aria-label={headerAriaLabel}
        style={{
          backgroundColor: colors.surface.containerLow,
          borderBottom: `1px solid ${colors.borderVariant}`,
          boxShadow: shadows.sm,
          paddingLeft: spacing.gutter,
          paddingRight: spacing.gutter,
          paddingTop: spacing.lg,
          paddingBottom: spacing.lg,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: spacing.md,
          }}
        >
          {/* Brand Title */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.md,
            }}
          >
            <h1
              style={{
                fontFamily: typography.fontFamily.serif,
                fontSize: typography.sizes['headline-sm'].fontSize,
                fontWeight: typography.sizes['headline-sm'].fontWeight,
                lineHeight: typography.sizes['headline-sm'].lineHeight,
                color: colors.surface.onSurface,
                margin: 0,
              }}
            >
              {title}
            </h1>
          </div>

          {/* Primary Navigation */}
          <nav role="navigation" aria-label={navAriaLabel}>
            <ul
              style={{
                display: 'flex',
                alignItems: 'center',
                listStyle: 'none',
                margin: 0,
                padding: 0,
                gap: spacing.md,
                flexWrap: 'wrap',
              }}
            >
              {navItems.map((item) => {
                const isActive =
                  item.active !== undefined
                    ? item.active
                    : currentPath !== undefined
                    ? currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href))
                    : false;

                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      style={{
                        display: 'inline-block',
                        padding: `${spacing.xs} ${spacing.md}`,
                        borderRadius: rounded.md,
                        fontSize: typography.sizes['body-md'].fontSize,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? colors.accent.DEFAULT : colors.surface.onSurfaceVariant,
                        backgroundColor: isActive ? colors.accent.container : 'transparent',
                        textDecoration: 'none',
                        transition: 'background-color 0.15s ease, color 0.15s ease',
                      }}
                    >
                      {item.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        id="main-content"
        role="main"
        tabIndex={-1}
        aria-label={mainAriaLabel}
        style={{
          flex: 1,
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          padding: spacing.gutter,
          boxSizing: 'border-box',
        }}
      >
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} />
        )}
        {children}
      </main>
    </div>
  );
};

export default CRMLayout;
