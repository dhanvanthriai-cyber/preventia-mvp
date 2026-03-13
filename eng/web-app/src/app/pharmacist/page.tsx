/**
 * /pharmacist — Pharmacist Portal
 * Project Dhanvanthri
 *
 * TODO: wrap with auth guard — requires PHARMACIST role.
 */
import type { Metadata } from 'next';
import PharmacistQueue from '@/components/PharmacistQueue';

export const metadata: Metadata = {
  title: 'Pharmacist Portal — Dhanvanthri',
};

export default function PharmacistPage() {
  return <PharmacistQueue />;
}
