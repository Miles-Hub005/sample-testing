'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RegisterForm } from '../../components/auth/RegisterForm';

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const redirectPath =
    searchParams?.get('redirect') ||
    searchParams?.get('redirectPath') ||
    '/login';

  return <RegisterForm redirectPath={redirectPath} />;
}

export default function RegisterPage() {
  return (
    <div className="py-8 sm:py-12 max-w-4xl mx-auto" data-testid="register-page">
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center py-12 text-[#4e453d]"
            aria-busy="true"
            aria-label="Loading registration form"
          >
            <span className="text-sm font-medium">Loading registration form...</span>
          </div>
        }
      >
        <RegisterPageContent />
      </Suspense>
    </div>
  );
}
