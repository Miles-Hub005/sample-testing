/**
 * Contract API Client Wrapper
 *
 * Connects frontend UI components to backend contract lifecycle management,
 * document versioning, e-signature execution, and amendment audit trail
 * API endpoints (/api/v1/contracts and /api/v1/signatures).
 */

import { ApiError, apiFetch, getToken } from './apiClient';

export type ContractCategory = 'Contract' | 'SOW' | 'NDA' | 'Exhibit';
export type ContractStatus = 'DRAFT' | 'PENDING_SIGNATURE' | 'ACTIVE' | 'AMENDED' | 'TERMINATED' | 'EXPIRED';
export type SignatureStatus = 'PENDING' | 'EXECUTED' | 'REJECTED';

export const ALLOWED_CATEGORIES: readonly ContractCategory[] = [
  'Contract',
  'SOW',
  'NDA',
  'Exhibit',
] as const;

export const ALLOWED_STATUSES: readonly ContractStatus[] = [
  'DRAFT',
  'PENDING_SIGNATURE',
  'ACTIVE',
  'AMENDED',
  'TERMINATED',
  'EXPIRED',
] as const;

export interface ClauseInput {
  clause_type?: string;
  title?: string;
  body_text?: string;
  is_highlighted?: boolean;
}

export interface SLAInput {
  metric_name?: string;
  target_value?: string;
  penalty_terms?: string | null;
}

export interface ContractCreateRequest {
  title: string;
  category: ContractCategory;
  counterparty: string;
  start_on?: string | null;
  expires_on?: string | null;
  parent_contract_id?: string | null;
  clauses?: ClauseInput[] | null;
  slas?: SLAInput[] | null;
}

export interface ClauseResponse {
  id: string;
  contract_id: string;
  clause_type: string;
  title: string;
  body_text: string;
  is_highlighted: boolean;
}

export interface SLAResponse {
  id: string;
  contract_id: string;
  metric_name: string;
  target_value: string;
  penalty_terms?: string | null;
}

export interface EvaluatedSLAResponse {
  sla_id: string;
  contract_id: string;
  metric_name: string;
  target_value: string;
  actual_value?: any;
  status: string;
  penalty_applicable: boolean;
  penalty_terms?: string | null;
}

export interface DocumentVersionResponse {
  id: string;
  contract_id: string;
  category_type: string;
  version_number: number;
  file_path: string;
  checksum: string;
  uploaded_by_id?: string | null;
  uploaded_at: string;
}

export interface AmendmentDetailResponse {
  id: string;
  contract_id: string;
  sequence_number: number;
  summary: string;
  author_id?: string | null;
  created_at: string;
}

