/**
 * /doctor — Doctor Portal
 * Project Dhanvanthri
 *
 * TODO: wrap with auth guard — requires DOCTOR role.
 * TODO: pass real AuthUser from session / cookie.
 */
import type { Metadata } from 'next';
import DoctorDashboard from '@/components/DoctorDashboard';

export const metadata: Metadata = {
  title: 'Doctor Portal — Dhanvanthri',
};

export default function DoctorPage() {
  return <DoctorDashboard />;
}
