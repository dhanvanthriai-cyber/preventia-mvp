/**
 * navigation/PatientNavigator.tsx
 * Project Dhanvanthri — Patient portal bottom-tab navigator
 *
 * Tabs: Home | Appointments | Chat | Pharmacy | Profile
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { PatientTabParamList } from './types';
import { Colors } from '../theme/theme';

import { PatientHomeScreen } from '../screens/patient/PatientHomeScreen';
import { PatientAppointmentsScreen } from '../screens/patient/PatientAppointmentsScreen';
import { PatientChatScreen } from '../screens/patient/PatientChatScreen';
import { PatientPharmacyScreen } from '../screens/patient/PatientPharmacyScreen';
import { PatientProfileScreen } from '../screens/patient/PatientProfileScreen';

const Tab = createBottomTabNavigator<PatientTabParamList>();

export function PatientNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.trustBlue,
        tabBarInactiveTintColor: Colors.black,
        tabBarStyle: {
          borderTopWidth: 2,
          borderTopColor: Colors.black,
          backgroundColor: Colors.white,
        },
        tabBarLabelStyle: {
          fontFamily: 'System',
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={PatientHomeScreen}
        options={{ tabBarLabel: 'Home', tabBarTestID: 'tab-home' }}
      />
      <Tab.Screen
        name="Appointments"
        component={PatientAppointmentsScreen}
        options={{ tabBarLabel: 'Appointments', tabBarTestID: 'tab-appts' }}
      />
      <Tab.Screen
        name="Chat"
        component={PatientChatScreen}
        options={{ tabBarLabel: 'Chat', tabBarTestID: 'tab-chat' }}
      />
      <Tab.Screen
        name="Pharmacy"
        component={PatientPharmacyScreen}
        options={{ tabBarLabel: 'Pharmacy', tabBarTestID: 'tab-pharmacy' }}
      />
      <Tab.Screen
        name="Profile"
        component={PatientProfileScreen}
        options={{ tabBarLabel: 'Profile', tabBarTestID: 'tab-profile' }}
      />
    </Tab.Navigator>
  );
}

