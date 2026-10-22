import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PlaybookDetailPage from '../../src/app/knowledge/playbooks/[id]/page';
import { apiClient } from '../../src/services/apiClient';
import {
  getKnowledgeArticleDetail,
  getPlaybookProgress,
  togglePlaybookStepProgress,
} from '../../src/services/knowledge';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'kb-playbook-001' }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock apiClient
vi.mock('../../src/services/apiClient', async () => {
  const actual = await vi.importActual('../../src/services/apiClient');
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      getMe: vi.fn(),
    },
  };
});

// Mock knowledge service API
vi.mock('../../src/services/knowledge', async () => {
  const actual = await vi.importActual('../../src/services/knowledge');
  return {
    ...actual,
    getKnowledgeArticleDetail: vi.fn(),
    getPlaybookProgress: vi.fn(),
    togglePlaybookStepProgress: vi.fn(),
  };
});

describe('PlaybookDetailPage Component [FR-3, FR-4, FR-6, FR-8, FR-9]', () => {
  const mockUser = {
    user_id: 'usr_playbook_123',
    email: 'playbook.user@tenant.org',
    tenant_id: 'tnt_playbook_999',
    roles: ['ClientViewer', 'SecurityAdmin'],
  };

  const mockArticleDetail = {
    id: 'kb-playbook-001',
    title: 'Client Onboarding & Tenant Setup Playbook',
    content_type: 'Playbook',
    body: 'Step-by-step operational guide for provisioning new client organization tenants.',
    tenant_id: 'tnt_playbook_999',
    category: { id: 'cat-onboarding', name: 'Onboarding & Operations' },
    tags: [{ id: 'tag-1', name: 'Onboarding' }],
    is_published: true,
    created_at: '2026-10-06T08:00:00Z',
    updated_at: '2026-10-06T08:00:00Z',
    attachments: [
      {
        id: 'att-1',
        article_id: 'kb-playbook-001',
        file_name: 'onboarding_guide.pdf',
        file_url: '/files/onboarding_guide.pdf',
        file_size_bytes: 1024000,
        created_at: '2026-10-06T08:00:00Z',
      },
    ],
    playbook_steps: [
      {
        id: 'step-1',
        article_id: 'kb-playbook-001',
        step_number: 1,
        title: 'Initialize Tenant Record',
        content: 'Execute POST /api/v1/auth/register with client details.',
        checkpoint_instructions: 'Confirm tenant UUID is generated.',
      },
      {
        id: 'step-2',
        article_id: 'kb-playbook-001',
        step_number: 2,
        title: 'Configure RBAC Roles',
        content: 'Assign default ClientViewer role.',
        checkpoint_instructions: 'Run auth test script.',
      },
    ],
  };

  const mockPlaybookProgress = {
    article_id: 'kb-playbook-001',
    user_id: 'usr_playbook_123',
    tenant_id: 'tnt_playbook_999',
    total_steps: 2,
    completed_steps: 1,
    progress_percentage: 50,
    completed_step_ids: ['step-1'],
    step_progress: [
      { step_id: 'step-1', step_number: 1, title: 'Initialize Tenant Record', is_completed: true },
      { step_id: 'step-2', step_number: 2, title: 'Configure RBAC Roles', is_completed: false },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders playbook title, user session context, steps list, and progress bar', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce(mockUser);
    (getKnowledgeArticleDetail as any).mockResolvedValueOnce(mockArticleDetail);
    (getPlaybookProgress as any).mockResolvedValueOnce(mockPlaybookProgress);

    render(<PlaybookDetailPage />);

    // Verify user session context loads
    await waitFor(() => {
      expect(screen.getByText('playbook.user@tenant.org')).toBeInTheDocument();
    });

    expect(screen.getByText('tnt_playbook_999')).toBeInTheDocument();

    // Verify article title renders
    expect(
      screen.getByRole('heading', { level: 1, name: /client onboarding & tenant setup playbook/i })
    ).toBeInTheDocument();

    // Verify active step card renders
    expect(screen.getByText('Initialize Tenant Record')).toBeInTheDocument();

    // Verify progress percentage renders
    expect(screen.getByText('50%')).toBeInTheDocument();

    // Verify attachment renders
    expect(screen.getByText('onboarding_guide.pdf')).toBeInTheDocument();
  });

  it('allows user to toggle step completion state and calls togglePlaybookStepProgress API', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce(mockUser);
    (getKnowledgeArticleDetail as any).mockResolvedValueOnce(mockArticleDetail);
    (getPlaybookProgress as any).mockResolvedValueOnce(mockPlaybookProgress);
    (togglePlaybookStepProgress as any).mockResolvedValueOnce({
      step_id: 'step-1',
      article_id: 'kb-playbook-001',
      user_id: 'usr_playbook_123',
      tenant_id: 'tnt_playbook_999',
      is_completed: false,
      overall_playbook_progress_percentage: 0,
      total_steps: 2,
      completed_steps: 0,
    });

    render(<PlaybookDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('playbook.user@tenant.org')).toBeInTheDocument();
    });

    // Find step 1 toggle button
    const toggleBtn = screen.getByTestId('toggle-step-btn-1');
    expect(toggleBtn).toBeInTheDocument();

    // Toggle step 1 from completed to incomplete
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(togglePlaybookStepProgress).toHaveBeenCalledWith(
        'kb-playbook-001',
        'step-1',
        { is_completed: false },
        'usr_playbook_123',
        'tnt_playbook_999'
      );
    });
  });

  it('renders fallback dataset if API fails gracefully', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce(mockUser);
    (getKnowledgeArticleDetail as any).mockRejectedValueOnce(new Error('Network error'));
    (getPlaybookProgress as any).mockRejectedValueOnce(new Error('Network error'));

    render(<PlaybookDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('playbook.user@tenant.org')).toBeInTheDocument();
    });

    // Verify fallback title renders
    expect(
      screen.getByRole('heading', { level: 1, name: /client onboarding & tenant setup playbook/i })
    ).toBeInTheDocument();
  });
});
