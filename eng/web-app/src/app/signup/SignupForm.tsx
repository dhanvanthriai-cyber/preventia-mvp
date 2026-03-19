'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getDefaultRouteForRole, getUserFromToken, setTokenCookie } from '@/lib/auth';
import {
  divider,
  inputStyle,
  photoPlaceholder,
  softButton,
  surface,
  textStyles,
  webTheme,
} from '@/lib/designSystem';

interface RegisterApiResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  role: string;
  refreshToken?: string;
}

type PortalRole = 'RECIPIENT' | 'DOCTOR' | 'PHARMACIST';

const ROLES: { role: PortalRole; label: string; icon: string; desc: string }[] = [
  { role: 'RECIPIENT', label: 'Patient', icon: 'Care', desc: 'For the patient who needs an easier, calmer daily interface.' },
  { role: 'DOCTOR', label: 'Doctor', icon: 'Provider', desc: 'For clinicians managing consultations, notes, and care plans.' },
  { role: 'PHARMACIST', label: 'Pharmacist', icon: 'Dispense', desc: 'For teams processing prescriptions and medication fulfillment.' },
];

const shellStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '20px clamp(24px, 4vw, 56px)',
  display: 'grid',
  gap: 20,
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
};

const panelStyle: React.CSSProperties = surface({
  padding: 28,
  minHeight: 660,
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
});

