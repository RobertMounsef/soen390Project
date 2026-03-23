import React, { useState, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MapView from '../components/MapView';
import BuildingInfoPopup from '../components/BuildingInfoPopup';
import IndoorMapViewer from '../components/IndoorMapViewer';
import DirectionsPanel from '../components/DirectionsPanel';
import SuggestionItem from '../components/SuggestionItem';
import CampusTab from '../components/CampusTab';
import { getCampuses } from '../services/api';
import { getBuildingsByCampus, getBuildingInfo, getBuildingCoords } from '../services/api/buildings';
import {
  getOutdoorPoisByCampus,
  getOutdoorPoiCoords,
  getOutdoorPoiInfo,
} from '../services/api/pois';
import { buildCampusBuildings } from '../utils/buildingHelpers';
import useUserLocation from '../hooks/useUserLocation';
import useDirections from '../hooks/useDirections';
import useShuttleDirections from '../hooks/useShuttleDirections';
import useUpcomingClassroom from '../hooks/useUpcomingClassroom';
import { pointInPolygonFeature, getBuildingId } from '../utils/geolocation';
import styles from './MapScreen.styles';

// Lazy-load calendar feature so expo-auth-session / expo-secure-store / expo-web-browser
// are not loaded at app startup (avoids "native module not found" in e2e).
// Use require() in the factory so Jest can resolve the module without dynamic import.
const CalendarConnectionFeature = lazy(() =>
  Promise.resolve(require('../components/CalendarConnectionFeature'))
);

export default function MapScreen({ initialShowSearch = false }) {
  const mapRef = useRef(null);
  const campuses = getCampuses();
  const [campusIndex, setCampusIndex] = useState(0); // 0 = SGW, 1 = LOYOLA
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [mapViewerVisible, setMapViewerVisible] = useState(false);
  const [mapViewerBuildingId, setMapViewerBuildingId] = useState(null);
  const [originBuildingId, setOriginBuildingId] = useState(null);
  const [destinationBuildingId, setDestinationBuildingId] = useState(null);
  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [originMode, setOriginMode] = useState('manual'); // 'manual' or 'current'
  const [travelMode, setTravelMode] = useState('walking');
  const [showSearch, setShowSearch] = useState(initialShowSearch);
  const [panelCollapsed, setPanelCollapsed] = useState(true);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [calendarAppliedEventId, setCalendarAppliedEventId] = useState(null);
  const [calendarAutoDestinationId, setCalendarAutoDestinationId] = useState(null);
  const [destinationPoiId, setDestinationPoiId] = useState(null);

  const campus = campuses[campusIndex];
  const buildings = getBuildingsByCampus(campus.id);
  const outdoorPois = useMemo(
    () => getOutdoorPoisByCampus(campus.id),
    [campus.id],
  );

  const allBuildings = useMemo(() => {
    const sgw = getBuildingsByCampus('SGW') || [];
    const loy = getBuildingsByCampus('LOY') || [];
    return [...sgw, ...loy];
  }, []);

  const { status: locStatus, coords, message: locMessage } = useUserLocation();
  // Read upcoming calendar events and try to detect the next classroom automatically.
  const upcomingClassroom = useUpcomingClassroom();
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

  // ─── Next Class: Go-to-class handler ─────────────────────────────────────
  const handleGoToClass = () => {
    if (!upcomingClassroom.buildingId) return;
    // Set origin to current location
    handleUseCurrentLocationAsOrigin();
    // Set destination to the class building
    setBuildingAsDestination(upcomingClassroom.buildingId);
    // Make sure the search/directions panel is open
    setShowSearch(true);
  };


  const handleCampusChange = (i) => {
    setCampusIndex(i);
    // Keep origin/destination selections so users can plan routes across campuses.
    // Only clear the currently open popup / tapped building.
    setSelectedBuildingId(null);
    setPopupVisible(false);
    setMapViewerVisible(false);
  };

  const handleCurrentLocationPress = () => {
    if (coords && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
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
    setDestinationPoiId(null);
    setDestinationBuildingId(buildingId);
    const info = getBuildingInfo(buildingId);
    setDestinationQuery(info ? `${info.name} (${info.code})` : buildingId);
  };

  const handleOutdoorPoiPress = (poiId) => {
    if (locStatus === 'denied' || locStatus === 'unavailable' || locStatus === 'error') {
      Alert.alert(
        'Location needed',
        'Turn on location access to get directions from where you are.',
      );
      return;
    }

    handleUseCurrentLocationAsOrigin();

    if (!coords) {
      Alert.alert(
        'Location',
        'Waiting for your current location. Try again in a moment.',
      );
    }

    setDestinationBuildingId(null);
    setCalendarAutoDestinationId(null);
    setDestinationPoiId(poiId);
    const poiInfo = getOutdoorPoiInfo(poiId);
    setDestinationQuery(poiInfo?.name || poiId);
    setShowSearch(true);
  };

  const handleBuildingPress = (buildingId) => {
    if (showSearch) {
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
    Keyboard.dismiss();
  };

  const handleSelectDestinationFromSearch = (building) => {
    setDestinationPoiId(null);
    setDestinationBuildingId(building.id);
    setDestinationQuery(`${building.name} (${building.code})`);
    Keyboard.dismiss();
  };

  // Auto-resolve origin: if the typed text is an exact match for a building's
  useEffect(() => {
    if (originBuildingId) return; 
    const q = originQuery.trim().toLowerCase();
    if (!q) return;
    const match = allCampusBuildings.find(
      (b) => `${b.name} (${b.code})`.toLowerCase() === q,
    );
    if (match) {
      setOriginMode('manual');
      setOriginBuildingId(match.id);
    }
  }, [originQuery, originBuildingId, allCampusBuildings]);

  // Same for destination (buildings only — POI destinations skip this resolver).
  useEffect(() => {
    if (destinationBuildingId || destinationPoiId) return;
    const q = destinationQuery.trim().toLowerCase();
    if (!q) return;
    const match = allCampusBuildings.find(
      (b) => `${b.name} (${b.code})`.toLowerCase() === q,
    );
    if (match) {
      setDestinationBuildingId(match.id);
    }
  }, [destinationQuery, destinationBuildingId, destinationPoiId, allCampusBuildings]);

  const clearOrigin = () => {
    setOriginMode('manual');
    setOriginBuildingId(null);
    setOriginQuery('');
  };

  const clearDestination = () => {
    setDestinationBuildingId(null);
    setDestinationPoiId(null);
    setDestinationQuery('');
    setCalendarAutoDestinationId(null);
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

  const destinationCoords = useMemo(() => {
    if (destinationPoiId) return getOutdoorPoiCoords(destinationPoiId);
    if (destinationBuildingId) return getBuildingCoords(destinationBuildingId);
    return null;
  }, [destinationPoiId, destinationBuildingId]);

  const originCampusId = originBuildingId && originBuildingId !== '__GPS__'
    ? getBuildingInfo(originBuildingId)?.campus
    : campus.id;

  const destinationCampusId = useMemo(() => {
    if (destinationPoiId) return getOutdoorPoiInfo(destinationPoiId)?.campus ?? null;
    if (destinationBuildingId) return getBuildingInfo(destinationBuildingId)?.campus ?? null;
    return null;
  }, [destinationPoiId, destinationBuildingId]);

  const showShuttle = Boolean(originCampusId && destinationCampusId && originCampusId !== destinationCampusId);

  useEffect(() => {
    if (!showShuttle && travelMode === 'shuttle') {
      setTravelMode('walking');
    }
  }, [showShuttle, travelMode]);

  const isShuttleMode = travelMode === 'shuttle';

  const stdDirections = useDirections({
    originCoords: isShuttleMode ? null : originCoords,
    destinationCoords: isShuttleMode ? null : destinationCoords,
    travelMode: isShuttleMode ? 'walking' : travelMode, // Avoid passing 'shuttle' mode to standard map api
    userCoords: coords || null,
  });

  const shuttleDirections = useShuttleDirections({
    originCoords,
    destinationCoords,
    originCampus: originCampusId,
    userCoords: coords || null,
    enabled: isShuttleMode,
  });

  const activeDirections = isShuttleMode ? shuttleDirections : stdDirections;

  const {
    route: routeCoordinates,
    steps,
    distanceText,
    durationText,
    loading: routeLoading,
    error: routeError,
  } = activeDirections;

  const showDirectionsPanel = !!(originCoords && destinationCoords);

  // Reset panel to collapsed whenever a new route is activated
  useEffect(() => {
    if (showDirectionsPanel) setPanelCollapsed(true);
  }, [showDirectionsPanel]);

  // Auto-fill the destination when the next classroom is found in the calendar.
  useEffect(() => {
    if (
      upcomingClassroom.status !== 'resolved'
      || !upcomingClassroom.event?.id
      || !upcomingClassroom.buildingId
    ) {
      return;
    }

    if (destinationPoiId) {
      return;
    }

    // Do not overwrite a destination the user already chose manually.
    if (
      destinationBuildingId
      && destinationBuildingId !== calendarAutoDestinationId
      && destinationBuildingId !== upcomingClassroom.buildingId
    ) {
      return;
    }

    // Avoid re-applying the same calendar event on every refresh.
    if (calendarAppliedEventId === upcomingClassroom.event.id) {
      return;
    }

    const info = getBuildingInfo(upcomingClassroom.buildingId);
    setDestinationBuildingId(upcomingClassroom.buildingId);
    setDestinationQuery(info ? `${info.name} (${info.code})` : upcomingClassroom.buildingId);
    setCalendarAutoDestinationId(upcomingClassroom.buildingId);
    setCalendarAppliedEventId(upcomingClassroom.event.id);
    setShowSearch(true);

    if (info?.campus) {
      const nextCampusIndex = campuses.findIndex((c) => c.id === info.campus);
      if (nextCampusIndex >= 0 && nextCampusIndex !== campusIndex) {
        setCampusIndex(nextCampusIndex);
      }
    }
  }, [
    upcomingClassroom.status,
    upcomingClassroom.event,
    upcomingClassroom.buildingId,
    destinationBuildingId,
    destinationPoiId,
    calendarAppliedEventId,
    calendarAutoDestinationId,
    campuses,
    campusIndex,
  ]);

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
      <StatusBar backgroundColor="black" />

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
                    setOriginBuildingId(null);
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
                  onChangeText={(text) => {
                    setDestinationQuery(text);
                    setDestinationBuildingId(null);
                    setDestinationPoiId(null);
                  }}
                  placeholder="Search destination building"
                  placeholderTextColor="#a0aec0"
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoCapitalize="characters"
                />
                {(destinationBuildingId || destinationPoiId) && (
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

      {/* Map — FABs live here so they can never overlap the panel below */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          center={campus.center}
          zoom={18}
          markers={campus.markers}
          buildings={buildings}
          outdoorPois={outdoorPois}
          onBuildingPress={handleBuildingPress}
          onOutdoorPoiPress={handleOutdoorPoiPress}
          highlightedBuildingId={currentBuildingId}
          originBuildingId={originBuildingId}
          destinationBuildingId={destinationBuildingId}
          destinationPoiId={destinationPoiId}
          routeCoordinates={routeCoordinates}
        />

        {/* FABs inside the map container — absolute relative to map only */}
        <View style={styles.fabContainer}>
          {/* Search / Directions FAB */}
          <TouchableOpacity
            style={styles.fab}
            testID="Toggle search route"
            onPress={() => setShowSearch((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Toggle search route"
          >
            <Text style={styles.fabIcon}>🗺️</Text>
          </TouchableOpacity>

          {/* Calendar connection FAB */}
          <TouchableOpacity
            style={styles.fab}
            testID="Open calendar connection"
            onPress={() => setCalendarModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Connect Google Calendar"
          >
            <Text style={styles.fabIcon}>📅</Text>
          </TouchableOpacity>

          {/* Current Location button */}
          <TouchableOpacity
            style={styles.locationFab}
            testID="Current Location"
            onPress={handleCurrentLocationPress}
            accessibilityRole="button"
            accessibilityLabel="Go to current location"
          >
            <Text style={styles.locationFabIcon}>📍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Directions Panel */}
      {showDirectionsPanel && (
        <DirectionsPanel
          distanceText={distanceText || ''}
          durationText={durationText || ''}
          loading={routeLoading}
          error={routeError}
          onClear={clearRoute}
          travelMode={travelMode}
          onModeChange={setTravelMode}
          steps={steps}
          showShuttle={showShuttle}
          nextDeparture={shuttleDirections.nextDeparture}
          collapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed((prev) => !prev)}
        />
      )}

      {/* Building Info Popup */}
      <BuildingInfoPopup
        visible={popupVisible}
        buildingInfo={selectedBuildingInfo}
        onClose={handleClosePopup}
        onMoreDetails={handleMoreDetails}
        onViewFloorPlans={() => {
          setMapViewerBuildingId(selectedBuildingId);
          handleClosePopup();
          setMapViewerVisible(true);
        }}
      />

      {/* Indoor Map Viewer overlay */}
      <IndoorMapViewer 
        visible={mapViewerVisible}
        onClose={() => setMapViewerVisible(false)}
        initialBuildingId={mapViewerBuildingId}
      />

      {/* Google Calendar connection modal — lazy-loaded so native modules aren't required at startup */}
      {calendarModalVisible && (
        <Suspense fallback={null}>
          <CalendarConnectionFeature
            visible={calendarModalVisible}
            onClose={() => setCalendarModalVisible(false)}
            nextClass={upcomingClassroom}
            onGetDirections={handleGoToClass}
            onRetry={() => {
              setCalendarAppliedEventId(null);
              upcomingClassroom.refresh();
            }}
          />
        </Suspense>
      )}
    </SafeAreaView>
  );
}

MapScreen.propTypes = {
  initialShowSearch: PropTypes.bool,
};
