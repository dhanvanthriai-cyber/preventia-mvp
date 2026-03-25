import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthUser, UserRole } from '@preventia/shared';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch { return null; }
}

/**
 * Call from any patient server page. Redirects to /login if not authenticated
 * or not RECIPIENT role. Returns the AuthUser if valid.
 */
export function requirePatientAuth(nextPath: string): AuthUser {
  const cookieStore = cookies();
  const token = cookieStore.get('preventia_token')?.value;
  if (!token) redirect(`/login?next=${nextPath}`);
  const payload = decodeJwtPayload(token);
  const role = (payload?.role as string) ?? '';
  if (role && role !== 'RECIPIENT') redirect('/login');
  return {
    userId: (payload?.userId as number) ?? 0,
    name: (payload?.name as string) ?? (payload?.sub as string) ?? 'Patient',
    role: (payload?.role as UserRole) ?? 'RECIPIENT',
    token,
  };
}
