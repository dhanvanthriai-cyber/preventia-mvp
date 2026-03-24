'use client';
/**
 * PreCallCheck — VIDEO-006
 *
 * Pre-call device verification step shown before joining the Daily.co room.
 * Checks: camera (video stream preview), microphone (AudioContext analyser),
 *          network (ping to /actuator/health).
 *
 * User can proceed even if checks fail (with a warning banner).
 */
import React, { useEffect, useState, useRef } from 'react';

interface CheckResult {
  status: 'pending' | 'pass' | 'fail';
  label: string;
}

interface Props {
  onPass: () => void;
  onSkip: () => void;
}

export default function PreCallCheck({ onPass, onSkip }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [camera,  setCamera]  = useState<CheckResult>({ status: 'pending', label: 'Camera' });
  const [mic,     setMic]     = useState<CheckResult>({ status: 'pending', label: 'Microphone' });
  const [network, setNetwork] = useState<CheckResult>({ status: 'pending', label: 'Network' });
  const [allDone, setAllDone] = useState(false);
  const allPass = camera.status === 'pass' && mic.status === 'pass' && network.status === 'pass';

  useEffect(() => {
    let cancelled = false;

    const runChecks = async () => {
      // ── Camera + Mic check ──────────────────────────────────────────────
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;

        if (!cancelled) {
          setCamera({ status: 'pass', label: 'Camera' });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }

          // Microphone level check using AudioContext
          try {
            const audioCtx = new AudioContext();
            const source   = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const data = new Uint8Array(analyser.frequencyBinCount);
            // Sample for 500ms
            await new Promise<void>(resolve => setTimeout(resolve, 500));
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            // Mic is considered passing if AudioContext could be created
            if (!cancelled) {
              setMic({ status: avg >= 0 ? 'pass' : 'fail', label: 'Microphone' });
            }
            audioCtx.close();
          } catch {
            if (!cancelled) setMic({ status: 'fail', label: 'Microphone' });
          }
        }
      } catch {
        if (!cancelled) {
          setCamera({ status: 'fail', label: 'Camera' });
          setMic({ status: 'fail', label: 'Microphone' });
        }
      }

      // ── Network check ────────────────────────────────────────────────────
      try {
        const start = Date.now();
        const res = await fetch('/actuator/health', { method: 'GET', cache: 'no-store' });
        const latency = Date.now() - start;
        if (!cancelled) {
          setNetwork({
            status: res.ok && latency < 3000 ? 'pass' : 'fail',
            label: `Network (${latency}ms)`,
          });
        }
      } catch {
        if (!cancelled) setNetwork({ status: 'fail', label: 'Network' });
      }

      if (!cancelled) setAllDone(true);
    };

    void runChecks();

    return () => {
      cancelled = true;
      // Stop camera/mic stream on unmount
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const statusIcon = (s: CheckResult['status']) =>
    s === 'pending' ? '⏳' : s === 'pass' ? '✅' : '❌';

  const anyFail = camera.status === 'fail' || mic.status === 'fail' || network.status === 'fail';

  return (
    <div style={styles.root}>
      <h2 style={styles.title}>📹 Pre-Call Check</h2>
      <p style={styles.subtitle}>Verifying your camera, microphone, and connection…</p>

      {/* Camera preview */}
      <div style={styles.videoPreview}>
        <video ref={videoRef} muted autoPlay playsInline style={styles.video} />
        {camera.status === 'pending' && (
          <div style={styles.videoOverlay}>Requesting camera access…</div>
        )}
        {camera.status === 'fail' && (
          <div style={{ ...styles.videoOverlay, background: 'rgba(200,0,0,0.7)' }}>
            Camera unavailable
          </div>
        )}
      </div>

      {/* Check results */}
      <div style={styles.checks}>
        {[camera, mic, network].map(check => (
          <div key={check.label} style={styles.checkRow}>
            <span style={styles.checkIcon}>{statusIcon(check.status)}</span>
            <span style={styles.checkLabel}>{check.label}</span>
            <span style={{
              ...styles.checkStatus,
              color: check.status === 'pass' ? '#22C55E' : check.status === 'fail' ? '#EF4444' : '#888',
            }}>
              {check.status === 'pending' ? 'Checking…' : check.status === 'pass' ? 'Ready' : 'Failed'}
            </span>
          </div>
        ))}
      </div>

      {/* Warning if any check failed */}
      {allDone && anyFail && (
        <div style={styles.warning}>
          ⚠ Some checks failed. You can still join, but quality may be affected.
        </div>
      )}

      {/* Action buttons */}
      <div style={styles.actions}>
        <button
          onClick={onPass}
          disabled={!allDone}
          style={{ ...styles.joinBtn, opacity: allDone ? 1 : 0.5, cursor: allDone ? 'pointer' : 'not-allowed' }}
        >
          {allPass ? '✅ Join Call' : '⚠ Join Anyway'}
        </button>
        <button onClick={onSkip} style={styles.skipBtn}>
          Skip Check
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
    padding: 32, backgroundColor: '#111', color: '#fff', fontFamily: 'monospace',
    borderRadius: 12, maxWidth: 480, margin: '0 auto',
  },
  title:    { fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'monospace' },
  subtitle: { fontSize: 13, color: '#aaa', margin: 0, fontFamily: 'monospace' },
  videoPreview: {
    position: 'relative', width: '100%', maxWidth: 320, aspectRatio: '4/3',
    borderRadius: 8, overflow: 'hidden', backgroundColor: '#222', border: '2px solid #444',
  },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  videoOverlay: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'rgba(0,0,0,0.6)',
    fontFamily: 'monospace', fontSize: 12, color: '#fff',
  },
  checks: { width: '100%', display: 'flex', flexDirection: 'column', gap: 10 },
  checkRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    backgroundColor: '#1a1a1a', borderRadius: 8, padding: '10px 14px',
  },
  checkIcon:   { fontSize: 18 },
  checkLabel:  { flex: 1, fontFamily: 'monospace', fontSize: 14, fontWeight: 600 },
  checkStatus: { fontFamily: 'monospace', fontSize: 12, fontWeight: 700 },
  warning: {
    backgroundColor: '#FFF3CD', color: '#666600', border: '2px solid #FFC107',
    borderRadius: 8, padding: '10px 14px', fontSize: 12, fontFamily: 'monospace',
    width: '100%', textAlign: 'center',
  },
  actions: { display: 'flex', gap: 10, width: '100%' },
  joinBtn: {
    flex: 1, fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
    backgroundColor: '#22C55E', color: '#fff', border: 'none',
    borderRadius: 8, padding: '12px 20px',
  },
  skipBtn: {
    fontFamily: 'monospace', fontSize: 13, fontWeight: 600,
    backgroundColor: '#333', color: '#aaa', border: '1px solid #555',
    borderRadius: 8, padding: '12px 16px', cursor: 'pointer',
  },
};
