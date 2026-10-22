'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginForm } from '../../components/auth/LoginForm';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams?.get('email') || undefined;
  const redirectPath =
    searchParams?.get('redirect') ||
    searchParams?.get('redirectPath') ||
    '/dashboard';

  return <LoginForm initialEmail={initialEmail} redirectPath={redirectPath} />;
}

export default function LoginPage() {
  return (
    <div className="py-8 sm:py-12 max-w-4xl mx-auto" data-testid="login-page">
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center py-12 text-[#4e453d]"
            aria-busy="true"
            aria-label="Loading login form"
          >
            <span className="text-sm font-medium">Loading login form...</span>
          </div>
        }
      >
        <LoginPageContent />
      </Suspense>
    </div>
  );
}
