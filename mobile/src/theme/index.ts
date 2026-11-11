export const colors = {
  primary: '#247653',
  primaryDark: '#174D39',
  primaryLight: '#EAF5F0',
  secondary: '#168B91',
  secondaryLight: '#E8F6F6',
  background: '#F6F8F6',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F4F1',
  border: '#E3EAE5',
  borderDark: '#C8D5CD',
  
  textPrimary: '#1D2A23',
  textSecondary: '#708078',
  textMuted: '#95A59D',
  textInverse: '#FFFFFF',

  // Status colors
  success: '#059669',
  successLight: '#D1FAE5',
  successBorder: '#A7F3D0',

  warning: '#D97706',
  warningLight: '#FEF3C7',
  warningBorder: '#FDE68A',

  critical: '#DC2626',
  criticalLight: '#FEE2E2',
  criticalBorder: '#FECACA',

  info: '#2563EB',
  infoLight: '#DBEAFE',
  infoBorder: '#BFDBFE',

  // Provenance badges
  badgeLive: '#059669',
  badgeDemo: '#7C3AED',
  badgeCached: '#D97706',
  badgeOffline: '#64748B',
  badgeStale: '#EA580C',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const shadows = {
  subtle: {
    shadowColor: '#174D39',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  card: {
    shadowColor: '#174D39',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  elevated: {
    shadowColor: '#174D39',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
} as const;

export const typography = {
  headingXl: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    color: colors.textPrimary,
  },
  headingLg: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  headingMd: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  headingSm: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bodyLg: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bodyMd: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  bodySm: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
    color: colors.textSecondary,
  },
  metricLarge: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 38,
    color: colors.textPrimary,
  },
  metricMedium: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
    color: colors.textPrimary,
  },
} as const;

export const theme = {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
};

export default theme;
