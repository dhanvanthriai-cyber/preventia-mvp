/**
 * /patient — Patient Portal
 * Server component — reads auth cookie, decodes user, passes to PatientDashboard.
 * Guards against non-RECIPIENT roles.
 */
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PatientDashboard from '@/components/PatientDashboard';
import type { AuthUser, UserRole } from '@preventia/shared';

export const metadata: Metadata = {
  title: 'My Health — Preventia Patient Portal',
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch { return null; }
}

export default function PatientPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('preventia_token')?.value;

  // No token → redirect to login
  if (!token) redirect('/login?next=/patient');

  const payload = decodeJwtPayload(token);
  const role = (payload?.role as string) ?? '';

  // Wrong role → redirect to their own portal
  if (role && role !== 'RECIPIENT') {
    if (role === 'DOCTOR')     redirect('/doctor');
    if (role === 'PHARMACIST') redirect('/pharmacist');
    if (role === 'SPONSOR')    redirect('/sponsor');
    if (role === 'ADMIN')      redirect('/admin');
    redirect('/login');
  }

  let user: AuthUser | undefined;
  if (payload) {
    user = {
      userId: (payload.userId as number) ?? 0,
      name:   (payload.name  as string)  ?? (payload.sub as string) ?? 'Patient',
      role:   (payload.role  as UserRole) ?? 'RECIPIENT',
      token,
    };
  }

  return <PatientDashboard user={user} />;
}
