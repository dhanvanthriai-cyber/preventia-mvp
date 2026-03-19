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
import { AuthUser, UserRole, useAuth } from '@preventia/shared';
import { Buttons, Colors, Imagery, Radii, Spacing, Surfaces, Typography } from '../../theme/theme';

const ROLES: UserRole[] = ['RECIPIENT', 'SPONSOR', 'DOCTOR', 'PHARMACIST'];
const ROLE_LABELS: Record<UserRole, string> = {
  RECIPIENT: 'Parent / Recipient',
  SPONSOR: 'Sponsor / Family',
  DOCTOR: 'Doctor',
  PHARMACIST: 'Pharmacist',
  ADMIN: 'Admin',
};

interface AuthScreenProps {
  onAuthSuccess: (user: AuthUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const { login, register, loading, error } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('RECIPIENT');

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
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.heroCard}>
            <Text style={s.eyebrow}>Gentle Minimalist</Text>
            <Text style={s.logo}>Preventia</Text>
            <Text style={s.tagline}>
              A warmer, calmer way into family healthcare.
            </Text>

            <View style={s.photoPlaceholder}>
              <View style={s.photoGlow} />
              <View style={s.photoBubble} />
              <View style={s.photoCaption}>
                <Text style={s.photoCaptionTitle}>Lifestyle photo placeholder</Text>
                <Text style={s.photoCaptionText}>
                  Sunlit home, family check-in, soft wellness atmosphere.
                </Text>
              </View>
            </View>
          </View>

          <View style={s.modeRow}>
            {(['login', 'register'] as const).map((item) => (
              <Pressable
                key={item}
                style={[s.modeBtn, mode === item && s.modeBtnActive]}
                onPress={() => setMode(item)}
              >
                <Text style={[s.modeBtnText, mode === item && s.modeBtnTextActive]}>
                  {item === 'login' ? 'Sign in' : 'Create account'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={s.formCard}>
            <Text style={s.formTitle}>
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </Text>
            <Text style={s.formCopy}>
              {mode === 'login'
                ? 'Pick up where your family care plan left off.'
                : 'Choose the role that matches how you support care.'}
            </Text>

            <View style={s.form}>
              {mode === 'register' ? (
                <TextInput
                  style={s.input}
                  placeholder="Full name"
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              ) : null}

              <TextInput
                style={s.input}
                placeholder="Email address"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <TextInput
                style={s.input}
                placeholder="Password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {mode === 'register' ? (
                <View style={s.rolePicker}>
                  <Text style={s.roleLabel}>I&apos;m joining as</Text>
                  <View style={s.roleRow}>
                    {ROLES.map((item) => (
                      <Pressable
                        key={item}
                        style={[s.roleChip, role === item && s.roleChipActive]}
                        onPress={() => setRole(item)}
                      >
                        <Text style={[s.roleChipText, role === item && s.roleChipTextActive]}>
                          {ROLE_LABELS[item]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {error ? <Text style={s.errorText}>{error}</Text> : null}

              <Pressable
                style={[s.submitBtn, loading && s.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={s.submitBtnText}>
                    {mode === 'login' ? 'Continue' : 'Create account'}
                  </Text>
                )}
              </Pressable>
            </View>
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
    flexGrow: 1,
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
  logo: {
    ...Typography.display,
  },
  tagline: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  photoPlaceholder: {
    ...Imagery.placeholder,
    position: 'relative',
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    justifyContent: 'flex-end',
  },
  photoGlow: {
    position: 'absolute',
    top: -24,
    right: -12,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  photoBubble: {
    position: 'absolute',
    left: -28,
    bottom: -48,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(135, 156, 131, 0.12)',
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
  modeRow: {
    ...Surfaces.cardMuted,
    borderRadius: Radii.pill,
    padding: 6,
    flexDirection: 'row',
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    borderRadius: Radii.pill,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modeBtnActive: {
    backgroundColor: Colors.surface,
  },
  modeBtnText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  modeBtnTextActive: {
    color: Colors.text,
  },
  formCard: {
    ...Surfaces.card,
    borderRadius: Radii.xl,
    gap: Spacing.sm,
  },
  formTitle: {
    ...Typography.heading,
  },
  formCopy: {
    ...Typography.bodySmall,
  },
  form: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  input: {
    ...Surfaces.input,
    ...Typography.body,
    color: Colors.text,
  },
  rolePicker: {
    gap: Spacing.sm,
  },
  roleLabel: {
    ...Typography.label,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  roleChip: {
    ...Surfaces.pill,
  },
  roleChipActive: {
    backgroundColor: Colors.sageTint,
    borderColor: Colors.sage,
  },
  roleChipText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text,
  },
  roleChipTextActive: {
    color: Colors.sageDeep,
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.rose,
  },
  submitBtn: {
    ...Buttons.primary,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    ...Typography.button,
  },
});

export default AuthScreen;
