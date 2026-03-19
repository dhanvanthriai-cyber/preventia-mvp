/**
 * screens/pharmacy/PharmacyCatalogScreen.tsx
 * Preventia — Medication catalog management
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

interface CatalogItem {
  id: number;
  name: string;
  form: string;
  stock: number;
  price: string;
  status: 'in-stock' | 'low' | 'out';
}

const MOCK_CATALOG: CatalogItem[] = [
  { id: 1, name: 'Metformin 500mg', form: 'Tablet × 10', stock: 240, price: '₹40', status: 'in-stock' },
  { id: 2, name: 'Atorvastatin 10mg', form: 'Tablet × 10', stock: 18, price: '₹28', status: 'low' },
  { id: 3, name: 'Salbutamol Inhaler', form: '200 doses', stock: 0, price: '₹145', status: 'out' },
  { id: 4, name: 'Aspirin 75mg', form: 'Tablet × 14', stock: 560, price: '₹12', status: 'in-stock' },
];

const STOCK_COLOR: Record<CatalogItem['status'], string> = {
  'in-stock': Colors.alertGreen,
  low: Colors.alertYellow,
  out: Colors.alertRed,
};

export function PharmacyCatalogScreen() {
  const [query, setQuery] = React.useState('');
  const filtered = MOCK_CATALOG.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Catalog</Text>
        <Pressable style={styles.uploadBtn}>
          <Text style={styles.uploadBtnText}>CSV Upload</Text>
        </Pressable>
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search medications…"
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {filtered.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: '#f5f5f5' }]}
          >
            <View style={[styles.stockDot, { backgroundColor: STOCK_COLOR[item.status] }]} />
            <View style={styles.rowBody}>
              <Text style={styles.medName}>{item.name}</Text>
              <Text style={styles.form}>{item.form}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.price}>{item.price}</Text>
              <Text style={[styles.stock, { color: STOCK_COLOR[item.status] }]}>
                {item.status === 'out' ? 'Out of Stock' : `${item.stock} units`}
              </Text>
            </View>
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
  uploadBtn: {
    ...Borders.standard,
    backgroundColor: Colors.black,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  uploadBtnText: { color: Colors.white, fontWeight: '700', fontSize: 12 },
  searchWrap: { padding: Spacing.md, paddingBottom: 4 },
  search: {
    ...Borders.standard,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.black,
  },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stockDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  rowBody: { flex: 1 },
  medName: { fontWeight: '600', fontSize: 14, color: Colors.black },
  form: { fontSize: 12, color: '#777', marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  price: { fontWeight: '700', fontSize: 14, color: Colors.black },
  stock: { fontSize: 11, fontWeight: '600', marginTop: 2 },
});

