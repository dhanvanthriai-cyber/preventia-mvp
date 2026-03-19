'use client';

/**
 * PharmacistQueue.tsx — Pharmacist prescription review queue (web)
 * Project Preventia | Neo-Brutalist Wellness
 *
 * Ported from PharmacistPrescriptionQueueScreen.tsx — HTML divs instead of RN.
 *
 * Features:
 *  - Pull-to-refresh button + 60s auto-poll
 *  - SLA countdown badge (red when < 1 hour remaining)
 *  - Click row → open pre-signed PDF URL in new tab
 *  - Approve / Reject / Clarify actions
 *
 * TODO: receive pharmacistId from auth context.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { getTokenFromCookie } from '../lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  daysRemaining: number;
  prescriptionStatus: PrescriptionStatus;
  prescriptionUploadedAt: string;
  s3Key: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = '';   // relative — proxied by Next.js rewrite (/api/* → localhost:8080)
const API_V1 = `${API_BASE}/api/v1`;
const POLL_INTERVAL_MS = 60_000;
const SLA_HOURS = 4;
const SLA_ALERT_THRESHOLD_HOURS = 1;

/** Returns headers including the Authorization bearer token from cookie */
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getTokenFromCookie();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSlaRemainingMs(uploadedAt: string): number {
  const uploaded = new Date(uploadedAt).getTime();
  return uploaded + SLA_HOURS * 60 * 60 * 1000 - Date.now();
}

