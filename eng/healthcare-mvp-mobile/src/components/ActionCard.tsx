/**
 * ActionCard — Neo-Brutalist Wellness sticky component
 * Project Dhanvanthri
 *
 * Design spec:
 *  - urgency="normal"   → Trust Blue (#0047AB) background, white text
 *  - urgency="warning"  → Amber (#FFC107) background, black text
 *  - urgency="critical" → Red (#D32F2F) background, white text
 *  - Border: 2px solid #000 (Neo-Brutalist — zero border-radius)
 *  - Shadow: 8px soft diffusion
 *  - isSticky=true → position:absolute, top:0, full-width
 *  - Typography: Playfair Display (title) + JetBrains Mono (value/subtitle)
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, Shadows, Spacing, Typography } from '../theme/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Urgency map
// ---------------------------------------------------------------------------

const URGENCY_STYLES: Record<ActionCardUrgency, { bg: string; text: string; ctaBg: string; ctaText: string }> = {
  normal:   { bg: Colors.trustBlue,   text: Colors.white, ctaBg: Colors.white, ctaText: Colors.trustBlue },
  warning:  { bg: Colors.alertYellow, text: Colors.black, ctaBg: Colors.black, ctaText: Colors.white },
  critical: { bg: Colors.alertRed,    text: Colors.white, ctaBg: Colors.white, ctaText: Colors.alertRed },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
  const c = URGENCY_STYLES[urgency];

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
        { backgroundColor: c.bg, opacity: pressed ? 0.88 : disabled ? 0.45 : 1 },
        style,
      ]}
    >
      {/* Top row: title + value */}
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {title}
        </Text>
        {value ? (
          <Text style={[styles.value, { color: c.text }]}>{value}</Text>
        ) : null}
      </View>

      {/* Subtitle */}
      {subtitle ? (
        <Text style={[styles.subtitle, { color: c.text }]} numberOfLines={2}>
          {subtitle}
        </Text>
      ) : null}

      {/* CTA button */}
      {ctaLabel ? (
        <View style={[styles.ctaBtn, { backgroundColor: c.ctaBg, borderColor: c.text }]}>
          <Text style={[styles.ctaText, { color: c.ctaText }]}>{ctaLabel}</Text>
        </View>
      ) : null}
    </Pressable>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    ...Shadows.card,
    borderWidth: 2,
    borderColor: Colors.black,
    borderRadius: 0,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
  } as ViewStyle,

  sticky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    marginHorizontal: 0,
    marginVertical: 0,
    zIndex: 10,
  } as ViewStyle,

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },

  title: {
    fontFamily: Typography.heading.fontFamily,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: Spacing.sm,
  },

  value: {
    fontFamily: Typography.value.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'right',
  },

  subtitle: {
    fontFamily: Typography.valueSmall.fontFamily,
    fontSize: 12,
    opacity: 0.88,
    marginBottom: Spacing.sm,
  },

  ctaBtn: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },

  ctaText: {
    fontFamily: Typography.value.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

export default ActionCard;
