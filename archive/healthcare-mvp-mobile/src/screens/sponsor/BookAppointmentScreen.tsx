/**
 * BookAppointmentScreen.tsx — NRI Sponsor books appointment for parent
 * Project Dhanvanthri | Neo-Brutalist Wellness
 *
 * Calls: POST /api/v1/appointments
 * Returns: AppointmentResponse with roomUrl + tokens (store tokens immediately)
 */

import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Colors, Spacing, Typography } from '../../theme/theme';
import { AuthUser } from '../../hooks/useAuth';

const API_BASE = process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080';

interface Props {
  user: AuthUser;
  onSuccess: (appointmentId: number, roomUrl: string, sponsorToken: string) => void;
  onCancel: () => void;
}

export const BookAppointmentScreen: React.FC<Props> = ({ user, onSuccess, onCancel }) => {
  const [recipientId, setRecipientId]     = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [doctorId, setDoctorId]           = useState('');
  const [doctorName, setDoctorName]       = useState('');
  const [startTime, setStartTime]         = useState('');   // ISO datetime
  const [endTime, setEndTime]             = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const handleBook = async () => {
    if (!recipientId || !doctorId || !startTime || !endTime) {
      setError('All fields are required.'); return;
    }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({
          recipientId:   parseInt(recipientId, 10),
          recipientName: recipientName.trim(),
          sponsorId:     user.userId,
          sponsorName:   user.name,
          doctorId:      parseInt(doctorId, 10),
          doctorName:    doctorName.trim(),
          startTime,
          endTime,
        }),
      });
      if (!res.ok) throw new Error(`Booking failed: ${res.status}`);
      const appt = await res.json();
      onSuccess(appt.id, appt.dailyRoomUrl, appt.sponsorToken ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.headerRow}>
            <Text style={s.title}>BOOK CONSULTATION</Text>
            <Text style={s.cancel} onPress={onCancel}>CANCEL</Text>
          </View>

          {[
            { label: 'RECIPIENT ID (parent)', value: recipientId, set: setRecipientId, kb: 'numeric' as const },
            { label: 'RECIPIENT NAME',         value: recipientName, set: setRecipientName },
            { label: 'DOCTOR ID',              value: doctorId, set: setDoctorId, kb: 'numeric' as const },
            { label: 'DOCTOR NAME',            value: doctorName, set: setDoctorName },
            { label: 'START TIME (ISO)',        value: startTime, set: setStartTime, placeholder: '2026-03-12T10:00:00+05:30' },
            { label: 'END TIME (ISO)',          value: endTime, set: setEndTime, placeholder: '2026-03-12T10:30:00+05:30' },
          ].map(({ label, value, set, kb, placeholder }) => (
            <View key={label} style={s.fieldBlock}>
              <Text style={s.label}>{label}</Text>
              <TextInput style={s.input} value={value} onChangeText={set}
                keyboardType={kb ?? 'default'} placeholder={placeholder ?? label}
                placeholderTextColor="#888" autoCapitalize="none" />
            </View>
          ))}

          {error && <Text style={s.error}>{error}</Text>}

          <Pressable style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleBook} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.white} />
              : <Text style={s.btnText}>BOOK APPOINTMENT</Text>}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.white },
  scroll:     { padding: Spacing.lg, gap: Spacing.md },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title:      { fontFamily: 'PlayfairDisplay-Bold', fontSize: 20, color: Colors.black },
  cancel:     { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: Colors.alertRed, textDecorationLine: 'underline' },
  fieldBlock: { gap: 6 },
  label:      { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: Colors.black, letterSpacing: 1 },
  input:      { borderWidth: 2, borderColor: Colors.black, padding: Spacing.sm, fontSize: 14,
                fontFamily: 'JetBrainsMono-Regular', color: Colors.black },
  error:      { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: Colors.alertRed },
  btn:        { backgroundColor: Colors.trustBlue, borderWidth: 2, borderColor: Colors.black,
                padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  btnText:    { fontFamily: 'JetBrainsMono-Regular', fontSize: 14, color: Colors.white, letterSpacing: 2, fontWeight: '700' },
});

export default BookAppointmentScreen;
