/**
 * middleware.ts — Next.js edge middleware for route protection
 *
 * Protected route prefixes: /doctor, /pharmacist, /sponsor
 * Auth signal: presence of the `dhanvanthri_token` cookie
 *
 * If a request arrives for a protected route without the cookie,
 * the user is redirected to /login.
 *
 * This runs at the edge (before the page renders), so no JS bundle is
 * exposed to unauthenticated users.
 */
import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/doctor', '/pharmacist', '/sponsor'];
const COOKIE_NAME = 'dhanvanthri_token';

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      // Preserve the original destination so we can redirect back after login
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Only run this middleware for the protected routes — avoids unnecessary
  // execution on static assets, API routes, etc.
  matcher: [
    '/doctor/:path*',
    '/pharmacist/:path*',
    '/sponsor/:path*',
  ],
};
