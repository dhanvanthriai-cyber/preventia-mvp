/**
 * PrescriptionUploadScreen.tsx — Doctor uploads prescription PDF
 * Project Dhanvanthri | Neo-Brutalist Wellness
 *
 * Calls: POST /api/v1/appointments/{id}/prescription (multipart/form-data)
 * Uses react-native-document-picker to select PDF from device.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator, Pressable, SafeAreaView,
  StyleSheet, Text, View,
} from 'react-native';
import { Colors, Spacing } from '../../theme/theme';
import { AuthUser } from '@dhanvanthri/shared';

const API_BASE = process.env.REACT_NATIVE_API_BASE_URL ?? 'http://localhost:8080';

interface Props {
  user: AuthUser;
  appointmentId: number;
  onSuccess: (s3Key: string) => void;
  onCancel: () => void;
}

interface PickedFile { uri: string; name: string; type: string; size: number; }

export const PrescriptionUploadScreen: React.FC<Props> = ({
  user, appointmentId, onSuccess, onCancel,
}) => {
  const [file, setFile]       = useState<PickedFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const pickDocument = async () => {
    try {
      // Dynamic import — requires react-native-document-picker in node_modules
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const DocumentPicker = require('react-native-document-picker');
      const result = await DocumentPicker.pick({ type: [DocumentPicker.types.pdf] });
      const picked = Array.isArray(result) ? result[0] : result;
      setFile({ uri: picked.uri, name: picked.name ?? 'prescription.pdf',
                type: picked.type ?? 'application/pdf', size: picked.size ?? 0 });
      setError(null);
    } catch (e: any) {
      if (e?.code !== 'DOCUMENT_PICKER_CANCELED') {
        setError('Could not open file picker. Please try again.');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) { setError('Please select a PDF file first.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('File must be under 10 MB.'); return; }

    setLoading(true); setError(null);
    try {
      const form = new FormData();
      form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);

      const res = await fetch(`${API_BASE}/api/v1/appointments/${appointmentId}/prescription`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${user.token}` }, // Content-Type set by FormData
        body: form,
      });

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const { s3Key } = await res.json();
      setSuccess(true);
      onSuccess(s3Key);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>UPLOAD PRESCRIPTION</Text>
        <Text style={s.cancel} onPress={onCancel}>CANCEL</Text>
      </View>

      <View style={s.body}>
        <Text style={s.apptLabel}>APT-{String(appointmentId).padStart(5, '0')}</Text>

        {/* File picker */}
        <Pressable style={s.pickBtn} onPress={pickDocument} disabled={loading}>
          <Text style={s.pickBtnText}>{file ? `📄 ${file.name}` : 'SELECT PDF FILE'}</Text>
          {file && <Text style={s.fileSize}>{(file.size / 1024).toFixed(1)} KB</Text>}
        </Pressable>

        <Text style={s.hint}>PDF only · Max 10 MB · File stored encrypted in AWS Mumbai (ap-south-1)</Text>

        {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

        {success && (
          <View style={s.successBox}>
            <Text style={s.successText}>✅ Prescription uploaded. Pharmacist notified.</Text>
          </View>
        )}

        <Pressable style={[s.uploadBtn, (!file || loading) && { opacity: 0.5 }]}
          onPress={handleUpload} disabled={!file || loading}>
          {loading ? <ActivityIndicator color={Colors.white} />
            : <Text style={s.uploadBtnText}>UPLOAD TO S3</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: Colors.white },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                 padding: Spacing.md, borderBottomWidth: 2, borderColor: Colors.black },
  title:       { fontFamily: 'PlayfairDisplay-Bold', fontSize: 20, color: Colors.black },
  cancel:      { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: Colors.alertRed, textDecorationLine: 'underline' },
  body:        { padding: Spacing.lg, gap: Spacing.md },
  apptLabel:   { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: Colors.trustBlue, letterSpacing: 1 },
  pickBtn:     { borderWidth: 2, borderColor: Colors.black, borderStyle: 'dashed',
                 padding: Spacing.xl, alignItems: 'center', backgroundColor: '#fafafa' },
  pickBtnText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 14, color: Colors.black, letterSpacing: 0.5 },
  fileSize:    { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: '#888', marginTop: 4 },
  hint:        { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: '#888', textAlign: 'center', lineHeight: 16 },
  errorBox:    { borderWidth: 2, borderColor: Colors.alertRed, padding: Spacing.sm },
  errorText:   { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: Colors.alertRed },
  successBox:  { borderWidth: 2, borderColor: Colors.alertGreen, padding: Spacing.sm },
  successText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: Colors.alertGreen },
  uploadBtn:   { backgroundColor: Colors.trustBlue, borderWidth: 2, borderColor: Colors.black,
                 padding: Spacing.md, alignItems: 'center' },
  uploadBtnText:{ fontFamily: 'JetBrainsMono-Regular', fontSize: 14, color: Colors.white, letterSpacing: 2, fontWeight: '700' },
});

export default PrescriptionUploadScreen;
