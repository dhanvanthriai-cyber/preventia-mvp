/**
 * screens/patient/PatientPharmacyScreen.tsx
 * Project Preventia — Patient pharmacy / medication orders view
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

interface OrderRow {
  id: number;
  medication: string;
  pharmacy: string;
  status: 'pending' | 'verified' | 'ready' | 'delivered';
  date: string;
  price: string;
}

const MOCK_ORDERS: OrderRow[] = [
  {
    id: 1,
    medication: 'Metformin 500mg × 30',
    pharmacy: 'LifeCare Pharmacy',
    status: 'ready',
    date: '11 Mar 2026',
    price: '₹120',
  },
  {
    id: 2,
    medication: 'Atorvastatin 10mg × 30',
    pharmacy: 'LifeCare Pharmacy',
    status: 'verified',
    date: '10 Mar 2026',
    price: '₹85',
  },
];

const STATUS_LABELS: Record<OrderRow['status'], string> = {
  pending: 'Pending Review',
  verified: 'Rx Verified',
  ready: 'Ready for Pickup',
  delivered: 'Delivered',
};
const STATUS_COLORS: Record<OrderRow['status'], string> = {
  pending: Colors.alertYellow,
  verified: Colors.trustBlue,
  ready: Colors.alertGreen,
  delivered: '#888',
};

export function PatientPharmacyScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Pharmacy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Active Orders</Text>

        {MOCK_ORDERS.map((order) => (
          <View key={order.id} style={styles.card}>
            <View style={[styles.statusBar, { backgroundColor: STATUS_COLORS[order.status] }]} />
            <View style={styles.cardBody}>
              <Text style={styles.medName}>{order.medication}</Text>
              <Text style={styles.pharmacy}>{order.pharmacy}</Text>
              <View style={styles.rowMeta}>
                <Text style={[styles.status, { color: STATUS_COLORS[order.status] }]}>
                  {STATUS_LABELS[order.status]}
                </Text>
                <Text style={styles.price}>{order.price}</Text>
              </View>
              <Text style={styles.date}>{order.date}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionLabel}>Prescriptions</Text>
        <View style={styles.rxNote}>
          <Text style={styles.rxNoteText}>
            📄 Doctor-uploaded prescriptions appear here.{'\n'}
            Tap a prescription to send it to a pharmacy.
          </Text>
        </View>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#555',
    marginBottom: 10,
    marginTop: 16,
  },
  card: {
    ...Borders.standard,
    flexDirection: 'row',
    marginBottom: 12,
    overflow: 'hidden',
  },
  statusBar: { width: 6, alignSelf: 'stretch' },
  cardBody: { flex: 1, padding: 12 },
  medName: { fontWeight: '700', fontSize: 15, color: Colors.black },
  pharmacy: { fontSize: 13, color: '#555', marginTop: 2 },
  rowMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  status: { fontSize: 12, fontWeight: '700' },
  price: { fontFamily: 'System', fontSize: 14, fontWeight: '700', color: Colors.black },
  date: { fontSize: 11, color: '#888', marginTop: 4 },
  rxNote: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 16,
    borderRadius: 4,
  },
  rxNoteText: { color: '#666', fontSize: 13, lineHeight: 20 },
});

