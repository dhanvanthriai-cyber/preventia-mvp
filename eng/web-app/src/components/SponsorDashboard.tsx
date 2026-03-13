'use client';
/**
 * SponsorDashboard.tsx — NRI Sponsor Portal (Neo-Brutalist UI)
 * Project Dhanvanthri
 *
 * 3-column grid layout matching DoctorDashboard.tsx:
 *  Left   — parent's upcoming appointments
 *  Center — medication alerts + Book Appointment CTA
 *  Right  — completed appointments + payment history
 *
 * API:
 *  GET /api/v1/appointments?sponsorId={userId}
 *  GET /api/v1/patients/{recipientId}/medications/alerts
 */
import React, { useCallback, useEffect, useState } from 'react';
import type { AuthUser, Appointment } from '@dhanvanthri/shared';
import { getAppointments } from '@dhanvanthri/shared';
import { getTokenFromCookie } from '../lib/auth';

interface MedAlert {
  medicationName: string;
  urgency: 'CRITICAL' | 'WARNING' | 'OK';
  daysRemaining: number;
}

interface Props {
  user?: AuthUser;
}

export default function SponsorDashboard({ user }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medAlerts,    setMedAlerts]    = useState<MedAlert[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);

  const sponsorName = user?.name ?? 'SPONSOR';
  const initials = sponsorName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const fetchAppointments = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const data = await getAppointments({ sponsorId: user.userId });
      setAppointments(data);

      // Fetch med alerts for first recipient found in appointments
      const firstAppt = data.find(a => a.recipientId);
      if (firstAppt?.recipientId) {
        setAlertLoading(true);
        const token = getTokenFromCookie();
        try {
          const res = await fetch(`/api/v1/patients/${firstAppt.recipientId}/medications/alerts`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) setMedAlerts(await res.json());
        } catch { /* silent */ } finally { setAlertLoading(false); }
      }
    } catch (e) {
      console.error('[SponsorDashboard]', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { void fetchAppointments(); }, [fetchAppointments]);

  const scheduled  = appointments.filter(a => a.status === 'SCHEDULED');
  const active     = appointments.filter(a => a.status === 'ACTIVE');
  const completed  = appointments.filter(a => a.status === 'COMPLETED');
  const critAlerts = medAlerts.filter(m => m.urgency === 'CRITICAL');
  const warnAlerts = medAlerts.filter(m => m.urgency === 'WARNING');

  if (!user) {
    return (
      <div style={styles.stub}>
        <h2 style={styles.stubHeading}>SPONSOR PORTAL</h2>
        <p style={styles.stubBody}>Sign in with a SPONSOR account to manage your family member&apos;s care.</p>
        <a href="/login" style={styles.signInBtn}>SIGN IN</a>
      </div>
    );
  }

  if (loading) {
    return <div style={styles.centered}><span style={styles.spinner}>Loading portal…</span></div>;
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });

  return (
    <div style={styles.pageRoot}>

      {/* Top Nav */}
      <div style={styles.topNav}>
        <div style={styles.topNavLeft}>
          <span style={styles.greenDot} />
          <span style={styles.portalLabel}>SPONSOR PORTAL: {sponsorName.toUpperCase()}</span>
        </div>
        <a href="/login" style={styles.logoutBtn}>LOG OUT</a>
      </div>

      {/* Profile Header */}
      <div style={styles.profileCard}>
        <div style={styles.avatar}>{initials}</div>
        <div style={styles.profileInfo}>
          <h1 style={styles.profileName}>{sponsorName.toUpperCase()}</h1>
          <p style={styles.profileSub}>NRI Sponsor · Caring from Abroad</p>
          <div style={styles.badgeRow}>
            <span style={styles.badge}>Remote Proxy</span>
            <span style={{ ...styles.badge, borderColor: '#22C55E', color: '#22C55E' }}>
              {appointments.length} Appointment{appointments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <a href="/sponsor/book" style={styles.bookBtn}>BOOK CONSULTATION</a>
      </div>

      {/* 3-Column Grid */}
      <div style={styles.grid}>

        {/* LEFT — Upcoming appointments */}
        <div style={styles.colLeft}>
          <div style={styles.section}>
            <span style={{ ...styles.sectionLabel, ...styles.greenAccent }}>UPCOMING CONSULTATIONS</span>

            {active.map(a => (
              <div key={a.id} style={{ ...styles.apptCard, borderColor: '#CC0000' }}>
                <span style={styles.apptName}>{a.recipientName ?? `Patient #${a.id}`}</span>
                <span style={{ ...styles.apptMeta, color: '#CC0000' }}>● LIVE NOW</span>
                {a.dailyRoomUrl && (
                  <a href={a.dailyRoomUrl} target="_blank" rel="noreferrer" style={styles.joinBtn}>JOIN</a>
                )}
              </div>
            ))}

            {scheduled.map(a => (
              <div key={a.id} style={styles.apptCard}>
                <span style={styles.apptName}>{a.recipientName ?? `Patient #${a.id}`}</span>
                <span style={styles.apptMeta}>{fmt(a.startTime)}</span>
                <span style={styles.apptStatus}>SCHEDULED</span>
              </div>
            ))}

            {active.length === 0 && scheduled.length === 0 && (
              <p style={styles.emptyNote}>No upcoming appointments.</p>
            )}

            <button
              onClick={() => { setRefreshing(true); void fetchAppointments(); }}
              style={styles.outlineBtn}
              disabled={refreshing}
            >
              {refreshing ? 'REFRESHING…' : 'REFRESH'}
            </button>
          </div>
        </div>

        {/* CENTER — Medication alerts */}
        <div style={styles.colCenter}>
          <div style={styles.section}>
            <span style={{ ...styles.sectionLabel, ...styles.greenAccent }}>MEDICATION ALERTS</span>

            {alertLoading && <p style={styles.emptyNote}>Checking medications…</p>}

            {!alertLoading && critAlerts.length === 0 && warnAlerts.length === 0 && (
              <div style={styles.allClearBadge}>✓ No medication alerts</div>
            )}

            {critAlerts.map((m, i) => (
              <div key={i} style={styles.critCard}>
                <span style={styles.critMedName}>🚨 {m.medicationName}</span>
                <span style={styles.critMeta}>{m.daysRemaining} days remaining · CRITICAL</span>
              </div>
            ))}

            {warnAlerts.map((m, i) => (
              <div key={i} style={styles.warnCard}>
                <span style={styles.warnMedName}>⚠ {m.medicationName}</span>
                <span style={styles.warnMeta}>{m.daysRemaining} days remaining · WARNING</span>
              </div>
            ))}
          </div>

          {/* Book CTA */}
          <div style={styles.section}>
            <span style={styles.sectionLabel}>BOOK CONSULTATION</span>
            <p style={styles.ctaBody}>
              Schedule a virtual consultation for your family member with a specialist.
            </p>
            <a href="/sponsor/book" style={styles.blackBtn}>BOOK NOW</a>
          </div>
        </div>

        {/* RIGHT — Completed + payments */}
        <div style={styles.colRight}>
          <div style={styles.section}>
            <span style={{ ...styles.sectionLabel, ...styles.greenAccent }}>COMPLETED SESSIONS</span>

            {completed.length === 0 && (
              <p style={styles.emptyNote}>No completed appointments yet.</p>
            )}

            {completed.map(a => (
              <div key={a.id} style={{ ...styles.apptCard, borderColor: '#ccc' }}>
                <span style={styles.apptName}>{a.recipientName ?? `Patient #${a.id}`}</span>
                <span style={styles.apptMeta}>{fmt(a.startTime)}</span>
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {a.prescriptionUrl && (
                    <a href={a.prescriptionUrl} target="_blank" rel="noreferrer" style={styles.rxBtn}>VIEW Rx</a>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={styles.section}>
            <span style={styles.sectionLabel}>PAYMENT HISTORY</span>
            <div style={styles.payBadge}>
              <span style={styles.greenDot} />
              <span style={styles.payBadgeText}>Razorpay integration active</span>
            </div>
            <p style={styles.emptyNote}>Full statement coming in SPRINT-03.</p>
            <a href="/sponsor/book" style={styles.outlineBtn}>BOOK &amp; PAY</a>
          </div>
        </div>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageRoot: { backgroundColor: '#F5F5F5', minHeight: '100vh', fontFamily: 'monospace' },
  centered: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  spinner:  { fontFamily: 'monospace', fontSize: 14, color: '#333' },
  stub: { border: '3px solid #111', padding: 48, textAlign: 'center', maxWidth: 480, margin: '64px auto', backgroundColor: '#fff' },
  stubHeading: { fontFamily: 'Georgia, serif', fontSize: 24, marginBottom: 8, color: '#000' },
  stubBody:    { fontFamily: 'monospace', fontSize: 13, color: '#555', marginBottom: 16 },
  signInBtn: { display: 'inline-block', backgroundColor: '#000', color: '#fff', border: '2px solid #111', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, padding: '8px 20px', textDecoration: 'none' },
  topNav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#000', color: '#fff', padding: '10px 24px', borderBottom: '3px solid #111' },
  topNavLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  greenDot: { width: 10, height: 10, borderRadius: '50%', backgroundColor: '#22C55E', flexShrink: 0, display: 'inline-block' },
  portalLabel: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: '#fff', textTransform: 'uppercase' },
  logoutBtn: { fontFamily: 'monospace', fontSize: 11, fontWeight: 700, backgroundColor: 'transparent', color: '#fff', border: '2px solid #fff', padding: '4px 12px', textDecoration: 'none' },
  profileCard: { display: 'flex', alignItems: 'center', gap: 20, backgroundColor: '#fff', border: '3px solid #111', padding: '20px 24px', margin: 16 },
  avatar: { width: 64, height: 64, backgroundColor: '#000', color: '#fff', fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, margin: '0 0 4px 0', color: '#000' },
  profileSub:  { fontFamily: 'monospace', fontSize: 12, color: '#666', margin: '0 0 10px 0' },
  badgeRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
  badge: { border: '2px solid #111', padding: '3px 10px', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, backgroundColor: '#fff' },
  bookBtn: { backgroundColor: '#000', color: '#fff', border: '2px solid #111', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, padding: '8px 16px', textDecoration: 'none', flexShrink: 0 },
  grid: { display: 'flex', gap: 16, padding: '0 16px 16px 16px', alignItems: 'flex-start' },
  colLeft:   { flex: '0 0 30%', minWidth: 0 },
  colCenter: { flex: '0 0 35%', minWidth: 0 },
  colRight:  { flex: '0 0 35%', minWidth: 0 },
  section: { backgroundColor: '#fff', border: '3px solid #111', padding: 16, marginBottom: 16 },
  sectionLabel: { display: 'block', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, color: '#000' },
  greenAccent: { borderLeft: '4px solid #22C55E', paddingLeft: 8 },
  emptyNote: { fontFamily: 'monospace', fontSize: 11, color: '#888', margin: '8px 0' },
  apptCard: { border: '2px solid #111', padding: '10px 12px', marginBottom: 8, backgroundColor: '#F5F5F5' },
  apptName: { display: 'block', fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700, color: '#000' },
  apptMeta: { display: 'block', fontFamily: 'monospace', fontSize: 11, color: '#666', marginTop: 2 },
  apptStatus: { display: 'inline-block', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, border: '1px solid #111', padding: '2px 6px', marginTop: 4 },
  joinBtn: { display: 'inline-block', marginTop: 6, backgroundColor: '#000', color: '#fff', border: '2px solid #111', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, padding: '4px 10px', textDecoration: 'none' },
  rxBtn:  { display: 'inline-block', backgroundColor: '#fff', color: '#000', border: '2px solid #111', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, padding: '3px 8px', textDecoration: 'none' },
  critCard: { border: '2px solid #CC0000', padding: '10px 12px', marginBottom: 8, backgroundColor: '#FFF5F5' },
  critMedName: { display: 'block', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#CC0000' },
  critMeta:    { display: 'block', fontFamily: 'monospace', fontSize: 10, color: '#CC0000', marginTop: 2 },
  warnCard: { border: '2px solid #FFC107', padding: '10px 12px', marginBottom: 8, backgroundColor: '#FFFDE7' },
  warnMedName: { display: 'block', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#996600' },
  warnMeta:    { display: 'block', fontFamily: 'monospace', fontSize: 10, color: '#996600', marginTop: 2 },
  allClearBadge: { border: '2px solid #22C55E', padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, color: '#166534', backgroundColor: '#F0FDF4', marginBottom: 8 },
  ctaBody: { fontFamily: 'monospace', fontSize: 12, color: '#555', margin: '0 0 12px 0', lineHeight: 1.6 },
  blackBtn: { display: 'block', backgroundColor: '#000', color: '#fff', border: '2px solid #111', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, padding: '10px 16px', textDecoration: 'none', textAlign: 'center' },
  outlineBtn: { display: 'block', backgroundColor: '#fff', color: '#000', border: '2px solid #111', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, padding: '6px 14px', cursor: 'pointer', textDecoration: 'none', textAlign: 'center', marginTop: 8 },
  payBadge: { display: 'flex', alignItems: 'center', gap: 8, border: '2px solid #22C55E', padding: '8px 12px', backgroundColor: '#F0FDF4', marginBottom: 8 },
  payBadgeText: { fontFamily: 'monospace', fontSize: 12, color: '#166534', fontWeight: 700 },
};
