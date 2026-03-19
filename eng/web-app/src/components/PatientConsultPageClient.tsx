'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConsultationRoom from '@/components/ConsultationRoom';
import { getTokenFromCookie } from '@/lib/auth';
import type { Appointment } from '@preventia/shared';

interface PatientConsultPageClientProps {
  readonly appointmentId: number;
}

const API_BASE = '';

export default function PatientConsultPageClient({ appointmentId }: PatientConsultPageClientProps) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const jwt = getTokenFromCookie();

    fetch(`${API_BASE}/api/v1/appointments/${appointmentId}/tokens`, {
      headers: { Authorization: `Bearer ${jwt ?? ''}` },
    })
      .then((response) => (response.ok ? response.json() as Promise<Appointment> : Promise.reject(`HTTP ${response.status}`)))
      .then((data) => setAppointment(data))
      .catch((fetchError) => setError(String(fetchError)))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  const handleLocked = useCallback(() => {
    router.push('/patient?locked=1');
  }, [router]);

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

  return (
    <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 16px' }}>
      <ConsultationRoom
        appointmentId={appointment.id}
        roomUrl={appointment.dailyRoomUrl}
        doctorToken={appointment.recipientToken}
        patientName={appointment.recipientName ?? `Patient #${appointment.id}`}
        onLocked={handleLocked}
      />
    </div>
  );
}
