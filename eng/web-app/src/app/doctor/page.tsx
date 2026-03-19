/**
 * /doctor — Doctor Portal
 * Server component — reads auth cookie, enforces DOCTOR role, passes decoded user
 * to DoctorDashboard.  Non-DOCTOR roles are redirected to their own portal.
 */
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DoctorDashboard from '@/components/DoctorDashboard';
import type { AuthUser, UserRole } from '@preventia/shared';

export const metadata: Metadata = {
  title: 'Doctor Portal — Preventia',
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch { return null; }
}

export default function DoctorPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('preventia_token')?.value;

  // No token → redirect to login
  if (!token) redirect('/login?next=/doctor');

  const payload = decodeJwtPayload(token);
  const role = (payload?.role as string) ?? '';

  // Wrong role → redirect each user to their own portal
  if (role && role !== 'DOCTOR') {
    if (role === 'RECIPIENT')  redirect('/patient');
    if (role === 'PHARMACIST') redirect('/pharmacist');
    if (role === 'SPONSOR')    redirect('/sponsor');
    if (role === 'ADMIN')      redirect('/admin');
    // Unknown role → login
    redirect('/login');
  }

  let user: AuthUser | undefined;
  if (payload) {
    user = {
      userId: (payload.userId as number) ?? 0,
      // JWT only contains sub (email) — use it as display name until profile API is wired
      name:   (payload.name as string) ?? (payload.sub as string) ?? 'Doctor',
      role:   (payload.role as UserRole) ?? 'DOCTOR',
      token,
    };
  }

  return <DoctorDashboard user={user} />;
}
