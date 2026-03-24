'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { getDefaultRouteForRole, getUserFromToken, setTokenCookie } from '@/lib/auth';

interface LoginApiResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  role: string;
  refreshToken?: string;
}

interface RegisterApiResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  role: string;
  refreshToken?: string;
}

type AuthMode = 'register' | 'login';
type PortalRole = 'RECIPIENT' | 'DOCTOR' | 'PHARMACIST' | 'ADMIN';
type SocialProvider = 'google' | 'apple';

interface LandingAuthPortalProps {
  googleClientId?: string;
  appleClientId?: string;
  appleRedirectUri?: string;
  initialMode?: AuthMode;
  initialRole?: PortalRole;
  nextPath?: string | null;
  loggedOut?: boolean;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsIdApi {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    cancel_on_tap_outside?: boolean;
    auto_select?: boolean;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}

interface AppleSignInResponse {
  authorization?: {
    id_token?: string;
  };
  user?: {
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsIdApi;
      };
    };
    AppleID?: {
      auth: {
        init: (options: {
          clientId: string;
          scope: string;
          redirectURI: string;
          state: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<AppleSignInResponse>;
      };
    };
  }
}

const ROLE_OPTIONS: { role: PortalRole; label: string }[] = [
  { role: 'RECIPIENT', label: 'Patient' },
  { role: 'DOCTOR', label: 'Doctor' },
  { role: 'PHARMACIST', label: 'Pharmacist' },
  { role: 'ADMIN', label: 'Admin' },
];

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
  maxWidth: 440,
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
  fontSize: 'clamp(34px, 7vw, 50px)',
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

const roleGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  border: '1.5px solid #111111',
};

const fieldGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 12,
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
};

const termsRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
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

const dividerRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  alignItems: 'center',
  gap: 10,
};

const socialGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12,
};

const socialButtonStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  border: '1.5px solid #111111',
  backgroundColor: '#FFFFFF',
  padding: '12px 14px',
  fontSize: 12,
  lineHeight: '16px',
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const socialMountStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const configNoteStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 10,
  lineHeight: '15px',
  color: '#6E665C',
  textAlign: 'center',
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

