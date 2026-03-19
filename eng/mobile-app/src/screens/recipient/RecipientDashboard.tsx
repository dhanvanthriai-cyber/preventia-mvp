import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AuthUser } from '@preventia/shared';
import ActionCard from '../../components/ActionCard';
import { Colors, Imagery, Radii, Spacing, Surfaces, Typography } from '../../theme/theme';

const API_BASE = process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080';

interface Props {
  user: AuthUser;
  onJoinConsultation: (roomUrl: string, token: string, appointmentId: number) => void;
  onLogout: () => void;
}

interface Appointment {
  id: number;
  dailyRoomUrl: string;
  recipientToken: string;
  startTime: string;
  status: string;
  doctorName?: string;
}

interface MedAlert {
  urgency: string;
  medicationName: string;
  daysRemaining: number;
}

export const RecipientDashboard: React.FC<Props> = ({ user, onJoinConsultation, onLogout }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<MedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [appointmentResponse, medicationResponse] = await Promise.all([
        fetch(`${API_BASE}/api/v1/appointments?recipientId=${user.userId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        fetch(`${API_BASE}/api/v1/patients/${user.userId}/medications/alerts`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
      ]);
      if (appointmentResponse.ok) setAppointments(await appointmentResponse.json() as Appointment[]);
      if (medicationResponse.ok) setMedications(await medicationResponse.json() as MedAlert[]);
    } catch (error) {
      console.error('[RecipientDashboard]', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const activeAppt = appointments.find((appointment) => appointment.status === 'ACTIVE');
  const nextAppt = appointments.find((appointment) => appointment.status === 'SCHEDULED');
  const criticalMeds = medications.filter((medication) => medication.urgency === 'CRITICAL');
  const warningMeds = medications.filter((medication) => medication.urgency === 'WARNING');

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
            <Text style={s.eyebrow}>Parent view</Text>
            <Text style={s.greeting}>Namaste, {user.name.split(' ')[0]} ji</Text>
            <Text style={s.copy}>
              Everything important is here in a simpler, calmer format.
            </Text>

            <View style={s.photoPlaceholder}>
              <View style={s.photoGlow} />
              <View style={s.photoCaption}>
                <Text style={s.photoCaptionTitle}>Lifestyle photo placeholder</Text>
                <Text style={s.photoCaptionText}>
                  Familiar home setting, warm sunlight, and an everyday calm feeling.
                </Text>
              </View>
            </View>
          </View>

          {activeAppt ? (
            <>
              <Text style={s.sectionTitle}>Your doctor is ready</Text>
              <ActionCard
                urgency="critical"
                title="Join your consultation"
                subtitle={activeAppt.doctorName}
                ctaLabel="Join call now"
                onPress={() => onJoinConsultation(activeAppt.dailyRoomUrl, activeAppt.recipientToken, activeAppt.id)}
              />
            </>
          ) : null}

          {!activeAppt && nextAppt ? (
            <>
              <Text style={s.sectionTitle}>Next appointment</Text>
              <ActionCard
                urgency="normal"
                title={nextAppt.doctorName ?? 'Doctor appointment'}
                subtitle={new Date(nextAppt.startTime).toLocaleString('en-IN')}
                ctaLabel="See details"
                onPress={() => onJoinConsultation(nextAppt.dailyRoomUrl, nextAppt.recipientToken, nextAppt.id)}
              />
            </>
          ) : null}

          {!activeAppt && !nextAppt ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyTitle}>No appointment today</Text>
              <Text style={s.emptyText}>
                Your family will schedule the next consultation when needed.
              </Text>
            </View>
          ) : null}

          {criticalMeds.length > 0 ? <Text style={s.sectionTitle}>Medicine running low</Text> : null}
          {criticalMeds.map((medication) => (
            <ActionCard
              key={medication.medicationName}
              urgency="critical"
              title={medication.medicationName}
              value={`${medication.daysRemaining} day(s)`}
              ctaLabel="Tell my family"
              onPress={() => {}}
            />
          ))}

          {warningMeds.length > 0 ? <Text style={s.sectionTitle}>Refill soon</Text> : null}
          {warningMeds.map((medication) => (
            <ActionCard
              key={medication.medicationName}
              urgency="warning"
              title={medication.medicationName}
              value={`${medication.daysRemaining} day(s)`}
              ctaLabel="Remind family"
              onPress={() => {}}
            />
          ))}

          <Text style={s.logout} onPress={onLogout}>Sign out</Text>
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
  greeting: {
    ...Typography.display,
    fontSize: 30,
    lineHeight: 36,
  },
  copy: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  photoPlaceholder: {
    ...Imagery.placeholder,
    padding: Spacing.lg,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  photoGlow: {
    position: 'absolute',
    top: -24,
    right: 0,
    width: 150,
    height: 150,
    borderRadius: 75,
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
  sectionTitle: {
    ...Typography.label,
    marginTop: Spacing.sm,
    marginLeft: Spacing.xs,
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
    ...Typography.body,
    marginTop: 4,
    color: Colors.textMuted,
  },
  logout: {
    ...Typography.bodySmall,
    textAlign: 'center',
    color: Colors.textMuted,
    marginVertical: Spacing.lg,
  },
});

export default RecipientDashboard;
