import type { CSSProperties } from 'react';

export const webTheme = {
  colors: {
    background: '#F9F8F6',
    surface: '#FFFCF8',
    surfaceAlt: '#F4EFE7',
    surfaceTint: '#EEF2EA',
    text: '#2D2D2D',
    mutedText: '#6F6A63',
    accent: '#879C83',
    accentStrong: '#6F866C',
    accentTint: '#E7EEE3',
    gold: '#B89A5F',
    goldTint: '#F5EEE2',
    rose: '#C78375',
    roseTint: '#FBEEEA',
    success: '#7E9A77',
    border: '#E7E0D6',
    borderStrong: '#D9D0C4',
    white: '#FFFFFF',
  },
  radius: {
    sm: 16,
    md: 20,
    lg: 28,
    xl: 36,
    pill: 999,
  },
  shadow: {
    soft: '0 16px 40px rgba(45, 45, 45, 0.08), 0 3px 10px rgba(45, 45, 45, 0.04)',
    inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.65)',
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  font: {
    sans: '"Inter", "Outfit", "Avenir Next", "Segoe UI", system-ui, sans-serif',
  },
  maxWidth: 1180,
} as const;

export const textStyles = {
  eyebrow: {
    fontFamily: webTheme.font.sans,
    fontSize: 12,
    lineHeight: '18px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: webTheme.colors.mutedText,
  },
  title: {
    fontFamily: webTheme.font.sans,
    fontSize: 18,
    lineHeight: '24px',
    fontWeight: 600,
    color: webTheme.colors.text,
  },
  display: {
    fontFamily: webTheme.font.sans,
    fontSize: 40,
    lineHeight: '46px',
    fontWeight: 600,
    color: webTheme.colors.text,
    letterSpacing: '-0.03em',
  },
  body: {
    fontFamily: webTheme.font.sans,
    fontSize: 15,
    lineHeight: '24px',
    color: webTheme.colors.text,
  },
  muted: {
    fontFamily: webTheme.font.sans,
    fontSize: 14,
    lineHeight: '22px',
    color: webTheme.colors.mutedText,
  },
  label: {
    fontFamily: webTheme.font.sans,
    fontSize: 13,
    lineHeight: '18px',
    fontWeight: 600,
    color: webTheme.colors.text,
  },
} satisfies Record<string, CSSProperties>;

export const pageShell: CSSProperties = {
  maxWidth: webTheme.maxWidth,
  margin: '0 auto',
  padding: '24px 20px 72px',
};

export const stack = (gap = webTheme.spacing.lg): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap,
});

export const surface = (overrides: CSSProperties = {}): CSSProperties => ({
  backgroundColor: webTheme.colors.surface,
  border: `1px solid ${webTheme.colors.border}`,
  borderRadius: webTheme.radius.lg,
  boxShadow: `${webTheme.shadow.soft}, ${webTheme.shadow.inset}`,
  ...overrides,
});

export const softButton = (
  variant: 'accent' | 'secondary' | 'gold' | 'ghost' | 'rose' = 'accent',
): CSSProperties => {
  const variants = {
    accent: {
      backgroundColor: webTheme.colors.accent,
      color: webTheme.colors.white,
      border: `1px solid ${webTheme.colors.accent}`,
      boxShadow: '0 10px 24px rgba(111, 134, 108, 0.18)',
    },
    secondary: {
      backgroundColor: webTheme.colors.surface,
      color: webTheme.colors.text,
      border: `1px solid ${webTheme.colors.borderStrong}`,
      boxShadow: 'none',
    },
    gold: {
      backgroundColor: webTheme.colors.goldTint,
      color: webTheme.colors.text,
      border: `1px solid ${webTheme.colors.gold}`,
      boxShadow: '0 10px 24px rgba(184, 154, 95, 0.14)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: webTheme.colors.mutedText,
      border: 'none',
      boxShadow: 'none',
    },
    rose: {
      backgroundColor: webTheme.colors.roseTint,
      color: webTheme.colors.rose,
      border: `1px solid rgba(199, 131, 117, 0.3)`,
      boxShadow: 'none',
    },
  } as const;

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 18px',
    borderRadius: webTheme.radius.pill,
    cursor: 'pointer',
    textDecoration: 'none',
    fontFamily: webTheme.font.sans,
    fontSize: 14,
    lineHeight: '20px',
    fontWeight: 600,
    transition: 'transform 140ms ease, opacity 140ms ease',
    ...variants[variant],
  };
};

export const pill = (
  tone: 'accent' | 'gold' | 'neutral' | 'rose' | 'success' = 'neutral',
): CSSProperties => {
  const tones = {
    accent: {
      backgroundColor: webTheme.colors.accentTint,
      color: webTheme.colors.accentStrong,
      border: `1px solid rgba(111, 134, 108, 0.18)`,
    },
    gold: {
      backgroundColor: webTheme.colors.goldTint,
      color: '#8B6D35',
      border: `1px solid rgba(184, 154, 95, 0.22)`,
    },
    neutral: {
      backgroundColor: webTheme.colors.surfaceAlt,
      color: webTheme.colors.mutedText,
      border: `1px solid ${webTheme.colors.border}`,
    },
    rose: {
      backgroundColor: webTheme.colors.roseTint,
      color: webTheme.colors.rose,
      border: `1px solid rgba(199, 131, 117, 0.22)`,
    },
    success: {
      backgroundColor: '#EDF5EA',
      color: webTheme.colors.success,
      border: `1px solid rgba(126, 154, 119, 0.2)`,
    },
  } as const;

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 12px',
    borderRadius: webTheme.radius.pill,
    fontFamily: webTheme.font.sans,
    fontSize: 12,
    lineHeight: '16px',
    fontWeight: 600,
    ...tones[tone],
  };
};

export const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${webTheme.colors.borderStrong}`,
  borderRadius: webTheme.radius.md,
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  padding: '14px 16px',
  fontFamily: webTheme.font.sans,
  fontSize: 15,
  lineHeight: '22px',
  color: webTheme.colors.text,
  outline: 'none',
};

export const photoPlaceholder = (height = 260): CSSProperties => ({
  ...surface({
    minHeight: height,
    overflow: 'hidden',
    position: 'relative',
    background:
      'radial-gradient(circle at top left, rgba(255,255,255,0.9), transparent 34%), linear-gradient(135deg, #EDE6DA 0%, #F7F2EB 42%, #E6EFE5 100%)',
  }),
});

export const divider: CSSProperties = {
  width: '100%',
  height: 1,
  backgroundColor: webTheme.colors.border,
};
