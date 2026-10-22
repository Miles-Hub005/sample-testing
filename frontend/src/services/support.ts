/**
 * Support Client API Wrapper Service [FR-1 - FR-9, NFR-1 - NFR-5].
 *
 * Connects Next.js frontend components to FastAPI backend endpoints
 * (/api/v1/tickets and /api/v1/analytics/support) for ticket lifecycle operations,
 * sequential message history, file attachment uploads, real-time SLA countdown tracking,
 * CSAT rating collection, and operational support analytics.
 */

import {
  ApiError,
  apiFetch,
  createMessage as apiCreateMessage,
  createTicket as apiCreateTicket,
  deleteTicket as apiDeleteTicket,
  downloadAttachment as apiDownloadAttachment,
  getCSAT as apiGetCSAT,
  getMessages as apiGetMessages,
  getSupportAnalytics as apiGetSupportAnalytics,
  getTicket as apiGetTicket,
  listTickets as apiListTickets,
  submitCSAT as apiSubmitCSAT,
  updateTicket as apiUpdateTicket,
  uploadAttachment as apiUploadAttachment,
} from './apiClient';

// ============================================================================
// Constants & Allowed Values [FR-1, FR-3, FR-4, NFR-2]
// ============================================================================

export const SUPPORT_PRIORITIES = ['P1', 'P2', 'P3'] as const;
export const SUPPORT_STATUSES = ['open', 'pending', 'resolved', 'closed'] as const;
export const SENDER_TYPES = ['client', 'agent', 'system'] as const;
export const SLA_TARGET_TYPES = ['first_response', 'resolution'] as const;

export const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

// ============================================================================
// Types & Interfaces: Support Tickets & SLA Operations [FR-1 - FR-9]
// ============================================================================

export type TicketPriority = (typeof SUPPORT_PRIORITIES)[number] | string;
export type TicketStatus = (typeof SUPPORT_STATUSES)[number] | string;
export type SenderType = (typeof SENDER_TYPES)[number] | string;
export type SLATargetType = (typeof SLA_TARGET_TYPES)[number] | string;

export interface CreateTicketInput {
  priority: TicketPriority;
  subject: string;
  description: string;
  client_id: string;
  assigned_tier?: string | null;
  assigned_agent_id?: string | null;
}

export interface UpdateTicketInput {
  priority?: TicketPriority | null;
  status?: TicketStatus | null;
  assigned_tier?: string | null;
  assigned_agent_id?: string | null;
  subject?: string | null;
  description?: string | null;
}

export interface SLATracking {
  id: string;
  ticket_id: string;
  target_type: SLATargetType;
  target_due_at?: string | null;
  warning_sent_at?: string | null;
  breached_at?: string | null;
  is_breached: boolean;
}

export interface Ticket {
  id: string;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  client_id: string;
  assigned_tier?: string | null;
  assigned_agent_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  first_responded_at?: string | null;
  resolved_at?: string | null;
  sla_trackings?: SLATracking[] | null;
}

export interface TicketList {
  items: Ticket[];
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

export interface CreateMessageInput {
  sender_id: string;
  sender_type: SenderType;
  message_body: string;
}

export interface TicketAttachment {
  id: string;
  message_id: string;
  filename: string;
  file_size_bytes: number;
  mime_type: string;
  storage_key: string;
  uploaded_at?: string | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: SenderType;
  message_body: string;
  created_at?: string | null;
  attachments?: TicketAttachment[] | null;
}

export interface CSATRatingInput {
  score: number;
  feedback_text?: string | null;
}

export interface CSATRating {
  id: string;
  ticket_id: string;
  score: number;
  feedback_text?: string | null;
  submitted_at?: string | null;
}

export interface TimeWindow {
  start_time?: string | null;
  end_time?: string | null;
}

export interface PriorityBreakdown {
  P1: number;
  P2: number;
  P3: number;
}

export interface SupportAnalytics {
  time_window: TimeWindow;
  total_tickets: number;
  open_tickets_count: number;
  resolved_tickets_count: number;
  average_response_time_minutes: number;
  mean_time_to_resolution_hours: number;
  sla_breach_rate_percent: number;
  average_csat_score: number;
  csat_response_count: number;
  priority_breakdown: PriorityBreakdown;
}

export interface SupportAnalyticsQueryParams {
  start_time?: string | Date | null;
  end_time?: string | Date | null;
  priority?: string | null;
  client_id?: string | null;
}

export interface SLARemainingTime {
  totalSeconds: number;
  isBreached: boolean;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Sanitization & Validation Helpers [FR-1, FR-3, FR-4, NFR-1, NFR-2]
// ============================================================================

/**
 * Sanitize and validate ticket priority string ('P1', 'P2', 'P3') [FR-1, NFR-2].
 */
export function sanitizePriority(priority?: string | null): TicketPriority {
  if (!priority || typeof priority !== 'string') {
    return 'P3';
  }
  const clean = priority.trim().toUpperCase();
  if (SUPPORT_PRIORITIES.includes(clean as any)) {
    return clean as TicketPriority;
  }
  return 'P3';
}

/**
 * Sanitize and validate ticket status string ('open', 'pending', 'resolved', 'closed') [FR-1, NFR-2].
 */
export function sanitizeStatus(status?: string | null): TicketStatus {
  if (!status || typeof status !== 'string') {
    return 'open';
  }
  const clean = status.trim().toLowerCase();
  if (SUPPORT_STATUSES.includes(clean as any)) {
    return clean as TicketStatus;
  }
  return 'open';
}

/**
 * Validate attachment file size and MIME type at entry point prior to upload processing [FR-3, NFR-2].
 */
export function validateAttachmentFile(
  file: File | Blob,
  maxSizeBytes: number = DEFAULT_MAX_FILE_SIZE_BYTES,
  allowedMimeTypes: readonly string[] = DEFAULT_ALLOWED_MIME_TYPES
): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided for upload.' };
  }

