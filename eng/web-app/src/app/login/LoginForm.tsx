'use client';
/**
 * LoginForm.tsx — Dhanvanthri portal login form
 *
 * Neo-Brutalist aesthetic: black borders, 0 border-radius, monospace font
 * — consistent with DoctorDashboard.tsx and the rest of the portal.
 *
 * Flow:
 *  1. POST /api/v1/auth/login with { email, password }
 *  2. On 200: store JWT in cookie, redirect by role
 *     DOCTOR      → /doctor
 *     PHARMACIST  → /pharmacist
 *     SPONSOR     → /sponsor
 *     RECIPIENT   → / (with "use the mobile app" message)
 *  3. On error: show inline error banner
 */
import React, { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setTokenCookie, getDefaultRouteForRole, getUserFromToken } from '../../lib/auth';

interface LoginApiResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  role: string;
  refreshToken?: string;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8080/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(text || `Login failed (HTTP ${res.status})`);
        return;
      }

      const data: LoginApiResponse = await res.json();

      // Persist JWT in browser cookie
      setTokenCookie(data.accessToken, data.expiresInSeconds ?? 86400);

      // Decode role from the token (or fall back to the response body role field)
      const decoded = getUserFromToken(data.accessToken);
      const role = decoded?.role ?? data.role;

      // RECIPIENT users are mobile-only — show a friendly notice instead of redirecting
      if (role === 'RECIPIENT') {
        setError('RECIPIENT accounts are managed in the Dhanvanthri mobile app. Please use the app to access your health dashboard.');
        return;
      }

      // Redirect to the originally requested path, or to the role default
      const destination = nextPath ?? getDefaultRouteForRole(role);
      router.push(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error — is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h1 style={styles.title}>DHANVANTHRI</h1>
        <p style={styles.subtitle}>PORTAL SIGN IN</p>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          ⚠ {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} style={styles.form} noValidate>
        <div style={styles.fieldGroup}>
          <label style={styles.label} htmlFor="email">EMAIL</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="doctor@example.com"
            style={styles.input}
            disabled={loading}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label} htmlFor="password">PASSWORD</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            style={styles.input}
            disabled={loading}
          />
        </div>

        <button type="submit" style={styles.submitBtn} disabled={loading}>
          {loading ? 'SIGNING IN…' : 'SIGN IN'}
        </button>
      </form>

      <p style={styles.footer}>
        Doctor · Pharmacist · Sponsor portals only.{' '}
        <strong style={{ color: '#000' }}>Patients: use the mobile app.</strong>
      </p>
    </div>
  );
}

// ─── Neo-Brutalist styles (matching DoctorDashboard.tsx) ─────────────────────

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: '3px solid #111',
    backgroundColor: '#fff',
    fontFamily: 'monospace',
    maxWidth: 440,
    margin: '64px auto',
    padding: 0,
  },
  header: {
    backgroundColor: '#000',
    color: '#fff',
    padding: '24px 32px 20px 32px',
    borderBottom: '3px solid #111',
  },
  title: {
    fontFamily: 'Georgia, serif',
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    letterSpacing: 2,
    color: '#fff',
  },
  subtitle: {
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 3,
    color: '#aaa',
    margin: '6px 0 0 0',
    textTransform: 'uppercase' as const,
  },
  errorBanner: {
    backgroundColor: '#FFF3CD',
    border: '0',
    borderBottom: '2px solid #FFC107',
    padding: '10px 32px',
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#333',
    lineHeight: 1.5,
  },
  form: {
    padding: '24px 32px',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.5,
    color: '#000',
    marginBottom: 6,
    textTransform: 'uppercase' as const,
  },
  input: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box' as const,
    fontFamily: 'monospace',
    fontSize: 14,
    border: '2px solid #111',
    borderRadius: 0,               // Neo-Brutalist: 0 border-radius
    padding: '10px 12px',
    backgroundColor: '#fff',
    color: '#000',
    outline: 'none',
  },
  submitBtn: {
    display: 'block',
    width: '100%',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 2,
    backgroundColor: '#000',
    color: '#fff',
    border: '2px solid #111',
    borderRadius: 0,
    padding: '12px',
    cursor: 'pointer',
    marginTop: 8,
    textTransform: 'uppercase' as const,
  },
  footer: {
    borderTop: '2px solid #111',
    padding: '14px 32px',
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#666',
    margin: 0,
    lineHeight: 1.6,
  },
};
