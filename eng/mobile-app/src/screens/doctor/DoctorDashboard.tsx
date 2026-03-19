import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AuthUser } from '@preventia/shared';
import ActionCard from '../../components/ActionCard';
import { Buttons, Colors, Imagery, Radii, Spacing, Surfaces, Typography } from '../../theme/theme';

const API_BASE = process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080';

interface Props {
  user: AuthUser;
  onJoinConsultation: (roomUrl: string, token: string, appointmentId: number) => void;
  onWriteSoapNote: (appointmentId: number) => void;
  onUploadPrescription: (appointmentId: number) => void;
  onLogout: () => void;
}

interface Appointment {
  id: number;
  dailyRoomUrl: string;
  doctorToken: string;
  startTime: string;
  endTime: string;
  status: string;
  recipientName?: string;
}

export const DoctorDashboard: React.FC<Props> = ({
  user,
  onJoinConsultation,
  onWriteSoapNote,
  onUploadPrescription,
  onLogout,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/appointments?doctorId=${user.userId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) setAppointments(await res.json() as Appointment[]);
    } catch (error) {
      console.error('[DoctorDashboard]', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const active = appointments.filter((appointment) => appointment.status === 'ACTIVE');
  const scheduled = appointments.filter((appointment) => appointment.status === 'SCHEDULED');
  const completed = appointments.filter((appointment) => appointment.status === 'COMPLETED');

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={Colors.sage} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void fetchData();
            }}
            tintColor={Colors.sage}
          />
        )}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.content}>
          <View style={s.heroCard}>
            <Text style={s.eyebrow}>Doctor workspace</Text>
            <Text style={s.title}>Dr. {user.name.split(' ').slice(-1)[0]}</Text>
            <Text style={s.subtitle}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Text style={s.copy}>
              Today&apos;s care flow, documentation queue, and consultation shortcuts in the gentler design system.
            </Text>

            <View style={s.badgeRow}>
              <View style={s.badge}><Text style={s.badgeText}>{scheduled.length + active.length} today</Text></View>
              <View style={s.badge}><Text style={s.badgeText}>{completed.length} docs pending</Text></View>
            </View>

            <View style={s.photoPlaceholder}>
              <View style={s.photoGlow} />
              <View style={s.photoCaption}>
                <Text style={s.photoCaptionTitle}>Lifestyle photo placeholder</Text>
                <Text style={s.photoCaptionText}>
                  Quiet consulting desk, soft daylight, premium clinical workspace atmosphere.
                </Text>
              </View>
            </View>

            <View style={s.buttonRow}>
              <Pressable style={s.primaryBtn} onPress={() => void fetchData()}>
                <Text style={s.primaryBtnText}>Refresh</Text>
              </Pressable>
              <Pressable style={s.secondaryBtn} onPress={onLogout}>
                <Text style={s.secondaryBtnText}>Sign out</Text>
              </Pressable>
            </View>
          </View>

          {active.length > 0 ? <Text style={s.sectionTitle}>Active consultations</Text> : null}
          {active.map((appointment) => (
            <ActionCard
              key={appointment.id}
              urgency="critical"
              title={appointment.recipientName ?? `Patient #${appointment.id}`}
              subtitle="Session is live now"
              ctaLabel="Rejoin call"
              onPress={() => onJoinConsultation(appointment.dailyRoomUrl, appointment.doctorToken, appointment.id)}
            />
          ))}

          {scheduled.length > 0 ? <Text style={s.sectionTitle}>Scheduled today</Text> : null}
          {scheduled.map((appointment) => (
            <ActionCard
              key={appointment.id}
              urgency="normal"
              title={appointment.recipientName ?? `Patient #${appointment.id}`}
              subtitle={new Date(appointment.startTime).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              value="Ready"
              ctaLabel="Start call"
              onPress={() => onJoinConsultation(appointment.dailyRoomUrl, appointment.doctorToken, appointment.id)}
            />
          ))}

          {completed.length > 0 ? <Text style={s.sectionTitle}>Documentation queue</Text> : null}
          {completed.map((appointment) => (
            <View key={appointment.id} style={s.completedCard}>
              <Text style={s.completedTitle}>{appointment.recipientName ?? `Patient #${appointment.id}`}</Text>
              <Text style={s.completedTime}>
                {new Date(appointment.startTime).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <View style={s.docActions}>
                <Pressable style={s.docBtn} onPress={() => onWriteSoapNote(appointment.id)}>
                  <Text style={s.docBtnText}>SOAP note</Text>
                </Pressable>
                <Pressable style={s.docBtn} onPress={() => onUploadPrescription(appointment.id)}>
                  <Text style={s.docBtnText}>Upload Rx</Text>
                </Pressable>
              </View>
            </View>
          ))}

          {appointments.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyTitle}>No appointments scheduled today</Text>
              <Text style={s.emptyText}>
                New consultations will appear here as soon as they are booked.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: {
    ...Surfaces.screen,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  heroCard: {
    ...Surfaces.card,
    borderRadius: Radii.xl,
    gap: Spacing.md,
  },
  eyebrow: {
    ...Typography.label,
    color: Colors.sageDeep,
  },
  title: {
    ...Typography.display,
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  copy: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badge: {
    ...Surfaces.pill,
    backgroundColor: Colors.surfaceAlt,
  },
  badgeText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text,
  },
  photoPlaceholder: {
    ...Imagery.placeholder,
    padding: Spacing.lg,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  photoGlow: {
    position: 'absolute',
    top: -18,
    right: 0,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  photoCaption: {
    ...Surfaces.cardMuted,
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(255, 252, 248, 0.78)',
  },
  photoCaptionTitle: {
    ...Typography.subheading,
    fontSize: 16,
    lineHeight: 22,
  },
  photoCaptionText: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  primaryBtn: {
    ...Buttons.primary,
    flexGrow: 1,
    minWidth: 140,
  },
  secondaryBtn: {
    ...Buttons.secondary,
    flexGrow: 1,
    minWidth: 140,
  },
  primaryBtnText: {
    ...Typography.button,
  },
  secondaryBtnText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionTitle: {
    ...Typography.label,
    marginTop: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  completedCard: {
    ...Surfaces.cardMuted,
    borderRadius: Radii.xl,
    marginHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  completedTitle: {
    ...Typography.subheading,
    fontSize: 18,
    lineHeight: 24,
  },
  completedTime: {
    ...Typography.bodySmall,
  },
  docActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  docBtn: {
    ...Buttons.secondary,
    flexGrow: 1,
    minWidth: 130,
  },
  docBtnText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyCard: {
    ...Surfaces.cardMuted,
    borderRadius: Radii.xl,
  },
  emptyTitle: {
    ...Typography.subheading,
    fontSize: 18,
    lineHeight: 24,
  },
  emptyText: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
});

export default DoctorDashboard;
