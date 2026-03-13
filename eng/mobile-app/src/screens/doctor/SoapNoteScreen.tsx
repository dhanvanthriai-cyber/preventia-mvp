/**
 * SoapNoteScreen.tsx — Doctor writes SOAP note during/after session
 * Project Dhanvanthri | Neo-Brutalist Wellness
 *
 * Calls: POST /api/v1/clinical/notes (session-locked — appointment must be ACTIVE)
 */

import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Colors, Spacing } from '../../theme/theme';
import { AuthUser } from '@dhanvanthri/shared';

const API_BASE = process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080';

interface Props {
  user: AuthUser;
  appointmentId: number;
  patientId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const FIELDS = [
  { key: 'subjective',  label: 'S — SUBJECTIVE',  hint: "Patient's reported symptoms" },
  { key: 'objective',   label: 'O — OBJECTIVE',   hint: 'Vitals, exam findings, labs' },
  { key: 'assessment',  label: 'A — ASSESSMENT',  hint: 'Differential diagnosis' },
  { key: 'plan',        label: 'P — PLAN',        hint: 'Prescriptions, referrals, follow-up' },
] as const;

type SoapKey = typeof FIELDS[number]['key'];

export const SoapNoteScreen: React.FC<Props> = ({
  user, appointmentId, patientId, onSuccess, onCancel,
}) => {
  const [values, setValues] = useState<Record<SoapKey, string>>({
    subjective: '', objective: '', assessment: '', plan: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSave = async () => {
    if (!values.subjective && !values.assessment) {
      setError('At minimum, Subjective and Assessment fields are required.'); return;
    }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/clinical/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ appointmentId, patientId, ...values }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Server error ${res.status}`);
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save note.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          <View style={s.headerRow}>
            <Text style={s.title}>SOAP NOTE</Text>
            <Text style={s.apptId}>APT-{String(appointmentId).padStart(5, '0')}</Text>
            <Text style={s.cancel} onPress={onCancel}>CANCEL</Text>
          </View>

          <View style={s.lockBanner}>
            <Text style={s.lockText}>🔒 SESSION-LOCKED — Appointment must be ACTIVE to save</Text>
          </View>

          {FIELDS.map(f => (
            <View key={f.key} style={s.field}>
              <Text style={s.label}>{f.label}</Text>
              <TextInput style={s.textarea} value={values[f.key]}
                onChangeText={v => setValues(prev => ({ ...prev, [f.key]: v }))}
                placeholder={f.hint} placeholderTextColor="#aaa"
                multiline numberOfLines={4} textAlignVertical="top" />
            </View>
          ))}

          {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

          <Pressable style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.white} />
              : <Text style={s.btnText}>SAVE SOAP NOTE</Text>}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.white },
  scroll:     { padding: Spacing.md, gap: Spacing.md },
  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  title:      { fontFamily: 'PlayfairDisplay-Bold', fontSize: 20, color: Colors.black, flex: 1 },
  apptId:     { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: Colors.trustBlue, marginRight: Spacing.sm },
  cancel:     { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: Colors.alertRed, textDecorationLine: 'underline' },
  lockBanner: { backgroundColor: '#f5f5f5', borderWidth: 2, borderColor: Colors.black, padding: Spacing.sm },
  lockText:   { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: Colors.black },
  field:      { gap: 6 },
  label:      { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: Colors.trustBlue, letterSpacing: 1 },
  textarea:   { borderWidth: 2, borderColor: Colors.black, padding: Spacing.sm, minHeight: 96,
                fontFamily: 'JetBrainsMono-Regular', fontSize: 14, color: Colors.black },
  errorBox:   { borderWidth: 2, borderColor: Colors.alertRed, padding: Spacing.sm },
  errorText:  { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: Colors.alertRed },
  btn:        { backgroundColor: Colors.trustBlue, borderWidth: 2, borderColor: Colors.black,
                padding: Spacing.md, alignItems: 'center' },
  btnText:    { fontFamily: 'JetBrainsMono-Regular', fontSize: 14, color: Colors.white, letterSpacing: 2, fontWeight: '700' },
});

export default SoapNoteScreen;
