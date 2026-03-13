/**
 * apiClient.ts — Web-app singleton ApiClient
 * Reads NEXT_PUBLIC_API_BASE_URL (must be set to http://localhost:8080 in dev)
 * Token is read from localStorage (key: 'dhanvanthri_token')
 */
import { configureApiClient, getApiClient } from '@dhanvanthri/shared';

if (typeof window !== 'undefined') {
  configureApiClient({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080',
    getToken: () => localStorage.getItem('dhanvanthri_token'),
  });
}

export { getApiClient };
