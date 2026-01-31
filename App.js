import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import MapView from './src/components/MapView'
import { CAMPUSES } from './src/constants/campuses'

export default function App() {
  const [campusIndex, setCampusIndex] = useState(0)
  const campus = CAMPUSES[campusIndex]

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        {/* Campus tabs */}
        <View style={styles.tabBar}>
          {CAMPUSES.map((c, i) => (
            <TouchableOpacity
              key={c.id}
              testID={`campus-tab-${c.label}`}
              style={[styles.tab, campusIndex === i && styles.tabActive]}
              onPress={() => setCampusIndex(i)}
              accessibilityRole="tab"
              accessibilityLabel={`Campus ${c.label}`}
              accessibilityState={{ selected: campusIndex === i }}
            >
              <Text
                style={[
                  styles.tabText,
                  campusIndex === i && styles.tabTextActive,
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
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
    </>
  )
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
})
