/**
 * screens/doctor/DoctorAppointmentsScreen.tsx
 * Dhanvanthri — Doctor's full schedule view
 */

import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Borders, Spacing, Typography } from '../../theme/theme';

export function DoctorAppointmentsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.placeholder}>
          📅 Full calendar with availability slots — Sprint 1
        </Text>
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
  content: { padding: Spacing.md, flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 24 },
});

