import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContactForm } from '../../../src/components/crm/ContactForm';

describe('ContactForm Component', () => {
  const mockCompanies = [
    { id: 1, name: 'Acme Corp' },
    { id: 2, name: 'Globex Ltd' },
  ];

  it('renders all contact fields and action buttons', () => {
    render(<ContactForm companies={mockCompanies} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByTestId('contact-form')).toBeDefined();
    expect(screen.getByTestId('contact-name-input')).toBeDefined();
    expect(screen.getByTestId('contact-email-input')).toBeDefined();
    expect(screen.getByTestId('contact-phone-input')).toBeDefined();
    expect(screen.getByTestId('contact-role-input')).toBeDefined();
    expect(screen.getByTestId('contact-company-select')).toBeDefined();
    expect(screen.getByTestId('contact-notes-input')).toBeDefined();
    expect(screen.getByTestId('contact-submit-button')).toBeDefined();
    expect(screen.getByTestId('contact-cancel-button')).toBeDefined();
  });

  it('displays inline error when name is empty on save attempt (FR-2, FR-12)', async () => {
    const handleSubmit = vi.fn();
    render(<ContactForm companies={mockCompanies} onSubmit={handleSubmit} />);

    fireEvent.click(screen.getByTestId('contact-submit-button'));

    expect(handleSubmit).not.toHaveBeenCalled();
    const nameError = await screen.findByTestId('contact-name-error');
    expect(nameError).toBeDefined();
    expect(nameError.textContent).toContain('Contact name is required');
  });

  it('displays inline error when email is empty or has invalid format on save attempt (FR-2, FR-12)', async () => {
    const handleSubmit = vi.fn();
    render(<ContactForm companies={mockCompanies} onSubmit={handleSubmit} />);

    // Enter name but leave email empty
    fireEvent.change(screen.getByTestId('contact-name-input'), {
      target: { value: 'John Smith' },
    });
    fireEvent.click(screen.getByTestId('contact-submit-button'));

    expect(handleSubmit).not.toHaveBeenCalled();
    let emailError = await screen.findByTestId('contact-email-error');
    expect(emailError.textContent).toContain('Email is required');

    // Enter invalid email format
    fireEvent.change(screen.getByTestId('contact-email-input'), {
      target: { value: 'invalid-email-format' },
    });
    fireEvent.click(screen.getByTestId('contact-submit-button'));

    emailError = await screen.findByTestId('contact-email-error');
    expect(emailError.textContent).toContain('Invalid email format');
  });

  it('clears inline errors as user types in input fields', async () => {
    const handleSubmit = vi.fn();
    render(<ContactForm companies={mockCompanies} onSubmit={handleSubmit} />);

    // Trigger validation errors
    fireEvent.click(screen.getByTestId('contact-submit-button'));
    expect(await screen.findByTestId('contact-name-error')).toBeDefined();
    expect(await screen.findByTestId('contact-email-error')).toBeDefined();

    // Type in name and email
    fireEvent.change(screen.getByTestId('contact-name-input'), { target: { value: 'Jane Doe' } });
    expect(screen.queryByTestId('contact-name-error')).toBeNull();

    fireEvent.change(screen.getByTestId('contact-email-input'), {
      target: { value: 'jane.doe@example.com' },
    });
    expect(screen.queryByTestId('contact-email-error')).toBeNull();
  });

  it('allows creating a contact without selecting a company (nullable company dropdown - Edge Case 2)', async () => {
    const handleSubmit = vi.fn();
    render(<ContactForm companies={mockCompanies} onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByTestId('contact-name-input'), { target: { value: 'Alice Smith' } });
    fireEvent.change(screen.getByTestId('contact-email-input'), {
      target: { value: 'alice@example.com' },
    });
    // Ensure company select is empty / unassigned
    fireEvent.change(screen.getByTestId('contact-company-select'), { target: { value: '' } });

    fireEvent.click(screen.getByTestId('contact-submit-button'));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      name: 'Alice Smith',
      email: 'alice@example.com',
      company_id: null,
      phone: undefined,
      role: undefined,
      notes: undefined,
      owner: undefined,
    });
  });

  it('submits valid form data with company selected and optional fields filled', async () => {
    const handleSubmit = vi.fn();
    render(<ContactForm companies={mockCompanies} onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByTestId('contact-name-input'), {
      target: { value: 'Bob Johnson' },
    });
    fireEvent.change(screen.getByTestId('contact-email-input'), {
      target: { value: 'bob.johnson@acme.com' },
    });
    fireEvent.change(screen.getByTestId('contact-phone-input'), {
      target: { value: '+1 555-0199' },
    });
    fireEvent.change(screen.getByTestId('contact-role-input'), {
      target: { value: 'VP of Sales' },
    });
    fireEvent.change(screen.getByTestId('contact-company-select'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByTestId('contact-notes-input'), {
      target: { value: 'Primary decision maker' },
    });

    fireEvent.click(screen.getByTestId('contact-submit-button'));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      name: 'Bob Johnson',
      email: 'bob.johnson@acme.com',
      phone: '+1 555-0199',
      role: 'VP of Sales',
      company_id: 1,
      notes: 'Primary decision maker',
      owner: undefined,
    });
  });

  it('pre-populates form fields when initialValues are provided for editing', () => {
    const initialData = {
      id: 5,
      name: 'Carol Danvers',
      email: 'carol@marvel.com',
      phone: '555-0100',
      role: 'Captain',
      company_id: 2,
      notes: 'Hero contact',
    };

    render(<ContactForm initialValues={initialData} companies={mockCompanies} onSubmit={vi.fn()} />);

    expect((screen.getByTestId('contact-name-input') as HTMLInputElement).value).toBe('Carol Danvers');
    expect((screen.getByTestId('contact-email-input') as HTMLInputElement).value).toBe('carol@marvel.com');
    expect((screen.getByTestId('contact-phone-input') as HTMLInputElement).value).toBe('555-0100');
    expect((screen.getByTestId('contact-role-input') as HTMLInputElement).value).toBe('Captain');
    expect((screen.getByTestId('contact-company-select') as HTMLSelectElement).value).toBe('2');
    expect((screen.getByTestId('contact-notes-input') as HTMLTextAreaElement).value).toBe('Hero contact');
  });

  it('renders top-level server error banner when provided', () => {
    render(
      <ContactForm
        companies={mockCompanies}
        onSubmit={vi.fn()}
        serverError="Failed to save contact on server"
      />
    );

    const serverErr = screen.getByTestId('contact-form-server-error');
    expect(serverErr).toBeDefined();
    expect(serverErr.textContent).toContain('Failed to save contact on server');
  });
});
