import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ServiceEnrollmentForm from '@/components/ServiceEnrollmentForm';

export const metadata: Metadata = {
  title: 'Service Enrollment — Preventia',
};

export default function EnrollPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('preventia_token')?.value;
  if (!token) redirect('/login?next=/patient/enroll');
  return <ServiceEnrollmentForm />;
}