export default function LandingAuthPortal({
  googleClientId,
  appleClientId,
  appleRedirectUri,
  initialMode = 'register',
  initialRole = 'RECIPIENT',
  nextPath,
  loggedOut = false,
}: LandingAuthPortalProps) {
  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [selectedRole, setSelectedRole] = useState<PortalRole>(initialRole);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [appleReady, setAppleReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleEnabled = Boolean(googleClientId);
  const appleEnabled = Boolean(appleClientId && appleRedirectUri);

  async function completeAuth(response: LoginApiResponse | RegisterApiResponse) {
    setTokenCookie(response.accessToken, response.expiresInSeconds ?? 86400);
    const decoded = getUserFromToken(response.accessToken);
    const role = decoded?.role ?? response.role;
    const safeNext = nextPath && nextPath.startsWith('/') ? nextPath : null;
    router.push(safeNext ?? getDefaultRouteForRole(role));
  }

  async function submitSocialLogin(
    provider: SocialProvider,
    payload: { idToken: string; firstName?: string; lastName?: string },
  ) {
    setError(null);
    setSocialLoading(provider);

    try {
      const response = await fetch(`/api/v1/auth/social/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: payload.idToken,
          role: selectedRole,
          firstName: payload.firstName ?? null,
          lastName: payload.lastName ?? null,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        setError(text || `${provider === 'google' ? 'Google' : 'Apple'} sign-in failed.`);
        return;
      }

      const data = (await response.json()) as LoginApiResponse | RegisterApiResponse;
      await completeAuth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Social sign-in failed. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  }

  useEffect(() => {
    if (!googleReady || !googleEnabled || !googleClientId || !googleButtonRef.current || !window.google?.accounts?.id) {
      return;
    }

    googleButtonRef.current.innerHTML = '';
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response) => {
        if (mode === 'register' && !acceptedTerms) {
          setError('Please accept the terms to continue with Google.');
          return;
        }
        if (!response.credential) {
          setError('Google did not return a valid identity token.');
          return;
        }
        void submitSocialLogin('google', { idToken: response.credential });
      },
      cancel_on_tap_outside: true,
      auto_select: false,
    });

    window.google.accounts.id.renderButton(googleButtonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: mode === 'register' ? 'signup_with' : 'signin_with',
      width: 182,
      logo_alignment: 'left',
    });
  }, [acceptedTerms, googleClientId, googleEnabled, googleReady, mode, selectedRole]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please complete the required fields.');
      return;
    }

    if (mode === 'register') {
      if (!firstName.trim() || !lastName.trim()) {
        setError('Please enter your first and last name.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (!acceptedTerms) {
        setError('Please accept the terms to create your account.');
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch(
        mode === 'register' ? '/api/v1/auth/register' : '/api/v1/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            mode === 'register'
              ? {
                  name: `${firstName.trim()} ${lastName.trim()}`.trim(),
                  email: email.trim(),
                  password,
                  role: selectedRole,
                }
              : {
                  email: email.trim(),
                  password,
                },
          ),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        if (mode === 'register' && response.status === 409) {
          setError('This email is already registered. Please sign in instead.');
          return;
        }
        setError(text || `${mode === 'register' ? 'Registration' : 'Login'} failed.`);
        return;
      }

      const data = (await response.json()) as LoginApiResponse | RegisterApiResponse;
      await completeAuth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    if (mode === 'register' && !acceptedTerms) {
      setError('Please accept the terms to continue with Apple.');
      return;
    }
    if (!appleEnabled || !appleClientId || !appleRedirectUri) {
      setError('Apple sign-in is not configured yet.');
      return;
    }
    if (!window.AppleID?.auth || !appleReady) {
      setError('Apple sign-in is still loading. Please try again.');
      return;
    }

    setError(null);
    setSocialLoading('apple');

    try {
      window.AppleID.auth.init({
        clientId: appleClientId,
        scope: 'name email',
        redirectURI: appleRedirectUri,
        state: createEphemeralToken(),
        usePopup: true,
      });

      const result = await window.AppleID.auth.signIn();
      const idToken = result.authorization?.id_token;
      if (!idToken) {
        setError('Apple did not return a valid identity token.');
        return;
      }

      await submitSocialLogin('apple', {
        idToken,
        firstName: result.user?.name?.firstName,
        lastName: result.user?.name?.lastName,
      });
    } catch (err) {
      setSocialLoading(null);
      setError(err instanceof Error ? err.message : 'Apple sign-in failed. Please try again.');
    }
  }

  const showConfigNote = !googleEnabled || !appleEnabled;

  return (
    <div style={pageStyle}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleReady(true)}
        onError={() => setError('Google sign-in failed to load in this browser session.')}
      />
      <Script
        src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
        strategy="afterInteractive"
        onLoad={() => setAppleReady(true)}
        onError={() => setError('Apple sign-in failed to load in this browser session.')}
      />

      <div style={wrapperStyle}>
        <div style={plaqueStyle}>Preventia</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={titleStyle}>{mode === 'register' ? 'Join Preventia' : 'Welcome Back'}</h1>
          <p style={subtitleStyle}>
            {mode === 'register'
              ? 'Start your proactive care journey'
              : 'Sign in to continue your care journey'}
          </p>
        </div>

        <form style={cardStyle} onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={labelStyle}>I am a...</p>
            <div style={roleGridStyle}>
              {ROLE_OPTIONS.map((option, index) => {
                const active = selectedRole === option.role;
                return (
                  <button
                    key={option.role}
                    type="button"
                    style={{
                      border: 'none',
                      borderLeft: index === 0 ? 'none' : '1.5px solid #111111',
                      backgroundColor: active ? '#111111' : '#FFFFFF',
                      color: active ? '#FFFFFF' : '#111111',
                      padding: '10px 8px',
                      fontSize: 10,
                      lineHeight: '14px',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedRole(option.role)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {mode === 'register' && selectedRole === 'ADMIN' && (
            <p style={{ ...labelStyle, color: '#7A746D', textAlign: 'center' }}>
              Admin accounts are provisioned internally. Please sign in instead.
            </p>
          )}

          {mode === 'register' && selectedRole !== 'ADMIN' && (
            <div style={fieldGridStyle}>
              <div style={fieldStackStyle}>
                <label htmlFor="firstName" style={labelStyle}>First Name</label>
                <input
                  id="firstName"
                  name="firstName"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Jane"
                  style={inputStyle}
                />
              </div>
              <div style={fieldStackStyle}>
                <label htmlFor="lastName" style={labelStyle}>Last Name</label>
                <input
                  id="lastName"
                  name="lastName"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Doe"
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          <div style={fieldStackStyle}>
            <label htmlFor="email" style={labelStyle}>Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="jane@example.com"
              style={inputStyle}
            />
          </div>

          <div style={fieldStackStyle}>
            <label htmlFor="password" style={labelStyle}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {mode === 'register' && (
            <label style={termsRowStyle}>
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span
                style={{
                  fontSize: 9,
                  lineHeight: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#111111',
                }}
              >
                I agree to the <span style={{ textDecoration: 'underline' }}>terms of service</span> and{' '}
                <span style={{ textDecoration: 'underline' }}>privacy policy</span>.
              </span>
            </label>
          )}

          {error && (
            <div
              style={{
                border: '1.5px solid #111111',
                backgroundColor: '#FFF0EC',
                padding: '12px 12px',
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
                padding: '12px 12px',
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
            style={{ ...submitStyle, opacity: loading || socialLoading ? 0.7 : 1 }}
            disabled={loading || socialLoading !== null}
          >
            {loading
              ? mode === 'register'
                ? 'Creating Account...'
                : 'Signing In...'
              : mode === 'register'
                ? 'Create My Account'
                : 'Log In'}
          </button>

          <div style={dividerRowStyle}>
            <div style={{ height: 1, backgroundColor: '#111111' }} />
            <span style={{ ...labelStyle, fontSize: 9, lineHeight: '12px' }}>
              {mode === 'register' ? 'Or sign up with' : 'Or sign in with'}
            </span>
            <div style={{ height: 1, backgroundColor: '#111111' }} />
          </div>

          <div style={socialGridStyle}>
            <div style={socialMountStyle}>
              {googleEnabled ? (
                googleReady ? (
                  <div ref={googleButtonRef} />
                ) : (
                  <button type="button" style={{ ...socialButtonStyle, cursor: 'not-allowed', opacity: 0.72 }} disabled>
                    Loading Google
                  </button>
                )
              ) : (
                <button type="button" style={{ ...socialButtonStyle, cursor: 'not-allowed', opacity: 0.72 }} disabled>
                  Google Unavailable
                </button>
              )}
            </div>
            <button
              type="button"
              style={{
                ...socialButtonStyle,
                cursor: appleEnabled && appleReady && !loading && socialLoading === null ? 'pointer' : 'not-allowed',
                opacity: appleEnabled && appleReady && !loading ? 1 : 0.72,
              }}
              onClick={() => void handleAppleSignIn()}
              disabled={!appleEnabled || !appleReady || loading || socialLoading !== null}
            >
              {socialLoading === 'apple' ? 'Connecting...' : 'Apple'}
            </button>
          </div>

          {showConfigNote && (
            <p style={configNoteStyle}>
              Set `GOOGLE_CLIENT_ID`, `APPLE_CLIENT_ID`, and `APPLE_REDIRECT_URI` to enable both social providers.
              Apple also requires a registered HTTPS redirect URL in the Apple developer console.
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode((current) => (current === 'register' ? 'login' : 'register'));
              }}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: 10,
                lineHeight: '14px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#111111',
                textDecoration: 'underline',
              }}
            >
              {mode === 'register'
                ? 'Already have an account? Log in'
                : 'Need an account? Create one'}
            </button>
          </div>
        </form>

        <p style={footerStyle}>Preventia security protocol v1.2 • End-to-end encrypted</p>
      </div>
    </div>
  );
}

function createEphemeralToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `preventia-${Math.random().toString(36).slice(2, 14)}`;
}
