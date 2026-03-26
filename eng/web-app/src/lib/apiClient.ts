/**
 * apiClient.ts — Web-app singleton ApiClient
 * Uses a relative base URL so all requests go through the Next.js /api proxy.
 * In production this is handled by App Router route handlers under src/app/api/*,
 * which forward requests to the current API base URL at runtime.
 * This avoids CORS entirely for the web app and prevents stale build-time API URLs.
 *
 * Token is read from the preventia_token cookie (set by LoginForm on login).
 * We initialize eagerly at module load time so the token getter is always
 * wired before any component calls getApiClient().
 */
import { configureApiClient, getApiClient } from '@preventia/shared';
import {
  getTokenFromCookie,
  setTokenCookie,
  getRefreshToken,
  clearSession,
} from './auth';

/**
 * Attempts to refresh the access token using the stored refresh token.
 * On success: updates the access token cookie and returns the new token.
 * On failure: clears the session and returns null (middleware will redirect).
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearSession();
    return null;
  }

  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearSession();
      return null;
    }

    const data = await res.json() as { accessToken: string; expiresInSeconds: number };
    setTokenCookie(data.accessToken, data.expiresInSeconds ?? 86400);
    return data.accessToken;
  } catch {
    clearSession();
    return null;
  }
}

function handleAuthExpired(): void {
  clearSession();
  if (typeof window !== 'undefined') {
    window.location.href = '/?mode=login&reason=session_expired';
  }
}

// Initialize eagerly — this file is only bundled for the browser.
configureApiClient({
  baseUrl:       '',   // relative — proxied by Next.js rewrite
  getToken:      () => getTokenFromCookie(),
  onRefresh:     refreshAccessToken,
  onAuthExpired: handleAuthExpired,
});

export { getApiClient } from '@preventia/shared';
