/**
 * MedicationBadge.tsx
 * Project Preventia — Pharmacy Tab Badge
 *
 * Surfaced in the bottom navigation tab bar to immediately signal
 * CRITICAL or WARNING medication refill counts to the patient.
 *
 * Design: JetBrains Mono, neo-brutalist, no border-radius.
 *   CRITICAL → #D32F2F (red)  e.g. "2 CRITICAL"
 *   WARNING  → #FFC107 (amber) e.g. "3 WARNING"
 *   Combined → "2 CRITICAL · 3 WARNING"
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MedicationBadgeProps {
  criticalCount: number;
  warningCount: number;
  /** Optional testID for React Native Testing Library */
  testID?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CRITICAL_COLOR = '#D32F2F';
const WARNING_COLOR = '#FFC107';
const MONO_FONT = 'JetBrainsMono-Regular';

// ─── Component ────────────────────────────────────────────────────────────────

export const MedicationBadge: React.FC<MedicationBadgeProps> = ({
  criticalCount,
  warningCount,
  testID,
}) => {
  // Show nothing if all meds are OK
  if (criticalCount === 0 && warningCount === 0) {
    return null;
  }

  const parts: React.ReactNode[] = [];

  if (criticalCount > 0) {
    parts.push(
      <Text
        key="critical"
        style={[styles.segment, styles.criticalText]}
        testID="badge-critical"
      >
        {criticalCount} CRITICAL
      </Text>,
    );
  }

  if (criticalCount > 0 && warningCount > 0) {
    parts.push(
      <Text key="separator" style={styles.separator}>
        {' · '}
      </Text>,
    );
  }

  if (warningCount > 0) {
    parts.push(
      <Text
        key="warning"
        style={[styles.segment, styles.warningText]}
        testID="badge-warning"
      >
        {warningCount} WARNING
      </Text>,
    );
  }

  return (
    <View style={styles.container} testID={testID ?? 'medication-badge'}>
      <Text style={styles.badge}>{parts}</Text>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    // Inline pill — no border-radius (neo-brutalist)
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badge: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  segment: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    fontWeight: '700',
  },
  criticalText: {
    color: CRITICAL_COLOR,
  },
  warningText: {
    color: WARNING_COLOR,
  },
  separator: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    color: '#000000',
  },
});

export default MedicationBadge;
