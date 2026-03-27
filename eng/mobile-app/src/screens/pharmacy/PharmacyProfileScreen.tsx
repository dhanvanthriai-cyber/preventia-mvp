/**
 * screens/pharmacy/PharmacyProfileScreen.tsx
 * Preventia — Pharmacy profile and settings
 */

import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Colors, Borders, Spacing, Typography } from '../../theme/theme';

export function PharmacyProfileScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>L</Text>
          </View>
          <View>
            <Text style={styles.name}>LifeCare Pharmacy</Text>
            <Text style={styles.sub}>Mumbai, Maharashtra</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Pharmacy Details</Text>
        {[
          ['License No.', 'PHA-MH-2018-04521'],
          ['Service Area', 'Andheri, Mumbai'],
          ['Delivery Available', 'Yes (5 km radius)'],
          ['Operating Hours', 'Mon–Sun, 8 AM – 10 PM'],
        ].map(([label, value]) => (
          <View key={label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
          </View>
        ))}

        <Text style={styles.sectionLabel}>Account</Text>
        {['Edit Profile', 'Delivery Settings', 'Notification Preferences', 'Help & Support'].map((item) => (
          <Pressable
            key={item}
            style={({ pressed }) => [styles.menuItem, pressed && { backgroundColor: '#f5f5f5' }]}
          >
            <Text style={styles.menuItemText}>{item}</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}

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
    ...Borders.standard,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.alertGreen,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { color: Colors.white, fontSize: 28, fontWeight: '700' },
  name: { ...Typography.subheading, fontWeight: '700' },
  sub: { fontSize: 13, color: '#555' },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.5,
    textTransform: 'uppercase', color: '#555', marginBottom: 8, marginTop: 20,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  detailLabel: { fontSize: 14, color: '#333' },
  detailValue: { fontSize: 14, color: Colors.black, fontWeight: '700', maxWidth: '55%', textAlign: 'right' },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  menuItemText: { fontSize: 15, color: Colors.black },
  arrow: { fontSize: 20, color: '#aaa' },
  logoutBtn: {
    marginTop: 32, borderWidth: 2, borderColor: Colors.alertRed,
    padding: 14, alignItems: 'center',
  },
  logoutText: { color: Colors.alertRed, fontWeight: '700', fontSize: 15 },
});

