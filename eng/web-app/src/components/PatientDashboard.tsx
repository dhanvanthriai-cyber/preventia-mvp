'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { Appointment, AuthUser } from '@preventia/shared';
import dynamic from 'next/dynamic';
import {
  photoPlaceholder,
  pill,
  softButton,
  surface,
  textStyles,
  webTheme,
} from '@/lib/designSystem';

const ChatPanel = dynamic(() => import('./ChatPanel'), { ssr: false });

interface Vital {
  label: string;
  value: string;
  unit: string;
}

interface Condition {
  name: string;
  tag?: string;
  tagColor?: string;
  since?: string;
}

interface Prescription {
  name: string;
  dosage: string;
  frequency: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  prescribedBy?: string;
  refillsLeft?: number;
}

interface VaultFile {
  name: string;
  type: string;
  date: string;
  size: string;
}

interface HistoryEntry {
  date: string;
  type: string;
  doctor: string;
  notes: string;
}

type TabKey = 'TODAY' | 'APPOINTMENTS' | 'MEDICINES' | 'RECORDS' | 'HISTORY' | 'MESSAGES';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'TODAY', label: 'Today' },
  { key: 'APPOINTMENTS', label: 'Appointments' },
  { key: 'MEDICINES', label: 'Medicines' },
  { key: 'RECORDS', label: 'Records' },
  { key: 'HISTORY', label: 'History' },
  { key: 'MESSAGES', label: 'Messages' },
];

const MOCK_VITALS: Vital[] = [
  { label: 'Blood pressure', value: '118/76', unit: 'mmHg' },
  { label: 'Heart rate', value: '72', unit: 'bpm' },
  { label: 'Temperature', value: '98.4', unit: '°F' },
  { label: 'SpO2', value: '98', unit: '%' },
];

const MOCK_CONDITIONS: Condition[] = [
  { name: 'Type 2 Diabetes', since: '2021', tag: 'Managed', tagColor: '#7E9A77' },
  { name: 'Seasonal Allergies', since: '2018', tag: 'Recurring', tagColor: '#B89A5F' },
  { name: 'Hypertension', since: '2020', tag: 'Watch', tagColor: '#C78375' },
];

const MOCK_PRESCRIPTIONS: Prescription[] = [
  { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', status: 'ACTIVE', prescribedBy: 'Dr. Arjun Mehta', refillsLeft: 2 },
  { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', status: 'ACTIVE', prescribedBy: 'Dr. Kavitha Rao', refillsLeft: 1 },
  { name: 'Cetirizine', dosage: '10mg', frequency: 'As needed', status: 'INACTIVE', prescribedBy: 'Dr. Priya Nair', refillsLeft: 0 },
];

const MOCK_VAULT: VaultFile[] = [
  { name: 'Blood_Panel_2025_02.pdf', type: 'Lab', date: 'Feb 14, 2025', size: '512 KB' },
  { name: 'ECG_Holter_Jan2025.pdf', type: 'Cardiology', date: 'Jan 22, 2025', size: '1.2 MB' },
  { name: 'MRI_Spine_Nov2024.pdf', type: 'Imaging', date: 'Nov 5, 2024', size: '4.8 MB' },
  { name: 'Discharge_Summary_Oct2024.pdf', type: 'Summary', date: 'Oct 18, 2024', size: '320 KB' },
];

const MOCK_HISTORY: HistoryEntry[] = [
  { date: 'Feb 14, 2025', type: 'Teleconsult', doctor: 'Dr. Arjun Mehta', notes: 'Annual checkup. HbA1c reviewed. Adjusted Metformin dosage.' },
  { date: 'Nov 20, 2024', type: 'In-person', doctor: 'Dr. Kavitha Rao', notes: 'Hypertension follow-up. BP well controlled. Continue current regimen.' },
  { date: 'Aug 8, 2024', type: 'Teleconsult', doctor: 'Dr. Arjun Mehta', notes: 'HbA1c 6.8%. Dietary counselling provided. Next review in 3 months.' },
];

const heroGridStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0 clamp(24px, 4vw, 56px) 20px',
  display: 'grid',
  gap: 20,
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
};

const sectionStackStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '0 clamp(24px, 4vw, 56px) 72px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
};

