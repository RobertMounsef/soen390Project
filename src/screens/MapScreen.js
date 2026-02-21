import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Keyboard,
} from 'react-native';

import MapView from '../components/MapView';
import BuildingInfoPopup from '../components/BuildingInfoPopup';
import { getCampuses } from '../services/api';
import { getBuildingsByCampus, getBuildingInfo } from '../services/api/buildings';
import useUserLocation from '../hooks/useUserLocation';
import { pointInPolygonFeature, getBuildingId } from '../utils/geolocation';
import { getFeatureCenter } from '../utils/geometry';
import PropTypes from 'prop-types';


export default function MapScreen({ onGoToRoutes }) {
  const campuses = getCampuses();
  const [campusIndex, setCampusIndex] = useState(0); // 0 = SGW, 1 = LOYOLA
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);

  const [originBuildingId, setOriginBuildingId] = useState(null);
  const [destinationBuildingId, setDestinationBuildingId] = useState(null);
  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');

  // Tracks whether origin is manual selection or follows user's current building
  // (doesn't break your logic; only enables the 📍 behavior & auto-update for tests)
  const [originMode, setOriginMode] = useState('manual'); // 'manual' | 'current'

  // Controls whether the From/To directions bubble is visible
  const [directionsVisible, setDirectionsVisible] = useState(false);

  const campus = campuses[campusIndex];
  const buildings = getBuildingsByCampus(campus.id);

  // Features from BOTH campuses (needed for cross-campus routing)
  const allCampusFeatures = useMemo(() => {
    const sgw = getBuildingsByCampus('SGW') || [];
    const loy = getBuildingsByCampus('LOY') || [];
    return [...sgw, ...loy];
  }, []);

  const { status: locStatus, coords, message: locMessage } = useUserLocation();
  // ✅ Keep last known coords (fixes tests using mockReturnValueOnce + rerender)
  const [lastCoords, setLastCoords] = useState(null);

  useEffect(() => {
    if (locStatus === 'watching' && coords?.latitude != null && coords?.longitude != null) {
      setLastCoords(coords);
    }
  }, [locStatus, coords]);

  const effectiveCoords = coords || lastCoords;
  const selectedBuildingInfo = selectedBuildingId ? getBuildingInfo(selectedBuildingId) : null;


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

  // If origin is set to follow current building, keep it updated when user moves
  useEffect(() => {
    if (originMode !== 'current') return;
    if (locStatus !== 'watching') return;

    // If we can't determine a mapped building, do not override origin
    if (!currentBuildingId) return;

    // Update origin if changed
    if (originBuildingId !== currentBuildingId) {
      setOriginBuildingId(currentBuildingId);
      const info = getBuildingInfo(currentBuildingId);
      setOriginQuery(info ? `${info.name} (${info.code})` : currentBuildingId);
    }
  }, [originMode, locStatus, currentBuildingId, originBuildingId]);

  const handleMoreDetails = () => {
    handleClosePopup();
  };

  const handleCampusChange = (i) => {
    setCampusIndex(i);
    setSelectedBuildingId(null);
    setPopupVisible(false);

    // optional: keep open bubble or close it.
    // If you want to keep it open across campus changes, comment next line out.
    setDirectionsVisible(false);
  };

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
    const sgwBuildings = getBuildingsByCampus('SGW') || [];
    const loyBuildings = getBuildingsByCampus('LOY') || [];
    const allBuildings = [...sgwBuildings, ...loyBuildings];

    if (!Array.isArray(allBuildings)) return [];

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
  }, []);

  const filterBuildings = (query) => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    return allCampusBuildings.filter((b) => {
      const name = (b.name || '').toLowerCase();
      const code = (b.code || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  };

  const originSuggestions = useMemo(() => filterBuildings(originQuery).slice(0, 6), [
    originQuery,
    allCampusBuildings,
  ]);

  const destinationSuggestions = useMemo(() => filterBuildings(destinationQuery).slice(0, 6), [
    destinationQuery,
    allCampusBuildings,
  ]);

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
    // Keep app behavior safe: only set origin when location is available AND user is inside a mapped building
    setOriginMode('current');


    if (!effectiveCoords) return;
    if (!currentBuildingId) return;

    setOriginBuildingId(currentBuildingId);
    const info = getBuildingInfo(currentBuildingId);
    setOriginQuery(info ? `${info.name} (${info.code})` : currentBuildingId);
  };

  const handleGoToRoutes = () => {
    if (!originBuildingId || !destinationBuildingId) return;

    const originInfo = getBuildingInfo(originBuildingId);
    const destinationInfo = getBuildingInfo(destinationBuildingId);

    // Find GeoJSON features for both buildings (works across campuses)
    const originFeature = allCampusFeatures.find((f) => getBuildingId(f) === originBuildingId);
    const destFeature = allCampusFeatures.find((f) => getBuildingId(f) === destinationBuildingId);

    // Compute approximate center coordinates
    const startCoord = getFeatureCenter(originFeature);
    const endCoord = getFeatureCenter(destFeature);

    // Safety fallback: if we can't compute the building center,
    // use user GPS coords for start (if available)
    const safeStart =
        startCoord || (coords ? { latitude: coords.latitude, longitude: coords.longitude } : null);

    if (!safeStart || !endCoord) {
      console.log('Missing coordinates for routing', { safeStart, endCoord });
      return;
    }

    if (typeof onGoToRoutes !== 'function') {
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
          <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{c.label}</Text>
        </TouchableOpacity>
    );
  };

  return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Campus Tabs */}
        <View style={styles.tabBar}>{campuses.map(renderTab)}</View>

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
              <Text style={styles.locationText}>{locMessage || 'Location cannot be determined.'}</Text>
          )}
        </View>

        {directionsVisible && (
            <View style={styles.searchContainer}>
              {/* Header */}
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
                  {/* IMPORTANT: not ✕ to avoid test ambiguity */}
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
                    {/* ✅ Required by tests (US-2.2) */}
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

              {/* To */}
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

                    {/* Clear destination */}
                    {destinationBuildingId && (
                        <TouchableOpacity onPress={clearDestination} accessibilityLabel="Clear destination">
                          <Text style={styles.clearIcon}>✕</Text>
                        </TouchableOpacity>
                    )}

                    {/* GO to routes */}
                    {destinationBuildingId && (
                        <TouchableOpacity onPress={handleGoToRoutes} accessibilityLabel="Go to routes">
                          <Text style={styles.goArrow}>→</Text>
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
          />
        </View>

        {/* Building Info Popup */}
        <BuildingInfoPopup
            visible={popupVisible}
            buildingInfo={selectedBuildingInfo}
            onClose={handleClosePopup}
            onMoreDetails={handleMoreDetails}
            onMapPress={() => {
              if (!selectedBuildingId) return;

              // Set FROM by default = selected building
              setOriginMode('manual');
              setOriginBuildingId(selectedBuildingId);
              const info = getBuildingInfo(selectedBuildingId);
              setOriginQuery(info ? `${info.name} (${info.code})` : selectedBuildingId);

              // Reset destination
              setDestinationBuildingId(null);
              setDestinationQuery('');

              setPopupVisible(false);
            }}
        />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
    position: 'relative',
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

  directionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  directionsTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#2d3748',
  },
  closeDirections: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b7280',
    marginLeft: 12,
  },

  clearRouteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    marginRight: 8,
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

  locationPin: {
    fontSize: 18,
    marginRight: 8,
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

  goArrow: {
    fontSize: 18,
    color: '#8B1538',
    marginLeft: 8,
    fontWeight: '700',
  },

  mapContainer: {
    flex: 1,
    minHeight: 0,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 40,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B1538',
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
  },
});
MapScreen.propTypes = {
  onGoToRoutes: PropTypes.func,
};
