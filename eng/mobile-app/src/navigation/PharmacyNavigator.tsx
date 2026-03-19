/**
 * navigation/PharmacyNavigator.tsx
 * Project Preventia — Pharmacy portal bottom-tab navigator
 *
 * Tabs: Orders | Rx Queue | Catalog | Profile
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { PharmacyTabParamList } from './types';
import { Colors } from '../theme/theme';

import { PharmacyOrdersScreen } from '../screens/pharmacy/PharmacyOrdersScreen';
import { PharmacyRxQueueScreen } from '../screens/pharmacy/PharmacyRxQueueScreen';
import { PharmacyCatalogScreen } from '../screens/pharmacy/PharmacyCatalogScreen';
import { PharmacyProfileScreen } from '../screens/pharmacy/PharmacyProfileScreen';

const Tab = createBottomTabNavigator<PharmacyTabParamList>();

export function PharmacyNavigator() {
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
        name="Orders"
        component={PharmacyOrdersScreen}
        options={{ tabBarLabel: 'Orders' }}
      />
      <Tab.Screen
        name="RxQueue"
        component={PharmacyRxQueueScreen}
        options={{ tabBarLabel: 'Rx Queue' }}
      />
      <Tab.Screen
        name="Catalog"
        component={PharmacyCatalogScreen}
        options={{ tabBarLabel: 'Catalog' }}
      />
      <Tab.Screen
        name="Profile"
        component={PharmacyProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

