'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  ChevronRight,
  RotateCw,
  ShieldCheck,
  DollarSign,
  AlertCircle,
  User,
  Building2,
  Zap,
  Sliders,
  Clock,
} from 'lucide-react';
import { StatusLabel } from '../../components/common/StatusLabel';
import { NotificationHub, ActiveAlertTab } from '../../components/alerting/NotificationHub';
import { apiClient, UserMeResponse } from '../../services/apiClient';
import { cn } from '../../lib/utils';

/**
 * Multi-Channel Notification Center Route Page [/notifications] [FR-5, FR-6, FR-7].
 *
 * Assembles:
 * 1. Centralized In-App System Alerts & Notifications [FR-5].
 * 2. Custom Financial Alert Trigger Rules & Criteria Thresholds [FR-6].
 * 3. Role-Based Multi-Channel Dispatch Preferences with Optimistic Locking [FR-7].
 * 4. Identity Session Context & Cross-Navigation Links to Financial Dashboard.
 */
export default function NotificationsPage() {
  // User Session / Identity Context State
  const [user, setUser] = useState<UserMeResponse | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [userError, setUserError] = useState<string | null>(null);

  // Active Tab State ('alerts' | 'triggers' | 'preferences')
  const [activeTab, setActiveTab] = useState<ActiveAlertTab>('alerts');

  // Sync & Refresh State
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAtStr, setLastRefreshedAtStr] = useState<string>('');

  // Load Active User Session Context
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
          setUserError(err?.message || 'Failed to load user notification session context.');
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

  // Update last refreshed timestamp
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

  return (
    <div
      className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-200"
      data-testid="notifications-page-container"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ==================================================================== */}
        {/* Page Header & Session Context Banner                                 */}
        {/* ==================================================================== */}
        <header className="bg-white rounded-xl border border-[#d1c4b9] p-6 shadow-sm space-y-6">
          {/* Breadcrumb Navigation & Top Status Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#f0eee9] pb-4">
            <nav className="flex items-center text-xs font-medium text-[#735c41] space-x-2" aria-label="Breadcrumb">
              <Link href="/dashboard" className="hover:text-[#59452b] transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-[#80756b]" />
              <Link href="/financial" className="hover:text-[#59452b] transition-colors">
                Financial Transparency
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-[#80756b]" />
              <span className="text-[#1b1c19] font-semibold">Notification Center</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              <StatusLabel status="active" label="Notification Engine Active" />
              <StatusLabel status="success" label="Multi-Channel Routing" />
              <StatusLabel status="info" label="Tenant Isolated" />
            </div>
          </div>

          {/* Main Title, Subtitle, and Toolbar Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#f0eee9] text-[#59452b]">
                  <Bell className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1b1c19] tracking-tight">
                    Multi-Channel Notification Center & Alert Hub
                  </h1>
                  <p className="text-sm text-[#4e453d] mt-1">
                    Centralized system alerts [FR-5], custom financial threshold triggers [FR-6],
                    and role-based dispatch preferences [FR-7].
                  </p>
                </div>
              </div>
            </div>

            {/* Toolbar Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[#d1c4b9] bg-white text-[#59452b] hover:bg-[#f0eee9] focus:outline-none focus:ring-2 focus:ring-[#735c41] transition-all shadow-sm disabled:opacity-50',
                  isRefreshing && 'animate-pulse'
                )}
                aria-label="Refresh Notifications and Preferences"
                data-testid="refresh-notifications-btn"
              >
                <RotateCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
              </button>

              <Link
                href="/financial"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[#d1c4b9] bg-[#f0eee9] text-[#59452b] hover:bg-[#e4e2dd] focus:outline-none focus:ring-2 focus:ring-[#735c41] transition-all shadow-sm"
                data-testid="nav-financial-link"
              >
                <DollarSign className="w-4 h-4 text-[#735c41]" />
                <span>Financial Dashboard</span>
              </Link>
            </div>
          </div>

          {/* User Session & Tenant Context Banner */}
          <div className="bg-[#f0eee9] rounded-lg p-4 border border-[#d1c4b9]/60 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            {loadingUser ? (
              <div className="flex items-center gap-2 text-[#735c41]">
                <RotateCw className="w-4 h-4 animate-spin text-[#59452b]" />
                <span>Loading user session context and notification permissions...</span>
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
                  <span className="font-semibold text-[#1b1c19]" data-testid="notifications-user-email">
                    {user?.email || 'Authenticated User'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#735c41]" />
                  <span>Tenant ID:</span>
                  <span className="font-mono font-medium text-[#1b1c19]" data-testid="notifications-tenant-id">
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
                        NotificationViewer
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
        {/* Main Notification Hub View [FR-5, FR-6, FR-7]                        */}
        {/* ==================================================================== */}
        <main className="space-y-8" key={refreshKey}>
          <section aria-label="Notification Center Hub">
            <NotificationHub
              initialTab={activeTab}
              data-testid="page-notification-hub"
            />
          </section>
        </main>

        {/* ==================================================================== */}
        {/* Footer Audit & Compliance Notice                                     */}
        {/* ==================================================================== */}
        <footer className="bg-white rounded-xl border border-[#d1c4b9] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#735c41]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#59452b] flex-shrink-0" />
            <span>
              Multi-Channel Alerting Platform • In-app system alerts, email dispatches, and SMS notifications are logged with correlation tracking.
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/financial"
              className="hover:text-[#59452b] underline transition-colors"
            >
              Financial Transparency
            </Link>
            <span className="text-[#d1c4b9]">•</span>
            <span className="font-mono text-[#80756b]">OpenAPI 3.1 Contract Synchronized</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
