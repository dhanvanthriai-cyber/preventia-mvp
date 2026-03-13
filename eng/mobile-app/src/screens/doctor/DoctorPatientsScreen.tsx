/**
 * screens/doctor/DoctorPatientsScreen.tsx
 * Dhanvanthri — Doctor's patient list
 */

import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { Colors, Borders, Spacing, Typography } from '../../theme/theme';

interface PatientRow {
  id: number;
  name: string;
  age: number;
  lastVisit: string;
  conditions: string;
}

const MOCK_PATIENTS: PatientRow[] = [
  { id: 1, name: 'Priya Nair', age: 44, lastVisit: 'Today', conditions: 'T2 Diabetes, Hypertension' },
  { id: 2, name: 'Ramesh Gupta', age: 62, lastVisit: '5 Mar 2026', conditions: 'Coronary Artery Disease' },
  { id: 3, name: 'Anita Singh', age: 35, lastVisit: '1 Mar 2026', conditions: 'Anxiety, Hypothyroidism' },
  { id: 4, name: 'Vijay Kumar', age: 71, lastVisit: '20 Feb 2026', conditions: 'COPD, Arthritis' },
];

export function DoctorPatientsScreen() {
  const [query, setQuery] = React.useState('');
  const filtered = MOCK_PATIENTS.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Patients</Text>
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search by name…"
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          testID="patient-search"
        />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {filtered.map((p) => (
          <Pressable
            key={p.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.initials}>
              <Text style={styles.initialsText}>{p.name.charAt(0)}</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.meta}>Age {p.age}  ·  Last visit: {p.lastVisit}</Text>
              <Text style={styles.conditions} numberOfLines={1}>{p.conditions}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
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
  searchWrap: { padding: Spacing.md, paddingBottom: 8 },
  search: {
    ...Borders.standard,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.black,
  },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cardPressed: { backgroundColor: '#f5f5f5' },
  initials: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  initialsText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  body: { flex: 1 },
  name: { fontWeight: '700', fontSize: 15, color: Colors.black },
  meta: { fontSize: 12, color: '#666', marginTop: 2 },
  conditions: { fontSize: 12, color: Colors.trustBlue, marginTop: 3 },
  arrow: { fontSize: 22, color: '#ccc' },
});

