/**
 * RecipientDashboard.tsx — Indian parent/elder home screen
 * Project Dhanvanthri | Neo-Brutalist Wellness
 *
 * Minimal, friction-free UX for elderly users.
 * Large text, high contrast, single CTA per section.
 *
 * API calls:
 *  GET /api/v1/appointments?recipientId={userId}
 *  GET /api/v1/patients/{userId}/medications/alerts
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
  onJoinConsultation: (roomUrl: string, token: string, appointmentId: number) => void;
  onLogout: () => void;
}

interface Appointment {
  id: number; dailyRoomUrl: string; recipientToken: string;
  startTime: string; status: string; doctorName?: string;
}
interface MedAlert { urgency: string; medicationName: string; daysRemaining: number; }

export const RecipientDashboard: React.FC<Props> = ({ user, onJoinConsultation, onLogout }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications]   = useState<MedAlert[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [apptRes, medRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/appointments?recipientId=${user.userId}`,
          { headers: { Authorization: `Bearer ${user.token}` } }),
        fetch(`${API_BASE}/api/v1/patients/${user.userId}/medications/alerts`,
          { headers: { Authorization: `Bearer ${user.token}` } }),
      ]);
      if (apptRes.ok) setAppointments(await apptRes.json());
      if (medRes.ok)  setMedications(await medRes.json());
    } catch (e) { console.error('[RecipientDashboard]', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeAppt    = appointments.find(a => a.status === 'ACTIVE');
  const nextAppt      = appointments.find(a => a.status === 'SCHEDULED');
  const criticalMeds  = medications.filter(m => m.urgency === 'CRITICAL');
  const warningMeds   = medications.filter(m => m.urgency === 'WARNING');

  if (loading) return <View style={s.centered}><ActivityIndicator color={Colors.trustBlue} size="large" /></View>;

  return (
    <SafeAreaView style={s.root}>
      <ScrollView refreshControl={
        <RefreshControl refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.trustBlue} />}>

        {/* Header — large, friendly */}
        <View style={s.header}>
          <Text style={s.greeting}>Namaste,{'\n'}{user.name.split(' ')[0]} ji</Text>
        </View>

        {/* Active call — top priority */}
        {activeAppt && (
          <ActionCard urgency="critical" isSticky
            title="YOUR DOCTOR IS WAITING"
            subtitle={activeAppt.doctorName}
            ctaLabel="JOIN CALL NOW"
            onPress={() => onJoinConsultation(activeAppt.dailyRoomUrl, activeAppt.recipientToken, activeAppt.id)} />
        )}

        {/* Next appointment */}
        {!activeAppt && nextAppt && (
          <>
            <Text style={s.section}>UPCOMING APPOINTMENT</Text>
            <ActionCard urgency="normal"
              title={nextAppt.doctorName ?? 'Doctor Appointment'}
              subtitle={new Date(nextAppt.startTime).toLocaleString('en-IN')}
              ctaLabel="Join When Ready"
              onPress={() => onJoinConsultation(nextAppt.dailyRoomUrl, nextAppt.recipientToken, nextAppt.id)} />
          </>
        )}

        {/* No appointments */}
        {!activeAppt && !nextAppt && (
          <>
            <Text style={s.section}>APPOINTMENTS</Text>
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>No upcoming appointments.{'\n'}Your family will schedule one for you.</Text>
            </View>
          </>
        )}

        {/* Critical medications */}
        {criticalMeds.length > 0 && (
          <>
            <Text style={s.section}>⚠️ MEDICINE RUNNING OUT</Text>
            {criticalMeds.map(m => (
              <ActionCard key={m.medicationName} urgency="critical"
                title={m.medicationName}
                value={`${m.daysRemaining} days`}
                ctaLabel="Tell My Family" onPress={() => {}} />
            ))}
          </>
        )}

        {/* Warning medications */}
        {warningMeds.length > 0 && (
          <>
            <Text style={s.section}>MEDICINE — REFILL SOON</Text>
            {warningMeds.map(m => (
              <ActionCard key={m.medicationName} urgency="warning"
                title={m.medicationName}
                value={`${m.daysRemaining} days`}
                ctaLabel="Remind Family" onPress={() => {}} />
            ))}
          </>
        )}

        <View style={s.logoutRow}>
          <Text style={s.logout} onPress={onLogout}>Log Out</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: Colors.white },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:   { padding: Spacing.lg, borderBottomWidth: 2, borderColor: Colors.black, marginBottom: Spacing.sm },
  greeting: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 28, color: Colors.black, lineHeight: 36 },
  section:  { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: Colors.black,
              letterSpacing: 1.5, marginLeft: Spacing.md, marginTop: Spacing.lg, marginBottom: 4 },
  emptyBox: { margin: Spacing.md, borderWidth: 2, borderColor: Colors.trustBlue, padding: Spacing.lg },
  emptyText:{ fontFamily: 'JetBrainsMono-Regular', fontSize: 14, color: Colors.trustBlue,
              textAlign: 'center', lineHeight: 22 },
  logoutRow:{ margin: Spacing.xl, alignItems: 'center' },
  logout:   { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: '#888', textDecorationLine: 'underline' },
});

export default RecipientDashboard;
