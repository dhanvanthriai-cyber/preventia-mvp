import type { UserRole } from '@preventia/shared';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type JwtPayload = {
  sub?: string;
  name?: string;
  role?: string;
  userId?: number;
};

export type PortalRole = UserRole | 'ADMIN';

export type ServerPortalSession = {
  token: string;
  userId: number;
  role: PortalRole;
  name: string;
  email: string;
};

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf8')) as JwtPayload;
  } catch {
    return null;
  }
}

export function getRouteForRole(role?: string | null): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'DOCTOR':
      return '/doctor';
    case 'PHARMACIST':
      return '/pharmacist';
    case 'SPONSOR':
      return '/sponsor';
    case 'RECIPIENT':
      return '/patient';
    default:
      return '/login';
  }
}

export function requirePortalRole(expectedRole: PortalRole, nextPath: string): ServerPortalSession {
  const token = cookies().get('preventia_token')?.value;

  if (!token) {
    const loginPath = expectedRole === 'ADMIN'
      ? `/login?role=ADMIN&next=${encodeURIComponent(nextPath)}`
      : `/login?next=${encodeURIComponent(nextPath)}`;

    redirect(loginPath);
  }

  const payload = decodeJwtPayload(token);
  const role = payload?.role ?? '';

  if (role !== expectedRole) {
    redirect(getRouteForRole(role));
  }

  return {
    token,
    userId: (payload?.userId as number) ?? 0,
    role: expectedRole,
    name: payload?.name ?? payload?.sub ?? expectedRole,
    email: payload?.sub ?? 'unknown@preventia.app',
  };
}
