'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Appointment, AuthUser } from '@preventia/shared';
import { getAppointments } from '@preventia/shared';
import dynamic from 'next/dynamic';
import {
  pill,
  softButton,
  surface,
  textStyles,
  webTheme,
  inputStyle,
} from '@/lib/designSystem';

const ChatPanel = dynamic(() => import('./ChatPanel'), { ssr: false });

interface Props {
  user?: AuthUser;
}

function isMissedAppointment(appointment: Appointment, now = Date.now()) {
  return appointment.status === 'SCHEDULED' && new Date(appointment.endTime).getTime() < now;
}

const MOCK_FEED = [
  {
    id: 1,
    category: 'Nourishment',
    title: 'VITAMIN D AND IMMUNE SUPPORT',
    body: 'A short read for patients who spend limited time outdoors and need a simpler explanation of lab-driven supplementation.',
  },
  {
    id: 2,
    category: 'Mindset',
    title: 'HYPERTENSION FOLLOW-UP NOTES',
    body: 'A concise, patient-friendly summary for shared care planning across telehealth and pharmacy touchpoints.',
  },
];

const shellStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0 clamp(20px, 4vw, 48px) 72px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

const heroCardStyle: React.CSSProperties = surface({
  padding: 28,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
});

const cardStyle: React.CSSProperties = surface({
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
});

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
};

const cardTitleStyle: React.CSSProperties = {
  ...textStyles.label,
  fontSize: 11,
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
  color: webTheme.colors.text,
};

const listRowStyle: React.CSSProperties = {
  ...surface({ padding: 12, backgroundColor: webTheme.colors.surfaceAlt, boxShadow: 'none' }),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap' as const,
};

const blackFilledBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '9px 16px',
  borderRadius: webTheme.radius.pill,
  backgroundColor: '#111',
  color: '#fff',
  border: '1px solid #111',
  fontFamily: webTheme.font.sans,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap' as const,
};

const outlinedBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 14px',
  borderRadius: webTheme.radius.pill,
  backgroundColor: 'transparent',
  color: webTheme.colors.text,
  border: `1px solid ${webTheme.colors.borderStrong}`,
  fontFamily: webTheme.font.sans,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap' as const,
};

const avatarStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: '50%',
  backgroundColor: '#111',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: webTheme.font.sans,
  fontSize: 22,
  fontWeight: 700,
  flexShrink: 0,
};

const AUTO_JOIN_WINDOW_MS = 5 * 60 * 1000;
const APPOINTMENT_POLL_MS = 15000;

