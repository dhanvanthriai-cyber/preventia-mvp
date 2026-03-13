/**
 * AuthScreen.tsx — Login + Register
 * Project Dhanvanthri | Neo-Brutalist Wellness
 *
 * Single screen toggling between Login and Register modes.
 * On success, calls onAuthSuccess(user) → App.tsx routes by role.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Colors, Spacing, Typography } from '../../theme/theme';
import { AuthUser, UserRole, useAuth } from '@dhanvanthri/shared';

const ROLES: UserRole[] = ['RECIPIENT', 'SPONSOR', 'DOCTOR', 'PHARMACIST'];
const ROLE_LABELS: Record<UserRole, string> = {
  RECIPIENT:   'Recipient (Patient)',
  SPONSOR:     'Sponsor (NRI)',
  DOCTOR:      'Doctor',
  PHARMACIST:  'Pharmacist',
};

interface AuthScreenProps { onAuthSuccess: (user: AuthUser) => void; }

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const { login, register, loading, error } = useAuth();
  const [mode, setMode]         = useState<'login' | 'register'>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [role, setRole]         = useState<UserRole>('RECIPIENT');

  const handleSubmit = async () => {
    let user: AuthUser | null = null;
    if (mode === 'login') {
      user = await login(email.trim(), password);
    } else {
      user = await register(name.trim(), email.trim(), password, role);
    }
    if (user) onAuthSuccess(user);
  };

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <View style={s.header}>
            <Text style={s.logo}>DHANVANTHRI</Text>
            <Text style={s.tagline}>High-Trust NRI Healthcare</Text>
          </View>

          {/* Mode toggle */}
          <View style={s.modeRow}>
            {(['login', 'register'] as const).map(m => (
              <Pressable key={m} style={[s.modeBtn, mode === m && s.modeBtnActive]} onPress={() => setMode(m)}>
                <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
                  {m === 'login' ? 'LOG IN' : 'REGISTER'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Form */}
          <View style={s.form}>
            {mode === 'register' && (
              <TextInput style={s.input} placeholder="Full Name"
                placeholderTextColor="#888" value={name}
                onChangeText={setName} autoCapitalize="words" />
            )}

            <TextInput style={s.input} placeholder="Email"
              placeholderTextColor="#888" value={email}
              onChangeText={setEmail} keyboardType="email-address"
              autoCapitalize="none" autoComplete="email" />

            <TextInput style={s.input} placeholder="Password"
              placeholderTextColor="#888" value={password}
              onChangeText={setPassword} secureTextEntry />

            {mode === 'register' && (
              <View>
                <Text style={s.label}>I AM A:</Text>
                <View style={s.roleRow}>
                  {ROLES.map(r => (
                    <Pressable key={r} style={[s.roleChip, role === r && s.roleChipActive]}
                      onPress={() => setRole(r)}>
                      <Text style={[s.roleChipText, role === r && s.roleChipTextActive]}>
                        {ROLE_LABELS[r]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {error && <Text style={s.errorText}>{error}</Text>}

            <Pressable style={[s.submitBtn, loading && s.submitBtnDisabled]}
              onPress={handleSubmit} disabled={loading}>
              {loading
                ? <ActivityIndicator color={Colors.white} />
                : <Text style={s.submitBtnText}>{mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}</Text>}
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.white },
  scroll:  { padding: Spacing.lg, flexGrow: 1 },
  header:  { alignItems: 'center', marginVertical: Spacing.xl },
  logo:    { fontFamily: 'PlayfairDisplay-Bold', fontSize: 28, color: Colors.black, letterSpacing: 3 },
  tagline: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: Colors.trustBlue, marginTop: 4, letterSpacing: 1 },

  modeRow:          { flexDirection: 'row', borderWidth: 2, borderColor: Colors.black, marginBottom: Spacing.lg },
  modeBtn:          { flex: 1, padding: Spacing.sm, alignItems: 'center', backgroundColor: Colors.white },
  modeBtnActive:    { backgroundColor: Colors.black },
  modeBtnText:      { fontFamily: 'JetBrainsMono-Regular', fontSize: 13, color: Colors.black, letterSpacing: 1 },
  modeBtnTextActive:{ color: Colors.white },

  form:  { gap: Spacing.md },
  input: {
    borderWidth: 2, borderColor: Colors.black,
    padding: Spacing.md, fontSize: 15,
    fontFamily: 'JetBrainsMono-Regular', color: Colors.black,
    backgroundColor: Colors.white,
  },
  label: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: Colors.black, marginBottom: Spacing.sm, letterSpacing: 1 },

  roleRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  roleChip:          { borderWidth: 2, borderColor: Colors.black, paddingHorizontal: Spacing.sm, paddingVertical: 6 },
  roleChipActive:    { backgroundColor: Colors.trustBlue, borderColor: Colors.trustBlue },
  roleChipText:      { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: Colors.black },
  roleChipTextActive:{ color: Colors.white },

  errorText:         { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: Colors.alertRed },
  submitBtn:         { backgroundColor: Colors.trustBlue, borderWidth: 2, borderColor: Colors.black, padding: Spacing.md, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText:     { fontFamily: 'JetBrainsMono-Regular', fontSize: 14, color: Colors.white, letterSpacing: 2, fontWeight: '700' },
});

export default AuthScreen;
