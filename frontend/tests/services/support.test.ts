import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateSLATimeRemaining,
  createMessage,
  createTicket,
  deleteTicket,
  downloadAttachment,
  getCSAT,
  getMessages,
  getSLATrackingRecord,
  getSupportAnalytics,
  getTicket,
  listTickets,
  sanitizePriority,
  sanitizeStatus,
  submitCSAT,
  supportService,
  updateTicket,
  uploadAttachment,
  validateAttachmentFile,
} from '../../src/services/support';
import * as apiClientModule from '../../src/services/apiClient';

vi.mock('../../src/services/apiClient', async () => {
  const actual = await vi.importActual('../../src/services/apiClient');
  return {
    ...actual,
    createTicket: vi.fn(),
    listTickets: vi.fn(),
    getTicket: vi.fn(),
    updateTicket: vi.fn(),
    deleteTicket: vi.fn(),
    createMessage: vi.fn(),
    uploadAttachment: vi.fn(),
    getMessages: vi.fn(),
    downloadAttachment: vi.fn(),
    submitCSAT: vi.fn(),
    getCSAT: vi.fn(),
    getSupportAnalytics: vi.fn(),
  };
});

describe('Support Client API Wrapper Service [FR-1 - FR-9, NFR-1 - NFR-5]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sanitization & Helper Functions [FR-1, FR-3, FR-4, NFR-1, NFR-2]', () => {
    it('sanitizePriority sanitizes and defaults ticket priority correctly', () => {
      expect(sanitizePriority('P1')).toBe('P1');
      expect(sanitizePriority('  p2  ')).toBe('P2');
      expect(sanitizePriority('p3')).toBe('P3');
      expect(sanitizePriority('INVALID')).toBe('P3');
      expect(sanitizePriority(null)).toBe('P3');
      expect(sanitizePriority(undefined)).toBe('P3');
    });

    it('sanitizeStatus sanitizes and defaults ticket status correctly', () => {
      expect(sanitizeStatus('open')).toBe('open');
      expect(sanitizeStatus('  PENDING  ')).toBe('pending');
      expect(sanitizeStatus('Resolved')).toBe('resolved');
      expect(sanitizeStatus('CLOSED')).toBe('closed');
      expect(sanitizeStatus('unknown')).toBe('open');
      expect(sanitizeStatus(null)).toBe('open');
    });

    it('validateAttachmentFile validates size and MIME type limits [FR-3, NFR-2]', () => {
      const validFile = new File(['hello world'], 'test.png', { type: 'image/png' });
      const validRes = validateAttachmentFile(validFile);
      expect(validRes.valid).toBe(true);
      expect(validRes.error).toBeUndefined();

      // Test size overflow
      const largeBlob = new Blob([new ArrayBuffer(11 * 1024 * 1024)]);
      const sizeRes = validateAttachmentFile(largeBlob, 10 * 1024 * 1024);
      expect(sizeRes.valid).toBe(false);
      expect(sizeRes.error).toContain('exceeds maximum allowed threshold');

      // Test disallowed MIME type
      const invalidTypeFile = new File(['bad'], 'script.exe', { type: 'application/x-msdownload' });
      const mimeRes = validateAttachmentFile(invalidTypeFile, 10 * 1024 * 1024, ['image/png', 'application/pdf']);
      expect(mimeRes.valid).toBe(false);
      expect(mimeRes.error).toContain('is not permitted');
    });

    it('calculateSLATimeRemaining computes countdown with sub-second accuracy [FR-4, NFR-1]', () => {
      const now = new Date('2026-10-06T10:00:00Z');

      // Future due date (+1 hour)
      const dueFuture = new Date('2026-10-06T11:00:00Z');
      const futureRes = calculateSLATimeRemaining(dueFuture, now);
      expect(futureRes.isBreached).toBe(false);
      expect(futureRes.totalSeconds).toBe(3600);
      expect(futureRes.hours).toBe(1);
      expect(futureRes.minutes).toBe(0);
      expect(futureRes.seconds).toBe(0);
      expect(futureRes.formatted).toBe('1h 00m 00s');

      // Past due date (-15 minutes)
      const duePast = new Date('2026-10-06T09:45:00Z');
      const pastRes = calculateSLATimeRemaining(duePast, now);
      expect(pastRes.isBreached).toBe(true);
      expect(pastRes.totalSeconds).toBe(-900);
      expect(pastRes.formatted).toContain('Breached by 15m 00s');

      // Null or missing due date
      const nullRes = calculateSLATimeRemaining(null);
      expect(nullRes.formatted).toBe('N/A');
    });

    it('getSLATrackingRecord extracts tracking records by target_type', () => {
      const mockTrackings = [
        {
          id: 'sla-1',
          ticket_id: 't-1',
          target_type: 'first_response',
          is_breached: false,
        },
        {
          id: 'sla-2',
          ticket_id: 't-1',
          target_type: 'resolution',
          is_breached: true,
        },
      ];

      const frSLA = getSLATrackingRecord(mockTrackings, 'first_response');
      expect(frSLA?.id).toBe('sla-1');

      const resSLA = getSLATrackingRecord(mockTrackings, 'resolution');
      expect(resSLA?.id).toBe('sla-2');

      const missingSLA = getSLATrackingRecord(mockTrackings, 'non_existent');
      expect(missingSLA).toBeNull();
    });
  });

  describe('Ticket Operations [FR-1, FR-4, FR-7]', () => {
    it('createTicket sanitizes payload and invokes API client', async () => {
      const mockTicket = {
        id: 'ticket-101',
        priority: 'P1',
        status: 'open',
        subject: 'Database Timeout',
        description: 'Queries taking too long',
        client_id: 'client-99',
      };

      vi.mocked(apiClientModule.createTicket).mockResolvedValueOnce(mockTicket as any);

      const result = await createTicket({
        priority: 'p1',
        subject: '  Database Timeout  ',
        description: '  Queries taking too long  ',
        client_id: ' client-99 ',
      });

      expect(apiClientModule.createTicket).toHaveBeenCalledWith({
        priority: 'P1',
        subject: 'Database Timeout',
        description: 'Queries taking too long',
        client_id: 'client-99',
      });
      expect(result).toEqual(mockTicket);
    });

    it('createTicket throws error on missing required fields', async () => {
      await expect(
        createTicket({ priority: 'P1', subject: '', description: 'Desc', client_id: 'c1' })
      ).rejects.toThrow('Ticket subject is required');

      await expect(
        createTicket({ priority: 'P1', subject: 'Subj', description: '  ', client_id: 'c1' })
      ).rejects.toThrow('Ticket description is required');

      await expect(
        createTicket({ priority: 'P1', subject: 'Subj', description: 'Desc', client_id: '' })
      ).rejects.toThrow('Client ID is required');
    });

    it('listTickets passes filter parameters to API client', async () => {
      const mockList = {
        items: [],
        total_count: 0,
        limit: 50,
        offset: 0,
      };

      vi.mocked(apiClientModule.listTickets).mockResolvedValueOnce(mockList as any);

      const res = await listTickets({ priority: 'P1', status: 'open' });

      expect(apiClientModule.listTickets).toHaveBeenCalledWith({ priority: 'P1', status: 'open' });
      expect(res).toEqual(mockList);
    });

    it('getTicket, updateTicket, and deleteTicket invoke API client', async () => {
      const mockTicket = { id: 't-123', priority: 'P2', status: 'pending', subject: 'Test', description: 'Test', client_id: 'c1' };

      vi.mocked(apiClientModule.getTicket).mockResolvedValueOnce(mockTicket as any);
      vi.mocked(apiClientModule.updateTicket).mockResolvedValueOnce(mockTicket as any);
      vi.mocked(apiClientModule.deleteTicket).mockResolvedValueOnce(undefined as any);

      const fetched = await getTicket('t-123');
      expect(apiClientModule.getTicket).toHaveBeenCalledWith('t-123');
      expect(fetched).toEqual(mockTicket);

      const updated = await updateTicket('t-123', { status: 'resolved' });
      expect(apiClientModule.updateTicket).toHaveBeenCalledWith('t-123', { status: 'resolved' });
      expect(updated).toEqual(mockTicket);

      await deleteTicket('t-123');
      expect(apiClientModule.deleteTicket).toHaveBeenCalledWith('t-123');
    });
  });

  describe('Thread Messages & Attachments [FR-2, FR-3]', () => {
    it('createMessage validates payload and invokes API client', async () => {
      const mockMsg = { id: 'msg-1', ticket_id: 't-1', sender_id: 'user-1', sender_type: 'client', message_body: 'Hello' };
      vi.mocked(apiClientModule.createMessage).mockResolvedValueOnce(mockMsg as any);

      const res = await createMessage('t-1', {
        sender_id: ' user-1 ',
        sender_type: 'client',
        message_body: ' Hello ',
      });

      expect(apiClientModule.createMessage).toHaveBeenCalledWith('t-1', {
        sender_id: 'user-1',
        sender_type: 'client',
        message_body: 'Hello',
      });
      expect(res).toEqual(mockMsg);
    });

    it('uploadAttachment validates file and invokes uploadAttachment API', async () => {
      const mockFile = new File(['log data'], 'error.log', { type: 'text/plain' });
      const mockAttachment = { id: 'att-1', message_id: 'm-1', filename: 'error.log', file_size_bytes: 8, mime_type: 'text/plain', storage_key: 'key-1' };

      vi.mocked(apiClientModule.uploadAttachment).mockResolvedValueOnce(mockAttachment as any);

      const res = await uploadAttachment('t-1', mockFile, 'usr-1');

      expect(apiClientModule.uploadAttachment).toHaveBeenCalledWith('t-1', mockFile, 'usr-1', 'client', undefined);
      expect(res).toEqual(mockAttachment);
    });

    it('getMessages and downloadAttachment delegate to API client', async () => {
      const mockMsgs = [{ id: 'm-1', ticket_id: 't-1', sender_id: 'u-1', sender_type: 'client', message_body: 'Msg' }];
      const mockBlob = new Blob(['data']);

      vi.mocked(apiClientModule.getMessages).mockResolvedValueOnce(mockMsgs as any);
      vi.mocked(apiClientModule.downloadAttachment).mockResolvedValueOnce(mockBlob as any);

      const msgs = await getMessages('t-1');
      expect(apiClientModule.getMessages).toHaveBeenCalledWith('t-1');
      expect(msgs).toEqual(mockMsgs);

      const blob = await downloadAttachment('att-1');
      expect(apiClientModule.downloadAttachment).toHaveBeenCalledWith('att-1');
      expect(blob).toEqual(mockBlob);
    });
  });

  describe('CSAT Collection & Support Analytics [FR-8, FR-9]', () => {
    it('submitCSAT validates rating score boundary and invokes API', async () => {
      const mockCsat = { id: 'csat-1', ticket_id: 't-1', score: 5, feedback_text: 'Great service' };
      vi.mocked(apiClientModule.submitCSAT).mockResolvedValueOnce(mockCsat as any);

      const res = await submitCSAT('t-1', { score: 5, feedback_text: ' Great service ' });
      expect(apiClientModule.submitCSAT).toHaveBeenCalledWith('t-1', { score: 5, feedback_text: 'Great service' });
      expect(res).toEqual(mockCsat);

      // Invalid score
      await expect(submitCSAT('t-1', { score: 6 })).rejects.toThrow('CSAT score must be an integer between 1 and 5');
    });

    it('getCSAT and getSupportAnalytics delegate to API client', async () => {
      const mockCsat = { id: 'csat-1', ticket_id: 't-1', score: 4 };
      const mockAnalytics = {
        time_window: {},
        total_tickets: 10,
        open_tickets_count: 2,
        resolved_tickets_count: 8,
        average_response_time_minutes: 12.5,
        mean_time_to_resolution_hours: 3.2,
        sla_breach_rate_percent: 5.0,
        average_csat_score: 4.8,
        csat_response_count: 6,
        priority_breakdown: { P1: 2, P2: 3, P3: 5 },
      };

      vi.mocked(apiClientModule.getCSAT).mockResolvedValueOnce(mockCsat as any);
      vi.mocked(apiClientModule.getSupportAnalytics).mockResolvedValueOnce(mockAnalytics as any);

      const csat = await getCSAT('t-1');
      expect(apiClientModule.getCSAT).toHaveBeenCalledWith('t-1');
      expect(csat).toEqual(mockCsat);

      const analytics = await getSupportAnalytics({ priority: 'P1' });
      expect(apiClientModule.getSupportAnalytics).toHaveBeenCalledWith({ priority: 'P1' });
      expect(analytics).toEqual(mockAnalytics);
    });

    it('supportService object bundles all helper and API operations', () => {
      expect(supportService.createTicket).toBeDefined();
      expect(supportService.calculateSLATimeRemaining).toBeDefined();
      expect(supportService.getSupportAnalytics).toBeDefined();
    });
  });
});
