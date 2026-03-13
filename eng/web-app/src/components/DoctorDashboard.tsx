'use client';

/**
 * DoctorDashboard.tsx — Provider Portal (Neo-Brutalist UI)
 * Project Dhanvanthri
 *
 * 3-column grid layout matching the Provider Portal mockup.
 * All styles via React.CSSProperties — no Tailwind, no CSS modules.
 *
 * API:
 *  GET /api/v1/appointments?doctorId={userId}
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { Appointment, AuthUser } from '@dhanvanthri/shared';
import { getAppointments } from '@dhanvanthri/shared';
import ChatPanel from './ChatPanel';

interface Props {
  user?: AuthUser;
}

// ─── Mock feed data ────────────────────────────────────────────────────────────

const MOCK_FEED = [
  {
    id: 1,
    category: 'NUTRITION',
    title: 'THE ROLE OF VITAMIN D IN IMMUNE FUNCTION',
    time: '2h ago',
    body: 'Recent studies confirm that adequate Vitamin D levels are critical for maintaining robust immune responses, particularly in populations with limited sun exposure.',
  },
  {
    id: 2,
    category: 'CARDIOLOGY',
    title: 'HYPERTENSION MANAGEMENT: 2025 GUIDELINES UPDATE',
    time: '5h ago',
    body: 'Updated ACC/AHA guidelines recommend reassessing first-line antihypertensives for patients with comorbid diabetes, shifting toward SGLT2 inhibitors as adjunct therapy.',
  },
];

const MOCK_CONTACTS = [
  { id: 1, name: 'Dr. Priya Nair', specialty: 'Cardiologist', online: true },
  { id: 2, name: 'Dr. Arjun Mehta', specialty: 'Dermatologist', online: false },
  { id: 3, name: 'Dr. Kavitha Rao', specialty: 'Endocrinologist', online: true },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DoctorDashboard({ user }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [consultFee, setConsultFee] = useState('2500');
  const [insightText, setInsightText] = useState('');

  const doctorName = user?.name ?? 'DOCTOR';
  const initials = doctorName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
  const requests  = appointments.filter(a => a.status === 'SCHEDULED').slice(0, 3);

  // ─── Unauthenticated stub ──────────────────────────────────────────────────

  if (!user) {
    return (
      <div style={styles.stub}>
        <h2 style={styles.stubHeading}>PROVIDER PORTAL</h2>
        <p style={styles.stubBody}>Sign in with a DOCTOR account to view your dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.centered}>
        <span style={styles.spinner}>Loading portal…</span>
      </div>
    );
  }

  // ─── Full portal ──────────────────────────────────────────────────────────

  return (
    <div style={styles.pageRoot}>

      {/* ── Top Nav ─────────────────────────────────────────────────────── */}
      <div style={styles.topNav}>
        <div style={styles.topNavLeft}>
          <span style={styles.greenDot} />
          <span style={styles.portalLabel}>PROVIDER PORTAL: DR. {doctorName.toUpperCase()}</span>
        </div>
        <button style={styles.logoutBtn}>LOG OUT</button>
      </div>

      {/* ── Profile Header Card ──────────────────────────────────────────── */}
      <div style={styles.profileCard}>
        <div style={styles.avatar}>{initials}</div>
        <div style={styles.profileInfo}>
          <h1 style={styles.profileName}>DR. {doctorName.toUpperCase()}, MD</h1>
          <p style={styles.profileSub}>Internal Medicine • License #882910</p>
          <div style={styles.badgeRow}>
            <span style={styles.badge}>Telehealth Only</span>
            <span style={{ ...styles.badge, borderColor: '#22C55E', color: '#22C55E' }}>
              Status: Accepting Patients
            </span>
          </div>
        </div>
        <button style={styles.editProfileBtn}>EDIT PROFILE PAGE</button>
      </div>

      {/* ── 3-Column Grid ───────────────────────────────────────────────── */}
      <div style={styles.grid}>

        {/* ── LEFT COL ──────────────────────────────────────────────────── */}
        <div style={styles.colLeft}>

          {/* Virtual Requests */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={{ ...styles.sectionLabel, ...styles.greenAccent }}>
                VIRTUAL REQUESTS
              </span>
            </div>
            {requests.length === 0 && (
              <p style={styles.emptyNote}>No pending requests.</p>
            )}
            {requests.map(a => (
              <div key={a.id} style={styles.requestCard}>
                <div style={styles.requestInfo}>
                  <span style={styles.requestName}>{a.recipientName ?? `Patient #${a.id}`}</span>
                  <span style={styles.requestMeta}>
                    {new Date(a.startTime).toLocaleTimeString('en-IN', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <div style={styles.requestActions}>
                  <button style={styles.acceptBtn}>ACCEPT</button>
                  <button style={styles.declineBtn}>DECLINE</button>
                </div>
              </div>
            ))}
          </div>

          {/* Stream Chat — replaces static Peer Contacts */}
          <div style={styles.section}>
            <span style={{ ...styles.sectionLabel, ...styles.greenAccent }}>
              PEER MESSAGES
            </span>
            <ChatPanel userId={user?.userId} userName={user?.name} />
          </div>
        </div>

        {/* ── CENTER COL ────────────────────────────────────────────────── */}
        <div style={styles.colCenter}>
          <div style={styles.section}>
            <span style={{ ...styles.sectionLabel, ...styles.greenAccent }}>
              HEALTH INSIGHTS FEED
            </span>

            {/* Compose */}
            <div style={styles.composeBox}>
              <textarea
                value={insightText}
                onChange={e => setInsightText(e.target.value)}
                placeholder="Share a clinical insight, research note, or protocol update…"
                style={styles.composeTextarea}
                rows={4}
              />
              <div style={styles.composeActions}>
                <button style={styles.attachBtn}>VIDEO</button>
                <button style={styles.attachBtn}>IMAGES</button>
                <button style={styles.attachBtn}>BROWSE</button>
                <button
                  style={{ ...styles.blackBtn, marginLeft: 'auto' }}
                  onClick={() => setInsightText('')}
                >
                  PUBLISH INSIGHT
                </button>
              </div>
            </div>

            {/* Feed cards */}
            {MOCK_FEED.map(f => (
              <div key={f.id} style={styles.feedCard}>
                <div style={styles.feedMeta}>
                  <span style={styles.feedCategory}>{f.category}</span>
                  <span style={styles.feedTime}>{f.time}</span>
                </div>
                <h3 style={styles.feedTitle}>{f.title}</h3>
                <p style={styles.feedBody}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT COL ─────────────────────────────────────────────────── */}
        <div style={styles.colRight}>

          {/* Today's Schedule */}
          <div style={styles.section}>
            <span style={{ ...styles.sectionLabel, ...styles.greenAccent }}>
              TODAY&apos;S SCHEDULE
            </span>

            {active.map(a => (
              <div key={a.id} style={{ ...styles.scheduleCard, borderColor: '#CC0000' }}>
                <div style={styles.scheduleInfo}>
                  <span style={styles.scheduleName}>{a.recipientName ?? `Patient #${a.id}`}</span>
                  <span style={{ ...styles.scheduleMeta, color: '#CC0000' }}>● ACTIVE</span>
                </div>
                <a href={`/doctor/consult/${a.id}`} style={styles.joinBtn}>
                  JOIN
                </a>
              </div>
            ))}

            {scheduled.map(a => (
              <div key={a.id} style={styles.scheduleCard}>
                <div style={styles.scheduleInfo}>
                  <span style={styles.scheduleName}>{a.recipientName ?? `Patient #${a.id}`}</span>
                  <span style={styles.scheduleMeta}>
                    {new Date(a.startTime).toLocaleTimeString('en-IN', {
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <a href={`/doctor/consult/${a.id}`} style={styles.joinBtn}>
                  JOIN
                </a>
              </div>
            ))}

            {completed.map(a => (
              <div key={a.id} style={{ ...styles.scheduleCard, borderColor: '#ccc' }}>
                <div style={styles.scheduleInfo}>
                  <span style={styles.scheduleName}>{a.recipientName ?? `Patient #${a.id}`}</span>
                  <span style={styles.scheduleMeta}>COMPLETED</span>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <a href={`/doctor/notes/${a.id}`} style={styles.soapBtn}>SOAP</a>
                  <a href={`/doctor/prescriptions/${a.id}`} style={styles.soapBtn}>Rx</a>
                </div>
              </div>
            ))}

            {appointments.length === 0 && (
              <p style={styles.emptyNote}>No appointments today.</p>
            )}

            <button
              onClick={() => { setRefreshing(true); void fetchData(); }}
              style={{ ...styles.outlineBtn, marginTop: 8 }}
              disabled={refreshing}
            >
              {refreshing ? 'REFRESHING…' : 'REFRESH'}
            </button>
          </div>

          {/* Fee Schedule */}
          <div style={styles.section}>
            <span style={styles.sectionLabel}>FEE SCHEDULE</span>
            <div style={styles.feeRow}>
              <span style={styles.feeLabel}>Consultation Rate</span>
              <div style={styles.feeInputRow}>
                <span style={styles.rupeeSign}>₹</span>
                <input
                  type="number"
                  value={consultFee}
                  onChange={e => setConsultFee(e.target.value)}
                  style={styles.feeInput}
                />
              </div>
            </div>
            <button style={styles.blackBtn}>SAVE RATE</button>
          </div>

          {/* Payments Received */}
          <div style={styles.section}>
            <span style={{ ...styles.sectionLabel, ...styles.greenAccent }}>
              PAYMENTS RECEIVED
            </span>
            <div style={styles.paymentRow}>
              <span style={styles.paymentLabel}>This Week</span>
              <span style={styles.paymentAmount}>₹ 12,500</span>
            </div>
            <div style={styles.paymentRow}>
              <span style={styles.paymentLabel}>This Month</span>
              <span style={styles.paymentAmount}>₹ 48,000</span>
            </div>
            <div style={styles.paymentRow}>
              <span style={styles.paymentLabel}>Pending</span>
              <span style={{ ...styles.paymentAmount, color: '#FFC107' }}>₹ 7,500</span>
            </div>
            <button style={styles.outlineBtn}>VIEW FULL STATEMENT</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  // Page shell
  pageRoot: {
    backgroundColor: '#F5F5F5',
    minHeight: '100vh',
    fontFamily: 'monospace',
  },

  // Loading / stub
  centered: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  spinner:  { fontFamily: 'monospace', fontSize: 14, color: '#333' },
  stub: {
    border: '3px solid #111', padding: 48, textAlign: 'center',
    maxWidth: 480, margin: '64px auto', backgroundColor: '#fff',
  },
  stubHeading: { fontFamily: 'Georgia, serif', fontSize: 24, marginBottom: 8, color: '#000' },
  stubBody:    { fontFamily: 'monospace', fontSize: 13, color: '#555' },

  // Top nav
  topNav: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#000', color: '#fff',
    padding: '10px 24px', borderBottom: '3px solid #111',
  },
  topNavLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  greenDot: {
    width: 10, height: 10, borderRadius: '50%',
    backgroundColor: '#22C55E', flexShrink: 0,
  },
  portalLabel: {
    fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
    letterSpacing: 1.5, color: '#fff', textTransform: 'uppercase',
  },
  logoutBtn: {
    fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
    backgroundColor: 'transparent', color: '#fff',
    border: '2px solid #fff', padding: '4px 12px', cursor: 'pointer',
  },

  // Profile header
  profileCard: {
    display: 'flex', alignItems: 'center', gap: 20,
    backgroundColor: '#fff', border: '3px solid #111',
    padding: '20px 24px', margin: '16px',
  },
  avatar: {
    width: 64, height: 64, backgroundColor: '#000', color: '#fff',
    fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  profileInfo:  { flex: 1 },
  profileName:  { fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, margin: '0 0 4px 0', color: '#000' },
  profileSub:   { fontFamily: 'monospace', fontSize: 12, color: '#666', margin: '0 0 10px 0' },
  badgeRow:     { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
  badge: {
    border: '2px solid #111', padding: '3px 10px',
    fontFamily: 'monospace', fontSize: 11, fontWeight: 700, backgroundColor: '#fff',
  },
  editProfileBtn: {
    backgroundColor: '#fff', color: '#000', border: '2px solid #111',
    fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
    padding: '6px 14px', cursor: 'pointer', flexShrink: 0,
  },

  // Grid
  grid: {
    display: 'flex', gap: 16, padding: '0 16px 16px 16px',
    alignItems: 'flex-start',
  },
  colLeft:   { flex: '0 0 25%', minWidth: 0 },
  colCenter: { flex: '0 0 40%', minWidth: 0 },
  colRight:  { flex: '0 0 35%', minWidth: 0 },

  // Section wrapper
  section: {
    backgroundColor: '#fff', border: '3px solid #111',
    padding: 16, marginBottom: 16,
  },
  sectionHeader: { marginBottom: 10 },
  sectionLabel: {
    display: 'block',
    fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, color: '#000',
  },
  greenAccent: {
    borderLeft: '4px solid #22C55E', paddingLeft: 8,
  },
  emptyNote: { fontFamily: 'monospace', fontSize: 11, color: '#888', margin: '8px 0' },

  // Request card (left col)
  requestCard: {
    border: '2px solid #111', padding: '10px 12px',
    marginBottom: 8, backgroundColor: '#F5F5F5',
  },
  requestInfo:    { marginBottom: 8 },
  requestName:    { display: 'block', fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700, color: '#000' },
  requestMeta:    { display: 'block', fontFamily: 'monospace', fontSize: 11, color: '#666' },
  requestActions: { display: 'flex', gap: 8 },
  acceptBtn: {
    fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
    backgroundColor: '#22C55E', color: '#fff', border: '2px solid #111',
    padding: '4px 10px', cursor: 'pointer',
  },
  declineBtn: {
    fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
    backgroundColor: '#fff', color: '#CC0000', border: '2px solid #CC0000',
    padding: '4px 10px', cursor: 'pointer',
  },

  // Network (left col)
  searchInput: {
    width: '100%', boxSizing: 'border-box' as const,
    fontFamily: 'monospace', fontSize: 12,
    border: '2px solid #111', padding: '6px 10px',
    marginBottom: 10, backgroundColor: '#fff',
    outline: 'none',
  },
  contactRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    borderBottom: '1px solid #eee', padding: '8px 0',
  },
  onlineDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  contactInfo:  { flex: 1 },
  contactName:  { display: 'block', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#000' },
  contactSpec:  { display: 'block', fontFamily: 'monospace', fontSize: 10, color: '#666' },
  iconBtn: {
    fontFamily: 'monospace', fontSize: 14,
    backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
    padding: '2px 4px',
  },

  // Compose (center col)
  composeBox: {
    border: '2px solid #111', padding: 12, marginBottom: 16,
  },
  composeTextarea: {
    width: '100%', boxSizing: 'border-box' as const,
    fontFamily: 'monospace', fontSize: 12,
    border: '2px solid #ccc', padding: '8px 10px',
    resize: 'vertical' as const, outline: 'none',
    marginBottom: 10,
  },
  composeActions: { display: 'flex', gap: 8, alignItems: 'center' },
  attachBtn: {
    fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
    backgroundColor: '#F5F5F5', color: '#000', border: '2px solid #111',
    padding: '4px 10px', cursor: 'pointer',
  },

  // Feed card (center col)
  feedCard: {
    border: '3px solid #111', padding: 16,
    marginBottom: 12, backgroundColor: '#fff',
  },
  feedMeta:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  feedCategory: {
    fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
    backgroundColor: '#22C55E', color: '#fff', padding: '2px 8px',
    textTransform: 'uppercase', letterSpacing: 1,
  },
  feedTime:  { fontFamily: 'monospace', fontSize: 10, color: '#888' },
  feedTitle: {
    fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 700,
    textTransform: 'uppercase', margin: '0 0 8px 0', color: '#000',
  },
  feedBody: { fontFamily: 'monospace', fontSize: 12, color: '#444', margin: 0, lineHeight: 1.6 },

  // Schedule card (right col)
  scheduleCard: {
    border: '2px solid #111', padding: '10px 12px',
    marginBottom: 8, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleInfo: { flex: 1 },
  scheduleName: { display: 'block', fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700, color: '#000' },
  scheduleMeta: { display: 'block', fontFamily: 'monospace', fontSize: 11, color: '#666' },
  joinBtn: {
    fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
    backgroundColor: '#000', color: '#fff', border: '2px solid #111',
    padding: '5px 12px', cursor: 'pointer', textDecoration: 'none',
    display: 'inline-block',
  },
  soapBtn: {
    fontFamily: 'monospace', fontSize: 10, fontWeight: 700,
    backgroundColor: '#fff', color: '#000', border: '2px solid #111',
    padding: '4px 8px', cursor: 'pointer', textDecoration: 'none',
    display: 'inline-block',
  },

  // Fee schedule (right col)
  feeRow:      { marginBottom: 10 },
  feeLabel:    { display: 'block', fontFamily: 'monospace', fontSize: 11, color: '#666', marginBottom: 4 },
  feeInputRow: { display: 'flex', alignItems: 'center', gap: 4 },
  rupeeSign:   { fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#000' },
  feeInput: {
    fontFamily: 'monospace', fontSize: 20, fontWeight: 700,
    border: '2px solid #111', padding: '6px 10px',
    width: 120, outline: 'none', color: '#000',
  },

  // Payments (right col)
  paymentRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '1px solid #eee', padding: '8px 0',
  },
  paymentLabel:  { fontFamily: 'monospace', fontSize: 11, color: '#666' },
  paymentAmount: { fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 700, color: '#000' },

  // Shared buttons
  blackBtn: {
    backgroundColor: '#000', color: '#fff', border: '2px solid #111',
    fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
    padding: '6px 14px', cursor: 'pointer',
  },
  outlineBtn: {
    backgroundColor: '#fff', color: '#000', border: '2px solid #111',
    fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
    padding: '6px 14px', cursor: 'pointer', display: 'block',
    width: '100%', marginTop: 10, textAlign: 'center',
  },
};
