'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient, UserLoginResponse, ApiError } from '../../services/apiClient';
import { cn } from '../../lib/utils';

export interface LoginFormProps {
  /**
   * Optional callback invoked when login succeeds.
   */
  onSuccess?: (response: UserLoginResponse) => void;

  /**
   * Target path to redirect user after successful sign-in.
   * Defaults to '/dashboard'.
   */
  redirectPath?: string;

  /**
   * Initial pre-filled email address (e.g. passed from registration redirect).
   */
  initialEmail?: string;

  /**
   * Custom CSS classes for the container.
   */
  className?: string;
}

export function LoginForm({
  onSuccess,
  redirectPath = '/dashboard',
  initialEmail = '',
  className,
}: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState<string>(initialEmail);
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both email address and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.login({
        email: email.trim(),
        password,
      });

      if (onSuccess) {
        onSuccess(response);
      }

      if (typeof window !== 'undefined') {
        if (router && typeof router.push === 'function') {
          router.push(redirectPath);
        } else {
          window.location.href = redirectPath;
        }
      }
    } catch (err: any) {
      setIsSubmitting(false);

      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (err.detail) {
          setError(err.detail);
        } else {
          setError(`Authentication failed (${err.status}): ${err.message}`);
        }
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred during login. Please try again.');
      }
    }
  };

  return (
    <div className={cn('w-full max-w-md mx-auto', className)} data-testid="login-form-container">
      <div className="bg-[#f0eee9] border border-[#e4e2dd] rounded-lg p-8 shadow-sm">
        {/* Title and Header */}
        <div className="mb-6 text-center">
          <h1 id="login-title" className="text-2xl sm:text-3xl font-serif text-[#1b1c19]">
            Sign In to Platform
          </h1>
          <p className="mt-2 text-sm text-[#4e453d]">
            Enter your email and password to access your account.
          </p>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div
            id="login-error"
            role="alert"
            aria-live="polite"
            data-testid="login-error-banner"
            className="mb-6 flex items-start gap-3 p-4 bg-[#ffdad6] text-[#93000a] border border-[#ba1a1a] rounded-md"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm font-medium leading-tight">
              <span className="sr-only">Error: </span>
              {error}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form
          aria-labelledby="login-title"
          onSubmit={handleSubmit}
          noValidate
          data-testid="login-form"
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
                aria-describedby={error ? 'login-error' : undefined}
                placeholder="name@company.com"
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
                autoComplete="current-password"
                required
                disabled={isSubmitting}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                aria-invalid={!!error}
                aria-describedby={error ? 'login-error' : undefined}
                placeholder="••••••••"
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
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 pt-4 border-t border-[#e4e2dd] text-center text-sm text-[#4e453d]">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-[#735c41] hover:text-[#59452b] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#735c41] rounded-sm"
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
