/**
 * /sponsor — Sponsor Portal
 * Server component — reads auth cookie, enforces SPONSOR role, passes decoded
 * user to SponsorDashboard.  Non-SPONSOR roles are redirected to their portal.
 */
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SponsorDashboard from '../../components/SponsorDashboard';
import type { AuthUser, UserRole } from '@preventia/shared';

export const metadata: Metadata = {
  title: 'Sponsor Portal — Preventia',
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch { return null; }
}

export default function SponsorPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('preventia_token')?.value;

  if (!token) redirect('/login?next=/sponsor');

  const payload = decodeJwtPayload(token);
  const role = (payload?.role as string) ?? '';

  if (role && role !== 'SPONSOR') {
    if (role === 'DOCTOR')     redirect('/doctor');
    if (role === 'RECIPIENT')  redirect('/patient');
    if (role === 'PHARMACIST') redirect('/pharmacist');
    if (role === 'ADMIN')      redirect('/admin');
    redirect('/login');
  }

  let user: AuthUser | undefined;
  if (payload) {
    user = {
      userId: payload.userId as number ?? 0,
      name:   payload.name as string  ?? (payload.sub as string ?? 'Sponsor'),
      role:   (payload.role as UserRole) ?? 'SPONSOR',
      token,
    } satisfies AuthUser;
  }

  return <SponsorDashboard user={user} />;
}
