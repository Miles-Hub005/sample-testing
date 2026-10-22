import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildQueryString,
  contractApi,
  createAmendment,
  createContract,
  deleteContract,
  downloadDocumentVersion,
  executeSignature,
  getContractDetail,
  listAmendments,
  listContracts,
  listPendingSignatures,
  sanitizeCategory,
  sanitizeStatus,
  uploadDocumentVersion,
} from '../../src/services/contract_api';
import { apiFetch, ApiError, setToken, clearToken } from '../../src/services/apiClient';

vi.mock('../../src/services/apiClient', async () => {
  const actual = await vi.importActual('../../src/services/apiClient');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

describe('Contract API Client Service Wrapper', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Sanitization and Query Building Helpers', () => {
    it('sanitizeCategory normalizes case-insensitive categories', () => {
      expect(sanitizeCategory('sow')).toBe('SOW');
      expect(sanitizeCategory('contract')).toBe('Contract');
      expect(sanitizeCategory('nda')).toBe('NDA');
      expect(sanitizeCategory('exhibit')).toBe('Exhibit');
      expect(sanitizeCategory('invalid')).toBeUndefined();
      expect(sanitizeCategory(null)).toBeUndefined();
    });

    it('sanitizeStatus normalizes case-insensitive status values', () => {
      expect(sanitizeStatus('draft')).toBe('DRAFT');
      expect(sanitizeStatus('pending_signature')).toBe('PENDING_SIGNATURE');
      expect(sanitizeStatus('active')).toBe('ACTIVE');
      expect(sanitizeStatus('amended')).toBe('AMENDED');
      expect(sanitizeStatus('terminated')).toBe('TERMINATED');
      expect(sanitizeStatus('expired')).toBe('EXPIRED');
      expect(sanitizeStatus('unknown')).toBeUndefined();
    });

    it('buildQueryString formats query string parameters correctly', () => {
      expect(buildQueryString()).toBe('');
      expect(buildQueryString({})).toBe('');

      const queryStr = buildQueryString({
        category: 'sow',
        status: 'active',
        counterparty: 'Acme Corp',
        page: 2,
        limit: 25,
        expires_before: '2026-12-31',
      });

      expect(queryStr).toContain('category=SOW');
      expect(queryStr).toContain('status=ACTIVE');
      expect(queryStr).toContain('counterparty=Acme+Corp');
      expect(queryStr).toContain('page=2');
      expect(queryStr).toContain('limit=25');
      expect(queryStr).toContain('expires_before=2026-12-31');
    });
  });

  describe('listContracts', () => {
    it('fetches contract list with query parameters', async () => {
      const mockResponse = {
        items: [
          {
            id: 'c-123',
            title: 'Master Service Agreement',
            category: 'Contract',
            status: 'ACTIVE',
            counterparty: 'Global Tech',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        total_count: 1,
        page: 1,
        limit: 50,
      };

      (apiFetch as any).mockResolvedValueOnce(mockResponse);

      const result = await listContracts({ category: 'Contract', page: 1 });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/contracts?category=Contract&page=1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('createContract', () => {
    it('validates required payload fields and sends POST request', async () => {
      await expect(
        createContract({ title: '', category: 'Contract', counterparty: 'Acme' })
      ).rejects.toThrow(/title is required/i);

      await expect(
        createContract({ title: 'Test', category: '' as any, counterparty: 'Acme' })
      ).rejects.toThrow(/category is required/i);

      await expect(
        createContract({ title: 'Test', category: 'Contract', counterparty: '  ' })
      ).rejects.toThrow(/counterparty is required/i);

      const mockDetail = {
        id: 'c-999',
        title: 'New Contract',
        category: 'Contract',
        status: 'DRAFT',
        counterparty: 'Acme Corp',
        created_at: '2026-10-06T08:00:00Z',
        updated_at: '2026-10-06T08:00:00Z',
        clauses: [],
        highlighted_clauses: [],
        slas: [],
        evaluated_slas: [],
        document_versions: [],
        amendments: [],
      };

      (apiFetch as any).mockResolvedValueOnce(mockDetail);

      const payload = { title: 'New Contract', category: 'Contract' as const, counterparty: 'Acme Corp' };
      const res = await createContract(payload);

      expect(apiFetch).toHaveBeenCalledWith('/api/v1/contracts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(res).toEqual(mockDetail);
    });
  });

  describe('getContractDetail', () => {
    it('fetches single contract detail by id', async () => {
      await expect(getContractDetail('')).rejects.toThrow(/Contract ID is required/i);

      const mockDetail = { id: 'c-123', title: 'Contract 123' };
      (apiFetch as any).mockResolvedValueOnce(mockDetail);

      const res = await getContractDetail('c-123');
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/contracts/c-123');
      expect(res).toEqual(mockDetail);
    });
  });

  describe('uploadDocumentVersion', () => {
    it('sends FormData multipart request with file and category_type', async () => {
      await expect(
        uploadDocumentVersion('', 'Contract', new File(['test'], 'doc.pdf'))
      ).rejects.toThrow(/Contract ID is required/i);

      const mockDoc = {
        id: 'v-1',
        contract_id: 'c-123',
        category_type: 'Contract',
        version_number: 1,
        file_path: 'files/doc.pdf',
        checksum: 'abc123hash',
        uploaded_at: '2026-10-06T08:00:00Z',
      };

      (apiFetch as any).mockResolvedValueOnce(mockDoc);

      const file = new File(['sample content'], 'contract_v1.pdf', { type: 'application/pdf' });
      const res = await uploadDocumentVersion('c-123', 'Contract', file);

      expect(apiFetch).toHaveBeenCalledTimes(1);
      const [endpoint, options] = (apiFetch as any).mock.calls[0];
      expect(endpoint).toBe('/api/v1/contracts/c-123/documents');
      expect(options.method).toBe('POST');
      expect(options.body).toBeInstanceOf(FormData);
      expect(res).toEqual(mockDoc);
    });
  });

  describe('downloadDocumentVersion', () => {
    it('downloads document version binary blob with authorization token', async () => {
      setToken('mock-auth-token-xyz');

      const mockBlob = new Blob(['binary file content'], { type: 'application/octet-stream' });
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: async () => mockBlob,
      } as Response);

      const result = await downloadDocumentVersion('c-123', 'v-1');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0];
      expect(url).toContain('/api/v1/contracts/c-123/documents/v-1');
      const headers = options?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer mock-auth-token-xyz');
      expect(result).toBe(mockBlob);
    });

    it('throws ApiError on failed download request', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ detail: 'Document version not found' }),
      } as Response);

      await expect(downloadDocumentVersion('c-123', 'v-missing')).rejects.toThrow(
        /Document version not found/i
      );
    });
  });

  describe('amendments and delete operations', () => {
    it('createAmendment records contract amendment', async () => {
      const mockAmendment = {
        id: 'a-1',
        contract_id: 'c-123',
        sequence_number: 1,
        summary: 'Updated terms',
        created_at: '2026-10-06T08:00:00Z',
      };
      (apiFetch as any).mockResolvedValueOnce(mockAmendment);

      const res = await createAmendment('c-123', { summary: 'Updated terms' });
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/contracts/c-123/amendments', {
        method: 'POST',
        body: JSON.stringify({ summary: 'Updated terms' }),
      });
      expect(res).toEqual(mockAmendment);
    });

    it('listAmendments fetches contract amendment log', async () => {
      const mockList = { items: [], total_count: 0 };
      (apiFetch as any).mockResolvedValueOnce(mockList);

      const res = await listAmendments('c-123');
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/contracts/c-123/amendments');
      expect(res).toEqual(mockList);
    });

    it('deleteContract sends DELETE request', async () => {
      (apiFetch as any).mockResolvedValueOnce({});

      await deleteContract('c-123');
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/contracts/c-123', {
        method: 'DELETE',
      });
    });
  });

  describe('signatures operations', () => {
    it('listPendingSignatures fetches pending requests', async () => {
      const mockSignatures = {
        items: [
          {
            signature_request_id: 'sig-1',
            contract_id: 'c-123',
            signatory_id: 'u-1',
            status: 'PENDING',
          },
        ],
        total_count: 1,
      };
      (apiFetch as any).mockResolvedValueOnce(mockSignatures);

      const res = await listPendingSignatures();
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/signatures/pending');
      expect(res).toEqual(mockSignatures);
    });

    it('executeSignature executes digital signature', async () => {
      const mockExecuteRes = {
        signature_request_id: 'sig-1',
        contract_id: 'c-123',
        status: 'EXECUTED',
        executed_at: '2026-10-06T08:00:00Z',
        all_signatures_completed: true,
        resulting_contract_status: 'ACTIVE',
      };
      (apiFetch as any).mockResolvedValueOnce(mockExecuteRes);

      const res = await executeSignature('sig-1', { signature_digest: 'sha256-digest-xyz' });
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/signatures/sig-1/execute', {
        method: 'POST',
        body: JSON.stringify({ signature_digest: 'sha256-digest-xyz' }),
      });
      expect(res).toEqual(mockExecuteRes);
    });
  });

  describe('contractApi aggregate object', () => {
    it('exports all functions under contractApi default and named object', () => {
      expect(contractApi.listContracts).toBe(listContracts);
      expect(contractApi.createContract).toBe(createContract);
      expect(contractApi.getContractDetail).toBe(getContractDetail);
      expect(contractApi.uploadDocumentVersion).toBe(uploadDocumentVersion);
      expect(contractApi.downloadDocumentVersion).toBe(downloadDocumentVersion);
      expect(contractApi.createAmendment).toBe(createAmendment);
      expect(contractApi.listAmendments).toBe(listAmendments);
      expect(contractApi.deleteContract).toBe(deleteContract);
      expect(contractApi.listPendingSignatures).toBe(listPendingSignatures);
      expect(contractApi.executeSignature).toBe(executeSignature);
    });
  });
});