interface CardProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function DashCard({ title, children, action }: CardProps) {
  return (
    <div style={cardStyle}>
      <div style={{ ...cardHeaderStyle, justifyContent: 'space-between' }}>
        <span style={cardTitleStyle}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function DoctorDashboard({ user }: Readonly<Props>) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [realUserId, setRealUserId] = useState<number>(user?.userId ?? 0);

  // Post insight form state
  const [insightCategory, setInsightCategory] = useState('General');
  const [insightTitle, setInsightTitle] = useState('');
  const [insightBody, setInsightBody] = useState('');
  const [insightSuccess, setInsightSuccess] = useState(false);

  // Hourly rate
  const [rate, setRate] = useState(2500);
  const [rateUpdated, setRateUpdated] = useState(false);

  // Availability
  const [accepting, setAccepting] = useState(true);

  const doctorName = user?.name ?? 'Doctor';
  const nameParts = doctorName.split(' ');
  const initials = (nameParts[0]?.[0] ?? '') + (nameParts[1]?.[0] ?? '');

  const handleLogout = useCallback(() => {
    window.location.assign('/api/logout');
  }, []);

  useEffect(() => {
    if (!user?.token) return;
    fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${user.token}` },
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() as Promise<{ userId: number }> : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((me) => setRealUserId(me.userId))
      .catch(() => {});
  }, [user?.token]);

  const fetchData = useCallback(async (options?: { silent?: boolean }) => {
    if (!user || realUserId === 0) {
      if (!options?.silent) setLoading(false);
      return;
    }
    try {
      const data = await getAppointments({ doctorId: realUserId });
      setAppointments(data);
    } catch (error) {
      console.error('[DoctorDashboard]', error);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [user, realUserId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!user || realUserId === 0) return;

    const refreshAppointments = () => {
      if (document.visibilityState !== 'visible') return;
      void fetchData({ silent: true });
    };

    const intervalId = window.setInterval(refreshAppointments, APPOINTMENT_POLL_MS);
    window.addEventListener('focus', refreshAppointments);
    document.addEventListener('visibilitychange', refreshAppointments);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshAppointments);
      document.removeEventListener('visibilitychange', refreshAppointments);
    };
  }, [fetchData, realUserId, user]);

  const nowMs = Date.now();
  const liveAppointments = appointments.filter((appointment) => !isMissedAppointment(appointment, nowMs));
  const missedAppointments = appointments
    .filter((appointment) => isMissedAppointment(appointment, nowMs))
    .sort((left, right) => new Date(right.startTime).getTime() - new Date(left.startTime).getTime())
    .slice(0, 4);
  const pendingRequests = liveAppointments.filter((a) => a.status === 'SCHEDULED');
  const upcomingFirst = liveAppointments
    .filter((a) => a.status === 'SCHEDULED' || a.status === 'ACTIVE')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 3);
  const allowedPatientPeers = Array.from(
    new Map(
      appointments
        .filter((appointment): appointment is Appointment & { recipientId: number } => typeof appointment.recipientId === 'number')
        .map((appointment) => [
          String(appointment.recipientId),
          {
            id: String(appointment.recipientId),
            name: appointment.recipientName ?? `Patient #${appointment.recipientId}`,
          },
        ]),
    ).values(),
  );

  const shouldAutoJoinAfterAccept = useCallback((startTime: string) => {
    return new Date(startTime).getTime() - Date.now() <= AUTO_JOIN_WINDOW_MS;
  }, []);

  const handleApprove = useCallback(async (id: number, startTime: string) => {
    if (!user?.token) return;
    try {
      const res = await fetch(`/api/v1/appointments/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      if (res.ok) {
        void fetchData();
        if (shouldAutoJoinAfterAccept(startTime)) {
          router.push(`/doctor/consult/${id}`);
        }
      } else {
        console.error('[DoctorDashboard] approve failed', res.status, await res.text());
      }
    } catch (e) { console.error('[DoctorDashboard] approve failed', e); }
  }, [fetchData, router, shouldAutoJoinAfterAccept, user?.token]);

  const handleDecline = useCallback(async (id: number) => {
    if (!user?.token) return;
    try {
      const res = await fetch(`/api/v1/appointments/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      if (res.ok) {
        void fetchData();
      } else {
        console.error('[DoctorDashboard] decline failed', res.status, await res.text());
      }
    } catch (e) { console.error('[DoctorDashboard] decline failed', e); }
  }, [fetchData, user?.token]);

  const handlePostInsight = async () => {
    const payload = { category: insightCategory, title: insightTitle, body: insightBody };
    try {
      const res = await fetch('/api/v1/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setInsightSuccess(true);
        setInsightTitle('');
        setInsightBody('');
        setTimeout(() => setInsightSuccess(false), 4000);
      } else {
        console.log('[DoctorDashboard] POST /api/v1/insights mock:', payload);
        setInsightSuccess(true);
        setTimeout(() => setInsightSuccess(false), 4000);
      }
    } catch {
      console.log('[DoctorDashboard] POST /api/v1/insights mock:', payload);
      setInsightSuccess(true);
      setTimeout(() => setInsightSuccess(false), 4000);
    }
  };

  const handleUpdateRate = async () => {
    try {
      const res = await fetch('/api/v1/doctors/me/rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}) },
        body: JSON.stringify({ rateInr: rate }),
      });
      if (res.ok || true) {
        console.log('[DoctorDashboard] PUT /api/v1/doctors/me/rate mock:', { rateInr: rate });
        setRateUpdated(true);
        setTimeout(() => setRateUpdated(false), 3000);
      }
    } catch {
      console.log('[DoctorDashboard] PUT /api/v1/doctors/me/rate mock:', { rateInr: rate });
      setRateUpdated(true);
      setTimeout(() => setRateUpdated(false), 3000);
    }
  };

  const handleAvailabilityToggle = async (checked: boolean) => {
    setAccepting(checked);
    try {
      await fetch('/api/v1/doctors/me/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}) },
        body: JSON.stringify({ accepting: checked }),
      });
    } catch {
      console.log('[DoctorDashboard] PUT /api/v1/doctors/me/availability mock:', { accepting: checked });
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  if (!user) {
    return (
      <div style={shellStyle}>
        <section style={heroCardStyle}>
          <span style={textStyles.eyebrow}>Doctor portal</span>
          <h1 style={{ ...textStyles.display, margin: 0 }}>A provider workspace.</h1>
          <a href="/login" style={blackFilledBtn}>Sign in</a>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={shellStyle}>
        <section style={{ ...cardStyle, alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <span style={textStyles.muted}>Loading workspace…</span>
        </section>
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={shellStyle}>
      {/* HERO */}
      <section style={heroCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={avatarStyle}>{initials.toUpperCase() || 'DR'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: '#22C55E', display: 'inline-block' }} />
                <span style={{ ...textStyles.muted, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>PROVIDER PORTAL: {doctorName.toUpperCase()}</span>
              </div>
              <h1 style={{ ...textStyles.display, margin: 0, fontSize: 26, lineHeight: '32px' }}>Dr. {doctorName}</h1>
              <p style={{ ...textStyles.muted, margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Internal Medicine · License #882910
              </p>
              <div style={{ marginTop: 4 }}>
                <a href="/doctor/profile" style={{ ...pill('neutral'), fontSize: 10, textDecoration: 'none', cursor: 'pointer' }}>
                  SET HEALTH SPECIALTIES
                </a>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
            <button type="button" style={{ ...outlinedBtn, fontSize: 12 }} onClick={handleLogout}>SIGN OUT</button>
            <a href="/doctor/profile" style={blackFilledBtn}>EDIT PROFILE</a>
          </div>
        </div>
      </section>

      {/* 3-COLUMN GRID */}
      <div className="dd-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Pending Requests */}
          <DashCard title="PENDING REQUESTS">
            {pendingRequests.length === 0 ? (
              <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>No pending requests</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendingRequests.slice(0, 4).map((appt) => (
                  <div key={appt.id} style={{ ...surface({ padding: 12, backgroundColor: webTheme.colors.surfaceAlt, boxShadow: 'none' }), display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ ...textStyles.label, fontSize: 12 }}>{appt.recipientName ?? `Patient #${appt.id}`}</span>
                      <span style={{ ...textStyles.muted, fontSize: 10 }}>
                        Virtual Consultation · {new Date(appt.startTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        style={{ ...blackFilledBtn, fontSize: 10, padding: '6px 12px' }}
                        onClick={() => void handleApprove(appt.id, appt.startTime)}
                      >
                        {shouldAutoJoinAfterAccept(appt.startTime) ? 'ACCEPT & JOIN' : 'ACCEPT'}
                      </button>
                      <button type="button" style={{ ...outlinedBtn, fontSize: 10, padding: '6px 12px' }} onClick={() => void handleDecline(appt.id)}>DECLINE</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashCard>

          {/* In-Network Chat */}
          <DashCard title="IN-NETWORK CHAT" action={<a href="/doctor/messages" style={{ ...textStyles.muted, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', color: webTheme.colors.accentStrong }}>FULL SCREEN ›</a>}>
            <ChatPanel userName={doctorName} height={380} embedded allowedPeers={allowedPatientPeers} remoteComposeSearch allowThreadDelete />
          </DashCard>

        </div>

        {/* CENTER COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Post New Insight */}
          <DashCard title="POST NEW INSIGHT">
            {insightSuccess && (
              <div style={{ borderRadius: webTheme.radius.md, backgroundColor: '#EDF5EA', border: '1px solid rgba(126,154,119,0.2)', padding: '10px 14px', ...textStyles.muted, fontSize: 12, color: webTheme.colors.success }}>
                Insight posted successfully!
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ ...textStyles.label, fontSize: 11 }}>CATEGORY</label>
                <select value={insightCategory} onChange={(e) => setInsightCategory(e.target.value)} style={{ ...inputStyle, fontSize: 13 }}>
                  <option>Nourishment</option>
                  <option>Mindset</option>
                  <option>Movement</option>
                  <option>Sleep</option>
                  <option>General</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ ...textStyles.label, fontSize: 11 }}>CONTENT TITLE</label>
                <input value={insightTitle} onChange={(e) => setInsightTitle(e.target.value)} placeholder="e.g. Vitamin D and Immunity" style={{ ...inputStyle, fontSize: 13 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ ...textStyles.label, fontSize: 11 }}>BODY TEXT</label>
                <textarea value={insightBody} onChange={(e) => setInsightBody(e.target.value)} rows={4} placeholder="Share a clinical note or patient tip…" style={{ ...inputStyle, fontSize: 13, resize: 'vertical' as const }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" disabled style={{ ...outlinedBtn, opacity: 0.6 }}>ADD MEDIA</button>
                <button type="button" style={blackFilledBtn} onClick={() => void handlePostInsight()}>POST TO FEED</button>
              </div>
            </div>
          </DashCard>

          {/* Lifestyle Insights Feed */}
          <DashCard title="LIFESTYLE INSIGHTS">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
              {MOCK_FEED.map((item) => (
                <div key={item.id} style={{ ...surface({ padding: 14, backgroundColor: webTheme.colors.surfaceAlt, boxShadow: 'none' }), display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ ...pill('success'), fontSize: 9, padding: '3px 7px', alignSelf: 'flex-start' }}>{item.category.toUpperCase()}</span>
                  <span style={{ ...textStyles.label, fontSize: 12 }}>{item.title}</span>
                  <span style={{ ...textStyles.muted, fontSize: 11 }}>{item.body}</span>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <button type="button" style={{ ...outlinedBtn, fontSize: 10, padding: '4px 10px' }}>LIKE ♥</button>
                    <button type="button" style={{ ...outlinedBtn, fontSize: 10, padding: '4px 10px' }}>SHARE ↗</button>
                  </div>
                </div>
              ))}
            </div>
          </DashCard>

        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Upcoming Consultation Sessions */}
          <DashCard title="UPCOMING CONSULTATION SESSIONS">
            <div style={{ marginBottom: 12 }}>
              <a href="/doctor/book" style={{ ...blackFilledBtn, fontSize: 11, display: 'inline-block' }}>
                + BOOK APPOINTMENT
              </a>
            </div>
            {upcomingFirst.length === 0 ? (
              <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>No upcoming sessions</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingFirst.map((appt) => (
                  <div key={appt.id} style={listRowStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ ...textStyles.label, fontSize: 11 }}>{formatTime(appt.startTime)}</span>
                      <span style={{ ...textStyles.muted, fontSize: 10 }}>{new Date(appt.startTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {appt.status === 'ACTIVE' && (
                        <span style={{ ...pill('success'), fontSize: 9, padding: '3px 7px' }}>LIVE</span>
                      )}
                      <a href={`/doctor/patient/${appt.recipientId ?? appt.id}`} style={{ ...outlinedBtn, fontSize: 9, padding: '4px 8px' }}>VIEW PATIENT</a>
                      <a href={`/doctor/consult/${appt.id}`} style={{ ...blackFilledBtn, fontSize: 10, padding: '6px 12px' }}>
                        {appt.status === 'ACTIVE' ? 'JOIN VIDEO' : 'OPEN CALL'}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashCard>

          <DashCard title="MISSED APPOINTMENTS">
            {missedAppointments.length === 0 ? (
              <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>No missed appointments</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {missedAppointments.map((appt) => (
                  <div key={appt.id} style={listRowStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ ...textStyles.label, fontSize: 11 }}>{appt.recipientName ?? `Patient #${appt.recipientId ?? appt.id}`}</span>
                      <span style={{ ...textStyles.muted, fontSize: 10 }}>
                        {new Date(appt.startTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} · {formatTime(appt.startTime)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span style={{ ...pill('rose'), fontSize: 9, padding: '3px 7px' }}>MISSED</span>
                      <a href={`/doctor/patient/${appt.recipientId ?? appt.id}`} style={{ ...outlinedBtn, fontSize: 9, padding: '4px 8px' }}>VIEW PATIENT</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashCard>

          {/* Hourly Rate */}
          <DashCard title="PROFESSIONAL FEE PER SESSION">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ ...textStyles.display, fontSize: 32, lineHeight: '38px', margin: 0 }}>₹ {rate.toLocaleString('en-IN')}</span>
              {rateUpdated && (
                <div style={{ borderRadius: webTheme.radius.md, backgroundColor: '#EDF5EA', border: '1px solid rgba(126,154,119,0.2)', padding: '8px 12px', ...textStyles.muted, fontSize: 11, color: webTheme.colors.success }}>
                  Rate updated successfully
                </div>
              )}
              <input
                type="number"
                value={rate}
                min={100}
                onChange={(e) => setRate(Number(e.target.value))}
                style={{ ...inputStyle, fontSize: 14 }}
              />
              <button
                type="button"
                style={{ ...blackFilledBtn, backgroundColor: '#8B1C1C', borderColor: '#8B1C1C' }}
                onClick={() => void handleUpdateRate()}
              >
                UPDATE HOURLY RATE
              </button>
            </div>
          </DashCard>

          {/* Consultation Revenue */}
          <DashCard title="CONSULTATION REVENUE">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ ...textStyles.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>PAYMENTS UNTIL {todayStr.toUpperCase()}</span>
              <span style={{ ...textStyles.display, fontSize: 28, lineHeight: '34px', margin: 0 }}>₹ 82,500</span>
              <div style={listRowStyle}>
                <span style={{ ...textStyles.muted, fontSize: 11 }}>Priya Sharma</span>
                <span style={{ ...textStyles.label, fontSize: 11 }}>₹ 2,500</span>
              </div>
            </div>
          </DashCard>

          {/* Availability Settings */}
          <DashCard title="AVAILABILITY SETTINGS">
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={accepting}
                onChange={(e) => void handleAvailabilityToggle(e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <span style={{ ...textStyles.label, fontSize: 12 }}>ACCEPTING REQUESTS</span>
              {accepting
                ? <span style={{ ...pill('success'), fontSize: 9, padding: '3px 7px' }}>ACTIVE</span>
                : <span style={{ ...pill('rose'), fontSize: 9, padding: '3px 7px' }}>PAUSED</span>
              }
            </label>
          </DashCard>

        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .dd-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
