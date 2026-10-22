import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiClient,
  apiFetch,
  clearToken,
  getMe,
  getNavigationMenu,
  getToken,
  handleUnauthorizedRedirect,
  login,
  register,
  setToken,
} from '../../src/services/apiClient';

describe('apiClient service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Token management', () => {
    it('should store, retrieve, and clear auth token in localStorage', () => {
      expect(getToken()).toBeNull();

      setToken('mock-jwt-token-123');
      expect(getToken()).toBe('mock-jwt-token-123');

      clearToken();
      expect(getToken()).toBeNull();
    });

    it('should handle unauthorized redirect by clearing token and setting location', () => {
      setToken('expired-token');

      // Mock window.location
      const originalLocation = window.location;
      // @ts-ignore
      delete window.location;
      window.location = {
        ...originalLocation,
        pathname: '/dashboard',
        href: 'http://localhost/dashboard',
      } as any;

      handleUnauthorizedRedirect();

      expect(getToken()).toBeNull();
      expect(window.location.href).toBe('/login');

      // Restore window.location
      window.location = originalLocation;
    });

    it('should not redirect if already on /login page', () => {
      setToken('some-token');

      const originalLocation = window.location;
      // @ts-ignore
      delete window.location;
      window.location = {
        ...originalLocation,
        pathname: '/login',
        href: 'http://localhost/login',
      } as any;

      handleUnauthorizedRedirect();

      expect(getToken()).toBeNull();
      expect(window.location.href).toBe('http://localhost/login');

      window.location = originalLocation;
    });
  });

  describe('apiFetch wrapper', () => {
    it('should attach Authorization header when token exists in storage', async () => {
      setToken('valid-token-xyz');

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'success' }),
      } as Response);

      const result = await apiFetch<{ message: string }>('/api/v1/test');

      expect(result).toEqual({ message: 'success' });
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/test');
      const headers = options?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer valid-token-xyz');
    });

    it('should handle 401 Unauthorized by clearing token and throwing ApiError', async () => {
      setToken('invalid-token');

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ detail: 'Invalid token' }),
      } as Response);

      await expect(apiFetch('/api/v1/protected')).rejects.toThrow(ApiError);
      expect(getToken()).toBeNull();
    });

    it('should handle non-ok responses (e.g. 409 Conflict) and throw ApiError with detail', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ detail: 'A user with this email address already exists.' }),
      } as Response);

      try {
        await apiFetch('/api/v1/auth/register', { method: 'POST' });
        expect.unreachable('Should have thrown ApiError');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(409);
        expect(err.detail).toBe('A user with this email address already exists.');
      }
    });

    it('should return empty object on 204 No Content response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
      } as Response);

      const result = await apiFetch('/api/v1/item/1', { method: 'DELETE' });
      expect(result).toEqual({});
    });
  });

  describe('Auth and Navigation calls', () => {
    it('should execute login call and save returned access token', async () => {
      const mockLoginResponse = {
        access_token: 'new-auth-token-456',
        token_type: 'bearer',
        user_id: 'user-uuid-1',
        tenant_id: 'tenant-uuid-1',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockLoginResponse,
      } as Response);

      const res = await login({ email: 'user@example.com', password: 'password123' });

      expect(res).toEqual(mockLoginResponse);
      expect(getToken()).toBe('new-auth-token-456');
    });

    it('should execute register call with email, password, and tenant_id', async () => {
      const mockRegisterResponse = {
        user_id: 'user-uuid-2',
        email: 'newuser@example.com',
        tenant_id: 'tenant-uuid-2',
        roles: ['ClientViewer'],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockRegisterResponse,
      } as Response);

      const res = await register({
        email: 'newuser@example.com',
        password: 'securepassword',
        tenant_id: 'tenant-uuid-2',
      });

      expect(res).toEqual(mockRegisterResponse);
    });

    it('should execute getMe call', async () => {
      const mockMeResponse = {
        user_id: 'user-uuid-1',
        email: 'user@example.com',
        tenant_id: 'tenant-uuid-1',
        roles: ['ClientAdmin'],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockMeResponse,
      } as Response);

      const res = await getMe();
      expect(res).toEqual(mockMeResponse);
    });

    it('should execute getNavigationMenu call', async () => {
      const mockNavResponse = {
        items: [
          { title: 'Dashboard', path: '/dashboard', is_accessible: true, icon_id: 'dashboard' },
        ],
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockNavResponse,
      } as Response);

      const res = await getNavigationMenu();
      expect(res).toEqual(mockNavResponse);
    });

    it('should export apiClient default object containing all service methods', () => {
      expect(apiClient.getToken).toBe(getToken);
      expect(apiClient.setToken).toBe(setToken);
      expect(apiClient.clearToken).toBe(clearToken);
      expect(apiClient.login).toBe(login);
      expect(apiClient.register).toBe(register);
      expect(apiClient.getMe).toBe(getMe);
      expect(apiClient.getNavigationMenu).toBe(getNavigationMenu);
    });
  });
});
