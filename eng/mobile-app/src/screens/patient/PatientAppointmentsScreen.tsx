/**
 * screens/patient/PatientAppointmentsScreen.tsx
 * Project Dhanvanthri — Patient appointments list + booking entry
 */

import React from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors, Borders, Spacing, Typography } from '../../theme/theme';

interface AppointmentRow {
  id: number;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

const MOCK_APPOINTMENTS: AppointmentRow[] = [
  {
    id: 1,
    doctor: 'Dr. Arjun Sharma',
    specialty: 'General Physician',
    date: 'Today',
    time: '10:30 AM',
    status: 'upcoming',
  },
  {
    id: 2,
    doctor: 'Dr. Meena Iyer',
    specialty: 'Cardiologist',
    date: '14 Mar 2026',
    time: '2:00 PM',
    status: 'upcoming',
  },
  {
    id: 3,
    doctor: 'Dr. Arjun Sharma',
    specialty: 'General Physician',
    date: '28 Feb 2026',
    time: '11:00 AM',
    status: 'completed',
  },
];

const STATUS_COLORS: Record<AppointmentRow['status'], string> = {
  upcoming: Colors.trustBlue,
  completed: Colors.alertGreen,
  cancelled: Colors.alertRed,
};

export function PatientAppointmentsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Appointments</Text>
        <Pressable style={styles.bookBtn} testID="btn-book-appt">
          <Text style={styles.bookBtnText}>+ Book</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {MOCK_APPOINTMENTS.map((appt) => (
          <View key={appt.id} style={styles.card}>
            <View
              style={[
                styles.statusBar,
                { backgroundColor: STATUS_COLORS[appt.status] },
              ]}
            />
            <View style={styles.cardBody}>
              <Text style={styles.doctorName}>{appt.doctor}</Text>
              <Text style={styles.specialty}>{appt.specialty}</Text>
              <Text style={styles.datetime}>
                {appt.date}  ·  {appt.time}
              </Text>
              <Text
                style={[styles.statusBadge, { color: STATUS_COLORS[appt.status] }]}
              >
                {appt.status.toUpperCase()}
              </Text>
            </View>
            {appt.status === 'upcoming' && (
              <Pressable style={styles.joinBtn}>
                <Text style={styles.joinBtnText}>Join</Text>
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
  title: { ...Typography.heading },
  bookBtn: {
    ...Borders.standard,
    backgroundColor: Colors.trustBlue,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bookBtnText: { color: Colors.white, fontWeight: '700' },
  list: { padding: Spacing.md, gap: 12 },
  card: {
    ...Borders.standard,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  statusBar: { width: 6, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 12 },
  doctorName: { fontWeight: '700', fontSize: 15, color: Colors.black },
  specialty: { fontSize: 13, color: '#555', marginTop: 2 },
  datetime: {
    fontSize: 12,
    fontFamily: 'System',
    color: '#333',
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  statusBadge: { fontSize: 11, fontWeight: '700', marginTop: 6, letterSpacing: 1 },
  joinBtn: {
    backgroundColor: Colors.trustBlue,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  joinBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
});

