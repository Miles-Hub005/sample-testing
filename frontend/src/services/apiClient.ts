/**
 * HTTP Client Wrapper for Platform API Services.
 * Re-exports core API client functions and bindings from api_client.ts.
 */

export * from './api_client';
import apiClient from './api_client';

export default apiClient;
