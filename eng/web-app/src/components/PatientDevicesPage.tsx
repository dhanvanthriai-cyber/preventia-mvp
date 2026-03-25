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

interface VitalsHistoryEntry {
  createdAt: string;
  objective: string;
  appointmentId: number;
}

interface ParsedVital {
  label: string;
  value: string;
  unit: string;
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

function parseVitalsFromObjective(text: string): ParsedVital[] {
  if (!text) return [];
  const patterns: Array<{ label: string; regex: RegExp; unit: string }> = [
    { label: 'HR',      regex: /(?:HR|Heart Rate)[:\s]+(\d+)/i,         unit: 'bpm'   },
    { label: 'BP',      regex: /(?:BP|Blood Pressure)[:\s]+([\d\/]+)/i, unit: 'mmHg'  },
    { label: 'Temp',    regex: /(?:Temp|Temperature)[:\s]+([\d.]+)/i,   unit: '°F'    },
    { label: 'SpO2',    regex: /(?:SpO2|Oxygen)[:\s]+(\d+)/i,           unit: '%'     },
    { label: 'Glucose', regex: /(?:Glucose|Blood Sugar)[:\s]+(\d+)/i,   unit: 'mg/dL' },
    { label: 'Weight',  regex: /(?:Weight|Wt)[:\s]+([\d.]+)/i,          unit: 'kg'    },
  ];
  return patterns
    .map((p) => {
      const m = text.match(p.regex);
      if (!m) return null;
      return { label: p.label, value: m[1], unit: p.unit };
    })
    .filter((v): v is ParsedVital => v !== null);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const DEVICE_CARDS = [
  { name: 'Glucometer', icon: '🩸', desc: 'Continuous blood sugar tracking' },
  { name: 'BP Monitor', icon: '💓', desc: 'Real-time blood pressure readings' },
  { name: 'Smartwatch', icon: '⌚', desc: 'Heart rate, SpO2 & activity' },
];

export default function PatientDevicesPage({ user }: Readonly<Props>) {
  const [history, setHistory] = useState<VitalsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/patients/me/vitals-history', {
      headers: { Authorization: `Bearer ${user.token}` },
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setHistory(data as VitalsHistoryEntry[]))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [user.token]);

  return (
    <div style={pageShell}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <a href="/patient/health" style={outlinedBtn}>← Back</a>
        <span style={{ ...textStyles.eyebrow }}>Devices & Vitals</span>
      </div>

      <h1 style={{ ...textStyles.display, fontSize: 28, margin: '0 0 24px' }}>
        Devices
      </h1>

      {/* Connect Device section */}
      <section style={{ marginBottom: 36 }}>
        <span style={{ ...textStyles.eyebrow, display: 'block', marginBottom: 14 }}>
          Connect a Device
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {DEVICE_CARDS.map((device) => (
            <div
              key={device.name}
              style={surface({
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                alignItems: 'flex-start',
              })}
            >
              <span style={{ fontSize: 28 }}>{device.icon}</span>
              <span style={{ ...textStyles.title, fontSize: 14 }}>{device.name}</span>
              <span style={{ ...textStyles.muted, fontSize: 12 }}>{device.desc}</span>
              <span style={pill('neutral')}>Coming Soon</span>
            </div>
          ))}
        </div>
        <p style={{ ...textStyles.muted, fontSize: 13, marginTop: 12 }}>
          Your doctor records vitals during each consultation. Automatic device sync is coming in V2.
        </p>
      </section>

      {/* Vitals History section */}
      <section>
        <span style={{ ...textStyles.eyebrow, display: 'block', marginBottom: 14 }}>
          Vitals History
        </span>

        {loading && <p style={textStyles.muted}>Loading vitals…</p>}

        {!loading && history.length === 0 && (
          <div style={surface({ padding: 24, textAlign: 'center' as const })}>
            <p style={{ ...textStyles.muted, margin: 0 }}>No vitals recorded yet.</p>
          </div>
        )}

        {!loading && history.length > 0 && (
          <div style={surface({ padding: 0, overflow: 'hidden', overflowX: 'auto' as const })}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr 0.8fr 0.8fr 0.6fr 1fr 0.8fr',
              gap: 8,
              padding: '12px 20px',
              borderBottom: `1px solid ${webTheme.colors.border}`,
              backgroundColor: webTheme.colors.surfaceAlt,
              minWidth: 600,
            }}>
              {['Date', 'HR', 'BP', 'Temp', 'SpO2', 'Glucose', 'Weight'].map((h) => (
                <span key={h} style={{ ...textStyles.eyebrow, fontSize: 10 }}>{h}</span>
              ))}
            </div>

            {history.map((entry, i) => {
              const vitals = parseVitalsFromObjective(entry.objective);
              const get = (label: string) =>
                vitals.find((v) => v.label === label);

              return (
                <div
                  key={entry.appointmentId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 0.8fr 0.8fr 0.8fr 0.6fr 1fr 0.8fr',
                    gap: 8,
                    padding: '14px 20px',
                    borderBottom:
                      i < history.length - 1
                        ? `1px solid ${webTheme.colors.border}`
                        : 'none',
                    alignItems: 'center',
                    minWidth: 600,
                  }}
                >
                  <span style={textStyles.muted}>{formatDate(entry.createdAt)}</span>
                  {['HR', 'BP', 'Temp', 'SpO2', 'Glucose', 'Weight'].map((label) => {
                    const v = get(label);
                    return (
                      <span key={label} style={{ ...textStyles.body, fontSize: 13 }}>
                        {v ? `${v.value} ${v.unit}` : '—'}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
