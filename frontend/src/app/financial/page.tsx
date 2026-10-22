'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  CreditCard,
  FileText,
  BarChart3,
  Clock,
  ShieldCheck,
  RotateCw,
  Search,
  Filter,
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  Bell,
  ExternalLink,
  X,
  TrendingUp,
  User,
  KeyRound,
} from 'lucide-react';
import { StatusLabel } from '../../components/common/StatusLabel';
import { ARAgingChart } from '../../components/financial/ARAgingChart';
import { Dashboard, ActiveDashboardTab } from '../../components/financial/Dashboard';
import { apiClient, UserMeResponse } from '../../services/apiClient';
import {
  Quote,
  Invoice,
  Payment,
  ARAgingMetrics,
  getQuotes,
  getInvoices,
  getPayments,
  getARAgingMetrics,
  formatCurrency,
} from '../../services/financial';
import { cn } from '../../lib/utils';

/**
 * Top-level view tab options for the Financial Transparency page [/financial].
 * Allows users to focus on Overview, AR Aging Metrics, Quotes, Invoices, or Payments.
 */
export type FinancialViewMode = 'overview' | 'ar-aging' | 'quotes' | 'invoices' | 'payments';

/**
 * Financial Transparency Dashboard Route Page [/financial] [FR-1, FR-2, FR-3, FR-4].
 *
 * Assembles:
 * 1. Visual AR Aging Metrics [FR-4]: Segmented duration buckets (0-30, 31-60, 61-90, 90+ days).
 * 2. Authorized Quotes with Approval States & Expiration Dates [FR-1].
 * 3. Invoices (Current, Pending, Past Due, Paid) with Status Filters [FR-2].
 * 4. Payment History Records Linked to Invoices [FR-3].
 * 5. Identity Context & Multi-Channel Alert Navigation [FR-5..FR-8].
 */
