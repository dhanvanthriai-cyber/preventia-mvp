/**
 * useAuth.ts — Authentication hook
 * Project Preventia
 *
 * Calls:
 *  POST /api/v1/auth/login    → { token, role, userId, name }
 *  POST /api/v1/auth/register → { token, role, userId, name }
 *
 * Stores token in-memory (AsyncStorage in production).
 * Role drives navigation: RECIPIENT | SPONSOR | DOCTOR | PHARMACIST | ADMIN
 */

import { useCallback, useState } from 'react';

const API_BASE = process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080';

export type UserRole = 'RECIPIENT' | 'SPONSOR' | 'DOCTOR' | 'PHARMACIST' | 'ADMIN';

export interface AuthUser {
  token: string;
  role: UserRole;
  userId: number;
  name: string;
}

export interface UseAuthResult {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser | null>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<AuthUser | null>;
  logout: () => void;
}

export function useAuth(): UseAuthResult {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser | null> => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Invalid email or password.' : `Server error ${res.status}`);
      const data: AuthUser = await res.json();
      setUser(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed.');
      return null;
    } finally { setLoading(false); }
  }, []);

  const register = useCallback(async (
    name: string, email: string, password: string, role: UserRole
  ): Promise<AuthUser | null> => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!res.ok) throw new Error(`Registration failed: ${res.status}`);
      const data: AuthUser = await res.json();
      setUser(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed.');
      return null;
    } finally { setLoading(false); }
  }, []);

  const logout = useCallback(() => setUser(null), []);

  return { user, loading, error, login, register, logout };
}
