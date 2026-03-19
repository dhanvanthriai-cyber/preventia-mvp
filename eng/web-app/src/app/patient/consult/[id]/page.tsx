import { redirect } from 'next/navigation';
import PatientConsultPageClient from '@/components/PatientConsultPageClient';
import { requirePortalRole } from '@/lib/serverPortalAuth';

interface PatientConsultPageProps {
  params: {
    id: string;
  };
}

export default function PatientConsultPage({ params }: PatientConsultPageProps) {
  requirePortalRole('RECIPIENT', `/patient/consult/${params.id}`);

  const appointmentId = Number(params.id);
  if (!Number.isFinite(appointmentId) || appointmentId <= 0) {
    redirect('/patient');
  }

  return <PatientConsultPageClient appointmentId={appointmentId} />;
}
