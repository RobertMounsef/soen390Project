import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
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
  const [originBuildingId, setOriginBuildingId] = useState(null);
  const [destinationBuildingId, setDestinationBuildingId] = useState(null);
  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [originMode, setOriginMode] = useState('manual'); // 'manual' or 'current'

  const campus = campuses[campusIndex];
  const buildings = getBuildingsByCampus(campus.id);

  const allBuildings = useMemo(() => {
    const sgw = getBuildingsByCampus('SGW') || [];
    const loy = getBuildingsByCampus('LOY') || [];
    return [...sgw, ...loy];
  }, []);

  const { status: locStatus, coords, message: locMessage } = useUserLocation();
  const selectedBuildingInfo = selectedBuildingId ? getBuildingInfo(selectedBuildingId) : null;

  const currentBuildingId = useMemo(() => {
    if (!coords || allBuildings.length === 0) {
      return null;
    }

    const point = { latitude: coords.latitude, longitude: coords.longitude };

    for (const feature of allBuildingsForLocation) {
      // Only polygons can contain user
      const geomType = feature?.geometry?.type;
      if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') continue;

      if (pointInPolygonFeature(point, feature)) {
        return getBuildingId(feature);
      }
    }
    return null;
  }, [coords, allBuildings]);

  const currentBuildingInfo = useMemo(() => {
    return currentBuildingId ? getBuildingInfo(currentBuildingId) : null;
  }, [currentBuildingId]);

  const handleMoreDetails = () => {
    // For now, just close the popup
    // In the future, this could navigate to a detailed building page
    handleClosePopup();
  };

  const handleCampusChange = (i) => {
    setCampusIndex(i);
    // Keep origin/destination selections so users can plan routes across campuses.
    // Only clear the currently open popup / tapped building.
    setSelectedBuildingId(null);
    setPopupVisible(false);
  };

  const handleUseCurrentLocationAsOrigin = () => {
    // If permission or error state exists, do nothing.
    // The top banner already displays the correct message.
    if (locStatus === 'denied' || locStatus === 'unavailable' || locStatus === 'error') {
      return;
    }

    if (!coords) {
      return; // top banner will already show "Finding your location..."
    }

    if (!currentBuildingId) {
      return; // top banner already says not inside mapped building
    }

    const info = getBuildingInfo(currentBuildingId);

    setOriginBuildingId(currentBuildingId);
    setOriginQuery(info ? `${info.name} (${info.code})` : currentBuildingId);
    setOriginMode('current');
  };

  // If user moves while planning route and originMode is "current",
  // update origin automatically when their current building changes.
  useEffect(() => {
    if (originMode !== 'current') return;

    if (currentBuildingId) {
      const info = getBuildingInfo(currentBuildingId);
      setOriginBuildingId(currentBuildingId);
      setOriginQuery(info ? `${info.name} (${info.code})` : currentBuildingId);
    }
  }, [originMode, currentBuildingId]);

  // Helper function to set building info and query
  const setBuildingAsDestination = (buildingId) => {
    setDestinationBuildingId(buildingId);
    const info = getBuildingInfo(buildingId);
    setDestinationQuery(info ? `${info.name} (${info.code})` : buildingId);
  };

  const handleBuildingPress = (buildingId) => {
    // When selecting by tapping on the map:
    // - First tap sets origin
    // - Second tap sets destination
    // - Subsequent taps update destination
    if (!originBuildingId) {
      setOriginMode('manual');
      setOriginBuildingId(buildingId);
      const info = getBuildingInfo(buildingId);
      setOriginQuery(info ? `${info.name} (${info.code})` : buildingId);
    } else if (!destinationBuildingId && buildingId !== originBuildingId) {
      setBuildingAsDestination(buildingId);
    } else if (buildingId !== originBuildingId) {
      // If both are set, allow changing destination by tapping another building
      setBuildingAsDestination(buildingId);
    }

    setSelectedBuildingId(buildingId);
    setPopupVisible(true);
  };

  const handleClosePopup = () => {
    setPopupVisible(false);
    setSelectedBuildingId(null);
  };

  const allCampusBuildings = useMemo(() => {
    const byId = new Map();

    for (const feature of allBuildings) {
      const props = feature?.properties || {};
      const id = props.id;
      if (!id || byId.has(id)) continue;

      const info = getBuildingInfo(id);
      byId.set(id, {
        id,
        code: props.code || info?.code || id,
        name: props.name || info?.name || id,
      });
    }

    return Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [allBuildings]);

  const filterBuildings = (query) => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    return allCampusBuildings.filter((b) => {
      const name = (b.name || '').toLowerCase();
      const code = (b.code || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  };

  const originSuggestions = useMemo(
    () => filterBuildings(originQuery).slice(0, 6),
    [originQuery, allCampusBuildings],
  );

  const destinationSuggestions = useMemo(
    () => filterBuildings(destinationQuery).slice(0, 6),
    [destinationQuery, allCampusBuildings],
  );

  const handleSelectOriginFromSearch = (building) => {
    setOriginMode('manual');
    setOriginBuildingId(building.id);
    setOriginQuery(`${building.name} (${building.code})`);
  };

  const handleSelectDestinationFromSearch = (building) => {
    setDestinationBuildingId(building.id);
    setDestinationQuery(`${building.name} (${building.code})`);
  };

  const clearOrigin = () => {
    setOriginMode('manual');
    setOriginBuildingId(null);
    setOriginQuery('');
  };

  const clearDestination = () => {
    setDestinationBuildingId(null);
    setDestinationQuery('');
  };

  // helper function to render the tab
  const renderTab = (c, i) => {
    const isActive = campusIndex === i;
    return (
      <TouchableOpacity
        key={c.id}
        testID={`campus-tab-${c.label}`}
        style={[styles.tab, isActive && styles.tabActive]}
        onPress={() => handleCampusChange(i)}
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

      {/* Origin / Destination search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchLabelContainer}>
            <Text style={styles.searchLabel}>From</Text>
          </View>
          <View style={styles.searchInputWrapper}>
            <View style={styles.searchInputRow}>
              <TextInput
                value={originQuery}
                onChangeText={(text) => {
                  setOriginMode('manual');
                  setOriginQuery(text);
                }}
                placeholder="Search origin building"
                placeholderTextColor="#a0aec0"
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="characters"
              />

              {/* Current Location Round Button */}
              <TouchableOpacity
                onPress={handleUseCurrentLocationAsOrigin}
                style={[
                  styles.locationIconButton,
                  originMode === 'current' && styles.locationIconActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Use Current Location as starting point"
              >
                <Text style={styles.locationIcon}>📍</Text>
              </TouchableOpacity>

              {originBuildingId && (
                <TouchableOpacity onPress={clearOrigin}>
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        {originSuggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            {originSuggestions.map((building) => (
              <TouchableOpacity
                key={`origin-${building.id}`}
                style={styles.suggestionItem}
                onPress={() => handleSelectOriginFromSearch(building)}
              >
                <Text style={styles.suggestionText}>
                  {building.name} ({building.code})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.searchRow}>
          <View style={styles.searchLabelContainer}>
            <Text style={styles.searchLabel}>To</Text>
          </View>
          <View style={styles.searchInputWrapper}>
            <View style={styles.searchInputRow}>
              <TextInput
                value={destinationQuery}
                onChangeText={setDestinationQuery}
                placeholder="Search destination building"
                placeholderTextColor="#a0aec0"
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="characters"
              />
              {destinationBuildingId && (
                <TouchableOpacity onPress={clearDestination}>
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        {destinationSuggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            {destinationSuggestions.map((building) => (
              <TouchableOpacity
                key={`destination-${building.id}`}
                style={styles.suggestionItem}
                onPress={() => handleSelectDestinationFromSearch(building)}
              >
                <Text style={styles.suggestionText}>
                  {building.name} ({building.code})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
          originBuildingId={originBuildingId}
          destinationBuildingId={destinationBuildingId}
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
  searchContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchLabelContainer: {
    width: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 8,
  },
  searchLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#4a5568',
  },
  clearText: {
    fontSize: 11,
    color: '#e53e3e',
    fontWeight: '600',
  },
  searchInputWrapper: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: '#edf2f7',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    fontSize: 14,
    color: '#1a202c',
    flex: 1,
  },
  suggestionsBox: {
    marginTop: 2,
    marginBottom: 6,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  suggestionText: {
    fontSize: 13,
    color: '#2d3748',
  },
  clearIcon: {
    fontSize: 14,
    color: '#a0aec0',
    marginLeft: 6,
  },
  mapContainer: {
    flex: 1,
    minHeight: 0,
  },
  locationIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,

    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: '#f1f5f9',   // subtle neutral grey
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',

    // subtle elevation
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  locationIconActive: {
    backgroundColor: '#d1fae5',   // soft green
    borderColor: '#86efac',
    shadowOpacity: 0.15,
    elevation: 3,
  },
  locationIcon: {
    fontSize: 16,
  }
});
