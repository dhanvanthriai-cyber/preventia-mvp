import type { Metadata } from 'next';
import { requirePatientAuth } from '@/lib/patientPageAuth';
import PatientInsightsPage from '@/components/PatientInsightsPage';

export const metadata: Metadata = { title: 'Health Insights — Preventia' };

export default function InsightsPage() {
  const user = requirePatientAuth('/patient/insights');
  return <PatientInsightsPage user={user} />;
}
