/**
 * screens/pharmacy/PharmacyRxQueueScreen.tsx
 * Preventia — Pharmacy Rx verification queue
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

interface RxItem {
  id: number;
  patient: string;
  doctor: string;
  medication: string;
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected';
}

const MOCK_RX: RxItem[] = [
  { id: 1, patient: 'Priya Nair', doctor: 'Dr. Arjun Sharma', medication: 'Metformin 500mg × 30', uploadedAt: 'Today 10:35 AM', status: 'pending' },
  { id: 2, patient: 'Vijay Kumar', doctor: 'Dr. Meena Iyer', medication: 'Amlodipine 5mg × 30', uploadedAt: 'Yesterday', status: 'verified' },
];

const STATUS_COLOR: Record<RxItem['status'], string> = {
  pending: Colors.alertYellow,
  verified: Colors.alertGreen,
  rejected: Colors.alertRed,
};

export function PharmacyRxQueueScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Rx Queue</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {MOCK_RX.map((rx) => (
          <View key={rx.id} style={styles.card}>
            <View style={[styles.bar, { backgroundColor: STATUS_COLOR[rx.status] }]} />
            <View style={styles.body}>
              <Text style={styles.patient}>{rx.patient}</Text>
              <Text style={styles.doctor}>Prescribed by {rx.doctor}</Text>
              <Text style={styles.medication}>{rx.medication}</Text>
              <Text style={styles.time}>{rx.uploadedAt}</Text>
              <Text style={[styles.status, { color: STATUS_COLOR[rx.status] }]}>
                {rx.status.toUpperCase()}
              </Text>
            </View>
            {rx.status === 'pending' && (
              <View style={styles.actions}>
                <Pressable style={[styles.actionBtn, { backgroundColor: Colors.alertGreen }]}>
                  <Text style={styles.actionText}>✓</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, { backgroundColor: Colors.alertRed }]}>
                  <Text style={styles.actionText}>✗</Text>
                </Pressable>
              </View>
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
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.black,
  },
  title: { ...Typography.heading },
  list: { padding: Spacing.md, gap: 12 },
  card: { ...Borders.standard, flexDirection: 'row', overflow: 'hidden' },
  bar: { width: 6, alignSelf: 'stretch' },
  body: { flex: 1, padding: 12 },
  patient: { fontWeight: '700', fontSize: 15, color: Colors.black },
  doctor: { fontSize: 12, color: Colors.trustBlue, marginTop: 2 },
  medication: { fontSize: 13, color: '#444', marginTop: 4, fontWeight: '500' },
  time: { fontSize: 11, color: '#888', marginTop: 4 },
  status: { fontSize: 11, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  actions: { justifyContent: 'space-evenly', paddingHorizontal: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  actionText: { color: Colors.white, fontWeight: '900', fontSize: 16 },
});

