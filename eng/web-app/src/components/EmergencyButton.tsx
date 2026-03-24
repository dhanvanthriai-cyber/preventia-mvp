'use client';
/**
 * EmergencyButton — CONSULT-010
 *
 * Persistent emergency escalation button for ConsultationRoom and ChatPanel.
 *
 * On activation:
 * 1. Immediately shows emergency guidance (112/911) — never blocked by network
 * 2. Fire-and-forget POST to backend (doctor gets FCM high-priority push + admin email)
 *
 * Backend: POST /api/v1/appointments/{id}/emergency
 */
import React, { useState } from 'react';
import { getTokenFromCookie } from '@/lib/auth';

interface Props {
  appointmentId: number;
}

export default function EmergencyButton({ appointmentId }: Props) {
  const [activated, setActivated] = useState(false);

  const handleEmergency = () => {
    // Show guidance IMMEDIATELY — before any network call
    setActivated(true);

    // Fire-and-forget: don't block the guidance display on network
    const jwt = getTokenFromCookie();
    fetch(`/api/v1/appointments/${appointmentId}/emergency`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
    }).catch(e => console.error('[EmergencyButton] Backend notify failed:', e));
  };

  if (activated) {
    return (
      <div style={emergencyStyles.guidance}>
        <h2 style={emergencyStyles.guidanceTitle}>🆘 Emergency services: Call 112</h2>
        <p style={emergencyStyles.guidanceText}>Your care team has been alerted.</p>
        <p style={emergencyStyles.guidanceText}>
          If in the US: Call 911. If in India: Call 112.
        </p>
        <p style={emergencyStyles.guidanceSub}>
          A clinic administrator has been notified and will contact you shortly.
        </p>
      </div>
    );
  }

  return (
    <button onClick={handleEmergency} style={emergencyStyles.btn} title="Emergency escalation">
      🆘 EMERGENCY
    </button>
  );
}

const emergencyStyles: Record<string, React.CSSProperties> = {
  btn: {
    fontFamily:      'monospace',
    fontSize:        12,
    fontWeight:      700,
    backgroundColor: '#CC0000',
    color:           '#fff',
    border:          '3px solid #880000',
    borderRadius:    6,
    padding:         '8px 16px',
    cursor:          'pointer',
    letterSpacing:   1,
    animation:       'pulse 2s infinite',
  },
  guidance: {
    backgroundColor: '#CC0000',
    color:           '#fff',
    border:          '3px solid #880000',
    borderRadius:    8,
    padding:         '16px 20px',
    fontFamily:      'monospace',
    display:         'flex',
    flexDirection:   'column',
    gap:             6,
  },
  guidanceTitle: {
    fontSize:   18,
    fontWeight: 900,
    margin:     0,
    fontFamily: 'monospace',
  },
  guidanceText: {
    fontSize:   14,
    fontWeight: 700,
    margin:     0,
  },
  guidanceSub: {
    fontSize:   12,
    fontWeight: 400,
    margin:     0,
    opacity:    0.9,
  },
};
