import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from '../../../src/components/shared/ConfirmationDialog';

describe('ConfirmationDialog', () => {
  it('renders title, message, cancel, and confirm buttons when isOpen is true', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Delete Record"
        message="Are you sure you want to delete this company?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('alertdialog', { name: 'Delete Record' })).toBeDefined();
    expect(screen.getByText('Are you sure you want to delete this company?')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDefined();
  });

  it('renders null when isOpen is false', () => {
    const { container } = render(
      <ConfirmationDialog
        isOpen={false}
        title="Hidden Dialog"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Operation"
        onConfirm={handleConfirm}
        onCancel={vi.fn()}
      />
    );

    const confirmBtn = screen.getByTestId('confirmation-dialog-confirm');
    fireEvent.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', () => {
    const handleCancel = vi.fn();
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Confirm Operation"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    const cancelBtn = screen.getByTestId('confirmation-dialog-cancel');
    fireEvent.click(cancelBtn);

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape key is pressed', () => {
    const handleCancel = vi.fn();
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Keyboard Test"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when clicking backdrop', () => {
    const handleCancel = vi.fn();
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Backdrop Test"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    const backdrop = screen.getByTestId('confirmation-dialog-backdrop');
    fireEvent.click(backdrop);

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('does not call onCancel when clicking dialog content box', () => {
    const handleCancel = vi.fn();
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Inner Click Test"
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    const dialogContent = screen.getByTestId('confirmation-dialog');
    fireEvent.click(dialogContent);

    expect(handleCancel).not.toHaveBeenCalled();
  });

  it('has modal accessibility attributes (role, aria-modal, aria-labelledby, aria-describedby)', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Accessible Title"
        message="Accessible Description"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const dialog = screen.getByTestId('confirmation-dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    const titleId = dialog.getAttribute('aria-labelledby');
    expect(titleId).toBeDefined();
    const titleElem = document.getElementById(titleId!);
    expect(titleElem?.textContent).toBe('Accessible Title');

    const descId = dialog.getAttribute('aria-describedby');
    expect(descId).toBeDefined();
    const descElem = document.getElementById(descId!);
    expect(descElem?.textContent).toBe('Accessible Description');
  });

  it('supports custom confirmLabel, cancelLabel, and children nodes', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Custom Labels"
        confirmLabel="Yes, Delete"
        cancelLabel="No, Keep"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      >
        <p data-testid="custom-child">Child Content</p>
      </ConfirmationDialog>
    );

    expect(screen.getByRole('button', { name: 'Yes, Delete' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'No, Keep' })).toBeDefined();
    expect(screen.getByTestId('custom-child')).toBeDefined();
  });

  it('renders loading state when isLoading is true and disables buttons', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmationDialog
        isOpen={true}
        title="Loading State"
        isLoading={true}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );

    const confirmBtn = screen.getByTestId('confirmation-dialog-confirm') as HTMLButtonElement;
    const cancelBtn = screen.getByTestId('confirmation-dialog-cancel') as HTMLButtonElement;

    expect(confirmBtn.disabled).toBe(true);
    expect(cancelBtn.disabled).toBe(true);
    expect(screen.getByTestId('confirmation-dialog-spinner')).toBeDefined();

    fireEvent.click(confirmBtn);
    expect(handleConfirm).not.toHaveBeenCalled();

    fireEvent.click(cancelBtn);
    expect(handleCancel).not.toHaveBeenCalled();
  });

  it('uses alertdialog role for variant="danger" or isDanger=true', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Danger Dialog"
        isDanger={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeDefined();
  });

  it('uses dialog role for variant="primary"', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Primary Dialog"
        variant="primary"
        role="dialog"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
  });

  it('respects closeOnBackdropClick=false and closeOnEscape=false', () => {
    const handleCancel = vi.fn();
    render(
      <ConfirmationDialog
        isOpen={true}
        title="No Close Test"
        closeOnBackdropClick={false}
        closeOnEscape={false}
        onConfirm={vi.fn()}
        onCancel={handleCancel}
      />
    );

    const backdrop = screen.getByTestId('confirmation-dialog-backdrop');
    fireEvent.click(backdrop);
    expect(handleCancel).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleCancel).not.toHaveBeenCalled();
  });

  it('resolves alertdialog role for variant="warning"', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Warning Dialog"
        variant="warning"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('alertdialog')).toBeDefined();
  });

  it('locks body overflow when open and restores on unmount', () => {
    const originalOverflow = document.body.style.overflow;
    const { unmount } = render(
      <ConfirmationDialog
        isOpen={true}
        title="Overflow Lock Test"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe(originalOverflow);
  });
});
