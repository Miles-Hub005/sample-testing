import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RegisterPage from '../../src/app/register/page';

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

describe('RegisterPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('renders register page container and RegisterForm component', async () => {
    render(<RegisterPage />);

    const pageContainer = screen.getByTestId('register-page');
    expect(pageContainer).toBeInTheDocument();

    // Verify main register form heading is present
    expect(
      screen.getByRole('heading', { level: 1, name: /create an account/i })
    ).toBeInTheDocument();

    // Verify input fields
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create account/i })
    ).toBeInTheDocument();
  });

  it('passes search parameters to RegisterForm when provided', async () => {
    mockSearchParams = new URLSearchParams('redirect=%2Flogin%3Ffrom%3Dregister');

    render(<RegisterPage />);

    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toBeInTheDocument();
  });
});