function formatSlaLabel(remainingMs: number): string {
  if (remainingMs <= 0) return 'SLA BREACHED';
  const h = Math.floor(remainingMs / 3_600_000);
  const m = Math.floor((remainingMs % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PharmacistQueue() {
  const [queue, setQueue] = useState<PrescriptionQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchQueue = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${API_V1}/prescriptions/queue`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PrescriptionQueueItem[] = await res.json();
      data.sort((a, b) => {
        if (a.prescriptionStatus !== b.prescriptionStatus) {
          return a.prescriptionStatus === 'PENDING_VERIFICATION' ? -1 : 1;
        }
        return (
          new Date(a.prescriptionUploadedAt).getTime() -
          new Date(b.prescriptionUploadedAt).getTime()
        );
      });
      setQueue(data);
      setErrorMsg(null);
    } catch (e) {
      console.error('[PharmacistQueue]', e);
      setErrorMsg('Failed to load prescription queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchQueue();
    const id = setInterval(() => void fetchQueue(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchQueue]);

  // ── Open PDF ──────────────────────────────────────────────────────────────

  const openPdf = useCallback(async (s3Key: string) => {
    try {
      const res = await fetch(
        `${API_V1}/prescriptions/view?s3Key=${encodeURIComponent(s3Key)}`,
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { presignedUrl }: { presignedUrl: string } = await res.json();
      window.open(presignedUrl, '_blank', 'noopener,noreferrer');
    } catch {
      alert('Could not open prescription PDF. Please try again.');
    }
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleApprove = useCallback(
    async (item: PrescriptionQueueItem) => {
      setActionLoading(item.soapNoteId);
      try {
        const res = await fetch(
          `${API_V1}/prescriptions/${item.soapNoteId}/approve`,
          {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ pharmacistId: 'CURRENT_USER_ID' }),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await fetchQueue(true);
      } catch {
        alert('Approval failed. Please try again.');
      } finally {
        setActionLoading(null);
      }
    },
    [fetchQueue],
  );

  const handleReject = useCallback(
    async (item: PrescriptionQueueItem) => {
      const reason = window.prompt('Reject Prescription — Enter reason (required):');
      if (!reason?.trim()) return;
      setActionLoading(item.soapNoteId);
      try {
        const res = await fetch(
          `${API_V1}/prescriptions/${item.soapNoteId}/reject`,
          {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ pharmacistId: 'CURRENT_USER_ID', reason }),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await fetchQueue(true);
      } catch {
        alert('Rejection failed. Please try again.');
      } finally {
        setActionLoading(null);
      }
    },
    [fetchQueue],
  );

  const handleClarify = useCallback(
    async (item: PrescriptionQueueItem) => {
      const message = window.prompt('Request Clarification — Message to doctor:');
      if (!message?.trim()) return;
      setActionLoading(item.soapNoteId);
      try {
        const res = await fetch(
          `${API_V1}/prescriptions/${item.soapNoteId}/clarify`,
          {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ pharmacistId: 'CURRENT_USER_ID', message }),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await fetchQueue(true);
      } catch {
        alert('Could not send clarification. Please try again.');
      } finally {
        setActionLoading(null);
      }
    },
    [fetchQueue],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={s.centered}>
        <span style={s.loadingText}>Loading prescription queue…</span>
      </div>
    );
  }

  const pendingCount = queue.filter(
    i => i.prescriptionStatus === 'PENDING_VERIFICATION',
  ).length;
  const hasBreached = queue.some(
    i => getSlaRemainingMs(i.prescriptionUploadedAt) <= 0,
  );

  return (
    <div style={s.screen}>
      {/* Sticky header card */}
      <div style={{ ...s.headerCard, borderColor: hasBreached ? '#cc0000' : '#0047AB' }}>
        <span style={s.headerTitle}>Prescription Queue</span>
        <span style={s.headerSub}>Sorted by urgency · SLA: 4 hours</span>
        <span style={s.headerBadge}>{pendingCount} pending</span>
        <button
          style={s.refreshBtn}
          onClick={() => void fetchQueue(true)}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {errorMsg && <p style={{ color: 'red', fontFamily: 'monospace' }}>{errorMsg}</p>}

      {queue.length === 0 ? (
        <p style={s.emptyText}>No prescriptions pending review.</p>
      ) : (
        queue.map(item => {
          const slaRemaining = getSlaRemainingMs(item.prescriptionUploadedAt);
          const slaBreached = slaRemaining <= 0;
          const slaUrgent = slaRemaining <= SLA_ALERT_THRESHOLD_HOURS * 3_600_000;
          const isActioning = actionLoading === item.soapNoteId;
          const isPending =
            item.prescriptionStatus === 'PENDING_VERIFICATION' ||
            item.prescriptionStatus === 'AWAITING_CLARIFICATION';

          const slaBg = slaBreached ? '#cc0000' : slaUrgent ? '#FFC107' : '#4caf50';

          return (
            <div key={item.soapNoteId} style={s.card}>
              {/* Header row */}
              <div style={s.cardHeader}>
                <span style={s.patientName}>{item.patientName}</span>
                <span style={{ ...s.slaBadge, backgroundColor: slaBg }}>
                  {formatSlaLabel(slaRemaining)}
                </span>
              </div>

              {/* Meta */}
              <span style={s.metaText}>
                {item.doctorName} · {item.appointmentDate}
              </span>
              <span
                style={{
                  ...s.metaText,
                  color: item.daysRemaining <= 3 ? '#cc0000' : undefined,
                  fontWeight: item.daysRemaining <= 3 ? 700 : undefined,
                }}
              >
                {item.daysRemaining}d medication remaining
              </span>

              {/* Status */}
              <span style={s.statusLabel}>
                {item.prescriptionStatus.replace(/_/g, ' ')}
              </span>

              {/* Actions */}
              <div style={s.actionRow}>
                <button
                  style={{ ...s.actionBtn, ...s.viewBtn }}
                  onClick={() => void openPdf(item.s3Key)}
                >
                  View PDF
                </button>

                {isPending && (
                  <>
                    <button
                      style={{ ...s.actionBtn, ...s.approveBtn }}
                      onClick={() => void handleApprove(item)}
                      disabled={isActioning}
                    >
                      {isActioning ? '…' : 'Approve'}
                    </button>
                    <button
                      style={{ ...s.actionBtn, ...s.rejectBtn }}
                      onClick={() => void handleReject(item)}
                      disabled={isActioning}
                    >
                      Reject
                    </button>
                    <button
                      style={{ ...s.actionBtn, ...s.clarifyBtn }}
                      onClick={() => void handleClarify(item)}
                      disabled={isActioning}
                    >
                      Clarify
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  screen:      { maxWidth: 800, margin: '0 auto' },
  centered:    { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  loadingText: { fontFamily: 'monospace', fontSize: 14, color: '#0047AB' },
  headerCard:  {
    border: '2px solid #0047AB', padding: 16, marginBottom: 16, backgroundColor: '#fff',
    display: 'flex', alignItems: 'center', gap: 16,
  },
  headerTitle: { fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 700, flex: 1 },
  headerSub:   { fontFamily: 'monospace', fontSize: 11, color: '#555' },
  headerBadge: { fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#0047AB' },
  refreshBtn:  {
    fontFamily: 'monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    border: '2px solid #111', backgroundColor: '#fff', padding: '6px 14px',
  },
  emptyText:   { fontFamily: 'monospace', fontSize: 13, color: '#888', textAlign: 'center', marginTop: 40 },
  card:        {
    border: '2px solid #111', padding: 16, marginBottom: 12, backgroundColor: '#fff',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  cardHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  patientName: { fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700 },
  slaBadge:    {
    padding: '3px 10px', border: '2px solid #111',
    fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#fff',
  },
  metaText:    { fontFamily: 'monospace', fontSize: 12, color: '#555' },
  statusLabel: {
    fontFamily: 'monospace', fontSize: 11, color: '#0047AB',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  actionRow:   { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  actionBtn:   {
    border: '2px solid #111', padding: '6px 14px',
    fontFamily: 'monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
  viewBtn:     { backgroundColor: '#fff', color: '#111' },
  approveBtn:  { backgroundColor: '#0047AB', color: '#fff' },
  rejectBtn:   { backgroundColor: '#cc0000', color: '#fff' },
  clarifyBtn:  { backgroundColor: '#FFC107', color: '#111' },
};
