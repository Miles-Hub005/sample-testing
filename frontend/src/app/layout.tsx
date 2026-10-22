import React from 'react';
import type { Metadata } from 'next';
import { NavBar } from '../components/navigation/NavBar';
import { AccessibilityProvider } from '../components/common/AccessibilityContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Platform Access Control System Foundation',
  description: 'Enterprise Multi-Tenant Platform with RBAC and WCAG 2.1 AA Accessibility',
};

/**
 * Root App Router layout embedding global navigation bar and accessibility context.
 * Complies with WCAG 2.1 AA standards featuring skip links, landmark regions,
 * live region announcements, and responsive design.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen flex flex-col bg-[#fbf9f4] text-[#1b1c19] antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#59452b] focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#735c41]"
        >
          Skip to main content
        </a>
        <AccessibilityProvider>
          <NavBar />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 outline-none"
            role="main"
          >
            {children}
          </main>
          <footer
            className="border-t border-[#e4e2dd] bg-[#f5f3ee] py-6 text-center text-sm text-[#4e453d]"
            role="contentinfo"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>&copy; {new Date().getFullYear()} PairFront Platform. All rights reserved.</p>
              <p className="text-xs">WCAG 2.1 AA Compliant &bull; Multi-Tenant Access Control</p>
            </div>
          </footer>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
