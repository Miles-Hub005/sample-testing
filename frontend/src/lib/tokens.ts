/**
 * Design Tokens Configuration
 * Single config file with spacing scale, typography, neutral accent color, and neutral grays.
 * Importable by all UI modules (FR-6).
 */

export const spacing = {
  unit: 4,
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
  gutter: '24px',
  marginMobile: '20px',
  marginDesktop: '64px',
  editorialGap: '80px',
} as const;

export const colors = {
  /** Neutral grays scale (50-900) */
  grays: {
    50: '#f9f9f8',
    100: '#f0f0ee',
    200: '#e4e2dd',
    300: '#d1c4b9',
    400: '#a39b92',
    500: '#80756b',
    600: '#5e564d',
    700: '#4e453d',
    800: '#30312e',
    900: '#1b1c19',
  },

  /** Neutral Canvas & Surface tokens */
  surface: {
    background: '#fbf9f4',
    dim: '#dbdad5',
    bright: '#fbf9f4',
    containerLowest: '#ffffff',
    containerLow: '#f5f3ee',
    container: '#f0eee9',
    containerHigh: '#eae8e3',
    containerHighest: '#e4e2dd',
    onSurface: '#1b1c19',
    onSurfaceVariant: '#4e453d',

    // Compatibility aliases used by existing UI components
    surfaceContainerLow: '#f5f3ee',
    surfaceContainerHigh: '#eae8e3',
  },

  /** Single neutral accent color (FR-6) */
  accent: {
    DEFAULT: '#59452b',
    light: '#735c41',
    dark: '#281804',
    onAccent: '#ffffff',
    container: '#f5d6b4',
    onContainer: '#58432a',
  },

  /** Border & Outline tokens */
  border: '#80756b',
  borderVariant: '#d1c4b9',
  outline: '#80756b',

  /** Functional / State colors */
  error: '#ba1a1a',
  success: '#2e7d32',
  warning: '#ed6c02',
  info: '#0288d1',

  /** Component state tokens */
  status: {
    error: '#ba1a1a',
    errorContainer: '#ffdad6',
    onError: '#ffffff',
    onErrorContainer: '#410002',

    success: '#2e7d32',
    warning: '#ed6c02',
    info: '#0288d1',
  },
} as const;

export const typography = {
  fontFamily: {
    serif: 'Libre Caslon Text, Georgia, serif',
    sans: 'DM Sans, system-ui, sans-serif',
  },
  sizes: {
    'display-lg': {
      fontFamily: 'Libre Caslon Text, Georgia, serif',
      fontSize: '48px',
      fontWeight: '400',
      lineHeight: '1.1',
      letterSpacing: '-0.02em',
    },
    'display-lg-mobile': {
      fontFamily: 'Libre Caslon Text, Georgia, serif',
      fontSize: '36px',
      fontWeight: '400',
      lineHeight: '1.1',
    },
    'headline-md': {
      fontFamily: 'Libre Caslon Text, Georgia, serif',
      fontSize: '32px',
      fontWeight: '400',
      lineHeight: '1.2',
    },
    'headline-sm': {
      fontFamily: 'Libre Caslon Text, Georgia, serif',
      fontSize: '24px',
      fontWeight: '400',
      lineHeight: '1.3',
    },
    'body-lg': {
      fontFamily: 'DM Sans, system-ui, sans-serif',
      fontSize: '18px',
      fontWeight: '400',
      lineHeight: '1.6',
      letterSpacing: '0.01em',
    },
    'body-md': {
      fontFamily: 'DM Sans, system-ui, sans-serif',
      fontSize: '16px',
      fontWeight: '400',
      lineHeight: '1.6',
    },
    'body-sm': {
      fontFamily: 'DM Sans, system-ui, sans-serif',
      fontSize: '14px',
      fontWeight: '400',
      lineHeight: '1.5',
    },
    'label-caps': {
      fontFamily: 'DM Sans, system-ui, sans-serif',
      fontSize: '12px',
      fontWeight: '500',
      lineHeight: '1.4',
      letterSpacing: '0.1em',
    },
    caption: {
      fontFamily: 'DM Sans, system-ui, sans-serif',
      fontSize: '13px',
      fontWeight: '400',
      lineHeight: '1.4',
    },
  },
} as const;

export const rounded = {
  none: '0px',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgba(115, 92, 65, 0.05)',
  md: '0 4px 6px -1px rgba(115, 92, 65, 0.08), 0 2px 4px -1px rgba(115, 92, 65, 0.04)',
  lg: '0 10px 15px -3px rgba(115, 92, 65, 0.08), 0 4px 6px -2px rgba(115, 92, 65, 0.04)',
  ambient: '0 20px 25px -5px rgba(115, 92, 65, 0.08)',
} as const;

export const tokens = {
  spacing,
  colors,
  typography,
  rounded,
  shadows,
} as const;

export type SpacingTokens = typeof spacing;
export type ColorTokens = typeof colors;
export type TypographyTokens = typeof typography;
export type RoundedTokens = typeof rounded;
export type ShadowTokens = typeof shadows;

export default tokens;
