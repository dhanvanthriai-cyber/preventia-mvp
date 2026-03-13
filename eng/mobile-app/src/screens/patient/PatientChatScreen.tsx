/**
 * screens/patient/PatientChatScreen.tsx
 * Project Dhanvanthri — Real-time patient chat via Stream Chat
 *
 * Replaces MOCK_THREADS with live Stream Chat channels.
 *
 * Flow:
 *  1. Fetch Stream token from GET /api/v1/chat/token (requires stored JWT)
 *  2. Connect StreamChat client with the returned token + userId
 *  3. Render ChannelList → tap opens Channel (MessageList + MessageInput)
 *
 * STUB mode: when apiKey === "STUB_KEY", renders a placeholder list
 * so the screen works without credentials during development.
 *
 * Dependencies (must be installed):
 *   stream-chat                  ^8.40.0
 *   stream-chat-react-native     ^5.33.0
 *   (peer deps: @react-native-community/netinfo, react-native-reanimated,
 *    @gorhom/bottom-sheet, react-native-image-resizer, etc. — see
 *    stream-chat-react-native docs for full native setup)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StreamChat, type Channel as StreamChannel } from 'stream-chat';
import {
  OverlayProvider,
  Chat,
  ChannelList,
  Channel,
  MessageList,
  MessageInput,
} from 'stream-chat-react-native';
import { Colors, Spacing, Typography } from '../../theme/theme';
import { useAuth } from '../../hooks/useAuth';

const API_BASE = process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080';

interface ChatTokenResponse {
  token:  string;
  userId: string;
  apiKey: string;
}

// ─── STUB fallback threads (shown when Stream credentials are not configured) ──
const STUB_CHANNELS = [
  { id: '1', name: 'Dr. Arjun Sharma',  role: 'General Physician', last: 'Please take medication with food.',        time: '10:32 AM', unread: 2 },
  { id: '2', name: 'LifeCare Pharmacy', role: 'Pharmacy',          last: 'Your Metformin refill is ready.',          time: 'Yesterday', unread: 1 },
];

export function PatientChatScreen() {
  const { user } = useAuth();

  const clientRef     = useRef<StreamChat | null>(null);
  const [ready,        setReady]        = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [isStub,       setIsStub]       = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<StreamChannel | null>(null);

  // ── Connect Stream Chat ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.token) { setLoading(false); return; }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/chat/token`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!res.ok) throw new Error(`Token fetch failed: HTTP ${res.status}`);

        const data: ChatTokenResponse = await res.json();
        if (cancelled) return;

        if (data.apiKey === 'STUB_KEY') {
          setIsStub(true);
          setLoading(false);
          return;
        }

        const client = StreamChat.getInstance(data.apiKey);
        clientRef.current = client;

        await client.connectUser(
          { id: data.userId, name: user.name ?? data.userId },
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
      clientRef.current?.disconnectUser().catch(() => {});
    };
  }, [user]);

  const channelFilters = { type: 'messaging', members: { $in: [user?.userId?.toString() ?? ''] } };
  const channelSort    = { last_message_at: -1 as const };

  const onSelectChannel = useCallback((channel: StreamChannel) => {
    setActiveChannel(channel);
  }, []);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={Colors.trustBlue} />
          <Text style={s.loadingText}>Connecting to chat…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}><Text style={s.headerTitle}>Messages</Text></View>
        <View style={s.center}>
          <Text style={s.errorText}>⚠ {error}</Text>
          <Text style={s.errorSub}>Check your connection and try again.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── STUB mode ────────────────────────────────────────────────────────────────
  if (isStub) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}><Text style={s.headerTitle}>Messages</Text></View>
        {STUB_CHANNELS.map(ch => (
          <View key={ch.id} style={s.stubRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{ch.name.charAt(0)}</Text>
            </View>
            <View style={s.rowBody}>
              <View style={s.rowTop}>
                <Text style={s.name}>{ch.name}</Text>
                <Text style={s.time}>{ch.time}</Text>
              </View>
              <Text style={s.role}>{ch.role}</Text>
              <Text style={s.preview} numberOfLines={1}>{ch.last}</Text>
            </View>
            {ch.unread > 0 && (
              <View style={s.badge}><Text style={s.badgeText}>{ch.unread}</Text></View>
            )}
          </View>
        ))}
        <View style={s.sdkNote}>
          <Text style={s.sdkNoteText}>
            💬 Stream Chat active — showing sample threads.{'\n'}
            Deploy backend to load real channels.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Active channel view ──────────────────────────────────────────────────────
  if (activeChannel && clientRef.current) {
    return (
      <OverlayProvider>
        <Chat client={clientRef.current}>
          <Channel channel={activeChannel}>
            <View style={{ flex: 1 }}>
              <View style={s.header}>
                <Text style={s.headerTitle} onPress={() => setActiveChannel(null)}>
                  ← Messages
                </Text>
              </View>
              <MessageList />
              <MessageInput />
            </View>
          </Channel>
        </Chat>
      </OverlayProvider>
    );
  }

  // ── Channel list ─────────────────────────────────────────────────────────────
  if (ready && clientRef.current) {
    return (
      <OverlayProvider>
        <Chat client={clientRef.current}>
          <SafeAreaView style={s.safe}>
            <View style={s.header}><Text style={s.headerTitle}>Messages</Text></View>
            <ChannelList
              filters={channelFilters}
              sort={channelSort}
              onSelect={onSelectChannel}
            />
          </SafeAreaView>
        </Chat>
      </OverlayProvider>
    );
  }

  return null;
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.white },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  header:      { paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: Colors.black },
  headerTitle: { ...Typography.heading, fontSize: 20 },
  loadingText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: '#666' },
  errorText:   { fontFamily: 'JetBrainsMono-Regular', fontSize: 13, color: Colors.alertRed, fontWeight: '700' },
  errorSub:    { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: '#888' },
  // Stub row (mirrors original MOCK_THREADS design)
  stubRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatar:      { width: 46, height: 46, borderRadius: 0, backgroundColor: Colors.trustBlue, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText:  { color: Colors.white, fontWeight: '700', fontSize: 18 },
  rowBody:     { flex: 1 },
  rowTop:      { flexDirection: 'row', justifyContent: 'space-between' },
  name:        { fontFamily: 'JetBrainsMono-Regular', fontWeight: '700', fontSize: 14, color: Colors.black },
  time:        { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: '#888' },
  role:        { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: Colors.trustBlue, marginBottom: 2 },
  preview:     { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: '#555' },
  badge:       { backgroundColor: Colors.alertRed, minWidth: 20, height: 20, borderRadius: 0, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  badgeText:   { color: Colors.white, fontSize: 11, fontWeight: '700' },
  sdkNote:     { margin: Spacing.md, padding: 12, borderWidth: 2, borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  sdkNoteText: { fontFamily: 'JetBrainsMono-Regular', color: '#166534', fontSize: 12, textAlign: 'center', lineHeight: 20 },
});
