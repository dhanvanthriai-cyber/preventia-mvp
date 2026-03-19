/**
 * MedicationListScreen.tsx
 * Project Preventia — Pharmacy: Refill Required Feed
 *
 * Mockup reference: "User Mobile view.jpeg"
 * Design observations from mockup:
 *   - Full-width ActionCards in a scrollable feed
 *   - CRITICAL cards (red) float to top with isSticky=true
 *   - Hard 0px border-radius, 2px black borders (Neo-Brutalist)
 *   - Trust Blue (#0047AB) used for OK / empty state text
 *   - JetBrains Mono for clinical values (days remaining)
 *   - Pull-to-refresh via RefreshControl
 *
 * Sort order: CRITICAL → WARNING → OK
 *
 * Endpoint: GET /api/v1/patients/{patientId}/medications/alerts
 */

import React, { useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ActionCard, { ActionCardUrgency } from '../../components/ActionCard';
import { Colors, Spacing, Typography } from '../../theme/theme';
import { MedicationAlert, useMedicationAlerts } from './useMedicationAlerts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MedicationListScreenProps {
  /** Provided by navigation (e.g. React Navigation route params) */
  patientId: number;
  authToken: string;
  /** Optional navigation handler for "Order Refill" CTA */
  onOrderRefill?: (medicationId: number) => void;
}

// ─── Urgency helpers ──────────────────────────────────────────────────────────

const URGENCY_SORT_ORDER: Record<string, number> = {
  CRITICAL: 0,
  WARNING: 1,
  OK: 2,
};

function mapUrgency(urgency: string): ActionCardUrgency {
  switch (urgency) {
    case 'CRITICAL':
      return 'critical';
    case 'WARNING':
      return 'warning';
    default:
      return 'normal';
  }
}

function buildValueLabel(urgency: string, daysRemaining: number): string {
  if (urgency === 'CRITICAL') {
    return `⚠️ ${daysRemaining} days left`;
  }
  return `${daysRemaining} days left`;
}

function sortMedications(meds: MedicationAlert[]): MedicationAlert[] {
  return [...meds].sort(
    (a, b) =>
      (URGENCY_SORT_ORDER[a.urgency] ?? 3) -
      (URGENCY_SORT_ORDER[b.urgency] ?? 3),
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Grey bordered skeleton box shown while data loads */
const SkeletonPlaceholder: React.FC = () => (
  <View style={styles.skeleton} testID="medication-skeleton" />
);

/** Bordered monospace block shown when there are zero medications */
const EmptyState: React.FC = () => (
  <View style={styles.emptyContainer} testID="medication-empty-state">
    <Text style={styles.emptyText}>All medications stocked ✓</Text>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const MedicationListScreen: React.FC<MedicationListScreenProps> = ({
  patientId,
  authToken,
  onOrderRefill,
}) => {
  const { medications, loading, error, refresh } = useMedicationAlerts(
    patientId,
    authToken,
  );

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && medications.length === 0) {
    return (
      <View style={styles.container} testID="medication-list-loading">
        <SkeletonPlaceholder />
        <SkeletonPlaceholder />
        <SkeletonPlaceholder />
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error !== null && medications.length === 0) {
    return (
      <View style={styles.container} testID="medication-list-error">
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  const sorted = sortMedications(medications);

  // Separate sticky (CRITICAL) from the scroll feed
  const stickyCards = sorted.filter(m => m.urgency === 'CRITICAL');
  const scrollCards = sorted.filter(m => m.urgency !== 'CRITICAL');

  return (
    <View style={styles.container} testID="medication-list-screen">

      {/* ── Sticky CRITICAL cards float above the scroll feed ── */}
      {stickyCards.map(med => (
        <ActionCard
          key={`sticky-${med.medicationId}`}
          testID={`medication-card-critical-${med.medicationId}`}
          urgency="critical"
          isSticky={true}
          title={med.medicationName}
          subtitle={
            med.prescribedBy
              ? `${med.dosage} · Prescribed by ${med.prescribedBy}`
              : med.dosage
          }
          value={buildValueLabel(med.urgency, med.daysRemaining)}
          ctaLabel="Order Refill"
          onPress={() => onOrderRefill?.(med.medicationId)}
        />
      ))}

      {/* Spacer to push scroll content below sticky cards */}
      {stickyCards.length > 0 && (
        <View style={{ height: stickyCards.length * 130 }} />
      )}

      {/* ── Scrollable feed ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        testID="medication-scroll-feed"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.trustBlue}
            colors={[Colors.trustBlue]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {scrollCards.length === 0 && stickyCards.length === 0 ? (
          <EmptyState />
        ) : (
          scrollCards.map(med => (
            <View
              key={`card-${med.medicationId}`}
              style={styles.cardWrapper}
            >
              <ActionCard
                testID={`medication-card-${med.urgency.toLowerCase()}-${med.medicationId}`}
                urgency={mapUrgency(med.urgency)}
                isSticky={false}
                title={med.medicationName}
                subtitle={
                  med.prescribedBy
                    ? `${med.dosage} · Prescribed by ${med.prescribedBy}`
                    : med.dosage
                }
                value={buildValueLabel(med.urgency, med.daysRemaining)}
                ctaLabel="Order Refill"
                onPress={() => onOrderRefill?.(med.medicationId)}
              />
            </View>
          ))
        )}

        {/* If only sticky CRITICAL cards exist, show scroll empty state */}
        {scrollCards.length === 0 && stickyCards.length > 0 && (
          <EmptyState />
        )}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    position: 'relative',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },

  cardWrapper: {
    width: '100%',
  },

  // ── Loading skeleton ──
  skeleton: {
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    height: 110,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    backgroundColor: '#E5E5E5',
  },

  // ── Empty state ──
  emptyContainer: {
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.trustBlue,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    // Trust Blue, JetBrains Mono, monospace precision
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 15,
    color: Colors.trustBlue,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // ── Error state ──
  errorBox: {
    margin: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.alertRed,
    padding: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.alertRed,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 13,
  },
});

export default MedicationListScreen;
