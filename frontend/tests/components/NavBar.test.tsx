import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NavBar, DEFAULT_NAV_ITEMS, isRouteActive } from '../../src/components/navigation/NavBar';
import { apiClient } from '../../src/services/apiClient';

// Mock Next.js navigation hooks
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

// Mock Next.js Link component to render standard anchor tag
vi.mock('next/link', () => ({
  default: ({ children, href, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

describe('NavBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 6 domain area links by default', () => {
    render(<NavBar currentPath="/dashboard" />);

    expect(screen.getByRole('navigation', { name: /global navigation/i })).toBeInTheDocument();

    const expectedTitles = [
      'Dashboard',
      'Performance',
      'Contracts',
      'Support',
      'Financials',
      'Knowledge Base',
    ];

    expectedTitles.forEach((title) => {
      const links = screen.getAllByRole('link', { name: new RegExp(title, 'i') });
      expect(links.length).toBeGreaterThan(0);
    });
  });

  it('visually indicates active route with aria-current="page"', () => {
    render(<NavBar currentPath="/contracts" />);

    const contractLinks = screen.getAllByRole('link', { name: /contracts/i });
    const activeContractLink = contractLinks.find(
      (link) => link.getAttribute('aria-current') === 'page'
    );

    expect(activeContractLink).toBeInTheDocument();
    expect(activeContractLink?.getAttribute('aria-current')).toBe('page');

    // Check that non-active links do not have aria-current="page"
    const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i });
    dashboardLinks.forEach((link) => {
      expect(link).not.toHaveAttribute('aria-current', 'page');
    });
  });

  it('hides non-permitted routes when is_accessible is false (FR-4, FR-5)', () => {
    const customItems = [
      { title: 'Dashboard', path: '/dashboard', is_accessible: true, icon_id: 'dashboard' },
      { title: 'Performance', path: '/performance', is_accessible: false, icon_id: 'performance' },
      { title: 'Contracts', path: '/contracts', is_accessible: true, icon_id: 'contracts' },
      { title: 'Financials', path: '/financials', is_accessible: false, icon_id: 'financials' },
    ];

    render(<NavBar items={customItems} currentPath="/dashboard" />);

    // Permitted links are displayed
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /contracts/i })).toBeInTheDocument();

    // Restricted links are hidden
    expect(screen.queryByRole('link', { name: /performance/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /financials/i })).not.toBeInTheDocument();
  });

  it('toggles mobile menu drawer on mobile viewports (NFR-4)', () => {
    render(<NavBar currentPath="/dashboard" />);

    const toggleButton = screen.getByRole('button', { name: /open navigation menu/i });
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    // Click toggle button to open mobile menu
    fireEvent.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /close navigation menu/i })).toBeInTheDocument();

    const mobileContainer = document.getElementById('mobile-navigation-menu');
    expect(mobileContainer).toBeInTheDocument();

    // Click toggle button again to close mobile menu
    fireEvent.click(screen.getByRole('button', { name: /close navigation menu/i }));
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('displays user info and executes logout handler when clicked', () => {
    const onLogoutMock = vi.fn();
    const user = {
      email: 'user@example.com',
      roles: ['ClientAdmin'],
      tenant_id: 'tenant-123',
    };

    render(<NavBar currentPath="/dashboard" user={user} onLogout={onLogoutMock} />);

    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('ClientAdmin')).toBeInTheDocument();

    const logoutButtons = screen.getAllByRole('button', { name: /log out/i });
    expect(logoutButtons.length).toBeGreaterThan(0);

    fireEvent.click(logoutButtons[0]);
    expect(onLogoutMock).toHaveBeenCalledTimes(1);
  });

  it('fetches navigation menu items from API when items prop is not provided', async () => {
    const apiMenuResponse = {
      items: [
        { title: 'Dashboard', path: '/dashboard', is_accessible: true, icon_id: 'dashboard' },
        { title: 'Support', path: '/support', is_accessible: true, icon_id: 'support' },
      ],
    };

    const spyGetNavigationMenu = vi
      .spyOn(apiClient, 'getNavigationMenu')
      .mockResolvedValueOnce(apiMenuResponse);

    render(<NavBar currentPath="/dashboard" />);

    await waitFor(() => {
      expect(spyGetNavigationMenu).toHaveBeenCalled();
    });

    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /support/i })).toBeInTheDocument();
  });

  describe('isRouteActive Helper', () => {
    it('returns true for exact route matches', () => {
      expect(isRouteActive('/dashboard', '/dashboard')).toBe(true);
      expect(isRouteActive('/performance', '/performance')).toBe(true);
    });

    it('returns true for nested child routes', () => {
      expect(isRouteActive('/contracts', '/contracts/123')).toBe(true);
      expect(isRouteActive('/support', '/support/tickets/456')).toBe(true);
    });

    it('returns false for non-matching routes', () => {
      expect(isRouteActive('/dashboard', '/performance')).toBe(false);
      expect(isRouteActive('/contracts', '/contractor')).toBe(false);
      expect(isRouteActive('/', '/dashboard')).toBe(false);
    });
  });
});
