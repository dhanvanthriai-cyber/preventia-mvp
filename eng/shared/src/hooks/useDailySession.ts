/**
 * useDailySession.ts
 * Project Preventia — Daily.co session management hook
 *
 * Uses @daily-co/daily-js (web SDK — works in Expo web + Expo Go).
 * Handles participant events and calls backend appointment endpoints:
 *   PUT /api/v1/appointments/{id}/activate  — on local join
 *   PUT /api/v1/appointments/{id}/complete  — on call end or all leave
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Daily from '@daily-co/daily-js';
import type { DailyCall, DailyParticipant, DailyEvent } from '@daily-co/daily-js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseDailySessionOptions {
  roomUrl: string;
  /** Daily.co meeting token (room credential). */
  meetingToken: string;
  appointmentId: number;
  /** Preventia JWT — sent as Authorization: Bearer on API calls. */
  authToken?: string;
  /** Base URL for the Preventia Spring Boot API (defaults to env var). */
  apiBaseUrl?: string;
}

interface UseDailySessionReturn {
  /** Join the Daily.co room */
  join: () => Promise<void>;
  /** Leave the room and trigger backend completion */
  leave: () => Promise<void>;
  /** Number of remote participants currently in the call */
  participantCount: number;
  /** Whether the local user has successfully joined */
  isJoined: boolean;
  /** Last error message, null when healthy */
  error: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_API_BASE =
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL) ||
  'http://localhost:8080';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDailySession({
  roomUrl,
  meetingToken,
  appointmentId,
  authToken,
  apiBaseUrl = DEFAULT_API_BASE,
}: UseDailySessionOptions): UseDailySessionReturn {
  const callRef = useRef<DailyCall | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ── Backend helpers ───────────────────────────────────────────────────────

  const activateAppointment = useCallback(async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(
        `${apiBaseUrl}/api/v1/appointments/${appointmentId}/activate`,
        { method: 'PUT', headers },
      );
      if (!res.ok) {
        console.warn(
          `[useDailySession] activate endpoint returned ${res.status}`,
        );
      }
    } catch (err) {
      console.error('[useDailySession] activateAppointment error:', err);
    }
  }, [apiBaseUrl, appointmentId, authToken]);

  const completeAppointment = useCallback(async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const res = await fetch(
        `${apiBaseUrl}/api/v1/appointments/${appointmentId}/complete`,
        { method: 'PUT', headers },
      );
      if (!res.ok) {
        console.warn(
          `[useDailySession] complete endpoint returned ${res.status}`,
        );
      }
    } catch (err) {
      console.error('[useDailySession] completeAppointment error:', err);
    }
  }, [apiBaseUrl, appointmentId, authToken]);

  // ── Participant count from call object ────────────────────────────────────

  const refreshParticipantCount = useCallback(() => {
    if (!callRef.current) return;
    try {
      const participants = callRef.current.participants();
      // Exclude local participant from the remote count
      const remoteCount = Object.values(participants).filter(
        (p: DailyParticipant) => !p.local,
      ).length;
      setParticipantCount(remoteCount);
    } catch (_) {
      // participants() may throw before call is fully initialised
    }
  }, []);

  // ── Join ──────────────────────────────────────────────────────────────────

  const join = useCallback(async () => {
    setError(null);
    try {
      // Create a new Daily call object
      const callObject: DailyCall = Daily.createCallObject();
      callRef.current = callObject;

      // ── Event: joined-meeting (local participant joined) ────────────────
      callObject.on('joined-meeting' as DailyEvent, async () => {
        setIsJoined(true);
        refreshParticipantCount();
        await activateAppointment();
      });

      // ── Event: participant-joined ────────────────────────────────────────
      callObject.on(
        'participant-joined' as DailyEvent,
        (_event: unknown) => {
          refreshParticipantCount();
        },
      );

      // ── Event: participant-left ──────────────────────────────────────────
      callObject.on(
        'participant-left' as DailyEvent,
        (_event: unknown) => {
          refreshParticipantCount();
        },
      );

      // ── Event: left-meeting ──────────────────────────────────────────────
      callObject.on('left-meeting' as DailyEvent, async () => {
        setIsJoined(false);
        setParticipantCount(0);
        await completeAppointment();
      });

      // ── Event: error ─────────────────────────────────────────────────────
      callObject.on('error' as DailyEvent, (evt: unknown) => {
        const msg =
          (evt as { errorMsg?: string })?.errorMsg ?? 'Daily.co error';
        setError(msg);
        console.error('[useDailySession] Daily error:', evt);
      });

      // Join the room
      await callObject.join({ url: roomUrl, token: meetingToken });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to join call';
      setError(message);
      console.error('[useDailySession] join error:', err);
    }
  }, [
    roomUrl,
    meetingToken,
    activateAppointment,
    completeAppointment,
    refreshParticipantCount,
  ]);

  // ── Leave ─────────────────────────────────────────────────────────────────

  const leave = useCallback(async () => {
    if (!callRef.current) return;
    try {
      await callRef.current.leave();
      callRef.current.destroy();
      callRef.current = null;
    } catch (err) {
      console.error('[useDailySession] leave error:', err);
    }
    setIsJoined(false);
    setParticipantCount(0);
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (callRef.current) {
        callRef.current.leave().catch(() => {});
        callRef.current.destroy?.();
        callRef.current = null;
      }
    };
  }, []);

  return { join, leave, participantCount, isJoined, error };
}

export default useDailySession;
