// Project Dhanvanthri — Neo-Brutalist Wellness Theme
// Design spec: 90% monochromatic + 10% Trust Blue (#0047AB)

export const Colors = {
  // Primary palette
  trustBlue: '#0047AB',
  black: '#000000',
  white: '#FFFFFF',

  // Semantic
  background: '#FFFFFF',
  text: '#000000',
  primary: '#0047AB',
  primaryText: '#FFFFFF',

  // Alert states (inventory engine)
  alertYellow: '#FFC107',
  alertRed: '#D32F2F',
  alertGreen: '#388E3C',

  // Borders
  border: '#000000',
} as const;

export const Typography = {
  // Serif: headers, names, trust-establishing text
  heading: {
    fontFamily: 'PlayfairDisplay-Bold',
    fontSize: 24,
    color: Colors.text,
  },
  subheading: {
    fontFamily: 'PlayfairDisplay-Regular',
    fontSize: 18,
    color: Colors.text,
  },
  // Monospace: clinical data, vitals, inventory counts
  value: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 16,
    color: Colors.text,
  },
  valueSmall: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    color: Colors.text,
  },
  // Body
  body: {
    fontFamily: 'System',
    fontSize: 15,
    color: Colors.text,
  },
} as const;

export const Borders = {
  standard: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 0, // Neo-brutalist: no rounding
  },
} as const;

export const Shadows = {
  // 8px soft diffusion shadow (Neo-Brutalist Wellness spec)
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4, // Android
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

// Action Card: sticky high-contrast blocks for critical triggers
export const ActionCard = {
  container: {
    ...Borders.standard,
    ...Shadows.card,
    backgroundColor: Colors.trustBlue,
    padding: Spacing.md,
  },
  title: {
    ...Typography.heading,
    color: Colors.primaryText,
  },
  value: {
    ...Typography.value,
    color: Colors.primaryText,
  },
} as const;
