import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskForm } from '../../../src/components/crm/TaskForm';

describe('TaskForm Component', () => {
  const mockCompanies = [
    { id: 1, name: 'Acme Corp' },
    { id: 2, name: 'Globex Ltd' },
  ];

  const mockLeads = [
    { id: 10, title: 'Big Software License' },
    { id: 20, title: 'Hardware Refresh' },
  ];

  it('renders all task fields and buttons', () => {
    render(
      <TaskForm
        companies={mockCompanies}
        leads={mockLeads}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('task-form')).toBeDefined();
    expect(screen.getByTestId('task-description-input')).toBeDefined();
    expect(screen.getByTestId('task-due-date-input')).toBeDefined();
    expect(screen.getByTestId('task-completed-checkbox')).toBeDefined();
    expect(screen.getByTestId('task-company-select')).toBeDefined();
    expect(screen.getByTestId('task-lead-select')).toBeDefined();
    expect(screen.getByTestId('task-submit-button')).toBeDefined();
    expect(screen.getByTestId('task-cancel-button')).toBeDefined();
  });

  it('displays inline error when required description is empty on save attempt (FR-4, FR-12)', async () => {
    const handleSubmit = vi.fn();
    render(<TaskForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByTestId('task-due-date-input'), {
      target: { value: '2026-10-15' },
    });
    fireEvent.click(screen.getByTestId('task-submit-button'));

    expect(handleSubmit).not.toHaveBeenCalled();
    const descError = await screen.findByTestId('task-description-error');
    expect(descError).toBeDefined();
    expect(descError.textContent).toContain('Task description is required');
  });

  it('displays inline error when required due date is empty on save attempt (FR-4, FR-12)', async () => {
    const handleSubmit = vi.fn();
    render(<TaskForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByTestId('task-description-input'), {
      target: { value: 'Follow up call' },
    });
    fireEvent.click(screen.getByTestId('task-submit-button'));

    expect(handleSubmit).not.toHaveBeenCalled();
    const dueDateError = await screen.findByTestId('task-due-date-error');
    expect(dueDateError).toBeDefined();
    expect(dueDateError.textContent).toContain('Due date is required');
  });

  it('allows editing task due date to a past date without error (Edge Case 3)', async () => {
    const handleSubmit = vi.fn();
    render(<TaskForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByTestId('task-description-input'), {
      target: { value: 'Overdue follow up' },
    });
    fireEvent.change(screen.getByTestId('task-due-date-input'), {
      target: { value: '2020-01-01' },
    });

    fireEvent.click(screen.getByTestId('task-submit-button'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Overdue follow up',
          due_date: '2020-01-01',
        })
      );
    });

    expect(screen.queryByTestId('task-due-date-error')).toBeNull();
  });

  it('clears inline validation errors as user types/changes input', async () => {
    const handleSubmit = vi.fn();
    render(<TaskForm onSubmit={handleSubmit} />);

    // Trigger validation errors
    fireEvent.click(screen.getByTestId('task-submit-button'));
    expect(await screen.findByTestId('task-description-error')).toBeDefined();
    expect(await screen.findByTestId('task-due-date-error')).toBeDefined();

    // Type valid values
    fireEvent.change(screen.getByTestId('task-description-input'), {
      target: { value: 'Valid Description' },
    });
    expect(screen.queryByTestId('task-description-error')).toBeNull();

    fireEvent.change(screen.getByTestId('task-due-date-input'), {
      target: { value: '2026-12-01' },
    });
    expect(screen.queryByTestId('task-due-date-error')).toBeNull();
  });

  it('allows creating a task with nullable company and lead dropdowns', async () => {
    const handleSubmit = vi.fn();
    render(
      <TaskForm
        companies={mockCompanies}
        leads={mockLeads}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByTestId('task-description-input'), {
      target: { value: 'General task without links' },
    });
    fireEvent.change(screen.getByTestId('task-due-date-input'), {
      target: { value: '2026-11-20' },
    });

    fireEvent.click(screen.getByTestId('task-submit-button'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'General task without links',
          due_date: '2026-11-20',
          company_id: null,
          lead_id: null,
          completed: false,
        })
      );
    });
  });

  it('populates initial values when provided', () => {
    const initialValues = {
      description: 'Initial Task',
      due_date: '2026-05-10T00:00:00Z',
      completed: true,
      company_id: 1,
      lead_id: 10,
    };

    render(
      <TaskForm
        initialValues={initialValues}
        companies={mockCompanies}
        leads={mockLeads}
        onSubmit={vi.fn()}
      />
    );

    const descInput = screen.getByTestId('task-description-input') as HTMLTextAreaElement;
    const dueDateInput = screen.getByTestId('task-due-date-input') as HTMLInputElement;
    const completedCheckbox = screen.getByTestId('task-completed-checkbox') as HTMLInputElement;
    const companySelect = screen.getByTestId('task-company-select') as HTMLSelectElement;
    const leadSelect = screen.getByTestId('task-lead-select') as HTMLSelectElement;

    expect(descInput.value).toBe('Initial Task');
    expect(dueDateInput.value).toBe('2026-05-10');
    expect(completedCheckbox.checked).toBe(true);
    expect(companySelect.value).toBe('1');
    expect(leadSelect.value).toBe('10');
  });

  it('handles server errors and calls onCancel when cancel is clicked', () => {
    const handleCancel = vi.fn();
    render(
      <TaskForm
        onSubmit={vi.fn()}
        onCancel={handleCancel}
        serverError="Server error occurred"
      />
    );

    expect(screen.getByTestId('task-form-server-error')).toBeDefined();
    expect(screen.getByTestId('task-form-server-error').textContent).toContain('Server error occurred');

    fireEvent.click(screen.getByTestId('task-cancel-button'));
    expect(handleCancel).toHaveBeenCalled();
  });
});
