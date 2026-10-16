import React from 'react';
import type { Metadata } from 'next';
import { CRMLayout, NavItem } from '@/components/shared/CRMLayout';
import { BreadcrumbItem } from '@/components/shared/Breadcrumbs';

export const metadata: Metadata = {
  title: 'CRM Platform',
  description: 'CRM Platform Foundation - Managing Companies, Contacts, Leads, Tasks, and Interactions',
};

export const GLOBAL_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Companies', href: '/companies' },
  { label: 'Contacts', href: '/contacts' },
  { label: 'Leads', href: '/leads' },
  { label: 'Tasks', href: '/tasks' },
  { label: 'Interactions', href: '/interactions' },
];

export interface RootLayoutProps {
  children: React.ReactNode;
  navItems?: NavItem[];
  breadcrumbs?: BreadcrumbItem[];
}

export default function RootLayout({
  children,
  navItems = GLOBAL_NAV_ITEMS,
  breadcrumbs,
}: RootLayoutProps) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {/* <CRMLayout navItems={navItems} breadcrumbs={breadcrumbs}> */}
          {children}
        {/* </CRMLayout> */}
      </body>
    </html>
  );
}

