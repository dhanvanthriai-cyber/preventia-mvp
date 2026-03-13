/**
 * screens/patient/PatientHomeScreen.tsx
 * Project Dhanvanthri — Patient home dashboard
 *
 * Mockup reference: "User Mobile view.jpeg"
 * Shows: urgent sticky banner, upcoming appointments, action cards.
 */

import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { ActionCard } from '../../components/ActionCard';
import { Colors, Spacing, Typography } from '../../theme/theme';

export function PatientHomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      {/* Sticky urgent banner */}
      <ActionCard
        title="URGENT POST VISIT"
        subtitle="Follow up with Dr. Arjun Sharma within 48 hours"
        urgency="critical"
        ctaLabel="Book Follow-Up"
        onPress={() => {}}
        isSticky
        testID="sticky-banner"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>Good morning, Priya 👋</Text>
        <Text style={styles.sectionLabel}>Upcoming</Text>

        <ActionCard
          title="Appointment in 30 mins"
          subtitle="Dr. Arjun Sharma · General Physician"
          value="TODAY  10:30 AM"
          urgency="normal"
          ctaLabel="Join Virtual Call"
          onPress={() => {}}
          testID="card-appt"
        />

        <Text style={styles.sectionLabel}>Medications</Text>

        <ActionCard
          title="Metformin 500mg"
          subtitle="Take with food — 2 tablets remaining"
          value="2 LEFT"
          urgency="warning"
          ctaLabel="Order Refill"
          onPress={() => {}}
          testID="card-med"
        />

        <ActionCard
          title="Atorvastatin 10mg"
          subtitle="Last refill: 28 Feb 2026"
          value="14 LEFT"
          urgency="normal"
          ctaLabel="View Prescription"
          onPress={() => {}}
          testID="card-med-2"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  scroll: { flex: 1, marginTop: 64 }, // offset for sticky banner height
  content: { paddingHorizontal: Spacing.md, paddingBottom: 32 },
  greeting: { ...Typography.heading, marginTop: 16, marginBottom: 8 },
  sectionLabel: {
    ...Typography.subheading,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#555',
    marginTop: 24,
    marginBottom: 8,
  },
});

