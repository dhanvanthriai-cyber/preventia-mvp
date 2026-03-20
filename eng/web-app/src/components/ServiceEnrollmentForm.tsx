'use client';

/**
 * ServiceEnrollmentForm — matches service-enrollment.png wireframe.
 *
 * Two-column layout:
 *  LEFT  — Step 1: program cards (left blue accent = selected)
 *           Step 1b: dashed add-on cards
 *  RIGHT — Step 2: family member checkboxes (fetched from API)
 *           Enrollment summary card
 *  BOTTOM — sticky bar: ₹total + CONFIRM & PAY
 */

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FamilyMember } from '@preventia/shared';
import { getTokenFromCookie } from '@/lib/auth';

const FONT = '"Inter", "Outfit", system-ui, sans-serif';

// ─── Static program data (matches wireframe) ──────────────────────────────────

const PROGRAMS = [
  {
    id: 'BASIC_WELLNESS',
    number: '1',
    name: 'Basic Wellness Program',
    price: 1500,
    desc: 'Vision, Blood, Urine, Physical, Mental Screen + Virtual Consultation',
  },
  {
    id: 'FIT2FLY_360',
    number: '5',
    name: 'Fit2Fly 360 Program',
    price: 4999,
    desc: 'Complete Wellness + Global Virtual Consultation + Supplements',
  },
];