  if (file.size > maxSizeBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed threshold of ${maxMb} MB.`,
    };
  }

  if (allowedMimeTypes && allowedMimeTypes.length > 0 && file.type) {
    const normalizedType = file.type.toLowerCase().trim();
    const isAllowed = allowedMimeTypes.some(
      (mime) => mime.toLowerCase() === normalizedType || normalizedType.startsWith('image/')
    );
    if (!isAllowed) {
      return {
        valid: false,
        error: `File type '${file.type}' is not permitted. Supported types: images, PDF, TXT, Word documents.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Calculate SLA time remaining with sub-second accuracy for active countdown timers [FR-4, NFR-1].
 */
export function calculateSLATimeRemaining(
  targetDueAt?: string | Date | null,
  now: Date = new Date()
): SLARemainingTime {
  if (!targetDueAt) {
    return {
      totalSeconds: 0,
      isBreached: false,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: 'N/A',
    };
  }

  const dueDate = targetDueAt instanceof Date ? targetDueAt : new Date(targetDueAt);
  const diffMs = dueDate.getTime() - now.getTime();

  if (isNaN(diffMs)) {
    return {
      totalSeconds: 0,
      isBreached: false,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: 'Invalid Date',
    };
  }

  if (diffMs <= 0) {
    const overdueSeconds = Math.abs(Math.floor(diffMs / 1000));
    const h = Math.floor(overdueSeconds / 3600);
    const m = Math.floor((overdueSeconds % 3600) / 60);
    const s = overdueSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      totalSeconds: -overdueSeconds,
      isBreached: true,
      hours: h,
      minutes: m,
      seconds: s,
      formatted: `Breached by ${h > 0 ? `${h}h ` : ''}${m}m ${pad(s)}s`,
    };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  const formatted =
    hours > 0
      ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s`
      : `${minutes}m ${pad(seconds)}s`;

  return {
    totalSeconds,
    isBreached: false,
    hours,
    minutes,
    seconds,
    formatted,
  };
}

/**
 * Extract SLA tracking record for specified target_type ('first_response' or 'resolution') [FR-4, FR-5].
 */
export function getSLATrackingRecord(
  slaTrackings?: SLATracking[] | null,
  targetType: SLATargetType = 'first_response'
): SLATracking | null {
  if (!slaTrackings || !Array.isArray(slaTrackings) || slaTrackings.length === 0) {
    return null;
  }
  return (
    slaTrackings.find((s) => s.target_type.toLowerCase() === targetType.toLowerCase()) || null
  );
}

// ============================================================================
// API Wrapper Client Operations [FR-1 - FR-9]
// ============================================================================

/**
 * Create a new support ticket and initialize SLA tracking [FR-1, FR-4, FR-7, NFR-2].
 */
export async function createTicket(payload: CreateTicketInput): Promise<Ticket> {
  if (!payload.subject || !payload.subject.trim()) {
    throw new Error('Ticket subject is required and cannot be blank.');
  }
  if (!payload.description || !payload.description.trim()) {
    throw new Error('Ticket description is required and cannot be blank.');
  }
  if (!payload.client_id || !payload.client_id.trim()) {
    throw new Error('Client ID is required.');
  }

  const sanitizedPayload: CreateTicketInput = {
    ...payload,
    priority: sanitizePriority(payload.priority),
    subject: payload.subject.trim(),
    description: payload.description.trim(),
    client_id: payload.client_id.trim(),
  };

  return apiCreateTicket(sanitizedPayload);
}

/**
 * Filter and list support tickets matching query criteria [FR-1].
 */
export async function listTickets(params: TicketFilterQueryParams = {}): Promise<TicketList> {
  return apiListTickets(params);
}

/**
 * Retrieve full support ticket details including active SLA tracking states [FR-1, FR-4].
 */
export async function getTicket(ticketId: string): Promise<Ticket> {
  if (!ticketId || !ticketId.trim()) {
    throw new Error('ticketId is required to retrieve ticket details.');
  }
  return apiGetTicket(ticketId.trim());
}

/**
 * Update support ticket fields, status transitions, or priority levels [FR-1, FR-4, FR-7].
 */
export async function updateTicket(ticketId: string, payload: UpdateTicketInput): Promise<Ticket> {
  if (!ticketId || !ticketId.trim()) {
    throw new Error('ticketId is required for updating a ticket.');
  }

  const sanitizedPayload: UpdateTicketInput = { ...payload };
  if (payload.priority) {
    sanitizedPayload.priority = sanitizePriority(payload.priority);
  }
  if (payload.status) {
    sanitizedPayload.status = sanitizeStatus(payload.status);
  }

  return apiUpdateTicket(ticketId.trim(), sanitizedPayload);
}

/**
 * Delete a support ticket [FR-1]. Returns HTTP 204 No Content.
 */
export async function deleteTicket(ticketId: string): Promise<void> {
  if (!ticketId || !ticketId.trim()) {
    throw new Error('ticketId is required for deleting a ticket.');
  }
  return apiDeleteTicket(ticketId.trim());
}

/**
 * Post a sequential message to a ticket thread [FR-2, FR-7, NFR-2].
 */
export async function createMessage(ticketId: string, payload: CreateMessageInput): Promise<TicketMessage> {
  if (!ticketId || !ticketId.trim()) {
    throw new Error('ticketId is required to post a thread message.');
  }
  if (!payload.sender_id || !payload.sender_id.trim()) {
    throw new Error('sender_id is required for posting a message.');
  }
  if (!payload.message_body || !payload.message_body.trim()) {
    throw new Error('message_body cannot be blank.');
  }

  return apiCreateMessage(ticketId.trim(), {
    sender_id: payload.sender_id.trim(),
    sender_type: payload.sender_type || 'client',
    message_body: payload.message_body.trim(),
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
): Promise<TicketAttachment> {
  if (!ticketId || !ticketId.trim()) {
    throw new Error('ticketId is required for attachment upload.');
  }

  const validation = validateAttachmentFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid attachment file.');
  }

  return apiUploadAttachment(ticketId.trim(), file, senderId.trim(), senderType, messageBody);
}

/**
 * Retrieve all chronological messages and attachment metadata for a ticket thread [FR-2].
 */
export async function getMessages(ticketId: string): Promise<TicketMessage[]> {
  if (!ticketId || !ticketId.trim()) {
    throw new Error('ticketId is required to retrieve thread messages.');
  }
  return apiGetMessages(ticketId.trim());
}

/**
 * Download attachment binary content blob for a support ticket [FR-2].
 */
export async function downloadAttachment(attachmentId: string): Promise<Blob> {
  if (!attachmentId || !attachmentId.trim()) {
    throw new Error('attachmentId is required to download file content.');
  }
  return apiDownloadAttachment(attachmentId.trim());
}

/**
 * Submit client CSAT satisfaction score (1 to 5) for a resolved support ticket [FR-9, NFR-2].
 */
export async function submitCSAT(ticketId: string, payload: CSATRatingInput): Promise<CSATRating> {
  if (!ticketId || !ticketId.trim()) {
    throw new Error('ticketId is required to submit CSAT rating.');
  }
  if (typeof payload.score !== 'number' || payload.score < 1 || payload.score > 5) {
    throw new Error('CSAT score must be an integer between 1 and 5.');
  }

  return apiSubmitCSAT(ticketId.trim(), {
    score: Math.round(payload.score),
    feedback_text: payload.feedback_text ? payload.feedback_text.trim() : null,
  });
}

/**
 * Retrieve CSAT rating score and feedback for a support ticket [FR-9].
 */
export async function getCSAT(ticketId: string): Promise<CSATRating> {
  if (!ticketId || !ticketId.trim()) {
    throw new Error('ticketId is required to retrieve CSAT rating.');
  }
  return apiGetCSAT(ticketId.trim());
}

/**
 * Retrieve aggregated operational support metrics over specified time windows [FR-8, NFR-2, NFR-3].
 */
export async function getSupportAnalytics(
  params: SupportAnalyticsQueryParams = {}
): Promise<SupportAnalytics> {
  return apiGetSupportAnalytics(params);
}

// ============================================================================
// Service Bundle Export
// ============================================================================

export const supportService = {
  // Helpers & Sanitizers
  sanitizePriority,
  sanitizeStatus,
  validateAttachmentFile,
  calculateSLATimeRemaining,
  getSLATrackingRecord,

  // API Operations
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

export default supportService;
