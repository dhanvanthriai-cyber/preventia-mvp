/**
 * SponsorDashboard.tsx — NRI Sponsor home screen
 * Project Dhanvanthri | Neo-Brutalist Wellness
 *
 * Shows:
 *  - Parent's next appointment (ActionCard → join as observer)
 *  - Parent's medication alerts (critical/warning summary)
 *  - Book new appointment CTA
 *  - Prescription view link (last uploaded)
 *
 * API calls:
 *  GET /api/v1/appointments?sponsorId={userId}   → upcoming appointments
 *  GET /api/v1/patients/{recipientId}/medications/alerts
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, SafeAreaView,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import ActionCard from '../../components/ActionCard';
import { Colors, Spacing, Typography } from '../../theme/theme';
import { AuthUser } from '../../hooks/useAuth';

const API_BASE = process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080';

interface Props {
  user: AuthUser;
  onBookAppointment: () => void;
  onJoinConsultation: (roomUrl: string, token: string, appointmentId: number) => void;
  onViewPrescription: (appointmentId: number) => void;
  onLogout: () => void;
}

interface Appointment {
  id: number; dailyRoomUrl: string; recipientToken: string;
  startTime: string; endTime: string; status: string;
  doctorName?: string;
}

interface MedAlert { urgency: string; medicationName: string; daysRemaining: number; }

export const SponsorDashboard: React.FC<Props> = ({
  user, onBookAppointment, onJoinConsultation, onViewPrescription, onLogout,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications]   = useState<MedAlert[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [apptRes, medRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/appointments?sponsorId=${user.userId}`,
          { headers: { Authorization: `Bearer ${user.token}` } }),
        fetch(`${API_BASE}/api/v1/patients/linked/medications/alerts`,
          { headers: { Authorization: `Bearer ${user.token}` } }),
      ]);
      if (apptRes.ok) setAppointments(await apptRes.json());
      if (medRes.ok)  setMedications(await medRes.json());
    } catch (e) { console.error('[SponsorDashboard]', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const nextAppt = appointments.find(a => a.status === 'SCHEDULED' || a.status === 'ACTIVE');
  const criticals = medications.filter(m => m.urgency === 'CRITICAL');

  if (loading) return <View style={s.centered}><ActivityIndicator color={Colors.trustBlue} size="large" /></View>;

  return (
    <SafeAreaView style={s.root}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.trustBlue} />}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.greeting}>Welcome, {user.name.split(' ')[0]}</Text>
          <Text style={s.role}>NRI SPONSOR</Text>
        </View>

        {/* Next appointment */}
        <Text style={s.sectionTitle}>NEXT CONSULTATION</Text>
        {nextAppt ? (
          <ActionCard
            urgency={nextAppt.status === 'ACTIVE' ? 'critical' : 'normal'}
            title={nextAppt.doctorName ?? 'Upcoming Appointment'}
            subtitle={new Date(nextAppt.startTime).toLocaleString()}
            value={nextAppt.status}
            ctaLabel={nextAppt.status === 'ACTIVE' ? 'Join Now (Observer)' : 'View Details'}
            onPress={() => onJoinConsultation(nextAppt.dailyRoomUrl, nextAppt.recipientToken, nextAppt.id)}
          />
        ) : (
          <ActionCard urgency="normal" title="No upcoming appointments"
            subtitle="Book a consultation for your parent"
            ctaLabel="Book Appointment" onPress={onBookAppointment} />
        )}

        {/* Book new */}
        <Text style={s.sectionTitle}>ACTIONS</Text>
        <ActionCard urgency="normal" title="Book New Consultation"
          subtitle="Schedule with a doctor for your parent"
          ctaLabel="Book Now" onPress={onBookAppointment} />

        {/* Critical medications */}
        {criticals.length > 0 && (
          <>
            <Text style={s.sectionTitle}>⚠️ CRITICAL MEDICATIONS</Text>
            {criticals.map(m => (
              <ActionCard key={m.medicationName} urgency="critical"
                title={m.medicationName}
                value={`${m.daysRemaining} days left`}
                ctaLabel="Request Refill" onPress={() => {}} />
            ))}
          </>
        )}

        {/* Prescription */}
        {nextAppt && (
          <>
            <Text style={s.sectionTitle}>PRESCRIPTION</Text>
            <ActionCard urgency="normal" title="View Last Prescription"
              subtitle="15-min secure PDF link"
              ctaLabel="View PDF" onPress={() => onViewPrescription(nextAppt.id)} />
          </>
        )}

        {/* Logout */}
        <View style={s.logoutRow}>
          <Text style={s.logoutBtn} onPress={onLogout}>LOG OUT</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.white },
  centered:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  padding: Spacing.md, borderBottomWidth: 2, borderColor: Colors.black },
  greeting:     { fontFamily: 'PlayfairDisplay-Bold', fontSize: 20, color: Colors.black },
  role:         { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: Colors.trustBlue, letterSpacing: 1 },
  sectionTitle: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: Colors.black,
                  letterSpacing: 1.5, marginLeft: Spacing.md, marginTop: Spacing.lg, marginBottom: 4 },
  logoutRow:    { margin: Spacing.xl, alignItems: 'center' },
  logoutBtn:    { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: Colors.alertRed,
                  textDecorationLine: 'underline', letterSpacing: 1 },
});

export default SponsorDashboard;
