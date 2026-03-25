import type { Metadata } from 'next';
import { requirePatientAuth } from '@/lib/patientPageAuth';
import PatientVaultPage from '@/components/PatientVaultPage';

export const metadata: Metadata = { title: 'Health Vault — Preventia' };

export default function VaultPage() {
  const user = requirePatientAuth('/patient/vault');
  return <PatientVaultPage user={user} />;
}
