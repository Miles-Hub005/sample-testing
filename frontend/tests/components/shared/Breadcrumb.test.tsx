import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Breadcrumb from '../../../src/components/shared/Breadcrumb';

describe('Breadcrumb', () => {
  it('renders breadcrumb navigation with home item by default', () => {
    render(<Breadcrumb />);

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toBeDefined();

    const homeItem = screen.getByRole('page' in screen ? 'none' : 'link', { name: 'Home' });
    expect(homeItem).toBeDefined();
  });

  it('renders custom breadcrumb items when provided', () => {
    const customItems = [
      { label: 'Home', href: '/' },
      { label: 'Companies', href: '/companies' },
      { label: 'Acme Corp', href: '/companies/123' },
    ];

    render(<Breadcrumb items={customItems} />);

    expect(screen.getByRole('link', { name: 'Home' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Companies' })).toBeDefined();
    
    const currentPage = screen.getByText('Acme Corp');
    expect(currentPage.getAttribute('aria-current')).toBe('page');
  });

  it('allows custom homeLabel and ariaLabel', () => {
    render(<Breadcrumb homeLabel="Dashboard Root" ariaLabel="Page Location" />);

    expect(screen.getByRole('navigation', { name: 'Page Location' })).toBeDefined();
    expect(screen.getByText('Dashboard Root')).toBeDefined();
  });
});
