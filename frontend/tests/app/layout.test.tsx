import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RootLayout from '../../src/app/layout';

describe('RootLayout', () => {
  it('renders html, body, CRMLayout navigation shell, and children', () => {
    const { container } = render(
      <RootLayout>
        <div data-testid="child-content">Child Content</div>
      </RootLayout>
    );

    expect(container.querySelector('html')).not.toBeNull();
    expect(container.querySelector('body')).not.toBeNull();

    // Check CRMLayout structure
    const header = screen.getByRole('banner', { name: 'CRM Header' });
    expect(header).toBeDefined();

    const nav = screen.getByRole('navigation', { name: 'CRM Main Navigation' });
    expect(nav).toBeDefined();

    const main = screen.getByRole('main', { name: 'Main Content' });
    expect(main).toBeDefined();

    const child = screen.getByTestId('child-content');
    expect(child).toBeDefined();
    expect(child.textContent).toBe('Child Content');
  });

  it('renders default module links in navigation header including Dashboard', () => {
    render(
      <RootLayout>
        <p>Test</p>
      </RootLayout>
    );

    const navLinks = ['Companies', 'Contacts', 'Leads', 'Tasks', 'Interactions', 'Dashboard'];
    navLinks.forEach((label) => {
      const link = screen.getByRole('link', { name: label });
      expect(link).toBeDefined();
    });
  });

  it('renders breadcrumb component in layout', () => {
    render(
      <RootLayout>
        <p>Test Content</p>
      </RootLayout>
    );

    const breadcrumbNav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(breadcrumbNav).toBeDefined();
  });
});
