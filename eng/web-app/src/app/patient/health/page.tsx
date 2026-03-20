/**
 * /patient/health — Clinical dashboard (PatientDashboard).
 * Moved from /patient so that /patient can host FamilyHub.
 * Accessible from the FamilyHub nav ("My Health") and primary account card.
 */
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PatientDashboard from '@/components/PatientDashboard';
import type { AuthUser, UserRole } from '@preventia/shared';

export const metadata: Metadata = {
  title: 'My Health — Preventia',
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch { return null; }
}

export default function PatientHealthPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('preventia_token')?.value;

  if (!token) redirect('/login?next=/patient/health');

  const payload = decodeJwtPayload(token);
  const role = (payload?.role as string) ?? '';

  if (role && role !== 'RECIPIENT') redirect('/patient');

  const user: AuthUser | undefined = payload
    ? {
        userId: (payload.userId as number) ?? 0,
        name:   (payload.name  as string)  ?? (payload.sub as string) ?? 'Patient',
        role:   (payload.role  as UserRole) ?? 'RECIPIENT',
        token,
      }
    : undefined;

  return <PatientDashboard user={user} />;
}
