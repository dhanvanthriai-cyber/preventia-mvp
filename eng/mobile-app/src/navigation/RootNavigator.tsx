/**
 * navigation/RootNavigator.tsx
 * Project Preventia — Root stack: auth gate → role portal
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RoleSelectScreen } from '../screens/auth/RoleSelectScreen';
import { PatientNavigator } from './PatientNavigator';
import { DoctorNavigator } from './DoctorNavigator';
import { PharmacyNavigator } from './PharmacyNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="RoleSelect"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <Stack.Screen name="PatientPortal" component={PatientNavigator} />
      <Stack.Screen name="DoctorPortal" component={DoctorNavigator} />
      <Stack.Screen name="PharmacyPortal" component={PharmacyNavigator} />
    </Stack.Navigator>
  );
}

