/**
 * GET /api/logout
 *
 * Clears the Preventia auth cookie server-side and redirects the user
 * to the login page.  Called directly by the browser (href navigation)
 * or programmatically via router.push('/api/logout').
 */
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'preventia_token';

function decodeJwtRole(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const encoded = token.split('.')[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as { role?: string };
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function GET(request: NextRequest): NextResponse {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = request.headers.get('host')?.split(',')[0]?.trim();
  const currentRole = decodeJwtRole(request.cookies.get(COOKIE_NAME)?.value);

  const origin = forwardedHost
    ? `${forwardedProto ?? 'https'}://${forwardedHost}`
    : host
      ? `${forwardedProto ?? request.nextUrl.protocol.replace(':', '') ?? 'http'}://${host}`
      : request.nextUrl.origin;

  const redirectPath = currentRole === 'ADMIN'
    ? '/login?role=ADMIN&logged_out=1'
    : '/?mode=login&logged_out=1';
  const redirectUrl = new URL(redirectPath, origin);

  const response = NextResponse.redirect(redirectUrl);

  // Expire the auth cookie immediately — works for both httpOnly and non-httpOnly cookies
  response.cookies.set({
    name:     COOKIE_NAME,
    value:    '',
    path:     '/',
    maxAge:   0,
    sameSite: 'lax',
  });

  return response;
}
