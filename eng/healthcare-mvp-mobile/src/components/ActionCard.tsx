/**
 * ActionCard.tsx
 * Project Dhanvanthri — Neo-Brutalist Action Card
 *
 * Mockup reference: "User Mobile view.jpeg"
 * Design observations from mockup:
 *   - Full-width sticky blue banner at top ("URGENT POST VISIT") → normal urgency
 *   - Hard 0px border-radius cards with 2px black solid border
 *   - Serif title (PlayfairDisplay), body subtitle, JetBrains Mono for values
 *   - Upcoming section uses Trust Blue / Yellow / Red full-background urgency
 *   - Full-width black CTA button at bottom of card
 *   - 8px soft shadow (Neo-Brutalist Wellness spec)
 *
 * PRD §3: Critical trigger surfaces for appointments, medications, inventory.
 */

import React from 'react';
import {
  AccessibilityRole,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {
  ActionCard as ActionCardTokens,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from '../theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionCardUrgency = 'normal' | 'warning' | 'critical';

export interface ActionCardProps {
  /** Section / alert title — rendered in Playfair Display serif */
  title: string;
  /** Descriptive subtitle — rendered in system body font */
  subtitle?: string;
  /**
   * Clinical data value (days remaining, count, etc.)
   * Rendered in JetBrains Mono for precision.
   */
  value?: string;
  /** Urgency level drives the background + text colour */
  urgency: ActionCardUrgency;
  /** CTA button label */
  ctaLabel: string;
  /** CTA press handler */
  onPress: () => void;
  /**
   * If true, the card is positioned absolute at the top of its container.
   * Use this for the global sticky banner (e.g., "URGENT POST VISIT" in mockup).
   */
  isSticky?: boolean;
  /** Optional testID for React Native Testing Library */
  testID?: string;
}

// ─── Urgency colour map ───────────────────────────────────────────────────────

interface UrgencyStyle {
  backgroundColor: string;
  textColor: string;
  subtextColor: string;
  borderColor: string;
}

const URGENCY_STYLES: Record<ActionCardUrgency, UrgencyStyle> = {
  normal: {
    backgroundColor: Colors.trustBlue, // #0047AB
    textColor: Colors.white,
    subtextColor: 'rgba(255,255,255,0.85)',
    borderColor: Colors.black,
  },
  warning: {
    backgroundColor: Colors.alertYellow, // #FFC107
    textColor: Colors.black,
    subtextColor: 'rgba(0,0,0,0.75)',
    borderColor: Colors.black,
  },
  critical: {
    backgroundColor: Colors.alertRed, // #D32F2F
    textColor: Colors.white,
    subtextColor: 'rgba(255,255,255,0.85)',
    borderColor: Colors.black,
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ActionCard: React.FC<ActionCardProps> = ({
  title,
  subtitle,
  value,
  urgency,
  ctaLabel,
  onPress,
  isSticky = false,
  testID,
}) => {
  const palette = URGENCY_STYLES[urgency];

  const containerStyle: ViewStyle[] = [
    styles.container,
    { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor },
    isSticky && styles.stickyContainer,
  ];

  return (
    <View style={containerStyle} testID={testID ?? `action-card-${urgency}`}>
      {/* Urgency indicator strip — left edge accent (echoes mockup left-border pattern) */}
      {urgency !== 'normal' && (
        <View
          style={[
            styles.urgencyStrip,
            urgency === 'warning'
              ? styles.urgencyStripWarning
              : styles.urgencyStripCritical,
          ]}
        />
      )}

      <View style={styles.contentArea}>
        {/* Title — Playfair Display Serif per spec */}
        <Text
          style={[styles.title, { color: palette.textColor }]}
          testID="action-card-title"
          numberOfLines={2}
        >
          {title}
        </Text>

        {/* Subtitle — Body font */}
        {subtitle !== undefined && subtitle.length > 0 && (
          <Text
            style={[styles.subtitle, { color: palette.subtextColor }]}
            testID="action-card-subtitle"
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}

        {/* Value — JetBrains Mono for clinical data */}
        {value !== undefined && value.length > 0 && (
          <Text
            style={[styles.value, { color: palette.textColor }]}
            testID="action-card-value"
          >
            {value}
          </Text>
        )}
      </View>

      {/* CTA button — full-width, black background, white text, 2px border */}
      <Pressable
        style={({ pressed }) => [
          styles.ctaButton,
          pressed && styles.ctaButtonPressed,
        ]}
        onPress={onPress}
        testID="action-card-cta"
        accessibilityLabel={ctaLabel}
        accessibilityRole={'button' as AccessibilityRole}
      >
        <Text style={styles.ctaLabel}>{ctaLabel.toUpperCase()}</Text>
      </Pressable>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    // Base token from theme.ts ActionCard — 2px black border, 0px radius, 8px shadow
    ...ActionCardTokens.container,
    // Override token background (urgency-driven above)
    backgroundColor: Colors.trustBlue,
    // Ensure full-width
    width: '100%',
    // Remove default padding to allow contentArea/ctaButton to manage spacing
    padding: 0,
    overflow: 'hidden',
    flexDirection: 'column',
  },

  stickyContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },

  // Left-edge urgency strip (warning / critical only)
  urgencyStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  urgencyStripWarning: {
    backgroundColor: '#E65100', // Deep orange accent on yellow
  },
  urgencyStripCritical: {
    backgroundColor: '#B71C1C', // Deeper red on red
  },

  // Main content area
  contentArea: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    paddingLeft: Spacing.lg, // give room to urgency strip when present
  },

  title: {
    // PlayfairDisplay-Bold per theme spec (heading)
    fontFamily: 'PlayfairDisplay-Bold',
    fontSize: 18,
    lineHeight: 24,
    marginBottom: Spacing.xs,
  },

  subtitle: {
    // System body font per theme spec
    fontFamily: 'System',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },

  value: {
    // JetBrains Mono for clinical precision per theme spec
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.5,
    marginTop: Spacing.xs,
  },

  // CTA button — full-width, black bg, white text, 2px border (per spec)
  ctaButton: {
    backgroundColor: Colors.black,
    borderTopWidth: 2,
    borderTopColor: Colors.black,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  ctaButtonPressed: {
    backgroundColor: '#1a1a1a',
  },
  ctaLabel: {
    // JetBrains Mono for button labels — precision aesthetic
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
    color: Colors.white,
    letterSpacing: 2,
    fontWeight: '600',
  },
});

export default ActionCard;
