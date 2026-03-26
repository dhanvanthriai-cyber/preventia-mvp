'use client';
/**
 * FullScreenChat.tsx — Full-screen chat shell for Doctor and Patient portals.
 *
 * Renders the full two-pane ChatPanel (channel list + message thread) at viewport
 * height, with a sticky header containing a back-link and the Preventia wordmark.
 */
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { getAppointments } from '@preventia/shared';
import { webTheme } from '@/lib/designSystem';

const ChatPanel = dynamic(() => import('./ChatPanel'), { ssr: false });

interface AllowedPeerOption {
  id: string;
  name?: string;
}

interface FullScreenChatProps {
  /** Display name passed to Stream (shown as sender name) */
  userName?: string;
  /** Backend user id used to resolve allowed chat peers from appointments */
  userId?: number;
  /** Role label shown in the header badge */
  roleLabel?: 'Doctor' | 'Patient';
  /** Back-link destination, e.g. "/doctor" or "/patient" */
  backHref?: string;
  /**
   * Patient→Doctor: if set, auto-opens the channel with this peer on load.
   * Leave undefined on the Doctor side to show the full channel list.
   */
  peerUserId?: string;
  peerName?: string;
}

export default function FullScreenChat({
  userName,
  userId = 0,
  roleLabel = 'Doctor',
  backHref = '/',
  peerUserId,
  peerName,
}: FullScreenChatProps) {
  const [allowedPeers, setAllowedPeers] = useState<AllowedPeerOption[]>([]);

  useEffect(() => {
    if (userId <= 0) {
      setAllowedPeers([]);
      return;
    }

    let cancelled = false;

    const loadAllowedPeers = async () => {
      try {
        const appointments = await getAppointments(roleLabel === 'Doctor' ? { doctorId: userId } : { recipientId: userId });
        if (cancelled) return;

        const nextAllowedPeers = Array.from(
          new Map(
            appointments
              .map((appointment) => roleLabel === 'Doctor'
                ? {
                    id: appointment.recipientId,
                    name: appointment.recipientName ?? (typeof appointment.recipientId === 'number' ? `Patient #${appointment.recipientId}` : undefined),
                  }
                : {
                    id: appointment.doctorId,
                    name: appointment.doctorName ?? (typeof appointment.doctorId === 'number' ? `Doctor #${appointment.doctorId}` : undefined),
                  })
              .filter((peer): peer is { id: number; name: string | undefined } => typeof peer.id === 'number')
              .map((peer) => [String(peer.id), { id: String(peer.id), name: peer.name }] as const),
          ).values(),
        );
        setAllowedPeers(nextAllowedPeers);
      } catch {
        if (!cancelled) {
          setAllowedPeers([]);
        }
      }
    };

    void loadAllowedPeers();

    return () => {
      cancelled = true;
    };
  }, [roleLabel, userId]);

  return (
    <div style={styles.page}>
      {/* ── Header ── */}
      <header style={styles.header}>
        <a href={backHref} style={styles.backLink}>
          ← Back to {roleLabel} Portal
        </a>
        <span style={styles.wordmark}>Preventia</span>
        <span style={styles.badge}>IN-NETWORK CHAT</span>
      </header>

      {/* ── Chat fills the remaining viewport height ── */}
      <main style={styles.main}>
        <div className="dhv-fs-chat" style={styles.chatWrap}>
          <ChatPanel
            userName={userName}
            height={0}           /* height is overridden by flex fill via CSS */
            peerUserId={peerUserId}
            peerName={peerName}
            allowedPeers={allowedPeers}
            remoteComposeSearch={roleLabel === 'Doctor'}
            allowThreadDelete
            embedded={false}     /* show two-pane layout with channel list */
          />
        </div>
      </main>

      <style>{`
        /* Let ChatPanel fill the flex container instead of using a fixed px height */
        .dhv-fs-chat .dhv-chat-root {
          height: 100% !important;
          min-height: 0 !important;
          border-radius: 0 !important;
          border: none !important;
        }
        .dhv-fs-chat .dhv-chat-root .str-chat,
        .dhv-fs-chat .dhv-chat-root .str-chat-channel,
        .dhv-fs-chat .dhv-chat-root .str-chat__container {
          height: 100% !important;
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    backgroundColor: webTheme.colors.background,
    fontFamily: webTheme.font.sans,
    overflow: 'hidden',
  },
  header: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '0 20px',
    height: 52,
    borderBottom: `1px solid ${webTheme.colors.border}`,
    backgroundColor: webTheme.colors.surface,
  },
  backLink: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: webTheme.colors.accentStrong,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  wordmark: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 900,
    fontStyle: 'italic',
    letterSpacing: '-0.03em',
    color: webTheme.colors.text,
  },
  badge: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: webTheme.colors.mutedText,
    whiteSpace: 'nowrap',
  },
  main: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  chatWrap: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
};
