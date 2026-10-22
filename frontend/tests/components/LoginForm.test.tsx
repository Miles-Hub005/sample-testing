import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginForm } from '../../src/components/auth/LoginForm';
import { apiClient, ApiError } from '../../src/services/apiClient';

// Mock useRouter from next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Next.js Link component to render standard anchor tag
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('LoginForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and Accessibility', () => {
    it('renders all form controls and accessible labels', () => {
      render(<LoginForm />);

      // Container and Heading
      expect(screen.getByRole('heading', { name: /sign in to platform/i })).toBeInTheDocument();

      // Email field with accessible label
      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');

      // Password field with accessible label
      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');

      // Submit button
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');

      // Register link
      const registerLink = screen.getByRole('link', { name: /register/i });
      expect(registerLink).toBeInTheDocument();
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('pre-fills email when initialEmail prop is supplied', () => {
      render(<LoginForm initialEmail="user@example.com" />);

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      expect(emailInput.value).toBe('user@example.com');
    });
  });

  describe('Form Submission and API Integration', () => {
    it('shows client validation error when fields are empty', async () => {
      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(submitButton);

      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert.textContent).toContain('Please enter both email address and password');
    });

    it('executes apiClient.login on submit and redirects on success', async () => {
      const mockResponse = {
        access_token: 'mock-token-xyz',
        token_type: 'bearer',
        user_id: 'user-123',
        tenant_id: 'tenant-456',
      };
      const loginSpy = vi.spyOn(apiClient, 'login').mockResolvedValueOnce(mockResponse);
      const onSuccessMock = vi.fn();

      render(<LoginForm onSuccess={onSuccessMock} redirectPath="/dashboard" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(loginSpy).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'Secret123!',
        });
        expect(onSuccessMock).toHaveBeenCalledWith(mockResponse);
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('handles 401 Unauthorized API failure and displays accessible error banner', async () => {
      const apiError = new ApiError(401, 'Unauthorized', { detail: 'Invalid credentials' });
      const loginSpy = vi.spyOn(apiClient, 'login').mockRejectedValueOnce(apiError);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

      fireEvent.click(submitButton);

      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert.textContent).toContain('Invalid email or password');

      // Verify input fields get aria-invalid="true"
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby', 'login-error');
      expect(passwordInput).toHaveAttribute('aria-describedby', 'login-error');
    });

    it('clears error state when user types into inputs', async () => {
      const apiError = new ApiError(401, 'Unauthorized');
      vi.spyOn(apiClient, 'login').mockRejectedValueOnce(apiError);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      expect(await screen.findByRole('alert')).toBeInTheDocument();

      // Typing into email input clears error
      fireEvent.change(emailInput, { target: { value: 'updated@example.com' } });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
