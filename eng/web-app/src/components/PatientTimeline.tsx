'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { AuthUser } from '@preventia/shared';
import { pill, surface, textStyles, webTheme } from '@/lib/designSystem';

interface TimelineEvent {
  type:          'APPOINTMENT' | 'LAB_RESULT' | 'PRESCRIPTION';
  date:          string;
  title:         string;
  summary?:      string;
  plan?:         string;
  appointmentId?: number;
  signedUrl?:    string;
  pharmacy?:     string;
}

interface Props {
  patientId:  number;
  token:      string;
  role:       string;  // DOCTOR | RECIPIENT | SPONSOR
  compact?:   boolean; // true = show only last 3 events (dashboard card mode)
}

function eventIcon(type: TimelineEvent['type']): string {
  switch (type) {
    case 'APPOINTMENT': return '🩺';
    case 'LAB_RESULT':  return '🧪';
    case 'PRESCRIPTION': return '💊';
    default: return '📋';
  }
}

function eventColor(type: TimelineEvent['type']): string {
  switch (type) {
    case 'APPOINTMENT': return '#2563EB';
    case 'LAB_RESULT':  return '#059669';
    case 'PRESCRIPTION': return '#7C3AED';
    default: return '#6B7280';
  }
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

const outlinedBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  padding: '6px 14px', borderRadius: webTheme.radius.pill,
  backgroundColor: 'transparent', color: webTheme.colors.text,
  border: `1px solid ${webTheme.colors.borderStrong}`,
  fontFamily: webTheme.font.sans, fontSize: 11, fontWeight: 600,
  letterSpacing: '0.06em', textTransform: 'uppercase' as const,
  cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap' as const,
};

export default function PatientTimeline({ patientId, token, role, compact = false }: Readonly<Props>) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/patients/${patientId}/timeline`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) setEvents(await res.json() as TimelineEvent[]);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [patientId, token]);

  useEffect(() => { void load(); }, [load]);

  const displayed = compact ? events.slice(0, 3) : events;

  if (loading) {
    return <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>Loading timeline…</p>;
  }

  if (displayed.length === 0) {
    return <p style={{ ...textStyles.muted, margin: 0, fontSize: 12 }}>No timeline events yet.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {displayed.map((event, idx) => (
        <div
          key={`${event.type}-${event.date}-${idx}`}
          style={{ display: 'flex', gap: 14, paddingBottom: 16, position: 'relative' }}
        >
          {/* Timeline spine */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              backgroundColor: eventColor(event.type) + '18',
              border: `2px solid ${eventColor(event.type)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
            }}>
              {eventIcon(event.type)}
            </div>
            {idx < displayed.length - 1 && (
              <div style={{ width: 2, flex: 1, backgroundColor: '#E5E7EB', minHeight: 16, marginTop: 4 }} />
            )}
          </div>

          {/* Event card */}
          <div style={surface({ padding: 14, flex: 1, boxShadow: 'none', backgroundColor: webTheme.colors.surfaceAlt, marginBottom: 4 })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
              <span style={{ ...textStyles.label, fontSize: 12 }}>{event.title}</span>
              <span style={{ ...textStyles.muted, fontSize: 10, whiteSpace: 'nowrap' }}>{formatDate(event.date)}</span>
            </div>

            <span style={pill(event.type === 'APPOINTMENT' ? 'accent' : event.type === 'LAB_RESULT' ? 'success' : 'neutral')}>
              {event.type.replace('_', ' ')}
            </span>

            {event.summary && role === 'DOCTOR' && (
              <p style={{ ...textStyles.muted, margin: '8px 0 0', fontSize: 11, lineHeight: '16px' }}>
                {event.summary}
              </p>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {event.appointmentId && role === 'DOCTOR' && (
                <a href={`/doctor/patient/${patientId}`} style={{ ...outlinedBtn, fontSize: 10 }}>
                  View SOAP Note ›
                </a>
              )}
              {event.signedUrl && (
                <a href={event.signedUrl} target="_blank" rel="noreferrer" style={{ ...outlinedBtn, fontSize: 10 }}>
                  Download PDF ›
                </a>
              )}
            </div>
          </div>
        </div>
      ))}

      {compact && events.length > 3 && (
        <a href={`/patient/history`} style={{ ...outlinedBtn, alignSelf: 'flex-start', marginTop: 4 }}>
          View All {events.length} Events ›
        </a>
      )}
    </div>
  );
}
