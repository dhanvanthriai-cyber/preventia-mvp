import type { Metadata } from 'next';
import { requirePatientAuth } from '@/lib/patientPageAuth';
import PatientBillingPage from '@/components/PatientBillingPage';

export const metadata: Metadata = { title: 'Billing & Financials — Preventia' };

export default function BillingPage() {
  const user = requirePatientAuth('/patient/billing');
  return <PatientBillingPage user={user} />;
}
