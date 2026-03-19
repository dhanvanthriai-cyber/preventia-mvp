/**
 * screens/pharmacy/PharmacyOrdersScreen.tsx
 * Preventia — Pharmacy incoming orders dashboard
 *
 * Mockup reference: "Provider - Coach Portal.jpeg" (adapted for pharmacy)
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

interface OrderItem {
  id: number;
  patient: string;
  medication: string;
  qty: number;
  type: 'pickup' | 'delivery';
  status: 'new' | 'processing' | 'ready' | 'delivered';
  time: string;
}

const MOCK_ORDERS: OrderItem[] = [
  { id: 1, patient: 'Priya Nair', medication: 'Metformin 500mg', qty: 30, type: 'pickup', status: 'new', time: '10:45 AM' },
  { id: 2, patient: 'Ramesh Gupta', medication: 'Aspirin 75mg', qty: 30, type: 'delivery', status: 'processing', time: '09:30 AM' },
  { id: 3, patient: 'Vijay Kumar', medication: 'Salbutamol Inhaler', qty: 2, type: 'pickup', status: 'ready', time: 'Yesterday' },
];

const STATUS_COLOR: Record<OrderItem['status'], string> = {
  new: Colors.alertYellow,
  processing: Colors.trustBlue,
  ready: Colors.alertGreen,
  delivered: '#888',
};

export function PharmacyOrdersScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>
            {MOCK_ORDERS.filter((o) => o.status === 'new').length} New
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {MOCK_ORDERS.map((order) => (
          <View key={order.id} style={styles.card}>
            <View style={[styles.bar, { backgroundColor: STATUS_COLOR[order.status] }]} />
            <View style={styles.body}>
              <View style={styles.row}>
                <Text style={styles.patient}>{order.patient}</Text>
                <Text style={styles.time}>{order.time}</Text>
              </View>
              <Text style={styles.med}>{order.medication} × {order.qty}</Text>
              <Text style={styles.meta}>
                {order.type === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}
                {'  '}
                <Text style={[styles.statusText, { color: STATUS_COLOR[order.status] }]}>
                  {order.status.toUpperCase()}
                </Text>
              </Text>
            </View>
            {order.status === 'new' && (
              <Pressable style={styles.acceptBtn}>
                <Text style={styles.acceptBtnText}>Accept</Text>
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
  newBadge: {
    backgroundColor: Colors.alertYellow,
    ...Borders.standard,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  newBadgeText: { fontWeight: '700', color: Colors.black },
  list: { padding: Spacing.md, gap: 12 },
  card: { ...Borders.standard, flexDirection: 'row', overflow: 'hidden' },
  bar: { width: 6, alignSelf: 'stretch' },
  body: { flex: 1, padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  patient: { fontWeight: '700', fontSize: 15, color: Colors.black },
  time: { fontSize: 12, color: '#888' },
  med: { fontSize: 13, color: '#444', marginTop: 4 },
  meta: { fontSize: 12, color: '#666', marginTop: 6 },
  statusText: { fontWeight: '700', fontSize: 12 },
  acceptBtn: {
    backgroundColor: Colors.alertGreen,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  acceptBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
});

