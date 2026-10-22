'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Filter,
  Download,
  RotateCw,
  MapPin,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  FileSpreadsheet,
  Clock,
  User,
  ShieldCheck,
  ChevronRight,
  Activity,
  Award,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { StatusLabel } from '../../components/common/StatusLabel';
import { apiClient, UserMeResponse } from '../../services/apiClient';
import {
  AcquisitionReport,
  ConversionFunnel,
  CampaignComparison,
  TerritoryHeatMap,
  MeetingCalendar,
} from '../../components/analytics';
import {
  submitReportExportTask,
  ReportExportType,
  ExportFormat,
  ExportReportRequest,
  ExportTaskResponse,
  ChannelAcquisitionQueryParams,
  ConversionFunnelQueryParams,
  CampaignComparisonQueryParams,
  TerritoryHeatmapQueryParams,
  CalendarQueryParams,
} from '../../services/analytics';

/**
 * Analytics view tab options.
 */
export type AnalyticsViewTab =
  | 'all'
  | 'acquisition'
  | 'funnel'
  | 'campaigns'
  | 'territory'
  | 'calendar';

/**
 * Lead Acquisition & Marketing Analytics Page [FR-001, FR-004, FR-006, FR-007, FR-009, FR-012, NFR-001].
 *
 * Integrates:
 * 1. Channel Acquisition Report [FR-001]: Attributed lead volume, quality scores, spend, revenue, and ROI.
 * 2. Real-time Conversion Funnel [FR-004]: Stage progression, conversion rates, and bottleneck alerts.
 * 3. Comparative Campaign Trends [FR-006]: Overlay trend metrics for up to 5 campaigns.
 * 4. Geographic Territory Heat Map [FR-007]: Regional lead/deal density and unassigned events drawer.
 * 5. Meeting Prep & Follow-up Calendar [FR-009]: Scheduled meetings, briefings, notes, and tasks.
 * 6. Asynchronous Export Task Handler [FR-012]: Triggers background Celery CSV/PDF report export tasks.
 */
