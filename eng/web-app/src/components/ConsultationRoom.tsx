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
 * SPRINT-07: VIDEO-001 — chat overlay toggle during active call
 * SPRINT-08:
 *  - VIDEO-006: PreCallCheck screen before joining
 *  - VIDEO-003: Audio-only fallback suggestion on poor network
 *  - CONSULT-006: CHAT_FALLBACK state after 3 failed join attempts
 *  - CONSULT-010: EmergencyButton persistent in controls bar and chat panel
 */
import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useConsultationRoom } from '../hooks/useConsultationRoom';

const ChatPanel      = dynamic(() => import('./ChatPanel'),      { ssr: false });
const PreCallCheck   = dynamic(() => import('./PreCallCheck'),   { ssr: false });
const EmergencyButton = dynamic(() => import('./EmergencyButton'), { ssr: false });

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

  const {
    roomStatus,
    participantCount,
    error,
    join,
    leave,
    switchToAudioOnly,
    suggestAudioOnly,
  } = useConsultationRoom(frameRef, roomUrl, doctorToken, appointmentId);

  // VIDEO-006: Show pre-call check before joining
  const [preCallDone, setPreCallDone] = useState(false);

  // In-call chat overlay toggle (VIDEO-001)
  const [chatOpen, setChatOpen] = useState(false);

  // When LOCKED, fire callback to parent so DoctorDashboard can refresh
  useEffect(() => {
    if (roomStatus === 'LOCKED') onLocked();
  }, [roomStatus, onLocked]);

  // VIDEO-006: Show pre-call check if the user hasn't done it yet and hasn't started joining
  const showPreCallCheck = !preCallDone && roomStatus === 'IDLE';

  const statusColor: Record<string, string> = {
    IDLE:         '#888',
    JOINING:      '#FFC107',
    ACTIVE:       '#22C55E',
    LOCKED:       '#CC0000',
    COMPLETED:    '#888',
    CHAT_FALLBACK:'#FF6B00',
  };

  return (
    <div style={styles.root}>
      {/* VIDEO-006: Pre-call check gate */}
      {showPreCallCheck && (
        <div style={styles.preCallOverlay}>
          <PreCallCheck
            onPass={() => setPreCallDone(true)}
            onSkip={() => setPreCallDone(true)}
          />
        </div>
      )}

      {/* Status bar */}
      <div style={styles.statusBar}>
        <span style={{ ...styles.statusDot, background: statusColor[roomStatus] ?? '#888' }} />
        <span style={styles.statusLabel}>
          {roomStatus === 'IDLE'         && 'Ready — click JOIN CALL'}
          {roomStatus === 'JOINING'      && 'Connecting…'}
          {roomStatus === 'ACTIVE'       && `Live — ${participantCount} participant${participantCount !== 1 ? 's' : ''}`}
          {roomStatus === 'LOCKED'       && '⛔ Session ended — EMR locked'}
          {roomStatus === 'CHAT_FALLBACK'&& '📵 Video unavailable — chat mode'}
        </span>
        <span style={styles.patientBadge}>{patientName}</span>
      </div>

      {/* Error banner */}
      {error && roomStatus !== 'CHAT_FALLBACK' && (
        <div style={styles.errorBanner}>⚠ {error}</div>
      )}

      {/* VIDEO-003: Audio-only suggestion banner */}
      {suggestAudioOnly && roomStatus === 'ACTIVE' && (
        <div style={styles.audioOnlyBanner}>
          📶 Poor network detected.
          <button onClick={switchToAudioOnly} style={styles.audioOnlyBtn}>
            Switch to Audio Only
          </button>
        </div>
      )}

      {/* CONSULT-006: Chat fallback banner */}
      {roomStatus === 'CHAT_FALLBACK' ? (
        <div style={styles.fallbackBanner}>
          <p style={styles.fallbackTitle}>📵 Video unavailable after {3} attempts</p>
          <p style={styles.fallbackSub}>Continue your consultation via chat below.</p>
          {error && <p style={styles.fallbackError}>Error: {error}</p>}
          {peerUserId && (
            <ChatPanel
              userName={patientName}
              height={400}
              peerUserId={peerUserId}
            />
          )}
        </div>
      ) : (
        <>
          {/* Daily.co iframe is injected here by the hook */}
          <div ref={frameRef} style={styles.videoFrame}>
            {roomStatus === 'IDLE' && preCallDone && (
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
            {roomStatus === 'IDLE' && preCallDone && (
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

            {/* CONSULT-010: Emergency button always visible in controls */}
            {roomStatus !== 'LOCKED' && roomStatus !== 'COMPLETED' && (
              <EmergencyButton appointmentId={appointmentId} />
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
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root:      { border: '3px solid #111', backgroundColor: '#fff', fontFamily: 'monospace' },
  preCallOverlay: {
    position: 'absolute', inset: 0, zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  statusBar: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 14px', borderBottom: '2px solid #111', backgroundColor: '#F5F5F5',
  },
  statusDot:   { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  statusLabel: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, flex: 1, textTransform: 'uppercase', letterSpacing: 1 },
  patientBadge:{ fontFamily: 'monospace', fontSize: 11, border: '2px solid #111', padding: '2px 8px', backgroundColor: '#fff' },
  errorBanner: { backgroundColor: '#FFF3CD', border: '2px solid #FFC107', padding: '8px 14px', fontFamily: 'monospace', fontSize: 12 },
  audioOnlyBanner: {
    backgroundColor: '#FFF3CD', border: '2px solid #FFC107',
    padding: '8px 14px', fontFamily: 'monospace', fontSize: 12,
    display: 'flex', alignItems: 'center', gap: 12,
  },
  audioOnlyBtn: {
    fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
    backgroundColor: '#FF6B00', color: '#fff', border: 'none',
    borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
  },
  videoFrame:  { position: 'relative', minHeight: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  placeholder: { border: '2px solid #444', padding: 32, textAlign: 'center' },
  placeholderText: { color: '#fff', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, margin: '0 0 8px 0' },
  placeholderSub:  { color: '#aaa', fontFamily: 'monospace', fontSize: 11, margin: 0, wordBreak: 'break-all' },
  fallbackBanner: {
    backgroundColor: '#FFF3CD', border: '2px solid #FF6B00',
    padding: '20px 24px', fontFamily: 'monospace',
  },
  fallbackTitle: { fontSize: 16, fontWeight: 700, color: '#CC3300', margin: '0 0 8px 0' },
  fallbackSub:   { fontSize: 13, color: '#555', margin: '0 0 16px 0' },
  fallbackError: { fontSize: 11, color: '#888', margin: '0 0 16px 0' },
  controls:    { display: 'flex', gap: 10, padding: '10px 14px', borderTop: '2px solid #111', alignItems: 'center', flexWrap: 'wrap' },
  joinBtn:     { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, backgroundColor: '#000', color: '#fff', border: '2px solid #111', padding: '8px 20px', cursor: 'pointer' },
  leaveBtn:    { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, backgroundColor: '#CC0000', color: '#fff', border: '2px solid #111', padding: '8px 20px', cursor: 'pointer' },
  lockedTag:   { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#CC0000', border: '2px solid #CC0000', padding: '6px 14px' },
  chatToggleBtn: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, backgroundColor: '#1a1a2e', color: '#fff', border: '2px solid #111', padding: '8px 18px', cursor: 'pointer' },
  chatOverlay: { borderTop: '2px solid #111', backgroundColor: '#F9F9F9' },
};
