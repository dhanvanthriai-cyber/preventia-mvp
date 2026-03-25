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

interface PrescriptionFile {
  index: number;
  filename: string;
  url: string;
}

interface PrescriptionRecord {
  appointmentId: number;
  files: PrescriptionFile[];
}

interface LabOrderEntry {
  id: number;
  testName: string;
  labPartner: string;
  status: string;
  resultUrl?: string;
  createdAt: string;
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

function labStatusTone(status: string): 'success' | 'gold' | 'neutral' | 'rose' {
  if (status === 'RESULTED') return 'success';
  if (status === 'SAMPLE_COLLECTED') return 'gold';
  if (status === 'ORDERED') return 'neutral';
  return 'rose';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PatientVaultPage({ user }: Readonly<Props>) {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${user.token}` };
    Promise.all([
      fetch('/api/v1/patients/me/prescription-records', { headers, credentials: 'include' })
        .then((r) => (r.ok ? r.json() : [])),
      fetch('/api/v1/patients/me/lab-orders', { headers, credentials: 'include' })
        .then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([presc, labs]) => {
        setPrescriptions(presc as PrescriptionRecord[]);
        setLabOrders(labs as LabOrderEntry[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.token]);

  const allPrescriptionFiles = prescriptions.flatMap((r) =>
    r.files.map((f) => ({ ...f, appointmentId: r.appointmentId })),
  );

  return (
    <div style={pageShell}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <a href="/patient/health" style={outlinedBtn}>← Back</a>
        <span style={{ ...textStyles.eyebrow }}>Health Vault</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ ...textStyles.display, fontSize: 28, margin: 0 }}>Vault</h1>
        <button
          type="button"
          disabled
          title="Coming soon"
          style={{ ...outlinedBtn, opacity: 0.6 }}
        >
          Upload Document
        </button>
      </div>

      {loading && <p style={textStyles.muted}>Loading records…</p>}

      {!loading && (
        <div style={stack(28)}>
          {/* Prescriptions section */}
          <section>
            <span style={{ ...textStyles.eyebrow, display: 'block', marginBottom: 14 }}>Prescriptions</span>

            {allPrescriptionFiles.length === 0 ? (
              <div style={surface({ padding: 24, textAlign: 'center' as const })}>
                <p style={{ ...textStyles.muted, margin: 0 }}>No prescription files on record.</p>
              </div>
            ) : (
              <div style={surface({ padding: 0, overflow: 'hidden' })}>
                {allPrescriptionFiles.map((file, i) => (
                  <div
                    key={`${file.appointmentId}-${file.index}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 20px',
                      borderBottom:
                        i < allPrescriptionFiles.length - 1
                          ? `1px solid ${webTheme.colors.border}`
                          : 'none',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ ...textStyles.label, fontSize: 13 }}>
                        {file.filename.toUpperCase()}
                      </span>
                      <span style={{ ...textStyles.muted, fontSize: 11 }}>
                        Appt #{file.appointmentId}
                      </span>
                    </div>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...textStyles.muted,
                        fontSize: 12,
                        color: webTheme.colors.accentStrong,
                        textDecoration: 'none',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase' as const,
                      }}
                    >
                      View →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Lab Reports section */}
          <section>
            <span style={{ ...textStyles.eyebrow, display: 'block', marginBottom: 14 }}>Lab Reports</span>

            {labOrders.length === 0 ? (
              <div style={surface({ padding: 24, textAlign: 'center' as const })}>
                <p style={{ ...textStyles.muted, margin: 0 }}>No lab orders on record.</p>
              </div>
            ) : (
              <div style={surface({ padding: 0, overflow: 'hidden' })}>
                {labOrders.map((order, i) => (
                  <div
                    key={order.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 20px',
                      borderBottom:
                        i < labOrders.length - 1
                          ? `1px solid ${webTheme.colors.border}`
                          : 'none',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ ...textStyles.label, fontSize: 13 }}>
                        {order.testName ?? `Order #${order.id}`}
                      </span>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ ...textStyles.muted, fontSize: 11 }}>
                          {order.labPartner ?? '—'} · {formatDate(order.createdAt)}
                        </span>
                        <span style={pill(labStatusTone(order.status))}>{order.status}</span>
                      </div>
                    </div>

                    {order.resultUrl ? (
                      <a
                        href={order.resultUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...textStyles.muted,
                          fontSize: 12,
                          color: webTheme.colors.accentStrong,
                          textDecoration: 'none',
                          fontWeight: 600,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase' as const,
                        }}
                      >
                        View →
                      </a>
                    ) : (
                      <span style={{ ...textStyles.muted, fontSize: 11, opacity: 0.6 }}>
                        Pending result
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
