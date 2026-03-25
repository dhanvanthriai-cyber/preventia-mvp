/**
 * /doctor/messages — Full-screen in-network chat for doctors.
 * Server component — enforces DOCTOR role, passes user to FullScreenChat.
 */
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import FullScreenChat from '@/components/FullScreenChat';
import type { AuthUser, UserRole } from '@preventia/shared';

export const metadata: Metadata = {
  title: 'In-Network Chat — Preventia',
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch { return null; }
}

export default function DoctorMessagesPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('preventia_token')?.value;

  if (!token) redirect('/login?role=DOCTOR&next=/doctor/messages');

  const payload = decodeJwtPayload(token);
  const role = (payload?.role as string) ?? '';

  if (role && role !== 'DOCTOR') {
    if (role === 'RECIPIENT')  redirect('/patient/messages');
    if (role === 'PHARMACIST') redirect('/pharmacist');
    if (role === 'ADMIN')      redirect('/admin');
    redirect('/login');
  }

  const user: AuthUser = {
    userId: (payload?.userId as number) ?? 0,
    name:   (payload?.name as string) ?? (payload?.sub as string) ?? 'Doctor',
    role:   (payload?.role as UserRole) ?? 'DOCTOR',
    token,
  };

  return (
    <FullScreenChat
      userName={user.name}
      userId={user.userId}
      roleLabel="Doctor"
      backHref="/doctor"
    />
  );
}