const roleButtonStyle: React.CSSProperties = {
  ...surface({
    padding: 18,
    cursor: 'pointer',
    boxShadow: 'none',
  }),
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 14,
  textAlign: 'left',
  width: '100%',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const bannerStyle = (tone: 'error' | 'success'): React.CSSProperties => ({
  borderRadius: webTheme.radius.md,
  padding: '12px 14px',
  backgroundColor: tone === 'success' ? '#EDF5EA' : webTheme.colors.roseTint,
  border: `1px solid ${
    tone === 'success' ? 'rgba(126, 154, 119, 0.2)' : 'rgba(199, 131, 117, 0.22)'
  }`,
  ...textStyles.body,
  color: tone === 'success' ? webTheme.colors.success : webTheme.colors.rose,
});

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const initialRole = ROLES.find((item) => item.role === roleParam)?.role ?? null;

  const [selectedRole, setSelectedRole] = useState<PortalRole | null>(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role: selectedRole,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 409) {
          setError('This email is already registered. Please sign in instead.');
        } else {
          setError(text || `Registration failed (HTTP ${res.status})`);
        }
        return;
      }

      const data = await res.json() as RegisterApiResponse;
      setTokenCookie(data.accessToken, data.expiresInSeconds ?? 86400);
      const decoded = getUserFromToken(data.accessToken);
      const role = decoded?.role ?? data.role;

      setSuccess(true);
      setTimeout(() => {
        router.push(getDefaultRouteForRole(role));
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error — is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  const roleInfo = ROLES.find((role) => role.role === selectedRole) ?? ROLES[0];

  return (
    <div style={shellStyle}>
      <section style={panelStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={textStyles.eyebrow}>Create an account</span>
          <h1 style={{ ...textStyles.display, margin: 0 }}>
            Bring the softer experience to the right role.
          </h1>
          <p style={{ ...textStyles.body, margin: 0 }}>
            This redesign leans into warmth, rounded surfaces, and lifestyle imagery instead of
            stark clinical panels.
          </p>
        </div>

        <div style={photoPlaceholder(300)}>
          <div
            style={{
              position: 'absolute',
              inset: 18,
              borderRadius: webTheme.radius.lg,
              border: '1px solid rgba(255,255,255,0.55)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 18,
              top: 18,
              width: 92,
              height: 92,
              borderRadius: webTheme.radius.lg,
              backgroundColor: 'rgba(255,255,255,0.34)',
              backdropFilter: 'blur(8px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 18,
              right: 18,
              bottom: 18,
              ...surface({
                borderRadius: webTheme.radius.md,
                padding: '16px',
                boxShadow: 'none',
                backgroundColor: 'rgba(255, 252, 248, 0.76)',
                backdropFilter: 'blur(10px)',
              }),
            }}
          >
            <div style={{ ...textStyles.label, marginBottom: 6 }}>Care at home</div>
            <div style={textStyles.muted}>
              A familiar home setting that reflects connected care, clearer next steps, and everyday support.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ ...textStyles.eyebrow, color: webTheme.colors.accentStrong }}>Care-first</span>
          <span style={{ ...textStyles.eyebrow, color: webTheme.colors.gold }}>Trusted guidance</span>
          <span style={{ ...textStyles.eyebrow, color: webTheme.colors.mutedText }}>Clear actions</span>
        </div>
      </section>

      {!selectedRole ? (
        <section style={panelStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={textStyles.eyebrow}>Pick a role</span>
            <h2 style={{ ...textStyles.title, fontSize: 28, lineHeight: '34px', margin: 0 }}>
              Choose the view you want to enter.
            </h2>
            <p style={{ ...textStyles.muted, margin: 0 }}>
              The available roles now focus on patient, doctor, and pharmacist experiences only.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ROLES.map((role) => (
              <button
                key={role.role}
                type="button"
                style={roleButtonStyle}
                onClick={() => setSelectedRole(role.role)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={textStyles.eyebrow}>{role.icon}</span>
                  <span style={textStyles.title}>{role.label}</span>
                  <span style={textStyles.muted}>{role.desc}</span>
                </div>
                <span style={{ ...textStyles.label, color: webTheme.colors.mutedText }}>→</span>
              </button>
            ))}
          </div>

          <div style={divider} />

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={textStyles.muted}>Already have an account?</span>
            <a href="/login" style={softButton('secondary')}>
              Sign in
            </a>
          </div>
        </section>
      ) : success ? (
        <section style={panelStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={textStyles.eyebrow}>Account created</span>
            <h2 style={{ ...textStyles.title, fontSize: 30, lineHeight: '36px', margin: 0 }}>
              Welcome, {name || 'there'}.
            </h2>
            <div style={bannerStyle('success')}>
              Your {roleInfo.label.toLowerCase()} portal is being prepared now.
            </div>
          </div>
        </section>
      ) : (
        <section style={panelStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={textStyles.eyebrow}>Registration</span>
            <h2 style={{ ...textStyles.title, fontSize: 30, lineHeight: '36px', margin: 0 }}>
              Set up the {roleInfo.label.toLowerCase()} experience.
            </h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 14px',
                borderRadius: webTheme.radius.md,
                backgroundColor: webTheme.colors.surfaceAlt,
                border: `1px solid ${webTheme.colors.border}`,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={textStyles.label}>{roleInfo.label}</span>
                <span style={textStyles.muted}>{roleInfo.desc}</span>
              </div>
              <button
                type="button"
                style={softButton('secondary')}
                onClick={() => {
                  setSelectedRole(null);
                  setError(null);
                }}
              >
                Change
              </button>
            </div>
          </div>

          {error && <div style={bannerStyle('error')}>{error}</div>}

          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }} noValidate>
            <div style={fieldStyle}>
              <label htmlFor="name" style={textStyles.label}>Full name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoComplete="name"
                placeholder="Jane Doe"
                style={inputStyle}
                disabled={loading}
              />
            </div>

            <div style={fieldStyle}>
              <label htmlFor="email" style={textStyles.label}>Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
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
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                style={inputStyle}
                disabled={loading}
              />
            </div>

            <div style={fieldStyle}>
              <label htmlFor="confirm" style={textStyles.label}>Confirm password</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
                autoComplete="new-password"
                placeholder="Re-enter password"
                style={{
                  ...inputStyle,
                  borderColor:
                    confirm && confirm !== password ? 'rgba(199, 131, 117, 0.5)' : webTheme.colors.borderStrong,
                }}
                disabled={loading}
              />
              {confirm && confirm !== password ? (
                <span style={{ ...textStyles.muted, color: webTheme.colors.rose }}>
                  Passwords do not match.
                </span>
              ) : null}
            </div>

            <button
              type="submit"
              style={{ ...softButton('accent'), width: '100%', borderRadius: webTheme.radius.md, padding: '14px 18px' }}
              disabled={loading || (!!confirm && confirm !== password)}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div style={divider} />

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span style={textStyles.muted}>Already registered?</span>
            <a href="/login" style={softButton('secondary')}>
              Sign in
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
