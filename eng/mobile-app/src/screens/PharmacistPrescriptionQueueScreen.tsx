/**
 * PharmacistPrescriptionQueueScreen
 *
 * Pharmacist-facing prescription review queue.
 * Sorted by prescription_uploaded_at ASC (most urgent first — patient closest
 * to running out of medication appears at top, per PRESCRIPTION_WORKFLOW.md §Step 2).
 *
 * Features:
 *  - Pull-to-refresh (60s auto-poll)
 *  - SLA countdown badge (red when < 1 hour remaining)
 *  - Tap row → opens 15-min pre-signed PDF URL in device browser
 *  - Action buttons: Approve / Reject / Clarify
 *
 * Neo-Brutalist Wellness design:
 *  - 2px black borders, zero border-radius
 *  - Playfair Display headers, JetBrains Mono data
 *  - Trust Blue (#0047AB) CTAs, Red SLA alerts
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Colors, Typography, Borders, Shadows, Spacing } from '../theme/theme';
import ActionCard from '../components/ActionCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PrescriptionStatus =
  | 'PENDING_VERIFICATION'
  | 'AWAITING_CLARIFICATION'
  | 'APPROVED'
  | 'REJECTED';

interface PrescriptionQueueItem {
  soapNoteId: number;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  daysRemaining: number;       // from inventory engine — lower = more urgent
  prescriptionStatus: PrescriptionStatus;
  prescriptionUploadedAt: string; // ISO timestamp
  s3Key: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = 'http://localhost:8080/api/v1';
const POLL_INTERVAL_MS = 60_000;
const SLA_HOURS = 4;
const SLA_ALERT_THRESHOLD_HOURS = 1; // show red badge when < 1h remaining

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSlaRemainingMs(uploadedAt: string): number {
  const uploaded = new Date(uploadedAt).getTime();
  const slaDeadline = uploaded + SLA_HOURS * 60 * 60 * 1000;
  return slaDeadline - Date.now();
}

function formatSlaLabel(remainingMs: number): string {
  if (remainingMs <= 0) return 'SLA BREACHED';
  const h = Math.floor(remainingMs / 3_600_000);
  const m = Math.floor((remainingMs % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PharmacistPrescriptionQueueScreen: React.FC = () => {
  const [queue, setQueue]         = useState<PrescriptionQueueItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // ---- Fetch queue ---------------------------------------------------------

  const fetchQueue = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/prescriptions/queue`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PrescriptionQueueItem[] = await res.json();
      // Sort: PENDING first by uploaded_at ASC, then AWAITING_CLARIFICATION
      data.sort((a, b) => {
        if (a.prescriptionStatus !== b.prescriptionStatus) {
          return a.prescriptionStatus === 'PENDING_VERIFICATION' ? -1 : 1;
        }
        return new Date(a.prescriptionUploadedAt).getTime() -
               new Date(b.prescriptionUploadedAt).getTime();
      });
      setQueue(data);
    } catch (e) {
      console.error('[PharmacistQueue] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(() => fetchQueue(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // ---- Open pre-signed PDF URL ---------------------------------------------

  const openPdf = useCallback(async (s3Key: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/prescriptions/view?s3Key=${encodeURIComponent(s3Key)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { presignedUrl } = await res.json();
      await Linking.openURL(presignedUrl);
    } catch (e) {
      Alert.alert('Error', 'Could not open prescription PDF. Please try again.');
    }
  }, []);

  // ---- Pharmacist actions --------------------------------------------------

  const handleApprove = useCallback(async (item: PrescriptionQueueItem) => {
    setActionLoading(item.soapNoteId);
    try {
      const res = await fetch(`${API_BASE}/prescriptions/${item.soapNoteId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pharmacistId: 'CURRENT_USER_ID' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchQueue(true);
    } catch {
      Alert.alert('Error', 'Approval failed. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }, [fetchQueue]);

  const handleReject = useCallback((item: PrescriptionQueueItem) => {
    Alert.prompt(
      'Reject Prescription',
      'Enter rejection reason (required):',
      async (reason) => {
        if (!reason?.trim()) return;
        setActionLoading(item.soapNoteId);
        try {
          const res = await fetch(`${API_BASE}/prescriptions/${item.soapNoteId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pharmacistId: 'CURRENT_USER_ID', reason }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          await fetchQueue(true);
        } catch {
          Alert.alert('Error', 'Rejection failed. Please try again.');
        } finally {
          setActionLoading(null);
        }
      },
      'plain-text'
    );
  }, [fetchQueue]);

  const handleClarify = useCallback((item: PrescriptionQueueItem) => {
    Alert.prompt(
      'Request Clarification',
      'Message to doctor:',
      async (message) => {
        if (!message?.trim()) return;
        setActionLoading(item.soapNoteId);
        try {
          const res = await fetch(`${API_BASE}/prescriptions/${item.soapNoteId}/clarify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pharmacistId: 'CURRENT_USER_ID', message }),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          await fetchQueue(true);
        } catch {
          Alert.alert('Error', 'Could not send clarification. Please try again.');
        } finally {
          setActionLoading(null);
        }
      },
      'plain-text'
    );
  }, [fetchQueue]);

  // ---- Render item ---------------------------------------------------------

  const renderItem = useCallback(({ item }: { item: PrescriptionQueueItem }) => {
    const slaRemaining = getSlaRemainingMs(item.prescriptionUploadedAt);
    const slaBreached  = slaRemaining <= 0;
    const slaUrgent    = slaRemaining <= SLA_ALERT_THRESHOLD_HOURS * 3_600_000;
    const isActioning  = actionLoading === item.soapNoteId;
    const isPending    = item.prescriptionStatus === 'PENDING_VERIFICATION' ||
                         item.prescriptionStatus === 'AWAITING_CLARIFICATION';

    return (
      <View style={styles.card}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <View style={[
            styles.slaBadge,
            slaBreached ? styles.slaBadgeBreached : slaUrgent ? styles.slaBadgeUrgent : styles.slaBadgeOk
          ]}>
            <Text style={styles.slaBadgeText}>{formatSlaLabel(slaRemaining)}</Text>
          </View>
        </View>

        {/* Meta row */}
        <Text style={styles.metaText}>
          {item.doctorName}  ·  {item.appointmentDate}
        </Text>
        <Text style={[styles.metaText, item.daysRemaining <= 3 && styles.urgentText]}>
          {item.daysRemaining}d medication remaining
        </Text>

        {/* Status badge */}
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{item.prescriptionStatus.replace(/_/g, ' ')}</Text>
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.viewBtn]}
            onPress={() => openPdf(item.s3Key)}
          >
            <Text style={styles.viewBtnText}>View PDF</Text>
          </TouchableOpacity>

          {isPending && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                onPress={() => handleApprove(item)}
                disabled={isActioning}
              >
                {isActioning
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <Text style={styles.approveBtnText}>Approve</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                onPress={() => handleReject(item)}
                disabled={isActioning}
              >
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.clarifyBtn]}
                onPress={() => handleClarify(item)}
                disabled={isActioning}
              >
                <Text style={styles.clarifyBtnText}>Clarify</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }, [actionLoading, openPdf, handleApprove, handleReject, handleClarify]);

  // ---- Render screen -------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={Colors.trustBlue} size="large" />
        <Text style={styles.loadingText}>Loading prescription queue…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {/* Sticky header ActionCard */}
      <ActionCard
        title="Prescription Queue"
        subtitle="Sorted by urgency · SLA: 4 hours"
        value={`${queue.filter(i => i.prescriptionStatus === 'PENDING_VERIFICATION').length} pending`}
        urgency={queue.some(i => getSlaRemainingMs(i.prescriptionUploadedAt) <= 0) ? 'critical' : 'normal'}
        onPress={() => fetchQueue(true)}
      />

      <FlatList
        data={queue}
        keyExtractor={item => String(item.soapNoteId)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchQueue(true)}
            tintColor={Colors.trustBlue}
          />
        }
        contentContainerStyle={queue.length === 0 && styles.emptyContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No prescriptions pending review.</Text>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...Typography.body, marginTop: Spacing.sm },

  card: {
    ...Borders.standard,
    ...Shadows.card,
    margin: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.white,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },

  patientName: {
    fontFamily: Typography.heading.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },

  slaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: Colors.black,
  },
  slaBadgeOk:       { backgroundColor: Colors.alertGreen },
  slaBadgeUrgent:   { backgroundColor: Colors.alertYellow },
  slaBadgeBreached: { backgroundColor: Colors.alertRed },
  slaBadgeText: {
    fontFamily: Typography.valueSmall.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
  },

  metaText: {
    ...Typography.valueSmall,
    marginBottom: 2,
    opacity: 0.75,
  },
  urgentText: { color: Colors.alertRed, opacity: 1, fontWeight: '700' },

  statusRow: { marginTop: Spacing.xs, marginBottom: Spacing.sm },
  statusLabel: {
    fontFamily: Typography.valueSmall.fontFamily,
    fontSize: 11,
    color: Colors.trustBlue,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  actionRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  actionBtn: {
    borderWidth: 2,
    borderColor: Colors.black,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    minWidth: 64,
    alignItems: 'center',
  },
  viewBtn:    { backgroundColor: Colors.white },
  approveBtn: { backgroundColor: Colors.trustBlue },
  rejectBtn:  { backgroundColor: Colors.alertRed },
  clarifyBtn: { backgroundColor: Colors.alertYellow },

  viewBtnText:    { fontFamily: Typography.valueSmall.fontFamily, fontSize: 12, color: Colors.black, fontWeight: '700' },
  approveBtnText: { fontFamily: Typography.valueSmall.fontFamily, fontSize: 12, color: Colors.white, fontWeight: '700' },
  rejectBtnText:  { fontFamily: Typography.valueSmall.fontFamily, fontSize: 12, color: Colors.white, fontWeight: '700' },
  clarifyBtnText: { fontFamily: Typography.valueSmall.fontFamily, fontSize: 12, color: Colors.black, fontWeight: '700' },

  separator: { height: 0 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...Typography.body, color: Colors.text, opacity: 0.5 },
});

export default PharmacistPrescriptionQueueScreen;
