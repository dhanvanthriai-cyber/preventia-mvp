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
import { Buttons, Colors, Radii, Spacing, Surfaces, Typography } from '../../theme/theme';

const API_BASE = process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080';

interface Props {
  user: AuthUser;
  appointmentId: number;
  patientId: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const FIELDS = [
  { key: 'subjective', label: 'Subjective', hint: "Patient's reported symptoms" },
  { key: 'objective', label: 'Objective', hint: 'Vitals, exam findings, labs' },
  { key: 'assessment', label: 'Assessment', hint: 'Clinical assessment or differential' },
  { key: 'plan', label: 'Plan', hint: 'Prescriptions, referrals, follow-up' },
] as const;

type SoapKey = typeof FIELDS[number]['key'];

export const SoapNoteScreen: React.FC<Props> = ({
  user,
  appointmentId,
  patientId,
  onSuccess,
  onCancel,
}) => {
  const [values, setValues] = useState<Record<SoapKey, string>>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!values.subjective && !values.assessment) {
      setError('At minimum, Subjective and Assessment are required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/clinical/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ appointmentId, patientId, ...values }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Server error ${res.status}`);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.headerCard}>
            <View style={s.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.eyebrow}>SOAP note</Text>
                <Text style={s.title}>Document the consultation</Text>
              </View>
              <Text style={s.cancel} onPress={onCancel}>Cancel</Text>
            </View>
            <Text style={s.meta}>Appointment {String(appointmentId).padStart(5, '0')}</Text>
            <View style={s.lockBanner}>
              <Text style={s.lockTitle}>Session-locked</Text>
              <Text style={s.lockText}>The appointment must be active for this note to save.</Text>
            </View>
          </View>

          <View style={s.formCard}>
            {FIELDS.map((field) => (
              <View key={field.key} style={s.field}>
                <Text style={s.label}>{field.label}</Text>
                <TextInput
                  style={s.textarea}
                  value={values[field.key]}
                  onChangeText={(value) => setValues((prev) => ({ ...prev, [field.key]: value }))}
                  placeholder={field.hint}
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            ))}

            {error ? (
              <View style={s.errorBox}>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable style={[s.btn, loading && s.btnDisabled]} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.btnText}>Save SOAP note</Text>}
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
  headerCard: {
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
  },
  meta: {
    ...Typography.bodySmall,
  },
  lockBanner: {
    ...Surfaces.cardMuted,
    borderRadius: Radii.lg,
    backgroundColor: Colors.goldTint,
  },
  lockTitle: {
    ...Typography.subheading,
    fontSize: 16,
    lineHeight: 22,
  },
  lockText: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  formCard: {
    ...Surfaces.card,
    borderRadius: Radii.xl,
    gap: Spacing.md,
  },
  field: {
    gap: 8,
  },
  label: {
    ...Typography.label,
  },
  textarea: {
    ...Surfaces.input,
    ...Typography.body,
    minHeight: 120,
    color: Colors.text,
  },
  errorBox: {
    ...Surfaces.cardMuted,
    borderRadius: Radii.lg,
    backgroundColor: Colors.roseTint,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.rose,
  },
  btn: {
    ...Buttons.primary,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    ...Typography.button,
  },
});

export default SoapNoteScreen;
