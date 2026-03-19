'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Appointment, AuthUser } from '@preventia/shared';
import { getAppointments } from '@preventia/shared';
import ChatPanel from './ChatPanel';
import {
  pill,
  softButton,
  surface,
  textStyles,
  webTheme,
} from '@/lib/designSystem';

interface Props {
  user?: AuthUser;
}

const MOCK_FEED = [
  {
    id: 1,
    category: 'Nutrition',
    title: 'Vitamin D and immune support',
    time: '2h ago',
    body: 'A short read for patients who spend limited time outdoors and need a simpler explanation of lab-driven supplementation.',
  },
  {
    id: 2,
    category: 'Cardiology',
    title: 'Hypertension follow-up notes',
    time: '5h ago',
    body: 'A concise, patient-friendly summary for shared care planning across telehealth and pharmacy touchpoints.',
  },
];

const heroShellStyle: React.CSSProperties = {
  width: '100%',
  padding: '0 clamp(24px, 4vw, 56px) 20px',
  boxSizing: 'border-box',
  paddingBottom: 0,
};

const stackSectionStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '20px clamp(24px, 4vw, 56px) 0',
};

const panelGridStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0 clamp(24px, 4vw, 56px) 72px',
  display: 'flex',
  gap: 20,
  alignItems: 'flex-start',
  flexWrap: 'wrap',
};

const columnStyle = (basis: string, minWidth: number): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
  flex: `1 1 ${basis}`,
  minWidth,
});

const cardStyle: React.CSSProperties = surface({
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
});

const listCardStyle: React.CSSProperties = {
  ...surface({
    padding: 16,
    backgroundColor: webTheme.colors.surfaceAlt,
    boxShadow: 'none',
  }),
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const metaRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  alignItems: 'center',
};

const flowGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 16,
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
};

