import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  StatusLabel,
  formatStatusLabel,
  getStatusStyleConfig,
} from '../../src/components/common/StatusLabel';

describe('StatusLabel Component', () => {
  describe('Rendering and Content', () => {
    it('renders with default status and auto-formatted label', () => {
      render(<StatusLabel status="active" />);

      const element = screen.getByRole('status');
      expect(element).toBeDefined();
      expect(element.textContent).toContain('Active');
      expect(element.getAttribute('aria-label')).toBe('Status: Active');
    });

    it('formats snake_case and kebab-case status keys into Title Case', () => {
      expect(formatStatusLabel('in_progress')).toBe('In Progress');
      expect(formatStatusLabel('in-progress')).toBe('In Progress');
      expect(formatStatusLabel('FORBIDDEN_ACCESS')).toBe('Forbidden Access');
    });

    it('renders custom label when provided', () => {
      render(<StatusLabel status="error" label="Critical System Failure" />);

      const element = screen.getByRole('status');
      expect(element.textContent).toContain('Critical System Failure');
      expect(element.getAttribute('aria-label')).toBe('Status: Critical System Failure');
    });

    it('renders custom data-testid if supplied', () => {
      render(<StatusLabel status="pending" data-testid="custom-status-badge" />);

      const element = screen.getByTestId('custom-status-badge');
      expect(element).toBeDefined();
    });
  });

  describe('WCAG 2.1 AA Accessibility & ARIA Support', () => {
    it('has role="status" and default aria-live="polite"', () => {
      render(<StatusLabel status="active" />);

      const element = screen.getByRole('status');
      expect(element.getAttribute('role')).toBe('status');
      expect(element.getAttribute('aria-live')).toBe('polite');
    });

    it('allows overriding aria-live mode to assertive or off', () => {
      const { rerender } = render(<StatusLabel status="error" ariaLive="assertive" />);
      let element = screen.getByRole('status');
      expect(element.getAttribute('aria-live')).toBe('assertive');

      rerender(<StatusLabel status="inactive" ariaLive="off" />);
      element = screen.getByRole('status');
      expect(element.getAttribute('aria-live')).toBe('off');
    });

    it('provides custom aria-label when ariaLabel prop is supplied', () => {
      render(<StatusLabel status="forbidden" ariaLabel="Access status: Access Denied" />);

      const element = screen.getByRole('status');
      expect(element.getAttribute('aria-label')).toBe('Access status: Access Denied');
    });

    it('hides visual status dot from screen readers using aria-hidden="true"', () => {
      const { container } = render(<StatusLabel status="active" showDot={true} />);

      const dotElement = container.querySelector('[aria-hidden="true"]');
      expect(dotElement).not.toBeNull();
      expect(dotElement?.getAttribute('aria-hidden')).toBe('true');
    });

    it('removes visual status dot when showDot is false', () => {
      const { container } = render(<StatusLabel status="active" showDot={false} />);

      const dotElement = container.querySelector('[aria-hidden="true"]');
      expect(dotElement).toBeNull();
    });

    it('includes a screen reader text alternative span', () => {
      const { container } = render(<StatusLabel status="success" />);

      const srSpan = container.querySelector('.sr-only');
      expect(srSpan).not.toBeNull();
      expect(srSpan?.textContent).toBe('Status: Success');
    });
  });

  describe('Color Contrast and Variant Category Mapping', () => {
    it('maps success variants to green high-contrast style configuration', () => {
      const activeConfig = getStatusStyleConfig('active');
      const successConfig = getStatusStyleConfig('success');

      expect(activeConfig.category).toBe('success');
      expect(activeConfig.bgClass).toBe('bg-emerald-100');
      expect(activeConfig.textClass).toContain('text-emerald-950');

      expect(successConfig.category).toBe('success');
    });

    it('maps warning variants to amber high-contrast style configuration', () => {
      const warningConfig = getStatusStyleConfig('warning');
      const pendingConfig = getStatusStyleConfig('pending');

      expect(warningConfig.category).toBe('warning');
      expect(pendingConfig.category).toBe('warning');
      expect(pendingConfig.bgClass).toBe('bg-amber-100');
      expect(pendingConfig.textClass).toContain('text-amber-950');
    });

    it('maps error, alert, and forbidden variants to red high-contrast style configuration', () => {
      const errorConfig = getStatusStyleConfig('error');
      const forbiddenConfig = getStatusStyleConfig('forbidden');

      expect(errorConfig.category).toBe('error');
      expect(forbiddenConfig.category).toBe('error');
      expect(forbiddenConfig.bgClass).toBe('bg-red-100');
      expect(forbiddenConfig.textClass).toContain('text-red-950');
    });

    it('maps info and draft variants to blue high-contrast style configuration', () => {
      const infoConfig = getStatusStyleConfig('info');
      const draftConfig = getStatusStyleConfig('draft');

      expect(infoConfig.category).toBe('info');
      expect(draftConfig.category).toBe('info');
      expect(infoConfig.bgClass).toBe('bg-blue-100');
      expect(infoConfig.textClass).toContain('text-blue-950');
    });

    it('defaults unknown or neutral status to stone high-contrast style configuration', () => {
      const neutralConfig = getStatusStyleConfig('neutral');
      const unknownConfig = getStatusStyleConfig('custom_unknown_status');

      expect(neutralConfig.category).toBe('neutral');
      expect(unknownConfig.category).toBe('neutral');
      expect(unknownConfig.bgClass).toBe('bg-stone-100');
      expect(unknownConfig.textClass).toContain('text-stone-900');
    });
  });

  describe('Sizes and Custom Classes', () => {
    it('applies small, medium, and large size classes', () => {
      const { rerender, container } = render(<StatusLabel status="active" size="sm" />);
      let badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('text-xs');

      rerender(<StatusLabel status="active" size="md" />);
      badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('text-xs');

      rerender(<StatusLabel status="active" size="lg" />);
      badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('text-sm');
    });

    it('merges custom className props cleanly', () => {
      const { container } = render(<StatusLabel status="active" className="shadow-sm my-custom-class" />);
      const badge = container.firstChild as HTMLElement;

      expect(badge.className).toContain('shadow-sm');
      expect(badge.className).toContain('my-custom-class');
    });
  });
});
