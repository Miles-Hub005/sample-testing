/**
 * Lead Acquisition & Marketing Analytics API Client Wrapper
 *
 * Connects Next.js frontend components to FastAPI backend endpoints
 * (/api/v1/analytics and /api/v1/marketing) for channel acquisition metrics,
 * conversion funnel stages and bottleneck detection, campaign comparison trend analysis,
 * territory heat map metrics and unassigned drawer, meeting calendar and follow-up tasks,
 * configuration audit logging, and asynchronous CSV/PDF report export task submission.
 *
 * Requirements satisfied: [FR-001, FR-004, FR-006, FR-007, FR-009, FR-012]
 */

import { apiFetch } from './apiClient';

// ============================================================================
// Types & Interfaces: Channel Acquisition Analytics [FR-001, FR-002, FR-003]
// ============================================================================

export interface ChannelAcquisitionReportItem {
  channel_id: string;
  channel_name: string;
  lead_volume: number;
  quality_score: number;
  spend: number;
  revenue: number;
  roi?: number | null;
  roi_str: string;
  created_on?: string | null;
}

export type AcquisitionSortField =
  | 'quality_score'
  | 'lead_volume'
  | 'spend'
  | 'revenue'
  | 'roi'
  | 'channel_name'
  | string;

export type SortOrder = 'asc' | 'desc' | string;

export interface ChannelAcquisitionQueryParams {
  start_date_val?: string | Date | null;
  end_date_val?: string | Date | null;
  channel_id?: string | null;
  sort_by?: AcquisitionSortField;
  sort_order?: SortOrder;
}

// ============================================================================
// Types & Interfaces: Conversion Funnel [FR-004, FR-005]
// ============================================================================

export interface FunnelStageItem {
  stage_name: string;
  stage_count: number;
  conversion_rate: number;
  dropoff_rate: number;
  is_bottleneck: boolean;
  threshold_percent: number;
  overall_conversion_rate: number;
}

export interface ConversionFunnelQueryParams {
  funnel_id?: string | null;
  start_date_val?: string | Date | null;
  end_date_val?: string | Date | null;
  channel_id?: string | null;
  campaign_id?: string | null;
  territory_id?: string | null;
}

// ============================================================================
// Types & Interfaces: Campaign Comparison [FR-006]
// ============================================================================

export interface CampaignTimeSeriesItem {
  date_val: string;
  lead_volume: number;
  cost_per_lead?: number | null;
  cost_per_lead_str: string;
  engagement_rate: number;
  revenue: number;
}

export interface CampaignComparisonItem {
  campaign_id: string;
  campaign_name: string;
  budget: number;
  start_date_val?: string | null;
  end_date_val?: string | null;
  lead_volume: number;
  relative_volume_pct: number;
  cost_per_lead?: number | null;
  cost_per_lead_str: string;
  total_revenue: number;
  avg_quality_score: number;
  engagement_rate: number;
  engagement_rate_str: string;
  time_series: CampaignTimeSeriesItem[];
  trend_points: CampaignTimeSeriesItem[];
}

export interface CampaignComparisonQueryParams {
  campaign_ids?: string[] | string | null;
  start_date_val?: string | Date | null;
  end_date_val?: string | Date | null;
}

// ============================================================================
// Types & Interfaces: Territory Heat Map & Unassigned Drawer [FR-007, FR-008]
// ============================================================================

export interface TerritoryDensityItem {
  territory_id: string;
  territory_code: string;
  territory_name: string;
  postal_code_patterns?: string | null;
  lead_count: number;
  total_deal_value: number;
  total_revenue: number;
  avg_deal_value: number;
  density_score: number;
}

export interface UnassignedEventItem {
  id: string;
  lead_id: string;
  stage_name: string;
  quality_score?: number | null;
  deal_value: number;
  revenue_amount: number;
  postal_code?: string | null;
  event_timestamp?: string | null;
}

export interface UnassignedDrawer {
  lead_count: number;
  total_deal_value: number;
  total_revenue: number;
  unassigned_events: UnassignedEventItem[];
}

export interface TerritoryHeatmapSummary {
  total_mapped_leads: number;
  total_unassigned_leads: number;
  total_leads: number;
  total_deal_value: number;
  total_revenue: number;
}

export interface TerritoryHeatmapResponse {
  territories: TerritoryDensityItem[];
  unassigned_drawer: UnassignedDrawer;
  summary: TerritoryHeatmapSummary;
}

export interface TerritoryHeatmapQueryParams {
  lead_status?: string | null;
  min_deal_value?: number | null;
  max_deal_value?: number | null;
  territory_id?: string | null;
  user_territory_ids?: string[] | string | null;
  start_date_val?: string | Date | null;
  end_date_val?: string | Date | null;
}

// ============================================================================
// Types & Interfaces: Calendar & Post-Meeting Tasks [FR-009, FR-010]
// ============================================================================

