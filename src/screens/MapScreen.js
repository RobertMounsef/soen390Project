import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import MapView from '../components/MapView';
import { getCampuses } from '../services/api';

export default function MapScreen() {
  const campuses = getCampuses();
  const [campusIndex, setCampusIndex] = useState(0); // 0 = SGW, 1 = LOYOLA
  const campus = campuses[campusIndex];

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
        {campuses.map(renderTab)}
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
