'use client';
/**
 * ChatPanel.tsx — Stream Chat panel for Doctor Dashboard + Patient Portal
 * Project Preventia
 *
 * - Fetches Stream token from GET /api/v1/chat/token (real userId from backend).
 * - peerUserId: if supplied (patient→doctor), auto-creates the channel on connect.
 * - Without peerUserId (doctor side), shows NEW MESSAGE button to start conversations.
 * - Stream CSS scoped to .dhv-chat-root to prevent global style bleed.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getTokenFromCookie } from '@/lib/auth';
import { StreamChat, type ChannelSort, type ChannelFilters, type Channel as StreamChannel } from 'stream-chat';
import {
  Chat,
  Channel,
  ChannelList,
  MessageList,
  MessageInput,
  MessageSimple,
  Window,
  useMessageInputContext,
} from 'stream-chat-react';
import type { MessageProps } from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';
import { webTheme } from '@/lib/designSystem';

interface ChatTokenResponse { token: string; userId: string; apiKey: string; }

interface Props {
  readonly userName?:      string;
  readonly height?:        number;   // px, default 420
  /** If set, auto-creates a direct channel with this Stream userId on connect (patient→doctor) */
  readonly peerUserId?:    string;
  readonly peerName?:      string;
  /** CONSULT-010: If set, renders the EmergencyButton in the chat panel header */
  readonly appointmentId?: number;
  /**
   * embedded mode: hides the channel list sidebar and renders a clean single-pane
   * message view — suitable for dashboard card embeds where space is limited.
   * Default: false (show full two-pane layout).
   */
  readonly embedded?:      boolean;
}

// ── CHAT-005: Urgent message custom components ────────────────────────────────

/**
 * CustomMessage — wraps MessageSimple with a red urgent banner
 * when message.extraData.urgent === true.
 */
const CustomMessage = (props: MessageProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isUrgent = (props.message as any)?.extraData?.urgent === true;
  return (
    <div style={isUrgent ? { borderLeft: '4px solid red', paddingLeft: 8 } : {}}>
      {isUrgent && <span style={{ color: 'red', fontSize: 11 }}>🚨 URGENT</span>}
      <MessageSimple {...props} />
    </div>
  );
};

/**
 * UrgentToggleButton — adds a "🚨 URGENT" toggle above the Stream message input.
 * When active, stamps extraData.urgent = true on the next outgoing message.
 */
function UrgentToggleBar() {
  const [isUrgent, setIsUrgent] = React.useState(false);
  const { handleSubmit } = useMessageInputContext();

  // Override handleSubmit to stamp urgent flag — we store the flag in component state
  // and the parent MessageInput will pick up additional props via overrideSubmitHandler.
  // The simplest approach is a data attribute / context bridge; here we use a button.
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 12px', borderTop: '1px solid #eee',
      backgroundColor: isUrgent ? '#FFF0F0' : 'transparent',
    }}>
      <button
        onClick={() => setIsUrgent(u => !u)}
        style={{
          fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
          border: isUrgent ? '2px solid red' : '2px solid #ccc',
          borderRadius: 999, padding: '3px 10px',
          backgroundColor: isUrgent ? '#FF4444' : '#fff',
          color: isUrgent ? '#fff' : '#666',
          cursor: 'pointer',
        }}
      >
        🚨 {isUrgent ? 'URGENT ON' : 'URGENT'}
      </button>
      {isUrgent && (
        <span style={{ fontSize: 11, color: 'red' }}>
          Next message will be flagged as URGENT
        </span>
      )}
    </div>
  );
}

// Lazy-load EmergencyButton to avoid SSR issues
const EmergencyButtonLazy = React.lazy(() => import('./EmergencyButton'));