export interface FollowupTask {
  id?: string | null;
  meeting_id?: string | null;
  lead_id: string;
  assigned_user_id: string;
  due_date_val?: string | null;
  is_completed: boolean;
  task_description: string;
  created_on?: string | null;
}

export interface LeadMeeting {
  id: string;
  lead_id: string;
  scheduled_time?: string | null;
  prep_notes?: string | null;
  meeting_notes?: string | null;
  created_on?: string | null;
  lead_status?: string | null;
  followup_tasks: FollowupTask[];
}

export interface CalendarQueryParams {
  user_id?: string | null;
  lead_id?: string | null;
  start_date_val?: string | Date | null;
  end_date_val?: string | Date | null;
}

export interface TaskInput {
  task_description?: string;
  description?: string;
  assigned_user_id: string;
  due_date_val?: string;
  due_date?: string;
  is_completed?: boolean;
}

export interface SubmitMeetingNotesRequest {
  meeting_notes?: string | null;
  prep_notes?: string | null;
  lead_status?: string | null;
  tasks?: TaskInput[] | null;
}

export interface SubmitNotesResponse {
  meeting: Record<string, any>;
  created_tasks: FollowupTask[];
  lead_status?: string | null;
  lead_id: string;
}

// ============================================================================
// Types & Interfaces: Configuration Audit Log & Deletion [FR-011]
// ============================================================================

export interface ReportAuditLogCreate {
  user_id?: string | null;
  action_type: string;
  config_delta?: string | null;
}

export interface ReportAuditLogItem {
  id: string;
  user_id: string;
  action_type: string;
  config_delta?: string | null;
  created_on: string;
}

// ============================================================================
// Types & Interfaces: Async Report Export Tasks [FR-012]
// ============================================================================

export type ReportExportType =
  | 'acquisition'
  | 'funnel'
  | 'campaign_comparison'
  | 'territory_heatmap'
  | string;

export type ExportFormat = 'csv' | 'pdf' | string;

export interface ExportReportRequest {
  report_type: ReportExportType;
  export_format?: ExportFormat;
  date_filters?: Record<string, any>;
  start_date_val?: string | Date | null;
  end_date_val?: string | Date | null;
}

export interface ExportTaskResponse {
  task_id: string;
}

// ============================================================================
// Helper Functions: Query String & Parameter Formatting
// ============================================================================

/**
 * Format a Date object or string into an ISO string or trimmed string value.
 */
export function formatDateParam(value?: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString();
  }
  const trimmed = value.trim();
  return trimmed !== '' ? trimmed : null;
}

/**
 * Construct URL query string from parameter dictionary, excluding null/undefined/empty fields.
 */
export function buildQueryString(params?: Record<string, any>): string {
  if (!params) return '';

  const searchParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue === null || rawValue === undefined) {
      continue;
    }

    if (rawValue instanceof Date) {
      searchParams.append(key, rawValue.toISOString());
      continue;
    }

    if (Array.isArray(rawValue)) {
      if (rawValue.length === 0) continue;
      const formattedArray = rawValue
        .map((item) => (item instanceof Date ? item.toISOString() : String(item).trim()))
        .filter((item) => item !== '')
        .join(',');
      if (formattedArray !== '') {
        searchParams.append(key, formattedArray);
      }
      continue;
    }

    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed !== '') {
        searchParams.append(key, trimmed);
      }
      continue;
    }

    if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
      searchParams.append(key, String(rawValue));
      continue;
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

// ============================================================================
// API Client Service Functions
// ============================================================================

/**
 * Aggregate channel acquisition metrics, lead quality scores, spend, revenue, and ROI.
 * Endpoint: GET /api/v1/analytics/acquisition
 * Requirements satisfied: [FR-001, FR-002, FR-003]
 */
export async function getChannelAcquisitionReport(
  params?: ChannelAcquisitionQueryParams
): Promise<ChannelAcquisitionReportItem[]> {
  const queryStr = buildQueryString({
    start_date_val: formatDateParam(params?.start_date_val),
    end_date_val: formatDateParam(params?.end_date_val),
    channel_id: params?.channel_id,
    sort_by: params?.sort_by,
    sort_order: params?.sort_order,
  });

  return apiFetch<ChannelAcquisitionReportItem[]>(`/api/v1/analytics/acquisition${queryStr}`);
}

/**
 * Retrieve conversion funnel stages, conversion rates, dropoff rates, and bottleneck flags.
 * Endpoint: GET /api/v1/analytics/funnel
 * Requirements satisfied: [FR-004, FR-005]
 */
export async function getConversionFunnelReport(
  params?: ConversionFunnelQueryParams
): Promise<FunnelStageItem[]> {
  const queryStr = buildQueryString({
    funnel_id: params?.funnel_id,
    start_date_val: formatDateParam(params?.start_date_val),
    end_date_val: formatDateParam(params?.end_date_val),
    channel_id: params?.channel_id,
    campaign_id: params?.campaign_id,
    territory_id: params?.territory_id,
  });

  return apiFetch<FunnelStageItem[]>(`/api/v1/analytics/funnel${queryStr}`);
}

