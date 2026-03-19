import { Platform, StyleSheet, TextStyle, ViewStyle } from 'react-native';

const Sans = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'sans-serif',
});

export const Colors = {
  cream: '#F9F8F6',
  surface: '#FFFCF8',
  surfaceAlt: '#F3EFE8',
  surfaceTint: '#EAF0E8',
  text: '#2D2D2D',
  textMuted: '#6F6A63',
  sage: '#879C83',
  sageDeep: '#6F866C',
  sageTint: '#E7EEE3',
  gold: '#B89A5F',
  goldTint: '#F5EEE2',
  rose: '#C78375',
  roseTint: '#FBEEEA',
  success: '#7E9A77',
  border: '#E7E0D6',
  borderStrong: '#DAD1C5',
  white: '#FFFFFF',

  // Compatibility aliases for legacy screens.
  trustBlue: '#879C83',
  black: '#2D2D2D',
  background: '#F9F8F6',
  primary: '#879C83',
  primaryText: '#FFFFFF',
  alertYellow: '#B89A5F',
  alertRed: '#C78375',
  alertGreen: '#7E9A77',
} as const;

export const Typography = {
  display: {
    fontFamily: Sans,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: Colors.text,
    letterSpacing: -0.6,
  },
  heading: {
    fontFamily: Sans,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: Colors.text,
  },
  subheading: {
    fontFamily: Sans,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: Colors.text,
  },
  body: {
    fontFamily: Sans,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },
  bodySmall: {
    fontFamily: Sans,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textMuted,
  },
  label: {
    fontFamily: Sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: Colors.textMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },
  button: {
    fontFamily: Sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: Colors.white,
  },

  // Compatibility aliases for legacy screens.
  value: {
    fontFamily: Sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: Colors.text,
  },
  valueSmall: {
    fontFamily: Sans,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textMuted,
  },
} as const;

export const Radii = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

export const Spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
} as const;

export const Borders = {
  subtle: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
  },
  standard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radii.lg,
  },
  pill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderStrong,
    borderRadius: Radii.pill,
  },
} as const;

export const Shadows = {
  card: {
    shadowColor: '#2D2D2D',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 3,
  },
  soft: {
    shadowColor: '#2D2D2D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
} as const;

export const Surfaces = {
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  } as ViewStyle,
  card: {
    ...Borders.standard,
    ...Shadows.card,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
  } as ViewStyle,
  cardMuted: {
    ...Borders.standard,
    backgroundColor: Colors.surfaceAlt,
    padding: Spacing.md,
  } as ViewStyle,
  pill: {
    ...Borders.pill,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  } as ViewStyle,
  input: {
    ...Borders.standard,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  } as ViewStyle,
} as const;

export const Buttons = {
  primary: {
    ...Shadows.soft,
    backgroundColor: Colors.sage,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  secondary: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderStrong,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  soft: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
} as const;

export const Imagery = {
  placeholder: {
    ...Borders.standard,
    borderRadius: Radii.xl,
    backgroundColor: '#EEE5D9',
    overflow: 'hidden',
    minHeight: 220,
  } as ViewStyle,
} as const;

export const ActionCard = {
  container: {
    ...Surfaces.card,
    backgroundColor: Colors.surface,
  },
  title: {
    ...Typography.heading,
  },
  value: {
    ...Typography.body,
  },
} as const;
