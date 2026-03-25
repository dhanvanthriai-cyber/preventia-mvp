import type { Metadata } from 'next';
import { requirePatientAuth } from '@/lib/patientPageAuth';
import PatientHistoryPage from '@/components/PatientHistoryPage';

export const metadata: Metadata = { title: 'Consultation History — Preventia' };

export default function HistoryPage() {
  const user = requirePatientAuth('/patient/history');
  return <PatientHistoryPage user={user} />;
}
