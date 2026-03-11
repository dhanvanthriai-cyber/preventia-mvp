/**
 * ConsultationScreen.tsx
 * Project Dhanvanthri — Virtual Consultation Room (Mobile)
 *
 * Mockup reference: "Virtual consultation Room.jpeg"
 * Design: Neo-Brutalist Wellness — black video area, Trust Blue CTA,
 * circular control buttons, CONNECTED (HD) status badge, recording indicator.
 *
 * Library: @daily-co/react-native-daily-js
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
// @ts-ignore — daily-co types may not be bundled; type as any for RN compat
import Daily, { DailyMediaView } from '@daily-co/react-native-daily-js';
import { Colors, Shadows, Spacing, Typography } from '../../theme/theme';
import { useDailySession } from './useDailySession';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConsultationScreenProps {
  roomUrl: string;
  token: string;
  appointmentId: number;
  onSessionEnd: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ConsultationScreen: React.FC<ConsultationScreenProps> = ({
  roomUrl,
  token,
  appointmentId,
  onSessionEnd,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0); // seconds

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { join, leave, participantCount, isJoined, error } = useDailySession({
    roomUrl,
    token,
    appointmentId,
  });

  // ── Session timer (mirrors "REC: 00:08:45" from mockup) ──────────────────
  useEffect(() => {
    if (isJoined) {
      timerRef.current = setInterval(() => {
        setSessionTimer((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isJoined]);

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleJoin = useCallback(async () => {
    await join();
  }, [join]);

  const handleEndCall = useCallback(async () => {
    await leave();
    onSessionEnd();
  }, [leave, onSessionEnd]);

  const handleToggleMute = useCallback(() => {
    // Mute/unmute local audio via Daily instance
    try {
      const callObject = Daily.getCallInstance?.();
      if (callObject) {
        callObject.setLocalAudio(isMuted); // toggle: if currently muted, re-enable
      }
    } catch (_) {
      // Graceful fallback if Daily instance not yet available
    }
    setIsMuted((prev) => !prev);
  }, [isMuted]);

  const handleToggleCamera = useCallback(() => {
    try {
      const callObject = Daily.getCallInstance?.();
      if (callObject) {
        callObject.setLocalVideo(isCameraOff);
      }
    } catch (_) {}
    setIsCameraOff((prev) => !prev);
  }, [isCameraOff]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} testID="consultation-screen">
      <StatusBar barStyle="light-content" backgroundColor={Colors.black} />

      {/* ── Top Status Bar (mirrors "EXIT ROOM / LIVE ENCOUNTER / CONNECTED HD") ── */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {isJoined ? 'LIVE ENCOUNTER' : 'VIRTUAL CALL'}
        </Text>

        {isJoined && (
          <View style={styles.recBadge}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>REC {formatTimer(sessionTimer)}</Text>
          </View>
        )}

        {/* Participant count badge — JetBrains Mono per spec */}
        <View style={styles.participantBadge} testID="participant-badge">
          <Text style={styles.participantText}>
            {participantCount} CONNECTED (HD)
          </Text>
        </View>
      </View>

      {/* ── "Session Active" banner — Trust Blue when joined ── */}
      {isJoined && (
        <View style={styles.sessionActiveBanner} testID="session-active-banner">
          <Text style={styles.sessionActiveBannerText}>● SESSION ACTIVE</Text>
        </View>
      )}

      {/* ── Error banner ── */}
      {error !== null && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── Full-screen video area (black background, per mockup) ── */}
      <View style={styles.videoContainer} testID="video-container">
        {isJoined ? (
          <>
            {/* Remote participant video */}
            <DailyMediaView
              videoTrackState={null}
              audioTrackState={null}
              mirror={false}
              zoomMode="fill"
              style={styles.remoteVideo}
              testID="remote-video"
            />

            {/* PiP self-view — top-right, mirrors mockup */}
            <View style={styles.selfViewContainer}>
              <DailyMediaView
                videoTrackState={null}
                audioTrackState={null}
                mirror={true}
                zoomMode="fill"
                style={styles.selfView}
                testID="self-view"
              />
              <Text style={styles.selfViewLabel}>YOU</Text>
            </View>

            {/* Patient name label at bottom of video (per mockup) */}
            <View style={styles.patientLabel}>
              <Text style={styles.patientLabelText}>DR. / PATIENT</Text>
            </View>
          </>
        ) : (
          /* Pre-join state — matches mockup's dark placeholder */
          <View style={styles.preJoinOverlay} testID="pre-join-overlay">
            <Text style={styles.preJoinTitle}>VIRTUAL CALL</Text>
            <Text style={styles.preJoinSubtitle}>
              Room ready · {participantCount} participant(s)
            </Text>

            {/* Join Call button — Trust Blue per spec */}
            <Pressable
              style={styles.joinButton}
              onPress={handleJoin}
              testID="join-call-button"
              accessibilityLabel="Join Call"
              accessibilityRole="button"
            >
              <Text style={styles.joinButtonText}>JOIN CALL</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Bottom Control Bar (2px black border top per spec, circular buttons) ── */}
      <View style={styles.controlBar} testID="control-bar">
        {/* Mute button */}
        <Pressable
          style={[styles.controlButton, isMuted && styles.controlButtonActive]}
          onPress={handleToggleMute}
          testID="mute-button"
          accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          accessibilityRole="button"
        >
          <Text style={styles.controlButtonIcon}>
            {isMuted ? '🔇' : '🎙'}
          </Text>
          <Text style={styles.controlButtonLabel}>
            {isMuted ? 'UNMUTE' : 'MUTE'}
          </Text>
        </Pressable>

        {/* Camera button */}
        <Pressable
          style={[
            styles.controlButton,
            isCameraOff && styles.controlButtonActive,
          ]}
          onPress={handleToggleCamera}
          testID="camera-button"
          accessibilityLabel={isCameraOff ? 'Enable camera' : 'Disable camera'}
          accessibilityRole="button"
        >
          <Text style={styles.controlButtonIcon}>
            {isCameraOff ? '🚫' : '📷'}
          </Text>
          <Text style={styles.controlButtonLabel}>
            {isCameraOff ? 'CAM OFF' : 'CAMERA'}
          </Text>
        </Pressable>

        {/* End Call button — Trust Blue background per spec */}
        <Pressable
          style={styles.endCallButton}
          onPress={handleEndCall}
          testID="end-call-button"
          accessibilityLabel="End call"
          accessibilityRole="button"
        >
          <Text style={styles.endCallIcon}>📵</Text>
          <Text style={styles.endCallLabel}>END CALL</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.black,
  },

  // ── Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.black,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: Colors.white,
  },
  topBarTitle: {
    ...Typography.value,
    color: Colors.white,
    fontSize: 12,
    letterSpacing: 1.5,
    flex: 1,
  },
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  recDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.alertRed,
    marginRight: 4,
  },
  recText: {
    ...Typography.valueSmall,
    color: Colors.alertRed,
  },
  participantBadge: {
    borderWidth: 1,
    borderColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  participantText: {
    ...Typography.valueSmall,
    color: Colors.white,
    fontSize: 10,
  },

  // ── Session Active banner
  sessionActiveBanner: {
    backgroundColor: Colors.trustBlue,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  sessionActiveBannerText: {
    ...Typography.valueSmall,
    color: Colors.white,
    letterSpacing: 2,
  },

  // ── Error banner
  errorBanner: {
    backgroundColor: Colors.alertRed,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.white,
    fontSize: 13,
  },

  // ── Video area
  videoContainer: {
    flex: 1,
    backgroundColor: Colors.black,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  selfViewContainer: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 90,
    height: 120,
    borderWidth: 2,
    borderColor: Colors.white,
    overflow: 'hidden',
  },
  selfView: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  selfViewLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    ...Typography.valueSmall,
    color: Colors.white,
    fontSize: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 3,
  },
  patientLabel: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  patientLabelText: {
    ...Typography.valueSmall,
    color: Colors.white,
    fontSize: 11,
  },

  // ── Pre-join overlay
  preJoinOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  preJoinTitle: {
    ...Typography.heading,
    color: Colors.white,
    marginBottom: Spacing.sm,
    letterSpacing: 3,
  },
  preJoinSubtitle: {
    ...Typography.body,
    color: '#aaaaaa',
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  joinButton: {
    backgroundColor: Colors.trustBlue,
    borderWidth: 2,
    borderColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl * 2,
    ...Shadows.card,
  },
  joinButtonText: {
    ...Typography.value,
    color: Colors.white,
    letterSpacing: 3,
  },

  // ── Control bar
  controlBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    backgroundColor: Colors.black,
    borderTopWidth: 2,
    borderTopColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: 36, // circular per mockup
    borderWidth: 2,
    borderColor: Colors.white,
    backgroundColor: '#1a1a1a',
  },
  controlButtonActive: {
    borderColor: Colors.alertRed,
    backgroundColor: '#2a1010',
  },
  controlButtonIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  controlButtonLabel: {
    ...Typography.valueSmall,
    color: Colors.white,
    fontSize: 8,
    letterSpacing: 1,
  },
  endCallButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40, // circular per mockup
    borderWidth: 2,
    borderColor: Colors.trustBlue,
    backgroundColor: Colors.trustBlue,
    ...Shadows.card,
  },
  endCallIcon: {
    fontSize: 26,
    marginBottom: 2,
  },
  endCallLabel: {
    ...Typography.valueSmall,
    color: Colors.white,
    fontSize: 8,
    letterSpacing: 1,
  },
});

export default ConsultationScreen;
