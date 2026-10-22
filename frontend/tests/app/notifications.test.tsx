import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import NotificationsPage from '../../src/app/notifications/page';
import { apiClient } from '../../src/services/apiClient';
import * as alertingService from '../../src/services/alerting';
import {
  InAppNotification,
  TriggerRule,
  NotificationPreference,
} from '../../src/services/alerting';

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock apiClient and alertingService
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

vi.mock('../../src/services/alerting', async () => {
  const actual = await vi.importActual('../../src/services/alerting');
  return {
    ...actual,
    getInAppNotifications: vi.fn(),
    getTriggerRules: vi.fn(),
    getNotificationPreferences: vi.fn(),
    createTriggerRule: vi.fn(),
    deleteTriggerRule: vi.fn(),
    updateNotificationPreference: vi.fn(),
  };
});

describe('NotificationsPage Route Component [/notifications] [FR-5, FR-6, FR-7]', () => {
  const mockUser = {
    user_id: 'usr_notif_999',
    email: 'alert.admin@tenant.org',
    tenant_id: 'tnt_notif_888',
    roles: ['FinancialAdmin', 'NotificationAdmin'],
  };

  const mockNotifications: InAppNotification[] = [
    {
      notification_id: 'n-201',
      recipient_id: 'usr_notif_999',
      trigger_id: 't-201',
      urgency: 'High',
      channel: 'InApp',
      delivery_status: 'Sent',
      dispatched_at: '2026-10-06T10:00:00Z',
      correlation_id: 'corr-201',
      message: 'Critical AR threshold exceeded $25,000',
      read_status: false,
    },
  ];

  const mockTriggers: TriggerRule[] = [
    {
      trigger_id: 't-201',
      rule_name: 'Overdue Invoice Alert',
      financial_criteria: 'Invoice Past Due > 30 Days',
      threshold_amount: 10000.0,
      urgency: 'High',
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ];

  const mockPreferences: NotificationPreference[] = [
    {
      preference_id: 'p-201',
      role_name: 'financial_admin',
      event_type: 'invoice_past_due',
      urgency: 'High',
      channels_json: ['InApp', 'Email'],
      version: 1,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (apiClient.getMe as any).mockResolvedValue(mockUser);
    (alertingService.getInAppNotifications as any).mockResolvedValue(mockNotifications);
    (alertingService.getTriggerRules as any).mockResolvedValue(mockTriggers);
    (alertingService.getNotificationPreferences as any).mockResolvedValue(mockPreferences);
  });

  it('renders page header, status badges, user identity context, and navigation link to financial page', async () => {
    render(<NotificationsPage />);

    // Verify main page title
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /multi-channel notification center & alert hub/i,
      })
    ).toBeInTheDocument();

    // Verify status badges
    expect(screen.getByText(/notification engine active/i)).toBeInTheDocument();
    expect(screen.getByText(/multi-channel routing/i)).toBeInTheDocument();
    expect(screen.getByText(/tenant isolated/i)).toBeInTheDocument();

    // Verify identity details after fetch
    await waitFor(() => {
      expect(screen.getByTestId('notifications-user-email')).toHaveTextContent('alert.admin@tenant.org');
    });

    expect(screen.getByTestId('notifications-tenant-id')).toHaveTextContent('tnt_notif_888');
    expect(screen.getByText('NotificationAdmin')).toBeInTheDocument();

    // Verify link to Financial Dashboard
    const financialLink = screen.getByTestId('nav-financial-link');
    expect(financialLink).toBeInTheDocument();
    expect(financialLink).toHaveAttribute('href', '/financial');
  });

  it('renders NotificationHub with pre-loaded notifications, triggers, and preferences', async () => {
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Centralized Notification Hub')).toBeInTheDocument();
      expect(screen.getByText('Critical AR threshold exceeded $25,000')).toBeInTheDocument();
    });
  });

  it('handles manual refresh button click', async () => {
    render(<NotificationsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('notifications-user-email')).toHaveTextContent('alert.admin@tenant.org');
    });

    const refreshBtn = screen.getByTestId('refresh-notifications-btn');
    fireEvent.click(refreshBtn);

    expect(screen.getByText(/syncing/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });
  });
});
