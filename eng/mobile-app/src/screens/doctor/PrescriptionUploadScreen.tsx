import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AuthUser } from '@preventia/shared';
import { Buttons, Colors, Radii, Spacing, Surfaces, Typography } from '../../theme/theme';

const API_BASE = process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080';

interface Props {
  user: AuthUser;
  appointmentId: number;
  onSuccess: (s3Key: string) => void;
  onCancel: () => void;
}

interface PickedFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

export const PrescriptionUploadScreen: React.FC<Props> = ({
  user,
  appointmentId,
  onSuccess,
  onCancel,
}) => {
  const [file, setFile] = useState<PickedFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const pickDocument = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const DocumentPicker = require('react-native-document-picker');
      const result = await DocumentPicker.pick({ type: [DocumentPicker.types.pdf] });
      const picked = Array.isArray(result) ? result[0] : result;
      setFile({
        uri: picked.uri,
        name: picked.name ?? 'prescription.pdf',
        type: picked.type ?? 'application/pdf',
        size: picked.size ?? 0,
      });
      setError(null);
    } catch (err: any) {
      if (err?.code !== 'DOCUMENT_PICKER_CANCELED') {
        setError('Could not open file picker. Please try again.');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file first.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);

      const res = await fetch(`${API_BASE}/api/v1/appointments/${appointmentId}/prescription`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` },
        body: form,
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { s3Key } = await res.json();
      setSuccess(true);
      onSuccess(s3Key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.headerCard}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Prescription upload</Text>
            <Text style={s.title}>Send the visit summary PDF</Text>
          </View>
          <Text style={s.cancel} onPress={onCancel}>Cancel</Text>
        </View>
        <Text style={s.meta}>Appointment {String(appointmentId).padStart(5, '0')}</Text>
      </View>

      <View style={s.bodyCard}>
        <Pressable style={s.pickBtn} onPress={pickDocument} disabled={loading}>
          <Text style={s.pickBtnTitle}>{file ? file.name : 'Select PDF file'}</Text>
          <Text style={s.pickBtnMeta}>
            {file ? `${(file.size / 1024).toFixed(1)} KB` : 'PDF only · Max 10 MB'}
          </Text>
        </Pressable>

        <Text style={s.hint}>
          Files are stored securely in AWS Mumbai once uploaded.
        </Text>

        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={s.successBox}>
            <Text style={s.successText}>Prescription uploaded. Pharmacy can review it now.</Text>
          </View>
        ) : null}

        <Pressable
          style={[s.uploadBtn, (!file || loading) && s.uploadBtnDisabled]}
          onPress={handleUpload}
          disabled={!file || loading}
        >
          {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={s.uploadBtnText}>Upload to S3</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: {
    ...Surfaces.screen,
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
  bodyCard: {
    ...Surfaces.card,
    borderRadius: Radii.xl,
    gap: Spacing.md,
  },
  pickBtn: {
    ...Surfaces.cardMuted,
    borderRadius: Radii.xl,
    borderStyle: 'dashed',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  pickBtnTitle: {
    ...Typography.subheading,
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
  },
  pickBtnMeta: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginTop: 4,
  },
  hint: {
    ...Typography.bodySmall,
    textAlign: 'center',
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
  successBox: {
    ...Surfaces.cardMuted,
    borderRadius: Radii.lg,
    backgroundColor: '#EDF5EA',
  },
  successText: {
    ...Typography.bodySmall,
    color: Colors.success,
  },
  uploadBtn: {
    ...Buttons.primary,
  },
  uploadBtnDisabled: {
    opacity: 0.5,
  },
  uploadBtnText: {
    ...Typography.button,
  },
});

export default PrescriptionUploadScreen;