/**
 * Retrieve comparative campaign trend analysis for up to 5 campaigns.
 * Endpoint: GET /api/v1/analytics/campaigns/compare
 * Requirements satisfied: [FR-006]
 */
export async function getCampaignComparisonReport(
  params?: CampaignComparisonQueryParams
): Promise<CampaignComparisonItem[]> {
  const queryStr = buildQueryString({
    campaign_ids: params?.campaign_ids,
    start_date_val: formatDateParam(params?.start_date_val),
    end_date_val: formatDateParam(params?.end_date_val),
  });

  return apiFetch<CampaignComparisonItem[]>(`/api/v1/analytics/campaigns/compare${queryStr}`);
}

/**
 * Retrieve territory geographic heat map density metrics and unassigned drawer.
 * Endpoint: GET /api/v1/analytics/territory/heatmap
 * Requirements satisfied: [FR-007, FR-008]
 */
export async function getTerritoryHeatmap(
  params?: TerritoryHeatmapQueryParams
): Promise<TerritoryHeatmapResponse> {
  const queryStr = buildQueryString({
    lead_status: params?.lead_status,
    min_deal_value: params?.min_deal_value,
    max_deal_value: params?.max_deal_value,
    territory_id: params?.territory_id,
    user_territory_ids: params?.user_territory_ids,
    start_date_val: formatDateParam(params?.start_date_val),
    end_date_val: formatDateParam(params?.end_date_val),
  });

  return apiFetch<TerritoryHeatmapResponse>(`/api/v1/analytics/territory/heatmap${queryStr}`);
}

/**
 * Create an audit log record for administrative configuration changes.
 * Endpoint: POST /api/v1/analytics/config/audit
 * Requirements satisfied: [FR-011]
 */
export async function createReportConfigAuditLog(
  payload: ReportAuditLogCreate
): Promise<ReportAuditLogItem> {
  return apiFetch<ReportAuditLogItem>('/api/v1/analytics/config/audit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a report configuration or metric threshold record by ID.
 * Endpoint: DELETE /api/v1/analytics/config/{id}
 * Requirements satisfied: [FR-011]
 */
export async function deleteReportConfiguration(id: string): Promise<void> {
  const cleanId = id.trim();
  if (!cleanId) {
    throw new Error('Configuration ID is required.');
  }

  await apiFetch<void>(`/api/v1/analytics/config/${encodeURIComponent(cleanId)}`, {
    method: 'DELETE',
  });
}

/**
 * Submit an asynchronous background report export task to generate CSV or PDF files.
 * Endpoint: POST /api/v1/analytics/exports
 * Requirements satisfied: [FR-012]
 */
export async function submitReportExportTask(
  payload: ExportReportRequest
): Promise<ExportTaskResponse> {
  const formattedPayload = {
    ...payload,
    start_date_val: formatDateParam(payload.start_date_val),
    end_date_val: formatDateParam(payload.end_date_val),
  };

  return apiFetch<ExportTaskResponse>('/api/v1/analytics/exports', {
    method: 'POST',
    body: JSON.stringify(formattedPayload),
  });
}

/**
 * Retrieve scheduled lead meetings, prep briefings, and follow-up tasks.
 * Endpoint: GET /api/v1/marketing/calendar/meetings
 * Requirements satisfied: [FR-009]
 */
export async function getCalendarMeetings(
  params?: CalendarQueryParams
): Promise<LeadMeeting[]> {
  const queryStr = buildQueryString({
    user_id: params?.user_id,
    lead_id: params?.lead_id,
    start_date_val: formatDateParam(params?.start_date_val),
    end_date_val: formatDateParam(params?.end_date_val),
  });

  return apiFetch<LeadMeeting[]>(`/api/v1/marketing/calendar/meetings${queryStr}`);
}

/**
 * Log meeting summary notes, update lead status, and create follow-up tasks.
 * Endpoint: POST /api/v1/marketing/calendar/meetings/{id}/notes
 * Requirements satisfied: [FR-009, FR-010]
 */
export async function submitMeetingNotes(
  meetingId: string,
  payload: SubmitMeetingNotesRequest
): Promise<SubmitNotesResponse> {
  const cleanMeetingId = meetingId.trim();
  if (!cleanMeetingId) {
    throw new Error('Meeting ID is required.');
  }

  return apiFetch<SubmitNotesResponse>(
    `/api/v1/marketing/calendar/meetings/${encodeURIComponent(cleanMeetingId)}/notes`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Consolidated Analytics API service object.
 */
export const analyticsApi = {
  getChannelAcquisitionReport,
  getConversionFunnelReport,
  getCampaignComparisonReport,
  getTerritoryHeatmap,
  createReportConfigAuditLog,
  deleteReportConfiguration,
  submitReportExportTask,
  getCalendarMeetings,
  submitMeetingNotes,
};

export default analyticsApi;
