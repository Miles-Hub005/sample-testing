import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InteractionForm } from '../../../src/components/crm/InteractionForm';

describe('InteractionForm Component', () => {
  const mockCompanies = [
    { id: 1, name: 'Acme Corp' },
    { id: 2, name: 'Globex Ltd' },
  ];

  const mockContacts = [
    { id: 101, name: 'Alice Smith' },
    { id: 102, name: 'Bob Jones' },
  ];

  const mockLeads = [
    { id: 10, title: 'Big Software License' },
    { id: 20, title: 'Hardware Refresh' },
  ];

  it('renders all interaction fields and buttons', () => {
    render(
      <InteractionForm
        companies={mockCompanies}
        contacts={mockContacts}
        leads={mockLeads}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('interaction-form')).toBeDefined();
    expect(screen.getByTestId('interaction-date-input')).toBeDefined();
    expect(screen.getByTestId('interaction-type-select')).toBeDefined();
    expect(screen.getByTestId('interaction-summary-input')).toBeDefined();
    expect(screen.getByTestId('interaction-company-select')).toBeDefined();
    expect(screen.getByTestId('interaction-contact-select')).toBeDefined();
    expect(screen.getByTestId('interaction-lead-select')).toBeDefined();
    expect(screen.getByTestId('interaction-submit-button')).toBeDefined();
    expect(screen.getByTestId('interaction-cancel-button')).toBeDefined();
  });

  it('displays inline error when required date is empty on save attempt (FR-5, FR-12)', async () => {
    const handleSubmit = vi.fn();
    render(<InteractionForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByTestId('interaction-summary-input'), {
      target: { value: 'Discussion about pricing' },
    });
    fireEvent.click(screen.getByTestId('interaction-submit-button'));

    expect(handleSubmit).not.toHaveBeenCalled();
    const dateError = await screen.findByTestId('interaction-date-error');
    expect(dateError).toBeDefined();
    expect(dateError.textContent).toContain('Interaction date is required');
  });

  it('displays inline error when required summary is empty on save attempt (FR-5, FR-12)', async () => {
    const handleSubmit = vi.fn();
    render(<InteractionForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByTestId('interaction-date-input'), {
      target: { value: '2026-09-25' },
    });
    fireEvent.click(screen.getByTestId('interaction-submit-button'));

    expect(handleSubmit).not.toHaveBeenCalled();
    const summaryError = await screen.findByTestId('interaction-summary-error');
    expect(summaryError).toBeDefined();
    expect(summaryError.textContent).toContain('Interaction summary is required');
  });

  it('displays inline error when type selection is cleared to empty (FR-5, FR-12)', async () => {
    const handleSubmit = vi.fn();
    render(<InteractionForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByTestId('interaction-date-input'), {
      target: { value: '2026-09-25' },
    });
    fireEvent.change(screen.getByTestId('interaction-summary-input'), {
      target: { value: 'Client meeting' },
    });
    fireEvent.change(screen.getByTestId('interaction-type-select'), {
      target: { value: '' },
    });

    fireEvent.click(screen.getByTestId('interaction-submit-button'));

    expect(handleSubmit).not.toHaveBeenCalled();
    const typeError = await screen.findByTestId('interaction-type-error');
    expect(typeError).toBeDefined();
    expect(typeError.textContent).toContain('Interaction type is required');
  });

  it('clears inline validation errors as user types/changes input', async () => {
    const handleSubmit = vi.fn();
    render(<InteractionForm onSubmit={handleSubmit} />);

    // Trigger validation error
    fireEvent.click(screen.getByTestId('interaction-submit-button'));
    expect(await screen.findByTestId('interaction-date-error')).toBeDefined();

    // Type in date field
    fireEvent.change(screen.getByTestId('interaction-date-input'), {
      target: { value: '2026-09-25' },
    });

    // Error should be cleared
    expect(screen.queryByTestId('interaction-date-error')).toBeNull();
  });

  it('submits form data successfully with valid required and optional fields', async () => {
    const handleSubmit = vi.fn();
    render(
      <InteractionForm
        companies={mockCompanies}
        contacts={mockContacts}
        leads={mockLeads}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByTestId('interaction-date-input'), {
      target: { value: '2026-09-25' },
    });
    fireEvent.change(screen.getByTestId('interaction-type-select'), {
      target: { value: 'call' },
    });
    fireEvent.change(screen.getByTestId('interaction-summary-input'), {
      target: { value: 'Phone call to review contract terms' },
    });
    fireEvent.change(screen.getByTestId('interaction-company-select'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByTestId('interaction-contact-select'), {
      target: { value: '101' },
    });
    fireEvent.change(screen.getByTestId('interaction-lead-select'), {
      target: { value: '10' },
    });

    fireEvent.click(screen.getByTestId('interaction-submit-button'));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        date: '2026-09-25',
        type: 'call',
        summary: 'Phone call to review contract terms',
        company_id: 1,
        contact_id: 101,
        lead_id: 10,
        notes: 'Phone call to review contract terms',
        owner: undefined,
      });
    });
  });

  it('pre-populates fields correctly when initialValues is supplied', () => {
    const initial = {
      id: 5,
      date: '2026-10-01T12:00:00Z',
      type: 'meeting',
      summary: 'Project kickoff meeting',
      company_id: 2,
      contact_id: 102,
      lead_id: 20,
    };

    render(
      <InteractionForm
        initialValues={initial}
        companies={mockCompanies}
        contacts={mockContacts}
        leads={mockLeads}
        onSubmit={vi.fn()}
      />
    );

    expect(
      (screen.getByTestId('interaction-date-input') as HTMLInputElement).value
    ).toBe('2026-10-01');
    expect(
      (screen.getByTestId('interaction-type-select') as HTMLSelectElement).value
    ).toBe('meeting');
    expect(
      (screen.getByTestId('interaction-summary-input') as HTMLTextAreaElement).value
    ).toBe('Project kickoff meeting');
    expect(
      (screen.getByTestId('interaction-company-select') as HTMLSelectElement).value
    ).toBe('2');
    expect(
      (screen.getByTestId('interaction-contact-select') as HTMLSelectElement).value
    ).toBe('102');
    expect(
      (screen.getByTestId('interaction-lead-select') as HTMLSelectElement).value
    ).toBe('20');
  });

  it('renders server error message if passed', () => {
    render(
      <InteractionForm
        onSubmit={vi.fn()}
        serverError="Unable to save interaction"
      />
    );

    const alert = screen.getByTestId('interaction-form-server-error');
    expect(alert).toBeDefined();
    expect(alert.textContent).toBe('Unable to save interaction');
  });
});
