'use client';

import React, { FormEvent, useState } from 'react';
import { getTokenFromCookie } from '../lib/auth';
import {
  divider,
  inputStyle,
  photoPlaceholder,
  softButton,
  surface,
  textStyles,
  webTheme,
} from '@/lib/designSystem';

interface AppointmentResult {
  id: number;
  dailyRoomUrl: string;
  sponsorToken?: string;
  razorpayOrderId?: string;
  consultationFeeInPaise?: number;
}

const shellStyle: React.CSSProperties = {
  display: 'grid',
  gap: 20,
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
};

const panelStyle: React.CSSProperties = surface({
  padding: 28,
  minHeight: 620,
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
});

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

export default function BookAppointmentForm() {
  const [recipientId, setRecipientId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AppointmentResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const token = getTokenFromCookie();
    if (!token) {
      setError('Your session has expired. Sign in again before booking the appointment.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: parseInt(recipientId, 10),
          recipientName: recipientName.trim(),
          doctorId: parseInt(doctorId, 10),
          doctorName: doctorName.trim(),
          startTime,
          endTime,
        }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('You are not authorized to book appointments with this session. Sign in again and retry.');
        }
        if (res.status === 403) {
          throw new Error('This account does not have permission to book appointments.');
        }
        throw new Error(`Booking failed (HTTP ${res.status})`);
      }
      setResult(await res.json() as AppointmentResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  }

  const fields = [
    { label: 'Recipient ID', value: recipientId, set: setRecipientId, type: 'number', placeholder: 'e.g. 1' },
    { label: 'Recipient name', value: recipientName, set: setRecipientName, placeholder: 'e.g. Meena Mehta' },
    { label: 'Doctor ID', value: doctorId, set: setDoctorId, type: 'number', placeholder: 'e.g. 5' },
    { label: 'Doctor name', value: doctorName, set: setDoctorName, placeholder: 'e.g. Dr. Priya Nair' },
    { label: 'Start time', value: startTime, set: setStartTime, type: 'datetime-local' },
    { label: 'End time', value: endTime, set: setEndTime, type: 'datetime-local' },
  ];

  if (result) {
    return (
      <div style={shellStyle}>
        <section style={panelStyle}>
          <span style={textStyles.eyebrow}>Consultation booked</span>
          <h1 style={{ ...textStyles.display, margin: 0, fontSize: 34, lineHeight: '40px' }}>
            The visit is now on the family calendar.
          </h1>
          <div
            style={{
              ...surface({
                padding: 18,
                backgroundColor: '#EDF5EA',
                borderColor: 'rgba(126, 154, 119, 0.2)',
                boxShadow: 'none',
              }),
            }}
          >
            <div style={{ ...textStyles.label, color: webTheme.colors.success, marginBottom: 8 }}>
              Appointment #{result.id}
            </div>
            {result.dailyRoomUrl ? (
              <div style={textStyles.body}>
                Consultation room:{' '}
                <a href={result.dailyRoomUrl} target="_blank" rel="noreferrer" style={{ color: webTheme.colors.accentStrong }}>
                  {result.dailyRoomUrl}
                </a>
              </div>
            ) : null}
          </div>

          <div
            style={{
              ...surface({
                padding: 18,
                backgroundColor: webTheme.colors.goldTint,
                borderColor: 'rgba(184, 154, 95, 0.18)',
                boxShadow: 'none',
              }),
            }}
          >
            <div style={{ ...textStyles.label, marginBottom: 8 }}>Payment</div>
            <div style={textStyles.body}>
              Pay ₹
              {result.consultationFeeInPaise
                ? (result.consultationFeeInPaise / 100).toLocaleString('en-IN')
                : '—'}
              {' '}once the premium checkout flow is ready.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="/sponsor" style={softButton('accent')}>
              Back to sponsor dashboard
            </a>
            <a href="/sponsor/book" style={softButton('secondary')}>
              Book another visit
            </a>
          </div>
        </section>

        <section style={panelStyle}>
          <div style={photoPlaceholder(340)}>
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
                left: 18,
                right: 18,
                bottom: 18,
                ...surface({
                  borderRadius: webTheme.radius.md,
                  padding: 16,
                  boxShadow: 'none',
                  backgroundColor: 'rgba(255, 252, 248, 0.78)',
                }),
              }}
            >
              <div style={{ ...textStyles.label, marginBottom: 6 }}>Care planning</div>
              <div style={textStyles.muted}>
                A calmer booking moment focused on family scheduling, clear timing, and reassuring care coordination.
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={shellStyle}>
      <section style={panelStyle}>
        <span style={textStyles.eyebrow}>Sponsor scheduling</span>
        <h1 style={{ ...textStyles.display, margin: 0, fontSize: 36, lineHeight: '42px' }}>
          Book a consultation without the clinical clutter.
        </h1>
        <p style={{ ...textStyles.body, margin: 0 }}>
          This flow now feels closer to a premium family planner than a hospital form.
        </p>

        <div style={photoPlaceholder(280)}>
          <div
            style={{
              position: 'absolute',
              left: 18,
              right: 18,
              bottom: 18,
              ...surface({
                borderRadius: webTheme.radius.md,
                padding: 16,
                boxShadow: 'none',
                backgroundColor: 'rgba(255, 252, 248, 0.78)',
              }),
            }}
          >
            <div style={{ ...textStyles.label, marginBottom: 6 }}>Care planning</div>
            <div style={textStyles.muted}>
              A family calendar and a calmer planning rhythm that keeps scheduling easy to follow.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <span style={{ ...textStyles.eyebrow, color: webTheme.colors.accentStrong }}>Rounded inputs</span>
          <span style={{ ...textStyles.eyebrow, color: webTheme.colors.gold }}>Soft depth shadows</span>
        </div>
      </section>

      <section style={panelStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={textStyles.eyebrow}>Visit details</span>
          <h2 style={{ ...textStyles.title, fontSize: 28, lineHeight: '34px', margin: 0 }}>
            Enter the appointment details.
          </h2>
        </div>

        {error ? (
          <div
            style={{
              borderRadius: webTheme.radius.md,
              backgroundColor: webTheme.colors.roseTint,
              border: '1px solid rgba(199, 131, 117, 0.22)',
              padding: '12px 14px',
              ...textStyles.body,
              color: webTheme.colors.rose,
            }}
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={(event) => void handleSubmit(event)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {fields.map((field) => (
            <div key={field.label} style={fieldStyle}>
              <label style={textStyles.label}>{field.label}</label>
              <input
                type={field.type ?? 'text'}
                value={field.value}
                onChange={(event) => field.set(event.target.value)}
                placeholder={field.placeholder}
                required
                style={inputStyle}
                disabled={loading}
              />
            </div>
          ))}

          <button
            type="submit"
            style={{ ...softButton('accent'), width: '100%', borderRadius: webTheme.radius.md, padding: '14px 18px' }}
            disabled={loading}
          >
            {loading ? 'Booking…' : 'Book appointment'}
          </button>
        </form>

        <div style={divider} />

        <a href="/sponsor" style={softButton('secondary')}>
          Back to dashboard
        </a>
      </section>
    </div>
  );
}
