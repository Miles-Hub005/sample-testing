/**
 * Deal Pipeline & Sales Intelligence API Client Wrapper
 *
 * Connects Next.js frontend components to FastAPI backend endpoints (/api/v1/deals)
 * for visual deal pipeline board management, stage transitions, action items,
 * stakeholder mapping, activity logging, and AI completion forecasting.
 *
 * Requirements satisfied: [FR-001, FR-002, FR-003, FR-004, FR-006, FR-008]
 */

import { apiFetch } from './apiClient';

/**
 * Common milestone stage names recognized across the pipeline.
 */
export type MilestoneStage =
  | 'Qualification'
  | 'Discovery'
  | 'Solution Proposal'
  | 'Proposal'
  | 'Contract Negotiation'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost'
  | string;

/**
 * Stakeholder influence levels.
 */
export type InfluenceLevel = 'High' | 'Medium' | 'Low' | string;

/**
 * Stakeholder activity types.
 */
export type ActivityType = 'Email' | 'Meeting' | 'Call' | 'Note' | string;

/**
 * AI Forecast status codes.
 */
export type ForecastStatusCode = 'READY' | 'INSUFFICIENT_DATA' | 'COMPUTING' | string;

/**
 * Deal forecast representation.
 */
export interface DealForecast {
  id: string;
  deal_id: string;
  estimated_completion_date?: string | null;
  confidence_score_pct?: number | null;
  status_code: ForecastStatusCode;
  calculated_on?: string | null;
}

/**
 * Deal object representation in pipeline board and detail views.
 */
export interface Deal {
  id: string;
  title: string;
  deal_value: number;
  milestone_stage: MilestoneStage;
  win_probability: number;
  age_in_days?: number;
  created_on?: string | null;
  updated_on?: string | null;
  forecast?: DealForecast | null;
  action_items_count?: number;
  stakeholders_count?: number;
  action_items?: ActionItem[];
  stakeholders?: Stakeholder[];
}

/**
 * Payload for creating a new deal.
 */
export interface CreateDealRequest {
  title: string;
  deal_value: number;
  milestone_stage: string;
  win_probability?: number;
}

/**
 * Payload for updating deal milestone stage.
 */
export interface UpdateDealStageRequest {
  milestone_stage: string;
  win_probability?: number;
}

/**
 * Action item assigned to a deal.
 */
export interface ActionItem {
  id: string;
  deal_id: string;
  title: string;
  assigned_owner_id: string;
  target_due_date: string;
  sla_threshold_hours: number;
  is_completed: boolean;
  completed_on?: string | null;
  is_escalated: boolean;
  escalated_on?: string | null;
  created_on?: string | null;
}

/**
 * Payload for creating an action item for a deal.
 */
export interface CreateActionItemRequest {
  title: string;
  assigned_owner_id: string;
  target_due_date: string;
  sla_threshold_hours?: number;
}

/**
 * Payload for marking an action item complete.
 */
export interface CompleteActionItemRequest {
  completed_on?: string;
}

/**
 * Stakeholder contact mapped to a deal.
 */
export interface Stakeholder {
  id: string;
  deal_id: string;
  full_name: string;
  email: string;
  org_role: string;
  influence_level: InfluenceLevel;
  is_active: boolean;
  created_on?: string | null;
}

/**
 * Payload for creating a new stakeholder contact.
 */
export interface CreateStakeholderRequest {
  full_name: string;
  email: string;
  org_role: string;
  influence_level: string;
}

/**
 * Stakeholder interaction activity record.
 */
export interface StakeholderActivity {
  id: string;
  stakeholder_id: string;
  deal_id: string;
  activity_type: ActivityType;
  summary: string;
  occurred_on?: string | null;
  created_on?: string | null;
}

/**
 * Payload for logging stakeholder interaction activity.
 */
export interface CreateStakeholderActivityRequest {
  activity_type: string;
  summary: string;
  occurred_on?: string;
}

