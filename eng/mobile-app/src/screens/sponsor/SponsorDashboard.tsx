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
  onBookAppointment: () => void;
  onJoinConsultation: (roomUrl: string, token: string, appointmentId: number) => void;
  onViewPrescription: (appointmentId: number) => void;
  onLogout: () => void;
}

interface Appointment {
  id: number;
  dailyRoomUrl: string;
  recipientToken: string;
  startTime: string;
  endTime: string;
  status: string;
  doctorName?: string;
}

interface MedAlert {
  urgency: string;
  medicationName: string;
  daysRemaining: number;
}

export const SponsorDashboard: React.FC<Props> = ({
  user,
  onBookAppointment,
  onJoinConsultation,
  onViewPrescription,
  onLogout,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<MedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [appointmentResponse, medicationResponse] = await Promise.all([
        fetch(`${API_BASE}/api/v1/appointments?sponsorId=${user.userId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        fetch(`${API_BASE}/api/v1/patients/linked/medications/alerts`, {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
      ]);
      if (appointmentResponse.ok) setAppointments(await appointmentResponse.json() as Appointment[]);
      if (medicationResponse.ok) setMedications(await medicationResponse.json() as MedAlert[]);
    } catch (error) {
      console.error('[SponsorDashboard]', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const nextAppt = appointments.find((appointment) => appointment.status === 'SCHEDULED' || appointment.status === 'ACTIVE');
  const criticals = medications.filter((medication) => medication.urgency === 'CRITICAL');
  const warnings = medications.filter((medication) => medication.urgency === 'WARNING');

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
            <Text style={s.eyebrow}>Sponsor view</Text>
            <Text style={s.greeting}>Care from abroad, without the clinical feel.</Text>
            <Text style={s.role}>
              {user.name.split(' ')[0]}, this dashboard now behaves more like a premium family planner than a provider console.
            </Text>

            <View style={s.badgeRow}>
              <View style={s.badge}><Text style={s.badgeText}>Remote family care</Text></View>
              <View style={s.badge}><Text style={s.badgeText}>{appointments.length} visits tracked</Text></View>
            </View>

            <View style={s.photoPlaceholder}>
              <View style={s.photoGlow} />
              <View style={s.photoCaption}>
                <Text style={s.photoCaptionTitle}>Lifestyle photo placeholder</Text>
                <Text style={s.photoCaptionText}>
                  Warm living room, family frame, soft light, and premium connected-home cues.
                </Text>
              </View>
            </View>

            <View style={s.buttonRow}>
              <Pressable style={s.primaryBtn} onPress={onBookAppointment}>
                <Text style={s.primaryBtnText}>Book consultation</Text>
              </Pressable>
              <Pressable style={s.secondaryBtn} onPress={onLogout}>
                <Text style={s.secondaryBtnText}>Sign out</Text>
              </Pressable>
            </View>
          </View>

          <Text style={s.sectionTitle}>Next care moment</Text>
          {nextAppt ? (
            <ActionCard
              urgency={nextAppt.status === 'ACTIVE' ? 'critical' : 'normal'}
              title={nextAppt.doctorName ?? 'Upcoming appointment'}
              subtitle={new Date(nextAppt.startTime).toLocaleString()}
              value={nextAppt.status === 'ACTIVE' ? 'Live' : 'Scheduled'}
              ctaLabel={nextAppt.status === 'ACTIVE' ? 'Join now' : 'View details'}
              onPress={() => onJoinConsultation(nextAppt.dailyRoomUrl, nextAppt.recipientToken, nextAppt.id)}
            />
          ) : (
            <ActionCard
              urgency="normal"
              title="No upcoming appointments"
              subtitle="Book a consultation for your parent when the next care moment is needed."
              ctaLabel="Book appointment"
              onPress={onBookAppointment}
            />
          )}

          <Text style={s.sectionTitle}>Medication watch</Text>
          {criticals.length === 0 && warnings.length === 0 ? (
            <View style={s.infoCard}>
              <Text style={s.infoTitle}>Everything looks calm.</Text>
              <Text style={s.infoBody}>No urgent refill signals for the linked family member.</Text>
            </View>
          ) : null}

          {criticals.map((medication) => (
            <ActionCard
              key={medication.medicationName}
              urgency="critical"
              title={medication.medicationName}
              subtitle={`${medication.daysRemaining} day(s) remaining`}
              ctaLabel="Request refill"
              onPress={() => {}}
            />
          ))}

          {warnings.map((medication) => (
            <ActionCard
              key={medication.medicationName}
              urgency="warning"
              title={medication.medicationName}
              subtitle={`${medication.daysRemaining} day(s) remaining`}
              ctaLabel="Review"
              onPress={() => {}}
            />
          ))}

          {nextAppt ? (
            <>
              <Text style={s.sectionTitle}>Prescription and follow-up</Text>
              <ActionCard
                urgency="normal"
                title="View last prescription"
                subtitle="Open the most recent PDF from your parent’s appointment."
                ctaLabel="Open PDF"
                onPress={() => onViewPrescription(nextAppt.id)}
              />
            </>
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
  greeting: {
    ...Typography.display,
    fontSize: 28,
    lineHeight: 34,
  },
  role: {
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
    top: -20,
    right: 0,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.35)',
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
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  primaryBtn: {
    ...Buttons.primary,
    flexGrow: 1,
    minWidth: 180,
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
  infoCard: {
    ...Surfaces.cardMuted,
    borderRadius: Radii.xl,
    marginHorizontal: Spacing.md,
  },
  infoTitle: {
    ...Typography.subheading,
    fontSize: 17,
    lineHeight: 24,
  },
  infoBody: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
});

export default SponsorDashboard;
