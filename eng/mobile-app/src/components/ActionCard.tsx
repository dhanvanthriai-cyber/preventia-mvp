import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Buttons, Colors, Radii, Shadows, Spacing, Typography } from '../theme/theme';

export type ActionCardUrgency = 'normal' | 'warning' | 'critical';

export interface ActionCardProps {
  title: string;
  subtitle?: string;
  value?: string;
  urgency?: ActionCardUrgency;
  ctaLabel?: string;
  onPress: () => void;
  isSticky?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
}

const URGENCY_STYLES: Record<
  ActionCardUrgency,
  { bg: string; border: string; title: string; body: string; ctaBg: string; ctaText: string }
> = {
  normal: {
    bg: Colors.surface,
    border: Colors.border,
    title: Colors.text,
    body: Colors.textMuted,
    ctaBg: Colors.sage,
    ctaText: Colors.white,
  },
  warning: {
    bg: Colors.goldTint,
    border: 'rgba(184, 154, 95, 0.22)',
    title: Colors.text,
    body: '#8C6F37',
    ctaBg: Colors.surface,
    ctaText: Colors.text,
  },
  critical: {
    bg: Colors.roseTint,
    border: 'rgba(199, 131, 117, 0.22)',
    title: Colors.text,
    body: Colors.rose,
    ctaBg: Colors.surface,
    ctaText: Colors.rose,
  },
};

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  subtitle,
  value,
  urgency = 'normal',
  ctaLabel,
  onPress,
  isSticky = false,
  disabled = false,
  testID,
  style,
}) => {
  const colors = URGENCY_STYLES[urgency];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={ctaLabel ?? title}
      style={({ pressed }) => [
        styles.card,
        isSticky && styles.sticky,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : disabled ? 0.52 : 1,
          transform: [{ scale: pressed ? 0.995 : 1 }],
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.title, { color: colors.title }]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.body }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {value ? (
          <Text style={[styles.value, { color: colors.body }]}>{value}</Text>
        ) : null}
      </View>

      {ctaLabel ? (
        <View style={[styles.ctaBtn, { backgroundColor: colors.ctaBg }]}>
          <Text style={[styles.ctaText, { color: colors.ctaText }]}>{ctaLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    ...Shadows.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    gap: Spacing.md,
  } as ViewStyle,

  sticky: {
    marginTop: Spacing.sm,
  } as ViewStyle,

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },

  title: {
    ...Typography.subheading,
    flexShrink: 1,
  },

  subtitle: {
    ...Typography.bodySmall,
  },

  value: {
    ...Typography.body,
    fontWeight: '600',
    textAlign: 'right',
  },

  ctaBtn: {
    ...Buttons.secondary,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },

  ctaText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
});

export default ActionCard;
