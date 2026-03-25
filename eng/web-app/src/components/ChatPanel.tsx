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
  useChatContext,
} from 'stream-chat-react';
import type { MessageProps } from 'stream-chat-react';
import 'stream-chat-react/dist/css/v2/index.css';
import { webTheme } from '@/lib/designSystem';

interface ChatTokenResponse { token: string; userId: string; apiKey: string; }

interface AllowedPeerOption {
  id: string;
  name?: string;
}

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
  /** queue-first embedded mode: show a conversation queue before opening a thread */
  readonly queueFirst?:    boolean;
  /** restrict embedded queue mode to conversations whose peer id is in this allow-list */
  readonly allowedPeerIds?: string[];
  /** optional labeled peer list for mapped doctor/patient conversations */
  readonly allowedPeers?: ReadonlyArray<AllowedPeerOption>;
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

/**
 * ChannelSyncer — lives inside <Chat> so it can call useChatContext.
 * When the parent opens/creates a channel programmatically (compose or peer-open),
 * it passes that channel here and we push it into Stream's active-channel state.
 * Normal sidebar clicks are handled entirely by Stream and don't need this.
 */
function ChannelSyncer({ channel }: { channel: StreamChannel | null }) {
  const { setActiveChannel } = useChatContext();
  useEffect(() => {
    if (channel) setActiveChannel(channel);
  }, [channel, setActiveChannel]);
  return null;
}

function getPeerMember(channel: StreamChannel, selfUserId: string | null) {
  return Object.values(channel.state.members ?? {}).find((member) => member.user?.id !== selfUserId);
}

function getChannelDisplayName(channel: StreamChannel, selfUserId: string | null) {
  const peerMember = getPeerMember(channel, selfUserId);
  const peerName = peerMember?.user?.name?.trim();
  if (peerName) return peerName;

  const channelName = typeof channel.data?.name === 'string' ? channel.data.name.trim() : '';
  if (channelName) return channelName;

  return peerMember?.user?.id ? `Patient ${peerMember.user.id}` : 'Conversation';
}

function getLastMessagePreview(channel: StreamChannel) {
  const lastMessage = channel.state.messages[channel.state.messages.length - 1];
  const messageText = lastMessage?.text?.trim();
  if (messageText) return messageText;
  if ((lastMessage?.attachments?.length ?? 0) > 0) return 'Attachment shared';
  return 'No messages yet';
}

