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

// Recording timer hook
function useRecordingTimer(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [active]);
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

const ChatPanel      = dynamic(() => import('./ChatPanel'),      { ssr: false });
const PreCallCheck   = dynamic(() => import('./PreCallCheck'),   { ssr: false });
const EmergencyButton = dynamic(() => import('./EmergencyButton'), { ssr: false });

interface Props {
  appointmentId: number;
  roomUrl:       string;
  doctorToken:   string;   // may be recipientToken on the patient side
  patientName:   string;
  peerUserId?:   string;   // Stream userId of the peer (doctor or patient)
  /** CONSULT-005: sponsorId signals a sponsor is linked — shows live update panel for doctors */
  sponsorId?:    number;
  onLocked:      () => void;
}

const LIVE_UPDATE_TEMPLATES = [
  'Examination started',
  'Taking medical history',
  'Reviewing medications',
  'Prescribing medication',
  'Follow-up needed',
  'Consultation complete',
];

export default function ConsultationRoom({
  appointmentId,
  roomUrl,
  doctorToken,
  patientName,
  peerUserId,
  sponsorId,
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

  // CONSULT-005: Live updates to sponsor
  const [liveUpdateInput, setLiveUpdateInput] = useState('');
  const [liveUpdateSending, setLiveUpdateSending] = useState(false);
  const [liveUpdateSent, setLiveUpdateSent] = useState<string | null>(null);

  const sendLiveUpdate = async (text: string) => {
    if (!text.trim() || liveUpdateSending) return;
    setLiveUpdateSending(true);
    try {
      await fetch(`/api/v1/chat/live-update/${appointmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ update: text }),
      });
      setLiveUpdateSent(text);
      setLiveUpdateInput('');
      setTimeout(() => setLiveUpdateSent(null), 3000);
    } catch {
      // Non-fatal
    } finally {
      setLiveUpdateSending(false);
    }
  };

  // SOAP Notes state
  const [soapS, setSoapS] = useState('');
  const [soapO, setSoapO] = useState('');
  const [soapA, setSoapA] = useState('');
  const [soapP, setSoapP] = useState('');
  const [soapTab, setSoapTab] = useState<'SOAP' | 'PRESCRIPTION' | 'ALERTS'>('SOAP');

  // Recording timer
  const recordingTime = useRecordingTimer(roomStatus === 'ACTIVE');

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
        {roomStatus === 'ACTIVE' && (
          <span style={styles.recordingIndicator}>
            <span style={styles.recordingDot}>●</span>
            RECORDING {recordingTime}
          </span>
        )}
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
          {/* Daily.co iframe + 2×2 video grid wrapper */}
          <div style={styles.videoGrid}>
            {/* Daily.co frame injected here */}
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
            {/* Placeholder tiles for 2×2 layout when active */}
            {roomStatus === 'ACTIVE' && (
              <>
                <div style={{ ...styles.videoTile, backgroundColor: '#1a1a1a' }}>
                  <span style={styles.tileLabel}>Alice / Family</span>
                </div>
                <div style={{ ...styles.videoTile, backgroundColor: '#0d0d0d' }}>
                  <span style={styles.tileLabel}>Waiting…</span>
                </div>
              </>
            )}
            {/* Vitals overlay */}
            {roomStatus === 'ACTIVE' && (
              <div style={styles.vitalsOverlay}>
                HR: 72 &nbsp;|&nbsp; Glucose: 141 ⚠ &nbsp;|&nbsp; BP: 115/76
              </div>
            )}
          </div>

          {/* SOAP Notes + Tabs panel */}
          <div style={styles.soapPanel}>
            <div style={styles.soapTabs}>
              {(['SOAP', 'PRESCRIPTION', 'ALERTS'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  style={{ ...styles.soapTabBtn, ...(soapTab === tab ? styles.soapTabActive : {}) }}
                  onClick={() => setSoapTab(tab)}
                >
                  {tab === 'SOAP' ? 'SOAP NOTES' : tab}
                </button>
              ))}
            </div>
            {soapTab === 'SOAP' && (
              <div style={styles.soapFields}>
                <div style={styles.soapField}>
                  <label style={styles.soapLabel}>S — SUBJECTIVE</label>
                  <textarea value={soapS} onChange={(e) => setSoapS(e.target.value)} rows={3} placeholder="Patient's chief complaint and history…" style={styles.soapTextarea} />
                </div>
                <div style={styles.soapField}>
                  <label style={styles.soapLabel}>O — OBJECTIVE</label>
                  <textarea value={soapO} onChange={(e) => setSoapO(e.target.value)} rows={3} placeholder="Vitals, physical exam findings…" style={styles.soapTextarea} />
                </div>
                <div style={styles.soapField}>
                  <label style={styles.soapLabel}>A — ASSESSMENT</label>
                  <textarea value={soapA} onChange={(e) => setSoapA(e.target.value)} rows={3} placeholder="Diagnosis and clinical impression…" style={styles.soapTextarea} />
                </div>
                <div style={styles.soapField}>
                  <label style={styles.soapLabel}>P — PLAN</label>
                  <textarea value={soapP} onChange={(e) => setSoapP(e.target.value)} rows={3} placeholder="Treatment plan, follow-up, prescriptions…" style={styles.soapTextarea} />
                </div>
              </div>
            )}
            {soapTab === 'PRESCRIPTION' && (
              <div style={styles.soapFields}>
                <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#555', margin: 0 }}>Prescription entry will be available in a future sprint.</p>
              </div>
            )}
            {soapTab === 'ALERTS' && (
              <div style={styles.soapFields}>
                <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#555', margin: 0 }}>No active alerts for this session.</p>
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
            {roomStatus === 'ACTIVE' && (
              <button style={styles.muteBurstBtn} type="button">
                MUTE BURST
              </button>
            )}
            {/* SIGN & COMPLETE ENCOUNTER */}
            {(roomStatus === 'ACTIVE' || roomStatus === 'LOCKED' || roomStatus === 'COMPLETED') && (
              <button onClick={() => void leave()} style={styles.signCompleteBtn}>
                ✍ SIGN &amp; COMPLETE ENCOUNTER
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

          {/* CONSULT-005: Live updates to sponsor panel */}
          {roomStatus === 'ACTIVE' && sponsorId != null && (
            <div style={styles.liveUpdatePanel}>
              <div style={styles.liveUpdateHeader}>
                <span style={styles.liveDot}>●</span>
                <span style={styles.liveLabel}>Live Updates to Sponsor</span>
                {liveUpdateSent && (
                  <span style={styles.liveSentConfirm}>✓ Sent: {liveUpdateSent}</span>
                )}
              </div>
              <div style={styles.liveTemplates}>
                {LIVE_UPDATE_TEMPLATES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    style={styles.liveTemplateBtn}
                    disabled={liveUpdateSending}
                    onClick={() => void sendLiveUpdate(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div style={styles.liveCustomRow}>
                <input
                  style={styles.liveCustomInput}
                  placeholder="Custom update…"
                  value={liveUpdateInput}
                  onChange={(e) => setLiveUpdateInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void sendLiveUpdate(liveUpdateInput); }}
                />
                <button
                  type="button"
                  style={styles.liveSendBtn}
                  disabled={liveUpdateSending || !liveUpdateInput.trim()}
                  onClick={() => void sendLiveUpdate(liveUpdateInput)}
                >
                  {liveUpdateSending ? '…' : '↑'}
                </button>
              </div>
            </div>
          )}

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
    flexWrap: 'wrap',
  },
  statusDot:   { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  statusLabel: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, flex: 1, textTransform: 'uppercase', letterSpacing: 1 },
  patientBadge:{ fontFamily: 'monospace', fontSize: 11, border: '2px solid #111', padding: '2px 8px', backgroundColor: '#fff' },
  recordingIndicator: { fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#CC0000', display: 'flex', alignItems: 'center', gap: 5 },
  recordingDot: { color: '#CC0000', fontSize: 14, lineHeight: 1 },
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
  // 2×2 video grid
  videoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    backgroundColor: '#0a0a0a',
    padding: 8,
    position: 'relative',
  },
  videoFrame:  { position: 'relative', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  videoTile:   { minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  tileLabel:   { fontFamily: 'monospace', fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: 1 },
  vitalsOverlay: {
    position: 'absolute', bottom: 16, left: 16, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.72)', color: '#fff',
    fontFamily: 'monospace', fontSize: 11, fontWeight: 700,
    padding: '6px 12px', borderRadius: 6, letterSpacing: 1,
    border: '1px solid rgba(255,255,255,0.15)',
  },
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
  // SOAP Panel
  soapPanel: { borderTop: '2px solid #111', backgroundColor: '#FAFAFA', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
  soapTabs: { display: 'flex', gap: 0, borderBottom: '2px solid #111' },
  soapTabBtn: { fontFamily: 'monospace', fontSize: 11, fontWeight: 700, backgroundColor: 'transparent', color: '#555', border: 'none', borderRight: '1px solid #111', padding: '6px 14px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 },
  soapTabActive: { backgroundColor: '#111', color: '#fff' },
  soapFields: { display: 'flex', flexDirection: 'column', gap: 12 },
  soapField: { display: 'flex', flexDirection: 'column', gap: 4 },
  soapLabel: { fontFamily: 'monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#333' },
  soapTextarea: { fontFamily: 'monospace', fontSize: 12, border: '2px solid #ddd', borderRadius: 4, padding: '8px 10px', resize: 'vertical' as const, outline: 'none', width: '100%', boxSizing: 'border-box' as const },
  controls:    { display: 'flex', gap: 10, padding: '10px 14px', borderTop: '2px solid #111', alignItems: 'center', flexWrap: 'wrap' },
  joinBtn:     { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, backgroundColor: '#000', color: '#fff', border: '2px solid #111', padding: '8px 20px', cursor: 'pointer' },
  leaveBtn:    { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, backgroundColor: '#CC0000', color: '#fff', border: '2px solid #111', padding: '8px 20px', cursor: 'pointer' },
  lockedTag:   { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#CC0000', border: '2px solid #CC0000', padding: '6px 14px' },
  chatToggleBtn: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, backgroundColor: '#1a1a2e', color: '#fff', border: '2px solid #111', padding: '8px 18px', cursor: 'pointer' },
  muteBurstBtn: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, backgroundColor: '#FF6B00', color: '#fff', border: '2px solid #111', padding: '8px 18px', cursor: 'pointer' },
  signCompleteBtn: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700, backgroundColor: '#8B0000', color: '#fff', border: '2px solid #8B0000', padding: '8px 20px', cursor: 'pointer', marginLeft: 'auto' },
  chatOverlay: { borderTop: '2px solid #111', backgroundColor: '#F9F9F9' },
  // CONSULT-005: Live update panel
  liveUpdatePanel:   { borderTop: '2px solid #111', backgroundColor: '#0a0a0a', padding: '10px 14px', display: 'flex', flexDirection: 'column' as const, gap: 8 },
  liveUpdateHeader:  { display: 'flex', alignItems: 'center', gap: 8 },
  liveDot:           { color: '#EF4444', fontSize: 14, lineHeight: 1 },
  liveLabel:         { fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase' as const, letterSpacing: 1 },
  liveSentConfirm:   { fontFamily: 'monospace', fontSize: 10, color: '#22C55E', marginLeft: 'auto' },
  liveTemplates:     { display: 'flex', flexWrap: 'wrap' as const, gap: 6 },
  liveTemplateBtn:   { fontFamily: 'monospace', fontSize: 10, fontWeight: 700, backgroundColor: 'transparent', color: '#ccc', border: '1px solid #444', padding: '4px 10px', cursor: 'pointer', borderRadius: 4 },
  liveCustomRow:     { display: 'flex', gap: 6 },
  liveCustomInput:   { fontFamily: 'monospace', fontSize: 12, flex: 1, backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #444', borderRadius: 4, padding: '6px 10px', outline: 'none' },
  liveSendBtn:       { fontFamily: 'monospace', fontSize: 14, fontWeight: 700, backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' },
};
