import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildArticlesQueryParams,
  deleteKnowledgeArticle,
  getKnowledgeArticleDetail,
  getPlaybookProgress,
  knowledgeApi,
  listKnowledgeArticles,
  sanitizeContentType,
  togglePlaybookStepProgress,
} from '../../src/services/knowledge';
import { apiFetch } from '../../src/services/apiClient';

vi.mock('../../src/services/apiClient', async () => {
  const actual = await vi.importActual('../../src/services/apiClient');
  return {
    ...actual,
    apiFetch: vi.fn(),
  };
});

describe('Knowledge Repository API Client Service [FR-1 - FR-9, NFR-1 - NFR-3]', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('sanitizeContentType Helper', () => {
    it('returns undefined for missing or invalid string inputs', () => {
      expect(sanitizeContentType()).toBeUndefined();
      expect(sanitizeContentType(null)).toBeUndefined();
      expect(sanitizeContentType('')).toBeUndefined();
      expect(sanitizeContentType('   ')).toBeUndefined();
    });

    it('matches content type case-insensitively', () => {
      expect(sanitizeContentType('faq')).toBe('FAQ');
      expect(sanitizeContentType('PLAYBOOK')).toBe('Playbook');
      expect(sanitizeContentType('BestPractice')).toBe('BestPractice');
      expect(sanitizeContentType('trainingvideo')).toBe('TrainingVideo');
    });

    it('returns trimmed raw string if not in predefined list', () => {
      expect(sanitizeContentType(' CustomType ')).toBe('CustomType');
    });
  });

  describe('buildArticlesQueryParams Helper', () => {
    it('returns empty string when no query parameters provided', () => {
      expect(buildArticlesQueryParams()).toBe('');
      expect(buildArticlesQueryParams({})).toBe('');
    });

    it('constructs encoded query string with valid parameters', () => {
      const queryStr = buildArticlesQueryParams({
        query: 'onboarding guide',
        category_id: 'cat-123',
        tag_ids: ['tag-1', 'tag-2'],
        content_type: 'playbook',
        tenant_id: 'tenant-99',
        is_published: true,
        page: 2,
        limit: 10,
      });

      expect(queryStr).toContain('query=onboarding%20guide');
      expect(queryStr).toContain('category_id=cat-123');
      expect(queryStr).toContain('tag_ids=tag-1');
      expect(queryStr).toContain('tag_ids=tag-2');
      expect(queryStr).toContain('content_type=Playbook');
      expect(queryStr).toContain('tenant_id=tenant-99');
      expect(queryStr).toContain('is_published=true');
      expect(queryStr).toContain('page=2');
      expect(queryStr).toContain('limit=10');
    });

    it('handles comma-separated string for tag_ids', () => {
      const queryStr = buildArticlesQueryParams({
        tag_ids: 'tag-a, tag-b, tag-c',
      });
      expect(queryStr).toContain('tag_ids=tag-a');
      expect(queryStr).toContain('tag_ids=tag-b');
      expect(queryStr).toContain('tag_ids=tag-c');
    });
  });

  describe('listKnowledgeArticles', () => {
    it('fetches paginated knowledge articles list from endpoint', async () => {
      const mockResponse = {
        items: [
          {
            id: 'art-1',
            title: 'Welcome Playbook',
            content_type: 'Playbook',
            body: 'Instructions',
            tenant_id: 'tenant-1',
            category_id: 'cat-1',
            tags: [{ id: 't1', name: 'Onboarding' }],
            video_url: null,
            is_published: true,
            created_at: '2026-10-06T08:00:00Z',
            updated_at: '2026-10-06T08:00:00Z',
          },
        ],
        total_count: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      };

      (apiFetch as any).mockResolvedValueOnce(mockResponse);

      const result = await listKnowledgeArticles({ query: 'Welcome', page: 1 });

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith('/api/v1/knowledge/articles?query=Welcome&page=1');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getKnowledgeArticleDetail', () => {
    it('throws error if article ID is missing or empty', async () => {
      await expect(getKnowledgeArticleDetail('')).rejects.toThrow('Article ID is required.');
      await expect(getKnowledgeArticleDetail('   ')).rejects.toThrow('Article ID is required.');
    });

    it('fetches article detail with optional tenant_id query parameter', async () => {
      const mockDetail = {
        id: 'art-100',
        title: 'Video Guide',
        content_type: 'TrainingVideo',
        tags: [],
        video_url: 'https://cdn.example.com/stream/v123',
        is_published: true,
        created_at: '2026-10-06T08:00:00Z',
        updated_at: '2026-10-06T08:00:00Z',
        attachments: [],
        playbook_steps: [],
      };

      (apiFetch as any).mockResolvedValueOnce(mockDetail);

      const result = await getKnowledgeArticleDetail('art-100', 'tenant-abc');

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/knowledge/articles/art-100?tenant_id=tenant-abc'
      );
      expect(result).toEqual(mockDetail);
    });
  });

  describe('togglePlaybookStepProgress', () => {
    it('throws error if article ID or step ID is missing', async () => {
      await expect(togglePlaybookStepProgress('', 'step-1')).rejects.toThrow(
        'Playbook article ID is required.'
      );
      await expect(togglePlaybookStepProgress('art-1', '')).rejects.toThrow(
        'Playbook step ID is required.'
      );
    });

    it('posts step completion toggle request to API', async () => {
      const mockToggleResponse = {
        step_id: 'step-1',
        article_id: 'art-1',
        user_id: 'usr-1',
        tenant_id: 'tenant-1',
        is_completed: true,
        completed_at: '2026-10-06T08:00:00Z',
        overall_playbook_progress_percentage: 50,
        total_steps: 2,
        completed_steps: 1,
      };

      (apiFetch as any).mockResolvedValueOnce(mockToggleResponse);

      const result = await togglePlaybookStepProgress(
        'art-1',
        'step-1',
        { is_completed: true },
        'usr-1',
        'tenant-1'
      );

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/knowledge/playbooks/art-1/steps/step-1/progress?user_id=usr-1&tenant_id=tenant-1',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            is_completed: true,
            user_id: 'usr-1',
            tenant_id: 'tenant-1',
          }),
        })
      );
      expect(result).toEqual(mockToggleResponse);
    });
  });

  describe('getPlaybookProgress', () => {
    it('throws error if article ID is missing', async () => {
      await expect(getPlaybookProgress('')).rejects.toThrow('Playbook article ID is required.');
    });

    it('fetches playbook progress summary for user and tenant', async () => {
      const mockProgress = {
        article_id: 'art-1',
        user_id: 'usr-1',
        tenant_id: 'tenant-1',
        total_steps: 4,
        completed_steps: 2,
        progress_percentage: 50.0,
        completed_step_ids: ['step-1', 'step-2'],
        step_progress: [
          {
            step_id: 'step-1',
            step_number: 1,
            title: 'Step 1',
            is_completed: true,
            completed_at: '2026-10-06T08:00:00Z',
          },
        ],
      };

      (apiFetch as any).mockResolvedValueOnce(mockProgress);

      const result = await getPlaybookProgress('art-1', 'usr-1', 'tenant-1');

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/knowledge/playbooks/art-1/progress?user_id=usr-1&tenant_id=tenant-1'
      );
      expect(result).toEqual(mockProgress);
    });
  });

  describe('deleteKnowledgeArticle', () => {
    it('throws error if article ID is missing', async () => {
      await expect(deleteKnowledgeArticle('')).rejects.toThrow('Article ID is required.');
    });

    it('issues DELETE request to API', async () => {
      (apiFetch as any).mockResolvedValueOnce(undefined);

      await deleteKnowledgeArticle('art-delete', 'tenant-1');

      expect(apiFetch).toHaveBeenCalledTimes(1);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/v1/knowledge/articles/art-delete?tenant_id=tenant-1',
        { method: 'DELETE' }
      );
    });
  });

  describe('Default knowledgeApi Object Export', () => {
    it('exposes all expected API service methods', () => {
      expect(typeof knowledgeApi.listArticles).toBe('function');
      expect(typeof knowledgeApi.getArticleDetail).toBe('function');
      expect(typeof knowledgeApi.toggleStepProgress).toBe('function');
      expect(typeof knowledgeApi.getPlaybookProgress).toBe('function');
      expect(typeof knowledgeApi.deleteArticle).toBe('function');
      expect(typeof knowledgeApi.sanitizeContentType).toBe('function');
      expect(typeof knowledgeApi.buildArticlesQueryParams).toBe('function');
    });
  });
});
