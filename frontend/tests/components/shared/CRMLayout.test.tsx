import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CRMLayout, DEFAULT_NAV_ITEMS } from '../../../src/components/shared/CRMLayout';

describe('CRMLayout', () => {
  it('renders header, main content area, and children', () => {
    render(
      <CRMLayout>
        <div data-testid="test-child">Dashboard Content</div>
      </CRMLayout>
    );

    const child = screen.getByTestId('test-child');
    expect(child).toBeDefined();
    expect(child.textContent).toBe('Dashboard Content');
  });

  it('includes default aria-label attributes for header, nav, and main elements', () => {
    render(
      <CRMLayout>
        <p>Content</p>
      </CRMLayout>
    );

    const header = screen.getByRole('banner', { name: 'CRM Header' });
    expect(header).toBeDefined();

    const nav = screen.getByRole('navigation', { name: 'CRM Main Navigation' });
    expect(nav).toBeDefined();

    const main = screen.getByRole('main', { name: 'Main Content' });
    expect(main).toBeDefined();
  });

  it('allows custom aria-label attributes for header, nav, and main', () => {
    render(
      <CRMLayout
        headerAriaLabel="Custom Header Label"
        navAriaLabel="Custom Nav Label"
        mainAriaLabel="Custom Main Label"
      >
        <p>Content</p>
      </CRMLayout>
    );

    expect(screen.getByRole('banner', { name: 'Custom Header Label' })).toBeDefined();
    expect(screen.getByRole('navigation', { name: 'Custom Nav Label' })).toBeDefined();
    expect(screen.getByRole('main', { name: 'Custom Main Label' })).toBeDefined();
  });

  it('renders default navigation items (Companies, Contacts, Leads, Tasks, Interactions, Dashboard)', () => {
    render(
      <CRMLayout>
        <p>Content</p>
      </CRMLayout>
    );

    DEFAULT_NAV_ITEMS.forEach((item) => {
      const link = screen.getByRole('link', { name: item.label });
      expect(link).toBeDefined();
      expect(link.getAttribute('href')).toBe(item.href);
    });
  });

  it('renders custom navigation items when provided', () => {
    const customItems = [
      { label: 'Overview', href: '/overview' },
      { label: 'Settings', href: '/settings' },
    ];

    render(
      <CRMLayout navItems={customItems}>
        <p>Content</p>
      </CRMLayout>
    );

    expect(screen.getByRole('link', { name: 'Overview' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Settings' })).toBeDefined();
    expect(screen.queryByRole('link', { name: 'Companies' })).toBeNull();
  });

  it('highlights active item with aria-current="page"', () => {
    render(
      <CRMLayout activeHref="/leads">
        <p>Content</p>
      </CRMLayout>
    );

    const activeLink = screen.getByRole('link', { name: 'Leads' });
    expect(activeLink.getAttribute('aria-current')).toBe('page');

    const inactiveLink = screen.getByRole('link', { name: 'Companies' });
    expect(inactiveLink.getAttribute('aria-current')).toBeNull();
  });

  it('renders custom title and headerExtra elements', () => {
    render(
      <CRMLayout title="Acme CRM" headerExtra={<button>User Menu</button>}>
        <p>Content</p>
      </CRMLayout>
    );

    expect(screen.getByRole('link', { name: 'CRM Platform Home' }).textContent).toBe('Acme CRM');
    expect(screen.getByRole('button', { name: 'User Menu' })).toBeDefined();
  });

  it('highlights item with active: true directly in navItems', () => {
    const customNavItems = [
      { label: 'Dashboard', href: '/dashboard', active: true },
      { label: 'Reports', href: '/reports' },
    ];

    render(
      <CRMLayout navItems={customNavItems}>
        <p>Content</p>
      </CRMLayout>
    );

    const activeLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(activeLink.getAttribute('aria-current')).toBe('page');

    const inactiveLink = screen.getByRole('link', { name: 'Reports' });
    expect(inactiveLink.getAttribute('aria-current')).toBeNull();
  });

  it('applies custom className to wrapper', () => {
    const { container } = render(
      <CRMLayout className="custom-crm-layout-wrapper">
        <p>Content</p>
      </CRMLayout>
    );

    expect(container.firstChild?.parentElement?.querySelector('.custom-crm-layout-wrapper')).not.toBeNull();
  });
});
