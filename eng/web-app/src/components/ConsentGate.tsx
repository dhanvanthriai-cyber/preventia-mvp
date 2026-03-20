'use client';
/**
 * ConsentGate.tsx — Consent gate before video consultation join.
 *
 * On mount, checks GET /api/v1/consent/check?appointmentId={id}.
 * If consent is required, shows a simple form before revealing children.
 * If already consented, renders children immediately.
 */
import React, { useEffect, useState } from 'react';
import { getTokenFromCookie } from '@/lib/auth';

interface Props {
  readonly appointmentId: number;
  readonly children: React.ReactNode;
}

export default function ConsentGate({ appointmentId, children }: Props) {
  const [checked,          setChecked]          = useState(false);
  const [required,         setRequired]         = useState(false);
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [submitting,       setSubmitting]       = useState(false);
  const [error,            setError]            = useState<string | null>(null);

  // Check whether consent is required for this appointment
  useEffect(() => {
    const jwt = getTokenFromCookie();
    if (!jwt) { setChecked(true); setRequired(false); return; }

    fetch(`/api/v1/consent/check?appointmentId=${appointmentId}`, {
      headers: { Authorization: `Bearer ${jwt}` },
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() as Promise<{ required: boolean }> : Promise.reject(`HTTP ${res.status}`)))
      .then((data) => { setRequired(data.required); setChecked(true); })
      .catch(() => { setChecked(true); setRequired(false); }); // fail-open: let them in if check fails
  }, [appointmentId]);

  const handleConsent = async () => {
    const jwt = getTokenFromCookie();
    if (!jwt) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        credentials: 'include',
        body: JSON.stringify({ appointmentId, recordingConsent }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRequired(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record consent. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Still checking
  if (!checked) {
    return (
      <div style={styles.root}>
        <p style={styles.hint}>Checking consent status…</p>
      </div>
    );
  }

  // Already consented or check failed — show the consultation
  if (!required) {
    return <>{children}</>;
  }

  // Show consent form
  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <h2 style={styles.title}>Before you join</h2>
        <p style={styles.body}>
          By joining this teleconsultation, you consent to the session being conducted
          via video call and agree to our Privacy Policy and Terms of Service.
          Your health information will be handled in accordance with ABDM / HIPAA guidelines.
        </p>

        <label style={styles.checkRow}>
          <input
            type="checkbox"
            checked={recordingConsent}
            onChange={(e) => setRecordingConsent(e.target.checked)}
            style={{ marginRight: 10, width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={styles.checkLabel}>
            I consent to this session being recorded for quality and medical record purposes (optional).
          </span>
        </label>

        {error && <p style={styles.error}>{error}</p>}

        <button
          type="button"
          onClick={() => void handleConsent()}
          disabled={submitting}
          style={styles.consentBtn}
        >
          {submitting ? 'Saving…' : 'I Consent — Join Consultation'}
        </button>

        <p style={styles.hint}>
          You must consent to proceed. If you have questions, contact support before joining.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: 24,
    fontFamily: 'monospace',
    backgroundColor: '#FAFAFA',
  },
  card: {
    border: '3px solid #111',
    backgroundColor: '#fff',
    padding: 32,
    maxWidth: 560,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  title: {
    fontFamily: 'monospace',
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  body: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: '22px',
    margin: 0,
    color: '#333',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'flex-start',
    cursor: 'pointer',
    gap: 0,
  },
  checkLabel: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: '20px',
    color: '#333',
  },
  error: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#CC0000',
    margin: 0,
    border: '2px solid #CC0000',
    padding: '6px 10px',
  },
  consentBtn: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 700,
    backgroundColor: '#000',
    color: '#fff',
    border: '2px solid #111',
    padding: '12px 24px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hint: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#888',
    margin: 0,
    lineHeight: '18px',
  },
};
