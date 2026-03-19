import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthUser, UserRole } from '@preventia/shared';
import PatientBookAppointmentPage from '@/components/PatientBookAppointmentPage';

export const metadata: Metadata = {
  title: 'Book Appointment — Preventia',
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function PatientBookPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('preventia_token')?.value;

  if (!token) redirect('/login?next=/patient/book');

  const payload = decodeJwtPayload(token);
  const role = (payload?.role as string) ?? '';

  if (role && role !== 'RECIPIENT') {
    if (role === 'DOCTOR') redirect('/doctor');
    if (role === 'PHARMACIST') redirect('/pharmacist');
    if (role === 'SPONSOR') redirect('/sponsor');
    if (role === 'ADMIN') redirect('/admin');
    redirect('/login');
  }

  let user: AuthUser | undefined;
  if (payload) {
    user = {
      userId: (payload.userId as number) ?? 0,
      name: (payload.name as string) ?? (payload.sub as string) ?? 'Patient',
      role: (payload.role as UserRole) ?? 'RECIPIENT',
      token,
    };
  }

  return <PatientBookAppointmentPage user={user} />;
}
