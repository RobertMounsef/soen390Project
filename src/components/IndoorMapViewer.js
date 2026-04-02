/**
* ───────────────────────────────────────────────────────────────────────────
* IndoorMapViewer  –  Indoor navigation UI
* ───────────────────────────────────────────────────────────────────────────
* Combines building / floor selection with a full turn-by-turn indoor
* navigation experience:
*
*  • Origin / destination room pickers
*  • Dijkstra shortest-path via useIndoorDirections
*  • SVG polyline path drawn directly over the floor-plan image
*  • Collapsible directions panel with distance, walking time & step list
*  • "I am here" position selector that triggers automatic route recalculation
*    when the user's selected position deviates from the current path
*
* Works for every building / floor that has waypoint data in waypointsIndex.js.
* ───────────────────────────────────────────────────────────────────────────
*/

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import { getAvailableFloors, getFloorGraph, getMultiFloorGraph } from '../floor_plans/waypoints/waypointsIndex';
import { resolveRoutingSingleFloor } from './indoorMapRoutingUtils';
import { findBuildingForRoom, getGlobalRoomPickerSections } from '../services/routing/hybridIndoorDirections';
import useIndoorDirections from '../hooks/useIndoorDirections';
import {
  completeUsabilityTask,
  failUsabilityTask,
  startUsabilityTask,
  trackUsabilityStep,
} from '../services/analytics/usability';
import useHybridIndoorDirections from '../hooks/useHybridIndoorDirections';
import BuildingFloorSelectors from './indoor/BuildingFloorSelectors';
import MapDisplay from './indoor/MapDisplay';
import IndoorDirectionsPanel from './indoor/IndoorDirectionsPanel';
import RoomPickerOverlay from './indoor/RoomPickerOverlay';

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeRoomLabel(data, id) {
  const raw = String(data?.label || '').trim();
  const fromId = String(id || '')
    .split('_')
    .pop()
    .replaceAll(/[^A-Za-z0-9-]/g, '')
    .trim();
  const base = raw || fromId || String(id || '').trim();
  const stripped = base.replace(/^room\s+/i, '').trim();
  if (!stripped) return 'Room';
  return `Room ${stripped}`;
}



// ─── Component helpers ───────────────────────────────────────────────────────

/** Resolve the initial building to pre-select from the initialBuildingId prop. */
function resolveInitialBuilding(initialBuildingId, buildings) {
  if (!initialBuildingId) return buildings[0] ?? null;
  return buildings.find(b => initialBuildingId.toUpperCase().startsWith(b))
    ?? buildings[0]
    ?? null;
}

/** Return the currently selected room ID for the active picker target. */
function getPickerSelectedId(pickerTarget, originId, destinationId, userPositionId) {
  if (pickerTarget === 'origin') return originId;
  if (pickerTarget === 'destination') return destinationId;
  return userPositionId;
}

function buildAvailableOptions() {
  const floors = getAvailableFloors();
  const map = {};
  floors.forEach(({ building, floor }) => {
    if (!map[building]) map[building] = [];
    if (typeof floor === 'number' && !Number.isNaN(floor)) {
      map[building].push(floor);
    }
  });
  Object.keys(map).forEach((b) => map[b].sort((a, b2) => a - b2));
  return map;
}

function getRoutingFloorsNeeded(selectedBuilding, availableOptions, originId, destinationId) {
  if (!selectedBuilding) return null;
  const allFloorsForBuilding = availableOptions[selectedBuilding] ?? [];
  const allFloorGraphs = {};
  for (const f of allFloorsForBuilding) {
    const g = getFloorGraph(selectedBuilding, f);
    if (g) allFloorGraphs[f] = g;
  }

  const originFloor = originId
    ? Object.entries(allFloorGraphs).find(([, g]) => g.nodes?.[originId])?.[0]
    : null;
  const destFloor = destinationId
    ? Object.entries(allFloorGraphs).find(([, g]) => g.nodes?.[destinationId])?.[0]
    : null;

  if (!originFloor || !destFloor) return null;
  const of1 = Number(originFloor);
  const of2 = Number(destFloor);
  if (of1 === of2) return null;

  const numericFloors = allFloorsForBuilding
    .map(Number)
    .filter((f) => !Number.isNaN(f))
    .sort((a, b) => a - b);
  const lo = Math.min(of1, of2);
  const hi = Math.max(of1, of2);
  const spanning = numericFloors.filter((f) => f >= lo && f <= hi);
  return spanning.length >= 2 ? spanning : [of1, of2];
}

