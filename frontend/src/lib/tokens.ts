/**
 * Design Tokens Configuration ("Linen & Logic" / Editorial Minimalism)
 *
 * Single configuration file importable by all UI modules defining:
 * - Spacing scale
 * - Typography
 * - Accent color & Neutral grays
 * - Border radii
 * - Elevation / Shadows
 */

export const spacing = {
  unit: '8px',
  gutter: '24px',
  marginMobile: '20px',
  marginDesktop: '64px',
  editorialGap: '80px',

  // Numeric scale (multiples of 4/8px)
  0: '0px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

export const typography = {
  fontFamilies: {
    serif: 'Libre Caslon Text, Georgia, serif',
    sans: 'DM Sans, system-ui, sans-serif',
  },
  styles: {
    displayLg: {
      fontFamily: 'Libre Caslon Text, Georgia, serif',
      fontSize: '48px',
      fontWeight: '400',
      lineHeight: '1.1',
      letterSpacing: '-0.02em',
    },
    displayLgMobile: {
      fontFamily: 'Libre Caslon Text, Georgia, serif',
      fontSize: '36px',
      fontWeight: '400',
      lineHeight: '1.1',
    },
    headlineMd: {
      fontFamily: 'Libre Caslon Text, Georgia, serif',
      fontSize: '32px',
      fontWeight: '400',
      lineHeight: '1.2',
    },
    headlineSm: {
      fontFamily: 'Libre Caslon Text, Georgia, serif',
      fontSize: '24px',
      fontWeight: '400',
      lineHeight: '1.3',
    },
    bodyLg: {
      fontFamily: 'DM Sans, system-ui, sans-serif',
      fontSize: '18px',
      fontWeight: '400',
      lineHeight: '1.6',
      letterSpacing: '0.01em',
    },
    bodyMd: {
      fontFamily: 'DM Sans, system-ui, sans-serif',
      fontSize: '16px',
      fontWeight: '400',
      lineHeight: '1.6',
    },
    labelCaps: {
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

export const colors = {
  // Neutral accent color (Tobacco / Primary)
  accent: {
    primary: '#59452b',
    onPrimary: '#ffffff',
    container: '#735c41',
    onContainer: '#f5d6b4',
    tint: '#715a3f',
    hover: '#453520',
  },

  // Neutral grays & surfaces ("Linen & Logic" warm tones)
  grays: {
    50: '#fbf9f4',  // Warm White surface
    100: '#f5f3ee', // Surface container low
    200: '#f0eee9', // Surface container
    300: '#eae8e3', // Surface container high
    400: '#e4e2dd', // Bone / Surface container highest
    500: '#dbdad5', // Surface dim
    600: '#d1c4b9', // Outline variant
    700: '#80756b', // Outline
    800: '#4e453d', // On surface variant
    900: '#1b1c19', // Tobacco dark / On surface
  },

  // Structural Surfaces
  surface: {
    base: '#fbf9f4',
    dim: '#dbdad5',
    bright: '#fbf9f4',
    containerLowest: '#ffffff',
    containerLow: '#f5f3ee',
    container: '#f0eee9',
    containerHigh: '#eae8e3',
    containerHighest: '#e4e2dd',
    onSurface: '#1b1c19',
    onSurfaceVariant: '#4e453d',
    inverseSurface: '#30312e',
    inverseOnSurface: '#f2f1ec',
    outline: '#80756b',
    outlineVariant: '#d1c4b9',
    surfaceTint: '#715a3f',
  },

  // Secondary & Tertiary
  secondary: {
    main: '#a43b2c',
    onSecondary: '#ffffff',
    container: '#fd7d69',
    onContainer: '#71160b',
  },

  tertiary: {
    main: '#374a5f',
    onTertiary: '#ffffff',
    container: '#4f6278',
    onContainer: '#caddf8',
  },

  // Status & Feedback
  error: {
    main: '#ba1a1a',
    onError: '#ffffff',
    container: '#ffdad6',
    onContainer: '#93000a',
  },

  success: {
    main: '#2e6b38',
    onSuccess: '#ffffff',
    container: '#e2f3e4',
    onContainer: '#0d3814',
  },

  warning: {
    main: '#845300',
    onWarning: '#ffffff',
    container: '#fff0d6',
    onContainer: '#472a00',
  },
} as const;

export const radii = {
  sm: '0.125rem',
  default: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  full: '9999px',
} as const;

export const shadows = {
  ambient: '0 10px 20px rgba(115, 92, 65, 0.08)',
  subtle: '0 4px 12px rgba(115, 92, 65, 0.05)',
  lifted: '0 20px 30px rgba(115, 92, 65, 0.12)',
} as const;

export const tokens = {
  spacing,
  typography,
  colors,
  radii,
  shadows,
} as const;

export default tokens;
