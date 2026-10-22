'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient, UserRegisterResponse, ApiError } from '../../services/apiClient';
import { cn } from '../../lib/utils';

export interface RegisterFormProps {
  /**
   * Optional callback invoked when registration succeeds.
   */
  onSuccess?: (response: UserRegisterResponse) => void;

  /**
   * Target path to redirect user after successful registration.
   * Defaults to '/login'.
   */
  redirectPath?: string;

  /**
   * Custom CSS classes for the container.
   */
  className?: string;
}

export function RegisterForm({
  onSuccess,
  redirectPath = '/login',
  className,
}: RegisterFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();

    if (!cleanEmail || !password || !confirmPassword) {
      setError('Please complete all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.register({
        email: cleanEmail,
        password,
      });

      if (onSuccess) {
        onSuccess(response);
      }

      const targetPath = redirectPath.includes('?')
        ? `${redirectPath}&email=${encodeURIComponent(cleanEmail)}`
        : `${redirectPath}?registered=true&email=${encodeURIComponent(cleanEmail)}`;

      if (typeof window !== 'undefined') {
        if (router && typeof router.push === 'function') {
          router.push(targetPath);
        } else {
          window.location.href = targetPath;
        }
      }
    } catch (err: any) {
      setIsSubmitting(false);

      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('An account with this email address already exists. Please sign in or use a different email.');
        } else if (err.status === 422) {
          setError(err.detail || 'Invalid input. Please check your email and password.');
        } else if (err.detail) {
          setError(err.detail);
        } else {
          setError(`Registration failed (${err.status}): ${err.message}`);
        }
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during registration. Please try again.');
      }
    }
  };

  return (
    <div className={cn('w-full max-w-md mx-auto', className)} data-testid="register-form-container">
      <div className="bg-[#f0eee9] border border-[#e4e2dd] rounded-lg p-8 shadow-sm">
        {/* Title and Header */}
        <div className="mb-6 text-center">
          <h1 id="register-title" className="text-2xl sm:text-3xl font-serif text-[#1b1c19]">
            Create an Account
          </h1>
          <p className="mt-2 text-sm text-[#4e453d]">
            Enter your email and password to register a new account.
          </p>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div
            id="register-error"
            role="alert"
            aria-live="polite"
            data-testid="register-error-banner"
            className="mb-6 flex items-start gap-3 p-4 bg-[#ffdad6] text-[#93000a] border border-[#ba1a1a] rounded-md"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm font-medium leading-tight">
              <span className="sr-only">Error: </span>
              {error}
            </div>
          </div>
        )}

        {/* Register Form */}
        <form
          aria-labelledby="register-title"
          onSubmit={handleSubmit}
          noValidate
          data-testid="register-form"
          className="space-y-5"
        >
          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium uppercase tracking-wider text-[#4e453d] mb-1.5"
            >
              Email Address <span className="text-[#ba1a1a]" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#80756b]">
                <Mail className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={!!error}
                aria-describedby={error ? 'register-error' : undefined}
                placeholder="name@company.com"
                data-testid="register-email-input"
                className={cn(
                  'w-full pl-10 pr-3 py-2.5 bg-[#ffffff] text-[#1b1c19] text-sm border rounded-md transition-colors',
                  'placeholder:text-[#80756b]',
                  'focus:outline-none focus:ring-2 focus:ring-[#735c41] focus:border-[#735c41]',
                  'disabled:bg-[#eae8e3] disabled:text-[#80756b] disabled:cursor-not-allowed',
                  error ? 'border-[#ba1a1a]' : 'border-[#d1c4b9]'
                )}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium uppercase tracking-wider text-[#4e453d] mb-1.5"
            >
              Password <span className="text-[#ba1a1a]" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#80756b]">
                <Lock className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={!!error}
                aria-describedby={error ? 'register-error password-hint' : 'password-hint'}
                placeholder="••••••••"
                data-testid="register-password-input"
                className={cn(
                  'w-full pl-10 pr-3 py-2.5 bg-[#ffffff] text-[#1b1c19] text-sm border rounded-md transition-colors',
                  'placeholder:text-[#80756b]',
                  'focus:outline-none focus:ring-2 focus:ring-[#735c41] focus:border-[#735c41]',
                  'disabled:bg-[#eae8e3] disabled:text-[#80756b] disabled:cursor-not-allowed',
                  error ? 'border-[#ba1a1a]' : 'border-[#d1c4b9]'
                )}
              />
            </div>
            <p id="password-hint" className="mt-1 text-xs text-[#4e453d]">
              Must be at least 6 characters long.
            </p>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-medium uppercase tracking-wider text-[#4e453d] mb-1.5"
            >
              Confirm Password <span className="text-[#ba1a1a]" aria-hidden="true">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#80756b]">
                <Lock className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={!!error}
                aria-describedby={error ? 'register-error' : undefined}
                placeholder="••••••••"
                data-testid="register-confirm-password-input"
                className={cn(
                  'w-full pl-10 pr-3 py-2.5 bg-[#ffffff] text-[#1b1c19] text-sm border rounded-md transition-colors',
                  'placeholder:text-[#80756b]',
                  'focus:outline-none focus:ring-2 focus:ring-[#735c41] focus:border-[#735c41]',
                  'disabled:bg-[#eae8e3] disabled:text-[#80756b] disabled:cursor-not-allowed',
                  error ? 'border-[#ba1a1a]' : 'border-[#d1c4b9]'
                )}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="register-submit-button"
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium text-white transition-colors shadow-sm',
              'bg-[#735c41] hover:bg-[#59452b] active:bg-[#43331f]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#735c41]',
              'disabled:bg-[#80756b] disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                <span>Create Account</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 pt-4 border-t border-[#e4e2dd] text-center text-sm text-[#4e453d]">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-[#735c41] hover:text-[#59452b] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#735c41] rounded-sm"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
