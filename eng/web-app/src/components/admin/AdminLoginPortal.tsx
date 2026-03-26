'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserFromToken, setTokenCookie, setRefreshToken } from '@/lib/auth';

interface LoginApiResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  role: string;
  refreshToken?: string;
}

interface AdminLoginPortalProps {
  nextPath?: string | null;
  loggedOut?: boolean;
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  width: '100%',
  boxSizing: 'border-box',
  padding: '36px 20px 28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#F7F2EA',
};

const wrapperStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 400,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 18,
};

const plaqueStyle: React.CSSProperties = {
  backgroundColor: '#111111',
  color: '#FFFFFF',
  padding: '8px 12px',
  fontSize: 24,
  lineHeight: '24px',
  fontWeight: 800,
  fontStyle: 'italic',
  letterSpacing: '-0.03em',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 'clamp(28px, 6vw, 42px)',
  lineHeight: '0.92',
  fontWeight: 900,
  letterSpacing: '-0.05em',
  textAlign: 'center',
  textTransform: 'uppercase',
  color: '#111111',
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  lineHeight: '16px',
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  textAlign: 'center',
  color: '#7A746D',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#FFFFFF',
  border: '1.5px solid #111111',
  boxShadow: '6px 6px 0 #111111',
  padding: '22px 18px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
};

const labelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 10,
  lineHeight: '14px',
  fontWeight: 800,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#111111',
};

const fieldStackStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid #111111',
  backgroundColor: '#F8F5F0',
  padding: '14px 12px',
  fontSize: 14,
  lineHeight: '20px',
  color: '#111111',
  outline: 'none',
  boxSizing: 'border-box',
};

const submitStyle: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid #111111',
  backgroundColor: '#111111',
  color: '#FFFFFF',
  padding: '14px 18px',
  fontSize: 13,
  lineHeight: '18px',
  fontWeight: 800,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const footerStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 9,
  lineHeight: '13px',
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  textAlign: 'center',
  color: '#A39A90',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  border: '1.5px solid #111111',
  backgroundColor: '#F7F2EA',
  padding: '4px 10px',
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: '#111111',
  alignSelf: 'center',
};

export default function AdminLoginPortal({ nextPath, loggedOut = false }: AdminLoginPortalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const text = await response.text();
        setError(text || 'Sign-in failed. Please check your credentials.');
        return;
      }

      const data = (await response.json()) as LoginApiResponse;
      const decoded = getUserFromToken(data.accessToken);
      const role = decoded?.role ?? data.role;

      if (role !== 'ADMIN') {
        setError('This portal is for admin accounts only.');
        return;
      }

      setTokenCookie(data.accessToken, data.expiresInSeconds ?? 86400);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      const safeNext = nextPath && nextPath.startsWith('/') ? nextPath : null;
      router.push(safeNext ?? '/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={wrapperStyle}>
        <div style={plaqueStyle}>Preventia</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={titleStyle}>Admin Sign In</h1>
          <p style={subtitleStyle}>Internal access only</p>
        </div>

        <span style={badgeStyle}>Admin Portal</span>

        <form style={cardStyle} onSubmit={handleSubmit}>
          <div style={fieldStackStyle}>
            <label htmlFor="email" style={labelStyle}>Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@preventia.com"
              style={inputStyle}
            />
          </div>

          <div style={fieldStackStyle}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              style={{
                border: '1.5px solid #111111',
                backgroundColor: '#FFF0EC',
                padding: '12px',
                fontSize: 12,
                lineHeight: '18px',
                color: '#111111',
              }}
            >
              {error}
            </div>
          )}

          {!error && loggedOut && (
            <div
              style={{
                border: '1.5px solid #111111',
                backgroundColor: '#EFF6E8',
                padding: '12px',
                fontSize: 12,
                lineHeight: '18px',
                color: '#111111',
              }}
            >
              You have been signed out.
            </div>
          )}

          <button
            type="submit"
            style={{ ...submitStyle, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <a
              href="/"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#7A746D',
                textDecoration: 'underline',
              }}
            >
              ← Patient / Provider login
            </a>
          </div>
        </form>

        <p style={footerStyle}>Preventia security protocol v1.2 • End-to-end encrypted</p>
      </div>
    </div>
  );
}
