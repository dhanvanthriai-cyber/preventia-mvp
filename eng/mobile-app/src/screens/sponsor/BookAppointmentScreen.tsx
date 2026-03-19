import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AuthUser } from '@preventia/shared';
import PaymentScreen from './PaymentScreen';
import { Buttons, Colors, Imagery, Radii, Spacing, Surfaces, Typography } from '../../theme/theme';

const API_BASE = process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080';

interface Props {
  user: AuthUser;
  onSuccess: (appointmentId: number, roomUrl: string, sponsorToken: string) => void;
  onCancel: () => void;
}

export const BookAppointmentScreen: React.FC<Props> = ({ user, onSuccess, onCancel }) => {
  const [recipientId, setRecipientId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{
    orderId: string;
    amount: number;
    appointmentId: number;
    roomUrl: string;
    sponsorToken: string;
  } | null>(null);

  const handleBook = async () => {
    if (!recipientId || !doctorId || !startTime || !endTime) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          recipientId: parseInt(recipientId, 10),
          recipientName: recipientName.trim(),
          sponsorId: user.userId,
          sponsorName: user.name,
          doctorId: parseInt(doctorId, 10),
          doctorName: doctorName.trim(),
          startTime,
          endTime,
        }),
      });
      if (!res.ok) throw new Error(`Booking failed: ${res.status}`);
      const appointment = await res.json();
      if (appointment.razorpayOrderId && !appointment.razorpayOrderId.startsWith('order_STUB_')) {
        setPendingPayment({
          orderId: appointment.razorpayOrderId,
          amount: appointment.consultationFeeInPaise ?? 0,
          appointmentId: appointment.id,
          roomUrl: appointment.dailyRoomUrl,
          sponsorToken: appointment.sponsorToken ?? '',
        });
      } else {
        onSuccess(appointment.id, appointment.dailyRoomUrl, appointment.sponsorToken ?? '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed.');
    } finally {
      setLoading(false);
    }
  };

  if (pendingPayment) {
    return (
      <PaymentScreen
        orderId={pendingPayment.orderId}
        amount={pendingPayment.amount}
        currency="INR"
        description={`Consultation #${pendingPayment.appointmentId}`}
        appointmentId={pendingPayment.appointmentId}
        onSuccess={() => {
          onSuccess(pendingPayment.appointmentId, pendingPayment.roomUrl, pendingPayment.sponsorToken);
        }}
        onCancel={() => {
          setPendingPayment(null);
          setError('Appointment booked, but payment is still pending. You can pay from the dashboard later.');
        }}
      />
    );
  }

  const fields = [
    { label: 'Recipient ID', value: recipientId, set: setRecipientId, keyboardType: 'numeric' as const, placeholder: 'e.g. 1' },
    { label: 'Recipient name', value: recipientName, set: setRecipientName, placeholder: 'e.g. Meena Mehta' },
    { label: 'Doctor ID', value: doctorId, set: setDoctorId, keyboardType: 'numeric' as const, placeholder: 'e.g. 5' },
    { label: 'Doctor name', value: doctorName, set: setDoctorName, placeholder: 'e.g. Dr. Priya Nair' },
    { label: 'Start time (ISO)', value: startTime, set: setStartTime, placeholder: '2026-03-12T10:00:00+05:30' },
    { label: 'End time (ISO)', value: endTime, set: setEndTime, placeholder: '2026-03-12T10:30:00+05:30' },
  ];

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.heroCard}>
            <View style={s.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.eyebrow}>Sponsor scheduling</Text>
                <Text style={s.title}>Book the next consultation</Text>
              </View>
              <Text style={s.cancel} onPress={onCancel}>Cancel</Text>
            </View>

            <Text style={s.copy}>
              The booking flow now feels more like a family calendar than a hospital form.
            </Text>

            <View style={s.photoPlaceholder}>
              <View style={s.photoGlow} />
              <View style={s.photoCaption}>
                <Text style={s.photoCaptionTitle}>Lifestyle photo placeholder</Text>
                <Text style={s.photoCaptionText}>
                  Family planner, calm home setting, and wellness-forward textures.
                </Text>
              </View>
            </View>
          </View>

          <View style={s.formCard}>
            {fields.map((field) => (
              <View key={field.label} style={s.fieldBlock}>
                <Text style={s.label}>{field.label}</Text>
                <TextInput
                  style={s.input}
                  value={field.value}
                  onChangeText={field.set}
                  keyboardType={field.keyboardType ?? 'default'}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
            ))}

            {error ? <Text style={s.error}>{error}</Text> : null}

            <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleBook} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnText}>Book appointment</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: {
    ...Surfaces.screen,
  },
  scroll: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  heroCard: {
    ...Surfaces.card,
    borderRadius: Radii.xl,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  eyebrow: {
    ...Typography.label,
    color: Colors.sageDeep,
  },
  title: {
    ...Typography.display,
    fontSize: 28,
    lineHeight: 34,
    marginTop: 4,
  },
  cancel: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    paddingTop: 2,
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
    top: -20,
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
  formCard: {
    ...Surfaces.card,
    borderRadius: Radii.xl,
    gap: Spacing.md,
  },
  fieldBlock: {
    gap: 8,
  },
  label: {
    ...Typography.label,
  },
  input: {
    ...Surfaces.input,
    ...Typography.body,
    color: Colors.text,
  },
  error: {
    ...Typography.bodySmall,
    color: Colors.rose,
  },
  btn: {
    ...Buttons.primary,
    marginTop: Spacing.sm,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    ...Typography.button,
  },
});

export default BookAppointmentScreen;
