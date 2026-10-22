import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterForm } from '../../src/components/auth/RegisterForm';
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

describe('RegisterForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering and Accessibility', () => {
    it('renders all form controls and accessible labels', () => {
      render(<RegisterForm />);

      // Container and Heading
      expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();

      // Email field with accessible label
      const emailInput = screen.getByLabelText(/email address/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autoComplete', 'email');

      // Password field with accessible label
      const passwordInput = screen.getByLabelText(/^password \*/i);
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autoComplete', 'new-password');

      // Confirm Password field with accessible label
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      expect(confirmPasswordInput).toBeInTheDocument();
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('autoComplete', 'new-password');

      // Password hint text
      expect(screen.getByText(/must be at least 6 characters long/i)).toBeInTheDocument();

      // Submit button
      const submitButton = screen.getByRole('button', { name: /create account/i });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');

      // Sign In link
      const signInLink = screen.getByRole('link', { name: /sign in/i });
      expect(signInLink).toBeInTheDocument();
      expect(signInLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Client-side Validation', () => {
    it('shows error when required fields are missing', async () => {
      render(<RegisterForm />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert.textContent).toContain('Please complete all required fields');
    });

    it('shows error when password is less than 6 characters', async () => {
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password \*/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: '12345' } });
      fireEvent.change(confirmPasswordInput, { target: { value: '12345' } });
      fireEvent.click(submitButton);

      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert.textContent).toContain('Password must be at least 6 characters long');
    });

    it('shows error when passwords do not match', async () => {
      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password \*/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'Password456!' } });
      fireEvent.click(submitButton);

      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert.textContent).toContain('Passwords do not match');
    });
  });

  describe('Form Submission and API Integration', () => {
    it('executes apiClient.register on submit and redirects on success', async () => {
      const mockResponse = {
        user_id: 'user-123',
        email: 'newuser@example.com',
        tenant_id: 'tenant-456',
        roles: ['ClientViewer'],
      };
      const registerSpy = vi.spyOn(apiClient, 'register').mockResolvedValueOnce(mockResponse);
      const onSuccessMock = vi.fn();

      render(<RegisterForm onSuccess={onSuccessMock} redirectPath="/login" />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password \*/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'newuser@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'SecurePass123!' } });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(registerSpy).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
        });
        expect(onSuccessMock).toHaveBeenCalledWith(mockResponse);
        expect(mockPush).toHaveBeenCalledWith('/login?registered=true&email=newuser%40example.com');
      });
    });

    it('handles 409 Conflict API failure and displays duplicate email error banner', async () => {
      const apiError = new ApiError(409, 'Conflict', { detail: 'A user with this email address already exists.' }, 'A user with this email address already exists.');
      const registerSpy = vi.spyOn(apiClient, 'register').mockRejectedValueOnce(apiError);

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password \*/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'duplicate@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'SecurePass123!' } });

      fireEvent.click(submitButton);

      const errorAlert = await screen.findByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert.textContent).toContain('An account with this email address already exists');

      // Verify input field accessibility attributes
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput).toHaveAttribute('aria-describedby', 'register-error');
      expect(registerSpy).toHaveBeenCalledTimes(1);
    });

    it('clears error state when user modifies email or password input', async () => {
      const apiError = new ApiError(409, 'Conflict');
      vi.spyOn(apiClient, 'register').mockRejectedValueOnce(apiError);

      render(<RegisterForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByLabelText(/^password \*/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      fireEvent.change(emailInput, { target: { value: 'duplicate@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'SecurePass123!' } });
      fireEvent.click(submitButton);

      expect(await screen.findByRole('alert')).toBeInTheDocument();

      // Typing into email input clears error banner
      fireEvent.change(emailInput, { target: { value: 'another@example.com' } });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
