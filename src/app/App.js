import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MapScreen from '../screens/MapScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <MapScreen />
    </SafeAreaProvider>
  );
}
