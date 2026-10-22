import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RootLayout from '../../src/app/layout';

// Mock Next.js navigation hook
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('RootLayout Component', () => {
  it('renders skip link, global navigation bar, main landmark, and footer', () => {
    render(
      <RootLayout>
        <div data-testid="child-content">Dashboard Section Body</div>
      </RootLayout>
    );

    // Verify skip to main content link exists
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');

    // Verify global navigation bar rendered
    expect(screen.getByRole('navigation', { name: /global navigation/i })).toBeInTheDocument();

    // Verify main landmark region wraps children
    const mainLandmark = screen.getByRole('main');
    expect(mainLandmark).toBeInTheDocument();
    expect(mainLandmark).toHaveAttribute('id', 'main-content');
    expect(screen.getByTestId('child-content')).toBeInTheDocument();

    // Verify footer contentinfo landmark
    const footerLandmark = screen.getByRole('contentinfo');
    expect(footerLandmark).toBeInTheDocument();
    expect(footerLandmark).toHaveTextContent(/PairFront Platform/i);
    expect(footerLandmark).toHaveTextContent(/WCAG 2.1 AA Compliant/i);
  });
});