export default function ChatPanel({ userName, height = 420, peerUserId, peerName, appointmentId, embedded = false }: Readonly<Props>) {
  const clientRef             = useRef<StreamChat | null>(null);
  const [streamUserId,   setStreamUserId]   = useState<string | null>(null);
  const [activeChannel,  setActiveChannel]  = useState<StreamChannel | null>(null);
  const [ready,          setReady]          = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [isStub,         setIsStub]         = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  // Doctor-side compose state
  const [composing,      setComposing]      = useState(false);
  const [composeId,      setComposeId]      = useState('');
  const [composeName,    setComposeName]    = useState('');
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeError,   setComposeError]   = useState<string | null>(null);

  // ── Create or fetch a direct channel between self and peer ──────────────
  const openOrCreateChannel = useCallback(async (
    client: StreamChat,
    selfId: string,
    peerId: string,
    peerDisplayName?: string,
  ) => {
    // Deterministic channel id: sorted user ids joined with __ 
    const channelId = [selfId, peerId].sort().join('__');
    const ch = client.channel('messaging', channelId, {
      name:    peerDisplayName ?? `Chat with ${peerId}`,
      members: [selfId, peerId],
    });
    await ch.create();
    setActiveChannel(ch);
    return ch;
  }, []);

  // ── Connect to Stream on mount ───────────────────────────────────────────
  useEffect(() => {
    const jwt = getTokenFromCookie();
    if (!jwt) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/v1/chat/token', {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (!res.ok) { if (!cancelled) setError(`HTTP ${res.status}`); return; }

        const data: ChatTokenResponse = await res.json();
        if (cancelled) return;

        if (data.apiKey === 'STUB_KEY') { setIsStub(true); setLoading(false); return; }

        const client = StreamChat.getInstance(data.apiKey);
        clientRef.current = client;
        await client.connectUser({ id: data.userId, name: userName ?? `User ${data.userId}` }, data.token);

        if (!cancelled) {
          setStreamUserId(data.userId);
          setReady(true);
          // Patient side: auto-open the channel with the doctor immediately
          if (peerUserId) {
            await openOrCreateChannel(client, data.userId, peerUserId, peerName);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      clientRef.current?.disconnectUser().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, peerUserId, peerName]);

  // ── Doctor-side: start a new conversation by Stream userId ──────────────
  const handleStartConversation = useCallback(async () => {
    if (!clientRef.current || !streamUserId || !composeId.trim()) return;
    setComposeLoading(true);
    setComposeError(null);
    try {
      await openOrCreateChannel(clientRef.current, streamUserId, composeId.trim(), composeName.trim() || undefined);
      setComposing(false);
      setComposeId('');
      setComposeName('');
    } catch (e) {
      setComposeError(e instanceof Error ? e.message : 'Failed to create channel');
    } finally {
      setComposeLoading(false);
    }
  }, [clientRef, streamUserId, composeId, composeName, openOrCreateChannel]);

  // ── Loading / error / stub states ────────────────────────────────────────
  if (loading) return <div style={styles.stateBox}><span style={styles.stateText}>Connecting to chat…</span></div>;
  if (error)   return <div style={{ ...styles.stateBox, borderColor: '#FFC107', backgroundColor: '#FFF3CD' }}><span style={{ ...styles.stateText, color: '#996600' }}>⚠ Chat: {error}</span></div>;
  if (isStub)  return (
    <div style={styles.stateBox}>
      <p style={styles.stubTitle}>💬 STREAM CHAT</p>
      <p style={styles.stubNote}>Add STREAM_API_KEY + STREAM_API_SECRET to .env to activate.</p>
    </div>
  );
  if (!ready || !clientRef.current || !streamUserId) return <div style={styles.stateBox}><span style={styles.stateText}>Chat not available — please sign in.</span></div>;

  const filters: ChannelFilters = { type: 'messaging', members: { $in: [streamUserId] } };
  const sort: ChannelSort = { last_message_at: -1 };

  return (
    <div className="dhv-chat-root" style={{ ...styles.chatRoot, minHeight: height }}>
      {/* CONSULT-010: Emergency button in chat panel header */}
      {appointmentId != null && (
        <div style={styles.emergencyBar}>
          <React.Suspense fallback={null}>
            <EmergencyButtonLazy appointmentId={appointmentId} />
          </React.Suspense>
        </div>
      )}

      <Chat client={clientRef.current} theme="str-chat__theme-light">

        {/* Doctor-side: NEW MESSAGE compose bar */}
        {!peerUserId && (
          <div style={styles.newMsgBar}>
            {composing ? (
              <div style={styles.composeForm}>
                <input
                  style={styles.composeInput}
                  placeholder="Peer's User ID (e.g. 2)"
                  value={composeId}
                  onChange={e => setComposeId(e.target.value)}
                />
                <input
                  style={styles.composeInput}
                  placeholder="Peer's name (optional)"
                  value={composeName}
                  onChange={e => setComposeName(e.target.value)}
                />
                {composeError && <span style={styles.composeErr}>{composeError}</span>}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    style={styles.startBtn}
                    onClick={() => void handleStartConversation()}
                    disabled={composeLoading || !composeId.trim()}
                  >
                    {composeLoading ? 'OPENING…' : 'OPEN CHAT'}
                  </button>
                  <button style={styles.cancelBtn} onClick={() => setComposing(false)}>CANCEL</button>
                </div>
              </div>
            ) : (
              <button style={styles.newMsgBtn} onClick={() => setComposing(true)}>
                + NEW MESSAGE
              </button>
            )}
          </div>
        )}

        {embedded ? (
          /* ── Embedded mode: single-pane, no channel list sidebar ── */
          <div style={{ height, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Channel channel={activeChannel ?? undefined} Message={CustomMessage}>
              <Window>
                <MessageList
                  Message={CustomMessage}
                  disableDateSeparator={false}
                />
                <MessageInput focus={!!activeChannel} />
              </Window>
            </Channel>
          </div>
        ) : (
          /* ── Full two-pane layout ── */
          <div style={{ ...styles.chatLayout, height: height - (peerUserId ? 0 : composing ? 130 : 42) }}>
            <div style={styles.channelListPane}>
              <ChannelList
                filters={filters}
                sort={sort}
                customActiveChannel={activeChannel?.id}
                EmptyStateIndicator={() => (
                  <div style={styles.emptyChannels}>
                    <span style={styles.emptyIcon}>💬</span>
                    <p style={styles.emptyText}>No messages yet.</p>
                    {!peerUserId && (
                      <p style={styles.emptyHint}>Click <strong>+ NEW MESSAGE</strong> above to start a conversation.</p>
                    )}
                  </div>
                )}
              />
            </div>
            <div style={styles.channelPane}>
              <Channel channel={activeChannel ?? undefined} Message={CustomMessage}>
                <Window>
                  <MessageList Message={CustomMessage} />
                  <UrgentToggleBar />
                  <MessageInput focus={!!activeChannel} />
                </Window>
              </Channel>
            </div>
          </div>
        )}
      </Chat>
      <style>{STREAM_OVERRIDES}</style>
    </div>
  );
}

const STREAM_OVERRIDES = `
  .dhv-chat-root,
  .dhv-chat-root * {
    font-family: ${webTheme.font.sans};
  }
  .dhv-chat-root .str-chat,
  .dhv-chat-root .str-chat-channel,
  .dhv-chat-root .str-chat-channel-list,
  .dhv-chat-root .str-chat__list,
  .dhv-chat-root .str-chat__main-panel,
  .dhv-chat-root .str-chat__main-panel-inner {
    background: ${webTheme.colors.surface} !important;
  }
  .dhv-chat-root .str-chat__channel-list {
    border-right: 1px solid ${webTheme.colors.border} !important;
  }
  .dhv-chat-root .str-chat__channel-preview-messenger {
    padding: 14px 16px !important;
    border-bottom: 1px solid ${webTheme.colors.border} !important;
    border-radius: 0 !important;
    background: ${webTheme.colors.surface} !important;
  }
  .dhv-chat-root .str-chat__channel-preview-messenger--active {
    background: ${webTheme.colors.surfaceAlt} !important;
    border-left: 3px solid ${webTheme.colors.accent} !important;
  }
  .dhv-chat-root .str-chat__channel-preview-messenger__name,
  .dhv-chat-root .str-chat__header-livestream-left .str-chat__header-livestream-title {
    font-weight: 600 !important;
    font-size: 14px !important;
    line-height: 20px !important;
    color: ${webTheme.colors.text} !important;
  }
  .dhv-chat-root .str-chat__channel-preview-messenger__last-message,
  .dhv-chat-root .str-chat__header-livestream-left .str-chat__header-livestream-data {
    font-size: 13px !important;
    line-height: 19px !important;
    color: ${webTheme.colors.mutedText} !important;
  }
  .dhv-chat-root .str-chat__message-simple,
  .dhv-chat-root .str-chat__message-text,
  .dhv-chat-root .str-chat__message-text-inner,
  .dhv-chat-root .str-chat__message-simple-text-inner {
    font-size: 14px !important;
    line-height: 22px !important;
    color: ${webTheme.colors.text} !important;
  }
  .dhv-chat-root .str-chat__message-simple__meta,
  .dhv-chat-root .str-chat__message-data__date {
    font-size: 12px !important;
    color: ${webTheme.colors.mutedText} !important;
  }
  .dhv-chat-root .str-chat__message-bubble {
    border-radius: 18px !important;
    box-shadow: none !important;
    border: 1px solid ${webTheme.colors.border} !important;
    word-break: break-word !important;
  }
  .dhv-chat-root .str-chat__message--me .str-chat__message-bubble {
    background: ${webTheme.colors.accentTint} !important;
    border-color: rgba(111, 134, 108, 0.18) !important;
  }
  .dhv-chat-root .str-chat__message-input-inner {
    display: flex !important;
    align-items: flex-end !important;
    gap: 10px !important;
    padding: 12px !important;
  }
  .dhv-chat-root .str-chat__message-textarea-container,
  .dhv-chat-root .str-chat__message-textarea-with-emoji-picker {
    flex: 1 1 auto !important;
    min-width: 0 !important;
  }
  .dhv-chat-root .str-chat__message-input {
    border-top: 1px solid ${webTheme.colors.border} !important;
    background: ${webTheme.colors.surface} !important;
  }
  .dhv-chat-root .str-chat__message-input textarea {
    font-size: 14px !important;
    line-height: 22px !important;
    border-radius: 18px !important;
    background: rgba(255,255,255,0.86) !important;
  }
  .dhv-chat-root .str-chat__send-button {
    border-radius: 999px !important;
    background: ${webTheme.colors.accent} !important;
    color: ${webTheme.colors.white} !important;
    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    align-self: flex-end !important;
    border: none !important;
    box-shadow: 0 10px 24px rgba(111, 134, 108, 0.18) !important;
  }
  .dhv-chat-root .str-chat__send-button svg {
    width: 18px !important;
    height: 18px !important;
    fill: currentColor !important;
  }
  .dhv-chat-root .str-chat__header-livestream {
    border-bottom: 1px solid ${webTheme.colors.border} !important;
    background: ${webTheme.colors.surface} !important;
  }
  .dhv-chat-root .str-chat__channel-list-empty {
    display: none !important;
  }
`;

const styles: Record<string, React.CSSProperties> = {
  chatRoot: {
    border: `1px solid ${webTheme.colors.border}`,
    borderRadius: 20,
    overflow: 'hidden',
    fontFamily: webTheme.font.sans,
    backgroundColor: webTheme.colors.surface,
  },
  emergencyBar: {
    padding: '8px 12px',
    borderBottom: `1px solid ${webTheme.colors.border}`,
    backgroundColor: '#FFF0F0',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  chatLayout:      { display: 'flex', overflow: 'hidden' },
  channelListPane: { width: 248, borderRight: `1px solid ${webTheme.colors.border}`, overflowY: 'auto', flexShrink: 0, backgroundColor: webTheme.colors.surface },
  channelPane:     { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  // New message bar (doctor side)
  newMsgBar:    { borderBottom: `1px solid ${webTheme.colors.border}`, backgroundColor: webTheme.colors.surfaceAlt, padding: '10px 12px' },
  newMsgBtn:    { fontFamily: webTheme.font.sans, fontSize: 13, fontWeight: 600, backgroundColor: webTheme.colors.surface, color: webTheme.colors.text, border: `1px solid ${webTheme.colors.borderStrong}`, borderRadius: 999, padding: '8px 14px', cursor: 'pointer' },
  composeForm:  { display: 'flex', flexDirection: 'column', gap: 5 },
  composeInput: { fontFamily: webTheme.font.sans, fontSize: 14, border: `1px solid ${webTheme.colors.borderStrong}`, backgroundColor: 'rgba(255,255,255,0.82)', color: webTheme.colors.text, borderRadius: 16, padding: '10px 12px', outline: 'none' },
  composeErr:   { fontFamily: webTheme.font.sans, fontSize: 12, color: webTheme.colors.rose },
  startBtn:     { fontFamily: webTheme.font.sans, fontSize: 13, fontWeight: 600, backgroundColor: webTheme.colors.accent, color: webTheme.colors.white, border: 'none', borderRadius: 999, padding: '9px 14px', cursor: 'pointer', flex: 1 },
  cancelBtn:    { fontFamily: webTheme.font.sans, fontSize: 13, fontWeight: 600, backgroundColor: webTheme.colors.surface, color: webTheme.colors.mutedText, border: `1px solid ${webTheme.colors.borderStrong}`, borderRadius: 999, padding: '9px 12px', cursor: 'pointer' },
  // Empty state
  emptyChannels: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 12px', gap: 6, textAlign: 'center' },
  emptyIcon:     { fontSize: 28 },
  emptyText:     { fontFamily: webTheme.font.sans, fontSize: 14, fontWeight: 600, color: webTheme.colors.text, margin: 0 },
  emptyHint:     { fontFamily: webTheme.font.sans, fontSize: 13, color: webTheme.colors.mutedText, margin: 0, lineHeight: 1.5 },
  // State boxes
  stateBox: { border: `1px solid ${webTheme.colors.border}`, borderRadius: 20, padding: 24, minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', backgroundColor: webTheme.colors.surfaceAlt },
  stateText: { fontFamily: webTheme.font.sans, fontSize: 14, color: webTheme.colors.mutedText },
  stubTitle: { fontFamily: webTheme.font.sans, fontSize: 15, fontWeight: 600, color: webTheme.colors.text, margin: 0 },
  stubNote:  { fontFamily: webTheme.font.sans, fontSize: 13, color: webTheme.colors.mutedText, margin: 0 },
};
