import type { Metadata } from 'next';
import { requirePatientAuth } from '@/lib/patientPageAuth';
import PatientPharmacyPage from '@/components/PatientPharmacyPage';

export const metadata: Metadata = { title: 'Pharmacy — Preventia' };

export default function PharmacyPage() {
  const user = requirePatientAuth('/patient/pharmacy');
  return <PatientPharmacyPage user={user} />;
}