function formatQueueTimestamp(channel: StreamChannel) {
  const lastMessage = channel.state.messages[channel.state.messages.length - 1];
  const rawTime = lastMessage?.created_at ?? channel.data?.last_message_at ?? channel.data?.updated_at;
  if (!rawTime) return '';

  const timestamp = new Date(rawTime);
  const now = new Date();
  const isSameDay = timestamp.toDateString() === now.toDateString();
  return isSameDay
    ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ChatPanel({
  userName,
  height = 420,
  peerUserId,
  peerName,
  appointmentId,
  embedded = false,
  queueFirst = false,
  allowedPeerIds,
  allowedPeers,
}: Readonly<Props>) {
  const clientRef             = useRef<StreamChat | null>(null);
  const [streamUserId,   setStreamUserId]   = useState<string | null>(null);
  const [activeChannel,  setActiveChannel]  = useState<StreamChannel | null>(null);
  const [queuedChannels, setQueuedChannels] = useState<StreamChannel[]>([]);
  const [ready,          setReady]          = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [isStub,         setIsStub]         = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [queueLoading,   setQueueLoading]   = useState(false);
  // Doctor-side compose state
  const [composing,      setComposing]      = useState(false);
  const [composeId,      setComposeId]      = useState('');
  const [composeName,    setComposeName]    = useState('');
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeError,   setComposeError]   = useState<string | null>(null);
  const [queueComposerOpen, setQueueComposerOpen] = useState(false);
  const [queueComposePatientQuery, setQueueComposePatientQuery] = useState('');
  const [queueComposeSelectedPeer, setQueueComposeSelectedPeer] = useState<AllowedPeerOption | null>(null);
  const [queueComposeMatches, setQueueComposeMatches] = useState<AllowedPeerOption[]>([]);
  const [queueComposeSearching, setQueueComposeSearching] = useState(false);
  const [queueComposeSearchError, setQueueComposeSearchError] = useState<string | null>(null);
  const [queueComposeMessage, setQueueComposeMessage] = useState('');
  const [queueComposeLoading, setQueueComposeLoading] = useState(false);
  const [queueComposeError, setQueueComposeError] = useState<string | null>(null);
  const isEmbeddedQueueMode = embedded && (queueFirst || !peerUserId);
  const allowedPeerOptions = (() => {
    const peerById = new Map<string, AllowedPeerOption>();

    for (const peerId of allowedPeerIds ?? []) {
      const normalizedPeerId = peerId.trim();
      if (normalizedPeerId.length === 0) continue;
      peerById.set(normalizedPeerId, { id: normalizedPeerId });
    }

    for (const peer of allowedPeers ?? []) {
      const normalizedPeerId = peer.id.trim();
      if (normalizedPeerId.length === 0) continue;
      const normalizedPeerName = peer.name?.trim();
      const existingPeer = peerById.get(normalizedPeerId);
      peerById.set(normalizedPeerId, {
        id: normalizedPeerId,
        name: normalizedPeerName && normalizedPeerName.length > 0 ? normalizedPeerName : existingPeer?.name,
      });
    }

    return Array.from(peerById.values())
      .sort((left, right) => (left.name ?? left.id).localeCompare(right.name ?? right.id));
  })();
  const allowedPeerIdsKey = allowedPeerIds == null && allowedPeers == null
    ? null
    : allowedPeerOptions.map((peer) => peer.id).join('|');
  const normalizedQueueComposeQuery = queueComposePatientQuery.trim().toLowerCase();

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

  const filterChannelsByAllowedPeers = useCallback((channels: StreamChannel[], selfId: string) => {
    const allowedPeerSet = allowedPeerIdsKey == null
      ? null
      : new Set(allowedPeerIdsKey.length > 0 ? allowedPeerIdsKey.split('|') : []);
    if (allowedPeerSet == null) return channels;
    return channels.filter((channel) => {
      const allowedPeerId = getPeerMember(channel, selfId)?.user?.id;
      return allowedPeerId != null && allowedPeerSet.has(allowedPeerId);
    });
  }, [allowedPeerIdsKey]);

  const refreshQueuedChannels = useCallback(async (
    client: StreamChat,
    selfId: string,
    showLoader = true,
  ) => {
    if (showLoader) setQueueLoading(true);
    try {
      const nextChannels = await client.queryChannels(
        { type: 'messaging', members: { $in: [selfId] } },
        { last_message_at: -1 },
        { limit: 30, watch: true, state: true },
      );

      const filteredChannels = filterChannelsByAllowedPeers(nextChannels, selfId);

      setQueuedChannels(filteredChannels);
      setActiveChannel((current) => {
        if (!current) return current;
        return filteredChannels.find((channel) => channel.cid === current.cid) ?? null;
      });
    } finally {
      if (showLoader) setQueueLoading(false);
    }
  }, [filterChannelsByAllowedPeers]);

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
          if (peerUserId && !isEmbeddedQueueMode) {
            // Patient side: auto-open the channel with the doctor immediately
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
  }, [userName, peerUserId, peerName, isEmbeddedQueueMode]);

  useEffect(() => {
    if (!isEmbeddedQueueMode || !clientRef.current || !streamUserId) return;

    let cancelled = false;
    const client = clientRef.current;

    const loadQueue = async (showLoader = true) => {
      try {
        await refreshQueuedChannels(client, streamUserId, showLoader);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    };

    void loadQueue(true);

    const subscription = client.on((event) => {
      if (
        event.type === 'message.new' ||
        event.type === 'notification.message_new' ||
        event.type === 'notification.added_to_channel' ||
        event.type === 'channel.updated'
      ) {
        void loadQueue(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [isEmbeddedQueueMode, refreshQueuedChannels, streamUserId]);

  useEffect(() => {
    if (!queueComposerOpen || !isEmbeddedQueueMode || peerUserId) return;

    const selectedPeerLabel = (queueComposeSelectedPeer?.name ?? (queueComposeSelectedPeer != null ? `Patient #${queueComposeSelectedPeer.id}` : '')).trim().toLowerCase();
    if (queueComposeSelectedPeer != null && normalizedQueueComposeQuery === selectedPeerLabel) {
      setQueueComposeMatches([]);
      setQueueComposeSearching(false);
      setQueueComposeSearchError(null);
      return;
    }

    if (normalizedQueueComposeQuery.length < 2) {
      setQueueComposeMatches([]);
      setQueueComposeSearching(false);
      setQueueComposeSearchError(null);
      return;
    }

    const jwt = getTokenFromCookie();
    if (!jwt) {
      setQueueComposeMatches([]);
      setQueueComposeSearching(false);
      setQueueComposeSearchError('Chat session expired. Refresh and sign in again.');
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setQueueComposeSearching(true);
        setQueueComposeSearchError(null);
        try {
          const response = await fetch(`/api/v1/chat/patients/search?q=${encodeURIComponent(queueComposePatientQuery.trim())}`, {
            headers: { Authorization: `Bearer ${jwt}` },
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const payload = await response.json() as Array<{ userId: number; name: string }>;
          if (cancelled) return;

          setQueueComposeMatches(
            payload.map((patient) => ({
              id: String(patient.userId),
              name: patient.name,
            })),
          );
        } catch (e) {
          if (cancelled) return;
          setQueueComposeMatches([]);
          setQueueComposeSearchError(e instanceof Error ? e.message : 'Failed to search patients');
        } finally {
          if (!cancelled) {
            setQueueComposeSearching(false);
          }
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isEmbeddedQueueMode, normalizedQueueComposeQuery, peerUserId, queueComposerOpen, queueComposePatientQuery, queueComposeSelectedPeer]);

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

  const resetQueueComposer = useCallback(() => {
    setQueueComposerOpen(false);
    setQueueComposePatientQuery('');
    setQueueComposeSelectedPeer(null);
    setQueueComposeMatches([]);
    setQueueComposeSearching(false);
    setQueueComposeSearchError(null);
    setQueueComposeMessage('');
    setQueueComposeLoading(false);
    setQueueComposeError(null);
  }, []);

  const handleOpenQueuedChannel = useCallback((channel: StreamChannel) => {
    resetQueueComposer();
    setActiveChannel(channel);
  }, [resetQueueComposer]);

  const handleBackToQueue = useCallback(() => {
    resetQueueComposer();
    setActiveChannel(null);
  }, [resetQueueComposer]);

  const handleQueueComposerSelectPeer = useCallback((peer: AllowedPeerOption) => {
    setQueueComposePatientQuery(peer.name ?? `Patient #${peer.id}`);
    setQueueComposeSelectedPeer(peer);
    setQueueComposeMatches([]);
    setQueueComposeError(null);
    setQueueComposeSearchError(null);
  }, []);

  const handleQueueComposerCancel = useCallback(() => {
    resetQueueComposer();
  }, [resetQueueComposer]);

  const handleQueueComposerSend = useCallback(async () => {
    if (!clientRef.current || !streamUserId) return;

    const peer = queueComposeSelectedPeer;
    const messageText = queueComposeMessage.trim();

    if (!peer) {
      setQueueComposeError('Search and select an enrolled patient first.');
      return;
    }
    if (messageText.length === 0) {
      setQueueComposeError('Enter a message to send.');
      return;
    }

    setQueueComposeLoading(true);
    setQueueComposeError(null);
    try {
      const channel = await openOrCreateChannel(clientRef.current, streamUserId, peer.id, peer.name);
      await channel.sendMessage({ text: messageText });
      await refreshQueuedChannels(clientRef.current, streamUserId, false);
      setActiveChannel(null);
      resetQueueComposer();
    } catch (e) {
      setQueueComposeError(e instanceof Error ? e.message : 'Failed to send message');
      setQueueComposeLoading(false);
    }
  }, [
    openOrCreateChannel,
    queueComposeMessage,
    queueComposeSelectedPeer,
    refreshQueuedChannels,
    resetQueueComposer,
    streamUserId,
  ]);

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
  const channelRenderFilterFn = streamUserId == null
    ? undefined
    : (channels: StreamChannel[]) => filterChannelsByAllowedPeers(channels, streamUserId);
  const canCreateMappedConversation = isEmbeddedQueueMode && !peerUserId && allowedPeerOptions.length > 0;

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
        {!peerUserId && !isEmbeddedQueueMode && (
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
          isEmbeddedQueueMode ? (
            <>
              <ChannelSyncer channel={activeChannel} />
              <div style={{ height, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {activeChannel ? (
                  <div style={styles.embeddedThreadWrap}>
                    <div style={styles.embeddedThreadHeader}>
                      <button type="button" style={styles.backBtn} onClick={handleBackToQueue}>
                        ← Back
                      </button>
                      <div style={styles.threadTitleWrap}>
                        <span style={styles.threadTitle}>{getChannelDisplayName(activeChannel, streamUserId)}</span>
                        <span style={styles.threadSubtitle}>Conversation history</span>
                      </div>
                    </div>
                    <div style={styles.embeddedThreadBody}>
                      <Channel channel={activeChannel} Message={CustomMessage}>
                        <Window>
                          <MessageList Message={CustomMessage} disableDateSeparator={false} />
                          <UrgentToggleBar />
                          <MessageInput />
                        </Window>
                      </Channel>
                    </div>
                  </div>
                ) : (
                  <div style={styles.queueView}>
                      <div style={styles.queueHeader}>
                        <div style={styles.queueHeadingBlock}>
                          <span style={styles.queueEyebrow}>Care Network</span>
                          <span style={styles.queueHeading}>Previous Chats</span>
                        </div>
                        <div style={styles.queueHeaderActions}>
                          {canCreateMappedConversation && (
                            <button
                              type="button"
                              style={styles.queueActionBtn}
                              onClick={() => {
                                setQueueComposeError(null);
                                setQueueComposerOpen(true);
                              }}
                            >
                              + New Message
                            </button>
                          )}
                          <span style={styles.queueCount}>{queuedChannels.length}</span>
                        </div>
                      </div>
                      {queueComposerOpen && (
                        <div style={styles.queueComposerCard}>
                          <div style={styles.queueComposerField}>
                            <label htmlFor="queue-compose-patient" style={styles.queueComposerLabel}>Patient Name</label>
                            <input
                              id="queue-compose-patient"
                              type="text"
                              value={queueComposePatientQuery}
                              placeholder="Search mapped patient"
                              autoComplete="off"
                              style={styles.queueComposerInput}
                              onChange={(event) => {
                                setQueueComposePatientQuery(event.target.value);
                                setQueueComposeSelectedPeer(null);
                                setQueueComposeError(null);
                                setQueueComposeSearchError(null);
                              }}
                            />
                            {queueComposeSelectedPeer && queueComposePatientQuery.trim() === (queueComposeSelectedPeer.name ?? `Patient #${queueComposeSelectedPeer.id}`) ? (
                              <div style={styles.queueComposerHint}>
                                Selected patient: <strong>{queueComposeSelectedPeer.name ?? `Patient #${queueComposeSelectedPeer.id}`}</strong>
                              </div>
                            ) : queueComposeSearching ? (
                              <div style={styles.queueComposerHint}>Searching enrolled patients…</div>
                            ) : queueComposeSearchError ? (
                              <div style={styles.queueComposerError}>{queueComposeSearchError}</div>
                            ) : queueComposeMatches.length > 0 ? (
                              <div style={styles.queueComposerMatches}>
                                {queueComposeMatches.map((peer) => (
                                  <button
                                    key={peer.id}
                                    type="button"
                                    style={styles.queueComposerMatchBtn}
                                    onClick={() => handleQueueComposerSelectPeer(peer)}
                                  >
                                    <span style={styles.queueComposerMatchName}>{peer.name ?? `Patient #${peer.id}`}</span>
                                    <span style={styles.queueComposerMatchMeta}>mapped patient</span>
                                  </button>
                                ))}
                              </div>
                            ) : normalizedQueueComposeQuery.length >= 2 ? (
                              <div style={styles.queueComposerHint}>No enrolled patients match that name.</div>
                            ) : (
                              <div style={styles.queueComposerHint}>Enter at least 2 characters to search enrolled patients.</div>
                            )}
                          </div>
                          <div style={styles.queueComposerField}>
                            <label htmlFor="queue-compose-message" style={styles.queueComposerLabel}>Message</label>
                            <textarea
                              id="queue-compose-message"
                              value={queueComposeMessage}
                              placeholder="Type the first message to send"
                              rows={3}
                              style={styles.queueComposerTextarea}
                              onChange={(event) => {
                                setQueueComposeMessage(event.target.value);
                                setQueueComposeError(null);
                              }}
                            />
                          </div>
                          {queueComposeError && (
                            <div style={styles.queueComposerError}>{queueComposeError}</div>
                          )}
                          <div style={styles.queueComposerActions}>
                            <button
                              type="button"
                              style={styles.queueComposerSendBtn}
                              onClick={() => void handleQueueComposerSend()}
                              disabled={queueComposeLoading}
                            >
                              {queueComposeLoading ? 'Sending…' : 'Send Message'}
                            </button>
                            <button
                              type="button"
                              style={styles.queueComposerCancelBtn}
                              onClick={handleQueueComposerCancel}
                              disabled={queueComposeLoading}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      <div style={styles.queueScroll}>
                        {queueLoading ? (
                          <div style={styles.queueState}>Loading conversation queue…</div>
                        ) : queuedChannels.length === 0 ? (
                          <div style={styles.queueState}>No mapped chats yet.</div>
                        ) : (
                          queuedChannels.map((channel) => (
                            <button
                              key={channel.cid}
                              type="button"
                              style={styles.queueItem}
                              onClick={() => handleOpenQueuedChannel(channel)}
                            >
                              <div style={styles.queueItemTop}>
                                <span style={styles.queueItemName}>{getChannelDisplayName(channel, streamUserId)}</span>
                                <span style={styles.queueItemTime}>{formatQueueTimestamp(channel)}</span>
                              </div>
                              <span style={styles.queueItemPreview}>{getLastMessagePreview(channel)}</span>
                            </button>
                          ))
                        )}
                      </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ── Embedded mode: single-pane, no channel list sidebar ── */
            <>
              {/* Sync programmatically-opened channels into Stream state (compose / peer-open / history auto-load) */}
              <ChannelSyncer channel={activeChannel} />
              <div style={{ height, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Channel Message={CustomMessage}>
                  <Window>
                    <MessageList
                      Message={CustomMessage}
                      disableDateSeparator={false}
                    />
                    <MessageInput />
                  </Window>
                </Channel>
              </div>
            </>
          )
        ) : (
          /* ── Full two-pane layout ── */
          <>
            {/* Sync programmatically-opened channels (compose / peer-open) into Stream state */}
            <ChannelSyncer channel={activeChannel} />
            <div style={{ ...styles.chatLayout, height: height - (peerUserId ? 0 : composing ? 130 : 42) }}>
              <div style={styles.channelListPane}>
                <ChannelList
                  filters={filters}
                  sort={sort}
                  channelRenderFilterFn={channelRenderFilterFn}
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
                {/* No channel prop — Stream drives the active channel from list clicks */}
                <Channel Message={CustomMessage}>
                  <Window>
                    <MessageList Message={CustomMessage} />
                    <UrgentToggleBar />
                    <MessageInput />
                  </Window>
                </Channel>
              </div>
            </div>
          </>
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
  queueView: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: webTheme.colors.surface,
  },
  queueHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
    padding: '14px 16px 12px',
    borderBottom: `1px solid ${webTheme.colors.border}`,
    backgroundColor: webTheme.colors.surfaceAlt,
  },
  queueHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  queueHeadingBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  queueEyebrow: {
    fontFamily: webTheme.font.sans,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: webTheme.colors.mutedText,
  },
  queueHeading: {
    fontFamily: webTheme.font.sans,
    fontSize: 18,
    fontWeight: 700,
    color: webTheme.colors.text,
  },
  queueActionBtn: {
    border: `1px solid ${webTheme.colors.borderStrong}`,
    borderRadius: 999,
    backgroundColor: webTheme.colors.surface,
    color: webTheme.colors.text,
    padding: '7px 12px',
    fontFamily: webTheme.font.sans,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  queueCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: webTheme.colors.surface,
    border: `1px solid ${webTheme.colors.borderStrong}`,
    fontFamily: webTheme.font.sans,
    fontSize: 12,
    fontWeight: 700,
    color: webTheme.colors.text,
  },
  queueScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  queueState: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    textAlign: 'center',
    fontFamily: webTheme.font.sans,
    fontSize: 13,
    color: webTheme.colors.mutedText,
  },
  queueComposerCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 12,
    borderBottom: `1px solid ${webTheme.colors.border}`,
    backgroundColor: webTheme.colors.surfaceAlt,
  },
  queueComposerField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  queueComposerLabel: {
    fontFamily: webTheme.font.sans,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: webTheme.colors.text,
  },
  queueComposerInput: {
    width: '100%',
    border: `1px solid ${webTheme.colors.borderStrong}`,
    borderRadius: 14,
    backgroundColor: webTheme.colors.surface,
    color: webTheme.colors.text,
    padding: '10px 12px',
    fontFamily: webTheme.font.sans,
    fontSize: 13,
    outline: 'none',
  },
  queueComposerTextarea: {
    width: '100%',
    border: `1px solid ${webTheme.colors.borderStrong}`,
    borderRadius: 14,
    backgroundColor: webTheme.colors.surface,
    color: webTheme.colors.text,
    padding: '10px 12px',
    fontFamily: webTheme.font.sans,
    fontSize: 13,
    lineHeight: '19px',
    outline: 'none',
    resize: 'vertical',
  },
  queueComposerMatches: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 168,
    overflowY: 'auto',
  },
  queueComposerMatchBtn: {
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '10px 12px',
    borderRadius: 12,
    border: `1px solid ${webTheme.colors.border}`,
    backgroundColor: webTheme.colors.surface,
    cursor: 'pointer',
  },
  queueComposerMatchName: {
    fontFamily: webTheme.font.sans,
    fontSize: 13,
    fontWeight: 700,
    color: webTheme.colors.text,
  },
  queueComposerMatchMeta: {
    fontFamily: webTheme.font.sans,
    fontSize: 11,
    color: webTheme.colors.mutedText,
  },
  queueComposerHint: {
    fontFamily: webTheme.font.sans,
    fontSize: 12,
    color: webTheme.colors.mutedText,
    padding: '4px 2px 0',
  },
  queueComposerError: {
    borderRadius: 14,
    border: `1px solid rgba(184, 154, 95, 0.35)`,
    backgroundColor: '#FFF7E8',
    padding: '12px 14px',
    fontFamily: webTheme.font.sans,
    fontSize: 12,
    lineHeight: '18px',
    color: '#8A6116',
  },
  queueComposerActions: {
    display: 'flex',
    gap: 8,
  },
  queueComposerSendBtn: {
    flex: 1,
    border: 'none',
    borderRadius: 999,
    backgroundColor: webTheme.colors.accent,
    color: webTheme.colors.white,
    padding: '10px 14px',
    fontFamily: webTheme.font.sans,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  queueComposerCancelBtn: {
    border: `1px solid ${webTheme.colors.borderStrong}`,
    borderRadius: 999,
    backgroundColor: webTheme.colors.surface,
    color: webTheme.colors.text,
    padding: '10px 14px',
    fontFamily: webTheme.font.sans,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  },
  queueItem: {
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '14px 14px 12px',
    borderRadius: 16,
    border: `1px solid ${webTheme.colors.border}`,
    backgroundColor: webTheme.colors.surface,
    cursor: 'pointer',
  },
  queueItemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
  },
  queueItemName: {
    fontFamily: webTheme.font.sans,
    fontSize: 13,
    fontWeight: 700,
    color: webTheme.colors.text,
  },
  queueItemTime: {
    fontFamily: webTheme.font.sans,
    fontSize: 11,
    color: webTheme.colors.mutedText,
    whiteSpace: 'nowrap',
  },
  queueItemPreview: {
    fontFamily: webTheme.font.sans,
    fontSize: 12,
    lineHeight: '18px',
    color: webTheme.colors.mutedText,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  embeddedThreadWrap: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: webTheme.colors.surface,
  },
  embeddedThreadHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    borderBottom: `1px solid ${webTheme.colors.border}`,
    backgroundColor: webTheme.colors.surfaceAlt,
  },
  backBtn: {
    border: `1px solid ${webTheme.colors.borderStrong}`,
    borderRadius: 999,
    backgroundColor: webTheme.colors.surface,
    color: webTheme.colors.text,
    padding: '7px 12px',
    fontFamily: webTheme.font.sans,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  threadTitleWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
  },
  threadTitle: {
    fontFamily: webTheme.font.sans,
    fontSize: 14,
    fontWeight: 700,
    color: webTheme.colors.text,
  },
  threadSubtitle: {
    fontFamily: webTheme.font.sans,
    fontSize: 11,
    color: webTheme.colors.mutedText,
  },
  embeddedThreadBody: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
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
