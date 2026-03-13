'use client';
/**
 * ConsultationRoom — Doctor-side video consultation component
 *
 * Lifecycle:
 *  IDLE     → User clicks JOIN → hook creates callObject + startCamera() → JOINING
 *  JOINING  → Daily.co joined-meeting fires → ACTIVE
 *  ACTIVE   → Daily.createFrame() attaches video iframe to frameRef div
 *  LOCKED   → meeting ended; frame destroyed; EMR write-access revoked
 *
 * Frame management:
 *  - createFrame() is called once when status transitions to ACTIVE (frameInitRef guards double-init)
 *  - When status becomes LOCKED, the iframe is removed from the DOM
 *  - On unmount, any live frame is destroyed via cleanup effect
 */
import React, { useEffect, useRef } from 'react';
import DailyIframe from '@daily-co/daily-js';
import type { DailyCall } from '@daily-co/daily-js';
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

  // Tracks the Daily.co frame instance (separate from the hook's headless callObject)
  const dailyFrameRef = useRef<DailyCall | null>(null);
  // Guard against createFrame being called twice (React StrictMode double-effect)
  const frameInitRef = useRef(false);

  const { roomStatus, participantCount, error, join, leave } =
    useConsultationRoom(roomUrl, doctorToken, appointmentId);

  // When LOCKED, fire callback to parent so DoctorDashboard can refresh
  useEffect(() => {
    if (roomStatus === 'LOCKED') onLocked();
  }, [roomStatus, onLocked]);

  // ── Daily.co frame lifecycle ────────────────────────────────────────────────
  // Attach the visible video iframe when the call becomes ACTIVE.
  // Destroy and remove it when the session ends or is locked.
  useEffect(() => {
    if (roomStatus === 'ACTIVE' && frameRef.current && !frameInitRef.current) {
      frameInitRef.current = true;

      const frame = DailyIframe.createFrame(frameRef.current, {
        url: roomUrl,
        token: doctorToken,
        showLeaveButton: false,
        showFullscreenButton: true,
        iframeStyle: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '100%',
          border: 'none',
        },
      });
      dailyFrameRef.current = frame;
    }

    if (roomStatus === 'LOCKED' || roomStatus === 'IDLE') {
      if (dailyFrameRef.current) {
        dailyFrameRef.current.destroy();
        dailyFrameRef.current = null;
        frameInitRef.current = false;
      }
      // Belt-and-suspenders: remove any lingering iframe element
      frameRef.current?.querySelector('iframe')?.remove();
    }
  }, [roomStatus, roomUrl, doctorToken]);

  // Cleanup frame on component unmount
  useEffect(() => {
    return () => {
      if (dailyFrameRef.current) {
        dailyFrameRef.current.destroy();
        dailyFrameRef.current = null;
      }
      frameRef.current?.querySelector('iframe')?.remove();
    };
  }, []);

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

      {/* Permission / connection error banner */}
      {error && (
        <div style={styles.errorBanner}>⚠ {error}</div>
      )}

      {/* Video frame container — Daily.co iframe is injected here when ACTIVE */}
      <div ref={frameRef} style={styles.videoFrame}>
        {roomStatus === 'IDLE' && (
          <div style={styles.placeholder}>
            <p style={styles.placeholderText}>Daily.co room ready</p>
            <p style={styles.placeholderSub}>{roomUrl}</p>
          </div>
        )}
        {roomStatus === 'JOINING' && (
          <div style={styles.placeholder}>
            <p style={styles.placeholderText}>Connecting…</p>
            <p style={styles.placeholderSub}>Setting up video stream</p>
          </div>
        )}
        {roomStatus === 'LOCKED' && (
          <div style={{ ...styles.placeholder, borderColor: '#CC0000' }}>
            <p style={{ ...styles.placeholderText, color: '#CC0000' }}>SESSION LOCKED</p>
            <p style={styles.placeholderSub}>
              EMR write-access has been revoked. SOAP notes are now read-only.
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        {roomStatus === 'IDLE' && (
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
  statusLabel: {
    fontFamily: 'monospace', fontSize: 12, fontWeight: 700, flex: 1,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  patientBadge: {
    fontFamily: 'monospace', fontSize: 11,
    border: '2px solid #111', padding: '2px 8px', backgroundColor: '#fff',
  },
  errorBanner: {
    backgroundColor: '#FFF3CD', border: '2px solid #FFC107',
    padding: '8px 14px', fontFamily: 'monospace', fontSize: 12,
  },
  // position: relative so the absolute-positioned Daily iframe fills this container
  videoFrame: {
    position: 'relative',
    minHeight: 300,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  placeholder: { border: '2px solid #444', padding: 32, textAlign: 'center' },
  placeholderText: {
    color: '#fff', fontFamily: 'monospace', fontSize: 14, fontWeight: 700, margin: '0 0 8px 0',
  },
  placeholderSub: { color: '#aaa', fontFamily: 'monospace', fontSize: 11, margin: 0 },
  controls: { display: 'flex', gap: 10, padding: '10px 14px', borderTop: '2px solid #111' },
  joinBtn: {
    fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
    backgroundColor: '#000', color: '#fff', border: '2px solid #111',
    padding: '8px 20px', cursor: 'pointer',
  },
  leaveBtn: {
    fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
    backgroundColor: '#CC0000', color: '#fff', border: '2px solid #111',
    padding: '8px 20px', cursor: 'pointer',
  },
  lockedTag: {
    fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
    color: '#CC0000', border: '2px solid #CC0000', padding: '6px 14px',
  },
};
