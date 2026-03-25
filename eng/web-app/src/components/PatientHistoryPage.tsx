'use client';

import React, { useEffect, useState } from 'react';
import type { AuthUser } from '@preventia/shared';
import {
  pill,
  softButton,
  surface,
  textStyles,
  webTheme,
  pageShell,
  stack,
} from '@/lib/designSystem';

interface PrescriptionFile {
  filename: string;
  url: string;
}

interface ConsultationEntry {
  appointmentId: number;
  doctorId: number;
  doctorName?: string;
  startTime: string;
  endTime: string;
  status: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  prescriptionS3Key?: string;
  prescriptionFiles?: PrescriptionFile[];
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

function statusTone(status: string): 'success' | 'neutral' | 'gold' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'LOCKED') return 'gold';
  return 'neutral';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PatientHistoryPage({ user }: Readonly<Props>) {
  const [entries, setEntries] = useState<ConsultationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/v1/patients/me/consultation-history', {
      headers: { Authorization: `Bearer ${user.token}` },
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setEntries(data as ConsultationEntry[]))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [user.token]);

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div style={pageShell}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <a href="/patient/health" style={outlinedBtn}>← Back</a>
        <span style={{ ...textStyles.eyebrow }}>Consultation History</span>
      </div>

      <h1 style={{ ...textStyles.display, fontSize: 28, margin: '0 0 24px' }}>
        Full History
      </h1>

      {loading && (
        <p style={{ ...textStyles.muted }}>Loading consultations…</p>
      )}

      {!loading && entries.length === 0 && (
        <div style={surface({ padding: 32, textAlign: 'center' as const })}>
          <p style={{ ...textStyles.muted, margin: 0 }}>No completed consultations yet.</p>
          <a href="/patient/book" style={{ ...blackFilledBtn, marginTop: 16, display: 'inline-flex' }}>
            Book Consultation
          </a>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div style={stack(16)}>
          {entries.map((entry) => {
            const isExpanded = expandedIds.has(entry.appointmentId);
            const tone = statusTone(entry.status);
            const doctorLabel = entry.doctorName ?? `Doctor #${entry.doctorId}`;

            return (
              <div
                key={entry.appointmentId}
                style={surface({ padding: 20 })}
              >
                {/* Collapsed header row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ ...textStyles.title, fontSize: 15 }}>{doctorLabel}</span>
                    <span style={{ ...textStyles.muted, fontSize: 12 }}>
                      {formatDate(entry.startTime)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={pill(tone)}>{entry.status}</span>
                    <button
                      type="button"
                      onClick={() => toggleExpand(entry.appointmentId)}
                      style={outlinedBtn}
                    >
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>

                {/* Expanded SOAP view */}
                {isExpanded && (
                  <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14, borderTop: `1px solid ${webTheme.colors.border}`, paddingTop: 20 }}>
                    {entry.subjective && (
                      <div>
                        <span style={{ ...textStyles.eyebrow, display: 'block', marginBottom: 4 }}>Subjective</span>
                        <p style={{ ...textStyles.body, margin: 0 }}>{entry.subjective}</p>
                      </div>
                    )}
                    {entry.assessment && (
                      <div>
                        <span style={{ ...textStyles.eyebrow, display: 'block', marginBottom: 4 }}>Assessment</span>
                        <p style={{ ...textStyles.body, margin: 0 }}>{entry.assessment}</p>
                      </div>
                    )}
                    {entry.plan && (
                      <div>
                        <span style={{ ...textStyles.eyebrow, display: 'block', marginBottom: 4 }}>Plan</span>
                        <p style={{ ...textStyles.body, margin: 0 }}>{entry.plan}</p>
                      </div>
                    )}

                    {/* Prescription downloads */}
                    {entry.prescriptionFiles && entry.prescriptionFiles.length > 0 && (
                      <div>
                        <span style={{ ...textStyles.eyebrow, display: 'block', marginBottom: 8 }}>Prescription Files</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {entry.prescriptionFiles.map((file) => (
                            <a
                              key={file.filename}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                ...softButton('accent'),
                                fontSize: 12,
                                padding: '8px 14px',
                              }}
                            >
                              ↓ {file.filename}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                      <a
                        href={`/patient/book?doctor=${entry.doctorId}`}
                        style={blackFilledBtn}
                      >
                        Book Follow-Up
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
