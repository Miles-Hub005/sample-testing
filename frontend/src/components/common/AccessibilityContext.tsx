'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface AccessibilityContextType {
  announcement: string;
  politeness: 'polite' | 'assertive';
  announce: (message: string, politeness?: 'polite' | 'assertive') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export interface AccessibilityProviderProps {
  children: ReactNode;
}

/**
 * Provider managing global accessibility live region announcements.
 * Enables WCAG 2.1 AA compliant dynamic screen reader updates across pages and components.
 */
export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [announcement, setAnnouncement] = useState<string>('');
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite');

  const announce = useCallback((message: string, mode: 'polite' | 'assertive' = 'polite') => {
    setPoliteness(mode);
    setAnnouncement(message);
  }, []);

  return (
    <AccessibilityContext.Provider value={{ announcement, politeness, announce }}>
      {children}
      <div
        id="a11y-announcement"
        role="status"
        aria-live={politeness}
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </AccessibilityContext.Provider>
  );
};

/**
 * Hook to consume the global accessibility context.
 */
export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    return {
      announcement: '',
      politeness: 'polite',
      announce: () => {},
    };
  }
  return context;
};
