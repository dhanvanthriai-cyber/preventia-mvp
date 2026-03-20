'use client';

/**
 * AddFamilyMemberForm — matches member-registration.png wireframe.
 *
 * P360 design: all-caps labels, sharp borders (radius 0), monochromatic,
 * dashed photo upload zone, relationship pill chips (filled = selected).
 * On success → redirects to /patient/enroll.
 */

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RelationshipType } from '@preventia/shared';
import { getTokenFromCookie } from '@/lib/auth';

const FONT = '"Inter", "Outfit", system-ui, sans-serif';
const RELATIONSHIPS: RelationshipType[] = ['CHILD', 'PARENT', 'SPOUSE', 'OTHER'];

const INPUT: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid #111',
  borderRadius: 0,
  padding: '12px',
  fontSize: 13,
  fontFamily: FONT,
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
  color: '#111',
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: 7,
  color: '#111',
  fontFamily: FONT,
};

const chipStyle = (selected: boolean): React.CSSProperties => ({
  padding: '9px 18px',
  border: '1.5px solid #111',
  background: selected ? '#111' : '#fff',
  color: selected ? '#fff' : '#111',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: FONT,
  borderRadius: 0,
});

export default function AddFamilyMemberForm() {
  const router = useRouter();

  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [dob,          setDob]          = useState('');
  const [phone,        setPhone]        = useState('');
  const [email,        setEmail]        = useState('');
  const [address,      setAddress]      = useState('');
  const [relationship, setRelationship] = useState<RelationshipType>('CHILD');
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const token = getTokenFromCookie();
      const res = await fetch('/api/v1/family/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          firstName:   firstName.trim(),
          lastName:    lastName.trim(),
          dateOfBirth: dob     || undefined,
          phone:       phone   || undefined,
          email:       email   || undefined,
          address:     address || undefined,
          relationship,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `Server error: ${res.status}`);
      }
      router.push('/patient/enroll');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add family member.');
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT, color: '#111' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '20px 32px',
        borderBottom: '1.5px solid #111',
        display: 'flex',
        alignItems: 'center',
        gap: 18,
      }}>
        <button
          type="button"
          onClick={() => router.push('/patient')}
          style={{
            width: 36, height: 36,
            border: '1.5px solid #111', background: '#fff',
            fontSize: 17, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT, borderRadius: 0,
          }}
          aria-label="Back to family hub"
        >
          ←
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Add Family Member
          </h1>
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} style={{ maxWidth: 820, margin: '0 auto', padding: '36px 32px' }}>

        {error && (
          <div style={{
            border: '1.5px solid #C0392B', color: '#C0392B',
            padding: '12px 16px', marginBottom: 28,
            fontSize: 12, fontWeight: 600, letterSpacing: '0.05em',
          }}>
            {error}
          </div>
        )}

        {/* ── Photo + Name row ── */}
        <div style={{ display: 'flex', gap: 22, marginBottom: 22, alignItems: 'flex-start' }}>

          {/* Dashed photo upload zone */}
          <div style={{
            width: 110, minHeight: 110, flexShrink: 0,
            border: '1.5px dashed #111',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 8, cursor: 'pointer', padding: 12,
          }}>
            <span style={{ fontSize: 22 }}>📷</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', color: '#555' }}>
              Upload Photo
            </span>
          </div>

          {/* First + Last name (2-col) */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={LABEL} htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                style={INPUT}
                placeholder="e.g. John"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={LABEL} htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                style={INPUT}
                placeholder="e.g. Smith"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* ── DOB + Phone ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
          <div>
            <label style={LABEL} htmlFor="dob">Date of Birth</label>
            <input
              id="dob"
              type="date"
              style={INPUT}
              value={dob}
              onChange={e => setDob(e.target.value)}
            />
          </div>
          <div>
            <label style={LABEL} htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              style={INPUT}
              placeholder="+91 (555) 000-0000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
        </div>

        {/* ── Email ── */}
        <div style={{ marginBottom: 18 }}>
          <label style={LABEL} htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            style={INPUT}
            placeholder="member@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {/* ── Address ── */}
        <div style={{ marginBottom: 28 }}>
          <label style={LABEL} htmlFor="address">Home Address</label>
          <textarea
            id="address"
            style={{ ...INPUT, height: 88, resize: 'vertical' }}
            placeholder="Street, City, Zip Code"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
        </div>

        {/* ── Relationship chips ── */}
        <div style={{ marginBottom: 36 }}>
          <label style={LABEL}>Relationship</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {RELATIONSHIPS.map(r => (
              <button
                key={r}
                type="button"
                style={chipStyle(relationship === r)}
                onClick={() => setRelationship(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* ── Dashed divider ── */}
        <div style={{ borderTop: '1.5px dashed #111', marginBottom: 28 }} />

        {/* ── Actions ── */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              flex: 1,
              padding: '14px',
              background: submitting ? '#555' : '#111',
              color: '#fff',
              border: 'none',
              borderRadius: 0,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: FONT,
            }}
          >
            {submitting ? 'Creating…' : 'Create Profile'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/patient')}
            style={{
              padding: '14px 28px',
              background: '#fff',
              color: '#111',
              border: '1.5px solid #111',
              borderRadius: 0,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            Cancel
          </button>
        </div>

        {/* ── HIPAA footer ── */}
        <p style={{
          marginTop: 28, fontSize: 9, fontWeight: 600,
          letterSpacing: '0.07em', textTransform: 'uppercase',
          color: '#888', textAlign: 'center',
        }}>
          Family data is encrypted and managed under HIPAA privacy standards.
        </p>
      </form>
    </div>
  );
}
