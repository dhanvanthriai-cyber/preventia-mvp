'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConsultationRoom from '@/components/ConsultationRoom';
import ConsentGate from '@/components/ConsentGate';
import WaitingRoom from '@/components/WaitingRoom';
import { getTokenFromCookie } from '@/lib/auth';
import type { Appointment } from '@preventia/shared';

interface PatientConsultPageClientProps {
  readonly appointmentId: number;
}

const API_BASE = '';

export default function PatientConsultPageClient({ appointmentId }: PatientConsultPageClientProps) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [doctorReady, setDoctorReady] = useState(false);

  const fetchAppointment = useCallback(() => {
    const jwt = getTokenFromCookie();
    fetch(`${API_BASE}/api/v1/appointments/${appointmentId}/tokens`, {
      headers: { Authorization: `Bearer ${jwt ?? ''}` },
    })
      .then((response) => (response.ok ? response.json() as Promise<Appointment> : Promise.reject(`HTTP ${response.status}`)))
      .then((data) => { setAppointment(data); setLoading(false); })
      .catch((fetchError) => { setError(String(fetchError)); setLoading(false); });
  }, [appointmentId]);

  useEffect(() => {
    fetchAppointment();
  }, [fetchAppointment]);

  const handleLocked = useCallback(() => {
    router.push('/patient?locked=1');
  }, [router]);

  const handleDoctorReady = useCallback(() => {
    setDoctorReady(true);
    // Refresh appointment data to get ACTIVE status + fresh tokens
    fetchAppointment();
  }, [fetchAppointment]);

  if (loading) {
    return <div style={{ padding: 32, fontFamily: 'monospace' }}>Joining consultation…</div>;
  }

  if (error || !appointment) {
    return (
      <div style={{ padding: 32, fontFamily: 'monospace', color: '#CC0000' }}>
        {error ?? 'Appointment not found.'}
      </div>
    );
  }

  // Show waiting room if appointment is SCHEDULED and doctor hasn't joined yet
  const isWaiting = appointment.status === 'SCHEDULED' && !doctorReady;

  return (
    <ConsentGate appointmentId={appointmentId}>
      <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 16px' }}>
        {isWaiting ? (
          <WaitingRoom
            appointmentId={appointmentId}
            doctorName={appointment.doctorName ?? `Doctor #${appointment.doctorId}`}
            scheduledTime={String(appointment.startTime)}
            onDoctorReady={handleDoctorReady}
          />
        ) : (
          <ConsultationRoom
            appointmentId={appointment.id}
            roomUrl={appointment.dailyRoomUrl}
            doctorToken={appointment.recipientToken}
            patientName={appointment.recipientName ?? `Patient #${appointment.id}`}
            peerUserId={String(appointment.doctorId)}
            onLocked={handleLocked}
          />
        )}
      </div>
    </ConsentGate>
  );
}
