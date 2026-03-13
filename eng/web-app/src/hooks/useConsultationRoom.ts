'use client';
/**
 * useConsultationRoom — Daily.co room lifecycle hook (web)
 *
 * Joins a Daily.co room with the doctorToken, listens for:
 *  - joined-meeting  → sets state to ACTIVE
 *  - left-meeting    → calls completeAppointment() → sets local status to LOCKED
 *  - participant-updated → tracks participant count
 *
 * startCamera() is called immediately after createCallObject() to request
 * camera/mic permissions early — before the user clicks JOIN — so the
 * browser permission prompt does not interrupt the join flow.
 *
 * No HMAC here — that's the backend's job.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';
import { completeAppointment } from '@dhanvanthri/shared';
import type { AppointmentStatus } from '@dhanvanthri/shared';

export interface ConsultationRoomState {
  callObject: DailyCall | null;
  roomStatus: AppointmentStatus | 'JOINING' | 'IDLE';
  participantCount: number;
  error: string | null;
}

export function useConsultationRoom(
  roomUrl: string | null,
  doctorToken: string | null,
  appointmentId: number | null,
) {
  const callRef = useRef<DailyCall | null>(null);
  const [state, setState] = useState<ConsultationRoomState>({
    callObject: null,
    roomStatus: 'IDLE',
    participantCount: 0,
    error: null,
  });

  const join = useCallback(async () => {
    if (!roomUrl || !doctorToken || !appointmentId) return;
    if (callRef.current) return; // already joined

    setState(s => ({ ...s, roomStatus: 'JOINING', error: null }));

    try {
      const co = DailyIframe.createCallObject();
      callRef.current = co;

      // ── Initialize media devices immediately after createCallObject ──────────
      // This triggers the browser camera/mic permission prompt before join()
      // so the user grants access up-front rather than mid-join.
      try {
        await co.startCamera();
      } catch (permErr) {
        // Permission denied or device unavailable — surface as styled error banner
        const msg =
          (permErr as { errorMsg?: string })?.errorMsg ??
          (permErr instanceof Error ? permErr.message : String(permErr));
        setState(s => ({
          ...s,
          error: `Camera / microphone access denied: ${msg}. Please allow permissions and try again.`,
          roomStatus: 'IDLE',
        }));
        callRef.current?.destroy();
        callRef.current = null;
        return;
      }

      // ── Event listeners ──────────────────────────────────────────────────────
      co.on('joined-meeting', () => {
        setState(s => ({ ...s, roomStatus: 'ACTIVE', callObject: co }));
      });

      co.on('left-meeting', async () => {
        // Doctor left — mark appointment COMPLETED on backend, then LOCKED
        try {
          await completeAppointment(appointmentId);
        } catch (e) {
          console.error('[useConsultationRoom] completeAppointment failed:', e);
        }
        setState(s => ({ ...s, roomStatus: 'LOCKED', callObject: null }));
        callRef.current?.destroy();
        callRef.current = null;
      });

      co.on('error', (ev) => {
        const msg = String((ev as { errorMsg?: string })?.errorMsg ?? 'Daily.co error');
        setState(s => ({ ...s, error: msg, roomStatus: 'IDLE' }));
      });

      co.on('participant-updated', () => {
        const count = Object.keys(co.participants()).length;
        setState(s => ({ ...s, participantCount: count }));
      });

      await co.join({ url: roomUrl, token: doctorToken });
    } catch (e) {
      setState(s => ({ ...s, error: String(e), roomStatus: 'IDLE' }));
      callRef.current?.destroy();
      callRef.current = null;
    }
  }, [roomUrl, doctorToken, appointmentId]);

  const leave = useCallback(async () => {
    await callRef.current?.leave();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      callRef.current?.destroy();
      callRef.current = null;
    };
  }, []);

  return { ...state, join, leave };
}
