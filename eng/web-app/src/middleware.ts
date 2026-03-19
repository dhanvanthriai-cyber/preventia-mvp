/**
 * middleware.ts — Next.js edge middleware for route protection
 *
 * Protected route prefixes: /doctor, /pharmacist, /sponsor, /patient
 * Auth signal: presence of the `preventia_token` cookie
 *
 * If a request arrives for a protected route without the cookie,
 * the user is redirected to /login.
 *
 * Role-based cross-portal guard:
 * The JWT payload role is decoded (no crypto — verification is the backend's job)
 * and the user is redirected to their own portal if they try to access another.
 *
 * This runs at the edge (before the page renders), so no JS bundle is
 * exposed to unauthenticated users.
 */
import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/doctor', '/pharmacist', '/sponsor', '/patient', '/admin'];
const COOKIE_NAME = 'preventia_token';

/** Role → canonical portal path */
const ROLE_HOME: Record<string, string> = {
  DOCTOR:      '/doctor',
  PHARMACIST:  '/pharmacist',
  SPONSOR:     '/sponsor',
  RECIPIENT:   '/patient',
  ADMIN:       '/admin',
};

/** Decode JWT payload without verification (edge runtime has no crypto). */
function decodeJwtRole(token: string): string | null {
  try {
    const b64 = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    // Edge runtime supports atob
    const json = atob(b64);
    const payload = JSON.parse(json) as Record<string, unknown>;
    return (payload.role as string) ?? null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;

  // No token → send to login
  if (!token) {
    const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
    const loginUrl = new URL(isAdminPath ? '/login' : '/', req.url);
    if (!isAdminPath) {
      loginUrl.searchParams.set('mode', 'login');
    }
    loginUrl.searchParams.set('next', pathname);
    if (isAdminPath) {
      loginUrl.searchParams.set('role', 'ADMIN');
    }
    return NextResponse.redirect(loginUrl);
  }

  // Decode role and enforce cross-portal redirect
  const role = decodeJwtRole(token);
  if (role) {
    const home = ROLE_HOME[role];
    if (home) {
      // Determine which portal is being accessed
      const accessedPortal = PROTECTED_PREFIXES.find(prefix =>
        pathname === prefix || pathname.startsWith(`${prefix}/`)
      );
      if (accessedPortal && !pathname.startsWith(home)) {
        // User is trying to access the wrong portal — send them home
        return NextResponse.redirect(new URL(home, req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/doctor/:path*',
    '/pharmacist/:path*',
    '/sponsor/:path*',
    '/patient/:path*',
    '/admin/:path*',
  ],
};
