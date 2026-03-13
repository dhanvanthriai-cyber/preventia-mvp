'use client';

/**
 * DoctorDashboard.tsx — Doctor home screen (web)
 * Project Dhanvanthri | Neo-Brutalist Wellness
 *
 * Ported from mobile DoctorDashboard.tsx — uses HTML divs instead of RN Views.
 *
 * API:
 *  GET /api/v1/appointments?doctorId={userId}
 *
 * TODO: receive real AuthUser from a session context once auth is wired up.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { Appointment, AuthUser } from '@dhanvanthri/shared';
import { getAppointments } from '@dhanvanthri/shared';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

interface Props {
  /** When provided, renders authenticated view; stub mode when undefined. */
  user?: AuthUser;
}

export default function DoctorDashboard({ user }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const data = await getAppointments({ doctorId: user.userId });
      setAppointments(data);
    } catch (e) {
      console.error('[DoctorDashboard]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const active    = appointments.filter(a => a.status === 'ACTIVE');
  const scheduled = appointments.filter(a => a.status === 'SCHEDULED');
  const completed = appointments.filter(a => a.status === 'COMPLETED');

  if (!user) {
    return (
      <div style={styles.stub}>
        <h2 style={styles.stubHeading}>Doctor Portal</h2>
        <p style={styles.stubBody}>Sign in with a DOCTOR account to view your dashboard.</p>
        {/* TODO: replace with real auth flow */}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <span style={styles.spinner}>Loading…</span>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dr. {user.name.split(' ').slice(-1)[0]}</h1>
          <span style={styles.subtitle}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statNum}>{scheduled.length + active.length}</span>
          <span style={styles.statLabel}>TODAY</span>
        </div>
      </div>

      {/* Active calls */}
      {active.length > 0 && (
        <section>
          <p style={styles.sectionLabel}>🔴 ACTIVE CALLS</p>
          {active.map(a => (
            <div key={a.id} style={{ ...styles.card, borderColor: '#cc0000' }}>
              <span style={styles.cardTitle}>{a.recipientName ?? `Patient #${a.id}`}</span>
              <span style={styles.cardMeta}>Session is LIVE</span>
              <a
                href={a.dailyRoomUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.ctaBtn}
              >
                Rejoin Call →
              </a>
            </div>
          ))}
        </section>
      )}

      {/* Scheduled */}
      {scheduled.length > 0 && (
        <section>
          <p style={styles.sectionLabel}>SCHEDULED TODAY</p>
          {scheduled.map(a => (
            <div key={a.id} style={styles.card}>
              <span style={styles.cardTitle}>{a.recipientName ?? `Patient #${a.id}`}</span>
              <span style={styles.cardMeta}>
                {new Date(a.startTime).toLocaleTimeString('en-IN', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
              <a
                href={a.dailyRoomUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.ctaBtn}
              >
                Start Call →
              </a>
            </div>
          ))}
        </section>
      )}

      {/* Completed — needs documentation */}
      {completed.length > 0 && (
        <section>
          <p style={styles.sectionLabel}>PENDING DOCUMENTATION</p>
          {completed.map(a => (
            <div key={a.id} style={{ ...styles.card, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <span style={styles.cardTitle}>{a.recipientName ?? `Patient #${a.id}`}</span>
                <span style={styles.cardMeta}>
                  {new Date(a.startTime).toLocaleTimeString('en-IN', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              <a href={`/doctor/notes/${a.id}`} style={{ ...styles.ctaBtn, backgroundColor: '#FFC107', color: '#111' }}>
                SOAP Note
              </a>
              <a href={`/doctor/prescriptions/${a.id}`} style={styles.ctaBtn}>
                Upload Rx
              </a>
            </div>
          ))}
        </section>
      )}

      {appointments.length === 0 && (
        <div style={styles.emptyBox}>
          <p style={styles.emptyText}>No appointments scheduled today.</p>
        </div>
      )}

      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <button
          onClick={() => { setRefreshing(true); void fetchData(); }}
          style={styles.refreshBtn}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root:        { maxWidth: 800, margin: '0 auto' },
  centered:    { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  spinner:     { fontFamily: 'monospace', fontSize: 14, color: '#0047AB' },
  stub:        { border: '2px solid #ccc', padding: 32, textAlign: 'center', maxWidth: 480, margin: '64px auto' },
  stubHeading: { fontFamily: 'Georgia, serif', fontSize: 24, marginBottom: 8 },
  stubBody:    { fontFamily: 'monospace', fontSize: 13, color: '#555' },
  header:      {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 0', borderBottom: '2px solid #111', marginBottom: 24,
  },
  title:       { fontFamily: 'Georgia, serif', fontSize: 22, margin: 0, color: '#111' },
  subtitle:    { fontFamily: 'monospace', fontSize: 11, color: '#888' },
  statBox:     {
    border: '2px solid #0047AB', padding: '8px 16px', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  statNum:     { fontFamily: 'Georgia, serif', fontSize: 28, color: '#0047AB', fontWeight: 700 },
  statLabel:   { fontFamily: 'monospace', fontSize: 9, color: '#0047AB', letterSpacing: 1 },
  sectionLabel:{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 },
  card:        {
    border: '2px solid #111', padding: 16, marginBottom: 12, backgroundColor: '#fff',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  cardTitle:   { fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700 },
  cardMeta:    { fontFamily: 'monospace', fontSize: 12, color: '#555' },
  ctaBtn:      {
    display: 'inline-block', fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
    backgroundColor: '#0047AB', color: '#fff', padding: '6px 14px',
    textDecoration: 'none', border: '2px solid #111', alignSelf: 'flex-start',
  },
  emptyBox:    { border: '2px solid #ccc', padding: 32, textAlign: 'center', marginTop: 32 },
  emptyText:   { fontFamily: 'monospace', fontSize: 13, color: '#888' },
  refreshBtn:  {
    fontFamily: 'monospace', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    border: '2px solid #111', backgroundColor: '#fff', padding: '8px 20px',
  },
};
