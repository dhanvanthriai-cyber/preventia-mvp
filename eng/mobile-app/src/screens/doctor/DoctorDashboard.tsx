/**
 * DoctorDashboard.tsx — Doctor home screen
 * Project Dhanvanthri | Neo-Brutalist Wellness
 *
 * Shows today's schedule, active calls, and quick actions.
 *
 * API calls:
 *  GET /api/v1/appointments?doctorId={userId}
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, SafeAreaView,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import ActionCard from '../../components/ActionCard';
import { Colors, Spacing, Typography } from '../../theme/theme';
import { AuthUser } from '@dhanvanthri/shared';

const API_BASE = process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080';

interface Props {
  user: AuthUser;
  onJoinConsultation: (roomUrl: string, token: string, appointmentId: number) => void;
  onWriteSoapNote: (appointmentId: number) => void;
  onUploadPrescription: (appointmentId: number) => void;
  onLogout: () => void;
}

interface Appointment {
  id: number; dailyRoomUrl: string; doctorToken: string;
  startTime: string; endTime: string; status: string;
  recipientName?: string;
}

export const DoctorDashboard: React.FC<Props> = ({
  user, onJoinConsultation, onWriteSoapNote, onUploadPrescription, onLogout,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/appointments?doctorId=${user.userId}`,
        { headers: { Authorization: `Bearer ${user.token}` } });
      if (res.ok) setAppointments(await res.json());
    } catch (e) { console.error('[DoctorDashboard]', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const active    = appointments.filter(a => a.status === 'ACTIVE');
  const scheduled = appointments.filter(a => a.status === 'SCHEDULED');
  const completed = appointments.filter(a => a.status === 'COMPLETED');

  if (loading) return <View style={s.centered}><ActivityIndicator color={Colors.trustBlue} size="large" /></View>;

  return (
    <SafeAreaView style={s.root}>
      <ScrollView refreshControl={
        <RefreshControl refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.trustBlue} />}>

        <View style={s.header}>
          <View>
            <Text style={s.title}>Dr. {user.name.split(' ').slice(-1)[0]}</Text>
            <Text style={s.subtitle}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>{scheduled.length + active.length}</Text>
            <Text style={s.statLabel}>TODAY</Text>
          </View>
        </View>

        {/* Active calls — top priority */}
        {active.length > 0 && (
          <>
            <Text style={s.section}>🔴 ACTIVE CALLS</Text>
            {active.map(a => (
              <ActionCard key={a.id} urgency="critical"
                title={a.recipientName ?? `Patient #${a.id}`}
                subtitle="Session is LIVE"
                ctaLabel="Rejoin Call"
                onPress={() => onJoinConsultation(a.dailyRoomUrl, a.doctorToken, a.id)} />
            ))}
          </>
        )}

        {/* Scheduled */}
        {scheduled.length > 0 && (
          <>
            <Text style={s.section}>SCHEDULED TODAY</Text>
            {scheduled.map(a => (
              <ActionCard key={a.id} urgency="normal"
                title={a.recipientName ?? `Patient #${a.id}`}
                subtitle={new Date(a.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                value={a.status}
                ctaLabel="Start Call"
                onPress={() => onJoinConsultation(a.dailyRoomUrl, a.doctorToken, a.id)} />
            ))}
          </>
        )}

        {/* Completed — needs SOAP note or prescription */}
        {completed.length > 0 && (
          <>
            <Text style={s.section}>PENDING DOCUMENTATION</Text>
            {completed.map(a => (
              <View key={a.id} style={s.completedCard}>
                <Text style={s.completedTitle}>{a.recipientName ?? `Patient #${a.id}`}</Text>
                <Text style={s.completedTime}>{new Date(a.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
                <View style={s.docActions}>
                  <ActionCard urgency="warning" title="Write SOAP Note"
                    ctaLabel="Open Note" onPress={() => onWriteSoapNote(a.id)}
                    style={s.halfCard} />
                  <ActionCard urgency="normal" title="Upload Rx PDF"
                    ctaLabel="Upload" onPress={() => onUploadPrescription(a.id)}
                    style={s.halfCard} />
                </View>
              </View>
            ))}
          </>
        )}

        {appointments.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyText}>No appointments scheduled today.</Text>
          </View>
        )}

        <View style={s.logoutRow}>
          <Text style={s.logout} onPress={onLogout}>LOG OUT</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.white },
  centered:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                   padding: Spacing.md, borderBottomWidth: 2, borderColor: Colors.black },
  title:         { fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: Colors.black },
  subtitle:      { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: '#888', marginTop: 2 },
  statBox:       { borderWidth: 2, borderColor: Colors.trustBlue, padding: Spacing.sm, alignItems: 'center', minWidth: 56 },
  statNum:       { fontFamily: 'PlayfairDisplay-Bold', fontSize: 28, color: Colors.trustBlue },
  statLabel:     { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: Colors.trustBlue, letterSpacing: 1 },
  section:       { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: Colors.black,
                   letterSpacing: 1.5, marginLeft: Spacing.md, marginTop: Spacing.lg, marginBottom: 4 },
  completedCard: { margin: Spacing.md, borderWidth: 2, borderColor: Colors.black, padding: Spacing.sm },
  completedTitle:{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 16 },
  completedTime: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: '#888', marginBottom: Spacing.sm },
  docActions:    { flexDirection: 'row', gap: Spacing.sm },
  halfCard:      { flex: 1, marginHorizontal: 0, marginVertical: 0 },
  emptyBox:      { margin: Spacing.xl, borderWidth: 2, borderColor: '#ccc', padding: Spacing.lg, alignItems: 'center' },
  emptyText:     { fontFamily: 'JetBrainsMono-Regular', fontSize: 13, color: '#888' },
  logoutRow:     { margin: Spacing.xl, alignItems: 'center' },
  logout:        { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: Colors.alertRed, textDecorationLine: 'underline', letterSpacing: 1 },
});

export default DoctorDashboard;
