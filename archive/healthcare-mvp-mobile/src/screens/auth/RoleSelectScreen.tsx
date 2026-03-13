/**
 * screens/auth/RoleSelectScreen.tsx
 * Project Dhanvanthri — Dev/demo role picker
 *
 * Tap a card to jump directly to a portal without logging in.
 * Remove this screen (or gate it behind __DEV__) before production.
 */

import React from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { Colors, Borders, Spacing, Typography } from '../../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RoleSelect'>;

interface RoleCard {
  label: string;
  description: string;
  destination: keyof RootStackParamList;
  accent: string;
}

const ROLES: RoleCard[] = [
  {
    label: 'Patient',
    description: 'Book appointments, join video calls, order medications',
    destination: 'PatientPortal',
    accent: Colors.trustBlue,
  },
  {
    label: 'Doctor',
    description: "Today's queue, clinical notes, prescriptions, consultations",
    destination: 'DoctorPortal',
    accent: Colors.black,
  },
  {
    label: 'Pharmacy',
    description: 'Incoming orders, Rx verification queue, catalog management',
    destination: 'PharmacyPortal',
    accent: Colors.alertGreen,
  },
];

export function RoleSelectScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Choose Portal</Text>
        <Text style={styles.subtitle}>
          Select your role to preview the portal.{'\n'}
          <Text style={styles.devBadge}>DEV / DEMO MODE</Text>
        </Text>

        {ROLES.map((role) => (
          <Pressable
            key={role.label}
            style={({ pressed }) => [
              styles.card,
              { borderColor: role.accent },
              pressed && styles.cardPressed,
            ]}
            onPress={() =>
              navigation.replace(role.destination as any)
            }
            testID={`role-${role.label.toLowerCase()}`}
          >
            <View style={[styles.accent, { backgroundColor: role.accent }]} />
            <View style={styles.cardBody}>
              <Text style={[styles.cardTitle, { color: role.accent }]}>
                {role.label}
              </Text>
              <Text style={styles.cardDesc}>{role.description}</Text>
            </View>
            <Text style={[styles.arrow, { color: role.accent }]}>→</Text>
          </Pressable>
        ))}

        <Pressable
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginLinkText}>← Back to Login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: 48 },
  title: { ...Typography.heading, fontSize: 28, marginBottom: 8 },
  subtitle: { ...Typography.body, color: '#555', marginBottom: 36, lineHeight: 22 },
  devBadge: {
    color: Colors.alertRed,
    fontWeight: '700',
    fontSize: 12,
  },
  card: {
    ...Borders.standard,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.8 },
  accent: { width: 6, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  cardDesc: { ...Typography.body, color: '#444', lineHeight: 20 },
  arrow: { fontSize: 22, fontWeight: '700', paddingRight: 16 },
  loginLink: { alignItems: 'center', marginTop: 32 },
  loginLinkText: { color: Colors.trustBlue, fontSize: 14, textDecorationLine: 'underline' },
});

