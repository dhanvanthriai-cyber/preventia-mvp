'use client';
/**
 * PatientClinicalView.tsx — Patient Clinical View for Doctor (Web)
 * Project Preventia
 *
 * Matches the "Patient view for doctor - Mobile view.jpeg" mockup.
 * Neo-Brutalist monospace design system — all styles via React.CSSProperties.
 *
 * Tabs: OVERVIEW | INTAKE | VAULT | HISTORY
 */

import React, { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vital {
  label: string;
  value: string;
  unit: string;
}

interface Condition {
  name: string;
  diagnosedYear?: number;
  tag?: string;
  tagColor?: string;
}

interface Prescription {
  name: string;
  dosage: string;
  frequency: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
}

interface IntakeEntry {
  question: string;
  answer: string;
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

export interface PatientRecord {
  id: number;
  name: string;
  age: number;
  gender: string;
  mrn: string;
  status: 'ACTIVE' | 'INACTIVE';
  vitalsSync?: string;
  vitals: Vital[];
  conditions: Condition[];
  prescriptions: Prescription[];
  intake?: IntakeEntry[];
  vault?: VaultFile[];
  history?: HistoryEntry[];
  appointmentId?: number;
  appointmentStartTime?: string;
}

export interface PatientClinicalViewProps {
  readonly patient: PatientRecord;
  readonly onBack?: () => void;
  readonly onJoinConsultation?: (appointmentId: number) => void;
  readonly onEditRecords?: (patientId: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function useCountdown(isoTime?: string) {
  const [display, setDisplay] = useState('');
  useEffect(() => {
    if (!isoTime) return;
    const interval = setInterval(() => {
      const diff = new Date(isoTime).getTime() - Date.now();
      if (diff <= 0) { setDisplay('00:00:00'); clearInterval(interval); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setDisplay(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [isoTime]);
  return display;
}

// ─── Tab Components ───────────────────────────────────────────────────────────

function OverviewTab({ patient }: Readonly<{ patient: PatientRecord }>) {
  return (
    <div>
      {/* Vitals */}
      <div style={styles.section}>
        <div style={styles.sectionHeaderRow}>
          <span style={styles.sectionLabel}>CURRENT VITALS</span>
          {patient.vitalsSync && (
            <span style={styles.syncBadge}>Sync: {patient.vitalsSync}</span>
          )}
        </div>
        <div style={styles.vitalsGrid}>
          {patient.vitals.map(v => (
            <div key={v.label} style={styles.vitalCard}>
              <span style={styles.vitalValue}>{v.value}</span>
              <span style={styles.vitalLabel}>{v.label} ({v.unit})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Conditions */}
      <div style={styles.section}>
        <span style={styles.sectionLabel}>ACTIVE CONDITIONS</span>
        {patient.conditions.map((c) => (
            <div key={c.name} style={styles.conditionRow}>
            <div>
              <span style={styles.conditionName}>{c.name}</span>
              {c.diagnosedYear && (
                <span style={styles.conditionMeta}>Diag. {c.diagnosedYear}</span>
              )}
            </div>
            {c.tag && (
              <span
                style={{
                  ...styles.conditionTag,
                  color: c.tagColor ?? '#CC0000',
                  borderColor: c.tagColor ?? '#CC0000',
                }}
              >
                {c.tag}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Active Prescriptions */}
      <div style={styles.section}>
        <span style={styles.sectionLabel}>ACTIVE PRESCRIPTIONS</span>
        {patient.prescriptions
          .filter(p => p.status === 'ACTIVE')
          .map((rx) => (
            <div key={rx.name} style={styles.rxCard}>
              <div style={styles.rxHeader}>
                <span style={styles.rxName}>{rx.name}</span>
                <span style={{ ...styles.rxStatusBadge }}>ACTIVE</span>
              </div>
              <span style={styles.rxDosage}>
                {rx.dosage} • {rx.frequency}
              </span>
              <button style={styles.refillBtn}>REQUEST REFILL</button>
            </div>
          ))}
        {patient.prescriptions.filter(p => p.status === 'ACTIVE').length === 0 && (
          <p style={styles.emptyNote}>No active prescriptions.</p>
        )}
      </div>
    </div>
  );
}

function IntakeTab({ patient }: Readonly<{ patient: PatientRecord }>) {
  const entries = patient.intake ?? [
    { question: 'Chief Complaint', answer: 'Fatigue and mild shortness of breath for 2 weeks.' },
    { question: 'Duration', answer: '2 weeks' },
    { question: 'Severity (1–10)', answer: '5' },
    { question: 'Allergies', answer: 'Penicillin (rash), Shellfish' },
    { question: 'Current Medications', answer: 'Metformin 500mg twice daily, Lisinopril 10mg once daily' },
    { question: 'Recent Travel', answer: 'None' },
    { question: 'Lifestyle', answer: 'Non-smoker, occasional alcohol, sedentary work' },
    { question: 'Family History', answer: 'Type 2 Diabetes (father), Hypertension (mother)' },
  ];

  return (
    <div style={styles.section}>
      <span style={styles.sectionLabel}>PATIENT INTAKE FORM</span>
      {entries.map((e) => (
        <div key={e.question} style={styles.intakeRow}>
          <span style={styles.intakeQuestion}>{e.question}</span>
          <span style={styles.intakeAnswer}>{e.answer}</span>
        </div>
      ))}
    </div>
  );
}

function VaultTab({ patient }: Readonly<{ patient: PatientRecord }>) {
  const files = patient.vault ?? [
    { name: 'Blood_Panel_2025_02.pdf', type: 'LAB', date: 'Feb 14, 2025', size: '512 KB' },
    { name: 'ECG_Holter_Jan2025.pdf', type: 'CARDIOLOGY', date: 'Jan 22, 2025', size: '1.2 MB' },
    { name: 'MRI_Spine_Nov2024.pdf', type: 'IMAGING', date: 'Nov 5, 2024', size: '4.8 MB' },
    { name: 'Discharge_Summary_Oct2024.pdf', type: 'SUMMARY', date: 'Oct 18, 2024', size: '320 KB' },
  ];

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeaderRow}>
        <span style={styles.sectionLabel}>MEDICAL VAULT</span>
        <button style={styles.uploadBtn}>+ UPLOAD</button>
      </div>
      {files.map((f) => (
        <div key={f.name} style={styles.vaultRow}>
          <div style={styles.vaultIcon}>📄</div>
          <div style={styles.vaultInfo}>
            <span style={styles.vaultName}>{f.name}</span>
            <span style={styles.vaultMeta}>{f.type} · {f.date} · {f.size}</span>
          </div>
          <button style={styles.viewBtn}>VIEW</button>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ patient }: Readonly<{ patient: PatientRecord }>) {
  const history = patient.history ?? [
    {
      date: 'Feb 14, 2025',
      type: 'TELECONSULT',
      doctor: 'Dr. Arjun Mehta',
      notes: 'Annual checkup. Adjusted Metformin dosage. Ordered lipid panel.',
    },
    {
      date: 'Nov 20, 2024',
      type: 'IN-PERSON',
      doctor: 'Dr. Kavitha Rao',
      notes: 'Follow-up for hypertension. BP controlled. Continue current regimen.',
    },
    {
      date: 'Aug 8, 2024',
      type: 'TELECONSULT',
      doctor: 'Dr. Arjun Mehta',
      notes: 'HbA1c review 6.8%. Dietary counselling provided.',
    },
    {
      date: 'May 2, 2024',
      type: 'EMERGENCY',
      doctor: 'Dr. Priya Nair',
      notes: 'Acute hyperglycaemia episode. IV fluids administered. Stable at discharge.',
    },
  ];

  return (
    <div style={styles.section}>
      <span style={styles.sectionLabel}>VISIT HISTORY</span>
      {history.map((h) => (
        <div key={`${h.date}-${h.doctor}`} style={styles.historyCard}>
          <div style={styles.historyHeader}>
            <span style={styles.historyDate}>{h.date}</span>
            <span
              style={{
                ...styles.historyTypeBadge,
                backgroundColor: h.type === 'EMERGENCY' ? '#CC0000' : '#000',
              }}
            >
              {h.type}
            </span>
          </div>
          <span style={styles.historyDoctor}>{h.doctor}</span>
          <p style={styles.historyNotes}>{h.notes}</p>
          <button style={styles.soapBtn}>VIEW SOAP NOTES</button>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TabKey = 'OVERVIEW' | 'INTAKE' | 'VAULT' | 'HISTORY';

const TABS = ['OVERVIEW', 'INTAKE', 'VAULT', 'HISTORY'] as const;

const TAB_ICONS: Readonly<Record<TabKey, string>> = {
  OVERVIEW: '👤',
  INTAKE:   '📋',
  VAULT:    '🗂️',
  HISTORY:  '📅',
} as const;

export default function PatientClinicalView({
  patient,
  onBack,
  onJoinConsultation,
  onEditRecords,
}: Readonly<PatientClinicalViewProps>) {
  const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW');
  const countdown = useCountdown(patient.appointmentStartTime);

  const initials = getInitials(patient.name);

  return (
    <div style={styles.root}>

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={onBack}>← BACK</button>
        <span
          style={{
            ...styles.statusBadge,
            backgroundColor: patient.status === 'ACTIVE' ? '#000' : '#888',
          }}
        >
          {patient.status} PATIENT
        </span>
      </div>

      {/* ── Patient Header ───────────────────────────────────────────────── */}
      <div style={styles.patientHeader}>
        <div style={styles.patientAvatar}>{initials}</div>
        <div style={styles.patientMeta}>
          <h1 style={styles.patientName}>{patient.name.toUpperCase()}</h1>
          <span style={styles.patientSub}>
            {patient.age}Y • {patient.gender.toUpperCase()} • MRN #{patient.mrn}
          </span>
        </div>
      </div>

      {/* ── Action Buttons ───────────────────────────────────────────────── */}
      <div style={styles.actionRow}>
        <button
          style={styles.joinBtn}
          onClick={() =>
            patient.appointmentId && onJoinConsultation?.(patient.appointmentId)
          }
        >
          JOIN CONSULTATION
        </button>
        <button
          style={styles.editBtn}
          onClick={() => onEditRecords?.(patient.id)}
        >
          EDIT RECORDS
        </button>
      </div>

      {/* ── Countdown ────────────────────────────────────────────────────── */}
      {countdown && (
        <div style={styles.countdownBar}>
          STARTS IN: {countdown}
        </div>
      )}

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <div style={styles.tabContent}>
        {activeTab === 'OVERVIEW' && <OverviewTab patient={patient} />}
        {activeTab === 'INTAKE'   && <IntakeTab   patient={patient} />}
        {activeTab === 'VAULT'    && <VaultTab    patient={patient} />}
        {activeTab === 'HISTORY'  && <HistoryTab  patient={patient} />}
      </div>

      {/* ── Bottom Tab Bar ───────────────────────────────────────────────── */}
      <div style={styles.bottomTabBar}>
        {TABS.map(tab => (
          <button
            key={tab}
            style={{
              ...styles.tabBtn,
              ...(activeTab === tab ? styles.tabBtnActive : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            <span style={styles.tabIcon}>
              {TAB_ICONS[tab]}
            </span>
            <span style={styles.tabLabel}>{tab}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    backgroundColor: '#F5F5F5',
    minHeight: '100vh',
    fontFamily: 'monospace',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 900,
    margin: '0 auto',
    position: 'relative',
  },

  // Top bar
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottom: '3px solid #111',
    padding: '10px 16px',
  },
  backBtn: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 700,
    backgroundColor: '#fff',
    color: '#000',
    border: '2px solid #111',
    padding: '5px 12px',
    cursor: 'pointer',
    letterSpacing: 1,
  },
  statusBadge: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 700,
    color: '#fff',
    padding: '4px 12px',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Patient header
  patientHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fff',
    borderBottom: '3px solid #111',
    padding: '16px',
  },
  patientAvatar: {
    width: 52,
    height: 52,
    backgroundColor: '#111',
    color: '#fff',
    fontFamily: 'Georgia, serif',
    fontSize: 20,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  patientMeta: { flex: 1 },
  patientName: {
    fontFamily: 'Georgia, serif',
    fontSize: 22,
    fontWeight: 700,
    margin: '0 0 4px 0',
    color: '#000',
  },
  patientSub: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#666',
  },

  // Action buttons
  actionRow: {
    display: 'flex',
    gap: 0,
    borderBottom: '3px solid #111',
  },
  joinBtn: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.5,
    backgroundColor: '#000',
    color: '#fff',
    border: 'none',
    borderRight: '2px solid #111',
    padding: '14px 0',
    cursor: 'pointer',
    textTransform: 'uppercase',
  },
  editBtn: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.5,
    backgroundColor: '#fff',
    color: '#000',
    border: 'none',
    padding: '14px 0',
    cursor: 'pointer',
    textTransform: 'uppercase',
  },

  // Countdown
  countdownBar: {
    backgroundColor: '#FFF3CD',
    borderBottom: '2px solid #FFC107',
    padding: '8px 16px',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 700,
    color: '#CC0000',
    textAlign: 'center',
    letterSpacing: 1.5,
  },

  // Tab content scroll area
  tabContent: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: 80, // space for bottom tab bar
  },

  // Section
  section: {
    backgroundColor: '#fff',
    border: '3px solid #111',
    margin: '12px 12px 0 12px',
    padding: 16,
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    display: 'block',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#000',
    borderLeft: '4px solid #22C55E',
    paddingLeft: 8,
    marginBottom: 12,
  },
  syncBadge: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#888',
  },
  emptyNote: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#888',
    margin: '8px 0',
  },

  // Vitals grid
  vitalsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
  },
  vitalCard: {
    border: '2px solid #111',
    padding: '14px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    gap: 4,
  },
  vitalValue: {
    fontFamily: 'Georgia, serif',
    fontSize: 28,
    fontWeight: 700,
    color: '#000',
  },
  vitalLabel: {
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },

  // Conditions
  conditionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #eee',
    padding: '10px 0',
  },
  conditionName: {
    display: 'block',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 700,
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  conditionMeta: {
    display: 'block',
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  conditionTag: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 700,
    border: '1.5px solid',
    padding: '2px 8px',
    letterSpacing: 1,
    textTransform: 'uppercase',
    flexShrink: 0,
  },

  // Prescriptions
  rxCard: {
    border: '2px solid #111',
    padding: '12px',
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
  },
  rxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rxName: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 700,
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rxStatusBadge: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 700,
    backgroundColor: '#22C55E',
    color: '#fff',
    padding: '2px 8px',
    letterSpacing: 1,
  },
  rxDosage: {
    display: 'block',
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#555',
    marginBottom: 10,
  },
  refillBtn: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 700,
    backgroundColor: '#fff',
    color: '#000',
    border: '2px solid #111',
    padding: '5px 14px',
    cursor: 'pointer',
    width: '100%',
    letterSpacing: 1,
  },

  // Intake
  intakeRow: {
    borderBottom: '1px solid #eee',
    padding: '10px 0',
  },
  intakeQuestion: {
    display: 'block',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 700,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  intakeAnswer: {
    display: 'block',
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#000',
    lineHeight: 1.5,
  },

  // Vault
  uploadBtn: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 700,
    backgroundColor: '#000',
    color: '#fff',
    border: '2px solid #111',
    padding: '4px 12px',
    cursor: 'pointer',
  },
  vaultRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    borderBottom: '1px solid #eee',
    padding: '10px 0',
  },
  vaultIcon: {
    fontSize: 24,
    flexShrink: 0,
  },
  vaultInfo: { flex: 1 },
  vaultName: {
    display: 'block',
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 700,
    color: '#000',
    marginBottom: 2,
  },
  vaultMeta: {
    display: 'block',
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#888',
  },
  viewBtn: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 700,
    backgroundColor: '#fff',
    color: '#000',
    border: '2px solid #111',
    padding: '4px 12px',
    cursor: 'pointer',
  },

  // History
  historyCard: {
    border: '2px solid #111',
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyDate: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 700,
    color: '#000',
  },
  historyTypeBadge: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 700,
    color: '#fff',
    padding: '2px 8px',
    letterSpacing: 1,
  },
  historyDoctor: {
    display: 'block',
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#555',
    marginBottom: 6,
  },
  historyNotes: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#333',
    margin: '0 0 10px 0',
    lineHeight: 1.6,
  },
  soapBtn: {
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 700,
    backgroundColor: '#fff',
    color: '#000',
    border: '2px solid #111',
    padding: '4px 12px',
    cursor: 'pointer',
  },

  // Bottom Tab Bar
  bottomTabBar: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: 900,
    display: 'flex',
    backgroundColor: '#000',
    borderTop: '3px solid #111',
    zIndex: 100,
  },
  tabBtn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 4px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRight: '1px solid #333',
    cursor: 'pointer',
    gap: 4,
  },
  tabBtnActive: {
    backgroundColor: '#222',
    borderBottom: '3px solid #22C55E',
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
};

