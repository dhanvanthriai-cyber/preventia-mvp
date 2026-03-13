/**
 * screens/patient/PatientChatScreen.tsx
 * Project Dhanvanthri — Patient chat thread list
 *
 * Placeholder for Stream Chat SDK integration (Sprint 2).
 */

import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { Colors, Borders, Spacing, Typography } from '../../theme/theme';

interface ChatThread {
  id: string;
  name: string;
  role: string;
  lastMessage: string;
  time: string;
  unread: number;
}

const MOCK_THREADS: ChatThread[] = [
  {
    id: '1',
    name: 'Dr. Arjun Sharma',
    role: 'General Physician',
    lastMessage: 'Please take the medication with food and rest well.',
    time: '10:32 AM',
    unread: 2,
  },
  {
    id: '2',
    name: 'LifeCare Pharmacy',
    role: 'Pharmacy',
    lastMessage: 'Your Metformin refill is ready for pickup.',
    time: 'Yesterday',
    unread: 1,
  },
];

export function PatientChatScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {MOCK_THREADS.map((thread) => (
          <Pressable
            key={thread.id}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            testID={`chat-thread-${thread.id}`}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {thread.name.charAt(0)}
              </Text>
            </View>
            <View style={styles.rowBody}>
              <View style={styles.rowTop}>
                <Text style={styles.name}>{thread.name}</Text>
                <Text style={styles.time}>{thread.time}</Text>
              </View>
              <Text style={styles.role}>{thread.role}</Text>
              <Text style={styles.preview} numberOfLines={1}>
                {thread.lastMessage}
              </Text>
            </View>
            {thread.unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{thread.unread}</Text>
              </View>
            )}
          </Pressable>
        ))}

        <View style={styles.sdkNote}>
          <Text style={styles.sdkNoteText}>
            💬 Full chat powered by Stream Chat SDK — Sprint 2
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.black,
  },
  title: { ...Typography.heading },
  list: { paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowPressed: { backgroundColor: '#f5f5f5' },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.trustBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 18 },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontWeight: '700', fontSize: 15, color: Colors.black },
  time: { fontSize: 12, color: '#888' },
  role: { fontSize: 12, color: Colors.trustBlue, marginBottom: 2 },
  preview: { fontSize: 13, color: '#555' },
  badge: {
    backgroundColor: Colors.alertRed,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  sdkNote: {
    margin: Spacing.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
  },
  sdkNoteText: { color: '#888', fontSize: 13, textAlign: 'center' },
});

