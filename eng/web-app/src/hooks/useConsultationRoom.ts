'use client';
/**
 * useConsultationRoom — Daily.co room lifecycle hook (web)
 *
 * Uses DailyIframe.createFrame() exclusively — no headless createCallObject().
 * Having both on the same page causes "Duplicate DailyIframe instances" error.
 *
 * The frame is attached to the div ref passed in, listens for:
 *  - joined-meeting      → ACTIVE
 *  - left-meeting        → completeAppointment() → LOCKED
 *  - participant-updated → participantCount
 *  - error               → surfaces error banner
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

export type RoomStatus = AppointmentStatus | 'JOINING' | 'IDLE';

export interface ConsultationRoomState {
  roomStatus: RoomStatus;
  participantCount: number;
  error: string | null;
}

export function useConsultationRoom(
  containerRef: React.RefObject<HTMLDivElement>,
  roomUrl: string | null,
  token: string | null,
  appointmentId: number | null,
) {
  const frameRef = useRef<DailyCall | null>(null);
  const [state, setState] = useState<ConsultationRoomState>({
    roomStatus: 'IDLE',
    participantCount: 0,
    error: null,
  });

  const join = useCallback(async () => {
    if (!roomUrl || !token || !appointmentId || !containerRef.current) return;
    if (frameRef.current) return; // already joined

    setState(s => ({ ...s, roomStatus: 'JOINING', error: null }));

    try {
      const frame = DailyIframe.createFrame(containerRef.current, {
        url:                 roomUrl,
        token:               token,
        showLeaveButton:     false,
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
        setState(s => ({ ...s, error: msg, roomStatus: 'IDLE' }));
      });

      frame.on('participant-updated', () => {
        const count = Object.keys(frame.participants() ?? {}).length;
        setState(s => ({ ...s, participantCount: count }));
      });

      await frame.join({ url: roomUrl, token });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setState(s => ({ ...s, error: msg, roomStatus: 'IDLE' }));
      frameRef.current?.destroy();
      frameRef.current = null;
    }
  }, [roomUrl, token, appointmentId, containerRef]);

  const leave = useCallback(async () => {
    await frameRef.current?.leave();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      frameRef.current?.destroy();
      frameRef.current = null;
    };
  }, []);

  return { ...state, join, leave };
}
