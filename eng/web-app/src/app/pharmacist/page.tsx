/**
 * /pharmacist — Pharmacist Portal
 * Server component — reads auth cookie, enforces PHARMACIST role, passes decoded
 * user to PharmacistQueue.  Non-PHARMACIST roles are redirected to their portal.
 */
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PharmacistQueue from '@/components/PharmacistQueue';

export const metadata: Metadata = {
  title: 'Pharmacist Portal — Preventia',
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch { return null; }
}

export default function PharmacistPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('preventia_token')?.value;

  if (!token) redirect('/login?next=/pharmacist');

  const payload = decodeJwtPayload(token);
  const role = (payload?.role as string) ?? '';

  if (role && role !== 'PHARMACIST') {
    if (role === 'DOCTOR')    redirect('/doctor');
    if (role === 'RECIPIENT') redirect('/patient');
    if (role === 'SPONSOR')   redirect('/sponsor');
    if (role === 'ADMIN')     redirect('/admin');
    redirect('/login');
  }

  return <PharmacistQueue />;
}
