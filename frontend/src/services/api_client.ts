/**
 * Auto-generated OpenAPI Client Bindings and HTTP Client Wrapper for Platform API Services.
 * Connects frontend Next.js components to FastAPI backend endpoints including
 * Client Support Operations & SLA Management (/api/v1/tickets and /api/v1/analytics/support).
 */

export interface UserLoginRequest {
  email?: string;
  username?: string;
  password: string;
}

export interface UserLoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  tenant_id: string;
}

export interface UserRegisterRequest {
  email: string;
  password: string;
  tenant_id?: string;
}

export interface UserRegisterResponse {
  user_id: string;
  email: string;
  tenant_id: string;
  roles: string[];
}

export interface UserMeResponse {
  user_id: string;
  email: string;
  tenant_id: string;
  roles: string[];
}

export interface NavigationItem {
  title: string;
  path: string;
  is_accessible: boolean;
  icon_id: string;
}

export interface NavigationMenuResponse {
  items: NavigationItem[];
}

export class ApiError extends Error {
  status: number;
  statusText: string;
  data: any;
  detail?: string;

  constructor(status: number, statusText: string, data?: any, detail?: string) {
    const message = detail || data?.detail || statusText || `API Error (${status})`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.detail = detail || data?.detail;
  }
}

const TOKEN_STORAGE_KEY = 'auth_token';

/**
 * Retrieve bearer token from browser storage (SSR safe).
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Persist bearer token in browser storage (SSR safe).
 */
export function setToken(token: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch (err) {
    console.error('Failed to save auth token to storage:', err);
  }
}

/**
 * Remove bearer token from browser storage (SSR safe).
 */
export function clearToken(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to remove auth token from storage:', err);
  }
}

/**
 * Clear stored token and redirect user to /login if unauthenticated on a protected page.
 */
