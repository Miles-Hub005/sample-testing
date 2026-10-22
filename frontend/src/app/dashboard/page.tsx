'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  User,
  Building2,
  ArrowRight,
  TrendingUp,
  FileText,
  Headphones,
  DollarSign,
  BookOpen,
  AlertCircle,
  KeyRound,
  Clock,
  RotateCw,
  Layers,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { StatusLabel } from '../../components/common/StatusLabel';
import { apiClient, UserMeResponse } from '../../services/apiClient';
import {
  getDashboardSummary,
  DashboardSummaryResponse,
  DashboardTimeframe,
  DashboardDomain,
  ALLOWED_TIMEFRAMES,
} from '../../services/dashboard';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { QuickViewPanel } from '../../components/dashboard/QuickViewPanel';

const REFRESH_INTERVAL_MS = 30000; // 30-second REST polling refresh loop

export default function DashboardPage() {
  // User Profile & Authentication Context State
  const [user, setUser] = useState<UserMeResponse | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [userError, setUserError] = useState<string | null>(null);

  // Executive Dashboard Metrics State
  const [timeframe, setTimeframe] = useState<DashboardTimeframe>('30d');
  const [summaryData, setSummaryData] = useState<DashboardSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // QuickView Panel Selection State
  const [selectedDomain, setSelectedDomain] = useState<DashboardDomain>('lead_gen');

  // Ref to hold current summaryData to avoid recreating fetch callback
  const summaryDataRef = useRef<DashboardSummaryResponse | null>(null);
  summaryDataRef.current = summaryData;

  // Load User Data on Mount
  useEffect(() => {
    let isMounted = true;

    async function loadUserData() {
      try {
        setLoadingUser(true);
        setUserError(null);
        const data = await apiClient.getMe();
        if (isMounted) {
          setUser(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setUserError(err?.message || 'Failed to load user profile information.');
        }
      } finally {
        if (isMounted) {
          setLoadingUser(false);
        }
      }
    }

    loadUserData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Summary Metrics Callback
  const fetchSummary = useCallback(
    async (isSilent = false) => {
      if (!isSilent) {
        setSummaryLoading(true);
      } else {
        setIsRefreshing(true);
      }

      try {
        const data = await getDashboardSummary(timeframe);
        setSummaryData(data);
        setSummaryError(null);
        setLastRefreshedAt(new Date());
      } catch (err: any) {
        if (!isSilent || !summaryDataRef.current) {
          setSummaryError(
            err?.message || 'Failed to retrieve executive dashboard summary metrics.'
          );
        }
      } finally {
        setSummaryLoading(false);
        setIsRefreshing(false);
      }
    },
    [timeframe]
  );

  // Polling Loop Effect (30-second REST polling refresh loop)
  useEffect(() => {
    let isMounted = true;

    // Trigger initial fetch on mount or timeframe change
    fetchSummary(false);

    if (!autoRefresh) {
      return;
    }

    // Set up 30s polling loop
    const intervalId = setInterval(() => {
      if (isMounted) {
        fetchSummary(true);
      }
    }, REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [timeframe, autoRefresh, fetchSummary]);

  // Handle clicking on a domain summary card to focus quick-view panel
  const handleDomainCardClick = (domain: string) => {
    const validDomains: DashboardDomain[] = ['lead_gen', 'sales_pipeline', 'support', 'financials'];
    if (validDomains.includes(domain as DashboardDomain)) {
      setSelectedDomain(domain as DashboardDomain);
    }
  };

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      {/* Page Header */}
      <header className="border-b border-[#e4e2dd] pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif text-[#1b1c19] tracking-tight">
              Dashboard Overview
            </h1>
            <p className="mt-2 text-base text-[#4e453d] max-w-2xl">
              Platform access control, tenant isolation metrics, and executive operational KPIs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusLabel status="online" label="System Operational" size="md" />
            <StatusLabel
              status={autoRefresh ? 'active' : 'offline'}
              label={autoRefresh ? '30s Auto-Sync Active' : 'Auto-Sync Paused'}
              size="md"
            />
            <StatusLabel status="active" label="RBAC Active" size="md" />
          </div>
        </div>
      </header>

      {/* User & Identity Summary Banner */}
      <section
        aria-labelledby="identity-heading"
        className="bg-[#f0eee9] border border-[#e4e2dd] rounded-lg p-6 shadow-sm"
      >
        <h2 id="identity-heading" className="sr-only">
          User Identity and Session Context
        </h2>

        {loadingUser ? (
          <div
            className="flex items-center justify-center py-6 text-[#4e453d]"
            aria-busy="true"
            aria-label="Loading user profile information"
          >
            <Clock className="w-5 h-5 animate-spin mr-2 text-[#735c41]" aria-hidden="true" />
            <span className="text-sm font-medium">
              Authenticating identity and loading context...
            </span>
          </div>
        ) : userError ? (
          <div
            className="flex items-start gap-3 p-4 bg-[#ffdad6] text-[#93000a] rounded-md border border-[#ba1a1a]"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-sm">Authentication Session Alert</p>
              <p className="text-sm mt-1">{userError}</p>
            </div>
          </div>
        ) : user ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[#e4e2dd] rounded-md text-[#59452b]">
                <User className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#4e453d] font-semibold">
                  Authenticated User
                </p>
                <p
                  className="text-sm font-medium text-[#1b1c19] mt-0.5 truncate"
                  title={user.email}
                >
                  {user.email}
                </p>
                <p className="text-xs text-[#4e453d] mt-1">
                  ID: <span className="font-mono text-[11px]">{user.user_id.substring(0, 8)}...</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[#e4e2dd] rounded-md text-[#59452b]">
                <Building2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#4e453d] font-semibold">
                  Tenant Realm
                </p>
                <p className="text-sm font-medium text-[#1b1c19] mt-0.5 font-mono">
                  {user.tenant_id}
                </p>
                <p className="text-xs text-[#4e453d] mt-1">Multi-Tenant Isolated</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[#e4e2dd] rounded-md text-[#59452b]">
                <KeyRound className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#4e453d] font-semibold">
                  Assigned Roles
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {user.roles && user.roles.length > 0 ? (
                    user.roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#735c41] text-white"
                      >
                        {role}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#4e453d]">No roles assigned</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-[#e4e2dd] rounded-md text-[#59452b]">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#4e453d] font-semibold">
                  Security Boundary
                </p>
                <div className="mt-1">
                  <StatusLabel status="passed" label="Enforced & Audited" size="sm" />
                </div>
                <p className="text-xs text-[#4e453d] mt-1">Sub-20ms Latency</p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Executive Operational KPI Summary Section */}
      <section
        aria-labelledby="executive-summary-heading"
        data-testid="dashboard-executive-summary"
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#f5f3ee] border border-[#e4e2dd] rounded-lg p-5">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#735c41]" aria-hidden="true" />
              <h2
                id="executive-summary-heading"
                className="text-xl font-serif text-[#1b1c19]"
              >
                Executive Operational KPIs
              </h2>
            </div>
            <p className="text-xs text-[#4e453d] mt-1">
              Consolidated real-time operational status across core business domains with 30s auto-refresh.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Timeframe Selector Controls */}
            <div
              className="inline-flex rounded-md shadow-sm border border-[#e4e2dd] bg-[#f0eee9] p-0.5"
              role="group"
              aria-label="Select comparative timeframe"
              data-testid="timeframe-selector"
            >
              {ALLOWED_TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  data-testid={`timeframe-${tf}`}
                  aria-pressed={timeframe === tf}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors focus:outline-none focus:ring-1 focus:ring-[#735c41] ${
                    timeframe === tf
                      ? 'bg-[#735c41] text-white shadow-xs'
                      : 'text-[#4e453d] hover:text-[#1b1c19] hover:bg-[#eae8e3]'
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Manual Refresh Button */}
            <button
              type="button"
              onClick={() => fetchSummary(false)}
              disabled={summaryLoading || isRefreshing}
              data-testid="refresh-button"
              aria-label="Refresh dashboard metrics"
              title="Refresh dashboard summary metrics"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1b1c19] bg-[#e4e2dd] hover:bg-[#dbdad5] disabled:opacity-50 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#735c41]"
            >
              <RotateCw
                className={`w-3.5 h-3.5 text-[#59452b] ${
                  summaryLoading || isRefreshing ? 'animate-spin' : ''
                }`}
                aria-hidden="true"
              />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            {/* Auto-Refresh Toggle Button */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              data-testid="auto-refresh-toggle"
              aria-pressed={autoRefresh}
              title="Toggle 30-second automatic REST polling refresh"
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                autoRefresh
                  ? 'border-[#735c41] text-[#735c41] bg-[#f5d6b4]/30'
                  : 'border-[#80756b] text-[#80756b] bg-transparent'
              }`}
            >
              <Activity className="w-3 h-3" aria-hidden="true" />
              <span>30s Loop: {autoRefresh ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Refresh Timestamp Banner */}
        {lastRefreshedAt && (
          <div className="flex items-center justify-between text-xs text-[#4e453d] px-1">
            <span>
              Last synchronized: {lastRefreshedAt.toLocaleTimeString('en-US', { hour12: true })}
            </span>
            {summaryData?.status && (
              <span className="font-mono font-medium uppercase text-[11px]">
                Aggregation Status: {summaryData.status}
              </span>
            )}
          </div>
        )}

        {/* Partial or Failed Outage Warning Banner */}
        {summaryData?.status === 'PARTIAL' && (
          <div
            className="flex items-start gap-3 p-4 bg-[#f5d6b4]/40 border border-[#735c41] rounded-md text-[#58432a]"
            role="status"
            aria-live="polite"
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-[#735c41] mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">Partial Operational Metrics Loaded</p>
              <p className="text-xs mt-0.5">
                One or more domain reporting connectors experienced connectivity delays or service outages.
                Remaining operational KPI cards are displayed below with full integrity.
              </p>
            </div>
          </div>
        )}

        {summaryError && (
          <div
            className="flex items-start justify-between gap-3 p-4 bg-[#ffdad6] border border-[#ba1a1a] rounded-md text-[#93000a]"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">Metric Retrieval Error</p>
                <p className="text-xs mt-0.5">{summaryError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchSummary(false)}
              className="text-xs font-semibold underline hover:no-underline flex-shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Summary Metrics Cards Grid */}
        <div
          data-testid="summary-metrics-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {summaryLoading && !summaryData ? (
            // Skeleton Loader Cards
            [1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="bg-[#f5f3ee] border border-[#e4e2dd] rounded-lg p-5 animate-pulse min-h-[160px] flex flex-col justify-between"
              >
                <div className="h-4 bg-[#e4e2dd] rounded w-2/3"></div>
                <div className="h-8 bg-[#e4e2dd] rounded w-1/2 my-3"></div>
                <div className="h-3 bg-[#e4e2dd] rounded w-3/4"></div>
              </div>
            ))
          ) : summaryData?.metrics && summaryData.metrics.length > 0 ? (
            summaryData.metrics.map((metric) => (
              <MetricCard
                key={`${metric.domain}-${metric.metric_key}`}
                metric={metric}
                onClick={() => handleDomainCardClick(metric.domain)}
                onRetry={() => fetchSummary(false)}
                data-testid={`summary-metric-card-${metric.metric_key}`}
              />
            ))
          ) : (
            <div className="col-span-full bg-[#f0eee9] border border-[#e4e2dd] rounded-lg p-6 text-center text-[#4e453d]">
              <p className="text-sm">No executive summary metrics available for the selected timeframe.</p>
              <button
                type="button"
                onClick={() => fetchSummary(false)}
                className="mt-2 text-xs font-medium text-[#735c41] underline hover:no-underline"
              >
                Reload Summary
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Core Domain Quick-View Drilldown Panel */}
      <section
        aria-labelledby="quick-view-heading"
        data-testid="quick-view-section"
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2
            id="quick-view-heading"
            className="text-xl font-serif text-[#1b1c19]"
          >
            Core Domain Quick-View Drilldowns
          </h2>
          <span className="text-xs text-[#4e453d]">
            Click any tab or summary card above to inspect domain specifics
          </span>
        </div>

        <QuickViewPanel
          selectedDomain={selectedDomain}
          onSelectDomain={(domain) => setSelectedDomain(domain)}
          timeframe={timeframe}
          data-testid="quick-view-panel"
        />
      </section>

      {/* Key Performance & Governance Metrics */}
      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="text-xl font-serif text-[#1b1c19] mb-4">
          Key Performance & Governance Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#f5f3ee] border border-[#e4e2dd] rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#4e453d]">
                RBAC Access Evaluations
              </span>
              <StatusLabel status="active" label="Active" size="sm" showDot={false} />
            </div>
            <p className="text-3xl font-bold text-[#1b1c19] mt-3">100%</p>
            <p className="text-xs text-[#4e453d] mt-2">
              Server-side boundary checks executed prior to API execution.
            </p>
          </div>

          <div className="bg-[#f5f3ee] border border-[#e4e2dd] rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#4e453d]">
                Audit Logging Pipeline
              </span>
              <StatusLabel status="online" label="Fail-Safe" size="sm" showDot={false} />
            </div>
            <p className="text-3xl font-bold text-[#1b1c19] mt-3">Non-Blocking</p>
            <p className="text-xs text-[#4e453d] mt-2">
              Structured JSON events emitted to stdout with correlation IDs.
            </p>
          </div>

          <div className="bg-[#f5f3ee] border border-[#e4e2dd] rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#4e453d]">
                Tenant Isolation Guard
              </span>
              <StatusLabel status="success" label="Enforced" size="sm" showDot={false} />
            </div>
            <p className="text-3xl font-bold text-[#1b1c19] mt-3">Strict (HTTP 403)</p>
            <p className="text-xs text-[#4e453d] mt-2">
              Cross-tenant access attempts rejected with forbidden status.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Navigation Cards to Domain Areas */}
      <section aria-labelledby="domains-heading">
        <h2 id="domains-heading" className="text-xl font-serif text-[#1b1c19] mb-4">
          Platform Domain Sections
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/performance"
            className="group block bg-[#f0eee9] hover:bg-[#eae8e3] border border-[#e4e2dd] rounded-lg p-5 transition-all focus:outline-none focus:ring-2 focus:ring-[#735c41]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#eae8e3] group-hover:bg-[#e4e2dd] rounded-md text-[#59452b]">
                  <TrendingUp className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-medium text-[#1b1c19]">Performance</h3>
              </div>
              <ArrowRight
                className="w-4 h-4 text-[#4e453d] group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </div>
            <p className="text-xs text-[#4e453d] mt-3">
              Monitor latency targets, system benchmarks, and sub-20ms evaluation metrics.
            </p>
          </Link>

          <Link
            href="/contracts"
            className="group block bg-[#f0eee9] hover:bg-[#eae8e3] border border-[#e4e2dd] rounded-lg p-5 transition-all focus:outline-none focus:ring-2 focus:ring-[#735c41]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#eae8e3] group-hover:bg-[#e4e2dd] rounded-md text-[#59452b]">
                  <FileText className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-medium text-[#1b1c19]">Contracts</h3>
              </div>
              <ArrowRight
                className="w-4 h-4 text-[#4e453d] group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </div>
            <p className="text-xs text-[#4e453d] mt-3">
              Review OpenAPI specifications, client schemas, and API agreement versions.
            </p>
          </Link>

          <Link
            href="/support"
            className="group block bg-[#f0eee9] hover:bg-[#eae8e3] border border-[#e4e2dd] rounded-lg p-5 transition-all focus:outline-none focus:ring-2 focus:ring-[#735c41]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#eae8e3] group-hover:bg-[#e4e2dd] rounded-md text-[#59452b]">
                  <Headphones className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-medium text-[#1b1c19]">Support</h3>
              </div>
              <ArrowRight
                className="w-4 h-4 text-[#4e453d] group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </div>
            <p className="text-xs text-[#4e453d] mt-3">
              Access platform technical assistance, ticket management, and operational help.
            </p>
          </Link>

          <Link
            href="/financials"
            className="group block bg-[#f0eee9] hover:bg-[#eae8e3] border border-[#e4e2dd] rounded-lg p-5 transition-all focus:outline-none focus:ring-2 focus:ring-[#735c41]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#eae8e3] group-hover:bg-[#e4e2dd] rounded-md text-[#59452b]">
                  <DollarSign className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-medium text-[#1b1c19]">Financials</h3>
              </div>
              <ArrowRight
                className="w-4 h-4 text-[#4e453d] group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </div>
            <p className="text-xs text-[#4e453d] mt-3">
              Manage billing statements, usage invoicing, and subscription tier allocations.
            </p>
          </Link>

          <Link
            href="/knowledge"
            className="group block bg-[#f0eee9] hover:bg-[#eae8e3] border border-[#e4e2dd] rounded-lg p-5 transition-all focus:outline-none focus:ring-2 focus:ring-[#735c41]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#eae8e3] group-hover:bg-[#e4e2dd] rounded-md text-[#59452b]">
                  <BookOpen className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-medium text-[#1b1c19]">Knowledge Base</h3>
              </div>
              <ArrowRight
                className="w-4 h-4 text-[#4e453d] group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              />
            </div>
            <p className="text-xs text-[#4e453d] mt-3">
              Explore documentation, RBAC policy guides, and security integration references.
            </p>
          </Link>
        </div>
      </section>

      {/* System Status & Audit Activity Table */}
      <section
        aria-labelledby="activity-heading"
        className="bg-[#f5f3ee] border border-[#e4e2dd] rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="activity-heading" className="text-lg font-serif text-[#1b1c19]">
            Recent Access Control & Audit Stream Activity
          </h2>
          <StatusLabel status="active" label="Live Stream" size="sm" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#1b1c19]">
            <thead className="text-xs uppercase bg-[#eae8e3] text-[#4e453d] tracking-wider border-b border-[#e4e2dd]">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Event Action
                </th>
                <th scope="col" className="px-4 py-3">
                  Resource / Endpoint
                </th>
                <th scope="col" className="px-4 py-3">
                  Tenant Binding
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e2dd]">
              <tr>
                <td className="px-4 py-3 font-mono text-xs">LOGIN_SUCCESS</td>
                <td className="px-4 py-3 font-mono text-xs">/api/v1/auth/login</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {user?.tenant_id || 'System'}
                </td>
                <td className="px-4 py-3">
                  <StatusLabel status="success" label="SUCCESS" size="sm" showDot={false} />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">EVALUATE_RBAC_POLICY</td>
                <td className="px-4 py-3 font-mono text-xs">/api/v1/navigation/menu</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {user?.tenant_id || 'System'}
                </td>
                <td className="px-4 py-3">
                  <StatusLabel status="passed" label="ALLOWED" size="sm" showDot={false} />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono text-xs">READ_DASHBOARD_DATA</td>
                <td className="px-4 py-3 font-mono text-xs">/api/v1/auth/me</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {user?.tenant_id || 'System'}
                </td>
                <td className="px-4 py-3">
                  <StatusLabel status="active" label="COMPLETED" size="sm" showDot={false} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