export default function FinancialPage() {
  // User Session / Identity Context State
  const [user, setUser] = useState<UserMeResponse | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [userError, setUserError] = useState<string | null>(null);

  // View Mode & Tab Switching State
  const [activeView, setActiveView] = useState<FinancialViewMode>('overview');

  // Customer ID & Query Filter State
  const [customerIdInput, setCustomerIdInput] = useState<string>('');
  const [activeCustomerId, setActiveCustomerId] = useState<string>('');
  const [asOfDateVal, setAsOfDateVal] = useState<string>('');

  // Manual Refresh & Sync State
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAtStr, setLastRefreshedAtStr] = useState<string>('');

  // Selected Invoice Modal / Deep-link State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Load Active User Identity
  useEffect(() => {
    let isMounted = true;

    async function loadIdentity() {
      try {
        setLoadingUser(true);
        setUserError(null);
        const userData = await apiClient.getMe();
        if (isMounted) {
          setUser(userData);
        }
      } catch (err: any) {
        if (isMounted) {
          setUserError(err?.message || 'Failed to load user financial session context.');
        }
      } finally {
        if (isMounted) {
          setLoadingUser(false);
        }
      }
    }

    loadIdentity();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update last refreshed timestamp on initial mount & manual refresh
  useEffect(() => {
    const now = new Date();
    setLastRefreshedAtStr(
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }, [refreshKey]);

  // Handle Manual Refresh Execution
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  }, []);

  // Apply Customer ID Filter
  const handleApplyCustomerFilter = useCallback((e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setActiveCustomerId(customerIdInput.trim());
  }, [customerIdInput]);

  // Clear Customer ID Filter
  const handleClearCustomerFilter = useCallback(() => {
    setCustomerIdInput('');
    setActiveCustomerId('');
  }, []);

  // Map Active View Mode to Dashboard Initial Tab
  const dashboardInitialTab: ActiveDashboardTab = useMemo(() => {
    switch (activeView) {
      case 'quotes':
        return 'quotes';
      case 'invoices':
        return 'invoices';
      case 'payments':
        return 'payments';
      default:
        return 'all';
    }
  }, [activeView]);

  return (
    <div
      className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-200"
      data-testid="financial-page-container"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ==================================================================== */}
        {/* Page Header & Session Context Banner                                 */}
        {/* ==================================================================== */}
        <header className="bg-white rounded-xl border border-[#d1c4b9] p-6 shadow-sm space-y-6">
          {/* Breadcrumb Navigation & Top Action Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#f0eee9] pb-4">
            <nav className="flex items-center text-xs font-medium text-[#735c41] space-x-2">
              <Link href="/dashboard" className="hover:text-[#59452b] transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-[#80756b]" />
              <span className="text-[#1b1c19] font-semibold">Financial Transparency</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <StatusLabel status="active" label="Billing Engine Active" />
              <StatusLabel status="success" label="Audit Trail Verified" />
              <StatusLabel status="info" label="Tenant Isolated" />
            </div>
          </div>

          {/* Main Title, Subtitle, and Action Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#f0eee9] text-[#59452b]">
                  <DollarSign className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1b1c19] tracking-tight">
                    Financial Transparency & AR Management
                  </h1>
                  <p className="text-sm text-[#4e453d] mt-1">
                    Real-time oversight into authorized quotes [FR-1], billing invoices [FR-2],
                    payment history records [FR-3], and visual AR aging buckets [FR-4].
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[#d1c4b9] bg-white text-[#59452b] hover:bg-[#f0eee9] focus:outline-none focus:ring-2 focus:ring-[#735c41] transition-all shadow-sm disabled:opacity-50',
                  isRefreshing && 'animate-pulse'
                )}
                aria-label="Refresh Financial Data"
                data-testid="refresh-financial-btn"
              >
                <RotateCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
              </button>

              <Link
                href="/notifications"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[#d1c4b9] bg-[#f0eee9] text-[#59452b] hover:bg-[#e4e2dd] focus:outline-none focus:ring-2 focus:ring-[#735c41] transition-all shadow-sm"
                data-testid="nav-notifications-link"
              >
                <Bell className="w-4 h-4 text-[#735c41]" />
                <span>Alert Triggers</span>
              </Link>
            </div>
          </div>

          {/* User Session & Tenant Context Summary */}
          <div className="bg-[#f0eee9] rounded-lg p-4 border border-[#d1c4b9]/60 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            {loadingUser ? (
              <div className="flex items-center gap-2 text-[#735c41]">
                <RotateCw className="w-4 h-4 animate-spin text-[#59452b]" />
                <span>Loading identity context and session permissions...</span>
              </div>
            ) : userError ? (
              <div className="flex items-center gap-2 text-[#ba1a1a]">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Session Context Error: {userError}</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-[#4e453d]">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#735c41]" />
                  <span className="font-semibold text-[#1b1c19]">{user?.email || 'Authenticated User'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#735c41]" />
                  <span>Tenant ID:</span>
                  <span className="font-mono font-medium text-[#1b1c19]">
                    {user?.tenant_id || 'System Tenant'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#735c41]" />
                  <span>Roles:</span>
                  <div className="flex items-center gap-1">
                    {user?.roles && user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <span
                          key={role}
                          className="px-1.5 py-0.5 rounded bg-white border border-[#d1c4b9] font-medium text-[#59452b]"
                        >
                          {role}
                        </span>
                      ))
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-white border border-[#d1c4b9] font-medium text-[#59452b]">
                        FinancialViewer
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-[#80756b] self-end md:self-auto">
              <Clock className="w-3.5 h-3.5 text-[#735c41]" />
              <span>Last synced: {lastRefreshedAtStr || 'Just now'}</span>
            </div>
          </div>
        </header>

        {/* ==================================================================== */}
        {/* Global Filter Bar & Customer Search                                  */}
        {/* ==================================================================== */}
        <section
          className="bg-white rounded-xl border border-[#d1c4b9] p-4 shadow-sm"
          aria-label="Financial Search and Filters"
        >
          <form
            onSubmit={handleApplyCustomerFilter}
            className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
          >
            {/* Customer ID Filter Input */}
            <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#80756b]" />
                <input
                  type="text"
                  value={customerIdInput}
                  onChange={(e) => setCustomerIdInput(e.target.value)}
                  placeholder="Filter by Customer ID (e.g. CUST-001, CUST-888)..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#d1c4b9] bg-[#fbf9f4] text-sm text-[#1b1c19] placeholder-[#80756b] focus:outline-none focus:ring-2 focus:ring-[#735c41] focus:bg-white transition-all"
                  data-testid="customer-id-input"
                />
                {customerIdInput && (
                  <button
                    type="button"
                    onClick={handleClearCustomerFilter}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#80756b] hover:text-[#1b1c19]"
                    title="Clear Customer Filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg bg-[#59452b] text-white text-sm font-medium hover:bg-[#735c41] focus:outline-none focus:ring-2 focus:ring-[#735c41] transition-all shadow-sm"
                  data-testid="apply-customer-filter-btn"
                >
                  Apply Filter
                </button>

                {activeCustomerId && (
                  <button
                    type="button"
                    onClick={handleClearCustomerFilter}
                    className="px-3 py-2.5 rounded-lg border border-[#d1c4b9] bg-white text-[#80756b] hover:text-[#1b1c19] text-sm transition-all"
                    data-testid="clear-customer-filter-btn"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Active Filter Indicator Badge */}
            {activeCustomerId && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#f0eee9] border border-[#d1c4b9] text-xs text-[#59452b] font-medium">
                <Filter className="w-3.5 h-3.5 text-[#735c41]" />
                <span>Active Customer Filter:</span>
                <span className="font-mono font-bold text-[#1b1c19]">{activeCustomerId}</span>
              </div>
            )}
          </form>
        </section>

        {/* ==================================================================== */}
        {/* Navigation View Switcher Tabs                                        */}
        {/* ==================================================================== */}
        <div className="border-b border-[#d1c4b9] pb-px">
          <nav
            className="flex flex-wrap items-center gap-2 sm:gap-4"
            aria-label="Financial Transparency View Sections"
          >
            <button
              type="button"
              onClick={() => setActiveView('overview')}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-all focus:outline-none',
                activeView === 'overview'
                  ? 'border-[#59452b] text-[#59452b] font-semibold bg-white/60 rounded-t-lg'
                  : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#80756b]'
              )}
              data-testid="tab-overview"
            >
              <BarChart3 className="w-4 h-4 text-[#735c41]" />
              <span>Overview & All Metrics</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('ar-aging')}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-all focus:outline-none',
                activeView === 'ar-aging'
                  ? 'border-[#59452b] text-[#59452b] font-semibold bg-white/60 rounded-t-lg'
                  : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#80756b]'
              )}
              data-testid="tab-ar-aging"
            >
              <Clock className="w-4 h-4 text-[#735c41]" />
              <span>AR Aging Buckets [FR-4]</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('quotes')}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-all focus:outline-none',
                activeView === 'quotes'
                  ? 'border-[#59452b] text-[#59452b] font-semibold bg-white/60 rounded-t-lg'
                  : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#80756b]'
              )}
              data-testid="tab-quotes"
            >
              <FileText className="w-4 h-4 text-[#735c41]" />
              <span>Quotes & Approvals [FR-1]</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('invoices')}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-all focus:outline-none',
                activeView === 'invoices'
                  ? 'border-[#59452b] text-[#59452b] font-semibold bg-white/60 rounded-t-lg'
                  : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#80756b]'
              )}
              data-testid="tab-invoices"
            >
              <FileText className="w-4 h-4 text-[#735c41]" />
              <span>Invoices & Billing [FR-2]</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('payments')}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-all focus:outline-none',
                activeView === 'payments'
                  ? 'border-[#59452b] text-[#59452b] font-semibold bg-white/60 rounded-t-lg'
                  : 'border-transparent text-[#4e453d] hover:text-[#1b1c19] hover:border-[#80756b]'
              )}
              data-testid="tab-payments"
            >
              <CreditCard className="w-4 h-4 text-[#735c41]" />
              <span>Payment History [FR-3]</span>
            </button>
          </nav>
        </div>

        {/* ==================================================================== */}
        {/* Main Content Render Area based on Active View                        */}
        {/* ==================================================================== */}
        <main className="space-y-8" key={refreshKey}>
          {/* Section 1: Visual AR Aging Metrics Chart [FR-4] */}
          {(activeView === 'overview' || activeView === 'ar-aging') && (
            <section
              className="transition-all duration-300"
              aria-label="Accounts Receivable Aging Metrics Section"
            >
              <ARAgingChart
                key={`ar-aging-${activeCustomerId}-${refreshKey}`}
                customerId={activeCustomerId || undefined}
                asOfDateVal={asOfDateVal || undefined}
                onRetry={handleRefresh}
                title={
                  activeView === 'ar-aging'
                    ? 'Detailed Accounts Receivable (AR) Duration Aging Analysis'
                    : 'Accounts Receivable (AR) Aging Summary'
                }
                data-testid="page-ar-aging-chart"
              />
            </section>
          )}

          {/* Section 2: Consolidated Financial Transparency Dashboard [FR-1, FR-2, FR-3] */}
          {(activeView === 'overview' ||
            activeView === 'quotes' ||
            activeView === 'invoices' ||
            activeView === 'payments') && (
            <section
              className="transition-all duration-300"
              aria-label="Quotes, Invoices, and Payments Dashboard Section"
            >
              <Dashboard
                key={`dashboard-${activeCustomerId}-${activeView}-${refreshKey}`}
                customerId={activeCustomerId || undefined}
                initialTab={dashboardInitialTab}
                onSelectInvoice={(invoiceId) => setSelectedInvoiceId(invoiceId)}
                onRetry={handleRefresh}
                title={
                  activeView === 'quotes'
                    ? 'Authorized Quotes & Approval Tracking'
                    : activeView === 'invoices'
                    ? 'Billing Invoices & Outstanding Balances'
                    : activeView === 'payments'
                    ? 'Payment History & Linked Invoices'
                    : 'Consolidated Financial Transparency Records'
                }
                data-testid="page-financial-dashboard"
              />
            </section>
          )}
        </main>

        {/* ==================================================================== */}
        {/* Footer Audit & Compliance Notice                                     */}
        {/* ==================================================================== */}
        <footer className="bg-white rounded-xl border border-[#d1c4b9] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#735c41]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#59452b] flex-shrink-0" />
            <span>
              Financial Transparency Platform • All quotes, invoices, and payments are tenant-isolated and audit-logged.
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/notifications"
              className="hover:text-[#59452b] underline transition-colors"
            >
              Manage Alert Triggers
            </Link>
            <span className="text-[#d1c4b9]">•</span>
            <span className="font-mono text-[#80756b]">OpenAPI 3.1 Contract Synchronized</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
