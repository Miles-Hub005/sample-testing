import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PerformancePage from '../../src/app/performance/page';
import { apiClient } from '../../src/services/apiClient';

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

describe('PerformancePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header, status labels, loading indicator, and populates user session context', async () => {
    const mockUser = {
      user_id: 'usr_perf_123',
      email: 'perf.user@tenant.org',
      tenant_id: 'tnt_perf_999',
      roles: ['ClientViewer', 'SecurityAdmin'],
    };

    (apiClient.getMe as any).mockResolvedValueOnce(mockUser);

    render(<PerformancePage />);

    // Verify main header title
    expect(
      screen.getByRole('heading', { level: 1, name: /performance & latency monitoring/i })
    ).toBeInTheDocument();

    // Verify status badges in header
    expect(screen.getByText(/target sla met \(<20ms\)/i)).toBeInTheDocument();
    expect(screen.getByText(/real-time monitoring/i)).toBeInTheDocument();

    // Verify initial loading message
    expect(
      screen.getByText(/fetching active identity and tenant performance context/i)
    ).toBeInTheDocument();

    // Wait for user details to load
    await waitFor(() => {
      expect(screen.getByText('perf.user@tenant.org')).toBeInTheDocument();
    });

    expect(screen.getByText('tnt_perf_999')).toBeInTheDocument();
  });

  it('renders SLA benchmark cards and performance metrics', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce({
      user_id: 'usr_abc',
      email: 'test@example.com',
      tenant_id: 'tnt_abc',
      roles: ['ClientViewer'],
    });

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    // Verify SLA benchmarks section
    expect(
      screen.getByRole('heading', { level: 2, name: /core sla benchmarks & real-time metrics/i })
    ).toBeInTheDocument();

    expect(screen.getByText(/rbac latency/i)).toBeInTheDocument();
    expect(screen.getByText('2.4 ms')).toBeInTheDocument();

    expect(screen.getByText(/audit writer latency/i)).toBeInTheDocument();
    expect(screen.getByText('0.8 ms')).toBeInTheDocument();

    expect(screen.getByText(/p99 api response/i)).toBeInTheDocument();
    expect(screen.getByText('14.2 ms')).toBeInTheDocument();

    expect(screen.getByText(/system availability/i)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders non-functional SLA compliance table and architecture sections', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce({
      user_id: 'usr_abc',
      email: 'test@example.com',
      tenant_id: 'tnt_abc',
      roles: ['ClientViewer'],
    });

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    // Check SLA compliance table heading
    expect(
      screen.getByRole('heading', { level: 2, name: /non-functional sla compliance verification/i })
    ).toBeInTheDocument();

    // Verify rows in table
    expect(screen.getByText(/nfr-1: server-side rbac latency/i)).toBeInTheDocument();
    expect(screen.getByText(/nfr-2 \/ fr-10: audit log writer/i)).toBeInTheDocument();
    expect(screen.getByText(/nfr-3: wcag 2.1 aa contrast/i)).toBeInTheDocument();
    expect(screen.getByText(/nfr-4: responsive layout navigation/i)).toBeInTheDocument();
    expect(screen.getByText(/nfr-5: strict server boundaries/i)).toBeInTheDocument();

    // Check architecture section headings
    expect(
      screen.getByRole('heading', { level: 2, name: /backend engine performance/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /client ui performance & accessibility/i })
    ).toBeInTheDocument();
  });

  it('renders an accessible error alert when apiClient.getMe fails', async () => {
    (apiClient.getMe as any).mockRejectedValueOnce(
      new Error('Failed to retrieve session context')
    );

    render(<PerformancePage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/session context alert/i)).toBeInTheDocument();
    expect(screen.getByText('Failed to retrieve session context')).toBeInTheDocument();
  });
});
