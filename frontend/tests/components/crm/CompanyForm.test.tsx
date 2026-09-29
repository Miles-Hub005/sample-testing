import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CompanyForm } from '../../../src/components/crm/CompanyForm';

describe('CompanyForm Component', () => {
  it('renders all primary company fields (name, industry, website, notes) and buttons', () => {
    render(<CompanyForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByTestId('company-form')).toBeDefined();
    expect(screen.getByTestId('company-name-input')).toBeDefined();
    expect(screen.getByTestId('company-industry-input')).toBeDefined();
    expect(screen.getByTestId('company-website-input')).toBeDefined();
    expect(screen.getByTestId('company-notes-input')).toBeDefined();
    expect(screen.getByTestId('company-submit-button')).toBeDefined();
    expect(screen.getByTestId('company-cancel-button')).toBeDefined();
  });

  it('displays inline validation error when required name field is empty on save attempt (FR-1, FR-12)', async () => {
    const handleSubmit = vi.fn();
    render(<CompanyForm onSubmit={handleSubmit} />);

    const submitBtn = screen.getByTestId('company-submit-button');
    fireEvent.click(submitBtn);

    expect(handleSubmit).not.toHaveBeenCalled();
    const nameError = await screen.findByTestId('company-name-error');
    expect(nameError).toBeDefined();
    expect(nameError.textContent).toContain('Company name is required');
  });

  it('clears inline validation error when user types in the name field', async () => {
    const handleSubmit = vi.fn();
    render(<CompanyForm onSubmit={handleSubmit} />);

    // Trigger validation error
    fireEvent.click(screen.getByTestId('company-submit-button'));
    expect(await screen.findByTestId('company-name-error')).toBeDefined();

    // Type in name field
    const nameInput = screen.getByTestId('company-name-input');
    fireEvent.change(nameInput, { target: { value: 'Acme Corp' } });

    // Error should be cleared
    expect(screen.queryByTestId('company-name-error')).toBeNull();
  });

  it('submits form data successfully when required name and optional fields are valid', async () => {
    const handleSubmit = vi.fn();
    render(<CompanyForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByTestId('company-name-input'), {
      target: { value: 'Globex Corporation' },
    });
    fireEvent.change(screen.getByTestId('company-industry-input'), {
      target: { value: 'Technology' },
    });
    fireEvent.change(screen.getByTestId('company-website-input'), {
      target: { value: 'https://globex.com' },
    });
    fireEvent.change(screen.getByTestId('company-notes-input'), {
      target: { value: 'Important enterprise client' },
    });

    fireEvent.click(screen.getByTestId('company-submit-button'));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      name: 'Globex Corporation',
      industry: 'Technology',
      website: 'https://globex.com',
      notes: 'Important enterprise client',
      email: undefined,
      owner: undefined,
    });
  });

  it('populates form with initialValues in edit mode', () => {
    const initialData = {
      id: 10,
      name: 'Stark Industries',
      industry: 'Defense',
      website: 'https://stark.com',
      notes: 'Top tier partner',
    };

    render(<CompanyForm initialValues={initialData} onSubmit={vi.fn()} />);

    expect((screen.getByTestId('company-name-input') as HTMLInputElement).value).toBe(
      'Stark Industries'
    );
    expect((screen.getByTestId('company-industry-input') as HTMLInputElement).value).toBe(
      'Defense'
    );
    expect((screen.getByTestId('company-website-input') as HTMLInputElement).value).toBe(
      'https://stark.com'
    );
    expect((screen.getByTestId('company-notes-input') as HTMLTextAreaElement).value).toBe(
      'Top tier partner'
    );
  });

  it('triggers onCancel callback when Cancel button is clicked', () => {
    const handleCancel = vi.fn();
    render(<CompanyForm onSubmit={vi.fn()} onCancel={handleCancel} />);

    fireEvent.click(screen.getByTestId('company-cancel-button'));
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('disables inputs and buttons when isLoading is true', () => {
    render(<CompanyForm onSubmit={vi.fn()} onCancel={vi.fn()} isLoading={true} />);

    expect((screen.getByTestId('company-name-input') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('company-industry-input') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('company-website-input') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByTestId('company-notes-input') as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByTestId('company-submit-button') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId('company-cancel-button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('company-submit-button').textContent).toContain('Saving...');
  });

  it('renders top-level server error message when serverError prop is passed', () => {
    render(
      <CompanyForm
        onSubmit={vi.fn()}
        serverError="A company with this name already exists."
      />
    );

    const serverError = screen.getByTestId('company-form-server-error');
    expect(serverError).toBeDefined();
    expect(serverError.textContent).toContain('A company with this name already exists.');
  });
});
