'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { Appointment, AuthUser } from '@preventia/shared';
import dynamic from 'next/dynamic';
import {
  pill,
  softButton,
  surface,
  textStyles,
  webTheme,
} from '@/lib/designSystem';

const ChatPanel = dynamic(() => import('./ChatPanel'), { ssr: false });
const EmergencyButton = dynamic(() => import('./EmergencyButton'), { ssr: false });

interface Vital {
  label: string;
  value: string;
  unit: string;
  numericValue?: number;
  maxValue?: number;
  status?: 'good' | 'warning' | 'danger';
}

// ── Live data types ──────────────────────────────────────────────────────────

interface SoapNoteData {
  id: number;
  appointmentId?: number;
  objective: string;
  assessment: string;
  plan: string;
  createdAt: string;
  doctorId: number;
}

interface MedicationData {
  id: number;
  drugName: string;
  totalQuantity: number;
  dailyDosage: number;
  unitPriceInr?: number;
}

interface PaymentData {
  id: number;
  status: string;
  createdAt: string;
  amountCents?: number;
  currency?: string;
  paymentType?: string;
}

interface PrescriptionFile {
  index: number;
  filename: string;
  url: string;
}

interface PrescriptionRecord {
  appointmentId: number;
  files: PrescriptionFile[];
}

// Styles
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
  gap: 20,
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

const cardLinkStyle: React.CSSProperties = {
  ...textStyles.muted,
  fontSize: 11,
  textDecoration: 'none',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
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
  width: 72,
  height: 72,
  borderRadius: '50%',
  backgroundColor: '#111',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: webTheme.font.sans,
  fontSize: 24,
  fontWeight: 700,
  flexShrink: 0,
};

