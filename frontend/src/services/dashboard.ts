import { apiFetch } from './apiClient';

/**
 * Types and Enums matching OpenAPI schema specification for Executive Dashboard.
 */

export type AggregationStatus = 'COMPLETE' | 'PARTIAL' | 'FAILED';
export type DomainStatus = 'COMPLETE' | 'UNAVAILABLE';
export type MetricStatus = 'VALID' | 'ZERO' | 'UNAVAILABLE';
export type MetricUnit = 'currency' | 'count' | 'percentage';

export type DashboardTimeframe = '7d' | '30d' | '90d';
export type DashboardDomain = 'lead_gen' | 'sales_pipeline' | 'support' | 'financials';

export const ALLOWED_TIMEFRAMES: readonly DashboardTimeframe[] = ['7d', '30d', '90d'] as const;
export const ALLOWED_DOMAINS: readonly DashboardDomain[] = [
  'lead_gen',
  'sales_pipeline',
  'support',
  'financials',
] as const;

export interface MetricSchema {
  domain: string;
  metric_key: string;
  display_name: string;
  raw_value?: number | null;
  baseline_value?: number | null;
  formatted_value?: string | null;
  percentage_change?: number | null;
  status: MetricStatus;
  unit: MetricUnit;
  error_detail?: string | null;
}

export interface BreakdownItemSchema {
  label: string;
  value: number;
}

export interface DashboardSummaryResponse {
  status: AggregationStatus;
  generated_at: string;
  metrics: MetricSchema[];
}

export interface DomainDetailResponse {
  domain: string;
  status: DomainStatus;
  detailed_metrics: MetricSchema[];
  breakdown_items: BreakdownItemSchema[];
  error_detail?: string | null;
}

/**
 * Input sanitization and validation helper for comparative timeframe duration.
 * Default to '30d' if invalid or missing (FR-10).
 */
export function sanitizeTimeframe(timeframe?: string | null): DashboardTimeframe {
  if (!timeframe || typeof timeframe !== 'string') {
    return '30d';
  }
  const trimmed = timeframe.trim().toLowerCase();
  if (ALLOWED_TIMEFRAMES.includes(trimmed as DashboardTimeframe)) {
    return trimmed as DashboardTimeframe;
  }
  return '30d';
}

/**
 * Input sanitization and validation helper for operational domain identifier.
 * Throws an Error if domain identifier is unsupported (FR-10).
 */
export function sanitizeDomainId(domainId?: string | null): DashboardDomain {
  if (!domainId || typeof domainId !== 'string') {
    throw new Error('Domain ID is required and must be a valid string.');
  }
  const trimmed = domainId.trim().toLowerCase();
  if (ALLOWED_DOMAINS.includes(trimmed as DashboardDomain)) {
    return trimmed as DashboardDomain;
  }
  throw new Error(
    `Unsupported domain_id '${domainId}'. Allowed values: ${ALLOWED_DOMAINS.join(', ')}`
  );
}

/**
 * Sanitize and validate individual MetricSchema item response from API (FR-10).
 */
function sanitizeMetric(metric: any): MetricSchema {
  const validStatuses: MetricStatus[] = ['VALID', 'ZERO', 'UNAVAILABLE'];
  const validUnits: MetricUnit[] = ['currency', 'count', 'percentage'];

  const status: MetricStatus = validStatuses.includes(metric?.status)
    ? metric.status
    : 'UNAVAILABLE';

  const unit: MetricUnit = validUnits.includes(metric?.unit)
    ? metric.unit
    : 'count';

  return {
    domain: typeof metric?.domain === 'string' ? metric.domain : 'unknown',
    metric_key: typeof metric?.metric_key === 'string' ? metric.metric_key : 'unknown_metric',
    display_name: typeof metric?.display_name === 'string' ? metric.display_name : 'Unknown Metric',
    raw_value: typeof metric?.raw_value === 'number' ? metric.raw_value : null,
    baseline_value: typeof metric?.baseline_value === 'number' ? metric.baseline_value : null,
    formatted_value: typeof metric?.formatted_value === 'string' ? metric.formatted_value : null,
    percentage_change: typeof metric?.percentage_change === 'number' ? metric.percentage_change : null,
    status,
    unit,
    error_detail: typeof metric?.error_detail === 'string' ? metric.error_detail : null,
  };
}

