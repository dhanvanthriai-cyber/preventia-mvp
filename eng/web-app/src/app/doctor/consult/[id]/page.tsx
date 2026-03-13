/**
 * /doctor/consult/[id] — Video consultation room (Doctor view)
 * Fetches appointment by ID, passes doctorToken to ConsultationRoom.
 * When LOCKED, redirects back to /doctor.
 */
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ConsultationRoom from '@/components/ConsultationRoom';
import { getAppointments } from '@dhanvanthri/shared';
import type { Appointment } from '@dhanvanthri/shared';

export default function ConsultPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getAppointments({ id })
      .then((list) => setAppt(Array.isArray(list) ? list[0] ?? null : null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLocked = useCallback(() => {
    router.push(`/doctor?locked=${id}`);
  }, [router, id]);

  if (loading) return <div style={{ padding: 32, fontFamily: 'monospace' }}>Loading appointment…</div>;
  if (!appt) return <div style={{ padding: 32, fontFamily: 'monospace', color: '#CC0000' }}>Appointment not found.</div>;

  return (
    <div style={{ maxWidth: 900, margin: '32px auto', padding: '0 16px' }}>
      <ConsultationRoom
        appointmentId={appt.id}
        roomUrl={appt.dailyRoomUrl}
        doctorToken={appt.doctorToken}
        patientName={appt.recipientName ?? `Patient #${appt.id}`}
        onLocked={handleLocked}
      />
    </div>
  );
}
