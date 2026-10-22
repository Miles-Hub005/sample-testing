import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiClient,
  apiFetch,
  clearToken,
  createMessage,
  createTicket,
  deleteTicket,
  downloadAttachment,
  getCSAT,
  getMe,
  getMessages,
  getNavigationMenu,
  getSupportAnalytics,
  getTicket,
  getToken,
  handleUnauthorizedRedirect,
  listTickets,
  login,
  register,
  setToken,
  submitCSAT,
  updateTicket,
  uploadAttachment,
} from '../../src/services/api_client';

describe('api_client service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Token management & low-level helpers', () => {
    it('stores, retrieves, and clears auth token', () => {
      expect(getToken()).toBeNull();
      setToken('mock-jwt-token-789');
      expect(getToken()).toBe('mock-jwt-token-789');
      clearToken();
      expect(getToken()).toBeNull();
    });

    it('handles unauthorized redirect', () => {
      setToken('token-to-clear');
      const originalLocation = window.location;
      // @ts-ignore
      delete window.location;
      window.location = {
        ...originalLocation,
        pathname: '/support',
        href: 'http://localhost/support',
      } as any;

      handleUnauthorizedRedirect();

      expect(getToken()).toBeNull();
      expect(window.location.href).toBe('/login');

      window.location = originalLocation;
    });
  });

  describe('Support Ticket API Endpoints', () => {
    it('createTicket executes POST /api/v1/tickets', async () => {
      const mockTicket = {
        id: 'ticket-uuid-101',
        priority: 'P1',
        status: 'open',
        subject: 'System Outage',
        description: 'Database is unreachable',
        client_id: 'client-123',
        sla_trackings: [],
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockTicket,
      } as Response);

      const result = await createTicket({
        priority: 'P1',
        subject: 'System Outage',
        description: 'Database is unreachable',
        client_id: 'client-123',
      });

      expect(result).toEqual(mockTicket);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/tickets');
      expect(options?.method).toBe('POST');
    });

    it('listTickets formats query parameters and executes GET /api/v1/tickets', async () => {
      const mockList = {
        items: [],
        total_count: 0,
        limit: 50,
        offset: 0,
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockList,
      } as Response);

      const result = await listTickets({
        client_id: 'client-123',
        priority: 'P1',
        status: 'open',
        limit: 20,
      });

      expect(result).toEqual(mockList);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/tickets?client_id=client-123&priority=P1&status=open&limit=20');
    });

    it('getTicket executes GET /api/v1/tickets/:id', async () => {
      const mockTicket = { id: 't-1', priority: 'P2', status: 'open', subject: 'Bug' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockTicket,
      } as Response);

      const result = await getTicket('t-1');
      expect(result).toEqual(mockTicket);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/tickets/t-1');
    });

    it('updateTicket executes PATCH /api/v1/tickets/:id', async () => {
      const mockTicket = { id: 't-1', status: 'resolved' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockTicket,
      } as Response);

      const result = await updateTicket('t-1', { status: 'resolved' });
      expect(result).toEqual(mockTicket);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/tickets/t-1');
      expect(options?.method).toBe('PATCH');
    });

    it('deleteTicket handles 204 No Content', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      await expect(deleteTicket('t-1')).resolves.toBeUndefined();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('createMessage executes POST /api/v1/tickets/:id/messages', async () => {
      const mockMessage = { id: 'm-1', ticket_id: 't-1', message_body: 'Hello' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockMessage,
      } as Response);

      const result = await createMessage('t-1', {
        sender_id: 'u-1',
        sender_type: 'client',
        message_body: 'Hello',
      });

      expect(result).toEqual(mockMessage);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/tickets/t-1/messages');
      expect(options?.method).toBe('POST');
    });

    it('getMessages executes GET /api/v1/tickets/:id/messages', async () => {
      const mockMessages = [{ id: 'm-1', message_body: 'Help' }];
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockMessages,
      } as Response);

      const result = await getMessages('t-1');
      expect(result).toEqual(mockMessages);
    });

    it('uploadAttachment handles multipart form upload', async () => {
      const mockAttachment = {
        id: 'att-1',
        filename: 'test.png',
        file_size_bytes: 1024,
        mime_type: 'image/png',
        storage_key: 'keys/test.png',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAttachment,
      } as Response);

      const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
      const result = await uploadAttachment('t-1', file, 'user-123', 'client');

      expect(result).toEqual(mockAttachment);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/tickets/t-1/attachments');
      expect(options?.method).toBe('POST');
    });

    it('downloadAttachment fetches binary blob response', async () => {
      const blob = new Blob(['sample data'], { type: 'application/octet-stream' });
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/octet-stream' }),
        blob: async () => blob,
      } as Response);

      const result = await downloadAttachment('att-1');
      expect(result).toBeDefined();
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/tickets/attachments/att-1');
    });

    it('submitCSAT executes POST /api/v1/tickets/:id/csat', async () => {
      const mockCSAT = { id: 'csat-1', ticket_id: 't-1', score: 5, feedback_text: 'Great!' };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockCSAT,
      } as Response);

      const result = await submitCSAT('t-1', { score: 5, feedback_text: 'Great!' });
      expect(result).toEqual(mockCSAT);
    });

    it('getCSAT executes GET /api/v1/tickets/:id/csat', async () => {
      const mockCSAT = { id: 'csat-1', ticket_id: 't-1', score: 4 };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockCSAT,
      } as Response);

      const result = await getCSAT('t-1');
      expect(result).toEqual(mockCSAT);
    });

    it('getSupportAnalytics formats date and priority parameters', async () => {
      const mockAnalytics = {
        time_window: {},
        total_tickets: 10,
        open_tickets_count: 2,
        resolved_tickets_count: 8,
        average_response_time_minutes: 15.5,
        mean_time_to_resolution_hours: 2.4,
        sla_breach_rate_percent: 5.0,
        average_csat_score: 4.8,
        csat_response_count: 6,
        priority_breakdown: { P1: 2, P2: 5, P3: 3 },
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockAnalytics,
      } as Response);

      const result = await getSupportAnalytics({
        start_time: '2026-01-01T00:00:00Z',
        priority: 'P1',
      });

      expect(result).toEqual(mockAnalytics);
      const [url] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/analytics/support?start_time=2026-01-01T00%3A00%3A00Z&priority=P1');
    });
  });
});
