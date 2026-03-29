import React, { useState, useMemo, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Keyboard,
  Alert,
  Image,
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
import * as calendarClassDirections from '../services/routing/calendarClassDirections';
import { BUILDING_IMAGE_URLS } from '../data/buildingImageUrls';
import styles from './MapScreen.styles';

export function resolveRouteIndoorSnapshot(indoorDirectionsForMap, calendarOutdoorIndoorMerge) {
  if ((indoorDirectionsForMap?.steps?.length ?? 0) > 0) {
    return indoorDirectionsForMap;
  }
  if ((calendarOutdoorIndoorMerge?.steps?.length ?? 0) > 0) {
    return calendarOutdoorIndoorMerge;
  }
  return null;
}

function hasRouteSnapshotSteps(snapshot) {
  return (snapshot?.steps?.length ?? 0) > 0;
}

function findBuildingIdContainingPoint(point, buildingFeatures) {
  for (const feature of buildingFeatures) {
    const geomType = feature?.geometry?.type;
    if (geomType !== 'Polygon' && geomType !== 'MultiPolygon') continue;
    if (pointInPolygonFeature(point, feature)) {
      return getBuildingId(feature);
    }
  }
  return null;
}

export function computeCalendarMergeUpdate({
  isShuttleMode,
  calendarClassRouteSession,
  destinationBuildingId,
  stdLoading,
  stdError,
  stdSteps,
  stdDistanceText,
  stdRouteMeta,
  mergeKeyRefValue,
}) {
  if (isShuttleMode || !calendarClassRouteSession?.destinationRoomNodeId) {
    return { resetKey: true, merge: null };
  }
  if (destinationBuildingId !== calendarClassRouteSession.buildingId) {
    return { resetKey: false, merge: null };
  }
  if (stdLoading || stdError || !stdSteps?.length) {
    return { skip: true };
  }
  const merged = calendarClassDirections.mergeCalendarOutdoorWithIndoorLeg({
    destBuildingId: calendarClassRouteSession.buildingId,
    destRoomNodeId: calendarClassRouteSession.destinationRoomNodeId,
    availableOptions: calendarClassDirections.buildAvailableOptionsFromWaypoints(),
    outdoorSteps: stdSteps,
    outdoorDistanceMeters: stdRouteMeta?.distanceMeters ?? null,
    outdoorDurationSeconds: stdRouteMeta?.durationSeconds ?? null,
  });
  if (!merged) {
    return { resetKey: false, merge: null };
  }
  const key = `${calendarClassRouteSession.eventId}|${stdSteps.length}|${stdDistanceText}|${stdRouteMeta?.distanceMeters ?? ''}`;
  if (mergeKeyRefValue === key) {
    return { skip: true };
  }
  return { resetKey: false, merge: merged, key };
}

/** When search/route UI is open: first tap sets origin, then destination / retarget destination. */
function applyRouteSelectionFromMapTap({
  showSearch,
  originBuildingId,
  destinationBuildingId,
  buildingId,
  setOriginMode,
  setOriginBuildingId,
  setOriginQuery,
  setBuildingAsDestination,
}) {
  if (!showSearch) return;
  if (!originBuildingId) {
    setOriginMode('manual');
    setOriginBuildingId(buildingId);
    const info = getBuildingInfo(buildingId);
    setOriginQuery(info ? `${info.name} (${info.code})` : buildingId);
    return;
  }
  if (buildingId === originBuildingId) return;
  if (!destinationBuildingId) {
    setBuildingAsDestination(buildingId);
    return;
  }
  setBuildingAsDestination(buildingId);
}

function getCalendarClassDestinationPatch(
  upcomingClassroom,
  destinationPoiId,
  destinationBuildingId,
  calendarAutoDestinationId,
  calendarAppliedEventId,
) {
  const uc = upcomingClassroom;
  if (uc.status !== 'resolved' || !uc.event?.id || !uc.buildingId) return null;
  if (destinationPoiId) return null;
  if (
    destinationBuildingId
    && destinationBuildingId !== calendarAutoDestinationId
    && destinationBuildingId !== uc.buildingId
  ) {
    return null;
  }
  if (calendarAppliedEventId === uc.event.id) return null;
  return { buildingId: uc.buildingId, eventId: uc.event.id };
}

function nextCampusIndexIfNeeded(info, campuses, campusIndex) {
  if (!info?.campus) return null;
  const idx = campuses.findIndex((c) => c.id === info.campus);
  if (idx < 0 || idx === campusIndex) return null;
  return idx;
}

function getLocationBannerText(currentBuildingInfo, coords) {
  if (currentBuildingInfo) return `You are in: ${currentBuildingInfo.name}`;
  if (coords) return 'You are not inside a mapped building.';
  return 'Finding your location...';
}

// Lazy-load calendar feature so expo-auth-session / expo-secure-store / expo-web-browser
// are not loaded at app startup (avoids "native module not found" in e2e).
// Use require() in the factory so Jest can resolve the module without dynamic import.
const CalendarConnectionFeature = lazy(() =>
  Promise.resolve(require('../components/CalendarConnectionFeature'))
);

/** Map / search / directions orchestration; branching is pushed into helpers in this module. */
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
  const [isSimulatingLocation, setIsSimulatingLocation] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupBuildingId, setLookupBuildingId] = useState(null);
  const [isFromLookup, setIsFromLookup] = useState(false);
  const [destinationPoiId, setDestinationPoiId] = useState(null);
  /** Indoor / hybrid turn-by-turn from IndoorMapViewer — kept when the modal closes so the map directions panel still matches. */
  const [indoorDirectionsForMap, setIndoorDirectionsForMap] = useState(null);
  const [mapViewerOriginRoomId, setMapViewerOriginRoomId] = useState(null);
  const [mapViewerDestinationRoomId, setMapViewerDestinationRoomId] = useState(null);
  const [mapViewerInitialFloor, setMapViewerInitialFloor] = useState(null);
  /** Set when user taps "Get directions" on a calendar class — drives outdoor + indoor merge. */
  const [calendarClassRouteSession, setCalendarClassRouteSession] = useState(null);
  const [calendarOutdoorIndoorMerge, setCalendarOutdoorIndoorMerge] = useState(null);
  const calendarMergeKeyRef = useRef('');

  const routeIndoorSnapshot = useMemo(
    () => resolveRouteIndoorSnapshot(indoorDirectionsForMap, calendarOutdoorIndoorMerge),
    [indoorDirectionsForMap, calendarOutdoorIndoorMerge],
  );

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
    const point = isSimulatingLocation
      ? { latitude: 45.497092, longitude: -73.5788 }
      : { latitude: coords.latitude, longitude: coords.longitude };
    return findBuildingIdContainingPoint(point, allBuildings);
  }, [coords, allBuildings, isSimulatingLocation]);

  const currentBuildingInfo = useMemo(() => {
    return currentBuildingId ? getBuildingInfo(currentBuildingId) : null;
  }, [currentBuildingId]);


  const handleMoreDetails = () => {
    // For now, just close the popup
    // In the future, this could navigate to a detailed building page
    handleClosePopup();
  };

  const handleIndoorOutdoorSync = useCallback(
    ({ originBuildingId: o, destinationBuildingId: d }) => {
      if (!o || !d) return;
      setDestinationPoiId(null);
      setOriginBuildingId(o);
      setDestinationBuildingId(d);
      const oi = getBuildingInfo(o);
      const di = getBuildingInfo(d);
      setOriginQuery(oi ? `${oi.name} (${oi.code})` : o);
      setDestinationQuery(di ? `${di.name} (${di.code})` : d);
      setOriginMode('manual');
      setShowSearch(true);
      const originCampus = oi?.campus;
      if (originCampus) {
        const idx = campuses.findIndex((c) => c.id === originCampus);
        if (idx >= 0) setCampusIndex(idx);
      }
    },
    [campuses]
  );

  const handleIndoorDirectionsForMap = useCallback((snapshot) => {
    setIndoorDirectionsForMap(snapshot);
  }, []);

  const handleOpenIndoorFromRouteSnapshot = useCallback(() => {
    if (!routeIndoorSnapshot?.steps?.length) return;
    const snap = routeIndoorSnapshot;
    setMapViewerBuildingId(snap.destinationBuildingId || snap.originBuildingId);
    setMapViewerOriginRoomId(snap.originRoomId ?? null);
    setMapViewerDestinationRoomId(snap.destinationRoomId ?? null);
    setMapViewerInitialFloor(null);
    setMapViewerVisible(true);
  }, [routeIndoorSnapshot]);

  const handleOpenIndoorFromDirectionsStep = useCallback(
    (openIndoor) => {
      if (!openIndoor?.buildingId) return;
      setMapViewerBuildingId(openIndoor.buildingId);
      const snap = routeIndoorSnapshot;
      if (snap?.originRoomId && snap?.destinationRoomId) {
        setMapViewerOriginRoomId(snap.originRoomId);
        setMapViewerDestinationRoomId(snap.destinationRoomId);
      } else {
        setMapViewerOriginRoomId(openIndoor.entranceNodeId ?? null);
        setMapViewerDestinationRoomId(openIndoor.destinationRoomId ?? null);
      }
      const f = openIndoor.floor;
      setMapViewerInitialFloor(
        f != null && !Number.isNaN(Number(f)) ? Number(f) : null,
      );
      setMapViewerVisible(true);
    },
    [routeIndoorSnapshot],
  );

  // ─── Next Class: Go-to-class handler ─────────────────────────────────────
  const handleGoToClass = () => {
    if (!upcomingClassroom.buildingId) return;
    const opts = calendarClassDirections.buildAvailableOptionsFromWaypoints();
    const destinationRoomNodeId = calendarClassDirections.findRoomNodeIdForCalendar(
      upcomingClassroom.buildingId,
      upcomingClassroom.room,
      opts,
    );
    calendarMergeKeyRef.current = '';
    setCalendarOutdoorIndoorMerge(null);
    setCalendarClassRouteSession({
      eventId: upcomingClassroom.event?.id ?? null,
      buildingId: upcomingClassroom.buildingId,
      destinationRoomNodeId,
    });
    handleUseCurrentLocationAsOrigin();
    setBuildingAsDestination(upcomingClassroom.buildingId);
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
    // If we have coords, animate the map.
    if (coords && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
    // Even if we don't have coords yet, setting originMode to 'current' 
    // ensures the routing UI will update as soon as they arrive.
    setOriginMode('current');
    if (!originBuildingId) {
      setOriginBuildingId('__GPS__');
    }
  };
 
  // Prefetch images for the current campus to improve BuildingInfoPopup load time
  useEffect(() => {
    if (buildings && buildings.length > 0) {
      buildings.forEach((b) => {
        const id = getBuildingId(b);
        const url = BUILDING_IMAGE_URLS[id];
        if (url) {
          Promise.resolve(Image.prefetch(url)).catch(() => { /* ignore */ });
        }
      });
    }
  }, [buildings]);

  const handleUseCurrentLocationAsOrigin = () => {
    // Block only hard errors — denied / unavailable / error.
    if (locStatus === 'denied' || locStatus === 'unavailable' || locStatus === 'error') {
      return;
    }

    if (!coords) {
      // In case coordinates arrive a bit late (common in simulator start)
      setOriginBuildingId('__GPS__');
      setOriginQuery('Current Location');
      setOriginMode('current');
      return;
    }

    // If inside a mapped building, use that building as origin.
    // Otherwise use raw GPS so the user can still get directions from their location.
    if (currentBuildingId) {
      const info = getBuildingInfo(currentBuildingId);
      setOriginBuildingId(currentBuildingId);
      setOriginQuery(info ? `${info.name} (${info.code})` : currentBuildingId);
    } else {
      setOriginBuildingId('__GPS__');
      setOriginQuery('Current Location');
    }
    setOriginMode('current');
  };

  const simulateLocationAtConcordia = ()=>{
    setIsSimulatingLocation(!isSimulatingLocation);
  }

  // If user moves while planning route and originMode is "current",
  // update origin automatically when their current building changes.
  useEffect(() => {
    if (originMode !== 'current') return;

    if (currentBuildingId) {
      const info = getBuildingInfo(currentBuildingId);
      setOriginBuildingId(currentBuildingId);
      setOriginQuery(info ? `${info.name} (${info.code})` : currentBuildingId);
    } else {
      // If outside a mapped building, use raw GPS.
      setOriginBuildingId('__GPS__');
      setOriginQuery('Current Location');
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

    if (!coords) {
      Alert.alert(
        'Location',
        'Waiting for your current location. Try again in a moment.',
      );
      return;
    }

    handleUseCurrentLocationAsOrigin();

    setDestinationBuildingId(null);
    setCalendarAutoDestinationId(null);
    setDestinationPoiId(poiId);
    const poiInfo = getOutdoorPoiInfo(poiId);
    setDestinationQuery(poiInfo?.name || poiId);
    setShowSearch(true);
    setPopupVisible(false); // Close building popup if it was open
  };

  const handleBuildingPress = (buildingId) => {
    applyRouteSelectionFromMapTap({
      showSearch,
      originBuildingId,
      destinationBuildingId,
      buildingId,
      setOriginMode,
      setOriginBuildingId,
      setOriginQuery,
      setBuildingAsDestination,
    });
    setSelectedBuildingId(buildingId);
    setIsFromLookup(false); 
    setPopupVisible(true);
  };

  const handleGoToBuilding = (buildingId) => {
    const info = getBuildingInfo(buildingId);
    if (!info) return;

    setOriginMode('current');
    setOriginBuildingId('__GPS__');
    setOriginQuery('Current Location');
    setDestinationBuildingId(buildingId);
    setDestinationQuery(`${info.name} (${info.code})`);
    
    setPopupVisible(false);
    setShowSearch(true);
    // When routing, clear the lookup highlight and text
    setLookupBuildingId(null);
    setLookupQuery('');
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

  const lookupSuggestions = useMemo(
    () => filterBuildings(lookupQuery).slice(0, 6),
    [lookupQuery, allCampusBuildings],
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

  const handleSelectLookupFromSearch = (building) => {
    setLookupQuery(`${building.name} (${building.code})`);
    setLookupBuildingId(building.id);
    setSelectedBuildingId(building.id);
    setIsFromLookup(true);
    setPopupVisible(true);
    Keyboard.dismiss();
    
    // Animate map to the building
    const coords = getBuildingCoords(building.id);
    if (coords && mapRef.current) {
      mapRef.current.animateToRegion({
        ...coords,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
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
    setIndoorDirectionsForMap(null);
    setMapViewerOriginRoomId(null);
    setMapViewerDestinationRoomId(null);
    setMapViewerInitialFloor(null);
    setCalendarClassRouteSession(null);
    setCalendarOutdoorIndoorMerge(null);
    calendarMergeKeyRef.current = '';
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

  const indoorOnlyOnMap =
    indoorDirectionsForMap &&
    !indoorDirectionsForMap.isHybrid &&
    indoorDirectionsForMap.originBuildingId &&
    indoorDirectionsForMap.originBuildingId === indoorDirectionsForMap.destinationBuildingId;

  const skipOutdoorDirectionsFetch = Boolean(indoorOnlyOnMap);

  const stdDirections = useDirections({
    originCoords: isShuttleMode || skipOutdoorDirectionsFetch ? null : originCoords,
    destinationCoords: isShuttleMode || skipOutdoorDirectionsFetch ? null : destinationCoords,
    travelMode: isShuttleMode ? 'walking' : travelMode, // Avoid passing 'shuttle' mode to standard map api
    userCoords: coords || null,
  });

  const {
    steps: stdSteps,
    distanceText: stdDistanceText,
    loading: stdLoading,
    error: stdError,
    routeMeta: stdRouteMeta,
  } = stdDirections;

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

  useEffect(() => {
    const update = computeCalendarMergeUpdate({
      isShuttleMode,
      calendarClassRouteSession,
      destinationBuildingId,
      stdLoading,
      stdError,
      stdSteps,
      stdDistanceText,
      stdRouteMeta,
      mergeKeyRefValue: calendarMergeKeyRef.current,
    });
    if (update.skip) return;
    if (update.resetKey) {
      calendarMergeKeyRef.current = '';
    }
    if ('merge' in update && update.merge === null) {
      setCalendarOutdoorIndoorMerge(null);
      return;
    }
    if (update.key != null) {
      calendarMergeKeyRef.current = update.key;
      setCalendarOutdoorIndoorMerge(update.merge);
    }
  }, [
    isShuttleMode,
    calendarClassRouteSession,
    destinationBuildingId,
    stdLoading,
    stdError,
    stdSteps,
    stdDistanceText,
    stdRouteMeta?.distanceMeters,
    stdRouteMeta?.durationSeconds,
  ]);

  useEffect(() => {
    if (
      calendarClassRouteSession
      && destinationBuildingId
      && destinationBuildingId !== calendarClassRouteSession.buildingId
    ) {
      setCalendarClassRouteSession(null);
    }
  }, [destinationBuildingId, calendarClassRouteSession]);

  const showIndoorRouteInPanel = hasRouteSnapshotSteps(routeIndoorSnapshot);
  const panelSteps = showIndoorRouteInPanel ? routeIndoorSnapshot.steps : steps;
  const panelDistanceText = showIndoorRouteInPanel ? routeIndoorSnapshot.distanceText : distanceText;
  const panelDurationText = showIndoorRouteInPanel ? routeIndoorSnapshot.durationText : durationText;
  const panelLoading = showIndoorRouteInPanel ? false : routeLoading;
  const panelError = showIndoorRouteInPanel ? null : routeError;

  const hasOutdoorRouteEndpoints = Boolean(originCoords && destinationCoords);
  const showDirectionsPanel =
    !!(originBuildingId && (destinationBuildingId || destinationPoiId))
    || hasOutdoorRouteEndpoints
    || showIndoorRouteInPanel;

  useEffect(() => {
    if (!showDirectionsPanel) return;
    setShowSearch(true);
    setPanelCollapsed(true);
  }, [showDirectionsPanel]);

  // Auto-fill the destination when the next classroom is found in the calendar.
  useEffect(() => {
    const patch = getCalendarClassDestinationPatch(
      upcomingClassroom,
      destinationPoiId,
      destinationBuildingId,
      calendarAutoDestinationId,
      calendarAppliedEventId,
    );
    if (!patch) return;

    const info = getBuildingInfo(patch.buildingId);
    setDestinationBuildingId(patch.buildingId);
    setDestinationQuery(info ? `${info.name} (${info.code})` : patch.buildingId);
    setCalendarAutoDestinationId(patch.buildingId);
    setCalendarAppliedEventId(patch.eventId);
    setShowSearch(true);

    const nextIdx = nextCampusIndexIfNeeded(info, campuses, campusIndex);
    if (nextIdx != null) setCampusIndex(nextIdx);
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
            {getLocationBannerText(currentBuildingInfo, coords)}
          </Text>
        )}

        {(locStatus === 'denied' || locStatus === 'unavailable' || locStatus === 'error') && (
          <Text style={styles.locationText}>
            {locMessage || 'Location cannot be determined.'}
          </Text>
        )}
        {isSimulatingLocation && (
          <TouchableOpacity testID = "simOnButton" style={styles.simLocationButtonOn} onPress={simulateLocationAtConcordia}><Text style={styles.simLocationText}>Simulate being at Concordia: On</Text></TouchableOpacity>
        )}

        {!isSimulatingLocation && (
          <TouchableOpacity testID = "simOffButton" style={styles.simLocationButtonOff} onPress={simulateLocationAtConcordia}><Text style={styles.simLocationText}>Simulate being at Concordia: Off</Text></TouchableOpacity>
        )}
        
      </View>


      {/* Building Lookup / Directions search */}
      {showSearch && (
        <View style={styles.searchContainer}>
          {/* Lookup Row */}
          <View style={styles.searchRow}>
            <View style={styles.searchLabelContainer}>
              <Text style={styles.searchLabel}>From</Text>
            </View>
            <View style={styles.searchInputWrapper}>
              <View style={styles.searchInputRow}>
                <TextInput
                  testID="search-origin-building"
                  accessibilityLabel="Search origin building"
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
                  testID="search-destination-building"
                  accessibilityLabel="Search destination building"
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

      {/* Floating Building Lookup (Visible when directions are NOT showing) */}
      {!showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <View style={styles.searchInputRow}>
                <TextInput
                  value={lookupQuery}
                  onChangeText={setLookupQuery}
                  placeholder="Find building (search by name or code)"
                  placeholderTextColor="#a0aec0"
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoCapitalize="characters"
                />
                {(lookupQuery.length > 0 || !!lookupBuildingId) && (
                  <TouchableOpacity onPress={() => {
                    setLookupQuery('');
                    setLookupBuildingId(null);
                  }}>
                    <Text style={styles.clearIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
          {lookupSuggestions.length > 0 && (
            <View style={styles.suggestionsBox}>
              {lookupSuggestions.map((building) => (
                <SuggestionItem
                  key={`standalone-lookup-${building.id}`}
                  building={building}
                  onPress={() => handleSelectLookupFromSearch(building)}
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
          highlightedBuildingId={lookupBuildingId}
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
            onPress={() => {
              setShowSearch((prev) => {
                if (originCoords && destinationCoords) {
                  return true;
                }
                return !prev;
              });
            }}
            accessibilityRole="button"
            accessibilityLabel="Toggle search route"
          >
            <Text style={styles.fabIcon}>🗺️</Text>
          </TouchableOpacity>

          {!mapViewerVisible && routeIndoorSnapshot?.steps?.length > 0 && (
            <TouchableOpacity
              style={styles.fab}
              testID="open-indoor-map-route"
              onPress={handleOpenIndoorFromRouteSnapshot}
              accessibilityRole="button"
              accessibilityLabel="Open indoor map for this route"
            >
              <Text style={styles.fabIcon}>🏢</Text>
            </TouchableOpacity>
          )}

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
          distanceText={panelDistanceText || ''}
          durationText={panelDurationText || ''}
          loading={panelLoading}
          error={panelError}
          onClear={clearRoute}
          travelMode={travelMode}
          onModeChange={setTravelMode}
          steps={panelSteps}
          showShuttle={showShuttle}
          nextDeparture={shuttleDirections.nextDeparture}
          collapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed((prev) => !prev)}
          onOpenIndoorMap={handleOpenIndoorFromDirectionsStep}
        />
      )}

      {/* Building Info Popup */}
      <BuildingInfoPopup
        visible={popupVisible}
        buildingInfo={selectedBuildingInfo}
        onClose={handleClosePopup}
        onMoreDetails={handleMoreDetails}
        onGoThere={() => handleGoToBuilding(selectedBuildingId)}
        isLookup={isFromLookup}
        onViewFloorPlans={() => {
          setMapViewerBuildingId(selectedBuildingId);
          setMapViewerOriginRoomId(null);
          setMapViewerDestinationRoomId(null);
          setMapViewerInitialFloor(null);
          handleClosePopup();
          setMapViewerVisible(true);
        }}
      />

      {/* Indoor Map Viewer overlay */}
      <IndoorMapViewer
        visible={mapViewerVisible}
        onClose={() => setMapViewerVisible(false)}
        initialBuildingId={mapViewerBuildingId}
        initialFloor={mapViewerInitialFloor ?? undefined}
        originId={mapViewerOriginRoomId}
        destinationId={mapViewerDestinationRoomId}
        onOutdoorRouteSync={handleIndoorOutdoorSync}
        onIndoorDirectionsForMap={handleIndoorDirectionsForMap}
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
