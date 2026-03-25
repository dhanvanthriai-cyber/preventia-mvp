import type { Metadata } from 'next';
import { requirePatientAuth } from '@/lib/patientPageAuth';
import PatientDevicesPage from '@/components/PatientDevicesPage';

export const metadata: Metadata = { title: 'Devices & Vitals — Preventia' };

export default function DevicesPage() {
  const user = requirePatientAuth('/patient/devices');
  return <PatientDevicesPage user={user} />;
}
