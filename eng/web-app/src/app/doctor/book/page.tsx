import DoctorBookAppointmentPageClient from '@/components/DoctorBookAppointmentPageClient';
import { requirePortalRole } from '@/lib/serverPortalAuth';

export default function BookAppointmentPage() {
  const session = requirePortalRole('DOCTOR', '/doctor/book');

  return (
    <DoctorBookAppointmentPageClient
      doctorId={session.userId}
      doctorName={session.name}
    />
  );
}