export default function DoctorDashboard({ user }: Readonly<Props>) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insightText, setInsightText] = useState('');
  const [realUserId, setRealUserId] = useState<number>(user?.userId ?? 0);

  const handleLogout = useCallback(() => {
    window.location.assign('/api/logout');
  }, []);

  const doctorName = user?.name ?? 'Doctor';

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

  const fetchData = useCallback(async () => {
    if (!user || realUserId === 0) {
      setLoading(false);
      return;
    }
    try {
      const data = await getAppointments({ doctorId: realUserId });
      setAppointments(data);
    } catch (error) {
      console.error('[DoctorDashboard]', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, realUserId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  const active = appointments.filter((appointment) => appointment.status === 'ACTIVE');
  const scheduled = appointments.filter((appointment) => {
    if (appointment.status !== 'SCHEDULED' && appointment.status !== 'ACTIVE') return false;
    const start = new Date(appointment.startTime);
    const end = new Date(appointment.endTime);
    return start >= todayStart && start < todayEnd && end > now;
  });
  const upcoming = appointments.filter((appointment) => {
    if (appointment.status !== 'SCHEDULED') return false;
    return new Date(appointment.startTime) >= todayEnd;
  });
  const completed = appointments.filter((appointment) =>
    appointment.status === 'COMPLETED' || appointment.status === 'LOCKED',
  );
  const requests = upcoming.slice(0, 3);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const formatFuture = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (!user) {
    return (
      <div style={heroShellStyle}>
        <section style={cardStyle}>
          <span style={textStyles.eyebrow}>Doctor portal</span>
          <h1 style={{ ...textStyles.display, margin: 0 }}>
            A gentler provider workspace.
          </h1>
          <p style={{ ...textStyles.body, margin: 0 }}>
            Sign in with a doctor account to manage consultations, documentation, and peer messaging in the updated system.
          </p>
          <a href="/login" style={softButton('accent')}>
            Sign in
          </a>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={heroShellStyle}>
        <section style={{ ...cardStyle, alignItems: 'center', justifyContent: 'center', minHeight: 280 }}>
          <span style={textStyles.muted}>Loading doctor workspace…</span>
        </section>
      </div>
    );
  }

  return (
    <>
      <section style={heroShellStyle}>
        <div
          style={{
            ...cardStyle,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minWidth: 280 }}>
            <span style={{ ...pill('accent'), alignSelf: 'flex-start' }}>Provider workspace</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1 style={{ ...textStyles.display, margin: 0 }}>Dr. {doctorName}</h1>
              <p style={{ ...textStyles.body, margin: 0, color: webTheme.colors.mutedText }}>
                Internal Medicine • License #882910
              </p>
            </div>
            <div style={metaRowStyle}>
              <span style={pill('neutral')}>Telehealth only</span>
              <span style={pill('success')}>Accepting patients</span>
              <span style={pill('accent')}>{scheduled.length + active.length} touchpoints today</span>
              <span style={pill(active.length > 0 ? 'rose' : 'gold')}>
                {active.length > 0 ? `${active.length} live now` : `${completed.length} docs pending`}
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              alignItems: 'stretch',
              minWidth: 220,
            }}
          >
            <a href="/doctor/profile" style={softButton('secondary')}>
              Edit profile
            </a>
            <a href="/doctor/book" style={softButton('accent')}>
              Book appointment
            </a>
            <button
              type="button"
              style={softButton('secondary')}
              onClick={() => {
                setRefreshing(true);
                void fetchData();
              }}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button type="button" style={softButton('ghost')} onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </section>

      <section style={stackSectionStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={textStyles.eyebrow}>Today&apos;s flow</span>
              <h2 style={{ ...textStyles.title, fontSize: 28, lineHeight: '34px', margin: 0 }}>
                Consultations and follow-up tasks
              </h2>
            </div>
            <div style={metaRowStyle}>
              <span style={pill('accent')}>{scheduled.length} scheduled</span>
              <span style={pill(active.length > 0 ? 'rose' : 'neutral')}>
                {active.length > 0 ? `${active.length} live now` : 'No live consults'}
              </span>
              <span style={pill('gold')}>{completed.length} documentation items</span>
            </div>
          </div>

          <div style={flowGridStyle}>
            {active.map((appointment) => (
              <div key={appointment.id} style={{ ...listCardStyle, backgroundColor: webTheme.colors.roseTint }}>
                <div style={metaRowStyle}>
                  <span style={pill('rose')}>Live now</span>
                  <span style={textStyles.muted}>{appointment.recipientName ?? `Patient #${appointment.id}`}</span>
                </div>
                <div style={textStyles.title}>{appointment.doctorName ?? 'Consultation in progress'}</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a href={`/doctor/consult/${appointment.id}`} style={softButton('rose')}>
                    Join consultation
                  </a>
                  <a href={`/doctor/patient/${appointment.recipientId ?? appointment.id}`} style={softButton('secondary')}>
                    Open patient view
                  </a>
                </div>
              </div>
            ))}

            {scheduled.map((appointment) => (
              <div key={appointment.id} style={listCardStyle}>
                <div style={metaRowStyle}>
                  <span style={pill('accent')}>{formatTime(appointment.startTime)}</span>
                  <span style={textStyles.muted}>{appointment.recipientName ?? `Patient #${appointment.id}`}</span>
                </div>
                <div style={textStyles.title}>Scheduled consultation</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a href={`/doctor/consult/${appointment.id}`} style={softButton('accent')}>
                    Start call
                  </a>
                  <a href={`/doctor/patient/${appointment.recipientId ?? appointment.id}`} style={softButton('secondary')}>
                    Preview chart
                  </a>
                </div>
              </div>
            ))}

            {completed
              .filter((appointment) => {
                const start = new Date(appointment.startTime);
                return start >= todayStart && start < todayEnd;
              })
              .map((appointment) => (
                <div key={appointment.id} style={{ ...listCardStyle, backgroundColor: webTheme.colors.goldTint }}>
                  <div style={metaRowStyle}>
                    <span style={pill('gold')}>Documentation</span>
                    <span style={textStyles.muted}>{appointment.recipientName ?? `Patient #${appointment.id}`}</span>
                  </div>
                  <div style={textStyles.title}>{formatTime(appointment.startTime)} visit completed</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <a href={`/doctor/notes/${appointment.id}`} style={softButton('secondary')}>
                      SOAP note
                    </a>
                    <a href={`/doctor/prescriptions/${appointment.id}`} style={softButton('secondary')}>
                      Upload Rx
                    </a>
                  </div>
                </div>
              ))}

            {active.length === 0 && scheduled.length === 0 && completed.length === 0 ? (
              <div style={listCardStyle}>
                <div style={textStyles.title}>Nothing scheduled today</div>
                <div style={textStyles.muted}>The doctor workspace will populate as appointments are booked.</div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section style={panelGridStyle}>
        <div style={columnStyle('34%', 300)}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={textStyles.eyebrow}>Care coordination</span>
              <h2 style={{ ...textStyles.title, fontSize: 26, lineHeight: '32px', margin: 0 }}>
                Upcoming requests and peer messages
              </h2>
            </div>

            {requests.length === 0 ? (
              <div style={listCardStyle}>
                <div style={textStyles.title}>No future requests queued</div>
                <div style={textStyles.muted}>New consultation requests will appear here as they are booked.</div>
              </div>
            ) : null}

            {requests.map((appointment) => (
              <div key={appointment.id} style={listCardStyle}>
                <div style={metaRowStyle}>
                  <span style={pill('neutral')}>Upcoming</span>
                  <span style={textStyles.muted}>{formatFuture(appointment.startTime)}</span>
                </div>
                <div style={textStyles.title}>{appointment.recipientName ?? `Patient #${appointment.id}`}</div>
                <a href={`/doctor/patient/${appointment.recipientId ?? appointment.id}`} style={softButton('secondary')}>
                  Review patient chart
                </a>
              </div>
            ))}

            <div style={{ ...surface({ padding: 16, boxShadow: 'none' }) }}>
              <ChatPanel userName={user.name} height={560} />
            </div>
          </div>
        </div>

        <div style={columnStyle('46%', 360)}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={textStyles.eyebrow}>Insights studio</span>
              <h2 style={{ ...textStyles.title, fontSize: 26, lineHeight: '32px', margin: 0 }}>
                Share clinical notes more calmly
              </h2>
            </div>

            <div style={{ ...surface({ padding: 18, boxShadow: 'none' }), display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea
                value={insightText}
                onChange={(event) => setInsightText(event.target.value)}
                placeholder="Share a research note, protocol reminder, or team insight…"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: 120,
                  resize: 'vertical',
                  border: `1px solid ${webTheme.colors.borderStrong}`,
                  borderRadius: webTheme.radius.md,
                  padding: '14px 16px',
                  fontFamily: webTheme.font.sans,
                  fontSize: 15,
                  lineHeight: '22px',
                  color: webTheme.colors.text,
                  outline: 'none',
                  backgroundColor: 'rgba(255,255,255,0.82)',
                }}
              />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" style={softButton('secondary')}>Attach video</button>
                <button type="button" style={softButton('secondary')}>Add images</button>
                <button type="button" style={softButton('secondary')}>Reference notes</button>
                <button
                  type="button"
                  style={{ ...softButton('accent'), marginLeft: 'auto' }}
                  onClick={() => setInsightText('')}
                >
                  Publish insight
                </button>
              </div>
            </div>

            {MOCK_FEED.map((item) => (
              <div key={item.id} style={listCardStyle}>
                <div style={metaRowStyle}>
                  <span style={pill('accent')}>{item.category}</span>
                  <span style={textStyles.muted}>{item.time}</span>
                </div>
                <div style={textStyles.title}>{item.title}</div>
                <div style={textStyles.body}>{item.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
