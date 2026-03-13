'use client';
/**
 * BookAppointmentForm.tsx — Web version of BookAppointmentScreen (mobile)
 * Project Dhanvanthri | Neo-Brutalist UI
 *
 * POST /api/v1/appointments → show confirmation + Stripe stub message
 */
import React, { FormEvent, useState } from 'react';
import { getTokenFromCookie } from '../lib/auth';

interface AppointmentResult {
  id: number;
  dailyRoomUrl: string;
  sponsorToken?: string;
  razorpayOrderId?: string;
  consultationFeeInPaise?: number;
}

export default function BookAppointmentForm() {
  const [recipientId,   setRecipientId]   = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [doctorId,      setDoctorId]      = useState('');
  const [doctorName,    setDoctorName]    = useState('');
  const [startTime,     setStartTime]     = useState('');
  const [endTime,       setEndTime]       = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [result,        setResult]        = useState<AppointmentResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = getTokenFromCookie();
      const res = await fetch('http://localhost:8080/api/v1/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipientId:   parseInt(recipientId, 10),
          recipientName: recipientName.trim(),
          doctorId:      parseInt(doctorId, 10),
          doctorName:    doctorName.trim(),
          startTime,
          endTime,
        }),
      });
      if (!res.ok) throw new Error(`Booking failed (HTTP ${res.status})`);
      const appt: AppointmentResult = await res.json();
      setResult(appt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div style={s.card}>
        <div style={s.successHeader}>
          <h2 style={s.successTitle}>✓ APPOINTMENT BOOKED</h2>
        </div>
        <div style={s.successBody}>
          <p style={s.successMeta}>Appointment #{result.id}</p>
          {result.dailyRoomUrl && (
            <p style={s.successMeta}>
              Room: <a href={result.dailyRoomUrl} target="_blank" rel="noreferrer" style={s.roomLink}>{result.dailyRoomUrl}</a>
            </p>
          )}
          {/* Stripe payment stub */}
          <div style={s.stripeBanner}>
            💳 Pay ₹{result.consultationFeeInPaise ? (result.consultationFeeInPaise / 100).toLocaleString('en-IN') : '—'} —{' '}
            <strong>Stripe integration coming soon</strong>
          </div>
          <a href="/sponsor" style={s.backBtn}>← BACK TO DASHBOARD</a>
        </div>
      </div>
    );
  }

  const fields = [
    { label: 'RECIPIENT ID', value: recipientId, set: setRecipientId, type: 'number', placeholder: 'e.g. 1' },
    { label: 'RECIPIENT NAME', value: recipientName, set: setRecipientName, placeholder: 'e.g. Meena Mehta' },
    { label: 'DOCTOR ID', value: doctorId, set: setDoctorId, type: 'number', placeholder: 'e.g. 5' },
    { label: 'DOCTOR NAME', value: doctorName, set: setDoctorName, placeholder: 'e.g. Dr. Priya Nair' },
    { label: 'START TIME', value: startTime, set: setStartTime, type: 'datetime-local' },
    { label: 'END TIME', value: endTime, set: setEndTime, type: 'datetime-local' },
  ];

  return (
    <div style={s.card}>
      <div style={s.header}>
        <h1 style={s.title}>BOOK CONSULTATION</h1>
        <p style={s.subtitle}>SPONSOR PORTAL</p>
      </div>

      {error && <div style={s.errorBanner}>⚠ {error}</div>}

      <form onSubmit={(e) => void handleSubmit(e)} style={s.form}>
        {fields.map(f => (
          <div key={f.label} style={s.fieldGroup}>
            <label style={s.label}>{f.label}</label>
            <input
              type={f.type ?? 'text'}
              value={f.value}
              onChange={ev => f.set(ev.target.value)}
              placeholder={f.placeholder}
              required
              style={s.input}
              disabled={loading}
            />
          </div>
        ))}
        <button type="submit" style={s.submitBtn} disabled={loading}>
          {loading ? 'BOOKING…' : 'BOOK APPOINTMENT'}
        </button>
      </form>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card:      { border: '3px solid #111', backgroundColor: '#fff', fontFamily: 'monospace', maxWidth: 560, margin: '0 auto' },
  header:    { backgroundColor: '#000', color: '#fff', padding: '20px 28px', borderBottom: '3px solid #111' },
  title:     { fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, margin: 0, color: '#fff', letterSpacing: 2 },
  subtitle:  { fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: '#aaa', margin: '4px 0 0 0', textTransform: 'uppercase' as const },
  errorBanner: { backgroundColor: '#FFF3CD', borderBottom: '2px solid #FFC107', padding: '10px 28px', fontFamily: 'monospace', fontSize: 12 },
  form:      { padding: '24px 28px' },
  fieldGroup: { marginBottom: 18 },
  label:     { display: 'block', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#000', marginBottom: 5, textTransform: 'uppercase' as const },
  input:     { display: 'block', width: '100%', boxSizing: 'border-box' as const, fontFamily: 'monospace', fontSize: 13, border: '2px solid #111', borderRadius: 0, padding: '9px 11px', backgroundColor: '#fff', color: '#000', outline: 'none' },
  submitBtn: { display: 'block', width: '100%', fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: 2, backgroundColor: '#000', color: '#fff', border: '2px solid #111', borderRadius: 0, padding: '12px', cursor: 'pointer', textTransform: 'uppercase' as const },
  successHeader: { backgroundColor: '#22C55E', padding: '16px 28px', borderBottom: '3px solid #111' },
  successTitle:  { fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' },
  successBody:   { padding: '20px 28px' },
  successMeta:   { fontFamily: 'monospace', fontSize: 12, color: '#555', margin: '0 0 8px 0' },
  roomLink:      { color: '#0047AB', fontFamily: 'monospace', fontSize: 12 },
  stripeBanner:  { border: '2px solid #635BFF', padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#333', backgroundColor: '#F4F3FF', margin: '12px 0' },
  backBtn:       { display: 'inline-block', marginTop: 8, backgroundColor: '#fff', color: '#000', border: '2px solid #111', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, padding: '6px 14px', textDecoration: 'none' },
};
