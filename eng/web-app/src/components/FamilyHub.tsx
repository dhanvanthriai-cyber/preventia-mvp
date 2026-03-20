'use client';

/**
 * FamilyHub — Post-login landing for RECIPIENT users.
 * Matches family-member.png wireframe: P360 brutalist-minimalist.
 *
 * Flow:
 *  - Shows primary account card + dependent family member cards
 *  - "ADD MEMBER +" dashed card → /patient/family/add
 *  - Clicking a member card → /patient/enroll?memberId={id}
 *  - "My Health" nav link → /patient/health (clinical dashboard)
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthUser, FamilyMember, FamilyMemberCareStatus } from '@preventia/shared';
import { getTokenFromCookie } from '@/lib/auth';

// ─── Design tokens (P360 brutalist) ──────────────────────────────────────────

const FONT = '"Inter", "Outfit", system-ui, sans-serif';

function badgeStyle(status: FamilyMemberCareStatus): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'inline-block',
    padding: '3px 10px',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontFamily: FONT,
  };
  switch (status) {
    case 'ACTIVE':       return { ...base, background: '#111111', color: '#ffffff' };
    case 'CARE_UPDATED': return { ...base, background: '#4A7C59', color: '#ffffff' };
    case 'PENDING_LAB':  return { ...base, background: '#C0392B', color: '#ffffff' };
    case 'UP_TO_DATE':   return { ...base, background: '#E0E0E0', color: '#333333' };
    default:             return { ...base, background: '#E0E0E0', color: '#333333' };
  }
}

function badgeLabel(status: FamilyMemberCareStatus): string {
  switch (status) {
    case 'ACTIVE':       return 'Active Profile';
    case 'CARE_UPDATED': return 'Care Updated';
    case 'PENDING_LAB':  return 'Pending Lab';
    case 'UP_TO_DATE':   return 'Up to Date';
  }
}

function ageFromDob(dob?: string): string {
  if (!dob) return '';
  const age = new Date().getFullYear() - new Date(dob).getFullYear();
  return `${age}Y`;
}

function relLabel(rel: string, dob?: string): string {
  const age = ageFromDob(dob);
  return age ? `${rel.charAt(0) + rel.slice(1).toLowerCase()} • ${age}` : rel.charAt(0) + rel.slice(1).toLowerCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props { user?: AuthUser; }

export default function FamilyHub({ user }: Props) {
  const router = useRouter();
  const [members,  setMembers]  = useState<FamilyMember[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [hovered,  setHovered]  = useState<string | null>(null);

  const firstName = user?.name?.split(' ')[0] ?? 'there';

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getTokenFromCookie();
      const res = await fetch('/api/v1/family/members', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setMembers(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load family members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  function logout() {
    document.cookie = 'preventia_token=; path=/; max-age=0; SameSite=Lax';
    router.push('/login');
  }

  const cardBase: React.CSSProperties = {
    border: '1.5px solid #111111',
    padding: '22px 18px',
    background: '#FFFFFF',
    cursor: 'pointer',
    minHeight: 160,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    fontFamily: FONT,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: FONT, color: '#111111' }}>

      {/* ── Nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', borderBottom: '1.5px solid #111111',
      }}>
        <span style={{
          background: '#111111', color: '#FFFFFF',
          fontWeight: 900, fontSize: 12, letterSpacing: '0.14em',
          textTransform: 'uppercase', padding: '6px 12px', fontFamily: FONT,
        }}>
          P360
        </span>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}
            onClick={() => router.push('/patient/health')}
          >
            My Health
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#777', cursor: 'pointer' }}>
            Account Settings
          </span>
          <span
            onClick={logout}
            onMouseEnter={() => setHovered('logout')}
            onMouseLeave={() => setHovered(null)}
            style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: 'pointer', padding: '6px 14px',
              border: '1.5px solid #111',
              background: hovered === 'logout' ? '#111' : '#fff',
              color: hovered === 'logout' ? '#fff' : '#111',
              transition: 'all 0.1s',
            }}
          >
            Log Out
          </span>
        </div>
      </nav>

      {/* ── Body ── */}
      <main style={{ padding: '44px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{
          margin: '0 0 6px', fontSize: 28, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '-0.01em',
        }}>
          Welcome Back, {firstName}
        </h1>
        <p style={{
          margin: '0 0 40px', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555555',
        }}>
          Select a family member to manage their care
        </p>

        {error && (
          <div style={{
            border: '1.5px solid #C0392B', color: '#C0392B',
            padding: '12px 16px', marginBottom: 28,
            fontSize: 12, fontWeight: 600, letterSpacing: '0.05em',
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#777' }}>
            Loading…
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 18,
          }}>
            {/* ── Primary account card ── */}
            <div
              style={{ ...cardBase, background: hovered === 'self' ? '#F5F5F5' : '#FFFFFF' }}
              onMouseEnter={() => setHovered('self')}
              onMouseLeave={() => setHovered(null)}
              onClick={() => router.push('/patient/health')}
            >
              <div style={{
                width: 50, height: 50, border: '1.5px solid #111', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 900, fontSize: 14, letterSpacing: '0.05em',
                background: '#F0F0F0', marginBottom: 14,
              }}>
                {user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('') ?? 'ME'}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                {user?.name ?? 'Primary Account'}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>
                Primary Account
              </div>
              <span style={badgeStyle('ACTIVE')}>Active Profile</span>
            </div>

            {/* ── Dependent member cards ── */}
            {members.map(m => (
              <div
                key={m.id}
                style={{ ...cardBase, background: hovered === String(m.id) ? '#F5F5F5' : '#FFFFFF' }}
                onMouseEnter={() => setHovered(String(m.id))}
                onMouseLeave={() => setHovered(null)}
                onClick={() => router.push(`/patient/enroll?memberId=${m.id}`)}
              >
                <div style={{
                  width: 50, height: 50, border: '1.5px solid #111', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: 14, letterSpacing: '0.05em',
                  background: '#F0F0F0', marginBottom: 14,
                }}>
                  {m.initials}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                  {m.fullName}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', marginBottom: 14 }}>
                  {relLabel(m.relationship, m.dateOfBirth)}
                </div>
                <span style={badgeStyle(m.careStatus)}>{badgeLabel(m.careStatus)}</span>
              </div>
            ))}

            {/* ── Add Member card (dashed) ── */}
            <div
              style={{
                border: '1.5px dashed #111111',
                padding: '22px 18px',
                minHeight: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                cursor: 'pointer',
                background: hovered === 'add' ? '#F5F5F5' : '#FFFFFF',
                fontFamily: FONT,
              }}
              onMouseEnter={() => setHovered('add')}
              onMouseLeave={() => setHovered(null)}
              onClick={() => router.push('/patient/family/add')}
            >
              <span style={{ fontSize: 32, fontWeight: 200, lineHeight: 1, color: '#111' }}>+</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Add Member
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
