import type { Metadata } from 'next';
import React from 'react';
import { CRMLayout, NavItem } from '../components/shared/CRMLayout';

export const metadata: Metadata = {
  title: 'CRM Platform Foundation',
  description: 'CRM Platform Foundation & Shared UI',
};

export const GLOBAL_NAV_ITEMS: NavItem[] = [
  { label: 'Companies', href: '/companies' },
  { label: 'Contacts', href: '/contacts' },
  { label: 'Leads', href: '/leads' },
  { label: 'Tasks', href: '/tasks' },
  { label: 'Interactions', href: '/interactions' },
  { label: 'Dashboard', href: '/dashboard' },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <CRMLayout navItems={GLOBAL_NAV_ITEMS}>{children}</CRMLayout>
      </body>
    </html>
  );
}
