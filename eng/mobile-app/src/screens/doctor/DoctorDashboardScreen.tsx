/**
 * screens/doctor/DoctorDashboardScreen.tsx
 * Project Preventia — Doctor's today queue / dashboard
 *
 * Mockup reference: "Provider - Doctor Portal.jpeg"
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

interface QueueItem {
  id: number;
  patientName: string;
  age: number;
  time: string;
  type: 'video' | 'in-person';
  status: 'waiting' | 'in-progress' | 'done';
}

const QUEUE: QueueItem[] = [
  { id: 1, patientName: 'Priya Nair', age: 44, time: '10:30 AM', type: 'video', status: 'in-progress' },
  { id: 2, patientName: 'Ramesh Gupta', age: 62, time: '11:00 AM', type: 'video', status: 'waiting' },
  { id: 3, patientName: 'Anita Singh', age: 35, time: '11:30 AM', type: 'in-person', status: 'waiting' },
  { id: 4, patientName: 'Vijay Kumar', age: 71, time: '02:00 PM', type: 'video', status: 'waiting' },
];

const STATUS_COLOR: Record<QueueItem['status'], string> = {
  'in-progress': Colors.trustBlue,
  waiting: Colors.alertYellow,
  done: Colors.alertGreen,
};

export function DoctorDashboardScreen() {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dr. Arjun Sharma</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{QUEUE.length}</Text>
          <Text style={styles.countLabel}>Today</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        <Text style={styles.sectionLabel}>Patient Queue</Text>

        {QUEUE.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={[styles.statusBar, { backgroundColor: STATUS_COLOR[item.status] }]} />
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <Text style={styles.patientName}>{item.patientName}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={styles.meta}>Age {item.age}  ·  {item.type === 'video' ? '📹 Video' : '🏥 In-person'}</Text>
              <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>
                {item.status === 'in-progress' ? 'IN PROGRESS' : item.status.toUpperCase()}
              </Text>
            </View>
            {item.status !== 'done' && (
              <Pressable
                style={[
                  styles.actionBtn,
                  { backgroundColor: item.status === 'in-progress' ? Colors.trustBlue : Colors.black },
                ]}
              >
                <Text style={styles.actionBtnText}>
                  {item.status === 'in-progress' ? 'Resume' : 'Start'}
                </Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.black,
  },
  title: { ...Typography.heading, fontSize: 20 },
  date: { ...Typography.body, color: '#555', marginTop: 2 },
  countBadge: {
    ...Borders.standard,
    backgroundColor: Colors.trustBlue,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
  },
  countText: { color: Colors.white, fontSize: 22, fontWeight: '900' },
  countLabel: { color: Colors.white, fontSize: 11, fontWeight: '600' },
  list: { padding: Spacing.md },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#555',
    marginBottom: 10,
  },
  card: {
    ...Borders.standard,
    flexDirection: 'row',
    marginBottom: 12,
    overflow: 'hidden',
  },
  statusBar: { width: 6, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  patientName: { fontWeight: '700', fontSize: 15, color: Colors.black },
  time: { fontSize: 13, color: '#555' },
  meta: { fontSize: 13, color: '#666', marginTop: 4 },
  status: { fontSize: 11, fontWeight: '700', marginTop: 6, letterSpacing: 1 },
  actionBtn: {
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  actionBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
});