function getRoomNodesForCurrentGraph(currentGraph) {
  if (!currentGraph?.nodes) return [];
  return Object.entries(currentGraph.nodes)
    .map(([id, data]) => ({
      id,
      ...data,
      label: (String(data.type || '').toLowerCase() === 'room')
        ? normalizeRoomLabel(data, id)
        : (data.label || id),
    }))
    .filter((node) => {
      const type = (node.type || '').toString().toLowerCase();
      const label = (node.label || '').toString().toLowerCase();
      const id = (node.id || '').toString();
      return type === 'room' && !label.includes('corridor') && !id.includes('__HUB');
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function getAllRoomNodesForBuilding(selectedBuilding, availableOptions, fallbackRoomNodes) {
  if (!selectedBuilding) return fallbackRoomNodes;
  const allFloors = availableOptions[selectedBuilding] ?? [];
  const seen = new Set();
  const collected = [];
  for (const f of allFloors) {
    const g = getFloorGraph(selectedBuilding, f);
    if (!g?.nodes) continue;
    for (const [id, data] of Object.entries(g.nodes)) {
      if (seen.has(id)) continue;
      const type = (data.type || '').toString().toLowerCase();
      const label = (data.label || '').toString().toLowerCase();
      if (type === 'room' && !label.includes('corridor') && !id.includes('__HUB')) {
        seen.add(id);
        collected.push({
          id,
          ...data,
          label: normalizeRoomLabel(data, id),
          floor: data.floor ?? f,
        });
      }
    }
  }
  return collected.sort((a, b) => {
    if (a.floor !== b.floor) return a.floor - b.floor;
    return a.label.localeCompare(b.label);
  });
}

function getFilteredPathPoints(isMultiFloor, isHybridRoute, allPathPoints, routingGraph, displayFloor) {
  // Multi-floor routes: show only nodes on the displayed floor.
  // Hybrid routes (cross-building): the pathPoints belong to per-leg graphs
  // whose nodes carry floor metadata — filter them the same way.
  if (!isMultiFloor && !isHybridRoute) return allPathPoints;
  return allPathPoints.filter((p) => {
    const n = routingGraph?.nodes?.[p.id];
    // If no floor metadata, always show (corridor hubs, etc.)
    if (n?.floor == null) return true;
    // Normalize both sides to handle string vs number mismatch.
    return String(n.floor) === String(displayFloor);
  });
}

function getInitialFloorForBuilding(building, availableOptions) {
  if (!building || availableOptions[building]?.length === 0) return null;
  return availableOptions[building][0];
}

function getDefaultFloorForBuilding(building, availableOptions) {
  if (!building || availableOptions[building]?.length === 0) return null;
  return availableOptions[building][0];
}

// ─── Main component ──────────────────────────────────────────────────────────

// Large modal: splitting solely for cognitive-complexity metrics is high churn; logic is covered by IndoorMapViewer tests.
export default function IndoorMapViewer({ // NOSONAR S3776 - cognitive complexity
  visible,
  onClose,
  initialBuildingId,
  /** When opening from outdoor directions, scroll to this floor if it exists for the building. */
  initialFloor: initialFloorProp,
  onOutdoorRouteSync,
  /** When set, pushes indoor / hybrid step lists to MapScreen so DirectionsPanel stays in sync after closing the modal. */
  onIndoorDirectionsForMap,
  originId: initialOriginId,
  destinationId: initialDestinationId,
}) {
  const indoorTaskActiveRef = useRef(false);
  const accessibilityTaskActiveRef = useRef(false);
  // ── Building / floor selection ─────────────────────────────────────────
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  // displayFloor: the floor shown on the map (may differ from routing floors
  // when a multi-floor route is active).
  const [displayFloor, setDisplayFloor] = useState(null);


  // ── Navigation state ───────────────────────────────────────────────────
  const [originId, setOriginId] = useState(null);
  const [destinationId, setDestinationId] = useState(null);
  const [userPositionId, setUserPositionId] = useState(null);
  const [accessibleOnly, setAccessibleOnly] = useState(false);


  // ── UI state ───────────────────────────────────────────────────────────
  // pickerTarget: 'origin' | 'destination' | 'userPosition' | null
  const [pickerTarget, setPickerTarget] = useState(null);


  // ── Available options ──────────────────────────────────────────────────
  const availableOptions = useMemo(() => buildAvailableOptions(), []);


  const buildings = useMemo(() => Object.keys(availableOptions), [availableOptions]);
  /** When several buildings have indoor data, room labels and picker use campus-wide grouped sections. */
  const globalRoomPicker = buildings.length > 1;

  // ── Initialise from prop ───────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !availableOptions) return;
    const initBldg = resolveInitialBuilding(initialBuildingId, buildings);
    startUsabilityTask({
      taskId: 'task_4',
      route_type: 'indoor',
      building_id: initBldg || initialBuildingId || null,
    });
    indoorTaskActiveRef.current = true;
    setSelectedBuilding(initBldg);
    const firstFloor = getInitialFloorForBuilding(initBldg, availableOptions);
    const floors = (initBldg && availableOptions[initBldg]) || [];
    const want =
      initialFloorProp != null && !Number.isNaN(Number(initialFloorProp))
        ? Number(initialFloorProp)
        : null;
    const startFloor =
      want != null && floors.some((fl) => Number(fl) === want) ? want : firstFloor;
    setSelectedFloor(startFloor);
    setDisplayFloor(startFloor);
    setOriginId(initialOriginId ?? null);
    setDestinationId(initialDestinationId ?? null);
    setUserPositionId(null);
    setPickerTarget(null);
  }, [visible, initialBuildingId, buildings, initialOriginId, initialDestinationId, initialFloorProp]);


  const globalPickerSections = useMemo(
    () => getGlobalRoomPickerSections(availableOptions),
    [availableOptions]
  );


  const roomLabelById = useMemo(() => {
    if (globalRoomPicker) {
      const map = {};
      for (const sec of globalPickerSections) {
        for (const r of sec.data) {
          map[r.id] = r.navLabel ?? r.label;
        }
      }
      return map;
    }
    const map = {};
    for (const b of buildings) {
      const nodes = getAllRoomNodesForBuilding(b, availableOptions, []);
      for (const r of nodes) {
        map[r.id] = r.label;
      }
    }
    return map;
  }, [globalRoomPicker, globalPickerSections, buildings, availableOptions]);


  const originBuildingFromRoom = useMemo(
    () => (originId ? findBuildingForRoom(originId, availableOptions) : null),
    [originId, availableOptions]
  );
  const destBuildingFromRoom = useMemo(
    () => (destinationId ? findBuildingForRoom(destinationId, availableOptions) : null),
    [destinationId, availableOptions]
  );


  const isHybridRoute = Boolean(
    originId &&
      destinationId &&
      originBuildingFromRoom &&
      destBuildingFromRoom &&
      originBuildingFromRoom !== destBuildingFromRoom
  );


  // Reset navigation when the building changes in single-building mode only.
  // With multiple indoor buildings, users switch chips to pick cross-building origin/destination.
  useEffect(() => {
    if (globalRoomPicker) return;
    setOriginId(null);
    setDestinationId(null);
    setUserPositionId(null);
  }, [selectedBuilding, globalRoomPicker]);


  // ── Compute multi-floor routing graph ──────────────────────────────────
  // When origin and destination are on different floors, load a merged graph
  // that contains both floors plus the cross-floor stair/elevator edges.
  const routingFloorsNeeded = useMemo(() => {
    return getRoutingFloorsNeeded(
      selectedBuilding,
      availableOptions,
      originId,
      destinationId
    );
  }, [selectedBuilding, originId, destinationId, availableOptions]);


  const isMultiFloor = !!routingFloorsNeeded;

  const routingSingleFloor = useMemo(
    () =>
      !selectedBuilding || isMultiFloor
        ? selectedFloor
        : resolveRoutingSingleFloor(
          selectedBuilding,
          selectedFloor,
          originId,
          destinationId
        ),
    [selectedBuilding, selectedFloor, originId, destinationId, isMultiFloor]
  );


  // Single-floor: follow the routing resolution (syncs map floor to picked stops).
  useEffect(() => {
    if (isMultiFloor) return;
    setDisplayFloor(routingSingleFloor);
  }, [routingSingleFloor, isMultiFloor]);


  useEffect(() => {
    if (!visible || !selectedBuilding || selectedFloor === null) {
      return;
    }

    trackUsabilityStep({
      taskId: accessibleOnly ? 'task_6' : 'task_4',
      step_name: 'select_floor',
      building_id: selectedBuilding,
      floor: selectedFloor,
      accessibility_enabled: accessibleOnly,
    });
  }, [selectedBuilding, selectedFloor, visible, accessibleOnly]);

  // ── Graph & rooms ──────────────────────────────────────────────────────
  // currentGraph: single-floor graph for map display
  const currentGraph = useMemo(() => {
    if (!selectedBuilding || displayFloor === null) return null;
    return getFloorGraph(selectedBuilding, displayFloor);
  }, [selectedBuilding, displayFloor]);


  // routingGraph: the graph fed to Dijkstra (multi-floor when needed)
  const routingGraph = useMemo(() => {
    if (!selectedBuilding) return null;
    if (isMultiFloor) {
      return getMultiFloorGraph(selectedBuilding, routingFloorsNeeded);
    }
    return getFloorGraph(selectedBuilding, routingSingleFloor);
  }, [selectedBuilding, routingSingleFloor, isMultiFloor, routingFloorsNeeded]);


  const roomNodes = useMemo(
    () => getRoomNodesForCurrentGraph(currentGraph),
    [currentGraph]
  );


  // allRoomNodes: rooms from every floor of this building — shown in the picker
  // so users can select a destination on a different floor.
  const allRoomNodes = useMemo(
    () => getAllRoomNodesForBuilding(selectedBuilding, availableOptions, roomNodes),
    [selectedBuilding, availableOptions, roomNodes]
  );

  const globalPickerSectionForBuilding = useMemo(() => {
    if (!globalRoomPicker || !selectedBuilding) return null;
    return (
      globalPickerSections.find((s) => s.data?.some((r) => r.buildingCode === selectedBuilding)) ?? null
    );
  }, [globalRoomPicker, globalPickerSections, selectedBuilding]);

  const pickerOverlayRooms = useMemo(() => {
    if (pickerTarget === 'userPosition') return roomNodes;
    if (
      pickerTarget &&
      globalRoomPicker &&
      selectedBuilding &&
      globalPickerSectionForBuilding
    ) {
      return [...globalPickerSectionForBuilding.data];
    }
    return allRoomNodes;
  }, [
    pickerTarget,
    globalRoomPicker,
    selectedBuilding,
    globalPickerSectionForBuilding,
    roomNodes,
    allRoomNodes,
  ]);

  const pickerSectionTitle =
    pickerTarget &&
    pickerTarget !== 'userPosition' &&
    globalRoomPicker &&
    globalPickerSectionForBuilding
      ? globalPickerSectionForBuilding.title
      : null;

  const viewBoxSize = useMemo(() => {
    if (!currentGraph?.viewBox) return { width: 1024, height: 1024 };
    const parts = currentGraph.viewBox.split(' ').map(Number);
    return parts.length === 4
      ? { width: parts[2], height: parts[3] }
      : { width: 1024, height: 1024 };
  }, [currentGraph]);


  // ── Direction hook ─────────────────────────────────────────────────────
  const userPositionNode = userPositionId ? routingGraph?.nodes?.[userPositionId] : null;

  const userPositionObj = useMemo(() => {
    if (!userPositionNode) return null;
    return { x: userPositionNode.x, y: userPositionNode.y };
  }, [userPositionNode?.x, userPositionNode?.y]);

  const {
    result: indoorResult,
    loading: indoorLoading,
    error: indoorError,
  } = useIndoorDirections({
    graph: isHybridRoute ? null : routingGraph,
    originId,
    destinationId,
    userPosition: userPositionObj,
    accessibleOnly,
  });

  const {
    result: hybridResult,
    loading: hybridLoading,
    error: hybridError,
  } = useHybridIndoorDirections({
    enabled: isHybridRoute,
    originBuilding: originBuildingFromRoom,
    destBuilding: destBuildingFromRoom,
    originRoomId: originId,
    destRoomId: destinationId,
    availableOptions,
    accessibleOnly,
  });

  const displayResult = isHybridRoute ? hybridResult : indoorResult;
  const displayLoading = isHybridRoute ? hybridLoading : indoorLoading;
  const displayError = isHybridRoute ? hybridError : indoorError;
  const result = displayResult;
  const loading = displayLoading;
  const error = displayError;

  const outdoorSyncKeyRef = useRef('');
  const indoorDirectionsMapKeyRef = useRef('');

  useEffect(() => {
    if (!onIndoorDirectionsForMap) return;
    if (!displayResult?.steps?.length || displayLoading || displayError) return;
    const key = [
      originId,
      destinationId,
      displayResult.kind ?? 'single',
      displayResult.durationText,
      displayResult.steps.length,
      originBuildingFromRoom,
      destBuildingFromRoom,
    ].join('|');
    if (indoorDirectionsMapKeyRef.current === key) return;
    indoorDirectionsMapKeyRef.current = key;
    onIndoorDirectionsForMap({
      steps: displayResult.steps,
      distanceText: displayResult.distanceText,
      durationText: displayResult.durationText,
      isHybrid: displayResult.kind === 'hybrid',
      originBuildingId: originBuildingFromRoom,
      destinationBuildingId: destBuildingFromRoom,
      originRoomId: originId,
      destinationRoomId: destinationId,
    });
  }, [
    onIndoorDirectionsForMap,
    displayResult,
    displayLoading,
    displayError,
    originId,
    destinationId,
    originBuildingFromRoom,
    destBuildingFromRoom,
  ]);

  useEffect(() => {
    if (!onOutdoorRouteSync) return;
    if (!originId || !destinationId || !originBuildingFromRoom || !destBuildingFromRoom) return;
    if (displayLoading || displayError || !displayResult) return;
    const key = `${originBuildingFromRoom}|${originId}|${destBuildingFromRoom}|${destinationId}`;
    if (outdoorSyncKeyRef.current === key) return;
    outdoorSyncKeyRef.current = key;
    onOutdoorRouteSync({
      originBuildingId: originBuildingFromRoom,
      destinationBuildingId: destBuildingFromRoom,
    });
  }, [
    onOutdoorRouteSync,
    originId,
    destinationId,
    originBuildingFromRoom,
    destBuildingFromRoom,
    displayLoading,
    displayError,
    displayResult,
  ]);

  // When a route is active, sync displayFloor to the origin's floor if multi-floor.
  useEffect(() => {
    if (!isMultiFloor || !routingFloorsNeeded) return;
    // Start showing the floor that the origin is on.
    const originNode = routingGraph?.nodes?.[originId];
    if (originNode?.floor != null) setDisplayFloor(originNode.floor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiFloor, originId, routingGraph]);


  // ── Picker helpers ─────────────────────────────────────────────────────
  const openPicker = useCallback(target => setPickerTarget(target), []);
  const closePicker = useCallback(() => setPickerTarget(null), []);


  const ROOM_SETTER = { origin: setOriginId, destination: setDestinationId, userPosition: setUserPositionId };
  const handleRoomSelect = useCallback(roomId => {
    if (pickerTarget === 'origin' || pickerTarget === 'destination') {
      trackUsabilityStep({
        taskId: accessibleOnly ? 'task_6' : 'task_4',
        step_name: pickerTarget === 'origin' ? 'select_origin_room' : 'select_destination_room',
        building_id: selectedBuilding,
        floor: selectedFloor,
        room_id: roomId,
        accessibility_enabled: accessibleOnly,
      });
    }
    ROOM_SETTER[pickerTarget]?.(roomId);
    closePicker();
  }, [pickerTarget, closePicker, accessibleOnly, selectedBuilding, selectedFloor]);


  const clearRoute = useCallback(() => {
    outdoorSyncKeyRef.current = '';
    indoorDirectionsMapKeyRef.current = '';
    onIndoorDirectionsForMap?.(null);
    setOriginId(null);
    setDestinationId(null);
    setUserPositionId(null);
  }, [onIndoorDirectionsForMap]);

  const handleBuildingSelect = useCallback((buildingId) => {
    setSelectedBuilding(buildingId);

    if (availableOptions[buildingId]?.length > 0) {
      setSelectedFloor(availableOptions[buildingId][0]);
    } else {
      setSelectedFloor(null);
    }
  }, [availableOptions]);

  const handleSwapOriginDestination = useCallback(() => {
    setOriginId(destinationId);
    setDestinationId(originId);
  }, [destinationId, originId]);

  const handleFloorChangeTap = useCallback((toFloor) => {
    setDisplayFloor(toFloor);
  }, []);

  const handleClose = useCallback(() => {
    if (indoorTaskActiveRef.current) {
      failUsabilityTask({
        taskId: 'task_4',
        failureReason: 'viewer_closed',
        building_id: selectedBuilding,
      });
      indoorTaskActiveRef.current = false;
    }
    if (accessibilityTaskActiveRef.current) {
      failUsabilityTask({
        taskId: 'task_6',
        failureReason: 'viewer_closed',
        building_id: selectedBuilding,
      });
      accessibilityTaskActiveRef.current = false;
    }
    onClose();
  }, [onClose, selectedBuilding]);

  // ── Derived display values ─────────────────────────────────────────────
  // For overlay: only show path points that are on the current displayFloor.
  // For hybrid routes, nodes live in per-building graphs, not routingGraph.
  // We derive the merged lookup lazily after hybridFilterGraph is computed (see below).
  const originNode = originId ? routingGraph?.nodes?.[originId] : null;
  const destNode = destinationId ? routingGraph?.nodes?.[destinationId] : null;
  const allPathPoints = useMemo(() => {
    if (!result) return [];
    if (result.kind === 'hybrid') {
      if (selectedBuilding === originBuildingFromRoom) {
        return result.leg1Indoor?.pathPoints ?? [];
      }
      if (selectedBuilding === destBuildingFromRoom) {
        return result.leg2Indoor?.pathPoints ?? [];
      }
      return result.leg1Indoor?.pathPoints ?? [];
    }
    return result.pathPoints ?? [];
  }, [result, selectedBuilding, originBuildingFromRoom, destBuildingFromRoom]);
  // Build a graph that covers all nodes referenced in the hybrid path
  // so floor-based filtering works for cross-building legs.
  const hybridFilterGraph = useMemo(() => {
    if (!isHybridRoute || result?.kind !== 'hybrid') return null;
    // Merge nodes from both leg graphs into one lookup object for floor-based filtering.
    const nodesA = (() => {
      const bA = originBuildingFromRoom;
      if (!bA) return {};
      const floors = availableOptions[bA] ?? [];
      const merged = {};
      for (const f of floors) {
        const g = getFloorGraph(bA, f);
        if (g?.nodes) Object.assign(merged, g.nodes);
      }
      return merged;
    })();
    const nodesB = (() => {
      const bB = destBuildingFromRoom;
      if (!bB) return {};
      const floors = availableOptions[bB] ?? [];
      const merged = {};
      for (const f of floors) {
        const g = getFloorGraph(bB, f);
        if (g?.nodes) Object.assign(merged, g.nodes);
      }
      return merged;
    })();
    return { nodes: { ...nodesA, ...nodesB } };
  }, [isHybridRoute, result, originBuildingFromRoom, destBuildingFromRoom, availableOptions]);

  // For hybrid routes, use the merged graph to look up origin/dest nodes so floor
  // metadata is available (routingGraph only covers the selected single building).
  const effectiveNodeGraph = isHybridRoute ? hybridFilterGraph : routingGraph;
  const resolvedOriginNode = originId ? (effectiveNodeGraph?.nodes?.[originId] ?? originNode) : null;
  const resolvedDestNode = destinationId ? (effectiveNodeGraph?.nodes?.[destinationId] ?? destNode) : null;

  const pathPoints = getFilteredPathPoints(
    isMultiFloor,
    isHybridRoute,
    allPathPoints,
    isHybridRoute ? hybridFilterGraph : routingGraph,
    displayFloor
  );


  // Only show origin/dest markers when they are on the displayed floor.
  // Use String() comparison to safely handle numeric vs string floor values.
  const showOriginMarker =
    resolvedOriginNode?.floor == null ||
    String(resolvedOriginNode.floor) === String(displayFloor);
  const showDestMarker =
    resolvedDestNode?.floor == null ||
    String(resolvedDestNode.floor) === String(displayFloor);


  // Use the graph's viewBox (computed from node bounds for new graphs) to
  // set the container aspect ratio.  This ensures the path overlay and the
  // SVG/PNG background share the same proportional layout.
  const mapAspectRatio = useMemo(() => {
    return viewBoxSize.width / viewBoxSize.height;
  }, [viewBoxSize]);


  const originLabel = originId
    ? (roomLabelById[originId] ?? routingGraph?.nodes?.[originId]?.label ?? originId)
    : null;
  const destLabel = destinationId
    ? (roomLabelById[destinationId] ?? routingGraph?.nodes?.[destinationId]?.label ?? destinationId)
    : null;
  const userLabel = userPositionId
    ? (roomLabelById[userPositionId] ?? routingGraph?.nodes?.[userPositionId]?.label ?? userPositionId)
    : null;


  // ── Picker titles ──────────────────────────────────────────────────────
  const pickerTitles = {
    origin: 'Select Origin',
    destination: 'Select Destination',
    userPosition: 'Set My Position',
  };
  const pickerSelectedId = getPickerSelectedId(pickerTarget, originId, destinationId, userPositionId);

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (accessibleOnly) {
      startUsabilityTask({
        taskId: 'task_6',
        route_type: 'accessible',
        building_id: selectedBuilding,
      });
      accessibilityTaskActiveRef.current = true;
    }

    trackUsabilityStep({
      taskId: accessibleOnly ? 'task_6' : 'task_4',
      step_name: 'toggle_accessibility',
      accessibility_enabled: accessibleOnly,
      building_id: selectedBuilding,
    });
  }, [accessibleOnly, visible, selectedBuilding]);

  useEffect(() => {
    if (!result || !originId || !destinationId) {
      return;
    }

    if (accessibleOnly) {
      completeUsabilityTask({
        taskId: 'task_6',
        route_type: 'accessible',
        building_id: selectedBuilding,
      });
      accessibilityTaskActiveRef.current = false;
      return;
    }

    completeUsabilityTask({
      taskId: 'task_4',
      route_type: 'indoor',
      building_id: selectedBuilding,
    });
    indoorTaskActiveRef.current = false;
  }, [result, originId, destinationId, accessibleOnly, selectedBuilding]);

  if (!visible) return null;


  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>


            {/* ── Header ──────────────────────────────────────────── */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Indoor Navigation</Text>
                <Text style={styles.headerSubtitle}>Concordia University</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton} activeOpacity={0.7}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>


            <View style={styles.selectorSection}>
              <BuildingFloorSelectors
                buildings={buildings}
                selectedBuilding={selectedBuilding}
                selectedFloor={selectedFloor}
                availableOptions={availableOptions}
                onBuildingSelect={handleBuildingSelect}
                onFloorSelect={setSelectedFloor}
              />
            </View>


            {/* ── Navigation controls ─────────────────────────────── */}
            <View style={styles.navSection}>
              {/* From */}
              <TouchableOpacity
                style={[styles.navBtn, styles.navBtnOrigin]}
                onPress={() => openPicker('origin')}
                testID="pick-origin-btn"
              >
                <View style={styles.navBtnDot} />
                <View style={styles.navBtnContent}>
                  <Text style={styles.navBtnLabel}>From</Text>
                  <Text
                    style={[styles.navBtnValue, !originLabel && styles.navBtnPlaceholder]}
                    numberOfLines={1}
                  >
                    {originLabel ?? 'Select origin…'}
                  </Text>
                </View>
                <Text style={styles.navBtnArrow}>▼</Text>
              </TouchableOpacity>


              {/* Swap arrow */}
              <TouchableOpacity
                style={styles.swapBtn}
                onPress={handleSwapOriginDestination}
                testID="swap-origin-dest"
              >
                <Text style={styles.swapIcon}>⇅</Text>
              </TouchableOpacity>


              {/* To */}
              <TouchableOpacity
                style={[styles.navBtn, styles.navBtnDest]}
                onPress={() => openPicker('destination')}
                testID="pick-destination-btn"
              >
                <View style={[styles.navBtnDot, styles.navBtnDotDest]} />
                <View style={styles.navBtnContent}>
                  <Text style={styles.navBtnLabel}>To</Text>
                  <Text
                    style={[styles.navBtnValue, !destLabel && styles.navBtnPlaceholder]}
                    numberOfLines={1}
                  >
                    {destLabel ?? 'Select destination…'}
                  </Text>
                </View>
                <Text style={styles.navBtnArrow}>▼</Text>
              </TouchableOpacity>
            </View>


            {/* ── Accessible only + My Position row ───────────────── */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[styles.optionToggle, accessibleOnly && styles.optionToggleActive]}
                onPress={() => setAccessibleOnly(v => !v)}
                testID="accessible-only-toggle"
              >
                <Text style={[styles.optionToggleText, accessibleOnly && styles.optionToggleTextActive]}>
                  ♿ Accessible only
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={[styles.myPositionBtn, userLabel && styles.myPositionBtnActive]}
                onPress={() => openPicker('userPosition')}
                testID="set-user-position-btn"
              >
                <Text style={styles.myPositionIcon}>📍</Text>
                <Text style={styles.myPositionText} numberOfLines={1}>
                  {userLabel || 'I am here'}
                </Text>
              </TouchableOpacity>
            </View>


            <MapDisplay
              isMultiFloor={isMultiFloor}
              routeFloors={routingFloorsNeeded}
              displayFloor={displayFloor}
              onFloorSwitch={setDisplayFloor}
              currentGraph={currentGraph}
              mapAspectRatio={mapAspectRatio}
              pathPoints={pathPoints}
              showOriginMarker={showOriginMarker}
              originNode={resolvedOriginNode}
              showDestMarker={showDestMarker}
              destNode={resolvedDestNode}
              userPositionNode={userPositionNode}
              viewBoxSize={viewBoxSize}
              accessibleOnly={accessibleOnly}
            />

            <IndoorDirectionsPanel
              result={result}
              loading={loading}
              error={error}
              onClear={clearRoute}
              onFloorChangeTap={handleFloorChangeTap}
            />

            {/* ── Room picker overlay ──────────────────────────────── */}
            <RoomPickerOverlay
              visible={!!pickerTarget}
              rooms={pickerOverlayRooms}
              defaultFloorFilter={
                pickerTarget === 'origin' ? null : selectedFloor
              }
              onSelect={handleRoomSelect}
              onClose={closePicker}
              title={pickerTitles[pickerTarget] ?? 'Select Room'}
              selectedId={pickerSelectedId}
              sectionTitle={pickerSectionTitle}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

IndoorMapViewer.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialBuildingId: PropTypes.string,
  initialFloor: PropTypes.number,
  /** Pre-selected route stops when the viewer opens (e.g. deep link). */
  originId: PropTypes.string,
  destinationId: PropTypes.string,
  onOutdoorRouteSync: PropTypes.func,
  onIndoorDirectionsForMap: PropTypes.func,
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const BLUE = '#3B82F6';
const SLATE_900 = '#0F172A';
const SLATE_800 = '#1E293B';
const SLATE_700 = '#334155';
const SLATE_600 = '#475569';
const SLATE_500 = '#64748B';
const GREEN = '#10B981';
const RED = '#EF4444';


const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: SLATE_900,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: SLATE_500,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SLATE_800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },

  selectorSection: {
    backgroundColor: SLATE_900,
    paddingBottom: 12,
  },

  // Navigation From / To row
  navSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  navBtnOrigin: { borderLeftWidth: 4, borderLeftColor: GREEN },
  navBtnDest: { borderLeftWidth: 4, borderLeftColor: RED },
  navBtnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  navBtnDotDest: { backgroundColor: RED },
  navBtnContent: { flex: 1 },
  navBtnLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: SLATE_500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  navBtnValue: { fontSize: 13, fontWeight: '700', color: SLATE_900 },
  navBtnPlaceholder: { color: SLATE_500, fontWeight: '500' },
  navBtnArrow: { fontSize: 10, color: SLATE_500 },

  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapIcon: { fontSize: 16, color: SLATE_600 },

  // Options row (accessible + my position)
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  optionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionToggleActive: { backgroundColor: '#EFF6FF', borderColor: BLUE },
  optionToggleText: { fontSize: 12, fontWeight: '700', color: SLATE_600 },
  optionToggleTextActive: { color: BLUE },

  myPositionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  myPositionBtnActive: { backgroundColor: '#F0FDF4', borderColor: GREEN },
  myPositionIcon: { fontSize: 14 },
  myPositionText: { fontSize: 12, fontWeight: '700', color: SLATE_700, flex: 1 },

  // Map
  mapAreaWrapper: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
});