/**
 * Combined response payload for deal stakeholders and activity feed.
 */
export interface DealStakeholdersResponse {
  stakeholders: Stakeholder[];
  recent_activities: StakeholderActivity[];
}

/**
 * AI forecast evaluation and recalculation log entry.
 */
export interface ForecastEvaluationLog {
  id: string;
  deal_id: string;
  forecast_id?: string | null;
  estimated_completion_date?: string | null;
  confidence_score_pct?: number | null;
  status_code: string;
  trigger_event: string;
  correlation_id?: string | null;
  model_metadata?: string | null;
  error_detail?: string | null;
  calculated_on?: string | null;
}

/**
 * Helper function to construct query string parameters safely.
 */
export function buildQueryString(params?: Record<string, any>): string {
  if (!params) {
    return '';
  }
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  }
  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Sanitize milestone stage string input by trimming whitespace.
 */
export function sanitizeMilestoneStage(stage?: string | null): string {
  if (!stage || typeof stage !== 'string') {
    return '';
  }
  return stage.trim();
}

/**
 * Retrieve deal pipeline board, optionally filtered by milestone stage [FR-001, FR-002].
 */
export async function getPipelineDeals(stage?: string): Promise<Deal[]> {
  const cleanStage = sanitizeMilestoneStage(stage);
  const queryStr = buildQueryString({ stage: cleanStage || undefined });
  return apiFetch<Deal[]>(`/api/v1/deals/pipeline${queryStr}`);
}

/**
 * Create a new deal in the visual pipeline board [FR-001, FR-002].
 */
export async function createDeal(payload: CreateDealRequest): Promise<Deal> {
  return apiFetch<Deal>('/api/v1/deals', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      title: payload.title?.trim(),
      milestone_stage: payload.milestone_stage?.trim(),
    }),
  });
}

/**
 * Retrieve comprehensive details and summary for a single deal [FR-001, FR-002].
 */
export async function getDealSummary(dealId: string): Promise<Deal> {
  const cleanId = encodeURIComponent(dealId.trim());
  return apiFetch<Deal>(`/api/v1/deals/${cleanId}`);
}

/**
 * Update milestone stage progression for a deal [FR-003].
 */
export async function updateDealStage(
  dealId: string,
  payload: UpdateDealStageRequest
): Promise<Deal> {
  const cleanId = encodeURIComponent(dealId.trim());
  return apiFetch<Deal>(`/api/v1/deals/${cleanId}/stage`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...payload,
      milestone_stage: payload.milestone_stage?.trim(),
    }),
  });
}

/**
 * List all action items assigned to a specific deal [FR-004].
 */
export async function listActionItems(dealId: string): Promise<ActionItem[]> {
  const cleanId = encodeURIComponent(dealId.trim());
  return apiFetch<ActionItem[]>(`/api/v1/deals/${cleanId}/action-items`);
}

/**
 * Assign a new action item to a deal [FR-004].
 */
export async function createActionItem(
  dealId: string,
  payload: CreateActionItemRequest
): Promise<ActionItem> {
  const cleanId = encodeURIComponent(dealId.trim());
  return apiFetch<ActionItem>(`/api/v1/deals/${cleanId}/action-items`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      title: payload.title?.trim(),
      assigned_owner_id: payload.assigned_owner_id?.trim(),
    }),
  });
}

/**
 * Mark an action item complete and clear escalation state [FR-004].
 */
export async function completeActionItem(
  dealId: string,
  itemId: string,
  payload?: CompleteActionItemRequest
): Promise<ActionItem> {
  const cleanDealId = encodeURIComponent(dealId.trim());
  const cleanItemId = encodeURIComponent(itemId.trim());
  return apiFetch<ActionItem>(
    `/api/v1/deals/${cleanDealId}/action-items/${cleanItemId}/complete`,
    {
      method: 'PATCH',
      body: payload ? JSON.stringify(payload) : undefined,
    }
  );
}

