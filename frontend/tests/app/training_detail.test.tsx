import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrainingDetailPage from '../../src/app/knowledge/training/[id]/page';
import { apiClient } from '../../src/services/apiClient';
import { getKnowledgeArticleDetail } from '../../src/services/knowledge';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'kb-training-001' }),
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
  };
});

describe('TrainingDetailPage Component [FR-5, FR-6, FR-8, FR-9]', () => {
  const mockUser = {
    user_id: 'usr_training_123',
    email: 'training.user@tenant.org',
    tenant_id: 'tnt_training_999',
    roles: ['ClientViewer', 'SecurityAdmin'],
  };

  const mockArticleDetail = {
    id: 'kb-training-001',
    title: 'Platform Architecture & RBAC Evaluation Deep Dive',
    content_type: 'TrainingVideo',
    body: 'Comprehensive video walkthrough detailing server-side role-based access control (RBAC) policy evaluation.',
    tenant_id: 'tnt_training_999',
    category: { id: 'cat-architecture', name: 'Architecture & Security' },
    tags: [{ id: 'tag-1', name: 'Architecture' }],
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    is_published: true,
    created_at: '2026-10-06T08:00:00Z',
    updated_at: '2026-10-06T08:00:00Z',
    attachments: [
      {
        id: 'att-tr-101',
        article_id: 'kb-training-001',
        file_name: 'rbac_architecture_specification_v1.pdf',
        file_url: '/files/rbac_architecture_specification_v1.pdf',
        file_size_bytes: 1887436,
        created_at: '2026-10-06T08:00:00Z',
      },
    ],
    playbook_steps: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders training video title, user session context, embedded media player, and technical attachments', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce(mockUser);
    (getKnowledgeArticleDetail as any).mockResolvedValueOnce(mockArticleDetail);

    render(<TrainingDetailPage />);

    // Verify user session context loads
    await waitFor(() => {
      expect(screen.getByText('training.user@tenant.org')).toBeInTheDocument();
    });

    expect(screen.getByText('tnt_training_999')).toBeInTheDocument();

    // Verify article title renders
    expect(
      screen.getByRole('heading', { level: 1, name: /platform architecture & rbac evaluation deep dive/i })
    ).toBeInTheDocument();

    // Verify category renders
    expect(screen.getByText('Architecture & Security')).toBeInTheDocument();

    // Verify media player container renders
    expect(screen.getByTestId('media-player-container')).toBeInTheDocument();

    // Verify technical attachment renders in both list and sidebar
    const attachments = screen.getAllByText('rbac_architecture_specification_v1.pdf');
    expect(attachments.length).toBeGreaterThan(0);
  });

  it('allows user to submit helpful feedback', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce(mockUser);
    (getKnowledgeArticleDetail as any).mockResolvedValueOnce(mockArticleDetail);

    render(<TrainingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('training.user@tenant.org')).toBeInTheDocument();
    });

    // Find "Yes" feedback button
    const yesButton = screen.getByRole('button', { name: /yes/i });
    expect(yesButton).toBeInTheDocument();

    fireEvent.click(yesButton);

    // Confirmation message should render
    expect(screen.getByText(/thank you for your feedback!/i)).toBeInTheDocument();
  });

  it('renders fallback baseline dataset if API fails gracefully', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce(mockUser);
    (getKnowledgeArticleDetail as any).mockRejectedValueOnce(new Error('Network error'));

    render(<TrainingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('training.user@tenant.org')).toBeInTheDocument();
    });

    // Verify fallback title renders
    expect(
      screen.getByRole('heading', { level: 1, name: /platform architecture & rbac evaluation deep dive/i })
    ).toBeInTheDocument();

    // Verify attachments from fallback render
    expect(screen.getByText('rbac_architecture_specification_v1.pdf')).toBeInTheDocument();
  });
});
