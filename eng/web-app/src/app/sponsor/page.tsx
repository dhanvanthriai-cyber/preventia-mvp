/**
 * /sponsor — Sponsor Portal
 * Server component — reads auth cookie and passes decoded user to SponsorDashboard.
 */
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import SponsorDashboard from '../../components/SponsorDashboard';
import type { AuthUser } from '@dhanvanthri/shared';

export const metadata: Metadata = {
  title: 'Sponsor Portal — Dhanvanthri',
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch { return null; }
}

export default function SponsorPage() {
  const cookieStore = cookies();
  const token = cookieStore.get('dhanvanthri_token')?.value;
  let user: AuthUser | undefined;

  if (token) {
    const payload = decodeJwtPayload(token);
    if (payload) {
      user = {
        userId: payload.userId as number ?? 0,
        name:   payload.name as string  ?? (payload.sub as string ?? 'Sponsor'),
        role:   payload.role as string  ?? 'SPONSOR',
        token,
      } satisfies AuthUser;
    }
  }

  return <SponsorDashboard user={user} />;
}
