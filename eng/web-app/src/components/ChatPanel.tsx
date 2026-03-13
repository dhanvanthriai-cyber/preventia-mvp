'use client';
/**
 * ChatPanel.tsx — Stream Chat panel for Doctor Dashboard
 * Project Dhanvanthri
 *
 * Fetches a Stream Chat user token from GET /api/v1/chat/token,
 * connects the StreamChat client, and renders a channel list + message view.
 *
 * STUB mode: when the backend returns apiKey === "STUB_KEY" (no credentials
 * configured), a placeholder card is shown instead of the real SDK UI.
 *
 * Neo-Brutalist overrides: monospace font, black borders, 0 border-radius —
 * consistent with DoctorDashboard.tsx and the rest of the portal.
 */
import React, { useEffect, useRef, useState } from 'react';
import { getTokenFromCookie } from '../lib/auth';

// Stream Chat SDK — loaded only on the client (this component is 'use client')
import { StreamChat } from 'stream-chat';
import {
  Chat,
  Channel,
  ChannelList,
  MessageList,
  MessageInput,
  Window,
  type ChannelSort,
  type ChannelFilters,
} from 'stream-chat-react';
// Stream Chat default styles — overridden below via className/style injection
import 'stream-chat-react/dist/css/v2/index.css';

interface ChatTokenResponse {
  token:  string;
  userId: string;
  apiKey: string;
}

interface Props {
  userId?:   number;
  userName?: string;
}

export default function ChatPanel({ userId, userName }: Props) {
  const clientRef = useRef<StreamChat | null>(null);
  const [ready,    setReady]    = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [isStub,   setIsStub]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    const jwt = getTokenFromCookie();
    if (!jwt || !userId) { setLoading(false); return; }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/v1/chat/token', {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: ChatTokenResponse = await res.json();

        if (cancelled) return;

        // STUB mode — credentials not yet configured
        if (data.apiKey === 'STUB_KEY') {
          setIsStub(true);
          setLoading(false);
          return;
        }

        // Connect StreamChat client
        const client = StreamChat.getInstance(data.apiKey);
        clientRef.current = client;

        await client.connectUser(
          { id: data.userId, name: userName ?? data.userId },
          data.token,
        );

        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      // Disconnect on unmount to avoid dangling WebSocket
      clientRef.current?.disconnectUser().catch(() => {});
    };
  }, [userId, userName]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.stateBox}>
        <span style={styles.stateText}>Connecting to chat…</span>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ ...styles.stateBox, borderColor: '#FFC107', backgroundColor: '#FFF3CD' }}>
        <span style={{ ...styles.stateText, color: '#996600' }}>⚠ Chat: {error}</span>
      </div>
    );
  }

  // ── STUB mode ─────────────────────────────────────────────────────────────
  if (isStub || !userId) {
    return (
      <div style={styles.stateBox}>
        <p style={styles.stubTitle}>💬 STREAM CHAT</p>
        <p style={styles.stubSub}>Live chat powered by Stream</p>
        <p style={styles.stubNote}>
          Stream credentials active — waiting for backend connection.
        </p>
      </div>
    );
  }

  // ── Not authenticated ─────────────────────────────────────────────────────
  if (!ready || !clientRef.current) {
    return (
      <div style={styles.stateBox}>
        <span style={styles.stateText}>Chat not available</span>
      </div>
    );
  }

  // ── Live Stream Chat UI ───────────────────────────────────────────────────
  const filters: ChannelFilters = {
    type: 'messaging',
    members: { $in: [userId.toString()] },
  };
  const sort: ChannelSort = { last_message_at: -1 };

  return (
    <div style={styles.chatRoot}>
      <Chat client={clientRef.current} theme="str-chat__theme-light">
        <div style={styles.chatLayout}>
          {/* Channel list — left pane */}
          <div style={styles.channelListPane}>
            <ChannelList
              filters={filters}
              sort={sort}
              additionalChannelSearchProps={{ searchForChannels: true }}
            />
          </div>
          {/* Message pane — right */}
          <div style={styles.channelPane}>
            <Channel>
              <Window>
                <MessageList />
                <MessageInput />
              </Window>
            </Channel>
          </div>
        </div>
      </Chat>

      {/* Neo-Brutalist style overrides injected as a <style> tag */}
      <style>{STREAM_OVERRIDES}</style>
    </div>
  );
}

// ── Inline style overrides for Neo-Brutalist theme ────────────────────────────
// Targets Stream Chat's BEM class names to match the portal aesthetic.
const STREAM_OVERRIDES = `
  .str-chat__channel-list { border-right: 2px solid #111 !important; }
  .str-chat__channel-preview-messenger { border-bottom: 1px solid #eee !important; border-radius: 0 !important; font-family: monospace !important; }
  .str-chat__channel-preview-messenger--active { background: #F5F5F5 !important; border-left: 4px solid #22C55E !important; }
  .str-chat__channel-preview-messenger__name { font-family: monospace !important; font-weight: 700 !important; font-size: 12px !important; }
  .str-chat__message-simple { font-family: monospace !important; }
  .str-chat__message-input { border-top: 2px solid #111 !important; border-radius: 0 !important; }
  .str-chat__message-input textarea { font-family: monospace !important; border-radius: 0 !important; }
  .str-chat__send-button { border-radius: 0 !important; background: #000 !important; }
  .str-chat__header-livestream { border-bottom: 2px solid #111 !important; font-family: monospace !important; border-radius: 0 !important; }
`;

const styles: Record<string, React.CSSProperties> = {
  chatRoot: { border: '3px solid #111', overflow: 'hidden', minHeight: 360, fontFamily: 'monospace' },
  chatLayout: { display: 'flex', height: 360 },
  channelListPane: { width: 200, borderRight: '2px solid #111', overflowY: 'auto', flexShrink: 0 },
  channelPane: { flex: 1, overflow: 'hidden' },
  stateBox: {
    border: '2px solid #111', padding: 20, minHeight: 120,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 8, textAlign: 'center',
    backgroundColor: '#F5F5F5',
  },
  stateText:  { fontFamily: 'monospace', fontSize: 12, color: '#666' },
  stubTitle:  { fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#000', margin: 0 },
  stubSub:    { fontFamily: 'monospace', fontSize: 11, color: '#555', margin: 0 },
  stubNote:   { fontFamily: 'monospace', fontSize: 10, color: '#888', margin: 0 },
};
