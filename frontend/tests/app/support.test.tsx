import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SupportPage from '../../src/app/support/page';
import { apiClient } from '../../src/services/apiClient';
import { supportService } from '../../src/services/support';

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
      listTickets: vi.fn(),
      createTicket: vi.fn(),
    },
  };
});

// Mock supportService
vi.mock('../../src/services/support', async () => {
  const actual = await vi.importActual('../../src/services/support');
  return {
    ...actual,
    supportService: {
      ...actual.supportService,
      listTickets: vi.fn(),
      createTicket: vi.fn(),
    },
  };
});

describe('SupportPage Component', () => {
  const mockTickets = [
    {
      id: 'TKT-102938',
      priority: 'P1',
      status: 'open',
      subject: 'Production API Gateway 502 Bad Gateway Outage',
      description: 'Intermittent 502 Bad Gateway responses detected on primary API gateway endpoint.',
      client_id: 'tnt_supp_888',
      assigned_tier: 'Tier 3 - Escalations',
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
    {
      id: 'TKT-102939',
      priority: 'P2',
      status: 'pending',
      subject: 'RBAC Policy Sync Delay for New User Roles',
      description: 'Role permission updates take up to 2 minutes to propagate across cached sessions.',
      client_id: 'tnt_supp_888',
      assigned_tier: 'Tier 2 - Technical',
      created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    },
    {
      id: 'TKT-102940',
      priority: 'P3',
      status: 'resolved',
      subject: 'Request for Custom Audit Log Export Format',
      description: 'Inquiry regarding CSV export options for tenant audit stream records.',
      client_id: 'tnt_supp_888',
      assigned_tier: 'Tier 1 - General',
      created_at: new Date(Date.now() - 1440 * 60 * 1000).toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (supportService.listTickets as any).mockResolvedValue({
      items: mockTickets,
      total_count: 3,
      limit: 50,
      offset: 0,
    });
  });

  it('renders page header, status labels, loading indicator, and populates user session context', async () => {
    const mockUser = {
      user_id: 'usr_supp_123',
      email: 'support.user@tenant.org',
      tenant_id: 'tnt_supp_888',
      roles: ['ClientViewer', 'SecurityAdmin'],
    };

    (apiClient.getMe as any).mockResolvedValueOnce(mockUser);

    render(<SupportPage />);

    // Verify main header title
    expect(
      screen.getByRole('heading', { level: 1, name: /support & technical assistance/i })
    ).toBeInTheDocument();

    // Verify status badges in header
    expect(screen.getByText(/support active \(24\/7\)/i)).toBeInTheDocument();
    expect(screen.getByText(/sla < 15m response/i)).toBeInTheDocument();

    // Verify initial loading message
    expect(
      screen.getByText(/fetching active identity and tenant support context/i)
    ).toBeInTheDocument();

    // Wait for user details to load
    await waitFor(() => {
      expect(screen.getByText('support.user@tenant.org')).toBeInTheDocument();
    });

    expect(screen.getByText('tnt_supp_888')).toBeInTheDocument();
    expect(screen.getByText('ClientViewer')).toBeInTheDocument();
    expect(screen.getByText('SecurityAdmin')).toBeInTheDocument();
  });

  it('renders support channels and SLA target benchmarks', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce({
      user_id: 'usr_abc',
      email: 'test@example.com',
      tenant_id: 'tnt_abc',
      roles: ['ClientViewer'],
    });

    render(<SupportPage />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    // Verify support channels section
    expect(
      screen.getByRole('heading', { level: 2, name: /support channels & sla response targets/i })
    ).toBeInTheDocument();

    expect(screen.getByText('Critical Outages')).toBeInTheDocument();
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText('Standard Tickets')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
  });

  it('renders support ticket directory and filters tickets by priority, status, and search query', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce({
      user_id: 'usr_abc',
      email: 'test@example.com',
      tenant_id: 'tnt_abc',
      roles: ['ClientViewer'],
    });

    render(<SupportPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /tenant support tickets/i })).toBeInTheDocument();
    });

    // Verify tickets are rendered
    expect(screen.getByText('Production API Gateway 502 Bad Gateway Outage')).toBeInTheDocument();
    expect(screen.getByText('RBAC Policy Sync Delay for New User Roles')).toBeInTheDocument();
    expect(screen.getByText('Request for Custom Audit Log Export Format')).toBeInTheDocument();

    // Filter by Priority P1
    const prioritySelect = screen.getByLabelText(/priority filter/i);
    fireEvent.change(prioritySelect, { target: { value: 'P1' } });

    expect(screen.getByText('Production API Gateway 502 Bad Gateway Outage')).toBeInTheDocument();
    expect(screen.queryByText('RBAC Policy Sync Delay for New User Roles')).not.toBeInTheDocument();

    // Filter reset
    fireEvent.change(prioritySelect, { target: { value: 'all' } });

    // Filter by Search Query
    const searchInput = screen.getByLabelText(/search tickets/i);
    fireEvent.change(searchInput, { target: { value: 'Audit Log' } });

    expect(screen.getByText('Request for Custom Audit Log Export Format')).toBeInTheDocument();
    expect(screen.queryByText('Production API Gateway 502 Bad Gateway Outage')).not.toBeInTheDocument();
  });

  it('submits a technical support ticket and displays confirmation reference', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce({
      user_id: 'usr_abc',
      email: 'test@example.com',
      tenant_id: 'tnt_abc',
      roles: ['ClientViewer'],
    });

    (supportService.createTicket as any).mockResolvedValueOnce({
      id: 'TKT-999111',
      priority: 'P2',
      status: 'open',
      subject: 'RBAC Policy Evaluation Inquiry',
      description: 'Detailed explanation of RBAC check behavior in tenant realm.',
      client_id: 'tnt_abc',
    });

    render(<SupportPage />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { level: 2, name: /submit technical support ticket/i })
    ).toBeInTheDocument();

    // Fill out form
    const subjectInput = screen.getByLabelText(/ticket subject/i);
    const messageInput = screen.getByLabelText(/detailed message & steps to reproduce/i);
    const submitButton = screen.getByRole('button', { name: /submit ticket/i });

    fireEvent.change(subjectInput, { target: { value: 'RBAC Policy Evaluation Inquiry' } });
    fireEvent.change(messageInput, { target: { value: 'Detailed explanation of RBAC check behavior in tenant realm.' } });

    fireEvent.click(submitButton);

    // Verify submission success state
    await waitFor(() => {
      expect(screen.getByText(/support ticket submitted successfully/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/ticket reference id/i)).toBeInTheDocument();
    expect(screen.getByText('TKT-999111')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit another support request/i })).toBeInTheDocument();

    // Reset form
    fireEvent.click(screen.getByRole('button', { name: /submit another support request/i }));

    expect(screen.getByRole('button', { name: /submit ticket/i })).toBeInTheDocument();
  });

  it('displays form error when message is too short', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce({
      user_id: 'usr_abc',
      email: 'test@example.com',
      tenant_id: 'tnt_abc',
      roles: ['ClientViewer'],
    });

    render(<SupportPage />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    const subjectInput = screen.getByLabelText(/ticket subject/i);
    const messageInput = screen.getByLabelText(/detailed message & steps to reproduce/i);
    const submitButton = screen.getByRole('button', { name: /submit ticket/i });

    fireEvent.change(subjectInput, { target: { value: 'Short' } });
    fireEvent.change(messageInput, { target: { value: 'Short' } });

    fireEvent.click(submitButton);

    expect(screen.getByText(/please provide a detailed message/i)).toBeInTheDocument();
  });

  it('renders an accessible error alert when apiClient.getMe fails', async () => {
    (apiClient.getMe as any).mockRejectedValueOnce(new Error('Unauthorized session token expired'));

    render(<SupportPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText(/unauthorized session token expired/i)).toBeInTheDocument();
  });

  it('renders FAQ & support knowledge section with contracts link', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce({
      user_id: 'usr_abc',
      email: 'test@example.com',
      tenant_id: 'tnt_abc',
      roles: ['ClientViewer'],
    });

    render(<SupportPage />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { level: 2, name: /frequently asked questions & support knowledge/i })
    ).toBeInTheDocument();

    expect(screen.getByText(/why am i receiving an http 403 forbidden error\?/i)).toBeInTheDocument();
    expect(screen.getByText(/how is sub-20ms rbac policy evaluation guaranteed\?/i)).toBeInTheDocument();

    const contractsLink = screen.getByRole('link', { name: /contracts/i });
    expect(contractsLink).toHaveAttribute('href', '/contracts');
  });
});
