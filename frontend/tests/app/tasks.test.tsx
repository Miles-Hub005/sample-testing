import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TasksPage from '../../src/app/tasks/page';
import * as crmService from '../../src/services/crm';

vi.mock('../../src/services/crm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/crm')>();
  return {
    ...actual,
    tasksApi: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    companiesApi: {
      list: vi.fn(),
    },
    leadsApi: {
      list: vi.fn(),
    },
    contactsApi: {
      list: vi.fn(),
    },
  };
});

describe('TasksPage Component', () => {
  const mockTasks = [
    {
      id: 1,
      title: 'Follow up on proposal',
      description: 'Follow up on proposal',
      due_date: '2026-10-15T00:00:00Z',
      completed: false,
      overdue: false,
      company_id: 10,
      lead_id: 100,
      contact_id: 1000,
      owner: 'Alice',
      created_at: '2026-09-01T10:00:00Z',
      updated_at: '2026-09-01T10:00:00Z',
    },
    {
      id: 2,
      title: 'Send updated quote',
      description: 'Send updated quote',
      due_date: '2026-09-01T00:00:00Z',
      completed: false,
      overdue: true,
      company_id: null,
      lead_id: null,
      contact_id: null,
      owner: 'Bob',
      created_at: '2026-08-15T10:00:00Z',
      updated_at: '2026-08-15T10:00:00Z',
    },
  ];

  const mockCompanies = [
    {
      id: 10,
      name: 'Acme Corp',
      industry: 'Manufacturing',
      website: 'https://acme.com',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  const mockLeads = [
    {
      id: 100,
      title: 'Big Software License',
      value: 50000,
      status: 'Negotiation',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  const mockContacts = [
    {
      id: 1000,
      name: 'John Doe',
      email: 'john@acme.com',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (crmService.tasksApi.list as any).mockResolvedValue({
      data: {
        items: mockTasks,
        total: 2,
        page: 1,
        page_size: 20,
        pages: 1,
      },
      error: null,
    });
    (crmService.companiesApi.list as any).mockResolvedValue({
      data: { items: mockCompanies, total: 1, page: 1, page_size: 100, pages: 1 },
      error: null,
    });
    (crmService.leadsApi.list as any).mockResolvedValue({
      data: { items: mockLeads, total: 1, page: 1, page_size: 100, pages: 1 },
      error: null,
    });
    (crmService.contactsApi.list as any).mockResolvedValue({
      data: { items: mockContacts, total: 1, page: 1, page_size: 100, pages: 1 },
      error: null,
    });
  });

  it('renders page header, breadcrumbs, and tasks data table', async () => {
    render(<TasksPage />);

    expect(screen.getByTestId('tasks-page')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeDefined();
    expect(screen.getByTestId('add-task-button')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Follow up on proposal')).toBeDefined();
      expect(screen.getByText('Send updated quote')).toBeDefined();
    });
  });

  it('opens Add Task modal when Add Task button is clicked', async () => {
    render(<TasksPage />);

    const addButton = screen.getByTestId('add-task-button');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('add-task-modal')).toBeDefined();
      expect(screen.getByTestId('task-form')).toBeDefined();
    });
  });

  it('submits new task and re-fetches list on successful creation', async () => {
    (crmService.tasksApi.create as any).mockResolvedValue({
      data: {
        id: 3,
        title: 'Call prospect',
        description: 'Call prospect',
        due_date: '2026-10-20T00:00:00Z',
        completed: false,
        overdue: false,
        created_at: '2026-09-02T10:00:00Z',
        updated_at: '2026-09-02T10:00:00Z',
      },
      error: null,
    });

    render(<TasksPage />);

    fireEvent.click(screen.getByTestId('add-task-button'));

    await waitFor(() => {
      expect(screen.getByTestId('task-form')).toBeDefined();
    });

    fireEvent.change(screen.getByTestId('task-description-input'), {
      target: { value: 'Call prospect' },
    });
    fireEvent.change(screen.getByTestId('task-due-date-input'), {
      target: { value: '2026-10-20' },
    });

    fireEvent.click(screen.getByTestId('task-submit-button'));

    await waitFor(() => {
      expect(crmService.tasksApi.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Call prospect',
          due_date: '2026-10-20',
        })
      );
      expect(screen.getByTestId('tasks-success-alert')).toBeDefined();
    });
  });

  it('filters tasks when status filter select changes', async () => {
    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByText('Follow up on proposal')).toBeDefined();
    });

    const statusSelect = screen.getByTestId('status-filter-select');
    fireEvent.change(statusSelect, { target: { value: 'overdue' } });

    await waitFor(() => {
      expect(crmService.tasksApi.list).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'overdue',
        })
      );
    });
  });

  it('opens view modal when task title link is clicked', async () => {
    (crmService.tasksApi.get as any).mockResolvedValue({
      data: mockTasks[0],
      error: null,
    });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByTestId('task-title-link-1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('task-title-link-1'));

    await waitFor(() => {
      expect(screen.getByTestId('view-task-modal')).toBeDefined();
      expect(screen.getByText('Company: Acme Corp')).toBeDefined();
    });
  });

  it('deletes a task through confirmation dialog', async () => {
    (crmService.tasksApi.delete as any).mockResolvedValue({
      data: null,
      error: null,
    });

    render(<TasksPage />);

    await waitFor(() => {
      expect(screen.getByTestId('delete-task-1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('delete-task-1'));

    await waitFor(() => {
      expect(screen.getByTestId('confirmation-dialog')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('confirm-button'));

    await waitFor(() => {
      expect(crmService.tasksApi.delete).toHaveBeenCalledWith(1);
      expect(screen.getByTestId('tasks-success-alert')).toBeDefined();
    });
  });
});
