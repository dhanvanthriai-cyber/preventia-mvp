'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clearToken, getDefaultRouteForRole, getUserFromToken, setTokenCookie } from '@/lib/auth';
import {
  divider,
  inputStyle,
  photoPlaceholder,
  softButton,
  surface,
  textStyles,
  webTheme,
} from '@/lib/designSystem';

interface LoginApiResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  role: string;
  refreshToken?: string;
}

type PortalRole = 'RECIPIENT' | 'DOCTOR' | 'PHARMACIST' | 'ADMIN';

const PORTALS: { role: PortalRole; label: string; icon: string; blurb: string }[] = [
  { role: 'RECIPIENT', label: 'Patient', icon: 'Care', blurb: 'Simple, analog-feeling guidance for appointments, medicines, and messages.' },
  { role: 'DOCTOR', label: 'Doctor', icon: 'Provider', blurb: 'Clinical rounds, notes, and consultations in a softer full-width shell.' },
  { role: 'PHARMACIST', label: 'Pharmacist', icon: 'Orders', blurb: 'Prescription work, approvals, and fulfillment without the harsh chrome.' },
];

const ADMIN_PORTAL = {
  role: 'ADMIN' as const,
  label: 'Admin',
  icon: 'Operations',
  blurb: 'Platform administration across users, clinical verification, video ops, and audit trails.',
};

const authShellStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '20px clamp(24px, 4vw, 56px)',
  display: 'grid',
  gap: 20,
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
};

const introSurfaceStyle: React.CSSProperties = surface({
  padding: 28,
  minHeight: 620,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: 24,
  background:
    'linear-gradient(180deg, rgba(255,252,248,0.96) 0%, rgba(244,239,231,0.96) 100%)',
});

const formSurfaceStyle: React.CSSProperties = surface({
  padding: 28,
  minHeight: 620,
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
});

