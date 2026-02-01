import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from './src/components/MapView';
import { CAMPUSES } from './src/constants/campuses';

export default function App() {
  const [campusIndex, setCampusIndex] = useState(0); // current value for campusIndex (0 = SGW, 1 = LOYOLA)
  const campus = CAMPUSES[campusIndex];

  // helper function to render the tab
  const renderTab = (c, i) => {
    const isActive = campusIndex === i;
    return (
      <TouchableOpacity
        key={c.id}
        testID={`campus-tab-${c.label}`}
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => setCampusIndex(i)}
        accessibilityRole="tab"
        accessibilityLabel={`Campus ${c.label}`}
        accessibilityState={{ selected: isActive }}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {c.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Campus Tabs */}
      <View style={styles.tabBar}>
        {CAMPUSES.map(renderTab)}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          center={campus.center}
          zoom={18}
          markers={campus.markers}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#edf2f7',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#e53e3e',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
  },
  tabTextActive: {
    color: '#fff',
  },
  mapContainer: {
    flex: 1,
    minHeight: 0,
  },
});
