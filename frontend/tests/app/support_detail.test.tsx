import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SupportTicketDetailPage from '../../src/app/support/[id]/page';
import { apiClient } from '../../src/services/apiClient';
import { supportService } from '../../src/services/support';

// Mock Next.js navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'TKT-102938' }),
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

// Mock supportService
vi.mock('../../src/services/support', async () => {
  const actual = await vi.importActual('../../src/services/support');
  return {
    ...actual,
    supportService: {
      ...actual.supportService,
      getTicket: vi.fn(),
      getMessages: vi.fn(),
      getCSAT: vi.fn(),
      updateTicket: vi.fn(),
      createMessage: vi.fn(),
      uploadAttachment: vi.fn(),
      downloadAttachment: vi.fn(),
      submitCSAT: vi.fn(),
    },
  };
});

describe('SupportTicketDetailPage Component', () => {
  const mockUser = {
    user_id: 'usr_supp_123',
    email: 'support.user@tenant.org',
    tenant_id: 'tnt_supp_888',
    roles: ['ClientViewer', 'SupportAgent'],
  };

  const mockTicket = {
    id: 'TKT-102938',
    priority: 'P1',
    status: 'open',
    subject: 'Production API Gateway 502 Bad Gateway Outage',
    description: 'Intermittent 502 Bad Gateway responses detected on primary API gateway endpoint.',
    client_id: 'tnt_supp_888',
    assigned_tier: 'Tier 3 - Escalations',
    assigned_agent_id: 'agent_sys_99',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    sla_trackings: [
      {
        id: 'sla-1',
        ticket_id: 'TKT-102938',
        target_type: 'first_response',
        target_due_at: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
        is_breached: false,
      },
      {
        id: 'sla-2',
        ticket_id: 'TKT-102938',
        target_type: 'resolution',
        target_due_at: new Date(Date.now() + 215 * 60 * 1000).toISOString(),
        is_breached: false,
      },
    ],
  };

  const mockMessages = [
    {
      id: 'msg-1',
      ticket_id: 'TKT-102938',
      sender_id: 'tnt_supp_888',
      sender_type: 'client',
      message_body: 'Issue created: Production API Gateway returning intermittent 502 errors.',
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
    {
      id: 'msg-2',
      ticket_id: 'TKT-102938',
      sender_id: 'agent_sys_99',
      sender_type: 'agent',
      message_body: 'Investigation in progress by Tier 3 operations engineering.',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.getMe as any).mockResolvedValue(mockUser);
    (supportService.getTicket as any).mockResolvedValue(mockTicket);
    (supportService.getMessages as any).mockResolvedValue(mockMessages);
    (supportService.getCSAT as any).mockRejectedValue(new Error('CSAT not found'));
  });

  it('renders ticket details, status, priority, and SLA countdown timers', async () => {
    render(<SupportTicketDetailPage />);

    // Wait for ticket title
    await waitFor(() => {
      expect(screen.getByText('Production API Gateway 502 Bad Gateway Outage')).toBeInTheDocument();
    });

    // Verify ticket ID and metadata
    expect(screen.getByText('TKT-102938')).toBeInTheDocument();
    expect(screen.getByText('P1')).toBeInTheDocument();

    // Verify description
    expect(
      screen.getByText('Intermittent 502 Bad Gateway responses detected on primary API gateway endpoint.')
    ).toBeInTheDocument();

    // Verify SLA Timers header
    expect(screen.getByText('SLA Compliance Timers')).toBeInTheDocument();
  });

  it('renders thread messages and supports sending reply message', async () => {
    render(<SupportTicketDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Issue created: Production API Gateway returning intermittent 502 errors.')).toBeInTheDocument();
    });

    // Verify second message
    expect(
      screen.getByText('Investigation in progress by Tier 3 operations engineering.')
    ).toBeInTheDocument();
  });

  it('allows marking ticket as resolved and prompts CSAT modal', async () => {
    const resolvedTicket = {
      ...mockTicket,
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    };

    (supportService.updateTicket as any).mockResolvedValueOnce(resolvedTicket);

    render(<SupportTicketDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Mark as Resolved')).toBeInTheDocument();
    });

    const resolveBtn = screen.getByText('Mark as Resolved');
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(supportService.updateTicket).toHaveBeenCalledWith('TKT-102938', {
        status: 'resolved',
      });
    });
  });

  it('renders CSAT rating score badge when rating exists', async () => {
    const resolvedTicket = {
      ...mockTicket,
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    };

    const mockCSAT = {
      id: 'csat-1',
      ticket_id: 'TKT-102938',
      score: 5,
      feedback_text: 'Excellent rapid response from Tier 3 team!',
      submitted_at: new Date().toISOString(),
    };

    (supportService.getTicket as any).mockResolvedValueOnce(resolvedTicket);
    (supportService.getCSAT as any).mockResolvedValueOnce(mockCSAT);

    render(<SupportTicketDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('CSAT Score: 5/5')).toBeInTheDocument();
    });

    expect(screen.getByText('"Excellent rapid response from Tier 3 team!"')).toBeInTheDocument();
  });
});
