import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  StatusBadge,
  deriveVariantFromStatus,
  formatStatusLabel,
} from '../../../src/components/shared/StatusBadge';

describe('StatusBadge', () => {
  it('renders text label when explicit label prop is provided', () => {
    render(<StatusBadge label="Custom Active" variant="success" />);

    const badge = screen.getByRole('status', { name: 'Status: Custom Active' });
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('Custom Active');
  });

  it('formats status string into Title Case label when label prop is omitted', () => {
    render(<StatusBadge status="in_progress" />);

    const badge = screen.getByRole('status', { name: 'Status: In Progress' });
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('In Progress');
  });

  it('renders default icon for each variant (success, warning, error, info, neutral)', () => {
    const { rerender } = render(<StatusBadge variant="success" label="Success" />);
    expect(screen.getByTestId('status-badge-icon-success')).toBeDefined();

    rerender(<StatusBadge variant="warning" label="Warning" />);
    expect(screen.getByTestId('status-badge-icon-warning')).toBeDefined();

    rerender(<StatusBadge variant="error" label="Error" />);
    expect(screen.getByTestId('status-badge-icon-error')).toBeDefined();

    rerender(<StatusBadge variant="info" label="Info" />);
    expect(screen.getByTestId('status-badge-icon-info')).toBeDefined();

    rerender(<StatusBadge variant="neutral" label="Neutral" />);
    expect(screen.getByTestId('status-badge-icon-neutral')).toBeDefined();
  });

  it('renders custom icon when provided', () => {
    render(
      <StatusBadge
        label="Custom Icon Status"
        icon={<span data-testid="custom-star-icon">★</span>}
      />
    );

    expect(screen.getByTestId('custom-star-icon')).toBeDefined();
    expect(screen.getByTestId('custom-star-icon').textContent).toBe('★');
  });

  it('includes accessible role="status" and default aria-label', () => {
    render(<StatusBadge status="completed" />);

    const badge = screen.getByRole('status');
    expect(badge.getAttribute('aria-label')).toBe('Status: Completed');
  });

  it('supports custom aria-label override', () => {
    render(<StatusBadge status="completed" ariaLabel="Lead status: Completed" />);

    const badge = screen.getByRole('status', { name: 'Lead status: Completed' });
    expect(badge).toBeDefined();
  });

  it('hides icon from screen readers with aria-hidden="true"', () => {
    render(<StatusBadge status="overdue" />);

    const iconSvg = screen.getByTestId('status-badge-icon-error');
    expect(iconSvg.getAttribute('aria-hidden')).toBe('true');
  });

  it('does not rely on color alone (renders text label, icon, and distinct border styling)', () => {
    render(<StatusBadge status="overdue" />);

    const badge = screen.getByRole('status');
    // Verify text label is rendered
    expect(badge.textContent).toContain('Overdue');
    // Verify icon SVG is present
    expect(screen.getByTestId('status-badge-icon-error')).toBeDefined();
    // Verify border style is present
    expect(badge.style.border).toBeDefined();
    expect(badge.style.border).not.toBe('');
  });

  it('renders with default props when no arguments are provided', () => {
    render(<StatusBadge />);

    const badge = screen.getByRole('status', { name: 'Status: Status' });
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('Status');
    expect(screen.getByTestId('status-badge-icon-neutral')).toBeDefined();
  });

  it('derives variant correctly from raw status strings', () => {
    expect(deriveVariantFromStatus('completed')).toBe('success');
    expect(deriveVariantFromStatus('won')).toBe('success');
    expect(deriveVariantFromStatus('active')).toBe('success');
    expect(deriveVariantFromStatus('done')).toBe('success');
    expect(deriveVariantFromStatus('passed')).toBe('success');
    expect(deriveVariantFromStatus('in_progress')).toBe('warning');
    expect(deriveVariantFromStatus('pending')).toBe('warning');
    expect(deriveVariantFromStatus('scheduled')).toBe('warning');
    expect(deriveVariantFromStatus('waiting')).toBe('warning');
    expect(deriveVariantFromStatus('overdue')).toBe('error');
    expect(deriveVariantFromStatus('lost')).toBe('error');
    expect(deriveVariantFromStatus('failed')).toBe('error');
    expect(deriveVariantFromStatus('blocked')).toBe('error');
    expect(deriveVariantFromStatus('cancelled')).toBe('error');
    expect(deriveVariantFromStatus('new')).toBe('info');
    expect(deriveVariantFromStatus('draft')).toBe('info');
    expect(deriveVariantFromStatus('open')).toBe('info');
    expect(deriveVariantFromStatus('custom_unknown_state')).toBe('neutral');
    expect(deriveVariantFromStatus(undefined)).toBe('neutral');
  });

  it('formats status label strings correctly', () => {
    expect(formatStatusLabel('in_progress')).toBe('In Progress');
    expect(formatStatusLabel('OVERDUE')).toBe('Overdue');
    expect(formatStatusLabel('a_b_c_d')).toBe('A B C D');
    expect(formatStatusLabel(undefined, 'success')).toBe('Success');
    expect(formatStatusLabel(undefined, undefined)).toBe('Status');
  });

  it('supports sm, md, and lg sizes', () => {
    const { rerender } = render(<StatusBadge status="active" size="sm" />);
    let badge = screen.getByRole('status');
    expect(badge.style.fontSize).toBe('11px');

    rerender(<StatusBadge status="active" size="md" />);
    badge = screen.getByRole('status');
    expect(badge.style.fontSize).toBe('12px');

    rerender(<StatusBadge status="active" size="lg" />);
    badge = screen.getByRole('status');
    expect(badge.style.fontSize).toBe('14px');
  });

  it('accepts custom className and style props', () => {
    render(
      <StatusBadge
        status="active"
        className="my-custom-badge-class"
        style={{ marginTop: '10px' }}
      />
    );

    const badge = screen.getByRole('status');
    expect(badge.classList.contains('my-custom-badge-class')).toBe(true);
    expect(badge.style.marginTop).toBe('10px');
  });
});
