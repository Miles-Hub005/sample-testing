import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from '../../src/app/page';

describe('HomePage', () => {
  it('renders main dashboard heading and introductory text', () => {
    render(<HomePage />);

    const heading = screen.getByRole('heading', { level: 1, name: 'CRM Platform Foundation' });
    expect(heading).toBeDefined();

    expect(
      screen.getByText(/Welcome to the CRM Platform/i)
    ).toBeDefined();
  });

  it('renders card links for all CRM modules', () => {
    render(<HomePage />);

    const modules = [
      { name: 'Companies', href: '/companies' },
      { name: 'Contacts', href: '/contacts' },
      { name: 'Leads', href: '/leads' },
      { name: 'Tasks', href: '/tasks' },
      { name: 'Interactions', href: '/interactions' },
    ];

    modules.forEach(({ name, href }) => {
      const heading = screen.getByRole('heading', { level: 2, name });
      expect(heading).toBeDefined();

      const link = heading.closest('a');
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe(href);
    });
  });
});
