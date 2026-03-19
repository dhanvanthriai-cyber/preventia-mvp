'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PatientClinicalView from '@/components/PatientClinicalView';
import { getTokenFromCookie } from '@/lib/auth';
import type { PatientRecord } from '@/components/PatientClinicalView';

interface DoctorPatientDetailPageClientProps {
  readonly patientId: number;
}

function buildMock(id: number): PatientRecord {
  return {
    id,
    name: 'Jane Doe',
    age: 32,
    gender: 'Female',
    mrn: `${44920 + id}-X`,
    status: 'ACTIVE',
    vitalsSync: '2h ago',
    vitals: [
      { label: 'BP (MMHG)', value: '118/76', unit: 'MMHG' },
      { label: 'Heart Rate', value: '72', unit: 'BPM' },
      { label: 'Temp', value: '98.4', unit: '°F' },
      { label: 'SpO2', value: '98%', unit: '%' },
    ],
    conditions: [
      { name: 'Type 2 Diabetes', diagnosedYear: 2021, tag: 'DIAG. 2021' },
      { name: 'Seasonal Allergies', tag: 'CHRONIC', tagColor: '#666' },
      { name: 'Hypertension', tag: 'LOW RISK', tagColor: '#CC0000' },
    ],
    prescriptions: [
      {
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice Daily',
        status: 'ACTIVE',
      },
      {
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once Daily',
        status: 'ACTIVE',
      },
    ],
  };
}

const API_BASE = '';

async function fetchPatient(patientId: number, token: string): Promise<PatientRecord | null> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/patients/${patientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as Record<string, unknown>;

    return {
      id: patientId,
      name: String(data.fullName ?? data.name ?? `Patient #${patientId}`),
      age: Number(data.age ?? 0),
      gender: String(data.gender ?? 'Unknown'),
      mrn: String(data.mrn ?? data.abhaId ?? patientId),
      status: 'ACTIVE',
      vitalsSync: 'Live',
      vitals: (data.vitals as PatientRecord['vitals']) ?? [],
      conditions: (data.conditions as PatientRecord['conditions']) ?? [],
      prescriptions: (data.prescriptions as PatientRecord['prescriptions']) ?? [],
      intake: (data.intake as PatientRecord['intake']) ?? undefined,
      vault: (data.vault as PatientRecord['vault']) ?? undefined,
      history: (data.history as PatientRecord['history']) ?? undefined,
      appointmentId: data.upcomingAppointmentId as number | undefined,
      appointmentStartTime: data.upcomingAppointmentTime as string | undefined,
    };
  } catch {
    return null;
  }
}

export default function DoctorPatientDetailPageClient({ patientId }: DoctorPatientDetailPageClientProps) {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getTokenFromCookie();
    const data = token ? await fetchPatient(patientId, token) : null;

    setPatient(data ?? buildMock(patientId));
    setLoading(false);
  }, [patientId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ padding: 48, fontFamily: 'monospace', textAlign: 'center' }}>
        Loading patient record…
      </div>
    );
  }

  if (!patient) {
    return (
      <div style={{ padding: 48, fontFamily: 'monospace', color: '#CC0000', textAlign: 'center' }}>
        Patient not found.
      </div>
    );
  }

  return (
    <PatientClinicalView
      patient={patient}
      onBack={() => router.back()}
      onJoinConsultation={(appointmentId) => router.push(`/doctor/consult/${appointmentId}`)}
      onEditRecords={(nextPatientId) => router.push(`/doctor/patient/${nextPatientId}/edit`)}
    />
  );
}
