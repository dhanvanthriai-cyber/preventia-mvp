/**
 * App.tsx — Root navigation shell
 * Project Preventia | 3-Sided Marketplace
 *
 * Routes by authenticated user role:
 *   RECIPIENT  → RecipientDashboard → ConsultationScreen
 *   SPONSOR    → SponsorDashboard   → BookAppointmentScreen → ConsultationScreen
 *   DOCTOR     → DoctorDashboard    → ConsultationScreen → SoapNoteScreen → PrescriptionUploadScreen
 *   PHARMACIST → PharmacistPrescriptionQueueScreen
 *   ADMIN      → web-only admin portal (mobile app falls back to auth)
 *
 * No external navigation library required — plain React state machine.
 * Swap for React Navigation stack when app grows beyond MVP.
 *
 * Dependency note: install these React Native packages:
 *   npm install @daily-co/react-native-daily-js
 *   npm install react-native-document-picker
 */

import React, { useState } from 'react';
import { View } from 'react-native';

import { AuthUser, useAuth } from '@preventia/shared';
import { AuthScreen }          from './screens/auth/AuthScreen';
import { RecipientDashboard }  from './screens/recipient/RecipientDashboard';
import { SponsorDashboard }    from './screens/sponsor/SponsorDashboard';
import { BookAppointmentScreen } from './screens/sponsor/BookAppointmentScreen';
import { DoctorDashboard }     from './screens/doctor/DoctorDashboard';
import { SoapNoteScreen }      from './screens/doctor/SoapNoteScreen';
import { PrescriptionUploadScreen } from './screens/doctor/PrescriptionUploadScreen';
import { PharmacistPrescriptionQueueScreen }
  from './screens/PharmacistPrescriptionQueueScreen';
import { ConsultationScreen }  from './screens/consultation/ConsultationScreen';

// ---------------------------------------------------------------------------
// Screen type — the app's navigation state machine
// ---------------------------------------------------------------------------

type Screen =
  | { name: 'auth' }
  | { name: 'recipient-dashboard' }
  | { name: 'sponsor-dashboard' }
  | { name: 'book-appointment' }
  | { name: 'doctor-dashboard' }
  | { name: 'pharmacist-queue' }
  | { name: 'consultation'; roomUrl: string; token: string; appointmentId: number }
  | { name: 'soap-note'; appointmentId: number; patientId: number }
  | { name: 'prescription-upload'; appointmentId: number };

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

export default function App() {
  const { user, login, register, logout } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: 'auth' });

  // Called after successful login/register — route by role
  const handleAuthSuccess = (authedUser: AuthUser) => {
    switch (authedUser.role) {
      case 'RECIPIENT':   setScreen({ name: 'recipient-dashboard' }); break;
      case 'SPONSOR':     setScreen({ name: 'sponsor-dashboard' });   break;
      case 'DOCTOR':      setScreen({ name: 'doctor-dashboard' });    break;
      case 'PHARMACIST':  setScreen({ name: 'pharmacist-queue' });    break;
      case 'ADMIN':       setScreen({ name: 'auth' });                break;
    }
  };

  const handleLogout = () => {
    logout();
    setScreen({ name: 'auth' });
  };

  const goConsultation = (roomUrl: string, token: string, appointmentId: number) =>
    setScreen({ name: 'consultation', roomUrl, token, appointmentId });

  const handleViewPrescription = async (appointmentId: number) => {
    if (!user) return;
    try {
      const res = await fetch(
        `${process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080'}/api/v1/appointments/${appointmentId}/prescription/view`,
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      if (res.ok) {
        const { url } = await res.json();
        const { Linking } = require('react-native');
        Linking.openURL(url);
      }
    } catch (e) { console.error('[App] viewPrescription error', e); }
  };

  if (!user && screen.name !== 'auth') setScreen({ name: 'auth' });

  // ---------------------------------------------------------------------------
  // Render current screen
  // ---------------------------------------------------------------------------

  if (screen.name === 'auth' || !user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  if (screen.name === 'consultation') {
    return (
      <ConsultationScreen
        roomUrl={screen.roomUrl}
        token={screen.token}
        appointmentId={screen.appointmentId}
        onSessionEnd={() => {
          // Return to role dashboard after session ends
          switch (user.role) {
            case 'RECIPIENT':  setScreen({ name: 'recipient-dashboard' }); break;
            case 'SPONSOR':    setScreen({ name: 'sponsor-dashboard' });   break;
            case 'DOCTOR':     setScreen({ name: 'doctor-dashboard' });    break;
            default:           setScreen({ name: 'auth' });
          }
        }}
      />
    );
  }

  if (screen.name === 'soap-note') {
    return (
      <SoapNoteScreen
        user={user}
        appointmentId={screen.appointmentId}
        patientId={screen.patientId}
        onSuccess={() => setScreen({ name: 'doctor-dashboard' })}
        onCancel={() => setScreen({ name: 'doctor-dashboard' })}
      />
    );
  }

  if (screen.name === 'prescription-upload') {
    return (
      <PrescriptionUploadScreen
        user={user}
        appointmentId={screen.appointmentId}
        onSuccess={() => setScreen({ name: 'doctor-dashboard' })}
        onCancel={() => setScreen({ name: 'doctor-dashboard' })}
      />
    );
  }

  if (screen.name === 'book-appointment' && user.role === 'SPONSOR') {
    return (
      <BookAppointmentScreen
        user={user}
        onSuccess={(apptId, roomUrl, sponsorToken) =>
          goConsultation(roomUrl, sponsorToken, apptId)}
        onCancel={() => setScreen({ name: 'sponsor-dashboard' })}
      />
    );
  }

  // Role dashboards
  if (user.role === 'RECIPIENT') {
    return (
      <RecipientDashboard
        user={user}
        onJoinConsultation={goConsultation}
        onLogout={handleLogout}
      />
    );
  }

  if (user.role === 'SPONSOR') {
    return (
      <SponsorDashboard
        user={user}
        onBookAppointment={() => setScreen({ name: 'book-appointment' })}
        onJoinConsultation={goConsultation}
        onViewPrescription={handleViewPrescription}
        onLogout={handleLogout}
      />
    );
  }

  if (user.role === 'DOCTOR') {
    return (
      <DoctorDashboard
        user={user}
        onJoinConsultation={goConsultation}
        onWriteSoapNote={apptId =>
          setScreen({ name: 'soap-note', appointmentId: apptId, patientId: 0 })}
        onUploadPrescription={apptId =>
          setScreen({ name: 'prescription-upload', appointmentId: apptId })}
        onLogout={handleLogout}
      />
    );
  }

  if (user.role === 'PHARMACIST') {
    return <PharmacistPrescriptionQueueScreen />;
  }

  // Fallback
  return <View />;
}
