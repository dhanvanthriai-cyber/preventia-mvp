/**
 * navigation/types.ts
 * Project Preventia — Centralised navigation type definitions
 *
 * Three role-based portal trees:
 *   1. Patient  — bottom-tab: Home | Appointments | Chat | Pharmacy | Profile
 *   2. Doctor   — bottom-tab: Dashboard | Appointments | Patients | Notes | Profile
 *   3. Pharmacy — bottom-tab: Orders | RxQueue | Catalog | Profile
 *
 * Auth flow sits in a separate Root stack that replaces itself with the
 * correct portal once the user's role is known.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// ─── Root Stack (auth gate + role switch) ────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  RoleSelect: undefined;        // dev / demo: pick your role
  PatientPortal: undefined;
  DoctorPortal: undefined;
  PharmacyPortal: undefined;
  SponsorPortal: undefined;
};

// ─── Patient portal ───────────────────────────────────────────────────────────

export type PatientTabParamList = {
  Home: undefined;
  Appointments: undefined;
  Chat: undefined;
  Pharmacy: undefined;
  Profile: undefined;
};

export type PatientHomeProps = CompositeScreenProps<
  BottomTabScreenProps<PatientTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

// ─── Doctor portal ────────────────────────────────────────────────────────────

export type DoctorTabParamList = {
  Dashboard: undefined;
  Appointments: undefined;
  Patients: undefined;
  Notes: undefined;
  Profile: undefined;
};

// ─── Pharmacy portal ──────────────────────────────────────────────────────────

export type PharmacyTabParamList = {
  Orders: undefined;
  RxQueue: undefined;
  Catalog: undefined;
  Profile: undefined;
};

// ─── Sponsor portal ───────────────────────────────────────────────────────────

export type SponsorStackParamList = {
  SponsorDashboard: undefined;
  BookAppointment:  undefined;
  Payment: {
    orderId:       string;
    amount:        number;   // paise (e.g. 250000 = ₹2,500)
    currency:      string;
    description:   string;
    appointmentId: number;
  };
};

