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
import { getTokenFromCookie } from './auth';

// Initialize eagerly — this file is only bundled for the browser
// (next.config.js aliases @daily-co/daily-js to false on the server,
//  which prevents this module from being evaluated during SSR).
configureApiClient({
  baseUrl: '',   // relative — proxied by Next.js rewrite
  getToken: () => getTokenFromCookie(),
});

export { getApiClient } from '@preventia/shared';
