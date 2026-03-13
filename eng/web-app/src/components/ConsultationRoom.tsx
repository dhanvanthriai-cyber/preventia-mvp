'use client';
/**
 * ConsultationRoom — Doctor-side video consultation component
 * Uses useConsultationRoom hook to manage Daily.co lifecycle.
 * When meeting.ended fires (via SDK left-meeting), status → LOCKED
 * and the backend is notified via completeAppointment().
 */
import React, { useEffect, useRef } from 'react';
import { useConsultationRoom } from '../hooks/useConsultationRoom';

interface Props {
  appointmentId: number;
  roomUrl: string;
  doctorToken: string;
  patientName: string;
  onLocked: () => void; // callback to parent when status → LOCKED
}

export default function ConsultationRoom({
  appointmentId,
  roomUrl,
  doctorToken,
  patientName,
  onLocked,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const { roomStatus, participantCount, error, join, leave, callObject } =
    useConsultationRoom(roomUrl, doctorToken, appointmentId);

  // When LOCKED, fire callback to parent so DoctorDashboard can refresh
  useEffect(() => {
    if (roomStatus === 'LOCKED') onLocked();
  }, [roomStatus, onLocked]);

  // Attach Daily.co iframe to the div once callObject is ready
  useEffect(() => {
    if (callObject && frameRef.current) {
      // daily-js manages its own iframe internally; we just mount a container
      // The call object streams video internally — no explicit iframe src needed
    }
  }, [callObject]);

  const statusColor: Record<string, string> = {
    IDLE: '#888',
    JOINING: '#FFC107',
    ACTIVE: '#22C55E',
    LOCKED: '#CC0000',
    COMPLETED: '#888',
  };

  return (
    <div style={styles.root}>
      {/* Status bar */}
      <div style={styles.statusBar}>
        <span style={{ ...styles.statusDot, background: statusColor[roomStatus] ?? '#888' }} />
        <span style={styles.statusLabel}>
          {roomStatus === 'IDLE' && 'Not connected'}
          {roomStatus === 'JOINING' && 'Joining room…'}
          {roomStatus === 'ACTIVE' && `Live — ${participantCount} participant${participantCount !== 1 ? 's' : ''}`}
          {roomStatus === 'LOCKED' && '⛔ Session LOCKED — EMR write-access revoked'}
        </span>
        <span style={styles.patientBadge}>{patientName}</span>
      </div>

      {error && (
        <div style={styles.errorBanner}>⚠ {error}</div>
      )}

      {/* Video frame container */}
      <div ref={frameRef} style={styles.videoFrame}>
        {roomStatus === 'IDLE' && (
          <div style={styles.placeholder}>
            <p style={styles.placeholderText}>Daily.co room ready</p>
            <p style={styles.placeholderSub}>{roomUrl}</p>
          </div>
        )}
        {roomStatus === 'LOCKED' && (
          <div style={{ ...styles.placeholder, borderColor: '#CC0000' }}>
            <p style={{ ...styles.placeholderText, color: '#CC0000' }}>SESSION LOCKED</p>
            <p style={styles.placeholderSub}>EMR write-access has been revoked. SOAP notes are now read-only.</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        {(roomStatus === 'IDLE') && (
          <button onClick={() => void join()} style={styles.joinBtn}>
            JOIN CALL
          </button>
        )}
        {(roomStatus === 'ACTIVE' || roomStatus === 'JOINING') && (
          <button onClick={() => void leave()} style={styles.leaveBtn}>
            END CALL
          </button>
        )}
        {roomStatus === 'LOCKED' && (
          <span style={styles.lockedTag}>🔒 LOCKED</span>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { border: '3px solid #111', backgroundColor: '#fff', fontFamily: 'monospace' },
  statusBar: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 14px', borderBottom: '2px solid #111', backgroundColor: '#F5F5F5',
  },
  statusDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  statusLabel: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, flex: 1, textTransform: 'uppercase', letterSpacing: 1 },
  patientBadge: { fontFamily: 'monospace', fontSize: 11, border: '2px solid #111', padding: '2px 8px', backgroundColor: '#fff' },
  errorBanner: { backgroundColor: '#FFF3CD', border: '2px solid #FFC107', padding: '8px 14px', fontFamily: 'monospace', fontSize: 12 },
  videoFrame: { minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  placeholder: { border: '2px solid #444', padding: 32, textAlign: 'center' },
  placeholderText: { color: '#fff', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, margin: '0 0 8px 0' },
  placeholderSub: { color: '#aaa', fontFamily: 'monospace', fontSize: 11, margin: 0 },
  controls: { display: 'flex', gap: 10, padding: '10px 14px', borderTop: '2px solid #111' },
  joinBtn: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, backgroundColor: '#000', color: '#fff', border: '2px solid #111', padding: '8px 20px', cursor: 'pointer' },
  leaveBtn: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, backgroundColor: '#CC0000', color: '#fff', border: '2px solid #111', padding: '8px 20px', cursor: 'pointer' },
  lockedTag: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#CC0000', border: '2px solid #CC0000', padding: '6px 14px' },
};
