'use client';
/**
 * useConsultationRoom — Daily.co room lifecycle hook (web)
 *
 * Uses DailyIframe.createFrame() exclusively — no headless createCallObject().
 * Having both on the same page causes "Duplicate DailyIframe instances" error.
 *
 * The frame is attached to the div ref passed in, listens for:
 *  - joined-meeting        → ACTIVE
 *  - left-meeting          → completeAppointment() → LOCKED
 *  - participant-updated   → participantCount
 *  - network-quality-change → VIDEO-003 audio-only / chat fallback detection
 *  - error                 → surfaces error banner; after 3 failures → CHAT_FALLBACK
 *
 * SPRINT-08:
 *  - VIDEO-003: Audio-only suggestion on poor network (quality score 1/5 for 10s)
 *  - CONSULT-006: CHAT_FALLBACK state after 3 failed join attempts
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';
import type { DailyCall } from '@daily-co/daily-js';
import { getTokenFromCookie } from '@/lib/auth';
import type { AppointmentStatus } from '@preventia/shared';

/** PUT a state-transition endpoint with the user's JWT — bypasses shared client */
async function putAppointmentState(appointmentId: number, action: 'activate' | 'complete') {
  const jwt = getTokenFromCookie();
  if (!jwt) return;
  await fetch(`/api/v1/appointments/${appointmentId}/${action}`, {
    method:  'PUT',
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

/** PUT /api/v1/appointments/{id}/flag-chat-fallback — notifies backend of CHAT_FALLBACK */
async function flagChatFallback(appointmentId: number) {
  const jwt = getTokenFromCookie();
  if (!jwt) return;
  await fetch(`/api/v1/appointments/${appointmentId}/flag-chat-fallback`, {
    method:  'PUT',
    headers: { Authorization: `Bearer ${jwt}` },
  }).catch(e => console.error('[useConsultationRoom] flag-chat-fallback failed:', e));
}

export type RoomStatus = AppointmentStatus | 'JOINING' | 'IDLE' | 'CHAT_FALLBACK';

export interface ConsultationRoomState {
  roomStatus:          RoomStatus;
  participantCount:    number;
  error:               string | null;
  /** VIDEO-003: true when network quality is poor — suggest audio-only */
  suggestAudioOnly:    boolean;
  /** VIDEO-003: true when audio is also failing — escalate to chat fallback */
  audioFailed:         boolean;
}

const MAX_JOIN_ATTEMPTS = 3;

// Duration (ms) of sustained poor network quality before surfacing audio-only suggestion
const POOR_NETWORK_THRESHOLD_MS = 10_000;

export function useConsultationRoom(
  containerRef: React.RefObject<HTMLDivElement>,
  roomUrl: string | null,
  token: string | null,
  appointmentId: number | null,
) {
  const frameRef        = useRef<DailyCall | null>(null);
  const joinAttempts    = useRef(0);
  const poorNetworkSince = useRef<number | null>(null);
  const poorNetworkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<ConsultationRoomState>({
    roomStatus:       'IDLE',
    participantCount: 0,
    error:            null,
    suggestAudioOnly: false,
    audioFailed:      false,
  });

  const join = useCallback(async () => {
    if (!roomUrl || !token || !appointmentId || !containerRef.current) return;
    if (frameRef.current) return; // already joined

    joinAttempts.current += 1;
    setState(s => ({ ...s, roomStatus: 'JOINING', error: null }));

    try {
      const frame = DailyIframe.createFrame(containerRef.current, {
        url:                  roomUrl,
        token:                token,
        showLeaveButton:      false,
        showFullscreenButton: true,
        iframeStyle: {
          position: 'absolute',
          top:      '0',
          left:     '0',
          width:    '100%',
          height:   '100%',
          border:   'none',
        },
      });
      frameRef.current = frame;

      frame.on('joined-meeting', () => {
        // Successful join — reset attempt counter
        joinAttempts.current = 0;
        setState(s => ({ ...s, roomStatus: 'ACTIVE' }));
        putAppointmentState(appointmentId, 'activate').catch(e =>
          console.error('[useConsultationRoom] activate failed:', e)
        );
      });

      frame.on('left-meeting', async () => {
        try { await putAppointmentState(appointmentId, 'complete'); }
        catch (e) { console.error('[useConsultationRoom] complete failed:', e); }
        setState(s => ({ ...s, roomStatus: 'LOCKED' }));
        frameRef.current?.destroy();
        frameRef.current = null;
      });

      frame.on('error', (ev) => {
        const msg = String((ev as { errorMsg?: string })?.errorMsg ?? 'Daily.co error');

        if (joinAttempts.current >= MAX_JOIN_ATTEMPTS) {
          // CONSULT-006: Escalate to chat fallback after MAX_JOIN_ATTEMPTS
          setState(s => ({ ...s, error: msg, roomStatus: 'CHAT_FALLBACK' }));
          if (appointmentId) {
            flagChatFallback(appointmentId);
          }
        } else {
          setState(s => ({ ...s, error: msg, roomStatus: 'IDLE' }));
        }

        frameRef.current?.destroy();
        frameRef.current = null;
      });

      frame.on('participant-updated', () => {
        const count = Object.keys(frame.participants() ?? {}).length;
        setState(s => ({ ...s, participantCount: count }));
      });

      // VIDEO-003: Network quality monitoring
      frame.on('network-quality-change', (ev) => {
        const quality = (ev as { quality?: number })?.quality ?? 5;

        if (quality <= 1) {
          // Poor network: start timer if not already running
          if (poorNetworkSince.current === null) {
            poorNetworkSince.current = Date.now();
            poorNetworkTimer.current = setTimeout(() => {
              setState(s => ({ ...s, suggestAudioOnly: true }));
            }, POOR_NETWORK_THRESHOLD_MS);
          }
        } else {
          // Network recovered
          if (poorNetworkTimer.current) {
            clearTimeout(poorNetworkTimer.current);
            poorNetworkTimer.current = null;
          }
          poorNetworkSince.current = null;
          setState(s => ({ ...s, suggestAudioOnly: false }));
        }
      });

      await frame.join({ url: roomUrl, token });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);

      if (joinAttempts.current >= MAX_JOIN_ATTEMPTS) {
        // CONSULT-006: Chat fallback after repeated failures
        setState(s => ({ ...s, error: msg, roomStatus: 'CHAT_FALLBACK' }));
        if (appointmentId) {
          flagChatFallback(appointmentId);
        }
      } else {
        setState(s => ({ ...s, error: msg, roomStatus: 'IDLE' }));
      }

      frameRef.current?.destroy();
      frameRef.current = null;
    }
  }, [roomUrl, token, appointmentId, containerRef]);

  /** VIDEO-003: Switch to audio-only mode by disabling local video track. */
  const switchToAudioOnly = useCallback(() => {
    if (frameRef.current) {
      frameRef.current.updateParticipant('local', { setVideo: false });
      setState(s => ({ ...s, suggestAudioOnly: false }));
    }
  }, []);

  const leave = useCallback(async () => {
    await frameRef.current?.leave();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (poorNetworkTimer.current) clearTimeout(poorNetworkTimer.current);
      frameRef.current?.destroy();
      frameRef.current = null;
    };
  }, []);

  return { ...state, join, leave, switchToAudioOnly };
}
