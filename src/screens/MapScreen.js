import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import MapView from '../components/MapView';
import BuildingInfoPopup from '../components/BuildingInfoPopup';
import { getCampuses } from '../services/api';
import { getBuildingsByCampus, getBuildingInfo } from '../services/api/buildings';
import useUserLocation from '../hooks/useUserLocation';
import { pointInPolygonFeature, getBuildingId } from '../utils/geolocation';

export default function MapScreen() {
  const campuses = getCampuses();
  const [campusIndex, setCampusIndex] = useState(0); // 0 = SGW, 1 = LOYOLA
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  
  const campus = campuses[campusIndex];
  const buildings = getBuildingsByCampus(campus.id);

  const { status: locStatus, coords, message: locMessage } = useUserLocation();
  const selectedBuildingInfo = selectedBuildingId ? getBuildingInfo(selectedBuildingId) : null;

  const currentBuildingId = useMemo(() => {
    if (!coords || !Array.isArray(buildings) || buildings.length === 0) return null;

    const point = { latitude: coords.latitude, longitude: coords.longitude };

    for (const feature of buildings) {
      // Only polygons can contain user
      const geomType = feature?.geometry?.type;
      if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') continue;

      if (pointInPolygonFeature(point, feature)) {
        return getBuildingId(feature);
      }
    }
    return null;
  }, [coords, buildings]);
  
  const currentBuildingInfo = useMemo(() => {
    return currentBuildingId ? getBuildingInfo(currentBuildingId) : null;
  }, [currentBuildingId]);

  const handleBuildingPress = (buildingId) => {
    setSelectedBuildingId(buildingId);
    setPopupVisible(true);
  };

  const handleClosePopup = () => {
    setPopupVisible(false);
    setSelectedBuildingId(null);
  };

  const handleMoreDetails = () => {
    // For now, just close the popup
    // In the future, this could navigate to a detailed building page
    handleClosePopup();
  };

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

      <View style={styles.locationBanner}>
        {locStatus === 'watching' && (
          <Text style={styles.locationText}>
            {currentBuildingInfo
              ? `You are in: ${currentBuildingInfo.name}`
              : coords
                ? 'You are not inside a mapped building.'
                : 'Finding your location...'}
          </Text>
        )}

        {(locStatus === 'denied' || locStatus === 'unavailable' || locStatus === 'error') && (
          <Text style={styles.locationText}>
            {locMessage || 'Location cannot be determined.'}
          </Text>
        )}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          center={campus.center}
          zoom={18}
          markers={campus.markers}
          buildings={buildings}
          onBuildingPress={handleBuildingPress}
          highlightedBuildingId={currentBuildingId}
        />
      </View>

      {/* Building Info Popup */}
      <BuildingInfoPopup
        visible={popupVisible}
        buildingInfo={selectedBuildingInfo}
        onClose={handleClosePopup}
        onMoreDetails={handleMoreDetails}
      />
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
  locationBanner: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a202c',
  },
  mapContainer: {
    flex: 1,
    minHeight: 0,
  },
});
