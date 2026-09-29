import React from 'react';
import Link from 'next/link';
import { colors, radii, shadows, spacing, typography } from '../lib/tokens';

const MODULES = [
  {
    title: 'Companies',
    href: '/companies',
    description: 'Manage company accounts and customer organizations.',
  },
  {
    title: 'Contacts',
    href: '/contacts',
    description: 'Track individual contact details and information.',
  },
  {
    title: 'Leads',
    href: '/leads',
    description: 'Monitor prospective leads and pipeline status.',
  },
  {
    title: 'Tasks',
    href: '/tasks',
    description: 'Manage operational tasks and track due dates.',
  },
  {
    title: 'Interactions',
    href: '/interactions',
    description: 'Record append-only interaction history and notes.',
  },
];

export default function HomePage() {
  return (
    <section
      aria-labelledby="dashboard-heading"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[8],
      }}
    >
      <header
        style={{
          borderBottom: `1px solid ${colors.surface.outlineVariant}`,
          paddingBottom: spacing[6],
        }}
      >
        <h1
          id="dashboard-heading"
          style={{
            fontFamily: typography.styles.displayLg.fontFamily,
            fontSize: typography.styles.displayLg.fontSize,
            fontWeight: typography.styles.displayLg.fontWeight,
            lineHeight: typography.styles.displayLg.lineHeight,
            letterSpacing: typography.styles.displayLg.letterSpacing,
            color: colors.surface.onSurface,
            margin: `0 0 ${spacing[2]} 0`,
          }}
        >
          CRM Platform Foundation
        </h1>
        <p
          style={{
            fontFamily: typography.styles.bodyLg.fontFamily,
            fontSize: typography.styles.bodyLg.fontSize,
            lineHeight: typography.styles.bodyLg.lineHeight,
            color: colors.surface.onSurfaceVariant,
            margin: 0,
            maxWidth: '680px',
          }}
        >
          Welcome to the CRM Platform. Access customer relationship records, contacts, leads, tasks, and interaction history below.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: spacing[6],
        }}
      >
        {MODULES.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing[3],
              padding: spacing[6],
              backgroundColor: colors.surface.containerLowest,
              borderRadius: radii.lg,
              border: `1px solid ${colors.surface.outlineVariant}`,
              boxShadow: shadows.subtle,
              textDecoration: 'none',
              color: 'inherit',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            <h2
              style={{
                fontFamily: typography.styles.headlineSm.fontFamily,
                fontSize: typography.styles.headlineSm.fontSize,
                fontWeight: typography.styles.headlineSm.fontWeight,
                color: colors.accent.primary,
                margin: 0,
              }}
            >
              {module.title}
            </h2>
            <p
              style={{
                fontFamily: typography.styles.bodyMd.fontFamily,
                fontSize: typography.styles.bodyMd.fontSize,
                lineHeight: typography.styles.bodyMd.lineHeight,
                color: colors.surface.onSurfaceVariant,
                margin: 0,
              }}
            >
              {module.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
