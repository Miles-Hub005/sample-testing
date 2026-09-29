import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LeadForm } from '../../../src/components/crm/LeadForm';

describe('LeadForm Component', () => {
  const mockCompanies = [
    { id: 1, name: 'Acme Corp' },
    { id: 2, name: 'Globex Ltd' },
  ];

  const mockContacts = [
    { id: 10, name: 'Alice Smith' },
    { id: 20, name: 'Bob Jones' },
  ];

  it('renders all lead fields and buttons', () => {
    render(
      <LeadForm
        companies={mockCompanies}
        contacts={mockContacts}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('lead-form')).toBeDefined();
    expect(screen.getByTestId('lead-title-input')).toBeDefined();
    expect(screen.getByTestId('lead-company-select')).toBeDefined();
    expect(screen.getByTestId('lead-contact-select')).toBeDefined();
    expect(screen.getByTestId('lead-value-input')).toBeDefined();
    expect(screen.getByTestId('lead-status-select')).toBeDefined();
    expect(screen.getByTestId('lead-expected-close-date-input')).toBeDefined();
    expect(screen.getByTestId('lead-submit-button')).toBeDefined();
    expect(screen.getByTestId('lead-cancel-button')).toBeDefined();
  });

  it('displays inline error when required title is empty on save attempt (FR-3, FR-12)', async () => {
    const handleSubmit = vi.fn();
    render(<LeadForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByTestId('lead-value-input'), { target: { value: '1000' } });
    fireEvent.click(screen.getByTestId('lead-submit-button'));

    expect(handleSubmit).not.toHaveBeenCalled();
    const titleError = await screen.findByTestId('lead-title-error');
    expect(titleError).toBeDefined();
    expect(titleError.textContent).toContain('Lead title is required');
  });

  it('displays inline error when value is empty on save attempt (FR-3, FR-12)', async () => {
    const handleSubmit = vi.fn();
    render(<LeadForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByTestId('lead-title-input'), { target: { value: 'Big Deal' } });
    fireEvent.click(screen.getByTestId('lead-submit-button'));

    expect(handleSubmit).not.toHaveBeenCalled();
    const valueError = await screen.findByTestId('lead-value-error');
    expect(valueError).toBeDefined();
    expect(valueError.textContent).toContain('Lead value is required');
  });

  it('displays inline error when value is negative (Edge Case 8)', async () => {
    const handleSubmit = vi.fn();
    render(<LeadForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByTestId('lead-title-input'), { target: { value: 'Invalid Deal' } });
    fireEvent.change(screen.getByTestId('lead-value-input'), { target: { value: '-500' } });
    fireEvent.click(screen.getByTestId('lead-submit-button'));

    expect(handleSubmit).not.toHaveBeenCalled();
    const valueError = await screen.findByTestId('lead-value-error');
    expect(valueError).toBeDefined();
    expect(valueError.textContent).toContain('Lead value cannot be negative');
  });

  it('clears inline validation errors as user types', async () => {
    const handleSubmit = vi.fn();
    render(<LeadForm onSubmit={handleSubmit} />);

    // Trigger validation errors
    fireEvent.click(screen.getByTestId('lead-submit-button'));
    expect(await screen.findByTestId('lead-title-error')).toBeDefined();
    expect(await screen.findByTestId('lead-value-error')).toBeDefined();

    // Type valid values
    fireEvent.change(screen.getByTestId('lead-title-input'), { target: { value: 'Valid Deal' } });
    expect(screen.queryByTestId('lead-title-error')).toBeNull();

    fireEvent.change(screen.getByTestId('lead-value-input'), { target: { value: '5000' } });
    expect(screen.queryByTestId('lead-value-error')).toBeNull();
  });

  it('allows creating a lead with nullable company and contact dropdowns', async () => {
    const handleSubmit = vi.fn();
    render(
      <LeadForm
        companies={mockCompanies}
        contacts={mockContacts}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByTestId('lead-title-input'), { target: { value: 'Standalone Lead' } });
    fireEvent.change(screen.getByTestId('lead-value-input'), { target: { value: '25000' } });
    fireEvent.change(screen.getByTestId('lead-status-select'), { target: { value: 'Qualified' } });
    fireEvent.change(screen.getByTestId('lead-expected-close-date-input'), { target: { value: '2026-12-31' } });

    // Leave company and contact dropdowns unassigned (value="")
    fireEvent.click(screen.getByTestId('lead-submit-button'));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      title: 'Standalone Lead',
      company_id: null,
      contact_id: null,
      value: 25000,
      status: 'Qualified',
      expected_close_date: '2026-12-31',
      notes: undefined,
      owner: undefined,
    });
  });

  it('populates initial values in edit mode and connects company and contact', async () => {
    const handleSubmit = vi.fn();
    const initialData = {
      title: 'Existing Enterprise Deal',
      company_id: 1,
      contact_id: 10,
      value: 100000,
      status: 'Negotiation',
      expected_close_date: '2026-10-15',
    };

    render(
      <LeadForm
        initialValues={initialData}
        companies={mockCompanies}
        contacts={mockContacts}
        onSubmit={handleSubmit}
      />
    );

    expect((screen.getByTestId('lead-title-input') as HTMLInputElement).value).toBe('Existing Enterprise Deal');
    expect((screen.getByTestId('lead-company-select') as HTMLSelectElement).value).toBe('1');
    expect((screen.getByTestId('lead-contact-select') as HTMLSelectElement).value).toBe('10');
    expect((screen.getByTestId('lead-value-input') as HTMLInputElement).value).toBe('100000');
    expect((screen.getByTestId('lead-status-select') as HTMLSelectElement).value).toBe('Negotiation');
    expect((screen.getByTestId('lead-expected-close-date-input') as HTMLInputElement).value).toBe('2026-10-15');

    fireEvent.click(screen.getByTestId('lead-submit-button'));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      title: 'Existing Enterprise Deal',
      company_id: 1,
      contact_id: 10,
      value: 100000,
      status: 'Negotiation',
      expected_close_date: '2026-10-15',
      notes: undefined,
      owner: undefined,
    });
  });
});