export default function AnalyticsPage() {
  // User Profile State
  const [user, setUser] = useState<UserMeResponse | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  // Active View Tab State
  const [activeTab, setActiveTab] = useState<AnalyticsViewTab>('all');

  // Global Date Filter State
  const [startDateVal, setStartDateVal] = useState<string>('');
  const [endDateVal, setEndDateVal] = useState<string>('');

  // Refetch Key for Refreshing Child Components
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Export Modal State [FR-012]
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportReportType, setExportReportType] = useState<ReportExportType>('acquisition');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [exportSubmitting, setExportSubmitting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportTaskResponse | null>(null);

  // Load User Info
  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      try {
        setLoadingUser(true);
        const me = await apiClient.getMe();
        if (isMounted) {
          setUser(me);
        }
      } catch {
        // Fallback for unauthenticated or dev environment
      } finally {
        if (isMounted) {
          setLoadingUser(false);
        }
      }
    }
    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  // Global Refresh Handler
  const handleRefreshAll = useCallback(() => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  }, []);

  // Filter Objects derived from global date filters
  const acquisitionFilters: ChannelAcquisitionQueryParams = useMemo(() => {
    return {
      start_date_val: startDateVal || undefined,
      end_date_val: endDateVal || undefined,
    };
  }, [startDateVal, endDateVal]);

  const funnelFilters: ConversionFunnelQueryParams = useMemo(() => {
    return {
      start_date_val: startDateVal || undefined,
      end_date_val: endDateVal || undefined,
    };
  }, [startDateVal, endDateVal]);

  const campaignFilters: CampaignComparisonQueryParams = useMemo(() => {
    return {
      start_date_val: startDateVal || undefined,
      end_date_val: endDateVal || undefined,
    };
  }, [startDateVal, endDateVal]);

  const heatmapFilters: TerritoryHeatmapQueryParams = useMemo(() => {
    return {
      start_date_val: startDateVal || undefined,
      end_date_val: endDateVal || undefined,
    };
  }, [startDateVal, endDateVal]);

  const calendarFilters: CalendarQueryParams = useMemo(() => {
    return {
      start_date_val: startDateVal || undefined,
      end_date_val: endDateVal || undefined,
    };
  }, [startDateVal, endDateVal]);

  // Export Submit Handler [FR-012]
  const handleExportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExportSubmitting(true);
    setExportError(null);
    setExportResult(null);

    try {
      const payload: ExportReportRequest = {
        report_type: exportReportType,
        export_format: exportFormat,
        start_date_val: startDateVal || undefined,
        end_date_val: endDateVal || undefined,
      };

      const result = await submitReportExportTask(payload);
      setExportResult(result);
    } catch (err: any) {
      setExportError(err?.message || 'Failed to submit report export task. Please try again.');
    } finally {
      setExportSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] text-[#1b1c19] px-4 py-8 sm:px-8 lg:px-12 font-sans">
      {/* Top Header & Context Bar */}
      <header className="mb-8 border-b border-[#e4e2dd] pb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#59452b] text-white shadow-sm">
                <BarChart3 className="h-5 w-5" />
              </span>
              <h1 className="font-serif text-3xl font-normal tracking-tight text-[#1b1c19]">
                Lead Acquisition & Marketing Analytics
              </h1>
            </div>
            <p className="mt-1 text-sm text-[#4e453d]">
              Attribution performance, real-time conversion bottlenecks, campaign benchmark overlays, territory heat maps, and meeting prep intelligence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* User Session Badge */}
            {user ? (
              <div className="flex items-center gap-2 rounded-md border border-[#e4e2dd] bg-white px-3 py-1.5 text-xs font-medium text-[#4e453d] shadow-2xs">
                <User className="h-3.5 w-3.5 text-[#59452b]" />
                <span>{user.email}</span>
                <StatusLabel status="active" label="Verified" size="sm" />
              </div>
            ) : null}

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#80756b]/40 bg-white px-3.5 py-1.5 text-xs font-medium text-[#1b1c19] shadow-2xs hover:bg-[#f0eee9] focus:outline-hidden focus:ring-2 focus:ring-[#59452b]"
              aria-label="Refresh analytics data"
            >
              <RotateCw className={cn('h-3.5 w-3.5 text-[#59452b]', isRefreshing && 'animate-spin')} />
              <span>{isRefreshing ? 'Refreshing…' : 'Refresh Data'}</span>
            </button>

            {/* Export Report Trigger [FR-012] */}
            <button
              type="button"
              onClick={() => {
                setIsExportModalOpen(true);
                setExportError(null);
                setExportResult(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#59452b] px-4 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#735c41] focus:outline-hidden focus:ring-2 focus:ring-[#59452b]"
              aria-label="Export report"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Global Controls & View Switcher */}
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Navigation View Tabs */}
          <nav className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#e4e2dd] bg-[#f5f3ee] p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
                activeTab === 'all'
                  ? 'bg-white font-semibold text-[#1b1c19] shadow-2xs'
                  : 'text-[#4e453d] hover:text-[#1b1c19]'
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>All Analytics</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('acquisition')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
                activeTab === 'acquisition'
                  ? 'bg-white font-semibold text-[#1b1c19] shadow-2xs'
                  : 'text-[#4e453d] hover:text-[#1b1c19]'
              )}
            >
              <TrendingUp className="h-3.5 w-3.5 text-[#59452b]" />
              <span>Acquisition</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('funnel')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
                activeTab === 'funnel'
                  ? 'bg-white font-semibold text-[#1b1c19] shadow-2xs'
                  : 'text-[#4e453d] hover:text-[#1b1c19]'
              )}
            >
              <BarChart3 className="h-3.5 w-3.5 text-[#a43b2c]" />
              <span>Funnel</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('campaigns')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
                activeTab === 'campaigns'
                  ? 'bg-white font-semibold text-[#1b1c19] shadow-2xs'
                  : 'text-[#4e453d] hover:text-[#1b1c19]'
              )}
            >
              <Activity className="h-3.5 w-3.5 text-[#374a5f]" />
              <span>Campaigns</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('territory')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
                activeTab === 'territory'
                  ? 'bg-white font-semibold text-[#1b1c19] shadow-2xs'
                  : 'text-[#4e453d] hover:text-[#1b1c19]'
              )}
            >
              <MapPin className="h-3.5 w-3.5 text-[#715a3f]" />
              <span>Territory</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-all',
                activeTab === 'calendar'
                  ? 'bg-white font-semibold text-[#1b1c19] shadow-2xs'
                  : 'text-[#4e453d] hover:text-[#1b1c19]'
              )}
            >
              <Calendar className="h-3.5 w-3.5 text-[#59452b]" />
              <span>Calendar</span>
            </button>
          </nav>

          {/* Global Date Filter Inputs */}
          <div className="flex items-center gap-2 rounded-lg border border-[#e4e2dd] bg-white p-1.5 shadow-2xs">
            <Filter className="h-3.5 w-3.5 text-[#80756b]" />
            <span className="text-xs font-medium text-[#4e453d]">Date Range:</span>
            <input
              type="date"
              aria-label="Filter start date"
              value={startDateVal}
              onChange={(e) => setStartDateVal(e.target.value)}
              className="rounded-md border border-[#e4e2dd] bg-[#fbf9f4] px-2 py-1 text-xs text-[#1b1c19] focus:outline-hidden focus:ring-1 focus:ring-[#59452b]"
            />
            <span className="text-xs text-[#80756b]">—</span>
            <input
              type="date"
              aria-label="Filter end date"
              value={endDateVal}
              onChange={(e) => setEndDateVal(e.target.value)}
              className="rounded-md border border-[#e4e2dd] bg-[#fbf9f4] px-2 py-1 text-xs text-[#1b1c19] focus:outline-hidden focus:ring-1 focus:ring-[#59452b]"
            />
            {(startDateVal || endDateVal) && (
              <button
                type="button"
                onClick={() => {
                  setStartDateVal('');
                  setEndDateVal('');
                }}
                className="rounded-md p-1 text-[#80756b] hover:bg-[#f0eee9] hover:text-[#1b1c19]"
                title="Clear date range filters"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="space-y-12">
        {/* Section 1: Channel Acquisition Report [FR-001] */}
        {(activeTab === 'all' || activeTab === 'acquisition') && (
          <section key={`acquisition-${refreshKey}`} className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#e4e2dd] pb-3">
              <div>
                <h2 className="font-serif text-xl font-medium text-[#1b1c19]">
                  1. Channel Acquisition & Attribution
                </h2>
                <p className="text-xs text-[#4e453d]">
                  Attributed lead volume, lead quality score distributions, marketing spend, revenue, and ROI calculations per channel [FR-001].
                </p>
              </div>
              <StatusLabel status="active" label="Live Data" size="sm" />
            </div>
            <AcquisitionReport
              initialFilters={acquisitionFilters}
              data-testid="acquisition-report-section"
            />
          </section>
        )}

        {/* Section 2: Conversion Funnel & Bottleneck Detection [FR-004] */}
        {(activeTab === 'all' || activeTab === 'funnel') && (
          <section key={`funnel-${refreshKey}`} className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#e4e2dd] pb-3">
              <div>
                <h2 className="font-serif text-xl font-medium text-[#1b1c19]">
                  2. Conversion Funnel & Stage Progression
                </h2>
                <p className="text-xs text-[#4e453d]">
                  Stage-by-stage progression counts, sequential conversion rates, drop-off rates, and automated bottleneck threshold alerts [FR-004].
                </p>
              </div>
              <StatusLabel status="active" label="Real-time Funnel" size="sm" />
            </div>
            <ConversionFunnel
              initialFilters={funnelFilters}
              data-testid="conversion-funnel-section"
            />
          </section>
        )}

        {/* Section 3: Campaign Comparison Trend Overlay [FR-006] */}
        {(activeTab === 'all' || activeTab === 'campaigns') && (
          <section key={`campaigns-${refreshKey}`} className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#e4e2dd] pb-3">
              <div>
                <h2 className="font-serif text-xl font-medium text-[#1b1c19]">
                  3. Comparative Campaign Benchmarks
                </h2>
                <p className="text-xs text-[#4e453d]">
                  Multi-campaign overlay charts comparing relative lead volume, cost per lead, and engagement trends over time (up to 5 campaigns) [FR-006].
                </p>
              </div>
              <StatusLabel status="active" label="Max 5 Campaigns" size="sm" />
            </div>
            <CampaignComparison
              initialFilters={campaignFilters}
              data-testid="campaign-comparison-section"
            />
          </section>
        )}

        {/* Section 4: Geographic Territory Heat Map [FR-007] */}
        {(activeTab === 'all' || activeTab === 'territory') && (
          <section key={`territory-${refreshKey}`} className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#e4e2dd] pb-3">
              <div>
                <h2 className="font-serif text-xl font-medium text-[#1b1c19]">
                  4. Regional & Territory Density Heat Map
                </h2>
                <p className="text-xs text-[#4e453d]">
                  Geographic distribution of leads and deal value by region or postal code, with an unassigned events drawer [FR-007].
                </p>
              </div>
              <StatusLabel status="active" label="Territory Matrix" size="sm" />
            </div>
            <TerritoryHeatMap
              initialFilters={heatmapFilters}
              data-testid="territory-heatmap-section"
            />
          </section>
        )}

        {/* Section 5: Meeting Prep & Follow-Up Calendar [FR-009] */}
        {(activeTab === 'all' || activeTab === 'calendar') && (
          <section key={`calendar-${refreshKey}`} className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#e4e2dd] pb-3">
              <div>
                <h2 className="font-serif text-xl font-medium text-[#1b1c19]">
                  5. Meeting Prep & Follow-Up Calendar
                </h2>
                <p className="text-xs text-[#4e453d]">
                  Upcoming meetings, linked preparation briefings, post-meeting note logging, and automated follow-up task dispatch [FR-009].
                </p>
              </div>
              <StatusLabel status="active" label="Action Calendar" size="sm" />
            </div>
            <MeetingCalendar
              initialFilters={calendarFilters}
              data-testid="meeting-calendar-section"
            />
          </section>
        )}
      </main>

      {/* Async Export Modal [FR-012] */}
      {isExportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b1c19]/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-modal-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-[#e4e2dd] bg-[#fbf9f4] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e4e2dd] pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#59452b] text-white">
                  <Download className="h-4 w-4" />
                </span>
                <div>
                  <h3 id="export-modal-title" className="font-serif text-lg font-medium text-[#1b1c19]">
                    Export Analytics Report
                  </h3>
                  <p className="text-xs text-[#4e453d]">
                    Trigger an asynchronous background report export task [FR-012].
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="rounded-md p-1.5 text-[#80756b] hover:bg-[#f0eee9] hover:text-[#1b1c19]"
                aria-label="Close export modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleExportSubmit} className="mt-5 space-y-4">
              {/* Report Type Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4e453d] mb-1.5">
                  Report Type
                </label>
                <select
                  value={exportReportType}
                  onChange={(e) => setExportReportType(e.target.value as ReportExportType)}
                  className="w-full rounded-md border border-[#e4e2dd] bg-white px-3 py-2 text-xs text-[#1b1c19] focus:outline-hidden focus:ring-1 focus:ring-[#59452b]"
                >
                  <option value="acquisition">Channel Acquisition Report</option>
                  <option value="funnel">Conversion Funnel & Bottlenecks</option>
                  <option value="campaign_comparison">Campaign Trend Comparison</option>
                  <option value="territory_heatmap">Territory Heat Map Density</option>
                </select>
              </div>

              {/* Format Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4e453d] mb-1.5">
                  Export Format
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#1b1c19]">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                      className="accent-[#59452b]"
                    />
                    <FileSpreadsheet className="h-4 w-4 text-[#59452b]" />
                    <span>CSV Spreadsheet</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#1b1c19]">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="pdf"
                      checked={exportFormat === 'pdf'}
                      onChange={() => setExportFormat('pdf')}
                      className="accent-[#59452b]"
                    />
                    <FileText className="h-4 w-4 text-[#a43b2c]" />
                    <span>PDF Document</span>
                  </label>
                </div>
              </div>

              {/* Selected Filters Info */}
              <div className="rounded-md bg-[#f5f3ee] p-3 text-xs text-[#4e453d] space-y-1">
                <div className="font-medium text-[#1b1c19]">Export Parameters Summary:</div>
                <div>Start Date: {startDateVal || 'All Time'}</div>
                <div>End Date: {endDateVal || 'All Time'}</div>
              </div>

              {/* Error Message Display */}
              {exportError && (
                <div className="flex items-start gap-2 rounded-md bg-[#ffdad6] p-3 text-xs text-[#93000a]">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{exportError}</span>
                </div>
              )}

              {/* Success Result Display */}
              {exportResult && (
                <div className="flex items-start gap-2 rounded-md bg-[#f0eee9] border border-[#59452b]/30 p-3 text-xs text-[#1b1c19]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#59452b] mt-0.5" />
                  <div>
                    <div className="font-semibold text-[#59452b]">Export Task Queued</div>
                    <div className="text-[11px] text-[#4e453d]">Task ID: <code className="font-mono">{exportResult.task_id}</code></div>
                    <div className="text-[11px] text-[#4e453d] mt-1">Background Celery worker is rendering your {exportFormat.toUpperCase()} report.</div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e4e2dd]">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="rounded-md border border-[#80756b]/40 bg-white px-4 py-2 text-xs font-medium text-[#1b1c19] hover:bg-[#f0eee9]"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={exportSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#59452b] px-5 py-2 text-xs font-medium text-white hover:bg-[#735c41] focus:outline-hidden focus:ring-2 focus:ring-[#59452b] disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{exportSubmitting ? 'Queueing Task…' : 'Submit Export Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