const portalButtonStyle: React.CSSProperties = {
  ...surface({
    padding: 20,
    boxShadow: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
  }),
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const bannerStyle = (tone: 'success' | 'error'): React.CSSProperties => ({
  borderRadius: webTheme.radius.md,
  border: `1px solid ${
    tone === 'success' ? 'rgba(126, 154, 119, 0.2)' : 'rgba(199, 131, 117, 0.25)'
  }`,
  backgroundColor: tone === 'success' ? '#EDF5EA' : webTheme.colors.roseTint,
  padding: '12px 14px',
  ...textStyles.body,
  color: tone === 'success' ? webTheme.colors.success : webTheme.colors.rose,
});

const pictureCaptionStyle: React.CSSProperties = {
  position: 'absolute',
  left: 18,
  right: 18,
  bottom: 18,
  ...surface({
    borderRadius: webTheme.radius.md,
    padding: '14px 16px',
    boxShadow: 'none',
    backgroundColor: 'rgba(255, 252, 248, 0.78)',
    backdropFilter: 'blur(10px)',
  }),
};

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loggedOut = searchParams.get('logged_out') === '1';
  const roleParam = searchParams.get('role');
  const nextPath = searchParams.get('next');
  const initialPortal = roleParam === 'ADMIN'
    ? 'ADMIN'
    : PORTALS.find((item) => item.role === roleParam)?.role ?? null;

  const [selectedPortal, setSelectedPortal] = useState<PortalRole | null>(initialPortal);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(text || `Login failed (HTTP ${res.status})`);
        return;
      }

      const data = await res.json() as LoginApiResponse;

      clearToken();
      // Clear any stale cookies from previous project naming.
      document.cookie = 'dhanvanthri_token=; path=/; max-age=0; SameSite=Lax';

      setTokenCookie(data.accessToken, data.expiresInSeconds ?? 86400);

      const decoded = getUserFromToken(data.accessToken);
      const role = decoded?.role ?? data.role;
      const safeNext = nextPath && nextPath.startsWith('/') ? nextPath : null;
      router.push(safeNext ?? getDefaultRouteForRole(role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error — is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  const portal = selectedPortal === 'ADMIN'
    ? ADMIN_PORTAL
    : PORTALS.find((item) => item.role === selectedPortal) ?? PORTALS[0];

  return (
    <div style={authShellStyle}>
      <section style={introSurfaceStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span style={textStyles.eyebrow}>Preventia care portal</span>
          <h1 style={{ ...textStyles.display, margin: 0 }}>
            A calmer front door for family healthcare.
          </h1>
          <p style={{ ...textStyles.body, margin: 0, maxWidth: 520 }}>
            Preventia brings patients, doctors, and pharmacists into one calmer care experience,
            making appointments, medicines, and follow-ups easier to understand and act on.
          </p>
        </div>

        <div style={photoPlaceholder(300)}>
          <div
            style={{
              position: 'absolute',
              top: 26,
              right: 26,
              width: 140,
              height: 140,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.36)',
              filter: 'blur(10px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -12,
              left: -18,
              width: 220,
              height: 220,
              borderRadius: '50%',
              backgroundColor: 'rgba(135, 156, 131, 0.12)',
            }}
          />
          <div style={pictureCaptionStyle}>
            <div style={{ ...textStyles.label, marginBottom: 6 }}>Care at home</div>
            <div style={textStyles.muted}>
              A familiar home setting that reflects connected care, calmer follow-ups, and support
              that feels close at hand.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ ...textStyles.eyebrow, color: webTheme.colors.accentStrong }}>Care-first</span>
          <span style={{ ...textStyles.eyebrow, color: webTheme.colors.gold }}>Trusted guidance</span>
          <span style={{ ...textStyles.eyebrow, color: webTheme.colors.mutedText }}>Simple actions</span>
        </div>
      </section>

      {!selectedPortal ? (
        <section style={formSurfaceStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={textStyles.eyebrow}>Choose a portal</span>
            <h2 style={{ ...textStyles.title, fontSize: 28, lineHeight: '34px', margin: 0 }}>
              Which experience should we bring forward?
            </h2>
            <p style={{ ...textStyles.muted, margin: 0 }}>
              The role order now follows the current product scope: patient, doctor, pharmacist.
            </p>
          </div>

          {loggedOut && (
            <div style={bannerStyle('success')}>
              You have been signed out. Your next session starts from a calmer place.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PORTALS.map((item) => (
              <button
                key={item.role}
                type="button"
                style={portalButtonStyle}
                onClick={() => setSelectedPortal(item.role)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={textStyles.eyebrow}>{item.icon}</span>
                  <span style={{ ...textStyles.title, margin: 0 }}>{item.label}</span>
                  <span style={textStyles.muted}>{item.blurb}</span>
                </div>
                <span style={{ ...textStyles.label, color: webTheme.colors.mutedText }}>→</span>
              </button>
            ))}
          </div>

          <div style={divider} />

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={textStyles.muted}>New here?</span>
            <a href="/signup" style={softButton('secondary')}>
              Create an account
            </a>
          </div>
        </section>
      ) : (
        <section style={formSurfaceStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={textStyles.eyebrow}>Sign in</span>
            <h2 style={{ ...textStyles.title, fontSize: 30, lineHeight: '36px', margin: 0 }}>
              Welcome back to the {portal.label.toLowerCase()} view.
            </h2>
            <p style={{ ...textStyles.muted, margin: 0 }}>{portal.blurb}</p>
            <div
              style={{
                ...textStyles.label,
                display: 'inline-flex',
                alignSelf: 'flex-start',
                padding: '8px 12px',
                borderRadius: webTheme.radius.pill,
                backgroundColor: webTheme.colors.accentTint,
                color: webTheme.colors.accentStrong,
              }}
            >
              {portal.icon} · {portal.label}
            </div>
          </div>

          {error && <div style={bannerStyle('error')}>{error}</div>}

          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }} noValidate>
            <div style={fieldStyle}>
              <label htmlFor="email" style={textStyles.label}>Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="caregiver@example.com"
                style={inputStyle}
                disabled={loading}
              />
            </div>

            <div style={fieldStyle}>
              <label htmlFor="password" style={textStyles.label}>Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                style={inputStyle}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              style={{ ...softButton('accent'), width: '100%', borderRadius: webTheme.radius.md, padding: '14px 18px' }}
              disabled={loading}
            >
              {loading ? 'Signing in…' : `Continue as ${portal.label}`}
            </button>
          </form>

          <div style={divider} />

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={softButton('ghost')}
              onClick={() => {
                setSelectedPortal(null);
                setError(null);
              }}
            >
              ← Back to role selection
            </button>
            {portal.role === 'ADMIN' ? (
              <span style={textStyles.muted}>Admin accounts are provisioned internally.</span>
            ) : (
              <a href="/signup" style={softButton('secondary')}>
                Need an account?
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