export interface ContractSummaryResponse {
  id: string;
  title: string;
  category: string;
  status: string;
  counterparty: string;
  start_on?: string | null;
  expires_on?: string | null;
  parent_contract_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractListResponse {
  items: ContractSummaryResponse[];
  total_count: number;
  page: number;
  limit: number;
}

export interface ContractDetailResponse {
  id: string;
  title: string;
  category: string;
  status: string;
  counterparty: string;
  start_on?: string | null;
  expires_on?: string | null;
  parent_contract_id?: string | null;
  created_at: string;
  updated_at: string;
  clauses: ClauseResponse[];
  highlighted_clauses: ClauseResponse[];
  slas: SLAResponse[];
  evaluated_slas: EvaluatedSLAResponse[];
  document_versions: DocumentVersionResponse[];
  amendments: AmendmentDetailResponse[];
}

export interface PendingSignatureItemResponse {
  signature_request_id: string;
  contract_id: string;
  contract_title?: string | null;
  counterparty?: string | null;
  signatory_id: string;
  status: string;
  created_at?: string | null;
}

export interface SignatureListResponse {
  items: PendingSignatureItemResponse[];
  total_count: number;
}

export interface SignatureExecuteRequest {
  signature_digest: string;
}

export interface SignatureExecuteResponse {
  signature_request_id: string;
  contract_id: string;
  status: string;
  executed_at: string;
  all_signatures_completed: boolean;
  resulting_contract_status: string;
}

export interface AmendmentCreateRequest {
  summary: string;
}

export interface AmendmentListResponse {
  items: AmendmentDetailResponse[];
  total_count: number;
}

export interface ContractListQuery {
  category?: ContractCategory | string | null;
  status?: ContractStatus | string | null;
  expires_before?: string | null;
  counterparty?: string | null;
  page?: number | null;
  limit?: number | null;
}

/**
 * Helper to sanitize and normalize contract category string.
 */
export function sanitizeCategory(category?: string | null): ContractCategory | undefined {
  if (!category || typeof category !== 'string') return undefined;
  const trimmed = category.trim();
  return ALLOWED_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
}

/**
 * Helper to sanitize and normalize contract status string.
 */
export function sanitizeStatus(status?: string | null): ContractStatus | undefined {
  if (!status || typeof status !== 'string') return undefined;
  const trimmed = status.trim();
  return ALLOWED_STATUSES.find(
    (s) => s.toLowerCase() === trimmed.toLowerCase()
  );
}

/**
 * Helper to construct URL search query string from ContractListQuery parameters.
 */
export function buildQueryString(query?: ContractListQuery): string {
  if (!query) return '';
  const searchParams = new URLSearchParams();

  const sanitizedCategory = sanitizeCategory(query.category);
  if (sanitizedCategory) {
    searchParams.set('category', sanitizedCategory);
  } else if (query.category && typeof query.category === 'string' && query.category.trim()) {
    searchParams.set('category', query.category.trim());
  }

  const sanitizedStatus = sanitizeStatus(query.status);
  if (sanitizedStatus) {
    searchParams.set('status', sanitizedStatus);
  } else if (query.status && typeof query.status === 'string' && query.status.trim()) {
    searchParams.set('status', query.status.trim());
  }

  if (query.expires_before && typeof query.expires_before === 'string' && query.expires_before.trim()) {
    searchParams.set('expires_before', query.expires_before.trim());
  }

  if (query.counterparty && typeof query.counterparty === 'string' && query.counterparty.trim()) {
    searchParams.set('counterparty', query.counterparty.trim());
  }

  if (query.page != null && typeof query.page === 'number' && query.page >= 1) {
    searchParams.set('page', query.page.toString());
  }

  if (query.limit != null && typeof query.limit === 'number' && query.limit >= 1) {
    searchParams.set('limit', query.limit.toString());
  }

  const str = searchParams.toString();
  return str ? `?${str}` : '';
}

/**
 * Resolve base API URL from environment configuration.
 */
function getBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return '';
}

/**
 * Filter and paginate repository contracts by category, status, expiration date, and counterparty.
 */
export async function listContracts(query?: ContractListQuery): Promise<ContractListResponse> {
  const queryString = buildQueryString(query);
  return await apiFetch<ContractListResponse>(`/api/v1/contracts${queryString}`);
}

/**
 * Create a new contract record with optional clauses and SLAs.
 */
