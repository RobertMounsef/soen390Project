import React, { useState, useMemo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import MapView from '../components/MapView';
import BuildingInfoPopup from '../components/BuildingInfoPopup';
import DirectionsPanel from '../components/DirectionsPanel';
import SuggestionItem from '../components/SuggestionItem';
import CampusTab from '../components/CampusTab';
import CalendarConnectionModal from '../components/CalendarConnectionModal';
import { getCampuses } from '../services/api';
import { getBuildingsByCampus, getBuildingInfo, getBuildingCoords } from '../services/api/buildings';
import { buildCampusBuildings } from '../utils/buildingHelpers';
import useUserLocation from '../hooks/useUserLocation';
import useDirections from '../hooks/useDirections';
import useShuttleDirections from '../hooks/useShuttleDirections';
import useCalendarAuth from '../hooks/useCalendarAuth';
import { pointInPolygonFeature, getBuildingId } from '../utils/geolocation';
import styles from './MapScreen.styles';

export default function MapScreen({ initialShowSearch = false }) {
  const mapRef = useRef(null);
  const campuses = getCampuses();
  const [campusIndex, setCampusIndex] = useState(0); // 0 = SGW, 1 = LOYOLA
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [originBuildingId, setOriginBuildingId] = useState(null);
  const [destinationBuildingId, setDestinationBuildingId] = useState(null);
  const [originQuery, setOriginQuery] = useState('');
  const [destinationQuery, setDestinationQuery] = useState('');
  const [originMode, setOriginMode] = useState('manual'); // 'manual' or 'current'
  const [travelMode, setTravelMode] = useState('walking');
  const [showSearch, setShowSearch] = useState(initialShowSearch);
  const [panelCollapsed, setPanelCollapsed] = useState(true);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  const calendarAuth = useCalendarAuth();
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
    setSelectedBuildingId(building.id);
    setPopupVisible(true);
    Keyboard.dismiss();
  };

  const handleSelectDestinationFromSearch = (building) => {
    setDestinationBuildingId(building.id);
    setDestinationQuery(`${building.name} (${building.code})`);
    setSelectedBuildingId(building.id);
    setPopupVisible(true);
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

  const originCampusId = originBuildingId && originBuildingId !== '__GPS__'
    ? getBuildingInfo(originBuildingId)?.campus
    : campus.id;

  const destinationCampusId = destinationBuildingId
    ? getBuildingInfo(destinationBuildingId)?.campus
    : null;

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

      {/* Map — FABs live here so they can never overlap the panel below */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
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
      />

      {/* Google Calendar connection modal */}
      <CalendarConnectionModal
        visible={calendarModalVisible}
        onClose={() => setCalendarModalVisible(false)}
        status={calendarAuth.status}
        isConnected={calendarAuth.isConnected}
        errorMessage={calendarAuth.errorMessage}
        onConnect={calendarAuth.connect}
        onDisconnect={calendarAuth.disconnect}
        isReady={calendarAuth.isReady}
      />
    </SafeAreaView>
  );
}

MapScreen.propTypes = {
  initialShowSearch: PropTypes.bool,
};
