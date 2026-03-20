'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConsultationRoom from '@/components/ConsultationRoom';
import ConsentGate from '@/components/ConsentGate';
import { getTokenFromCookie } from '@/lib/auth';
import type { Appointment } from '@preventia/shared';

interface DoctorConsultPageClientProps {
  readonly appointmentId: number;
}

const API_BASE = '';

export default function DoctorConsultPageClient({ appointmentId }: DoctorConsultPageClientProps) {
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const jwt = getTokenFromCookie();

    fetch(`${API_BASE}/api/v1/appointments/${appointmentId}/tokens`, {
      headers: { Authorization: `Bearer ${jwt ?? ''}` },
    })
      .then((response) => (response.ok ? response.json() : Promise.reject(`HTTP ${response.status}`)))
      .then((data) => setAppointment(data))
      .catch((fetchError) => setError(String(fetchError)))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  const handleLocked = useCallback(() => {
    router.push(`/doctor?locked=${appointmentId}`);
  }, [appointmentId, router]);

  if (loading) {
    return <div style={{ padding: 32, fontFamily: 'monospace' }}>Loading consultation…</div>;
  }

  if (error || !appointment) {
    return (
      <div style={{ padding: 32, fontFamily: 'monospace', color: '#CC0000' }}>
        {error ?? 'Appointment not found.'}
      </div>
    );
  }

  return (
    <ConsentGate appointmentId={appointmentId}>
      <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 16px' }}>
        <ConsultationRoom
          appointmentId={appointment.id}
          roomUrl={appointment.dailyRoomUrl}
          doctorToken={appointment.doctorToken}
          patientName={appointment.recipientName ?? `Patient #${appointment.id}`}
          peerUserId={String(appointment.recipientId)}
          onLocked={handleLocked}
        />
      </div>
    </ConsentGate>
  );
}
