import { redirect } from 'next/navigation';
import DoctorPatientDetailPageClient from '@/components/DoctorPatientDetailPageClient';
import { requirePortalRole } from '@/lib/serverPortalAuth';

interface DoctorPatientDetailPageProps {
  params: {
    id: string;
  };
}

export default function DoctorPatientDetailPage({ params }: DoctorPatientDetailPageProps) {
  requirePortalRole('DOCTOR', `/doctor/patient/${params.id}`);

  const patientId = Number(params.id);
  if (!Number.isFinite(patientId) || patientId <= 0) {
    redirect('/doctor');
  }

  return <DoctorPatientDetailPageClient patientId={patientId} />;
}