const sectionCardStyle: React.CSSProperties = surface({
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
});

const softListItemStyle: React.CSSProperties = {
  ...surface({
    padding: 16,
    backgroundColor: webTheme.colors.surfaceAlt,
    boxShadow: 'none',
  }),
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const gridStyle = (minWidth = 220): React.CSSProperties => ({
  display: 'grid',
  gap: 14,
  gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
});

const metadataRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  alignItems: 'center',
};

const toneForTag = (tagColor?: string): React.CSSProperties => ({
  ...pill('neutral'),
  color: tagColor ?? webTheme.colors.mutedText,
  border: `1px solid ${tagColor ? `${tagColor}33` : webTheme.colors.border}`,
});

function SurfaceSection({
  eyebrow,
  title,
  children,
}: Readonly<{
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}>) {
  return (
    <section style={sectionCardStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={textStyles.eyebrow}>{eyebrow}</span>
        <h2 style={{ ...textStyles.title, fontSize: 26, lineHeight: '32px', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function TodayTab({
  vitals,
  conditions,
  joinableAppt,
  onMessageDoctor,
}: Readonly<{
  vitals: Vital[];
  conditions: Condition[];
  joinableAppt?: Appointment;
  onMessageDoctor: () => void;
}>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SurfaceSection eyebrow="Today" title="A gentle snapshot of your care">
        <div style={gridStyle(150)}>
          {vitals.map((vital) => (
            <div key={vital.label} style={{ ...softListItemStyle, alignItems: 'flex-start' }}>
              <div style={{ ...textStyles.title, fontSize: 30, lineHeight: '34px' }}>{vital.value}</div>
              <div style={textStyles.muted}>{vital.label} · {vital.unit}</div>
            </div>
          ))}
        </div>
      </SurfaceSection>

      <SurfaceSection eyebrow="My health notes" title="Conditions to keep in mind">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {conditions.map((condition) => (
            <div key={condition.name} style={softListItemStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={textStyles.title}>{condition.name}</div>
                  {condition.since ? <div style={textStyles.muted}>Since {condition.since}</div> : null}
                </div>
                {condition.tag ? <span style={toneForTag(condition.tagColor)}>{condition.tag}</span> : null}
              </div>
            </div>
          ))}
        </div>
      </SurfaceSection>

      <SurfaceSection eyebrow="Quick actions" title="Simple next steps">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {joinableAppt ? (
            <a href={`/patient/consult/${joinableAppt.id}`} style={softButton('accent')}>
              Join my consultation
            </a>
          ) : null}
          <a href="/patient/book" style={softButton(joinableAppt ? 'secondary' : 'accent')}>
            Book appointment
          </a>
          <button type="button" style={softButton('secondary')}>
            Request refill
          </button>
          <button type="button" style={softButton('secondary')}>
            Download records
          </button>
          <button type="button" style={softButton('gold')} onClick={onMessageDoctor}>
            Message doctor
          </button>
        </div>
      </SurfaceSection>
    </div>
  );
}

function AppointmentsTab({
  appointments,
  loading,
}: Readonly<{
  appointments: Appointment[];
  loading: boolean;
}>) {
  const now = new Date();
  const upcoming = appointments.filter((appointment) =>
    appointment.status === 'ACTIVE' ||
    (appointment.status === 'SCHEDULED' && new Date(appointment.startTime) > now),
  );
  const past = appointments.filter((appointment) =>
    appointment.status === 'COMPLETED' ||
    appointment.status === 'LOCKED' ||
    (appointment.status === 'SCHEDULED' && new Date(appointment.endTime) < now),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SurfaceSection eyebrow="Upcoming" title="Care moments ahead">
        {loading ? <div style={textStyles.muted}>Loading appointments…</div> : null}
        {!loading && upcoming.length === 0 ? <div style={textStyles.muted}>No upcoming appointments.</div> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {upcoming.map((appointment) => (
            <div key={appointment.id} style={softListItemStyle}>
              <div style={metadataRowStyle}>
                <span style={pill(appointment.status === 'ACTIVE' ? 'rose' : 'accent')}>
                  {appointment.status === 'ACTIVE' ? 'Live now' : 'Scheduled'}
                </span>
                <span style={textStyles.muted}>
                  {new Date(appointment.startTime).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {' · '}
                  {new Date(appointment.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={textStyles.title}>{appointment.doctorName ?? `Doctor #${appointment.doctorId}`}</div>
              {appointment.status === 'ACTIVE' ? (
                <a href={`/patient/consult/${appointment.id}`} style={softButton('rose')}>
                  Join now
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </SurfaceSection>

      <SurfaceSection eyebrow="Past visits" title="Recent consultations">
        {past.length === 0 ? <div style={textStyles.muted}>No past appointments.</div> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {past.map((appointment) => (
            <div key={appointment.id} style={softListItemStyle}>
              <div style={metadataRowStyle}>
                <span style={pill('neutral')}>Completed</span>
                <span style={textStyles.muted}>
                  {new Date(appointment.startTime).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div style={textStyles.title}>{appointment.doctorName ?? `Doctor #${appointment.doctorId}`}</div>
            </div>
          ))}
        </div>
      </SurfaceSection>
    </div>
  );
}

function MedicinesTab({ prescriptions }: Readonly<{ prescriptions: Prescription[] }>) {
  const active = prescriptions.filter((prescription) => prescription.status === 'ACTIVE');
  const past = prescriptions.filter((prescription) => prescription.status !== 'ACTIVE');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SurfaceSection eyebrow="Active medicines" title="What you are taking now">
        {active.length === 0 ? <div style={textStyles.muted}>No active prescriptions.</div> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {active.map((prescription) => (
            <div key={prescription.name} style={softListItemStyle}>
              <div style={metadataRowStyle}>
                <span style={pill('accent')}>Active</span>
                <span style={textStyles.muted}>{prescription.dosage} · {prescription.frequency}</span>
              </div>
              <div style={textStyles.title}>{prescription.name}</div>
              <div style={textStyles.muted}>
                Prescribed by {prescription.prescribedBy ?? 'your doctor'} · Refills left: {prescription.refillsLeft ?? '—'}
              </div>
            </div>
          ))}
        </div>
      </SurfaceSection>

      {past.length > 0 ? (
        <SurfaceSection eyebrow="Past medicines" title="Previous prescriptions">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {past.map((prescription) => (
              <div key={prescription.name} style={softListItemStyle}>
                <div style={metadataRowStyle}>
                  <span style={pill('neutral')}>{prescription.status}</span>
                  <span style={textStyles.muted}>{prescription.dosage} · {prescription.frequency}</span>
                </div>
                <div style={textStyles.title}>{prescription.name}</div>
              </div>
            ))}
          </div>
        </SurfaceSection>
      ) : null}
    </div>
  );
}

function RecordsTab({ files }: Readonly<{ files: VaultFile[] }>) {
  return (
    <SurfaceSection eyebrow="Medical vault" title="Records in one calm place">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {files.map((file) => (
          <div key={file.name} style={softListItemStyle}>
            <div style={metadataRowStyle}>
              <span style={pill('neutral')}>{file.type}</span>
              <span style={textStyles.muted}>{file.date} · {file.size}</span>
            </div>
            <div style={textStyles.title}>{file.name}</div>
            <button type="button" style={softButton('secondary')}>
              View
            </button>
          </div>
        ))}
      </div>
    </SurfaceSection>
  );
}

function HistoryTab({ history }: Readonly<{ history: HistoryEntry[] }>) {
  return (
    <SurfaceSection eyebrow="Visit history" title="What happened in previous appointments">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {history.map((entry) => (
          <div key={`${entry.date}-${entry.doctor}`} style={softListItemStyle}>
            <div style={metadataRowStyle}>
              <span style={pill(entry.type === 'Emergency' ? 'rose' : 'neutral')}>{entry.type}</span>
              <span style={textStyles.muted}>{entry.date}</span>
            </div>
            <div style={textStyles.title}>{entry.doctor}</div>
            <div style={textStyles.body}>{entry.notes}</div>
          </div>
        ))}
      </div>
    </SurfaceSection>
  );
}

function MessagesTab({
  user,
  peerUserId,
  peerName,
}: Readonly<{ user: AuthUser; peerUserId: string | null; peerName: string }>) {
  return (
    <SurfaceSection eyebrow="Messages" title="Reach your care team">
      <div style={textStyles.muted}>
        Ask a question or send an update to your doctor without leaving this calmer parent view.
      </div>
      <div style={{ ...surface({ padding: 18, boxShadow: 'none' }) }}>
        {peerUserId ? (
          <ChatPanel userName={user.name} height={500} peerUserId={peerUserId} peerName={peerName} />
        ) : (
          <div style={textStyles.muted}>Loading your doctor's details…</div>
        )}
      </div>
    </SurfaceSection>
  );
}

interface Props {
  user?: AuthUser;
}

export default function PatientDashboard({ user }: Readonly<Props>) {
  const [activeTab, setActiveTab] = useState<TabKey>('TODAY');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentLoading, setAppointmentLoading] = useState(true);
  const [realUserId, setRealUserId] = useState<number>(user?.userId ?? 0);
  const [chatPeerUserId, setChatPeerUserId] = useState<string | null>(null);
  const [chatPeerName, setChatPeerName] = useState<string>('Your Doctor');
  const [vitals, setVitals] = useState<Vital[]>(MOCK_VITALS);
  const [conditions, setConditions] = useState<Condition[]>(MOCK_CONDITIONS);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(MOCK_PRESCRIPTIONS);
  const [vault] = useState<VaultFile[]>(MOCK_VAULT);
  const [history] = useState<HistoryEntry[]>(MOCK_HISTORY);

  const patientName = user?.name ?? 'Patient';
  const firstName = patientName.split(' ')[0] ?? patientName;

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

  // Resolve the chat peer (doctor) dynamically from the backend
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

  const fetchAppointments = useCallback(async (uid: number) => {
    if (!user || uid === 0) {
      setAppointmentLoading(false);
      return;
    }

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

  const fetchProfile = useCallback(async () => {
    if (!user || realUserId === 0) return;
    try {
      const res = await fetch(`/api/v1/patients/${realUserId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) return;
      const data = await res.json() as Record<string, unknown>;
      if (data.vitals) setVitals(data.vitals as Vital[]);
      if (data.conditions) setConditions(data.conditions as Condition[]);
      if (data.prescriptions) setPrescriptions(data.prescriptions as Prescription[]);
    } catch {
      // Keep mocks if the API is not ready yet.
    }
  }, [user, realUserId]);

  useEffect(() => {
    if (realUserId > 0) {
      void fetchAppointments(realUserId);
      void fetchProfile();
    }
  }, [realUserId, fetchAppointments, fetchProfile]);

  useEffect(() => {
    if (realUserId === 0) return;
    const terminal = ['ACTIVE', 'COMPLETED', 'LOCKED'] as const;
    const allDone =
      appointments.length > 0 &&
      appointments.every((appointment) => (terminal as readonly string[]).includes(appointment.status));
    const hasScheduled = appointments.some((appointment) => appointment.status === 'SCHEDULED');
    const hasActive = appointments.some((appointment) => appointment.status === 'ACTIVE');

    if ((!hasScheduled && !hasActive) || allDone) return;

    const timer = setInterval(() => {
      void fetchAppointments(realUserId);
    }, 10_000);

    return () => clearInterval(timer);
  }, [realUserId, appointments, fetchAppointments]);

  if (!user) {
    return (
      <div style={heroGridStyle}>
        <section style={sectionCardStyle}>
          <span style={textStyles.eyebrow}>Patient portal</span>
          <h1 style={{ ...textStyles.display, margin: 0 }}>
            Your care, presented more gently.
          </h1>
          <p style={{ ...textStyles.body, margin: 0 }}>
            Sign in to see a simpler, more analog daily view of appointments, medicines, and messages.
          </p>
          <a href="/login" style={softButton('accent')}>
            Sign in
          </a>
        </section>
      </div>
    );
  }

  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;
  const joinableAppt = appointments.find((appointment) => {
    if (appointment.status === 'COMPLETED' || appointment.status === 'LOCKED') return false;
    if (!appointment.dailyRoomUrl) return false;
    if (appointment.status === 'ACTIVE') return true;
    const start = new Date(appointment.startTime).getTime();
    const end = new Date(appointment.endTime).getTime();
    return now >= start - thirtyMinutes && now <= end + thirtyMinutes;
  });

  const nextAppt = appointments.find((appointment) => appointment.status === 'SCHEDULED' || appointment.status === 'ACTIVE');

  let content: React.ReactNode = null;
  if (activeTab === 'TODAY') {
    content = (
      <TodayTab
        vitals={vitals}
        conditions={conditions}
        joinableAppt={joinableAppt}
        onMessageDoctor={() => setActiveTab('MESSAGES')}
      />
    );
  } else if (activeTab === 'APPOINTMENTS') {
    content = <AppointmentsTab appointments={appointments} loading={appointmentLoading} />;
  } else if (activeTab === 'MEDICINES') {
    content = <MedicinesTab prescriptions={prescriptions} />;
  } else if (activeTab === 'RECORDS') {
    content = <RecordsTab files={vault} />;
  } else if (activeTab === 'HISTORY') {
    content = <HistoryTab history={history} />;
  } else if (activeTab === 'MESSAGES') {
    content = <MessagesTab user={user} peerUserId={chatPeerUserId} peerName={chatPeerName} />;
  }

  return (
    <>
      <section style={heroGridStyle}>
        <div style={{ ...sectionCardStyle, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={textStyles.eyebrow}>Patient view</span>
            <h1 style={{ ...textStyles.display, margin: 0 }}>
              Namaste, {firstName}.
            </h1>
            <p style={{ ...textStyles.body, margin: 0 }}>
              The interface now focuses on a few calm, human reminders instead of dense dashboard chrome.
            </p>
            <div style={metadataRowStyle}>
              <span style={pill('accent')}>Analog and simple</span>
              <span style={pill('neutral')}>
                {nextAppt ? `Next visit ${new Date(nextAppt.startTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}` : 'No visit on the calendar'}
              </span>
              <span style={pill(joinableAppt ? 'rose' : 'success')}>
                {joinableAppt ? 'A consultation is ready when you are' : 'Nothing urgent right now'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {joinableAppt ? (
              <a href={`/patient/consult/${joinableAppt.id}`} style={softButton('accent')}>
                Join consultation
              </a>
            ) : null}
            <a href="/patient/book" style={softButton(joinableAppt ? 'secondary' : 'accent')}>
              Book appointment
            </a>
            <a href="/api/logout" style={softButton('ghost')}>
              Sign out
            </a>
          </div>
        </div>

        <div style={photoPlaceholder(360)}>
          <div
            style={{
              position: 'absolute',
              left: 18,
              right: 18,
              bottom: 18,
              ...surface({
                borderRadius: webTheme.radius.md,
                padding: 16,
                boxShadow: 'none',
                backgroundColor: 'rgba(255, 252, 248, 0.76)',
              }),
            }}
          >
            <div style={{ ...textStyles.label, marginBottom: 6 }}>Care at home</div>
            <div style={textStyles.muted}>
              A familiar home setting that keeps daily care clear, calm, and easy to navigate.
            </div>
          </div>
        </div>
      </section>

      <section style={sectionStackStyle}>
        <div
          style={{
            ...surface({
              padding: 10,
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              alignItems: 'center',
            }),
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              style={{
                ...(activeTab === tab.key ? softButton('accent') : softButton('secondary')),
                borderRadius: webTheme.radius.pill,
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {content}
      </section>
    </>
  );
}
