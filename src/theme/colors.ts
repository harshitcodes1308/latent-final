/**
 * App color palette - Warm Modern Health Theme
 * Soft cream backgrounds with coral/terracotta accent cards
 * Inspired by modern health & wellness app design
 */
export const AppColors = {
  // Backgrounds - Warm cream/beige
  primaryLight: '#FFF8F2',
  primaryBg: '#FFF0E6',
  primaryMid: '#FFE8D9',
  surfaceCard: '#FFFFFF',
  surfaceElevated: '#FFF5EE',

  // NOT USED for backward compat — mapped to new palette
  primaryDark: '#FFF8F2',

  // Coral gradient accent
  purpleGradientStart: '#E8573E',
  purpleGradientEnd: '#F4845F',
  purpleLight: '#F9B4A0',
  purpleMuted: '#FCDDD4',
  purpleSoft: '#FFF0EB',

  // Primary accent - Coral/Terracotta
  accentPrimary: '#E8573E',
  accentSecondary: '#F4845F',
  accentTeal: '#E8573E', // backward compat alias
  accentTealLight: '#F4845F',
  accentTealDark: '#D04530',
  accentCyan: '#E8573E', // backward compat
  accentViolet: '#D04530',
  accentPink: '#E8573E',
  accentGreen: '#4CAF7D',
  accentOrange: '#F5A623',

  // Text colors
  textPrimary: '#2D2D3A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  // Status colors
  success: '#4CAF7D',
  warning: '#F5A623',
  error: '#E8573E',
  info: '#5B9BD5',

  // Transaction icon colors
  iconOrange: '#F4845F',
  iconBlue: '#5B9BD5',
  iconGreen: '#4CAF7D',
  iconPurple: '#B68DD9',
  iconPink: '#E8573E',
  iconTeal: '#4CAF7D',

  // Glassmorphism / card styling
  glassBg: 'rgba(255, 255, 255, 0.7)',
  glassBgLight: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(232, 87, 62, 0.12)',
  glassBorderLight: 'rgba(232, 87, 62, 0.08)',

  // Shadow
  shadowPurple: '#E8573E',
  shadowDark: 'rgba(0, 0, 0, 0.08)',
} as const;

export type AppColorsType = typeof AppColors;
