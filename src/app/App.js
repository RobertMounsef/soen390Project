import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MapScreen from '../screens/MapScreen';
import { configureFirebaseAnalytics } from '../services/analytics/firebase';

export default function App() {
  useEffect(() => {
    void configureFirebaseAnalytics();
  }, []);

  return (
    <SafeAreaProvider>
      <MapScreen />
    </SafeAreaProvider>
  );
}
