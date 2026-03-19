import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthUser, UserRole } from '@preventia/shared';
import DoctorProfilePage from '@/components/DoctorProfilePage';

export const metadata: Metadata = {
  title: 'Doctor Profile — Preventia',
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function DoctorProfile() {
  const cookieStore = cookies();
  const token = cookieStore.get('preventia_token')?.value;
  if (!token) redirect('/login?next=/doctor/profile');

  const payload = decodeJwtPayload(token);
  const role = (payload?.role as string) ?? '';

  if (role && role !== 'DOCTOR') {
    if (role === 'RECIPIENT') redirect('/patient');
    if (role === 'PHARMACIST') redirect('/pharmacist');
    if (role === 'SPONSOR') redirect('/sponsor');
    if (role === 'ADMIN') redirect('/admin');
    redirect('/login');
  }

  let user: AuthUser | undefined;

  if (payload) {
    user = {
      userId: (payload.userId as number) ?? 0,
      name: (payload.name as string) ?? (payload.sub as string) ?? 'Doctor',
      role: (payload.role as UserRole) ?? 'DOCTOR',
      token,
    };
  }

  return <DoctorProfilePage user={user} />;
}