const ADDONS = [
  {
    id: 'VIRTUAL_CONSULT',
    name: 'Virtual Consultation',
    price: 999,
    unit: 'visit',
    desc: 'Video session with a primary care physician. No travelling fees.',
    cta: 'Book Now',
  },
  {
    id: 'SAHAYAK',
    name: 'Sahayak (Care Assistant)',
    price: 999,
    unit: 'day',
    desc: 'A care coordinator for lab booking, meals, and daily guidance.',
    cta: 'Assign for 24H',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ageStr(dob?: string): string {
  if (!dob) return '';
  return `${new Date().getFullYear() - new Date(dob).getFullYear()}Y`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ServiceEnrollmentForm() {
  const router     = useRouter();
  const params     = useSearchParams();
  const preId      = params.get('memberId');

  const [program,   setProgram]   = useState('BASIC_WELLNESS');
  const [addOns,    setAddOns]    = useState<Set<string>>(new Set());
  const [members,   setMembers]   = useState<FamilyMember[]>([]);
  const [selected,  setSelected]  = useState<Set<number>>(new Set());
  const [loading,   setLoading]   = useState(true);
  const [submitting,setSubmitting]= useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [done,      setDone]      = useState(false);
  const [hovered,   setHovered]   = useState<string | null>(null);

  // Fetch family members
  useEffect(() => {
    (async () => {
      try {
        const token = getTokenFromCookie();
        const res = await fetch('/api/v1/family/members', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data: FamilyMember[] = await res.json();
          setMembers(data);
          if (preId) {
            const n = parseInt(preId, 10);
            if (!isNaN(n)) setSelected(new Set([n]));
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [preId]);

  function toggleAddOn(id: string) {
    setAddOns(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleMember(id: number) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const progPrice  = PROGRAMS.find(p => p.id === program)?.price ?? 0;
  const addOnTotal = ADDONS.filter(a => addOns.has(a.id)).reduce((s, a) => s + a.price, 0);
  const total      = progPrice + addOnTotal;

  const progName     = PROGRAMS.find(p => p.id === program)?.name.split(' ').slice(0, 2).join(' ') ?? '';
  const addOnNames   = ADDONS.filter(a => addOns.has(a.id)).map(a => a.name);

  async function handleConfirm() {
    if (selected.size === 0) { setError('Please assign at least one family member.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await new Promise(r => setTimeout(r, 700)); // TODO: POST /api/v1/enroll
      setDone(true);
      setTimeout(() => router.push('/patient'), 2000);
    } catch {
      setError('Enrollment failed. Please try again.');
      setSubmitting(false);
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', fontFamily: FONT }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h2 style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Enrollment Confirmed
          </h2>
          <p style={{ fontSize: 11, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Returning to your family dashboard…
          </p>
        </div>
      </div>
    );
  }

  const SECTION_LABEL: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: '#555', display: 'block',
    marginBottom: 12, fontFamily: FONT,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', paddingBottom: 100, fontFamily: FONT, color: '#111' }}>

      {/* ── Header ── */}
      <div style={{ padding: '20px 32px', borderBottom: '1.5px solid #111', display: 'flex', alignItems: 'center', gap: 18 }}>
        <button
          type="button"
          onClick={() => router.push('/patient')}
          style={{ width: 36, height: 36, border: '1.5px solid #111', background: '#fff', fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, borderRadius: 0 }}
          aria-label="Back"
        >←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Service Enrollment
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 10, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Configure your family's care package
          </p>
        </div>
      </div>

      {error && (
        <div style={{ margin: '16px 32px', border: '1.5px solid #C0392B', color: '#C0392B', padding: '12px 16px', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>
          {error}
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32, padding: '32px 32px 0', maxWidth: 1100, margin: '0 auto' }}>

        {/* ── LEFT ── */}
        <div>

          {/* Step 1 — Programs */}
          <div style={{ marginBottom: 32 }}>
            <span style={SECTION_LABEL}>Step 1: Choose Wellness Program</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PROGRAMS.map(p => {
                const sel = program === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setProgram(p.id)}
                    style={{
                      border: '1.5px solid #111',
                      borderLeft: sel ? '5px solid #2563EB' : '1.5px solid #111',
                      padding: '16px 20px',
                      cursor: 'pointer',
                      background: sel ? '#F0F5FF' : '#fff',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
                      transition: 'all 0.1s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                        {p.number}. {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#555' }}>{p.desc}</div>
                    </div>
                    <div style={{ background: '#111', color: '#fff', padding: '4px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      ₹{p.price.toLocaleString('en-IN')}/mo
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 1b — Add-ons */}
          <div>
            <span style={SECTION_LABEL}>Step 1b: Add On-Demand Care</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ADDONS.map(a => {
                const active = addOns.has(a.id);
                return (
                  <div
                    key={a.id}
                    style={{
                      border: active ? '1.5px solid #111' : '1.5px dashed #111',
                      padding: '16px 20px',
                      background: active ? '#F5F5F5' : '#fff',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                        {a.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#555', marginBottom: 10 }}>{a.desc}</div>
                      <button
                        type="button"
                        onClick={() => toggleAddOn(a.id)}
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
                          textTransform: 'uppercase', color: '#111', textDecoration: 'underline',
                          fontFamily: FONT,
                        }}
                      >
                        {active ? '✓ Added' : a.cta}
                      </button>
                    </div>
                    <div style={{ background: '#111', color: '#fff', padding: '4px 10px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      ₹{a.price.toLocaleString('en-IN')}/{a.unit}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div>

          {/* Step 2 — Assign members */}
          <div style={{ marginBottom: 24 }}>
            <span style={SECTION_LABEL}>Step 2: Assign Members</span>
            {loading ? (
              <p style={{ fontSize: 11, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Loading…</p>
            ) : members.length === 0 ? (
              <p style={{ fontSize: 11, color: '#777' }}>No family members added yet.<br />
                <span
                  style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => router.push('/patient/family/add')}
                >
                  Add one →
                </span>
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {members.map(m => (
                  <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggleMember(m.id)}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#111' }}
                    />
                    <div style={{
                      width: 32, height: 32, border: '1.5px solid #111',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, background: '#F0F0F0', flexShrink: 0,
                    }}>
                      {m.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        {m.fullName}
                      </div>
                      <div style={{ fontSize: 9, color: '#777', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        {m.relationship}{ageStr(m.dateOfBirth) ? ` • ${ageStr(m.dateOfBirth)}` : ''}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Summary card */}
          <div style={{ border: '1.5px solid #111', padding: '18px', background: '#F9F9F9' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>
              Enrollment Summary
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Base Program</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'right', maxWidth: 130 }}>{progName}</span>
            </div>
            {addOnNames.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Add-ons</span>
                <span style={{ fontSize: 10, fontWeight: 700, textAlign: 'right', maxWidth: 130 }}>{addOnNames.join(', ')}</span>
              </div>
            )}
            {selected.size > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Members</span>
                <span style={{ fontSize: 10, fontWeight: 700 }}>{selected.size} assigned</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky bottom bar ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1.5px solid #111',
        padding: '14px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 100, fontFamily: FONT,
      }}>
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginBottom: 2 }}>
            Estimated Total
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em' }}>
            ₹{total.toLocaleString('en-IN')}
          </div>
        </div>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          onMouseEnter={() => setHovered('pay')}
          onMouseLeave={() => setHovered(null)}
          style={{
            background: submitting ? '#555' : hovered === 'pay' ? '#333' : '#111',
            color: '#fff',
            border: 'none',
            borderRadius: 0,
            padding: '14px 44px',
            fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase',
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontFamily: FONT,
            transition: 'background 0.1s',
          }}
        >
          {submitting ? 'Processing…' : 'Confirm & Pay →'}
        </button>
      </div>
    </div>
  );
}
