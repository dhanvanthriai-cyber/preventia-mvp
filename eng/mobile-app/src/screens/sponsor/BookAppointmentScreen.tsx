import React, { useCallback, useEffect, useState } from 'react';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthUser } from '@preventia/shared';
import PaymentScreen from './PaymentScreen';
import { Buttons, Colors, Radii, Spacing, Surfaces, Typography } from '../../theme/theme';

const API_BASE = process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080';

interface Props {
  user: AuthUser;
  onSuccess: (appointmentId: number, roomUrl: string, sponsorToken: string) => void;
  onCancel: () => void;
}

interface LinkedPatient {
  id: number;
  name: string;
}

interface AvailableDoctor {
  id: number;
  name: string;
  hourlyRateInr: number;
}

/** Simple date-time picker — shows next 7 days × common time slots */
const TIME_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isoWithOffset(dateStr: string, timeStr: string): string {
  // Build an ISO string in +05:30 (IST)
  return `${dateStr}T${timeStr}:00+05:30`;
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

export const BookAppointmentScreen: React.FC<Props> = ({ user, onSuccess, onCancel }) => {
  // Step tracking: patient → doctor → datetime → confirm
  const [step, setStep] = useState<'patient' | 'doctor' | 'datetime' | 'confirm'>('patient');

  // Data
  const [patients, setPatients] = useState<LinkedPatient[]>([]);
  const [doctors, setDoctors] = useState<AvailableDoctor[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [doctorsLoading, setDoctorsLoading] = useState(false);

  // Selections
  const [selectedPatient, setSelectedPatient] = useState<LinkedPatient | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<AvailableDoctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Booking
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<{
    orderId: string; amount: number; appointmentId: number; roomUrl: string; sponsorToken: string;
  } | null>(null);

  // ── Load linked patients from appointments ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/appointments?sponsorId=${user.userId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (!res.ok) throw new Error('Failed to load patients');
        const appts = await res.json() as Array<{ recipientId: number; recipientName?: string }>;
        const seen = new Map<number, string>();
        for (const a of appts) {
          if (a.recipientId && !seen.has(a.recipientId)) {
            seen.set(a.recipientId, a.recipientName ?? `Patient #${a.recipientId}`);
          }
        }
        setPatients(Array.from(seen.entries()).map(([id, name]) => ({ id, name })));
      } catch {
        setError('Could not load linked patients.');
      } finally {
        setPatientsLoading(false);
      }
    })();
  }, [user]);

  // ── Load available doctors ──────────────────────────────────────────────────
  const loadDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/users?role=DOCTOR`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (!res.ok) throw new Error('Failed to load doctors');
      const data = await res.json() as Array<{ id: number; name: string; hourlyRateInr?: number }>;
      setDoctors(data.map(d => ({ id: d.id, name: d.name, hourlyRateInr: d.hourlyRateInr ?? 2500 })));
    } catch {
      // fallback: keep empty, user can retry
    } finally {
      setDoctorsLoading(false);
    }
  }, [user]);

  // ── Book appointment ────────────────────────────────────────────────────────
  const handleBook = async () => {
    if (!selectedPatient || !selectedDoctor || !selectedDate || !selectedTime) {
      setError('Please complete all selections.');
      return;
    }
    setLoading(true);
    setError(null);
    const startIso = isoWithOffset(selectedDate, selectedTime);
    // End time = start + 30 min
    const endDate = new Date(new Date(startIso).getTime() + 30 * 60 * 1000);
    const endIso  = endDate.toISOString().replace('Z', '+05:30').slice(0, 22) + '0+05:30';

    try {
      const res = await fetch(`${API_BASE}/api/v1/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({
          recipientId:   selectedPatient.id,
          recipientName: selectedPatient.name,
          sponsorId:     user.userId,
          sponsorName:   user.name,
          doctorId:      selectedDoctor.id,
          doctorName:    selectedDoctor.name,
          startTime:     startIso,
          endTime:       endIso,
        }),
      });
      if (!res.ok) throw new Error(`Booking failed: ${res.status}`);
      const appointment = await res.json() as {
        id: number; razorpayOrderId?: string; consultationFeeInPaise?: number;
        dailyRoomUrl: string; sponsorToken?: string;
      };

      if (appointment.razorpayOrderId && !appointment.razorpayOrderId.startsWith('order_STUB_')) {
        setPendingPayment({
          orderId:       appointment.razorpayOrderId,
          amount:        appointment.consultationFeeInPaise ?? 0,
          appointmentId: appointment.id,
          roomUrl:       appointment.dailyRoomUrl,
          sponsorToken:  appointment.sponsorToken ?? '',
        });
      } else {
        onSuccess(appointment.id, appointment.dailyRoomUrl, appointment.sponsorToken ?? '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Payment screen ──────────────────────────────────────────────────────────
  if (pendingPayment) {
    return (
      <PaymentScreen
        orderId={pendingPayment.orderId}
        amount={pendingPayment.amount}
        currency="INR"
        description={`Consultation #${pendingPayment.appointmentId}`}
        appointmentId={pendingPayment.appointmentId}
        onSuccess={() => onSuccess(pendingPayment.appointmentId, pendingPayment.roomUrl, pendingPayment.sponsorToken)}
        onCancel={() => { setPendingPayment(null); setError('Appointment booked, payment pending.'); }}
      />
    );
  }

  // ── Date options: today + next 6 days ──────────────────────────────────────
  const today = new Date();
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i);
    const iso = d.toISOString().split('T')[0] ?? '';
    return { iso, label: formatDateLabel(d) };
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={s.cancel}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={s.title}>Book Consultation</Text>
            {/* Step indicator */}
            <View style={s.steps}>
              {(['patient', 'doctor', 'datetime', 'confirm'] as const).map((s_, i) => (
                <View key={s_} style={[s.stepDot, step === s_ && s.stepDotActive,
                  (['patient','doctor','datetime','confirm'].indexOf(step) > i) && s.stepDotDone]} />
              ))}
            </View>
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

          {/* STEP 1: Select patient */}
          {step === 'patient' && (
            <View style={s.card}>
              <Text style={s.stepLabel}>Step 1 — Who is this for?</Text>
              {patientsLoading ? (
                <ActivityIndicator color={Colors.trustBlue} style={{ marginTop: 20 }} />
              ) : patients.length === 0 ? (
                <Text style={s.empty}>No linked patients found. Book an appointment on the web portal first to link a patient.</Text>
              ) : (
                patients.map(p => (
                  <TouchableOpacity key={p.id} style={s.selectRow} onPress={() => { setSelectedPatient(p); setStep('doctor'); void loadDoctors(); }}>
                    <View style={s.avatar}><Text style={s.avatarText}>{p.name.charAt(0).toUpperCase()}</Text></View>
                    <Text style={s.selectLabel}>{p.name}</Text>
                    <Text style={s.chevron}>›</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* STEP 2: Select doctor */}
          {step === 'doctor' && (
            <View style={s.card}>
              <Text style={s.stepLabel}>Step 2 — Choose a doctor</Text>
              <Text style={s.stepSub}>For: {selectedPatient?.name}</Text>
              {doctorsLoading ? (
                <ActivityIndicator color={Colors.trustBlue} style={{ marginTop: 20 }} />
              ) : doctors.length === 0 ? (
                <Text style={s.empty}>No doctors available. Please try again.</Text>
              ) : (
                doctors.map(d => (
                  <TouchableOpacity key={d.id} style={s.selectRow} onPress={() => { setSelectedDoctor(d); setStep('datetime'); }}>
                    <View style={[s.avatar, { backgroundColor: Colors.sageDeep }]}><Text style={s.avatarText}>Dr</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.selectLabel}>Dr. {d.name}</Text>
                      <Text style={s.selectMeta}>₹{d.hourlyRateInr.toLocaleString('en-IN')} per session</Text>
                    </View>
                    <Text style={s.chevron}>›</Text>
                  </TouchableOpacity>
                ))
              )}
              <TouchableOpacity onPress={() => setStep('patient')} style={s.backBtn}>
                <Text style={s.backBtnText}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: Select date + time */}
          {step === 'datetime' && (
            <View style={s.card}>
              <Text style={s.stepLabel}>Step 3 — Pick a time</Text>
              <Text style={s.stepSub}>Dr. {selectedDoctor?.name} · {selectedPatient?.name}</Text>

              <Text style={s.sectionTitle}>Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {dateOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.iso}
                    style={[s.chip, selectedDate === opt.iso && s.chipSelected]}
                    onPress={() => setSelectedDate(opt.iso)}
                  >
                    <Text style={[s.chipText, selectedDate === opt.iso && s.chipTextSelected]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.sectionTitle}>Time (IST)</Text>
              <View style={s.timeGrid}>
                {TIME_SLOTS.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[s.timeChip, selectedTime === t && s.chipSelected]}
                    onPress={() => setSelectedTime(t)}
                  >
                    <Text style={[s.chipText, selectedTime === t && s.chipTextSelected]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Pressable
                style={[s.btn, (!selectedDate || !selectedTime) && s.btnDisabled]}
                disabled={!selectedDate || !selectedTime}
                onPress={() => setStep('confirm')}
              >
                <Text style={s.btnText}>Continue →</Text>
              </Pressable>
              <TouchableOpacity onPress={() => setStep('doctor')} style={s.backBtn}>
                <Text style={s.backBtnText}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 4: Confirm + book */}
          {step === 'confirm' && selectedPatient && selectedDoctor && selectedDate && selectedTime && (
            <View style={s.card}>
              <Text style={s.stepLabel}>Step 4 — Confirm booking</Text>

              <View style={s.summaryRow}><Text style={s.summaryKey}>Patient</Text><Text style={s.summaryVal}>{selectedPatient.name}</Text></View>
              <View style={s.summaryRow}><Text style={s.summaryKey}>Doctor</Text><Text style={s.summaryVal}>Dr. {selectedDoctor.name}</Text></View>
              <View style={s.summaryRow}><Text style={s.summaryKey}>Date</Text><Text style={s.summaryVal}>{dateOptions.find(d => d.iso === selectedDate)?.label ?? selectedDate}</Text></View>
              <View style={s.summaryRow}><Text style={s.summaryKey}>Time</Text><Text style={s.summaryVal}>{selectedTime} IST</Text></View>
              <View style={s.summaryRow}><Text style={s.summaryKey}>Fee</Text><Text style={s.summaryVal}>₹{selectedDoctor.hourlyRateInr.toLocaleString('en-IN')}</Text></View>

              <Pressable style={[s.btn, loading && s.btnDisabled]} disabled={loading} onPress={() => void handleBook()}>
                {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnText}>Confirm & Book</Text>}
              </Pressable>
              <TouchableOpacity onPress={() => setStep('datetime')} style={s.backBtn}>
                <Text style={s.backBtnText}>← Change time</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:            { ...Surfaces.screen },
  scroll:          { padding: Spacing.lg, gap: Spacing.lg },
  header:          { gap: Spacing.sm, marginBottom: Spacing.md },
  cancel:          { ...Typography.bodySmall, color: Colors.textMuted },
  title:           { ...Typography.display, fontSize: 26, lineHeight: 32 },
  steps:           { flexDirection: 'row', gap: 8, marginTop: 8 },
  stepDot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0D9D2' },
  stepDotActive:   { backgroundColor: Colors.trustBlue, width: 20 },
  stepDotDone:     { backgroundColor: Colors.sageDeep },
  error:           { color: Colors.alertRed, fontFamily: 'JetBrainsMono-Regular', fontSize: 13, padding: Spacing.sm },
  card:            { ...Surfaces.card, gap: Spacing.sm },
  stepLabel:       { ...Typography.subheading, fontSize: 16 },
  stepSub:         { ...Typography.bodySmall, color: Colors.textMuted },
  empty:           { ...Typography.body, color: Colors.textMuted, textAlign: 'center', padding: Spacing.lg },
  selectRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0EBE3' },
  avatar:          { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.trustBlue, justifyContent: 'center', alignItems: 'center' },
  avatarText:      { color: Colors.white, fontWeight: '700', fontSize: 16 },
  selectLabel:     { ...Typography.body, flex: 1 },
  selectMeta:      { ...Typography.bodySmall, color: Colors.textMuted },
  chevron:         { ...Typography.subheading, color: Colors.textMuted, fontSize: 20 },
  backBtn:         { marginTop: Spacing.sm, alignItems: 'center' },
  backBtnText:     { ...Typography.bodySmall, color: Colors.textMuted },
  sectionTitle:    { ...Typography.label, marginBottom: 8, marginTop: 8 },
  chip:            { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radii.pill, borderWidth: 1.5, borderColor: '#D9D2C8', marginRight: 8 },
  chipSelected:    { backgroundColor: Colors.trustBlue, borderColor: Colors.trustBlue },
  chipText:        { ...Typography.bodySmall, color: Colors.textMuted },
  chipTextSelected:{ color: Colors.white, fontWeight: '700' },
  timeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  timeChip:        { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radii.pill, borderWidth: 1.5, borderColor: '#D9D2C8' },
  summaryRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0EBE3' },
  summaryKey:      { ...Typography.bodySmall, color: Colors.textMuted },
  summaryVal:      { ...Typography.body, fontWeight: '600' },
  btn:             { ...Buttons.primary, marginTop: Spacing.md },
  btnDisabled:     { opacity: 0.5 },
  btnText:         { color: Colors.white, fontWeight: '700', fontSize: 16, textAlign: 'center' },
});

export default BookAppointmentScreen;
