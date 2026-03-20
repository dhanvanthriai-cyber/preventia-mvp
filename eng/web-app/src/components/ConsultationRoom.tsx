'use client';
/**
 * ConsultationRoom — Video consultation component (Doctor + Patient)
 *
 * Delegates all Daily.co lifecycle to useConsultationRoom which uses
 * createFrame() exclusively — no duplicate instance conflict.
 *
 * The frameRef div is passed to the hook; the iframe is injected there
 * automatically when JOIN CALL is clicked.
 *
 * Chat overlay (VIDEO-001): a 💬 CHAT toggle button appears in the controls bar
 * when the room is ACTIVE, rendering ChatPanel below the video frame.
 */
import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useConsultationRoom } from '../hooks/useConsultationRoom';

const ChatPanel = dynamic(() => import('./ChatPanel'), { ssr: false });

interface Props {
  appointmentId: number;
  roomUrl:       string;
  doctorToken:   string;   // may be recipientToken on the patient side
  patientName:   string;
  peerUserId?:   string;   // Stream userId of the peer (doctor or patient)
  onLocked:      () => void;
}

export default function ConsultationRoom({
  appointmentId,
  roomUrl,
  doctorToken,
  patientName,
  peerUserId,
  onLocked,
}: Props) {
  // The hook attaches the Daily iframe directly to this div
  const frameRef = useRef<HTMLDivElement>(null);

  const { roomStatus, participantCount, error, join, leave } =
    useConsultationRoom(frameRef, roomUrl, doctorToken, appointmentId);

  // In-call chat overlay toggle (VIDEO-001)
  const [chatOpen, setChatOpen] = useState(false);

  // When LOCKED, fire callback to parent so DoctorDashboard can refresh
  useEffect(() => {
    if (roomStatus === 'LOCKED') onLocked();
  }, [roomStatus, onLocked]);

  const statusColor: Record<string, string> = {
    IDLE:      '#888',
    JOINING:   '#FFC107',
    ACTIVE:    '#22C55E',
    LOCKED:    '#CC0000',
    COMPLETED: '#888',
  };

  return (
    <div style={styles.root}>
      {/* Status bar */}
      <div style={styles.statusBar}>
        <span style={{ ...styles.statusDot, background: statusColor[roomStatus] ?? '#888' }} />
        <span style={styles.statusLabel}>
          {roomStatus === 'IDLE'    && 'Ready — click JOIN CALL'}
          {roomStatus === 'JOINING' && 'Connecting…'}
          {roomStatus === 'ACTIVE'  && `Live — ${participantCount} participant${participantCount !== 1 ? 's' : ''}`}
          {roomStatus === 'LOCKED'  && '⛔ Session ended — EMR locked'}
        </span>
        <span style={styles.patientBadge}>{patientName}</span>
      </div>

      {/* Error banner */}
      {error && <div style={styles.errorBanner}>⚠ {error}</div>}

      {/* Daily.co iframe is injected here by the hook */}
      <div ref={frameRef} style={styles.videoFrame}>
        {roomStatus === 'IDLE' && (
          <div style={styles.placeholder}>
            <p style={styles.placeholderText}>📹 Daily.co room ready</p>
            <p style={styles.placeholderSub}>{roomUrl}</p>
          </div>
        )}
        {roomStatus === 'JOINING' && (
          <div style={styles.placeholder}>
            <p style={styles.placeholderText}>Connecting…</p>
            <p style={styles.placeholderSub}>Setting up video stream</p>
          </div>
        )}
        {(roomStatus === 'LOCKED' || roomStatus === 'COMPLETED') && (
          <div style={{ ...styles.placeholder, borderColor: '#CC0000' }}>
            <p style={{ ...styles.placeholderText, color: '#CC0000' }}>SESSION ENDED</p>
            <p style={styles.placeholderSub}>EMR write-access has been revoked.</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        {roomStatus === 'IDLE' && (
          <button onClick={() => void join()} style={styles.joinBtn}>
            📹 JOIN CALL
          </button>
        )}
        {(roomStatus === 'ACTIVE' || roomStatus === 'JOINING') && (
          <button onClick={() => void leave()} style={styles.leaveBtn}>
            END CALL
          </button>
        )}
        {roomStatus === 'ACTIVE' && peerUserId && (
          <button onClick={() => setChatOpen((o) => !o)} style={styles.chatToggleBtn}>
            💬 {chatOpen ? 'CLOSE CHAT' : 'CHAT'}
          </button>
        )}
        {(roomStatus === 'LOCKED' || roomStatus === 'COMPLETED') && (
          <span style={styles.lockedTag}>🔒 SESSION ENDED</span>
        )}
      </div>

      {/* In-call chat overlay (VIDEO-001) */}
      {chatOpen && roomStatus === 'ACTIVE' && peerUserId && (
        <div style={styles.chatOverlay}>
          <ChatPanel
            userName={patientName}
            height={300}
            peerUserId={peerUserId}
          />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root:      { border: '3px solid #111', backgroundColor: '#fff', fontFamily: 'monospace' },
  statusBar: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 14px', borderBottom: '2px solid #111', backgroundColor: '#F5F5F5',
  },
  statusDot:   { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  statusLabel: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, flex: 1, textTransform: 'uppercase', letterSpacing: 1 },
  patientBadge:{ fontFamily: 'monospace', fontSize: 11, border: '2px solid #111', padding: '2px 8px', backgroundColor: '#fff' },
  errorBanner: { backgroundColor: '#FFF3CD', border: '2px solid #FFC107', padding: '8px 14px', fontFamily: 'monospace', fontSize: 12 },
  videoFrame:  { position: 'relative', minHeight: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  placeholder: { border: '2px solid #444', padding: 32, textAlign: 'center' },
  placeholderText: { color: '#fff', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, margin: '0 0 8px 0' },
  placeholderSub:  { color: '#aaa', fontFamily: 'monospace', fontSize: 11, margin: 0, wordBreak: 'break-all' },
  controls:    { display: 'flex', gap: 10, padding: '10px 14px', borderTop: '2px solid #111' },
  joinBtn:     { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, backgroundColor: '#000', color: '#fff', border: '2px solid #111', padding: '8px 20px', cursor: 'pointer' },
  leaveBtn:    { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, backgroundColor: '#CC0000', color: '#fff', border: '2px solid #111', padding: '8px 20px', cursor: 'pointer' },
  lockedTag:   { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#CC0000', border: '2px solid #CC0000', padding: '6px 14px' },
  chatToggleBtn: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, backgroundColor: '#1a1a2e', color: '#fff', border: '2px solid #111', padding: '8px 18px', cursor: 'pointer' },
  chatOverlay: { borderTop: '2px solid #111', backgroundColor: '#F9F9F9' },
};
