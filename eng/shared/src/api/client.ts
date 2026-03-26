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
  /**
   * Called when a request receives a 401 and a refresh attempt should be made.
   * Should refresh the access token and return the new token, or null if
   * refresh failed (triggering logout).
   */
  onRefresh?: () => Promise<string | null>;
  /** Called when refresh fails — use to redirect to login. */
  onAuthExpired?: () => void;
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
  private baseUrl:       string;
  private getToken:      GetTokenFn;
  private onRefresh?:    () => Promise<string | null>;
  private onAuthExpired?: () => void;
  private refreshing:    boolean = false;
  private refreshQueue:  Array<(token: string | null) => void> = [];

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl       = config.baseUrl      ?? DEFAULT_BASE_URL;
    this.getToken      = config.getToken     ?? (() => null);
    this.onRefresh     = config.onRefresh;
    this.onAuthExpired = config.onAuthExpired;
  }

  private async buildHeaders(
    extra: Record<string, string> = {},
    tokenOverride?: string,
  ): Promise<Record<string, string>> {
    const token = tokenOverride ?? await Promise.resolve(this.getToken());
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extra,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  /**
   * Handles a 401 response: attempts token refresh once, queuing concurrent
   * requests so only one refresh call is made at a time.
   * Returns the new token, or null if refresh failed.
   */
  private async handleUnauthorized(): Promise<string | null> {
    if (!this.onRefresh) return null;

    if (this.refreshing) {
      // Queue this request until the in-flight refresh resolves
      return new Promise<string | null>(resolve => {
        this.refreshQueue.push(resolve);
      });
    }

    this.refreshing = true;
    try {
      const newToken = await this.onRefresh();
      this.refreshQueue.forEach(resolve => resolve(newToken));
      this.refreshQueue = [];
      if (!newToken) this.onAuthExpired?.();
      return newToken;
    } finally {
      this.refreshing = false;
    }
  }

  /** Core fetch with automatic 401 → refresh → retry. */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retried = false,
  ): Promise<T> {
    const headers = await this.buildHeaders();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && !retried) {
      const newToken = await this.handleUnauthorized();
      if (newToken) {
        // Retry once with the fresh token
        const retryHeaders = await this.buildHeaders({}, newToken);
        const retryRes = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: retryHeaders,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        if (!retryRes.ok) {
          throw createApiError(`${method} ${path} failed after refresh: ${retryRes.status}`, retryRes.status);
        }
        return retryRes.json() as Promise<T>;
      }
      // Refresh failed — throw 401 so callers can react
      throw createApiError(`${method} ${path} unauthorized`, 401);
    }

    if (!res.ok) {
      throw createApiError(`${method} ${path} failed: ${res.status}`, res.status);
    }
    return res.json() as Promise<T>;
  }

  async get<T>(path: string): Promise<T>                    { return this.request<T>('GET',    path); }
  async post<T>(path: string, body?: unknown): Promise<T>   { return this.request<T>('POST',   path, body); }
  async put<T>(path: string, body?: unknown): Promise<T>    { return this.request<T>('PUT',    path, body); }
  async patch<T>(path: string, body?: unknown): Promise<T>  { return this.request<T>('PATCH',  path, body); }
  async delete<T>(path: string): Promise<T>                 { return this.request<T>('DELETE', path); }
}

/** Shared singleton — configure once at app startup */
let _client: ApiClient = new ApiClient();

export function configureApiClient(config: ApiClientConfig): void {
  _client = new ApiClient(config);
}

export function getApiClient(): ApiClient {
  return _client;
}
