/**
 * client.ts — Base API client
 * Project Preventia
 *
 * Platform-agnostic: no RN or DOM imports.
 * Token can be supplied via a synchronous or async getter,
 * which lets React Native pass from AsyncStorage and web pass from
 * localStorage / a context.
 */

// ─── Config ───────────────────────────────────────────────────────────────────

/** Fallback if no BASE_URL is set at call time — empty = relative URL, proxied by Next.js */
const DEFAULT_BASE_URL = '';

// ─── Types ────────────────────────────────────────────────────────────────────

export type GetTokenFn = () => string | null | Promise<string | null>;

export interface ApiClientConfig {
  /** Spring Boot base URL, e.g. https://api.preventia.in */
  baseUrl?: string;
  /** Async or sync function that returns the current bearer token */
  getToken?: GetTokenFn;
}

export interface ApiError extends Error {
  status: number;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

function createApiError(message: string, status: number): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  return err;
}

// ─── Core client ──────────────────────────────────────────────────────────────

export class ApiClient {
  private baseUrl: string;
  private getToken: GetTokenFn;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.getToken = config.getToken ?? (() => null);
  }

  private async buildHeaders(
    extra: Record<string, string> = {},
  ): Promise<Record<string, string>> {
    const token = await Promise.resolve(this.getToken());
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extra,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async get<T>(path: string): Promise<T> {
    const headers = await this.buildHeaders();
    const res = await fetch(`${this.baseUrl}${path}`, { method: 'GET', headers });
    if (!res.ok) {
      throw createApiError(`GET ${path} failed: ${res.status}`, res.status);
    }
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const headers = await this.buildHeaders();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw createApiError(`POST ${path} failed: ${res.status}`, res.status);
    }
    return res.json() as Promise<T>;
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const headers = await this.buildHeaders();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      throw createApiError(`PUT ${path} failed: ${res.status}`, res.status);
    }
    return res.json() as Promise<T>;
  }
}

/** Shared singleton — configure once at app startup */
let _client: ApiClient = new ApiClient();

export function configureApiClient(config: ApiClientConfig): void {
  _client = new ApiClient(config);
}

export function getApiClient(): ApiClient {
  return _client;
}
