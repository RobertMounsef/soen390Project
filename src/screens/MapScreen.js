import React, { useState, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MapView from '../components/MapView';
import BuildingInfoPopup from '../components/BuildingInfoPopup';
import DirectionsPanel from '../components/DirectionsPanel';
import { getCampuses } from '../services/api';
import { getBuildingsByCampus, getBuildingInfo, getBuildingCoords } from '../services/api/buildings';
import useUserLocation from '../hooks/useUserLocation';
import useDirections from '../hooks/useDirections';
import { pointInPolygonFeature, getBuildingId } from '../utils/geolocation';

function buildCampusBuildings(allBuildings) {
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
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function MapScreen({ initialShowSearch = false }) {
  const campuses = getCampuses();
  const [campusIndex, setCampusIndex] = useState(0); // 0 = SGW, 1 = LOYOLA
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [originBuildingId, setOriginBuildingId] = useState(null);
  const [destinationBuildingId, setDestinationBuildingId] = useState(null);
  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [originMode, setOriginMode] = useState('manual'); // 'manual' or 'current'
  const travelMode = 'walking';
  const [showSearch, setShowSearch] = useState(initialShowSearch);

  useEffect(() => {
    setShowSearch(initialShowSearch);
  }, [initialShowSearch]);

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

    for (const feature of allBuildings) {
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
    // Block only hard errors — denied / unavailable / error.
    if (locStatus === 'denied' || locStatus === 'unavailable' || locStatus === 'error') {
      return;
    }

    if (!coords) {
      return; // top banner will already show "Finding your location..."
    }

    // If inside a mapped building, use that building as origin.
    // Otherwise use raw GPS so the user can still get directions from their location.
    if (currentBuildingId) {
      const info = getBuildingInfo(currentBuildingId);
      setOriginBuildingId(currentBuildingId);
      setOriginQuery(info ? `${info.name} (${info.code})` : currentBuildingId);
    } else {
      setOriginBuildingId('__GPS__');
      setOriginQuery('My Location');
    }
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

  const allCampusBuildings = useMemo(
    () => buildCampusBuildings(allBuildings),
    [allBuildings],
  );

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

  const clearRoute = () => {
    clearOrigin();
    clearDestination();
  };

  // Resolve building IDs to lat/lng coords for the directions API.
  // If origin is raw GPS (__GPS__), use the current GPS coords directly.
  const originCoords = useMemo(() => {
    if (!originBuildingId) return null;
    if (originBuildingId === '__GPS__') return coords || null;
    return getBuildingCoords(originBuildingId);
  }, [originBuildingId, coords]);

  const destinationCoords = useMemo(
    () => (destinationBuildingId ? getBuildingCoords(destinationBuildingId) : null),
    [destinationBuildingId],
  );

  const {
    route: routeCoordinates,
    distanceText,
    durationText,
    loading: routeLoading,
    error: routeError,
  } = useDirections({
    originCoords,
    destinationCoords,
    travelMode,
    userCoords: coords || null,
  });

  const showDirectionsPanel = !!(originCoords && destinationCoords);

  // helper function to render the tab
  const renderTab = (c, i) => (
    <CampusTab
      key={c.id}
      campus={c}
      isActive={campusIndex === i}
      onPress={() => handleCampusChange(i)}
    />
  );

  const getLocationText = () => {
    if (currentBuildingInfo) return `You are in: ${currentBuildingInfo.name}`;
    if (coords) return 'You are not inside a mapped building.';
    return 'Finding your location...';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Campus Tabs */}
      <View style={styles.tabBar}>
        {campuses.map((c, i) => renderTab(c, i))}
      </View>

      <View style={styles.locationBanner}>
        {locStatus === 'watching' && (
          <Text style={styles.locationText}>
            {getLocationText()}
          </Text>
        )}

        {(locStatus === 'denied' || locStatus === 'unavailable' || locStatus === 'error') && (
          <Text style={styles.locationText}>
            {locMessage || 'Location cannot be determined.'}
          </Text>
        )}
      </View>

      {/* Origin / Destination search */}
      {showSearch && (
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
                <SuggestionItem
                  key={`origin-${building.id}`}
                  building={building}
                  onPress={() => handleSelectOriginFromSearch(building)}
                />
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
                <SuggestionItem
                  key={`destination-${building.id}`}
                  building={building}
                  onPress={() => handleSelectDestinationFromSearch(building)}
                />
              ))}
            </View>
          )}
        </View>
      )}

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
          routeCoordinates={routeCoordinates}
        />
      </View>

      {/* Directions Panel */}
      {showDirectionsPanel && (
        <DirectionsPanel
          distanceText={distanceText}
          durationText={durationText}
          loading={routeLoading}
          error={routeError}
          onClear={clearRoute}
        />
      )}

      {/* Building Info Popup */}
      <BuildingInfoPopup
        visible={popupVisible}
        buildingInfo={selectedBuildingInfo}
        onClose={handleClosePopup}
        onMoreDetails={handleMoreDetails}
      />

      {/* Search Toggle FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: '#8B1538' }]}
        onPress={() => setShowSearch(!showSearch)}
        accessibilityRole="button"
        accessibilityLabel="Toggle search route"
      >
        <Text style={styles.fabIcon}>🗺️</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

MapScreen.propTypes = {
  initialShowSearch: PropTypes.bool,
};

function SuggestionItem({ building, onPress }) {
  return (
    <TouchableOpacity style={styles.suggestionItem} onPress={onPress}>
      <Text style={styles.suggestionText}>
        {building.name} ({building.code})
      </Text>
    </TouchableOpacity>
  );
}

SuggestionItem.propTypes = {
  building: PropTypes.shape({
    id: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  onPress: PropTypes.func.isRequired,
};

function CampusTab({ campus, isActive, onPress }) {
  return (
    <TouchableOpacity
      testID={`campus-tab-${campus.label}`}
      style={[styles.tab, isActive && styles.tabActive]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={`Campus ${campus.label}`}
      accessibilityState={{ selected: isActive }}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
        {campus.label}
      </Text>
    </TouchableOpacity>
  );
}

CampusTab.propTypes = {
  campus: PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onPress: PropTypes.func.isRequired,
};

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
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
    zIndex: 999,
  },
  fabIcon: {
    fontSize: 24,
    color: '#fff',
  }
});