/**
 * Sanitize and validate BreakdownItemSchema item response from API (FR-10).
 */
function sanitizeBreakdownItem(item: any): BreakdownItemSchema {
  return {
    label: typeof item?.label === 'string' ? item.label : 'Unknown Item',
    value: typeof item?.value === 'number' ? item.value : 0,
  };
}

/**
 * Retrieve aggregated executive dashboard summary metrics across Lead Gen, Sales, Support, and Financials (FR-1, FR-10).
 *
 * @param timeframe Optional timeframe filter ('7d', '30d', '90d', default '30d').
 * @returns Promise<DashboardSummaryResponse> Consolidated summary response object.
 */
export async function getDashboardSummary(
  timeframe?: string | null
): Promise<DashboardSummaryResponse> {
  const sanitizedTf = sanitizeTimeframe(timeframe);
  const endpoint = `/api/v1/dashboard/summary?timeframe=${encodeURIComponent(sanitizedTf)}`;

  const response = await apiFetch<any>(endpoint);

  const validAggregationStatuses: AggregationStatus[] = ['COMPLETE', 'PARTIAL', 'FAILED'];
  const status: AggregationStatus = validAggregationStatuses.includes(response?.status)
    ? response.status
    : 'FAILED';

  const generatedAt = typeof response?.generated_at === 'string'
    ? response.generated_at
    : new Date().toISOString();

  const rawMetrics = Array.isArray(response?.metrics) ? response.metrics : [];
  const metrics = rawMetrics.map(sanitizeMetric);

  return {
    status,
    generated_at: generatedAt,
    metrics,
  };
}

/**
 * Retrieve domain-specific quick-view panel drilldown metrics (FR-1, FR-10).
 *
 * @param domainId Target domain identifier ('lead_gen', 'sales_pipeline', 'support', 'financials').
 * @param timeframe Optional timeframe duration filter ('7d', '30d', '90d', default '30d').
 * @returns Promise<DomainDetailResponse> Domain detail response object.
 */
export async function getDomainDetail(
  domainId: string,
  timeframe?: string | null
): Promise<DomainDetailResponse> {
  const sanitizedDomain = sanitizeDomainId(domainId);
  const sanitizedTf = sanitizeTimeframe(timeframe);
  const endpoint = `/api/v1/dashboard/domains/${encodeURIComponent(sanitizedDomain)}?timeframe=${encodeURIComponent(sanitizedTf)}`;

  const response = await apiFetch<any>(endpoint);

  const validDomainStatuses: DomainStatus[] = ['COMPLETE', 'UNAVAILABLE'];
  const status: DomainStatus = validDomainStatuses.includes(response?.status)
    ? response.status
    : 'UNAVAILABLE';

  const rawDetailedMetrics = Array.isArray(response?.detailed_metrics)
    ? response.detailed_metrics
    : Array.isArray(response?.metrics)
    ? response.metrics
    : [];
  const detailedMetrics = rawDetailedMetrics.map(sanitizeMetric);

  const rawBreakdowns = Array.isArray(response?.breakdown_items) ? response.breakdown_items : [];
  const breakdownItems = rawBreakdowns.map(sanitizeBreakdownItem);

  return {
    domain: typeof response?.domain === 'string' ? response.domain : sanitizedDomain,
    status,
    detailed_metrics: detailedMetrics,
    breakdown_items: breakdownItems,
    error_detail: typeof response?.error_detail === 'string' ? response.error_detail : null,
  };
}

export const dashboardApi = {
  getSummary: getDashboardSummary,
  getDomainDetail,
  sanitizeTimeframe,
  sanitizeDomainId,
};

export default dashboardApi;
