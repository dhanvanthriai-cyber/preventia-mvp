import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminLoginPortal from '@/components/admin/AdminLoginPortal';

export const metadata: Metadata = {
  title: 'Preventia — Admin Sign In',
};

type AdminLoginSearchParams = {
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

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams?: AdminLoginSearchParams;
}) {
  const cookieStore = cookies();
  const token = cookieStore.get('preventia_token')?.value;

  if (token) {
    const payload = decodeJwtPayload(token);
    const role = typeof payload?.role === 'string' ? payload.role : '';
    if (role === 'ADMIN') redirect('/admin');
    else if (role) redirect('/');
  }

  return (
    <AdminLoginPortal
      nextPath={searchParams?.next ?? null}
      loggedOut={searchParams?.logged_out === '1'}
    />
  );
}
