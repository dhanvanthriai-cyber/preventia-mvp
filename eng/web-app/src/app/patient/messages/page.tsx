/**
 * /patient/messages — Full-screen provider chat for patients.
 * Server component — enforces RECIPIENT role, passes user + peer to FullScreenChat.
 */
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import FullScreenChat from '@/components/FullScreenChat';
import type { AuthUser, UserRole } from '@preventia/shared';

export const metadata: Metadata = {
  title: 'Provider Chat — Preventia',
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch { return null; }
}

type SearchParams = { peer?: string; peerName?: string };

export default function PatientMessagesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const cookieStore = cookies();
  const token = cookieStore.get('preventia_token')?.value;

  if (!token) redirect('/login?next=/patient/messages');

  const payload = decodeJwtPayload(token);
  const role = (payload?.role as string) ?? '';

  if (role && role !== 'RECIPIENT') {
    if (role === 'DOCTOR')     redirect('/doctor/messages');
    if (role === 'PHARMACIST') redirect('/pharmacist');
    if (role === 'ADMIN')      redirect('/admin');
    redirect('/login');
  }

  const user: AuthUser = {
    userId: (payload?.userId as number) ?? 0,
    name:   (payload?.name as string) ?? (payload?.sub as string) ?? 'Patient',
    role:   (payload?.role as UserRole) ?? 'RECIPIENT',
    token,
  };

  return (
    <FullScreenChat
      userName={user.name}
      userId={user.userId}
      roleLabel="Patient"
      backHref="/patient"
      peerUserId={searchParams?.peer}
      peerName={searchParams?.peerName}
    />
  );
}
