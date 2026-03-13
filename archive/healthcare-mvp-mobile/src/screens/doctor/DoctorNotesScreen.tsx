/**
 * screens/doctor/DoctorNotesScreen.tsx
 * Dhanvanthri — Doctor's clinical notes (SOAP format)
 */

import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Colors, Borders, Spacing, Typography } from '../../theme/theme';

interface NoteRow {
  id: number;
  patient: string;
  date: string;
  summary: string;
  hasPrescription: boolean;
}

const MOCK_NOTES: NoteRow[] = [
  { id: 1, patient: 'Priya Nair', date: 'Today 10:30 AM', summary: 'Follow-up on Metformin dosage. HbA1c improved to 6.8%.', hasPrescription: true },
  { id: 2, patient: 'Ramesh Gupta', date: '5 Mar 2026', summary: 'Chest pain resolved. ECG normal. Continue Aspirin 75mg.', hasPrescription: true },
  { id: 3, patient: 'Anita Singh', date: '1 Mar 2026', summary: 'Anxiety triggers discussed. Referred to therapist.', hasPrescription: false },
];

export function DoctorNotesScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Clinical Notes</Text>
        <Pressable style={styles.newBtn}>
          <Text style={styles.newBtnText}>+ New Note</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {MOCK_NOTES.map((note) => (
          <Pressable
            key={note.id}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.cardTop}>
              <Text style={styles.patient}>{note.patient}</Text>
              {note.hasPrescription && (
                <View style={styles.rxTag}>
                  <Text style={styles.rxTagText}>Rx</Text>
                </View>
              )}
            </View>
            <Text style={styles.date}>{note.date}</Text>
            <Text style={styles.summary} numberOfLines={2}>{note.summary}</Text>
          </Pressable>
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
  newBtn: {
    ...Borders.standard,
    backgroundColor: Colors.trustBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: { color: Colors.white, fontWeight: '700' },
  list: { padding: Spacing.md, gap: 12 },
  card: {
    ...Borders.standard,
    padding: 14,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patient: { fontWeight: '700', fontSize: 15, color: Colors.black },
  rxTag: {
    backgroundColor: Colors.alertGreen,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rxTagText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  date: { fontSize: 12, color: '#888', marginTop: 4 },
  summary: { fontSize: 13, color: '#444', marginTop: 6, lineHeight: 20 },
});