export async function createContract(payload: ContractCreateRequest): Promise<ContractDetailResponse> {
  if (!payload.title || typeof payload.title !== 'string' || !payload.title.trim()) {
    throw new Error('Contract title is required.');
  }
  if (!payload.category) {
    throw new Error('Contract category is required.');
  }
  if (!payload.counterparty || typeof payload.counterparty !== 'string' || !payload.counterparty.trim()) {
    throw new Error('Contract counterparty is required.');
  }

  return await apiFetch<ContractDetailResponse>('/api/v1/contracts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Retrieve contract detail including clauses, SLAs, document versions, and amendments.
 */
export async function getContractDetail(contractId: string): Promise<ContractDetailResponse> {
  if (!contractId || typeof contractId !== 'string' || !contractId.trim()) {
    throw new Error('Contract ID is required.');
  }
  return await apiFetch<ContractDetailResponse>(`/api/v1/contracts/${encodeURIComponent(contractId.trim())}`);
}

/**
 * Upload a new revised document version for a contract.
 */
export async function uploadDocumentVersion(
  contractId: string,
  categoryType: ContractCategory | string,
  file: File
): Promise<DocumentVersionResponse> {
  if (!contractId || typeof contractId !== 'string' || !contractId.trim()) {
    throw new Error('Contract ID is required to upload document version.');
  }
  if (!file) {
    throw new Error('A valid File object is required for document version upload.');
  }

  const formData = new FormData();
  formData.append('category_type', categoryType);
  formData.append('file', file);

  const endpoint = `/api/v1/contracts/${encodeURIComponent(contractId.trim())}/documents`;
  return await apiFetch<DocumentVersionResponse>(endpoint, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Download binary octet stream for a specific document version.
 */
export async function downloadDocumentVersion(
  contractId: string,
  versionId: string
): Promise<Blob> {
  if (!contractId || typeof contractId !== 'string' || !contractId.trim()) {
    throw new Error('Contract ID is required to download document version.');
  }
  if (!versionId || typeof versionId !== 'string' || !versionId.trim()) {
    throw new Error('Version ID is required to download document version.');
  }

  const endpoint = `/api/v1/contracts/${encodeURIComponent(contractId.trim())}/documents/${encodeURIComponent(versionId.trim())}`;
  const baseUrl = getBaseUrl();
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    throw new ApiError(
      response.status,
      response.statusText,
      errorData,
      errorData?.detail || `Download failed with status ${response.status}`
    );
  }

  return await response.blob();
}

/**
 * Record a time-stamped contract amendment in the append-only audit trail.
 */
export async function createAmendment(
  contractId: string,
  payload: AmendmentCreateRequest
): Promise<AmendmentDetailResponse> {
  if (!contractId || typeof contractId !== 'string' || !contractId.trim()) {
    throw new Error('Contract ID is required.');
  }
  if (!payload.summary || typeof payload.summary !== 'string' || !payload.summary.trim()) {
    throw new Error('Amendment summary is required.');
  }

  return await apiFetch<AmendmentDetailResponse>(
    `/api/v1/contracts/${encodeURIComponent(contractId.trim())}/amendments`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Retrieve immutable amendment audit trail entries for a contract.
 */
export async function listAmendments(contractId: string): Promise<AmendmentListResponse> {
  if (!contractId || typeof contractId !== 'string' || !contractId.trim()) {
    throw new Error('Contract ID is required.');
  }
  return await apiFetch<AmendmentListResponse>(
    `/api/v1/contracts/${encodeURIComponent(contractId.trim())}/amendments`
  );
}

/**
 * Delete a contract record and clean up associated resources.
 */
export async function deleteContract(contractId: string): Promise<void> {
  if (!contractId || typeof contractId !== 'string' || !contractId.trim()) {
    throw new Error('Contract ID is required.');
  }
  await apiFetch<void>(`/api/v1/contracts/${encodeURIComponent(contractId.trim())}`, {
    method: 'DELETE',
  });
}

/**
 * List contracts currently pending signature execution alongside signatory status.
 */
export async function listPendingSignatures(): Promise<SignatureListResponse> {
  return await apiFetch<SignatureListResponse>('/api/v1/signatures/pending');
}

/**
 * Capture digital execution transition status and notify all parties.
 */
export async function executeSignature(
  signatureRequestId: string,
  payload: SignatureExecuteRequest
): Promise<SignatureExecuteResponse> {
  if (!signatureRequestId || typeof signatureRequestId !== 'string' || !signatureRequestId.trim()) {
    throw new Error('Signature request ID is required.');
  }
  if (!payload.signature_digest || typeof payload.signature_digest !== 'string' || !payload.signature_digest.trim()) {
    throw new Error('Signature digest is required.');
  }

  return await apiFetch<SignatureExecuteResponse>(
    `/api/v1/signatures/${encodeURIComponent(signatureRequestId.trim())}/execute`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export const contractApi = {
  listContracts,
  createContract,
  getContractDetail,
  uploadDocumentVersion,
  downloadDocumentVersion,
  createAmendment,
  listAmendments,
  deleteContract,
  listPendingSignatures,
  executeSignature,
  sanitizeCategory,
  sanitizeStatus,
  buildQueryString,
};

export default contractApi;
