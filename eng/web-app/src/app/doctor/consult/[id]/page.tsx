import { redirect } from 'next/navigation';
import DoctorConsultPageClient from '@/components/DoctorConsultPageClient';
import { requirePortalRole } from '@/lib/serverPortalAuth';

interface DoctorConsultPageProps {
  params: {
    id: string;
  };
}

export default function DoctorConsultPage({ params }: DoctorConsultPageProps) {
  requirePortalRole('DOCTOR', `/doctor/consult/${params.id}`);

  const appointmentId = Number(params.id);
  if (!Number.isFinite(appointmentId) || appointmentId <= 0) {
    redirect('/doctor');
  }

  return <DoctorConsultPageClient appointmentId={appointmentId} />;
}
