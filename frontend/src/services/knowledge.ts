/**
 * Typed Backend API Service Client Wrapper for Knowledge Repository [FR-1 - FR-9, NFR-1 - NFR-5].
 * Connects Next.js App Router frontend components to FastAPI backend endpoints (/api/v1/knowledge).
 */

import { apiFetch } from './apiClient';

// ============================================================================
// Types & Interfaces [FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9]
// ============================================================================

export type KnowledgeContentType = 'FAQ' | 'Playbook' | 'BestPractice' | 'TrainingVideo' | string;

export const ALLOWED_CONTENT_TYPES: readonly string[] = [
  'FAQ',
  'Playbook',
  'BestPractice',
  'TrainingVideo',
] as const;

export interface CategoryResponse {
  id: string;
  name: string;
  description?: string | null;
}

export interface TagResponse {
  id: string;
  name: string;
}

export interface AttachmentResponse {
  id: string;
  article_id: string;
  file_name: string;
  file_url: string;
  file_size_bytes: number;
  created_at: string;
}

export interface PlaybookStepResponse {
  id: string;
  article_id: string;
  step_number: number;
  title: string;
  content: string;
  checkpoint_instructions?: string | null;
}

export interface ArticleCard {
  id: string;
  title: string;
  content_type: KnowledgeContentType;
  body?: string | null;
  tenant_id?: string | null;
  category_id?: string | null;
  category?: CategoryResponse | null;
  tags: TagResponse[];
  video_url?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface ArticleDetailResponse extends ArticleCard {
  attachments: AttachmentResponse[];
  playbook_steps: PlaybookStepResponse[];
}

export interface ArticleListResponse {
  items: ArticleCard[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ListArticlesQueryParams {
  query?: string | null;
  category_id?: string | null;
  tag_ids?: string[] | string | null;
  content_type?: KnowledgeContentType | null;
  tenant_id?: string | null;
  is_published?: boolean | null;
  page?: number | null;
  limit?: number | null;
}

export interface StepProgressToggleRequest {
  is_completed?: boolean;
  user_id?: string | null;
  tenant_id?: string | null;
}

export interface StepProgressResponse {
  step_id: string;
  article_id: string;
  user_id: string;
  tenant_id: string;
  is_completed: boolean;
  completed_at?: string | null;
  overall_playbook_progress_percentage: number;
  total_steps: number;
  completed_steps: number;
}

export interface StepProgressItem {
  step_id: string;
  step_number: number;
  title: string;
  is_completed: boolean;
  completed_at?: string | null;
}

export interface PlaybookProgressResponse {
  article_id: string;
  user_id: string;
  tenant_id: string;
  total_steps: number;
  completed_steps: number;
  progress_percentage: number;
  completed_step_ids: string[];
  step_progress: StepProgressItem[];
}

// ============================================================================
// Input Validation & Sanitization Helpers [FR-8, NFR-3]
// ============================================================================

/**
 * Sanitize and validate optional content_type filter parameter [FR-7, FR-8].
 */
export function sanitizeContentType(contentType?: string | null): string | undefined {
  if (!contentType || typeof contentType !== 'string') {
    return undefined;
  }
  const trimmed = contentType.trim();
  if (!trimmed) {
    return undefined;
  }

  const matched = ALLOWED_CONTENT_TYPES.find(
    (allowed) => allowed.toLowerCase() === trimmed.toLowerCase()
  );
  if (matched) {
    return matched;
  }
  return trimmed;
}

/**
 * Build clean URL search params for knowledge article listing [FR-2, FR-8, FR-9].
 */
export function buildArticlesQueryParams(params: ListArticlesQueryParams = {}): string {
  const queryParts: string[] = [];

  if (params.query && params.query.trim()) {
    queryParts.push(`query=${encodeURIComponent(params.query.trim())}`);
  }

  if (params.category_id && params.category_id.trim()) {
    queryParts.push(`category_id=${encodeURIComponent(params.category_id.trim())}`);
  }

  if (params.tag_ids) {
    if (Array.isArray(params.tag_ids)) {
      params.tag_ids
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .forEach((tag) => {
          queryParts.push(`tag_ids=${encodeURIComponent(tag)}`);
        });
    } else if (typeof params.tag_ids === 'string' && params.tag_ids.trim()) {
      params.tag_ids
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .forEach((tag) => {
          queryParts.push(`tag_ids=${encodeURIComponent(tag)}`);
        });
    }
  }

  if (params.content_type) {
    const cleanCt = sanitizeContentType(params.content_type);
    if (cleanCt) {
      queryParts.push(`content_type=${encodeURIComponent(cleanCt)}`);
    }
  }

  if (params.tenant_id && params.tenant_id.trim()) {
    queryParts.push(`tenant_id=${encodeURIComponent(params.tenant_id.trim())}`);
  }

  if (typeof params.is_published === 'boolean') {
    queryParts.push(`is_published=${params.is_published}`);
  }

  if (typeof params.page === 'number' && params.page > 0) {
    queryParts.push(`page=${params.page}`);
  }

  if (typeof params.limit === 'number' && params.limit > 0) {
    queryParts.push(`limit=${params.limit}`);
  }

  return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
}

// ============================================================================
// Service API Functions [FR-1 - FR-9, NFR-1 - NFR-3]
// ============================================================================

/**
 * Search and list knowledge articles with filters, pagination, and tenant isolation [FR-1, FR-2, FR-7, FR-8, FR-9, NFR-1].
 */
export async function listKnowledgeArticles(
  params: ListArticlesQueryParams = {}
): Promise<ArticleListResponse> {
  const queryStr = buildArticlesQueryParams(params);
  return apiFetch<ArticleListResponse>(`/api/v1/knowledge/articles${queryStr}`);
}

/**
 * Get detailed knowledge article content by ID [FR-1, FR-3, FR-5, FR-6, FR-9, NFR-1].
 */
export async function getKnowledgeArticleDetail(
  id: string,
  tenantId?: string | null
): Promise<ArticleDetailResponse> {
  if (!id || !id.trim()) {
    throw new Error('Article ID is required.');
  }
  const cleanId = id.trim();
  const queryParts: string[] = [];
  if (tenantId && tenantId.trim()) {
    queryParts.push(`tenant_id=${encodeURIComponent(tenantId.trim())}`);
  }
  const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return apiFetch<ArticleDetailResponse>(
    `/api/v1/knowledge/articles/${encodeURIComponent(cleanId)}${queryStr}`
  );
}

/**
 * Toggle playbook step completion state and persist progress [FR-3, FR-4, FR-8, FR-9].
 */
export async function togglePlaybookStepProgress(
  id: string,
  stepId: string,
  payload?: StepProgressToggleRequest,
  userId?: string | null,
  tenantId?: string | null
): Promise<StepProgressResponse> {
  if (!id || !id.trim()) {
    throw new Error('Playbook article ID is required.');
  }
  if (!stepId || !stepId.trim()) {
    throw new Error('Playbook step ID is required.');
  }
  const cleanId = id.trim();
  const cleanStepId = stepId.trim();

  const queryParts: string[] = [];
  if (userId && userId.trim()) {
    queryParts.push(`user_id=${encodeURIComponent(userId.trim())}`);
  }
  if (tenantId && tenantId.trim()) {
    queryParts.push(`tenant_id=${encodeURIComponent(tenantId.trim())}`);
  }
  const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

  const bodyData: StepProgressToggleRequest = {
    is_completed: payload?.is_completed ?? true,
    user_id: userId?.trim() || payload?.user_id?.trim() || null,
    tenant_id: tenantId?.trim() || payload?.tenant_id?.trim() || null,
  };

  return apiFetch<StepProgressResponse>(
    `/api/v1/knowledge/playbooks/${encodeURIComponent(cleanId)}/steps/${encodeURIComponent(cleanStepId)}/progress${queryStr}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData),
    }
  );
}

/**
 * Get overall playbook step progress summary for a user [FR-3, FR-4, FR-8, FR-9].
 */
export async function getPlaybookProgress(
  id: string,
  userId?: string | null,
  tenantId?: string | null
): Promise<PlaybookProgressResponse> {
  if (!id || !id.trim()) {
    throw new Error('Playbook article ID is required.');
  }
  const cleanId = id.trim();

  const queryParts: string[] = [];
  if (userId && userId.trim()) {
    queryParts.push(`user_id=${encodeURIComponent(userId.trim())}`);
  }
  if (tenantId && tenantId.trim()) {
    queryParts.push(`tenant_id=${encodeURIComponent(tenantId.trim())}`);
  }
  const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

  return apiFetch<PlaybookProgressResponse>(
    `/api/v1/knowledge/playbooks/${encodeURIComponent(cleanId)}/progress${queryStr}`
  );
}

/**
 * Delete a knowledge repository article record by ID [FR-1, FR-9].
 */
export async function deleteKnowledgeArticle(
  id: string,
  tenantId?: string | null
): Promise<void> {
  if (!id || !id.trim()) {
    throw new Error('Article ID is required.');
  }
  const cleanId = id.trim();

  const queryParts: string[] = [];
  if (tenantId && tenantId.trim()) {
    queryParts.push(`tenant_id=${encodeURIComponent(tenantId.trim())}`);
  }
  const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

  return apiFetch<void>(
    `/api/v1/knowledge/articles/${encodeURIComponent(cleanId)}${queryStr}`,
    {
      method: 'DELETE',
    }
  );
}

// ============================================================================
// Default Service Export
// ============================================================================

export const knowledgeApi = {
  listArticles: listKnowledgeArticles,
  getArticleDetail: getKnowledgeArticleDetail,
  toggleStepProgress: togglePlaybookStepProgress,
  getPlaybookProgress,
  deleteArticle: deleteKnowledgeArticle,
  sanitizeContentType,
  buildArticlesQueryParams,
};

export default knowledgeApi;
