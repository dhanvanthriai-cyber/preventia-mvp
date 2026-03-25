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

interface MedicationRecord {
  id: number;
  drugName: string;
  totalQuantity: number;
  dailyDosage: number;
  unitPriceInr: number;
  daysRemaining: number;
  isRefillRequired: boolean;
  refillUrgency: string;
  updatedAt: string;
}

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

const blackFilledBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '9px 16px',
  borderRadius: webTheme.radius.pill,
  backgroundColor: '#111',
  color: '#fff',
  border: '1px solid #111',
  fontFamily: webTheme.font.sans,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap' as const,
};

function urgencyTone(urgency: string, daysRemaining: number): 'rose' | 'gold' | 'success' {
  if (urgency === 'CRITICAL' || daysRemaining <= 3) return 'rose';
  if (urgency === 'WARNING' || daysRemaining <= 7) return 'gold';
  return 'success';
}

function urgencyLabel(urgency: string, daysRemaining: number): string {
  if (urgency === 'CRITICAL' || daysRemaining <= 3) return 'CRITICAL';
  if (urgency === 'WARNING' || daysRemaining <= 7) return 'WARNING';
  return 'OK';
}

export default function PatientPharmacyPage({ user }: Readonly<Props>) {
  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refillStatus, setRefillStatus] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch('/api/v1/patients/me/medications', {
      headers: { Authorization: `Bearer ${user.token}` },
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setMedications(data as MedicationRecord[]))
      .catch(() => setMedications([]))
      .finally(() => setLoading(false));
  }, [user.token]);

  async function requestRefill(med: MedicationRecord) {
    setRefillStatus((prev) => ({ ...prev, [med.id]: 'loading' }));
    try {
      const res = await fetch('/api/v1/payments/razorpay/create-order', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          recipientId: user.userId,
          amountCents: Math.round((med.unitPriceInr ?? 0) * 100),
          currency: 'INR',
          paymentType: 'MEDICATION',
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { orderId?: string; id?: string };
        const orderId = data.orderId ?? data.id ?? 'unknown';
        setRefillStatus((prev) => ({
          ...prev,
          [med.id]: `Order created: ${orderId}`,
        }));
      } else {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        setRefillStatus((prev) => ({
          ...prev,
          [med.id]: `Error: ${err.message ?? res.status}`,
        }));
      }
    } catch (e) {
      setRefillStatus((prev) => ({
        ...prev,
        [med.id]: `Error: ${String(e)}`,
      }));
    }
  }

  return (
    <div style={pageShell}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <a href="/patient/health" style={outlinedBtn}>← Back</a>
        <span style={{ ...textStyles.eyebrow }}>Pharmacy</span>
      </div>

      <h1 style={{ ...textStyles.display, fontSize: 28, margin: '0 0 24px' }}>
        Medications
      </h1>

      {loading && <p style={textStyles.muted}>Loading medications…</p>}

      {!loading && medications.length === 0 && (
        <div style={surface({ padding: 32, textAlign: 'center' as const })}>
          <p style={{ ...textStyles.muted, margin: 0 }}>No medications on record.</p>
        </div>
      )}

      {!loading && medications.length > 0 && (
        <div style={stack(14)}>
          {medications.map((med) => {
            const tone = urgencyTone(med.refillUrgency, med.daysRemaining);
            const label = urgencyLabel(med.refillUrgency, med.daysRemaining);
            const status = refillStatus[med.id];

            return (
              <div
                key={med.id}
                style={surface({
                  padding: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 14,
                })}
              >
                {/* Drug info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 200px' }}>
                  <span style={{ ...textStyles.title, fontSize: 15 }}>{med.drugName}</span>
                  <span style={{ ...textStyles.muted, fontSize: 12 }}>
                    {med.dailyDosage} unit/day · {med.daysRemaining}d remaining
                  </span>
                  {med.unitPriceInr > 0 && (
                    <span style={{ ...textStyles.muted, fontSize: 11 }}>
                      ₹ {med.unitPriceInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / unit
                    </span>
                  )}
                </div>

                {/* Urgency badge + refill button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={pill(tone)}>{label}</span>

                  {status === 'loading' ? (
                    <span style={{ ...textStyles.muted, fontSize: 12 }}>Processing…</span>
                  ) : status ? (
                    <span
                      style={{
                        ...textStyles.muted,
                        fontSize: 12,
                        color: status.startsWith('Error')
                          ? webTheme.colors.rose
                          : webTheme.colors.success,
                        maxWidth: 240,
                      }}
                    >
                      {status}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void requestRefill(med)}
                      style={blackFilledBtn}
                    >
                      Request Refill
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
