'use client';
/**
 * useConsultationRoom — Daily.co room lifecycle hook (web)
 *
 * Joins a Daily.co room with the doctorToken, listens for:
 *  - meeting-joined  → sets state to ACTIVE (belt+suspenders, backend already does this)
 *  - meeting-ended   → calls completeAppointment() → sets local status to LOCKED
 *  - participant-updated, etc.
 *
 * No HMAC here — that's the backend's job. We just react to SDK events.
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
        setState(s => ({ ...s, error: String((ev as { errorMsg?: string })?.errorMsg ?? 'Daily.co error'), roomStatus: 'IDLE' }));
      });

      co.on('participant-updated', () => {
        const count = Object.keys(co.participants()).length;
        setState(s => ({ ...s, participantCount: count }));
      });

      await co.join({ url: roomUrl, token: doctorToken });
    } catch (e) {
      setState(s => ({ ...s, error: String(e), roomStatus: 'IDLE' }));
    }
  }, [roomUrl, doctorToken, appointmentId]);

  const leave = useCallback(async () => {
    await callRef.current?.leave();
  }, []);

  useEffect(() => {
    return () => {
      callRef.current?.destroy();
      callRef.current = null;
    };
  }, []);

  return { ...state, join, leave };
}
