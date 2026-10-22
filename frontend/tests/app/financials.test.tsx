import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FinancialsPage from '../../src/app/financials/page';
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

describe('FinancialsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header, status labels, loading indicator, and populates user session context', async () => {
    const mockUser = {
      user_id: 'usr_fin_123',
      email: 'finance.user@tenant.org',
      tenant_id: 'tnt_fin_555',
      roles: ['ClientViewer', 'SecurityAdmin'],
    };

    (apiClient.getMe as any).mockResolvedValueOnce(mockUser);

    render(<FinancialsPage />);

    // Verify main header title
    expect(
      screen.getByRole('heading', { level: 1, name: /financials & billing management/i })
    ).toBeInTheDocument();

    // Verify status badges in header
    expect(screen.getByText(/billing systems active/i)).toBeInTheDocument();
    expect(screen.getByText(/tenant isolated/i)).toBeInTheDocument();

    // Verify initial loading message
    expect(
      screen.getByText(/fetching active identity and tenant financial context/i)
    ).toBeInTheDocument();

    // Wait for user details to load
    await waitFor(() => {
      expect(screen.getByText('finance.user@tenant.org')).toBeInTheDocument();
    });

    expect(screen.getByText('tnt_fin_555')).toBeInTheDocument();
    expect(screen.getByText('ClientViewer')).toBeInTheDocument();
    expect(screen.getByText('SecurityAdmin')).toBeInTheDocument();
  });

  it('renders financial summary KPI cards and API quota progress', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce({
      user_id: 'usr_abc',
      email: 'test@example.com',
      tenant_id: 'tnt_abc',
      roles: ['ClientViewer'],
    });

    render(<FinancialsPage />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    // Verify Financial Overview section
    expect(
      screen.getByRole('heading', { level: 2, name: /financial overview & billing summary/i })
    ).toBeInTheDocument();

    expect(screen.getByText('$2,450.00 / mo')).toBeInTheDocument();
    expect(screen.getByText('Oct 01 – Oct 31')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('124,850 / 500k')).toBeInTheDocument();

    // Verify API quota meter
    expect(
      screen.getByRole('heading', { level: 2, name: /metered api quota & usage allocation/i })
    ).toBeInTheDocument();

    expect(screen.getByText('25% Utilized')).toBeInTheDocument();
    expect(screen.getByText('375,150 Requests Remaining')).toBeInTheDocument();
  });

  it('renders invoice history table and filters records by search query and status', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce({
      user_id: 'usr_abc',
      email: 'test@example.com',
      tenant_id: 'tnt_abc',
      roles: ['ClientViewer'],
    });

    render(<FinancialsPage />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    // Check table headers & invoices
    expect(
      screen.getByRole('heading', { level: 2, name: /invoice history & payment records/i })
    ).toBeInTheDocument();

    expect(screen.getByText('INV-2026-010')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-009')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-008')).toBeInTheDocument();

    // Filter by search query
    const searchInput = screen.getByPlaceholderText(/search invoices/i);
    fireEvent.change(searchInput, { target: { value: 'September' } });

    expect(screen.getByText('INV-2026-009')).toBeInTheDocument();
    expect(screen.queryByText('INV-2026-010')).not.toBeInTheDocument();

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('INV-2026-010')).toBeInTheDocument();
  });

  it('triggers receipt download simulation and displays confirmation banner', async () => {
    (apiClient.getMe as any).mockResolvedValueOnce({
      user_id: 'usr_abc',
      email: 'test@example.com',
      tenant_id: 'tnt_abc',
      roles: ['ClientViewer'],
    });

    render(<FinancialsPage />);

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    // Click receipt button for INV-2026-010
    const receiptBtn = screen.getByRole('button', {
      name: /download receipt for invoice inv-2026-010/i,
    });
    fireEvent.click(receiptBtn);

    // Verify confirmation message
    expect(
      screen.getByText(/receipt for/i)
    ).toBeInTheDocument();
    expect(screen.getByText('INV-2026-010')).toBeInTheDocument();
  });

  it('displays an error alert when fetching user context fails', async () => {
    (apiClient.getMe as any).mockRejectedValueOnce(new Error('Network error loading financials identity'));

    render(<FinancialsPage />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error loading financials identity')).toBeInTheDocument();
  });
});