export function handleUnauthorizedRedirect(): void {
  clearToken();
  if (typeof window !== 'undefined') {
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
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
 * Low-level HTTP client wrapper executing network requests with bearer token propagation
 * and 401 response handling.
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${formattedEndpoint}`;

  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    handleUnauthorizedRedirect();
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
      errorData?.detail || 'Unauthorized'
    );
  }

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
      errorData?.detail || `Request failed with status ${response.status}`
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

// Authentication API Helpers
export async function login(payload: UserLoginRequest): Promise<UserLoginResponse> {
  const response = await apiFetch<UserLoginResponse>('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (response && response.access_token) {
    setToken(response.access_token);
  }

  return response;
}

export async function register(payload: UserRegisterRequest): Promise<UserRegisterResponse> {
  return apiFetch<UserRegisterResponse>('/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function getMe(): Promise<UserMeResponse | null> {
  if (!getToken()) return null;
  return apiFetch<UserMeResponse>('/api/v1/auth/me', {
    method: 'GET',
  });
}

export async function getNavigationMenu(): Promise<NavigationMenuResponse | null> {
  if (!getToken()) return null;
  return apiFetch<NavigationMenuResponse>('/api/v1/navigation/menu', {
    method: 'GET',
  });
}

// ============================================================================
// Types & Interfaces: Support Tickets & SLA Operations [FR-1 - FR-9]
// ============================================================================

export type TicketPriority = 'P1' | 'P2' | 'P3' | string;
export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed' | string;
export type SenderType = 'client' | 'agent' | 'system' | string;

export interface CreateTicketSchema {
  priority: TicketPriority;
  subject: string;
  description: string;
  client_id: string;
  assigned_tier?: string | null;
  assigned_agent_id?: string | null;
}

export interface UpdateTicketSchema {
  priority?: TicketPriority | null;
  status?: TicketStatus | null;
  assigned_tier?: string | null;
  assigned_agent_id?: string | null;
  subject?: string | null;
  description?: string | null;
}

export interface SLATrackingResponseSchema {
  id: string;
  ticket_id: string;
  target_type: string;
  target_due_at?: string | null;
  warning_sent_at?: string | null;
  breached_at?: string | null;
  is_breached: boolean;
}

export interface TicketResponseSchema {
  id: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  client_id: string;
  assigned_tier?: string | null;
  assigned_agent_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  first_responded_at?: string | null;
  resolved_at?: string | null;
  sla_trackings?: SLATrackingResponseSchema[] | null;
}

export interface TicketListResponseSchema {
  items: TicketResponseSchema[];
  total_count: number;
  limit: number;
  offset: number;
}

export interface TicketFilterQueryParams {
  client_id?: string | null;
  priority?: string | null;
  status?: string | null;
  assigned_tier?: string | null;
  assigned_agent_id?: string | null;
  limit?: number;
  offset?: number;
}

export interface CreateMessageSchema {
  sender_id: string;
  sender_type: SenderType;
  message_body: string;
}

export interface TicketAttachmentResponseSchema {
  id: string;
  message_id: string;
  filename: string;
  file_size_bytes: number;
  mime_type: string;
  storage_key: string;
  uploaded_at?: string | null;
}

export interface TicketMessageResponseSchema {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: string;
  message_body: string;
  created_at?: string | null;
  attachments?: TicketAttachmentResponseSchema[] | null;
}

export interface CreateCSATRatingSchema {
  score: number;
  feedback_text?: string | null;
}

export interface CSATRatingResponseSchema {
  id: string;
  ticket_id: string;
  score: number;
  feedback_text?: string | null;
  submitted_at?: string | null;
}

export interface TimeWindowSchema {
  start_time?: string | null;
  end_time?: string | null;
}

export interface PriorityBreakdownSchema {
  P1: number;
  P2: number;
  P3: number;
}

export interface SupportAnalyticsResponseSchema {
  time_window: TimeWindowSchema;
  total_tickets: number;
  open_tickets_count: number;
  resolved_tickets_count: number;
  average_response_time_minutes: number;
  mean_time_to_resolution_hours: number;
  sla_breach_rate_percent: number;
  average_csat_score: number;
  csat_response_count: number;
  priority_breakdown: PriorityBreakdownSchema;
}

export interface SupportAnalyticsQueryParams {
  start_time?: string | Date | null;
  end_time?: string | Date | null;
  priority?: string | null;
  client_id?: string | null;
}

// ============================================================================
// API Client Operations: Support Tickets & Analytics Endpoints
// ============================================================================

/**
 * Create a new support ticket and initialize SLA tracking [FR-1, FR-4, FR-7].
 */
export async function createTicket(payload: CreateTicketSchema): Promise<TicketResponseSchema> {
  return apiFetch<TicketResponseSchema>('/api/v1/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Filter and list support tickets matching specified query criteria [FR-1].
 */
export async function listTickets(params: TicketFilterQueryParams = {}): Promise<TicketListResponseSchema> {
  const query = new URLSearchParams();
  if (params.client_id) query.append('client_id', params.client_id);
  if (params.priority) query.append('priority', params.priority);
  if (params.status) query.append('status', params.status);
  if (params.assigned_tier) query.append('assigned_tier', params.assigned_tier);
  if (params.assigned_agent_id) query.append('assigned_agent_id', params.assigned_agent_id);
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.offset !== undefined) query.append('offset', String(params.offset));

  const queryString = query.toString();
  const endpoint = queryString ? `/api/v1/tickets?${queryString}` : '/api/v1/tickets';
  return apiFetch<TicketListResponseSchema>(endpoint, {
    method: 'GET',
  });
}

/**
 * Retrieve support ticket details including active SLA tracking states [FR-1, FR-4].
 */
export async function getTicket(ticketId: string): Promise<TicketResponseSchema> {
  return apiFetch<TicketResponseSchema>(`/api/v1/tickets/${encodeURIComponent(ticketId)}`, {
    method: 'GET',
  });
}

/**
 * Update support ticket fields, status transitions, or priority levels [FR-1, FR-4, FR-7].
 */
export async function updateTicket(ticketId: string, payload: UpdateTicketSchema): Promise<TicketResponseSchema> {
  return apiFetch<TicketResponseSchema>(`/api/v1/tickets/${encodeURIComponent(ticketId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a support ticket [FR-1]. Returns HTTP 204 No Content.
 */
export async function deleteTicket(ticketId: string): Promise<void> {
  await apiFetch<void>(`/api/v1/tickets/${encodeURIComponent(ticketId)}`, {
    method: 'DELETE',
  });
}

/**
 * Post a sequential message to a ticket thread [FR-2, FR-7].
 */
export async function createMessage(ticketId: string, payload: CreateMessageSchema): Promise<TicketMessageResponseSchema> {
  return apiFetch<TicketMessageResponseSchema>(`/api/v1/tickets/${encodeURIComponent(ticketId)}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Upload a file attachment to a support ticket [FR-2, FR-3, NFR-2].
 */
export async function uploadAttachment(
  ticketId: string,
  file: File | Blob,
  senderId: string,
  senderType: string = 'client',
  messageBody?: string
): Promise<TicketAttachmentResponseSchema> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sender_id', senderId);
  formData.append('sender_type', senderType);
  if (messageBody) {
    formData.append('message_body', messageBody);
  }

  const baseUrl = getBaseUrl();
  const endpoint = `/api/v1/tickets/${encodeURIComponent(ticketId)}/attachments`;
  const url = `${baseUrl}${endpoint}`;

  const headers = new Headers();
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (response.status === 401) {
    handleUnauthorizedRedirect();
    throw new ApiError(401, 'Unauthorized', null, 'Unauthorized');
  }

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
      errorData?.detail || `Attachment upload failed with status ${response.status}`
    );
  }

  return (await response.json()) as TicketAttachmentResponseSchema;
}

/**
 * Retrieve all chronological messages and attachment metadata for a ticket thread [FR-2].
 */
export async function getMessages(ticketId: string): Promise<TicketMessageResponseSchema[]> {
  return apiFetch<TicketMessageResponseSchema[]>(`/api/v1/tickets/${encodeURIComponent(ticketId)}/messages`, {
    method: 'GET',
  });
}

/**
 * Retrieve and stream binary content blob for a ticket attachment [FR-2].
 */
export async function downloadAttachment(attachmentId: string): Promise<Blob> {
  const baseUrl = getBaseUrl();
  const endpoint = `/api/v1/tickets/attachments/${encodeURIComponent(attachmentId)}`;
  const url = `${baseUrl}${endpoint}`;

  const headers = new Headers();
  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (response.status === 401) {
    handleUnauthorizedRedirect();
    throw new ApiError(401, 'Unauthorized', null, 'Unauthorized');
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      response.statusText,
      null,
      `Attachment download failed with status ${response.status}`
    );
  }

  return response.blob();
}

/**
 * Submit client CSAT satisfaction score (1 to 5) for a resolved support ticket [FR-9, NFR-2].
 */
export async function submitCSAT(ticketId: string, payload: CreateCSATRatingSchema): Promise<CSATRatingResponseSchema> {
  return apiFetch<CSATRatingResponseSchema>(`/api/v1/tickets/${encodeURIComponent(ticketId)}/csat`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Retrieve CSAT rating score and feedback for a support ticket [FR-9].
 */
export async function getCSAT(ticketId: string): Promise<CSATRatingResponseSchema> {
  return apiFetch<CSATRatingResponseSchema>(`/api/v1/tickets/${encodeURIComponent(ticketId)}/csat`, {
    method: 'GET',
  });
}

/**
 * Retrieve aggregated operational support metrics for specified filter parameters [FR-8, NFR-2, NFR-3].
 */
export async function getSupportAnalytics(params: SupportAnalyticsQueryParams = {}): Promise<SupportAnalyticsResponseSchema> {
  const query = new URLSearchParams();
  if (params.start_time) {
    const val = params.start_time instanceof Date ? params.start_time.toISOString() : params.start_time;
    query.append('start_time', val);
  }
  if (params.end_time) {
    const val = params.end_time instanceof Date ? params.end_time.toISOString() : params.end_time;
    query.append('end_time', val);
  }
  if (params.priority) query.append('priority', params.priority);
  if (params.client_id) query.append('client_id', params.client_id);

  const queryString = query.toString();
  const endpoint = queryString ? `/api/v1/analytics/support?${queryString}` : '/api/v1/analytics/support';
  return apiFetch<SupportAnalyticsResponseSchema>(endpoint, {
    method: 'GET',
  });
}

export const apiClient = {
  getToken,
  setToken,
  clearToken,
  handleUnauthorizedRedirect,
  apiFetch,
  login,
  register,
  getMe,
  getNavigationMenu,
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  deleteTicket,
  createMessage,
  uploadAttachment,
  getMessages,
  downloadAttachment,
  submitCSAT,
  getCSAT,
  getSupportAnalytics,
};

export default apiClient;