/**
 * Delete an action item record from a deal [FR-004].
 */
export async function deleteActionItem(dealId: string, itemId: string): Promise<void> {
  const cleanDealId = encodeURIComponent(dealId.trim());
  const cleanItemId = encodeURIComponent(itemId.trim());
  await apiFetch<void>(
    `/api/v1/deals/${cleanDealId}/action-items/${cleanItemId}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * Retrieve mapped stakeholders and chronological activity feed for a deal [FR-006].
 */
export async function getDealStakeholders(dealId: string): Promise<DealStakeholdersResponse> {
  const cleanId = encodeURIComponent(dealId.trim());
  return apiFetch<DealStakeholdersResponse>(`/api/v1/deals/${cleanId}/stakeholders`);
}

/**
 * Map a new stakeholder contact to a deal [FR-006].
 */
export async function createStakeholder(
  dealId: string,
  payload: CreateStakeholderRequest
): Promise<Stakeholder> {
  const cleanId = encodeURIComponent(dealId.trim());
  return apiFetch<Stakeholder>(`/api/v1/deals/${cleanId}/stakeholders`, {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      full_name: payload.full_name?.trim(),
      email: payload.email?.trim(),
      org_role: payload.org_role?.trim(),
      influence_level: payload.influence_level?.trim(),
    }),
  });
}

/**
 * Log an interaction activity for a mapped stakeholder [FR-006].
 */
export async function logStakeholderActivity(
  dealId: string,
  stakeholderId: string,
  payload: CreateStakeholderActivityRequest
): Promise<StakeholderActivity> {
  const cleanDealId = encodeURIComponent(dealId.trim());
  const cleanStakeholderId = encodeURIComponent(stakeholderId.trim());
  return apiFetch<StakeholderActivity>(
    `/api/v1/deals/${cleanDealId}/stakeholders/${cleanStakeholderId}/activities`,
    {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        activity_type: payload.activity_type?.trim(),
        summary: payload.summary?.trim(),
      }),
    }
  );
}

/**
 * Retrieve AI-driven estimated deal completion timeline and confidence score [FR-008].
 */
export async function getDealForecast(dealId: string): Promise<DealForecast> {
  const cleanId = encodeURIComponent(dealId.trim());
  return apiFetch<DealForecast>(`/api/v1/deals/${cleanId}/forecast`);
}

/**
 * Trigger recalculation of AI completion timeline forecast and confidence score [FR-008].
 */
export async function recalculateDealForecast(dealId: string): Promise<DealForecast> {
  const cleanId = encodeURIComponent(dealId.trim());
  return apiFetch<DealForecast>(`/api/v1/deals/${cleanId}/forecast/recalculate`, {
    method: 'POST',
  });
}

/**
 * Retrieve AI forecast evaluation and recalculation log history [FR-008].
 */
export async function getForecastEvaluationLogs(
  dealId: string,
  limit?: number
): Promise<ForecastEvaluationLog[]> {
  const cleanId = encodeURIComponent(dealId.trim());
  const queryStr = buildQueryString({ limit: limit && limit > 0 ? limit : undefined });
  return apiFetch<ForecastEvaluationLog[]>(`/api/v1/deals/${cleanId}/forecast/logs${queryStr}`);
}

/**
 * Grouped service object exposing all deal pipeline API methods.
 */
export const dealsApi = {
  getPipelineDeals,
  createDeal,
  getDealSummary,
  updateDealStage,
  listActionItems,
  createActionItem,
  completeActionItem,
  deleteActionItem,
  getDealStakeholders,
  createStakeholder,
  logStakeholderActivity,
  getDealForecast,
  recalculateDealForecast,
  getForecastEvaluationLogs,
  buildQueryString,
  sanitizeMilestoneStage,
};

export default dealsApi;
