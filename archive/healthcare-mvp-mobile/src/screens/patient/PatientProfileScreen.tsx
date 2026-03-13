/**
 * screens/patient/PatientProfileScreen.tsx
 * Project Dhanvanthri — Patient profile: personal details, proxy access, settings
 */

import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
} from 'react-native';
import { Colors, Borders, Spacing, Typography } from '../../theme/theme';

export function PatientProfileScreen() {
  const [proxyEnabled, setProxyEnabled] = React.useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar + name */}
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>P</Text>
          </View>
          <View>
            <Text style={styles.name}>Priya Nair</Text>
            <Text style={styles.email}>priya.nair@example.com</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Personal Details</Text>
        {[
          ['Date of Birth', '12 Apr 1982'],
          ['Blood Group', 'B+'],
          ['ABHA ID', '91-1234-5678-0000'],
          ['Phone', '+91 98765 43210'],
        ].map(([label, value]) => (
          <View key={label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
          </View>
        ))}

        <Text style={styles.sectionLabel}>Loved-One Proxy Access</Text>
        <View style={styles.proxyRow}>
          <View style={styles.proxyText}>
            <Text style={styles.detailLabel}>Allow family member access</Text>
            <Text style={styles.detailValue} numberOfLines={2}>
              Let a trusted person view your appointments and prescriptions
            </Text>
          </View>
          <Switch
            value={proxyEnabled}
            onValueChange={setProxyEnabled}
            trackColor={{ true: Colors.trustBlue, false: '#ccc' }}
            testID="toggle-proxy"
          />
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        {['Edit Profile', 'Change Password', 'Notification Settings', 'Privacy Policy'].map(
          (item) => (
            <Pressable
              key={item}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            >
              <Text style={styles.menuItemText}>{item}</Text>
              <Text style={styles.menuArrow}>›</Text>
            </Pressable>
          ),
        )}

        <Pressable style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
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
  content: { padding: Spacing.md },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.trustBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...Borders.standard,
  },
  avatarText: { color: Colors.white, fontSize: 28, fontWeight: '700' },
  name: { ...Typography.subheading, fontWeight: '700' },
  email: { ...Typography.body, color: '#555' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#555',
    marginBottom: 8,
    marginTop: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  detailValue: { fontSize: 14, color: Colors.black, fontWeight: '700', maxWidth: '55%', textAlign: 'right' },
  proxyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  proxyText: { flex: 1, marginRight: 12 },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemPressed: { backgroundColor: '#f5f5f5' },
  menuItemText: { fontSize: 15, color: Colors.black },
  menuArrow: { fontSize: 20, color: '#aaa' },
  logoutBtn: {
    marginTop: 32,
    borderWidth: 2,
    borderColor: Colors.alertRed,
    padding: 14,
    alignItems: 'center',
  },
  logoutText: { color: Colors.alertRed, fontWeight: '700', fontSize: 15 },
});

