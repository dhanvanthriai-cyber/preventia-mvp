/**
 * screens/auth/LoginScreen.tsx
 * Project Preventia — Login / entry screen
 *
 * MVP: email + password form → calls POST /api/v1/auth/login
 * On success the JWT payload contains the user's role which drives
 * navigation to the correct portal.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { Colors, Borders, Spacing, Typography } from '../../theme/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const API_BASE =
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE_URL) ||
  'http://localhost:8080';

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError('Invalid credentials. Please try again.');
        return;
      }
      const data = await res.json();
      const role: string = data?.role ?? '';
      if (role === 'DOCTOR') {
        navigation.replace('DoctorPortal');
      } else if (role === 'PHARMACIST') {
        navigation.replace('PharmacyPortal');
      } else {
        // PATIENT or default
        navigation.replace('PatientPortal');
      }
    } catch {
      setError('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Preventia</Text>
          <Text style={styles.tagline}>Your trusted health companion</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            placeholder="you@example.com"
            placeholderTextColor="#999"
            testID="input-email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#999"
            testID="input-password"
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={handleLogin}
            disabled={loading}
            testID="btn-login"
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.ctaText}>Sign In</Text>
            )}
          </Pressable>

          {/* Dev shortcut */}
          <Pressable
            style={styles.devLink}
            onPress={() => navigation.navigate('RoleSelect')}
            testID="btn-role-select"
          >
            <Text style={styles.devLinkText}>
              ↗ Demo: choose portal without login
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  header: { alignItems: 'center', marginBottom: 48 },
  logo: {
    ...Typography.heading,
    fontSize: 32,
    color: Colors.trustBlue,
    letterSpacing: 1,
  },
  tagline: { ...Typography.body, color: '#555', marginTop: 8 },
  form: { gap: 4 },
  label: {
    ...Typography.body,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 16,
  },
  input: {
    ...Borders.standard,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  error: {
    color: Colors.alertRed,
    fontSize: 13,
    marginTop: 8,
  },
  cta: {
    backgroundColor: Colors.trustBlue,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
    ...Borders.standard,
    borderColor: Colors.trustBlue,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  devLink: { alignItems: 'center', marginTop: 20 },
  devLinkText: { color: Colors.trustBlue, fontSize: 13, textDecorationLine: 'underline' },
});

