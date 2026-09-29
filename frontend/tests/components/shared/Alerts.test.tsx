import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  Alert,
  ErrorAlert,
  SuccessAlert,
  ErrorIcon,
  SuccessIcon,
  WarningIcon,
  InfoIcon,
  CloseIcon,
} from '../../../src/components/shared/Alerts';

describe('Alerts components', () => {
  describe('ErrorAlert', () => {
    it('renders with default title "Error" and message', () => {
      render(<ErrorAlert message="Failed to save company record." />);

      const alert = screen.getByTestId('error-alert');
      expect(alert).toBeDefined();
      expect(screen.getByText('Error')).toBeDefined();
      expect(screen.getByText('Failed to save company record.')).toBeDefined();
    });

    it('has semantic role="alert" and aria-live="assertive"', () => {
      render(<ErrorAlert message="Something went wrong." />);

      const alert = screen.getByRole('alert');
      expect(alert.getAttribute('aria-live')).toBe('assertive');
    });

    it('has aria-describedby pointing to description element ID', () => {
      render(<ErrorAlert message="Validation failed for field email." />);

      const alert = screen.getByRole('alert');
      const describedById = alert.getAttribute('aria-describedby');
      expect(describedById).toBeTruthy();

      const descElement = document.getElementById(describedById!);
      expect(descElement).not.toBeNull();
      expect(descElement?.textContent).toContain('Validation failed for field email.');
    });

    it('extracts error message from string error prop', () => {
      render(<ErrorAlert error="Network request failed" />);

      expect(screen.getByText('Network request failed')).toBeDefined();
    });

    it('extracts error message from Error object prop', () => {
      render(<ErrorAlert error={new Error('Database connection timeout')} />);

      expect(screen.getByText('Database connection timeout')).toBeDefined();
    });

    it('renders details array as semantic list', () => {
      render(
        <ErrorAlert
          message="Validation errors occurred"
          details={['Name is required', 'Email is invalid']}
        />
      );

      const list = screen.getByTestId('error-alert-details-list');
      expect(list.tagName).toBe('UL');

      const items = screen.getAllByRole('listitem');
      expect(items.length).toBe(2);
      expect(items[0].textContent).toBe('Name is required');
      expect(items[1].textContent).toBe('Email is invalid');
    });

    it('calls onClose when close button is clicked', () => {
      const handleClose = vi.fn();
      render(<ErrorAlert message="Dismissable error" onClose={handleClose} />);

      const closeButton = screen.getByTestId('error-alert-close-button');
      fireEvent.click(closeButton);

      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('SuccessAlert', () => {
    it('renders with default title "Success" and message', () => {
      render(<SuccessAlert message="Lead created successfully." />);

      const alert = screen.getByTestId('success-alert');
      expect(alert).toBeDefined();
      expect(screen.getByText('Success')).toBeDefined();
      expect(screen.getByText('Lead created successfully.')).toBeDefined();
    });

    it('has semantic role="status" and aria-live="polite"', () => {
      render(<SuccessAlert message="Task completed." />);

      const alert = screen.getByRole('status');
      expect(alert.getAttribute('aria-live')).toBe('polite');
    });

    it('has aria-describedby pointing to description element ID', () => {
      render(<SuccessAlert message="Contact updated." />);

      const alert = screen.getByRole('status');
      const describedById = alert.getAttribute('aria-describedby');
      expect(describedById).toBeTruthy();

      const descElement = document.getElementById(describedById!);
      expect(descElement).not.toBeNull();
      expect(descElement?.textContent).toContain('Contact updated.');
    });

    it('supports custom title', () => {
      render(<SuccessAlert title="Operation Complete" message="All data synced." />);

      expect(screen.getByText('Operation Complete')).toBeDefined();
    });
  });

  describe('Generic Alert & Customizations', () => {
    it('renders warning variant with warning icon and custom role', () => {
      render(
        <Alert
          variant="warning"
          title="Warning"
          message="Disk space running low."
        />
      );

      expect(screen.getByTestId('warning-alert')).toBeDefined();
      expect(screen.getByTestId('warning-alert-icon')).toBeDefined();
    });

    it('renders info variant', () => {
      render(
        <Alert
          variant="info"
          title="Information"
          message="New updates available."
        />
      );

      expect(screen.getByTestId('info-alert')).toBeDefined();
      expect(screen.getByTestId('info-alert-icon')).toBeDefined();
    });

    it('hides icon when hideIcon is true', () => {
      render(
        <ErrorAlert message="No icon alert" hideIcon />
      );

      expect(screen.queryByTestId('error-alert-icon')).toBeNull();
    });

    it('renders custom icon when icon prop is provided', () => {
      render(
        <ErrorAlert
          message="Custom icon"
          icon={<span data-testid="custom-icon">⚠️</span>}
        />
      );

      expect(screen.getByTestId('custom-icon')).toBeDefined();
      expect(screen.getByTestId('custom-icon').textContent).toBe('⚠️');
    });

    it('supports custom aria-describedby and aria-labelledby overrides', () => {
      render(
        <Alert
          variant="error"
          title="Custom ARIA"
          message="Testing custom IDs"
          titleId="my-custom-title-id"
          descriptionId="my-custom-desc-id"
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert.getAttribute('aria-labelledby')).toBe('my-custom-title-id');
      expect(alert.getAttribute('aria-describedby')).toBe('my-custom-desc-id');
    });

    it('hides icons from screen readers with aria-hidden="true"', () => {
      render(<ErrorAlert message="Icon accessibility check" />);

      const icon = screen.getByTestId('error-alert-icon');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    it('renders action elements when actions prop is provided', () => {
      render(
        <ErrorAlert
          message="Connection failed"
          actions={<button data-testid="retry-btn">Retry</button>}
        />
      );

      expect(screen.getByTestId('retry-btn')).toBeDefined();
    });

    it('renders children nodes when message prop is absent', () => {
      render(
        <ErrorAlert title="Child Error">
          <span data-testid="child-msg">Detail inside children</span>
        </ErrorAlert>
      );

      expect(screen.getByTestId('child-msg')).toBeDefined();
    });

    it('does not rely on color alone (renders text heading, icon, and distinct border styling)', () => {
      render(<ErrorAlert message="No color alone error check" />);

      const alert = screen.getByRole('alert');
      expect(screen.getByText('Error')).toBeDefined();
      expect(screen.getByTestId('error-alert-icon')).toBeDefined();
      expect(alert.style.border).toBeDefined();
      expect(alert.style.border).not.toBe('');
    });

    it('renders standalone icon components', () => {
      render(
        <div>
          <ErrorIcon />
          <SuccessIcon />
          <WarningIcon />
          <InfoIcon />
          <CloseIcon />
        </div>
      );

      expect(screen.getByTestId('error-alert-icon')).toBeDefined();
      expect(screen.getByTestId('success-alert-icon')).toBeDefined();
      expect(screen.getByTestId('warning-alert-icon')).toBeDefined();
      expect(screen.getByTestId('info-alert-icon')).toBeDefined();
      expect(screen.getByTestId('alert-close-icon')).toBeDefined();
    });
  });
});