function VitalSparkBar({ vital }: { vital: Vital }) {
  const pct = vital.numericValue && vital.maxValue ? Math.min(100, (vital.numericValue / vital.maxValue) * 100) : 50;
  const barColor = vital.status === 'good' ? '#7E9A77' : vital.status === 'warning' ? '#B89A5F' : '#C78375';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...textStyles.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{vital.label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ ...textStyles.label, fontSize: 13 }}>{vital.value} <span style={{ ...textStyles.muted, fontSize: 10 }}>{vital.unit}</span></span>
          {vital.label === 'HEART RATE' && <span style={{ ...pill('success'), fontSize: 9, padding: '3px 7px' }}>GOOD</span>}
        </div>
      </div>
      <div style={{ height: 5, borderRadius: 999, backgroundColor: webTheme.colors.border, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: 999, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

interface CardProps {
  title: string;
  linkLabel?: string;
  linkHref?: string;
  children: React.ReactNode;
}

function DashCard({ title, linkLabel, linkHref, children }: CardProps) {
  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <span style={cardTitleStyle}>{title}</span>
        {linkLabel && linkHref && (
          <a href={linkHref} style={cardLinkStyle}>{linkLabel}</a>
        )}
      </div>
      {children}
    </div>
  );
}

interface Props {
  user?: AuthUser;
}

export default function PatientDashboard({ user }: Readonly<Props>) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentLoading, setAppointmentLoading] = useState(true);
  const [realUserId, setRealUserId] = useState<number>(user?.userId ?? 0);
  const [chatPeerUserId, setChatPeerUserId] = useState<string | null>(null);
  const [chatPeerName, setChatPeerName] = useState<string>('Your Doctor');

  // Live clinical data state
  const [soapNotes, setSoapNotes] = useState<SoapNoteData[]>([]);
  const [medications, setMedications] = useState<MedicationData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [prescriptionRecords, setPrescriptionRecords] = useState<PrescriptionRecord[]>([]);
  const [clinicalLoading, setClinicalLoading] = useState(true);

  const patientName = user?.name ?? 'Patient';
  const nameParts = patientName.split(' ');
  const initials = (nameParts[0]?.[0] ?? '') + (nameParts[1]?.[0] ?? '');

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

  useEffect(() => {
    if (!user?.token) return;
    fetch('/api/v1/chat/peer', {
      headers: { Authorization: `Bearer ${user.token}` },
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() as Promise<{ peerUserId?: string; peerName?: string }> : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        if (data.peerUserId) setChatPeerUserId(data.peerUserId);
        if (data.peerName) setChatPeerName(data.peerName);
      })
      .catch(() => {});
  }, [user?.token]);

  // Live clinical data fetch
  useEffect(() => {
    if (!user?.token) { setClinicalLoading(false); return; }
    const headers = { Authorization: `Bearer ${user.token}` };
    Promise.all([
      fetch('/api/v1/patients/me/soap-notes', { headers, credentials: 'include' }).then(r => r.ok ? r.json() : []),
      fetch('/api/v1/patients/me/medications', { headers, credentials: 'include' }).then(r => r.ok ? r.json() : []),
      fetch('/api/v1/patients/me/payments', { headers, credentials: 'include' }).then(r => r.ok ? r.json() : []),
      fetch('/api/v1/patients/me/prescription-records', { headers, credentials: 'include' }).then(r => r.ok ? r.json() : []),
    ])
      .then(([notes, meds, pays, records]) => {
        setSoapNotes(notes as SoapNoteData[]);
        setMedications(meds as MedicationData[]);
        setPayments(pays as PaymentData[]);
        setPrescriptionRecords(records as PrescriptionRecord[]);
      })
      .catch(() => {})
      .finally(() => setClinicalLoading(false));
  }, [user?.token]);

  const fetchAppointments = useCallback(async (uid: number) => {
    if (!user || uid === 0) { setAppointmentLoading(false); return; }
    try {
      const res = await fetch(`/api/v1/appointments?recipientId=${uid}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) setAppointments(await res.json() as Appointment[]);
    } catch {
      setAppointments([]);
    } finally {
      setAppointmentLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (realUserId > 0) void fetchAppointments(realUserId);
  }, [realUserId, fetchAppointments]);

  useEffect(() => {
    if (realUserId === 0) return;
    const terminal = ['ACTIVE', 'COMPLETED', 'LOCKED'] as const;
    const allDone = appointments.length > 0 && appointments.every((a) => (terminal as readonly string[]).includes(a.status));
    const hasScheduled = appointments.some((a) => a.status === 'SCHEDULED');
    const hasActive = appointments.some((a) => a.status === 'ACTIVE');
    if ((!hasScheduled && !hasActive) || allDone) return;
    const timer = setInterval(() => { void fetchAppointments(realUserId); }, 10_000);
    return () => clearInterval(timer);
  }, [realUserId, appointments, fetchAppointments]);

  if (!user) {
    return (
      <div style={shellStyle}>
        <section style={heroCardStyle}>
          <span style={textStyles.eyebrow}>Patient portal</span>
          <h1 style={{ ...textStyles.display, margin: 0 }}>Your care, one place.</h1>
          <a href="/login" style={blackFilledBtn}>Sign in</a>
        </section>
      </div>
    );
  }

  const now = Date.now();
  const thirtyMin = 30 * 60 * 1000;
  const joinableAppt = appointments.find((a) => {
    if (a.status === 'COMPLETED' || a.status === 'LOCKED') return false;
    if (!a.dailyRoomUrl) return false;
    if (a.status === 'ACTIVE') return true;
    const start = new Date(a.startTime).getTime();
    const end = new Date(a.endTime).getTime();
    return now >= start - thirtyMin && now <= end + thirtyMin;
  });

  const nextAppt = appointments.find((a) => a.status === 'SCHEDULED' || a.status === 'ACTIVE');
  const upcomingSessions = appointments
    .filter((a) => a.status === 'SCHEDULED' || a.status === 'ACTIVE')
    .slice(0, 2);
  const allowedDoctorPeerIds = Array.from(
    new Set(
      appointments
        .map((appointment) => appointment.doctorId)
        .filter((doctorId): doctorId is number => typeof doctorId === 'number')
        .map(String),
    ),
  );

  const timeUntil = (iso: string): string => {
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return 'Now';
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  function parseVitalsFromObjective(text: string): Vital[] {
    if (!text) return [];
    const patterns: Array<{ label: string; regex: RegExp; unit: string; max: number; statusFn: (pct: number) => Vital['status'] }> = [
      { label: 'HEART RATE',     regex: /(?:HR|Heart Rate)[:\s]+(\d+)/i,         unit: 'bpm',   max: 120, statusFn: p => p > 85 ? 'danger' : p > 65 ? 'warning' : 'good' },
      { label: 'BLOOD PRESSURE', regex: /(?:BP|Blood Pressure)[:\s]+([\d\/]+)/i, unit: 'mmHg',  max: 100, statusFn: p => p > 85 ? 'danger' : p > 65 ? 'warning' : 'good' },
      { label: 'TEMPERATURE',    regex: /(?:Temp|Temperature)[:\s]+([\d.]+)/i,   unit: '°F',    max: 105, statusFn: p => p > 95 ? 'danger' : p > 80 ? 'warning' : 'good' },
      { label: 'SPO2',           regex: /(?:SpO2|Oxygen)[:\s]+(\d+)/i,           unit: '%',     max: 100, statusFn: p => p < 90 ? 'danger' : p < 95 ? 'warning' : 'good' },
      { label: 'GLUCOSE',        regex: /(?:Glucose|Blood Sugar)[:\s]+(\d+)/i,   unit: 'mg/dL', max: 200, statusFn: p => p > 90 ? 'warning' : 'good' },
      { label: 'WEIGHT',         regex: /(?:Weight|Wt)[:\s]+([\d.]+)/i,          unit: 'kg',    max: 150, statusFn: _ => 'good' },
    ];
    return patterns
      .map(p => {
        const m = text.match(p.regex);
        if (!m) return null;
        const num = parseFloat(m[1]);
        const pct = Math.min(100, (num / p.max) * 100);
        return { label: p.label, value: m[1], unit: p.unit, numericValue: num, maxValue: p.max, status: p.statusFn(pct) } as Vital;
      })
      .filter((v): v is Vital => v !== null);
  }

  return (
    <div style={shellStyle}>
      {/* TOP NAV */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/patient" style={{ ...outlinedBtn, fontSize: 12 }}>← Back</a>
          <span style={{ ...textStyles.eyebrow, color: webTheme.colors.text }}>PROFILE DASHBOARD: {patientName.toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/patient" style={outlinedBtn}>FAMILY OVERVIEW</a>
          <button type="button" style={blackFilledBtn}>SAVE CHANGES</button>
        </div>
      </div>

      {/* HERO */}
      <section style={heroCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={avatarStyle}>{initials.toUpperCase() || 'P'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h1 style={{ ...textStyles.display, margin: 0, fontSize: 28, lineHeight: '34px' }}>{patientName.toUpperCase()}</h1>
              <p style={{ ...textStyles.muted, margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 11 }}>
                PRIMARY ACCOUNT HOLDER · 34Y · MALE
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                <span style={{ ...pill('rose'), fontSize: 10 }}>O POSITIVE</span>
                <span style={{ ...pill('gold'), fontSize: 10 }}>BMI 23.4</span>
                <span style={{ ...pill('neutral'), fontSize: 10 }}>ALLERGIES: 2 ACTIVE</span>
              </div>
            </div>
          </div>
          {/* EMERGENCY SOS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
            <EmergencyButton appointmentId={joinableAppt?.id ?? 0} />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <a href="/patient/book?type=lab" style={blackFilledBtn}>BOOK LAB TEST</a>
              <a href="/patient/book" style={blackFilledBtn}>BOOK VIRTUAL CONSULTATION</a>
            </div>
          </div>
        </div>
      </section>

      {/* 3-COLUMN CARD GRID */}
      <div className="pd-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
      }}>
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Virtual Consultation Card */}
          <DashCard title="VIRTUAL CONSULTATION" linkLabel="HISTORY ›" linkHref="/patient/history">
            <div style={{
              backgroundColor: '#111',
              borderRadius: webTheme.radius.md,
              minHeight: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ color: '#555', fontFamily: webTheme.font.sans, fontSize: 11, letterSpacing: '0.1em' }}>[ VIRTUAL HALL FEED ]</span>
            </div>
            {nextAppt ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ ...textStyles.label, fontSize: 12 }}>NEXT: {nextAppt.doctorName ?? `Doctor #${nextAppt.doctorId}`}</span>
                  <span style={{ ...textStyles.muted, fontSize: 11 }}>Starts in {timeUntil(nextAppt.startTime)}</span>
                </div>
                <a href={`/patient/consult/${nextAppt.id}`} style={blackFilledBtn}>JOIN MEETING</a>
              </div>
            ) : (
              <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>No upcoming consultation</p>
            )}
          </DashCard>

          {/* Snapshot of Vitals Card */}
          <DashCard title="SNAPSHOT OF VITALS" linkLabel="DEVICES ›" linkHref="/patient/health">
            {(() => {
              const latestNote = soapNotes[0];
              const vitals = latestNote ? parseVitalsFromObjective(latestNote.objective) : [];
              if (clinicalLoading) return <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>Loading…</p>;
              if (vitals.length === 0) return <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>No vitals recorded yet</p>;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {vitals.map((v) => <VitalSparkBar key={v.label} vital={v} />)}
                </div>
              );
            })()}
          </DashCard>

          {/* Health Insights Card */}
          <DashCard title="HEALTH INSIGHTS" linkLabel="NEWSROOM ›" linkHref="/patient/news">
            <div style={{ ...surface({ padding: 14, backgroundColor: webTheme.colors.surfaceAlt, boxShadow: 'none' }), display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ ...pill('success'), fontSize: 9, alignSelf: 'flex-start' }}>NEW RESEARCH</span>
              <p style={{ ...textStyles.label, margin: 0, fontSize: 13 }}>ADVANCED GLUCOSE MONITORING TECHNIQUES</p>
              <a href="#" style={{ ...cardLinkStyle, color: webTheme.colors.accentStrong }}>READ FULL ARTICLE →</a>
            </div>
          </DashCard>

        </div>

        {/* CENTER COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Upcoming Sessions Card */}
          <DashCard title="UPCOMING SESSIONS" linkLabel="SCHEDULE ›" linkHref="/patient/book">
            {appointmentLoading ? (
              <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>Loading…</p>
            ) : upcomingSessions.length === 0 ? (
              <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>No upcoming sessions</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingSessions.map((appt) => {
                  const timeStr = new Date(appt.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                  const isActive = appt.status === 'ACTIVE';
                  return (
                    <div key={appt.id} style={listRowStyle}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ ...textStyles.label, fontSize: 11 }}>{isActive ? 'CONFIRMED' : 'SCHEDULED'} {timeStr}</span>
                        <span style={{ ...textStyles.muted, fontSize: 10 }}>{appt.doctorName ?? `Doctor #${appt.doctorId}`}</span>
                      </div>
                      {isActive ? (
                        <a href={`/patient/consult/${appt.id}`} style={{ ...blackFilledBtn, fontSize: 10, padding: '6px 12px' }}>JOIN</a>
                      ) : (
                        <a href={`/patient/consult/${appt.id}`} style={{ ...outlinedBtn, fontSize: 10, padding: '6px 12px' }}>TRACK</a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* Provider Chat Card */}
          <DashCard title="PROVIDER CHAT" linkLabel="FULL SCREEN CHAT ›" linkHref="/patient/messages">
            <div style={{ height: 260, overflow: 'hidden', borderRadius: webTheme.radius.md }}>
              <ChatPanel
                userName={patientName}
                height={280}
                peerUserId={chatPeerUserId ?? undefined}
                peerName={chatPeerName ?? undefined}
                embedded
                queueFirst
                allowedPeerIds={allowedDoctorPeerIds}
              />
            </div>
          </DashCard>

          {/* Active Prescriptions Card */}
          <DashCard title="ACTIVE PRESCRIPTIONS" linkLabel="PHARMACY ›" linkHref="/patient/pharmacy">
            {(() => {
              const activeMeds = medications.map(m => ({ ...m, daysRemaining: Math.floor(m.totalQuantity / Math.max(m.dailyDosage, 1)) }));
              if (clinicalLoading) return <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>Loading…</p>;
              if (activeMeds.length === 0) return <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>No active medications</p>;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {activeMeds.map((m) => {
                    const tone = m.daysRemaining <= 3 ? 'rose' : m.daysRemaining <= 7 ? 'gold' : 'success';
                    const label = m.daysRemaining <= 3 ? 'CRITICAL' : m.daysRemaining <= 7 ? 'LOW' : 'ACTIVE';
                    return (
                      <div key={m.id} style={listRowStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ ...textStyles.label, fontSize: 12 }}>{m.drugName}</span>
                          <span style={{ ...textStyles.muted, fontSize: 10 }}>{m.dailyDosage} unit/day · {m.daysRemaining}d left</span>
                        </div>
                        <span style={{ ...pill(tone), fontSize: 9, padding: '3px 7px' }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </DashCard>

        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Medical Billing Card */}
          <DashCard title="MEDICAL BILLING" linkLabel="FINANCIALS ›" linkHref="/patient/billing">
            {(() => {
              // PaymentStatus values: PENDING, CAPTURED, FAILED, REFUNDED
              const paidPayments = payments.filter(p => p.status === 'CAPTURED');
              const ytdCents = paidPayments.reduce((sum, p) => sum + (p.amountCents ?? 0), 0);
              const fmt = (cents: number, currency?: string) => {
                if (!currency || currency === 'INR') {
                  return `₹ ${(cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                }
                return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
              };
              const recent = payments.slice(0, 2);
              if (clinicalLoading) return <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>Loading…</p>;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ ...textStyles.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>TOTAL ANNUAL SPEND (YTD)</span>
                    <span style={{ ...textStyles.display, fontSize: 28, lineHeight: '34px', margin: 0 }}>{paidPayments.length > 0 ? fmt(ytdCents) : '₹ 0.00'}</span>
                  </div>
                  {recent.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {recent.map((p) => {
                        const isPending = p.status !== 'CAPTURED';
                        return (
                          <div key={p.id} style={listRowStyle}>
                            <span style={{ ...textStyles.muted, fontSize: 11 }}>{p.paymentType ?? p.status} #{p.id}</span>
                            <span style={{ ...textStyles.label, fontSize: 11, color: isPending ? webTheme.colors.rose : undefined }}>
                              {isPending ? 'Pending' : fmt(p.amountCents ?? 0, p.currency)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>No billing records</p>
                  )}
                  <button type="button" disabled style={{ ...outlinedBtn, opacity: 0.6 }}>REVIEW ALL STATEMENTS</button>
                </div>
              );
            })()}
          </DashCard>

          {/* Vaulted Records Card */}
          <DashCard title="VAULTED RECORDS" linkLabel="VAULT ›" linkHref="/patient/vault">
            {(() => {
              const allFiles = prescriptionRecords.flatMap(r => r.files);
              if (clinicalLoading) return <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>Loading…</p>;
              if (allFiles.length === 0) return (
                <>
                  <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>No records uploaded yet</p>
                  <button type="button" disabled style={{ ...outlinedBtn, opacity: 0.6 }}>ADD RECORD</button>
                </>
              );
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {allFiles.slice(0, 5).map((f, i) => (
                    <div key={i} style={listRowStyle}>
                      <span style={{ ...textStyles.label, fontSize: 11 }}>{f.filename.toUpperCase()}</span>
                      <a href={f.url} target="_blank" rel="noreferrer" style={{ ...cardLinkStyle, color: webTheme.colors.accentStrong }}>VIEW</a>
                    </div>
                  ))}
                  <button type="button" disabled style={{ ...outlinedBtn, opacity: 0.6 }}>ADD RECORD</button>
                </div>
              );
            })()}
          </DashCard>

          {/* Clinical History Card */}
          <DashCard title="CLINICAL HISTORY" linkLabel="FULL HISTORY ›" linkHref="/patient/history">
            {(() => {
              if (clinicalLoading) return <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>Loading…</p>;
              if (soapNotes.length === 0) return <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>No clinical history</p>;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {soapNotes.slice(0, 3).map((note) => {
                    const text = note.assessment ?? '';
                    const lower = text.toLowerCase();
                    const tone = lower.includes('diabetes') ? 'success' : (lower.includes('hypertension') || lower.includes('htn')) ? 'rose' : 'neutral';
                    const tag = lower.includes('diabetes') ? 'MANAGED' : (lower.includes('hypertension') || lower.includes('htn')) ? 'WATCH' : 'NOTED';
                    const dateStr = new Date(note.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' });
                    return (
                      <div key={note.id} style={listRowStyle}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ ...textStyles.label, fontSize: 12 }}>{text.length > 80 ? text.slice(0, 77) + '…' : (text || 'Assessment')}</span>
                          <span style={{ ...textStyles.muted, fontSize: 10 }}>{dateStr}</span>
                        </div>
                        <span style={{ ...pill(tone), fontSize: 9, padding: '3px 7px' }}>{tag}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </DashCard>

        </div>
      </div>

      {/* Mobile responsive style injection */}
      <style>{`
        @media (max-width: 768px) {
          .pd-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
