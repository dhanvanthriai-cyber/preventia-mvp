/**
 * auth.ts — client-side JWT cookie helpers
 *
 * Utilities for reading/decoding the Preventia JWT stored in a browser
 * cookie.  No verification is done here — the backend owns token validation.
 * These helpers are safe to call from any 'use client' component.
 */

const COOKIE_NAME = 'preventia_token';

// ─── Cookie I/O ───────────────────────────────────────────────────────────────

/**
 * Returns the raw JWT string from the `preventia_token` cookie,
 * or null if the cookie is absent (e.g. not logged in / SSR context).
 */
export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const entry = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${COOKIE_NAME}=`));
  return entry ? decodeURIComponent(entry.split('=').slice(1).join('=')) : null;
}

/**
 * Writes the JWT to a browser cookie.
 * httpOnly:false — intentional; the web client reads it to decode the role
 *                  and drive UI. The backend's JWT signature is the trust anchor.
 * SameSite=Lax    — protects against CSRF while allowing top-level navigation.
 */
export function setTokenCookie(token: string, expiresInSeconds: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'path=/',
    `max-age=${expiresInSeconds}`,
    'SameSite=Lax',
  ].join('; ');
}

/**
 * Clears the JWT cookie — effectively logs the user out on the client side.
 */
export function clearToken(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

// ─── Token decoding ───────────────────────────────────────────────────────────

export interface DecodedToken {
  sub: string;          // email / subject
  role: string;         // DOCTOR | PHARMACIST | SPONSOR | RECIPIENT | ADMIN
  userId?: number;
  name?: string;
  exp?: number;
  iat?: number;
}

/**
 * Decodes the JWT payload without verifying the signature.
 * Use this only for UI decisions (e.g. role-based redirects).
 * Returns null if the token is malformed.
 */
export function getUserFromToken(token: string): DecodedToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // atob handles standard base64; JWT uses base64url — replace chars first
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as DecodedToken;
  } catch {
    return null;
  }
}

/**
 * Convenience: reads the cookie and decodes it in one call.
 * Returns null when not logged in or token is malformed.
 */
export function getCurrentUser(): DecodedToken | null {
  const token = getTokenFromCookie();
  if (!token) return null;
  return getUserFromToken(token);
}

// ─── Refresh token storage (localStorage — not cookie, not httpOnly) ─────────

const REFRESH_KEY = 'preventia_refresh_token';

export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REFRESH_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function clearRefreshToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(REFRESH_KEY);
}

/** Full logout — clears both the access token cookie and the refresh token. */
export function clearSession(): void {
  clearToken();
  clearRefreshToken();
}

// ─── Role → route mapping ─────────────────────────────────────────────────────

export function getDefaultRouteForRole(role: string): string {
  switch (role) {
    case 'ADMIN':       return '/admin';
    case 'DOCTOR':      return '/doctor';
    case 'PHARMACIST':  return '/pharmacist';
    case 'SPONSOR':     return '/sponsor';
    case 'RECIPIENT':   return '/patient';
    default:            return '/patient';
  }
}
