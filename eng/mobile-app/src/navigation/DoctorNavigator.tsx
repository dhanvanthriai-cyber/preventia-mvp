/**
 * navigation/DoctorNavigator.tsx
 * Project Preventia — Doctor portal bottom-tab navigator
 *
 * Tabs: Dashboard | Appointments | Patients | Notes | Profile
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { DoctorTabParamList } from './types';
import { Colors } from '../theme/theme';

import { DoctorDashboardScreen } from '../screens/doctor/DoctorDashboardScreen';
import { DoctorAppointmentsScreen } from '../screens/doctor/DoctorAppointmentsScreen';
import { DoctorPatientsScreen } from '../screens/doctor/DoctorPatientsScreen';
import { DoctorNotesScreen } from '../screens/doctor/DoctorNotesScreen';
import { DoctorProfileScreen } from '../screens/doctor/DoctorProfileScreen';

const Tab = createBottomTabNavigator<DoctorTabParamList>();

export function DoctorNavigator() {
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
        name="Dashboard"
        component={DoctorDashboardScreen}
        options={{ tabBarLabel: "Today's Queue" }}
      />
      <Tab.Screen
        name="Appointments"
        component={DoctorAppointmentsScreen}
        options={{ tabBarLabel: 'Schedule' }}
      />
      <Tab.Screen
        name="Patients"
        component={DoctorPatientsScreen}
        options={{ tabBarLabel: 'Patients' }}
      />
      <Tab.Screen
        name="Notes"
        component={DoctorNotesScreen}
        options={{ tabBarLabel: 'Notes' }}
      />
      <Tab.Screen
        name="Profile"
        component={DoctorProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

