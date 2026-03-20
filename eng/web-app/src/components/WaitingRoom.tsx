'use client';
/**
 * WaitingRoom.tsx — Pre-call waiting screen for patients.
 *
 * Shows while appointment.status === 'SCHEDULED'.
 * Polls GET /api/v1/appointments/{id}/tokens every 15s.
 * When status transitions to 'ACTIVE', fires onDoctorReady().
 * Shows countdown to scheduled time and a warm waiting message.
 */
import React, { useEffect, useState } from 'react';
import { getTokenFromCookie } from '@/lib/auth';

interface Props {
  readonly appointmentId:  number;
  readonly doctorName:     string;
  readonly scheduledTime:  string; // ISO datetime string
  readonly onDoctorReady:  () => void;
}

function formatCountdown(targetIso: string): string {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return 'starting any moment';

  const totalSeconds = Math.floor(diff / 1000);
  const hours        = Math.floor(totalSeconds / 3600);
  const minutes      = Math.floor((totalSeconds % 3600) / 60);
  const seconds      = totalSeconds % 60;

  if (hours > 0) return `in ${hours}h ${minutes}m`;
  if (minutes > 0) return `in ${minutes}m ${seconds}s`;
  return `in ${seconds}s`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export default function WaitingRoom({
  appointmentId,
  doctorName,
  scheduledTime,
  onDoctorReady,
}: Props) {
  const [countdown, setCountdown] = useState(() => formatCountdown(scheduledTime));

  // Update countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(formatCountdown(scheduledTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [scheduledTime]);

  // Poll appointment status every 15s
  useEffect(() => {
    const jwt = getTokenFromCookie();
    if (!jwt) return;

    const poll = setInterval(() => {
      fetch(`/api/v1/appointments/${appointmentId}/tokens`, {
        headers: { Authorization: `Bearer ${jwt}` },
        credentials: 'include',
      })
        .then((res) => (res.ok ? res.json() as Promise<{ status: string }> : Promise.reject(`HTTP ${res.status}`)))
        .then((data) => {
          if (data.status === 'ACTIVE') {
            clearInterval(poll);
            onDoctorReady();
          }
        })
        .catch(() => { /* ignore polling errors */ });
    }, 15_000);

    return () => clearInterval(poll);
  }, [appointmentId, onDoctorReady]);

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <span style={styles.icon}>🩺</span>
        <h2 style={styles.heading}>Waiting for Dr. {doctorName}…</h2>
        <p style={styles.scheduledFor}>
          Your appointment is scheduled for{' '}
          <strong>{formatTime(scheduledTime)}</strong>
          {' '}({countdown})
        </p>
        <p style={styles.hint}>
          You'll be connected automatically when Dr. {doctorName} joins the room.
          Chat is available while you wait.
        </p>
        <div style={styles.pulseRow}>
          <span style={styles.pulseDot} />
          <span style={styles.pulseLabel}>Checking for your doctor…</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    padding: 24,
    fontFamily: 'monospace',
    backgroundColor: '#FAFAFA',
  },
  card: {
    border: '3px solid #111',
    backgroundColor: '#fff',
    padding: 40,
    maxWidth: 520,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 18,
    textAlign: 'center',
  },
  icon: {
    fontSize: 48,
  },
  heading: {
    fontFamily: 'monospace',
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scheduledFor: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#333',
    margin: 0,
  },
  hint: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#666',
    margin: 0,
    lineHeight: '18px',
  },
  pulseRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: '#FFC107',
    flexShrink: 0,
  },
  pulseLabel: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
};
