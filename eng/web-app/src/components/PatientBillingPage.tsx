'use client';

import React, { useEffect, useState } from 'react';
import type { AuthUser } from '@preventia/shared';
import {
  pill,
  surface,
  textStyles,
  webTheme,
  pageShell,
  stack,
} from '@/lib/designSystem';

interface PaymentRecord {
  id: number;
  gateway: string;
  amountCents: number;
  currency: string;
  status: string;
  paymentType: string;
  createdAt: string;
}

type FilterType = 'ALL' | 'CONSULTATION' | 'MEDICATION' | 'LAB_ORDER';

interface Props {
  user: AuthUser;
}

const outlinedBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 16px',
  borderRadius: webTheme.radius.pill,
  backgroundColor: 'transparent',
  color: webTheme.colors.text,
  border: `1px solid ${webTheme.colors.borderStrong}`,
  fontFamily: webTheme.font.sans,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap' as const,
};

function statusTone(status: string): 'success' | 'gold' | 'rose' | 'neutral' {
  if (status === 'CAPTURED') return 'success';
  if (status === 'PENDING') return 'gold';
  if (status === 'FAILED') return 'rose';
  return 'neutral'; // REFUNDED
}

function formatAmount(cents: number, currency: string): string {
  if (!currency || currency === 'INR') {
    return `₹ ${(cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  }
  return `$ ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const filterOptions: FilterType[] = ['ALL', 'CONSULTATION', 'MEDICATION', 'LAB_ORDER'];

export default function PatientBillingPage({ user }: Readonly<Props>) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');

  useEffect(() => {
    fetch('/api/v1/patients/me/payments', {
      headers: { Authorization: `Bearer ${user.token}` },
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setPayments(data as PaymentRecord[]))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [user.token]);

  const currentYear = new Date().getFullYear();
  const ytdSpend = payments
    .filter(
      (p) =>
        p.status === 'CAPTURED' &&
        new Date(p.createdAt).getFullYear() === currentYear,
    )
    .reduce((sum, p) => sum + (p.amountCents ?? 0), 0);

  const filtered = filter === 'ALL'
    ? payments
    : payments.filter((p) => p.paymentType === filter);

  return (
    <div style={pageShell}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <a href="/patient/health" style={outlinedBtn}>← Back</a>
        <span style={{ ...textStyles.eyebrow }}>Billing & Financials</span>
      </div>

      <h1 style={{ ...textStyles.display, fontSize: 28, margin: '0 0 24px' }}>
        Financials
      </h1>

      {/* YTD Spend Card */}
      <div style={surface({ padding: 24, marginBottom: 24 })}>
        <span style={{ ...textStyles.eyebrow, display: 'block', marginBottom: 8 }}>
          Total Annual Spend (YTD {currentYear})
        </span>
        <span style={{ ...textStyles.display, fontSize: 36, margin: 0, display: 'block' }}>
          {loading ? '…' : formatAmount(ytdSpend, 'INR')}
        </span>
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {filterOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setFilter(opt)}
            style={{
              ...outlinedBtn,
              backgroundColor:
                filter === opt ? webTheme.colors.text : 'transparent',
              color: filter === opt ? '#fff' : webTheme.colors.text,
              borderColor:
                filter === opt ? webTheme.colors.text : webTheme.colors.borderStrong,
            }}
          >
            {opt.replace('_', ' ')}
          </button>
        ))}

        {/* Download Statement — disabled */}
        <button
          type="button"
          disabled
          title="Coming soon"
          style={{ ...outlinedBtn, opacity: 0.6, marginLeft: 'auto' }}
        >
          Download Statement
        </button>
      </div>

      {loading && <p style={textStyles.muted}>Loading payments…</p>}

      {!loading && filtered.length === 0 && (
        <div style={surface({ padding: 32, textAlign: 'center' as const })}>
          <p style={{ ...textStyles.muted, margin: 0 }}>No payment records found.</p>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={surface({ padding: 0, overflow: 'hidden' })}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1.2fr 1fr 0.8fr 1fr 0.9fr',
            gap: 8,
            padding: '12px 20px',
            borderBottom: `1px solid ${webTheme.colors.border}`,
            backgroundColor: webTheme.colors.surfaceAlt,
          }}>
            {['Date', 'Type', 'Amount', 'Currency', 'Gateway', 'Status'].map((h) => (
              <span key={h} style={{ ...textStyles.eyebrow, fontSize: 10 }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1.2fr 1fr 0.8fr 1fr 0.9fr',
                gap: 8,
                padding: '14px 20px',
                borderBottom: `1px solid ${webTheme.colors.border}`,
                alignItems: 'center',
              }}
            >
              <span style={textStyles.muted}>{formatDate(p.createdAt)}</span>
              <span style={{ ...textStyles.label, fontSize: 12 }}>
                {(p.paymentType ?? '—').replace('_', ' ')}
              </span>
              <span style={{ ...textStyles.body, fontWeight: 600 }}>
                {formatAmount(p.amountCents, p.currency)}
              </span>
              <span style={textStyles.muted}>{p.currency ?? '—'}</span>
              <span style={textStyles.muted}>{p.gateway ?? '—'}</span>
              <span style={pill(statusTone(p.status))}>{p.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
