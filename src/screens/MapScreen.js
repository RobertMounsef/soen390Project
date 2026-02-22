// src/screens/MapScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Keyboard,
} from 'react-native';
import PropTypes from 'prop-types';
import { SafeAreaView } from 'react-native-safe-area-context';

import MapView from '../components/MapView';
import BuildingInfoPopup from '../components/BuildingInfoPopup';
import { getCampuses } from '../services/api';
import { getBuildingsByCampus, getBuildingInfo } from '../services/api/buildings';
import useUserLocation from '../hooks/useUserLocation';
import { pointInPolygonFeature, getBuildingId } from '../utils/geolocation';
import { getFeatureCenter } from '../utils/geometry';

const BuildingSuggestionPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  code: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
});

function SuggestionsBox({ prefix, suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <View style={styles.suggestionsBox}>
      {suggestions.map((building) => (
        <TouchableOpacity
          key={`${prefix}-${building.id}`}
          testID={`suggestion-${building.code || building.id}`}
          style={styles.suggestionItem}
          onPress={() => onSelect(building)}
        >
          <Text style={styles.suggestionText}>
            {building.name} ({building.code})
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

SuggestionsBox.propTypes = {
  prefix: PropTypes.string.isRequired,
  suggestions: PropTypes.arrayOf(BuildingSuggestionPropType), // ✅ not required (because defaultProps exists)
  onSelect: PropTypes.func.isRequired,
};

SuggestionsBox.defaultProps = {
  suggestions: [],
};

export default function MapScreen({ onGoToRoutes }) {
  const mapRef = useRef(null);
/** @type {Array<{id: string, label: string, center: {latitude: number, longitude: number}, markers?: any[]}>} */
const campuses = getCampuses();

  const [campusIndex, setCampusIndex] = useState(0); // 0 = SGW, 1 = LOYOLA
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  const [originBuildingId, setOriginBuildingId] = useState(null);
  const [destinationBuildingId, setDestinationBuildingId] = useState(null);

  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');

  const [originMode, setOriginMode] = useState('manual'); // 'manual' | 'current'
  const [directionsVisible, setDirectionsVisible] = useState(false);

  const campus = campuses?.[campusIndex] ?? campuses?.[0];
const buildings = getBuildingsByCampus(campus?.id) || [];

  // Features from BOTH campuses (needed for cross-campus routing)
  const allCampusFeatures = useMemo(() => {
    const sgw = getBuildingsByCampus('SGW') || [];
    const loy = getBuildingsByCampus('LOY') || [];
    return [...sgw, ...loy];
  }, []);

  // Build a flat list of buildings across campuses for search suggestions
  const allCampusBuildings = useMemo(() => {
    const byId = new Map();

    const sgwBuildings = getBuildingsByCampus('SGW') || [];
    const loyBuildings = getBuildingsByCampus('LOY') || [];
    const allBuildings = [...sgwBuildings, ...loyBuildings];

    if (!Array.isArray(allBuildings)) return [];

    for (const feature of allBuildings) {
      const props = feature?.properties || {};
      const id = props.id;
      if (!id || byId.has(id)) continue;

      const info = getBuildingInfo(id);

      byId.set(String(id), {
        id: String(id),
        code: String(props.code || info?.code || id),
        name: String(props.name || info?.name || id),
      });
    }

    return Array.from(byId.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, []);

  const { status: locStatus, coords, message: locMessage } = useUserLocation();
  const [lastCoords, setLastCoords] = useState(null);

  // keep last known coords for stability
  useEffect(() => {
    if (locStatus === 'watching' && coords?.latitude != null && coords?.longitude != null) {
      setLastCoords(coords);
    }
  }, [locStatus, coords]);

  const effectiveCoords = coords || lastCoords;

  const currentBuildingId = useMemo(() => {
    if (!effectiveCoords || !Array.isArray(allCampusFeatures) || allCampusFeatures.length === 0) return null;

    const point = { latitude: effectiveCoords.latitude, longitude: effectiveCoords.longitude };

    for (const feature of allCampusFeatures) {
      const geomType = feature?.geometry?.type;
      if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') continue;

      if (pointInPolygonFeature(point, feature)) {
        return getBuildingId(feature);
      }
    }
    return null;
  }, [effectiveCoords, allCampusFeatures]);

  const currentBuildingInfo = useMemo(() => {
    return currentBuildingId ? getBuildingInfo(currentBuildingId) : null;
  }, [currentBuildingId]);

  const locationBannerText = useMemo(() => {
    if (locStatus === 'watching') {
      if (currentBuildingInfo) return `You are in: ${currentBuildingInfo.name}`;
      if (effectiveCoords) return 'You are not inside a mapped building.';
      return 'Finding your location...';
    }

    if (locStatus === 'denied' || locStatus === 'unavailable' || locStatus === 'error') {
      return locMessage || 'Location cannot be determined.';
    }

    return '';
  }, [locStatus, currentBuildingInfo, effectiveCoords, locMessage]);

  // If origin is set to follow current building, keep it updated when user moves
  useEffect(() => {
    if (originMode !== 'current') return;
    if (locStatus !== 'watching') return;
    if (!currentBuildingId) return;

    if (originBuildingId !== currentBuildingId) {
      setOriginBuildingId(currentBuildingId);
      const info = getBuildingInfo(currentBuildingId);
      setOriginQuery(info ? `${info.name} (${info.code})` : currentBuildingId);
    }
  }, [originMode, locStatus, currentBuildingId, originBuildingId]);

  const selectedBuildingInfo = selectedBuildingId ? getBuildingInfo(selectedBuildingId) : null;

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
    [originQuery, allCampusBuildings]
  );

  const destinationSuggestions = useMemo(
    () => filterBuildings(destinationQuery).slice(0, 6),
    [destinationQuery, allCampusBuildings]
  );

  const handleClosePopup = () => {
    setPopupVisible(false);
    setSelectedBuildingId(null);
  };

  const handleMoreDetails = () => handleClosePopup();

  const handleCampusChange = (i) => {
    setCampusIndex(i);
    setSelectedBuildingId(null);
    setPopupVisible(false);
    setDirectionsVisible(false);
  };

  const setBuildingAsDestination = (buildingId) => {
    setDestinationBuildingId(buildingId);
    const info = getBuildingInfo(buildingId);
    setDestinationQuery(info ? `${info.name} (${info.code})` : buildingId);
  };

  const handleBuildingPress = (buildingId) => {
    if (!originBuildingId) {
      setOriginMode('manual');
      setOriginBuildingId(buildingId);
      const info = getBuildingInfo(buildingId);
      setOriginQuery(info ? `${info.name} (${info.code})` : buildingId);
    } else if (buildingId !== originBuildingId) {
      setBuildingAsDestination(buildingId);
    }

    setSelectedBuildingId(buildingId);
    setPopupVisible(true);
  };

  const handleSelectOriginFromSearch = (building) => {
    setOriginMode('manual');
    setOriginBuildingId(building.id);
    setOriginQuery(`${building.name} (${building.code})`);
    Keyboard.dismiss();
  };

  const handleSelectDestinationFromSearch = (building) => {
    setDestinationBuildingId(building.id);
    setDestinationQuery(`${building.name} (${building.code})`);
    Keyboard.dismiss();
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
    setOriginMode('manual');
    setOriginBuildingId(null);
    setDestinationBuildingId(null);
    setOriginQuery('');
    setDestinationQuery('');
  };

  const handleUseCurrentLocationAsOrigin = () => {
    setOriginMode('current');
    if (!effectiveCoords) return;
    if (!currentBuildingId) return;

    setOriginBuildingId(currentBuildingId);
    const info = getBuildingInfo(currentBuildingId);
    setOriginQuery(info ? `${info.name} (${info.code})` : currentBuildingId);
  };

  const handleCurrentLocationPress = () => {
    if (!coords || !mapRef.current?.animateToRegion) return;
    mapRef.current.animateToRegion(
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      900
    );
  };

  const handleGoToRoutes = () => {
    if (!originBuildingId || !destinationBuildingId) return;

    const originInfo = getBuildingInfo(originBuildingId);
    const destinationInfo = getBuildingInfo(destinationBuildingId);

    const originFeature = allCampusFeatures.find((f) => getBuildingId(f) === originBuildingId);
    const destFeature = allCampusFeatures.find((f) => getBuildingId(f) === destinationBuildingId);

    const startCoord = getFeatureCenter(originFeature);
    const endCoord = getFeatureCenter(destFeature);

    const safeStart = startCoord || (coords ? { latitude: coords.latitude, longitude: coords.longitude } : null);

    if (!safeStart || !endCoord) {
      // eslint-disable-next-line no-console
      console.log('Missing coordinates for routing', { safeStart, endCoord });
      return;
    }

    if (typeof onGoToRoutes !== 'function') {
      // eslint-disable-next-line no-console
      console.log('onGoToRoutes missing: parent must pass it');
      return;
    }

    onGoToRoutes({
      start: {
        ...safeStart,
        label: originInfo ? `${originInfo.name} (${originInfo.code})` : originBuildingId,
      },
      end: {
        ...endCoord,
        label: destinationInfo ? `${destinationInfo.name} (${destinationInfo.code})` : destinationBuildingId,
      },
      destinationName: destinationInfo?.name,
    });
  };
 
  const renderTab = (c, i) => {
  const campus = c;
  const isActive = campusIndex === i;

  return (
    <TouchableOpacity
      key={campus.id}
      testID={`campus-tab-${campus.label}`}
      style={[styles.tab, isActive && styles.tabActive]}
      onPress={() => handleCampusChange(i)}
    >
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
        {campus.label}
      </Text>
    </TouchableOpacity>
  );
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Tabs */}
      <View style={styles.tabBar}>{campuses.map((c, i) => renderTab(c, i))}</View>

      {!!locationBannerText && (
        <View style={styles.locationBanner}>
          <Text style={styles.locationText}>{locationBannerText}</Text>
        </View>
      )}

      {/* Directions bubble */}
      {directionsVisible && (
        <View style={styles.searchContainer}>
          <View style={styles.directionsHeader}>
            <Text style={styles.directionsTitle}>Directions</Text>

            <TouchableOpacity
              testID="Clear route"
              accessibilityRole="button"
              accessibilityLabel="Clear route"
              onPress={clearRoute}
            >
              <Text style={styles.clearRouteText}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setDirectionsVisible(false);
                clearRoute();
              }}
              accessibilityLabel="Close directions"
            >
              <Text style={styles.closeDirections}>×</Text>
            </TouchableOpacity>
          </View>

          {/* From */}
          <View style={styles.searchRow}>
            <View style={styles.searchLabelContainer}>
              <Text style={styles.searchLabel}>From</Text>
            </View>

            <View style={styles.searchInputWrapper}>
              <View style={styles.searchInputRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Use current location as starting point"
                  onPress={handleUseCurrentLocationAsOrigin}
                >
                  <Text style={styles.locationPin}>📍</Text>
                </TouchableOpacity>

                <TextInput
                  value={originQuery}
                  onChangeText={(t) => {
                    setOriginMode('manual');
                    setOriginQuery(t);
                  }}
                  placeholder="Search origin building"
                  placeholderTextColor="#a0aec0"
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoCapitalize="characters"
                />

                {originBuildingId && (
                  <TouchableOpacity onPress={clearOrigin} accessibilityLabel="Clear origin">
                    <Text style={styles.clearIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <SuggestionsBox prefix="origin" suggestions={originSuggestions} onSelect={handleSelectOriginFromSearch} />

          {/* To */}
          <View style={styles.searchRow}>
            <View style={styles.searchLabelContainer}>
              <Text style={styles.searchLabel}>To</Text>
            </View>

            <View style={styles.searchInputWrapper}>
              <View style={styles.searchInputRow}>
                <TextInput
                  value={destinationQuery}
                  onChangeText={(t) => {
                    setDestinationQuery(t);
                    setDestinationBuildingId(null);
                  }}
                  placeholder="Search destination building"
                  placeholderTextColor="#a0aec0"
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoCapitalize="characters"
                />

                {destinationBuildingId && (
                  <TouchableOpacity onPress={clearDestination} accessibilityLabel="Clear destination">
                    <Text style={styles.clearIcon}>✕</Text>
                  </TouchableOpacity>
                )}

                {destinationBuildingId && (
                  <TouchableOpacity onPress={handleGoToRoutes} accessibilityLabel="Go to routes">
                    <Text style={styles.goArrow}>→</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <SuggestionsBox
            prefix="destination"
            suggestions={destinationSuggestions}
            onSelect={handleSelectDestinationFromSearch}
          />

          <TouchableOpacity
            style={styles.currentLocBtn}
            onPress={handleCurrentLocationPress}
            testID="Current Location"
            accessibilityRole="button"
            accessibilityLabel="Go to current location"
          >
            <Text style={styles.currentLocBtnText}>📍 Center on me</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          center={campus?.center}
          zoom={18}
          markers={campus?.markers || []}
          buildings={buildings}
          onBuildingPress={handleBuildingPress}
          highlightedBuildingId={currentBuildingId}
          originBuildingId={originBuildingId}
          destinationBuildingId={destinationBuildingId}
        />
      </View>

      {/* Popup */}
      <BuildingInfoPopup
        visible={popupVisible}
        buildingInfo={selectedBuildingInfo}
        onClose={handleClosePopup}
        onMoreDetails={handleMoreDetails}
        onMapPress={() => {
          if (!selectedBuildingId) return;
          setOriginMode('manual');
          setOriginBuildingId(selectedBuildingId);
          const info = getBuildingInfo(selectedBuildingId);
          setOriginQuery(info ? `${info.name} (${info.code})` : selectedBuildingId);
          setDestinationBuildingId(null);
          setDestinationQuery('');
          setPopupVisible(false);
        }}
      />

      {/* Toggle FAB */}
      <TouchableOpacity
        style={styles.fab}
        testID="Toggle search route"
        onPress={() => setDirectionsVisible((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel="Toggle directions bubble"
      >
        <Text style={styles.fabIcon}>🗺️</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

MapScreen.propTypes = {
  onGoToRoutes: PropTypes.func,
};

MapScreen.defaultProps = {
  onGoToRoutes: undefined,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc', position: 'relative' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    zIndex: 30,
    elevation: 30,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#edf2f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e0' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#4a5568' },
  tabTextActive: { color: '#1a202c' },

  locationBanner: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    zIndex: 20,
    elevation: 20,
  },
  locationText: { color: '#2d3748', fontSize: 13 },

  searchContainer: {
    position: 'absolute',
    top: 92,
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    zIndex: 40,
    elevation: 40,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  directionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  directionsTitle: { fontSize: 16, fontWeight: '700', color: '#1a202c', flex: 1 },
  clearRouteText: { color: '#e53e3e', fontWeight: '700', fontSize: 14 },
  closeDirections: { fontSize: 22, color: '#4a5568', fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2 },

  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  searchLabelContainer: { width: 52 },
  searchLabel: { fontSize: 13, fontWeight: '700', color: '#2d3748' },

  searchInputWrapper: { flex: 1 },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    height: 42,
    gap: 8,
  },
  locationPin: { fontSize: 16 },
  searchInput: { flex: 1, color: '#1a202c', fontSize: 14, paddingVertical: 0 },
  clearIcon: { fontSize: 16, color: '#718096', paddingHorizontal: 4 },
  goArrow: { fontSize: 18, color: '#e53e3e', fontWeight: '800', paddingHorizontal: 4 },

  suggestionsBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#edf2f7',
  },
  suggestionText: { fontSize: 13, color: '#2d3748' },

  currentLocBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  currentLocBtnText: { fontSize: 12, fontWeight: '700', color: '#2d3748' },

  mapContainer: { flex: 1 },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    elevation: 50,
  },
  fabIcon: { fontSize: 22 },
});
