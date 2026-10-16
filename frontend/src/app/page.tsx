import React from 'react';
import { colors, spacing, typography, rounded, shadows } from '@/lib/tokens';

export interface ModuleLink {
  title: string;
  href: string;
  description: string;
}

export const MODULE_LINKS: ModuleLink[] = [
  {
    title: 'Companies',
    href: '/companies',
    description: 'Manage company accounts, organizational details, and business relationships.',
  },
  {
    title: 'Contacts',
    href: '/contacts',
    description: 'Track contact people, communication channels, and company affiliations.',
  },
  {
    title: 'Leads',
    href: '/leads',
    description: 'Monitor lead progression, qualification statuses, and ownership assignments.',
  },
  {
    title: 'Tasks',
    href: '/tasks',
    description: 'Organize action items, due dates, priority assignments, and entity connections.',
  },
  {
    title: 'Interactions',
    href: '/interactions',
    description: 'Log and review append-only interaction records, meeting notes, and timestamps.',
  },
];

export default function HomePage() {
  return (
    <section
      aria-label="Dashboard Overview"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing['2xl'],
      }}
    >
      {/* Header section */}
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
          borderBottom: `1px solid ${colors.borderVariant}`,
          paddingBottom: spacing.xl,
        }}
      >
        <h1
          style={{
            fontFamily: typography.fontFamily.serif,
            fontSize: typography.sizes['headline-md'].fontSize,
            fontWeight: typography.sizes['headline-md'].fontWeight,
            lineHeight: typography.sizes['headline-md'].lineHeight,
            color: colors.surface.onSurface,
            margin: 0,
          }}
        >
          CRM Platform Overview
        </h1>
        <p
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typography.sizes['body-lg'].fontSize,
            lineHeight: typography.sizes['body-lg'].lineHeight,
            color: colors.surface.onSurfaceVariant,
            margin: 0,
            maxWidth: '800px',
          }}
        >
          Welcome to the CRM Platform. Select a module below to view and manage companies, contacts, leads, tasks, and interaction history.
        </p>
      </header>

      {/* Module Navigation Grid */}
      <nav aria-label="CRM Modules Navigation">
        <ul
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: spacing.xl,
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {MODULE_LINKS.map((module) => (
            <li key={module.href}>
              <a
                href={module.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing.sm,
                  padding: spacing.xl,
                  backgroundColor: colors.surface.containerLow,
                  border: `1px solid ${colors.borderVariant}`,
                  borderRadius: rounded.lg,
                  boxShadow: shadows.sm,
                  textDecoration: 'none',
                  color: colors.surface.onSurface,
                  height: '100%',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <h2
                    style={{
                      fontFamily: typography.fontFamily.serif,
                      fontSize: typography.sizes['headline-sm'].fontSize,
                      fontWeight: typography.sizes['headline-sm'].fontWeight,
                      lineHeight: typography.sizes['headline-sm'].lineHeight,
                      color: colors.accent.DEFAULT,
                      margin: 0,
                    }}
                  >
                    {module.title}
                  </h2>
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: '18px',
                      color: colors.accent.DEFAULT,
                      fontWeight: 'bold',
                    }}
                  >
                    →
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: typography.fontFamily.sans,
                    fontSize: typography.sizes['body-md'].fontSize,
                    lineHeight: typography.sizes['body-md'].lineHeight,
                    color: colors.surface.onSurfaceVariant,
                    margin: 0,
                  }}
                >
                  {module.description}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
