import { Colors } from './colors';

export const Typography = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    lineHeight: 34,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  small: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textMuted,
    lineHeight: 16,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
  },
};
