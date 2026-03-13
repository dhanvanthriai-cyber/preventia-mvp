/**
 * App.tsx
 * Project Dhanvanthri — Root application component
 *
 * Wraps the entire app in NavigationContainer and renders the RootNavigator.
 * react-native-screens and react-native-safe-area-context must be set up
 * here before any navigator is created.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

