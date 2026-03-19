import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LandingAuthPortal from '@/components/LandingAuthPortal';

export const metadata: Metadata = {
  title: 'Preventia — Join',
};

type HomePageSearchParams = {
  mode?: string;
  role?: string;
  next?: string;
  logged_out?: string;
};

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const encoded = token.split('.')[1];
    if (!encoded) return null;

    const normalized = encoded.replaceAll('-', '+').replaceAll('_', '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getDefaultRouteForRole(role: string): string {
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
      return '/patient';
  }
}

export default function HomePage({
  searchParams,
}: {
  searchParams?: HomePageSearchParams;
}) {
  const cookieStore = cookies();
  const token = cookieStore.get('preventia_token')?.value;

  if (token) {
    const payload = decodeJwtPayload(token);
    const role = typeof payload?.role === 'string' ? payload.role : '';
    if (role) redirect(getDefaultRouteForRole(role));
  }

  const mode = searchParams?.mode === 'login' ? 'login' : 'register';
  const roleParam = searchParams?.role;
  const initialRole =
    roleParam === 'DOCTOR' || roleParam === 'PHARMACIST' || roleParam === 'RECIPIENT'
      ? roleParam
      : 'RECIPIENT';

  return (
    <LandingAuthPortal
      googleClientId={process.env.GOOGLE_CLIENT_ID}
      appleClientId={process.env.APPLE_CLIENT_ID}
      appleRedirectUri={process.env.APPLE_REDIRECT_URI}
      initialMode={mode}
      initialRole={initialRole}
      nextPath={searchParams?.next ?? null}
      loggedOut={searchParams?.logged_out === '1'}
    />
  );
}
