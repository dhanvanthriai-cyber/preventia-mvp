import type { Metadata } from 'next';
import { requirePatientAuth } from '@/lib/patientPageAuth';
import PatientNewsPage from '@/components/PatientNewsPage';

export const metadata: Metadata = { title: 'Health Newsroom — Preventia' };

export default function NewsPage() {
  const user = requirePatientAuth('/patient/news');
  return <PatientNewsPage user={user} />;
}
