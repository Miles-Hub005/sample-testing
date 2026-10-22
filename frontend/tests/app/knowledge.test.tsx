import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import KnowledgePage from '../../src/app/knowledge/page';
import { apiClient } from '../../src/services/apiClient';

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

describe('KnowledgePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header, status labels, loading indicator, and populates user session context', async () => {
    const mockUser = {
      user_id: 'usr_kb_123',
      email: 'knowledge.user@tenant.org',
      tenant_id: 'tnt_kb_999',
      roles: ['ClientViewer', 'SecurityAdmin'],
    };

    (apiClient.getMe as any).mockResolvedValueOnce(mockUser);

    render(<KnowledgePage />);

    // Verify main page title
    expect(
      screen.getByRole('heading', { level: 1, name: /knowledge base & documentation/i })
    ).toBeInTheDocument();

    // Verify status badges in header
    expect(screen.getByText(/knowledge sync/i)).toBeInTheDocument();
    expect(screen.getByText(/v1\.0 documentation/i)).toBeInTheDocument();

    // Verify loading state
    expect(
      screen.getByText(/fetching active identity and tenant knowledge context/i)
    ).toBeInTheDocument();

    // Wait for user details to load
    await waitFor(() => {
      expect(screen.getByText('knowledge.user@tenant.org')).toBeInTheDocument();
    });

    expect(screen.getByText('tnt_kb_999')).toBeInTheDocument();
    expect(screen.getByText('ClientViewer')).toBeInTheDocument();
    expect(screen.getByText('SecurityAdmin')).toBeInTheDocument();
  });

  it('renders knowledge directory articles and allows filtering by category and search query', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce({
      user_id: 'usr_abc',
      email: 'test@example.com',
      tenant_id: 'tnt_abc',
      roles: ['ClientViewer'],
    });

    render(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    // Verify directory heading
    expect(
      screen.getByRole('heading', { level: 2, name: /knowledge base directory/i })
    ).toBeInTheDocument();

    // Verify initial article titles are present
    expect(
      screen.getByRole('heading', { level: 3, name: /sub-20ms rbac policy evaluation architecture/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /multi-tenant data isolation & query boundary rules/i })
    ).toBeInTheDocument();

    // Test search filter
    const searchInput = screen.getByPlaceholderText(/search articles by title, topic, code, or keyword/i);
    fireEvent.change(searchInput, { target: { value: 'sub-20ms' } });

    // Expect RBAC article to remain and Multi-Tenant article to be filtered out
    expect(
      screen.getByRole('heading', { level: 3, name: /sub-20ms rbac policy evaluation architecture/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 3, name: /multi-tenant data isolation & query boundary rules/i })
    ).not.toBeInTheDocument();

    // Clear search filter
    fireEvent.change(searchInput, { target: { value: '' } });

    // Filter by Category button
    const categoryTab = screen.getByRole('tab', { name: /multi-tenancy/i });
    fireEvent.click(categoryTab);

    expect(
      screen.getByRole('heading', { level: 3, name: /multi-tenant data isolation & query boundary rules/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 3, name: /structured non-blocking json audit logging/i })
    ).not.toBeInTheDocument();
  });

  it('expands article technical details and handles feedback interactions', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce({
      user_id: 'usr_abc',
      email: 'test@example.com',
      tenant_id: 'tnt_abc',
      roles: ['ClientViewer'],
    });

    render(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    // Find first "Read Full Article" button
    const readFullButtons = screen.getAllByRole('button', { name: /read full article/i });
    expect(readFullButtons.length).toBeGreaterThan(0);

    fireEvent.click(readFullButtons[0]);

    // Verify expanded technical overview section heading appears
    await waitFor(() => {
      expect(screen.getByText(/technical overview/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/key rules & specifications/i)).toBeInTheDocument();

    // Test feedback button interaction
    const helpfulButtons = screen.getAllByLabelText(/mark article as helpful/i);
    fireEvent.click(helpfulButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText(/thank you for your feedback! this article was marked as helpful\./i)
      ).toBeInTheDocument();
    });
  });

  it('renders cross-link section to other domain documentation pages', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce({
      user_id: 'usr_abc',
      email: 'test@example.com',
      tenant_id: 'tnt_abc',
      roles: ['ClientViewer'],
    });

    render(<KnowledgePage />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { level: 2, name: /platform domain documentation & cross-links/i })
    ).toBeInTheDocument();

    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();
    expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
    expect(screen.getByText('API Contracts')).toBeInTheDocument();
    expect(screen.getByText('Support & SLA')).toBeInTheDocument();
  });
});
