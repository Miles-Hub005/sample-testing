import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../../src/app/login/page';

// Mock Next.js navigation hooks
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('renders login page container and LoginForm component', async () => {
    render(<LoginPage />);

    const pageContainer = screen.getByTestId('login-page');
    expect(pageContainer).toBeInTheDocument();

    // Verify main login form heading is present
    expect(
      screen.getByRole('heading', { level: 1, name: /sign in to platform/i })
    ).toBeInTheDocument();

    // Verify input fields
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('passes search parameters to LoginForm when provided', async () => {
    mockSearchParams = new URLSearchParams('email=user%40example.com&redirect=%2Fperformance');

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
    expect(emailInput.value).toBe('user@example.com');
  });
});
