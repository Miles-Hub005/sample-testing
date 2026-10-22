import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AccessibilityProvider, useAccessibility } from '../../src/components/common/AccessibilityContext';

const TestComponent = () => {
  const { announce } = useAccessibility();

  return (
    <div>
      <button onClick={() => announce('Dashboard updated successfully')}>
        Trigger Announcement
      </button>
      <button onClick={() => announce('Critical error occurred', 'assertive')}>
        Trigger Assertive Error
      </button>
    </div>
  );
};

describe('AccessibilityContext', () => {
  it('renders children and live region container', () => {
    render(
      <AccessibilityProvider>
        <div>Content Inside Provider</div>
      </AccessibilityProvider>
    );

    expect(screen.getByText('Content Inside Provider')).toBeInTheDocument();
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveClass('sr-only');
  });

  it('updates aria-live announcement when announce is invoked', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const triggerBtn = screen.getByRole('button', { name: /trigger announcement/i });
    fireEvent.click(triggerBtn);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveTextContent('Dashboard updated successfully');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('supports assertive politeness level for critical notifications', () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );

    const errorBtn = screen.getByRole('button', { name: /trigger assertive error/i });
    fireEvent.click(errorBtn);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveTextContent('Critical error occurred');
    expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
  });
});
