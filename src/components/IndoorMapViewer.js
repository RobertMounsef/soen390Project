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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SectionList,
  Dimensions,
  Platform,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, Line, SvgXml, Text as SvgText } from 'react-native-svg';
import PropTypes from 'prop-types';
import { getAvailableFloors, getFloorGraph, getMultiFloorGraph, floorOfRoomId, getFloorInfoForStops } from '../floor_plans/waypoints/waypointsIndex';
import useIndoorDirections from '../hooks/useIndoorDirections';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStepIcon(instruction = '', isFloorChange = false) {
  if (isFloorChange) {
    const t = instruction.toLowerCase();
    return t.includes('elevator') ? '🛗' : '🪜';
  }
  const t = instruction.toLowerCase();
  if (t.includes('turn left')) return '←';
  if (t.includes('turn right')) return '→';
  if (t.includes('turn around') || t.includes('u-turn')) return '↩';
  if (t.includes('arrive') || t.includes('destination')) return '⚑';
  if (t.includes('start') || t.includes('you are')) return '●';
  /* istanbul ignore next */
  return '↑';
}

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

// ─── Room Picker Overlay ────────────────────────────────────────────────────

function RoomPickerOverlay({
  visible,
  rooms,
  onSelect,
  onClose,
  title,
  selectedId,
  /** When set, picker opens filtered to this floor; null = show all (grouped by floor). */
  defaultFloorFilter,
}) {
  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState(null);


  const floorChips = useMemo(() => {
    const s = new Set();
    for (const r of rooms) {
      if (r.floor != null && !Number.isNaN(Number(r.floor))) s.add(Number(r.floor));
    }
    return [...s].sort((a, b) => a - b);
  }, [rooms]);


  useEffect(() => {
    if (!visible) return;
    setSearch('');
    const hasChips = floorChips.length > 1;
    if (!hasChips) {
      setFloorFilter(null);
      return;
    }
    if (defaultFloorFilter != null && floorChips.includes(Number(defaultFloorFilter))) {
      setFloorFilter(Number(defaultFloorFilter));
    } else {
      setFloorFilter(null);
    }
  }, [visible, defaultFloorFilter, floorChips]);


  const normalise = s => String(s || '').toLowerCase().replaceAll('-', '');


  const sections = useMemo(() => {
    const q = normalise(search);
    const matches = (r) => {
      if (!q) return true;
      if (normalise(r.label).includes(q)) return true;
      if (r.id && normalise(r.id).includes(q)) return true;
      if (r.floor != null && q.length > 0 && String(r.floor).includes(search.trim())) return true;
      return false;
    };

    let pool = rooms.filter(matches);
    if (floorFilter != null) {
      pool = pool.filter((r) => Number(r.floor) === floorFilter);
    }

    if (floorFilter != null) {
      return [{ title: null, data: pool }];
    }

    const byFloor = {};
    for (const r of pool) {
      let f;
      if (r.floor == null) {
        f = '—';
      } else {
        f = String(r.floor);
      }
      if (!byFloor[f]) byFloor[f] = [];
      byFloor[f].push(r);
    }
    const keys = Object.keys(byFloor).sort((a, b) => {
      if (a === '—') return 1;
      if (b === '—') return -1;
      return Number(a) - Number(b);
    });
    return keys.map((f) => ({
      title: f === '—' ? 'Other' : `Floor ${f}`,
      data: byFloor[f].sort((a, b) => (a.label || '').localeCompare(b.label || '')),
    })).filter((sec) => sec.data.length > 0);
  }, [rooms, search, floorFilter]);


  const renderItem = ({ item: r }) => (
    <TouchableOpacity
      style={[pickerStyles.item, selectedId === r.id && pickerStyles.itemActive]}
      onPress={() => onSelect(r.id)}
      testID={`room-option-${r.id}`}
    >
      <View style={pickerStyles.itemRow}>
        <Text style={[pickerStyles.itemText, selectedId === r.id && pickerStyles.itemTextActive]}>
          {r.label}
        </Text>
        {floorChips.length <= 1 && r.floor != null && (
          <View style={pickerStyles.floorBadge}>
            <Text style={pickerStyles.floorBadgeText}>Floor {r.floor}</Text>
          </View>
        )}
        {!r.accessible && (
          <View style={pickerStyles.limitedBadge}>
            <Text style={pickerStyles.limitedBadgeText}>Limited access</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );


  if (!visible) return null;


  return (
    <View style={pickerStyles.overlay}>
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={pickerStyles.closeBtn} testID="picker-close">
            <Text style={pickerStyles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>


        {floorChips.length > 1 && (
          <View style={pickerStyles.floorChipSection}>
            <Text style={pickerStyles.floorChipHint}>Jump to floor</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={pickerStyles.floorChipScroll}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                style={[pickerStyles.floorChip, floorFilter === null && pickerStyles.floorChipActive]}
                onPress={() => setFloorFilter(null)}
                testID="picker-floor-all"
              >
                <Text style={[pickerStyles.floorChipText, floorFilter === null && pickerStyles.floorChipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>
              {floorChips.map((f) => (
                <TouchableOpacity
                  key={`pf-${f}`}
                  style={[pickerStyles.floorChip, floorFilter === f && pickerStyles.floorChipActive]}
                  onPress={() => setFloorFilter(f)}
                  testID={`picker-floor-${f}`}
                >
                  <Text style={[pickerStyles.floorChipText, floorFilter === f && pickerStyles.floorChipTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}


        <View style={pickerStyles.searchRow}>
          <Text style={pickerStyles.searchIcon}>🔍</Text>
          <TextInput
            style={pickerStyles.searchInput}
            placeholder="Search name, code, or floor number…"
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} testID="search-clear-btn">
              <Text style={pickerStyles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>


        <TouchableOpacity
          style={[pickerStyles.item, !selectedId && pickerStyles.itemActive]}
          onPress={() => onSelect(null)}
        >
          <Text style={[pickerStyles.itemText, !selectedId && pickerStyles.itemTextActive]}>
            — None —
          </Text>
        </TouchableOpacity>


        <SectionList
          style={pickerStyles.list}
          sections={sections}
          keyExtractor={(r) => r.id}
          keyboardShouldPersistTaps="handled"
          renderItem={renderItem}
          renderSectionHeader={({ section: { title: secTitle } }) =>
            secTitle ? (
              <View style={pickerStyles.sectionHeader}>
                <Text style={pickerStyles.sectionHeaderText}>{secTitle}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={pickerStyles.emptyRow}>
              <Text style={pickerStyles.emptyText}>
                {search.length > 0 ? `No rooms match "${search}"` : 'No rooms on this floor'}
              </Text>
            </View>
          }
          stickySectionHeadersEnabled={false}
        />
      </View>
    </View>
  );
}

RoomPickerOverlay.propTypes = {
  visible: PropTypes.bool.isRequired,
  rooms: PropTypes.array.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  selectedId: PropTypes.string,
  defaultFloorFilter: PropTypes.number,
};

// ─── Indoor Directions Panel ─────────────────────────────────────────────────

function IndoorDirectionsPanel({ result, loading, error, onClear, onFloorChangeTap }) {
  const [collapsed, setCollapsed] = useState(false);


  if (!result && !loading && !error) return null;

  return (
    <View style={panelStyles.panel}>
      {/* Drag handle + summary header */}
      <TouchableOpacity
        style={panelStyles.header}
        onPress={() => setCollapsed(c => !c)}
        activeOpacity={0.85}
        testID="directions-panel-toggle"
      >
        <View style={panelStyles.dragHandle} />

        {loading && (
          <View style={panelStyles.summaryRow}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={panelStyles.loadingText}>Calculating route…</Text>
          </View>
        )}

        {error && !loading && (
          <Text style={panelStyles.errorText}>{error}</Text>
        )}

        {result && !loading && (
          <View style={panelStyles.summaryRow}>
            <View style={panelStyles.summaryBadge}>
              <Text style={panelStyles.summaryDuration}>{result.durationText}</Text>
            </View>
            <Text style={panelStyles.summaryDistance}>{result.distanceText} · Indoor</Text>
            <View style={{ flex: 1 }} />
            <Text style={panelStyles.chevron}>{collapsed ? '▲' : '▼'}</Text>
            <TouchableOpacity
              style={panelStyles.clearBtn}
              onPress={onClear}
              testID="indoor-clear-route"
            >
              <Text style={panelStyles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>


      {/* Step list */}
      {!collapsed && result?.steps?.length > 0 && (
        <ScrollView
          style={panelStyles.stepList}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
          {result.steps.map((step, idx) => (
            <DirectionsStepRow
              key={step.id}
              step={step}
              isLast={idx === result.steps.length - 1}
              onFloorChangeTap={onFloorChangeTap}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function DirectionsStepRow({ step, isLast, onFloorChangeTap }) {
  const isFloorChange = !!step.isFloorChange;
  const canTapFloorChange = isFloorChange && !!onFloorChangeTap;
  const stepRowStyles = [panelStyles.stepRow, isFloorChange && panelStyles.stepRowFloorChange];
  const iconBubbleStyles = [
    panelStyles.iconBubble,
    isLast && panelStyles.iconBubbleDest,
    isFloorChange && panelStyles.iconBubbleFloorChange,
  ];
  const instructionStyles = [
    panelStyles.stepInstruction,
    isFloorChange && panelStyles.stepInstructionFloorChange,
  ];
  const connector = isLast
    ? null
    : <View style={[panelStyles.connector, isFloorChange && panelStyles.connectorFloorChange]} />;
  const floorChangeBadge = getFloorChangeBadge(step, isFloorChange);
  const stepMeta = getStepMeta(step, isFloorChange);

  return (
    <TouchableOpacity
      style={stepRowStyles}
      onPress={canTapFloorChange ? () => onFloorChangeTap(step.toFloor) : undefined}
      activeOpacity={isFloorChange ? 0.7 : 1}
      testID={isFloorChange ? `floor-change-step-${step.toFloor}` : undefined}
    >
      <View style={panelStyles.iconCol}>
        <View style={iconBubbleStyles}>
          <Text style={panelStyles.stepIcon}>
            {getStepIcon(step.instruction, isFloorChange)}
          </Text>
        </View>
        {connector}
      </View>
      <View style={panelStyles.stepContent}>
        <Text style={instructionStyles}>{step.instruction}</Text>
        {floorChangeBadge}
        {stepMeta}
      </View>
    </TouchableOpacity>
  );
}

function getFloorChangeBadge(step, isFloorChange) {
  if (!isFloorChange) return null;
  return (
    <View style={panelStyles.floorChangeBadge}>
      <Text style={panelStyles.floorChangeBadgeText}>
        {step.floorChangeType === 'elevator' ? '🛗 Elevator' : '🪜 Stairs'}
      </Text>
    </View>
  );
}

function getStepMeta(step, isFloorChange) {
  if (isFloorChange || (!step.distance && !step.duration)) return null;
  return (
    <View style={panelStyles.stepMeta}>
      {step.distance ? (
        <View style={panelStyles.distBadge}>
          <Text style={panelStyles.distBadgeText}>{step.distance}</Text>
        </View>
      ) : null}
      {step.duration ? (
        <Text style={panelStyles.stepDur}>{step.duration}</Text>
      ) : null}
    </View>
  );
}


IndoorDirectionsPanel.propTypes = {
  result: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onClear: PropTypes.func.isRequired,
  onFloorChangeTap: PropTypes.func,
};

DirectionsStepRow.propTypes = {
  step: PropTypes.object.isRequired,
  isLast: PropTypes.bool.isRequired,
  onFloorChangeTap: PropTypes.func,
};

// ─── Map overlay (SVG path + markers) ───────────────────────────────────────

function PathOverlay({ pathPoints, originNode, destNode, userNode, viewBoxSize, currentGraph, accessibleOnly }) {
  if (!viewBoxSize) return null;

  const { width: vw, height: vh } = viewBoxSize;
  const strokeW = Math.max(3, vw * 0.009);
  const markerR = Math.max(10, vw * 0.022);
  const strokeM = Math.max(2, vw * 0.005);

  const polyPoints = pathPoints && pathPoints.length > 1
    ? pathPoints.map(p => `${p.x},${p.y}`).join(' ')
    : null;

  // Accessible facilities markers
  const facilityMarkers = (accessibleOnly && currentGraph?.nodes)
    ? Object.values(currentGraph.nodes)
      .filter(node => {
        const type = (node.type || '').toLowerCase();
        const label = (node.label || '').toLowerCase();
        const isElevator = type === 'elevator_door';
        const isWashroom = (type === 'room' || type === 'washroom') && label.includes('washroom');
        return node.accessible !== false && (isElevator || isWashroom);
      })
      .map(node => {
        const isElevator = (node.type || '').toLowerCase() === 'elevator_door';
        return (
          <React.Fragment key={node.id}>
            <Circle
              cx={node.x} cy={node.y}
              r={markerR * 1.2}
              fill={isElevator ? '#8B5CF6' : '#06B6D4'}
              stroke="#fff"
              strokeWidth={strokeM * 0.6}
            />
            <SvgText
              x={node.x} y={node.y + markerR * 0.4}
              fontSize={markerR * 1.3}
              fill="#fff"
              textAnchor="middle"
              testID={`facility-icon-${node.id}`}
            >
              {isElevator ? '🛗' : '🚻'}
            </SvgText>
          </React.Fragment>
        );
      })
    : [];

  return (
    <Svg
      style={StyleSheet.absoluteFillObject}
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid meet"
      testID="indoor-path-overlay"
    >
      {/* Accessible Facilities */}
      {facilityMarkers}

      {/* Path polyline */}
      {polyPoints && (
        <Polyline
          points={polyPoints}
          stroke="#3B82F6"
          strokeWidth={strokeW}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
          testID="indoor-path-line"
        />
      )}

      {/* Origin marker – green */}
      {originNode && (
        <>
          <Circle
            cx={originNode.x} cy={originNode.y}
            r={markerR + strokeM}
            fill="rgba(255,255,255,0.7)"
          />
          <Circle
            cx={originNode.x} cy={originNode.y}
            r={markerR}
            fill="#22C55E"
            stroke="#fff"
            strokeWidth={strokeM}
            testID="indoor-origin-marker"
          />
          <Line
            x1={originNode.x} y1={originNode.y - markerR}
            x2={originNode.x} y2={originNode.y - markerR * 2.2}
            stroke="#22C55E"
            strokeWidth={strokeW * 0.7}
            strokeLinecap="round"
          />
        </>
      )}

      {/* Destination marker – red */}
      {destNode && (
        <>
          <Circle
            cx={destNode.x} cy={destNode.y}
            r={markerR + strokeM}
            fill="rgba(255,255,255,0.7)"
          />
          <Circle
            cx={destNode.x} cy={destNode.y}
            r={markerR}
            fill="#EF4444"
            stroke="#fff"
            strokeWidth={strokeM}
            testID="indoor-dest-marker"
          />
          <Line
            x1={destNode.x} y1={destNode.y - markerR}
            x2={destNode.x} y2={destNode.y - markerR * 2.2}
            stroke="#EF4444"
            strokeWidth={strokeW * 0.7}
            strokeLinecap="round"
          />
        </>
      )}

      {/* User position marker – blue ring */}
      {userNode && (
        <>
          <Circle
            cx={userNode.x} cy={userNode.y}
            r={markerR * 1.6}
            fill="rgba(59,130,246,0.15)"
          />
          <Circle
            cx={userNode.x} cy={userNode.y}
            r={markerR}
            fill="#3B82F6"
            stroke="#fff"
            strokeWidth={strokeM}
            testID="indoor-user-marker"
          />
          <Circle
            cx={userNode.x} cy={userNode.y}
            r={markerR * 0.45}
            fill="#fff"
          />
        </>
      )}
    </Svg>
  );
}


PathOverlay.propTypes = {
  pathPoints: PropTypes.array,
  originNode: PropTypes.object,
  destNode: PropTypes.object,
  userNode: PropTypes.object,
  viewBoxSize: PropTypes.shape({ width: PropTypes.number, height: PropTypes.number }),
  currentGraph: PropTypes.object,
  accessibleOnly: PropTypes.bool,
};

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

/**
 * Single-floor Dijkstra must use the graph that actually contains both node ids.
 * Automatically switches to the correct floor if stops share one or if only one is set.
 */
function resolveRoutingSingleFloor(selectedBuilding, selectedFloor, originId, destinationId) {
  if (!selectedBuilding) return selectedFloor;

  const { originFloor, destFloor, commonFloor } = getFloorInfoForStops(
    selectedBuilding,
    originId,
    destinationId
  );

  if (commonFloor != null) return commonFloor;
  if (originFloor != null && !destinationId) return originFloor;
  if (destFloor != null && !originId) return destFloor;

  return selectedFloor;
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

function getFilteredPathPoints(isMultiFloor, allPathPoints, routingGraph, displayFloor) {
  if (!isMultiFloor) return allPathPoints;
  return allPathPoints.filter((p) => {
    const n = routingGraph?.nodes?.[p.id];
    return n?.floor == null || n.floor === displayFloor;
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

function BuildingFloorSelectors({
  buildings,
  selectedBuilding,
  selectedFloor,
  availableOptions,
  onBuildingSelect,
  onFloorSelect,
}) {
  return (
    <>
      <View style={styles.pickerSection}>
        <Text style={styles.sectionLabel}>Building:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {buildings.map((b) => (
            <TouchableOpacity
              key={`bld-${b}`}
              style={[styles.chip, selectedBuilding === b && styles.chipActive]}
              onPress={() => onBuildingSelect(b)}
            >
              <Text style={[styles.chipText, selectedBuilding === b && styles.chipTextActive]}>
                {b}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {selectedBuilding && (
        <View style={styles.pickerSection}>
          <Text style={styles.sectionLabel}>Floor:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            {availableOptions[selectedBuilding]?.map((f) => (
              <TouchableOpacity
                key={`flr-${f}`}
                style={[styles.chip, selectedFloor === f && styles.chipActive]}
                onPress={() => onFloorSelect(f)}
              >
                <Text style={[styles.chipText, selectedFloor === f && styles.chipTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </>
  );
}

function FloorPlanArea({
  isMultiFloor,
  routeFloors,
  displayFloor,
  onFloorSwitch,
  currentGraph,
  mapAspectRatio,
  pathPoints,
  showOriginMarker,
  originNode,
  showDestMarker,
  destNode,
  userPositionNode,
  viewBoxSize,
  result,
  loading,
  error,
  onClearRoute,
  onFloorChangeTap,
  accessibleOnly,
}) {
  return (
    <View style={styles.mapAreaWrapper}>
      {isMultiFloor && routeFloors && (
        <View style={styles.floorSwitcherBar} testID="floor-switcher-bar">
          <Text style={styles.floorSwitcherLabel}>Viewing Floor:</Text>
          {routeFloors.map((f) => (
            <TouchableOpacity
              key={`switch-${f}`}
              style={[
                styles.floorSwitcherBtn,
                displayFloor === f && styles.floorSwitcherBtnActive,
              ]}
              onPress={() => onFloorSwitch(f)}
              testID={`floor-switch-btn-${f}`}
            >
              <Text
                style={[
                  styles.floorSwitcherText,
                  displayFloor === f && styles.floorSwitcherTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {(currentGraph?.svgString || currentGraph?.image) ? (
        <ScrollView
          style={{ flex: 1 }}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mapScrollH}
          bounces={false}
          maximumZoomScale={2.5}
          minimumZoomScale={1}
          bouncesZoom
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.mapScrollV}
            bounces={false}
          >
            <View
              style={[
                styles.mapContainer,
                { aspectRatio: mapAspectRatio, width: SCREEN_WIDTH * 0.85 },
              ]}
            >
              {currentGraph.svgString ? (
                <SvgXml
                  xml={currentGraph.svgString}
                  width="100%"
                  height="100%"
                  testID="indoor-map-image"
                />
              ) : (
                <Image
                  source={currentGraph.image}
                  testID="indoor-map-image"
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              )}

              <PathOverlay
                pathPoints={pathPoints}
                originNode={showOriginMarker ? originNode : null}
                destNode={showDestMarker ? destNode : null}
                userNode={userPositionNode}
                viewBoxSize={viewBoxSize}
                currentGraph={currentGraph}
                accessibleOnly={accessibleOnly}
              />
            </View>
          </ScrollView>
        </ScrollView>
      ) : (
        <View style={styles.emptyMap}>
          <Text style={styles.emptyMapText}>Waiting for floor plan…</Text>
        </View>
      )}

      <IndoorDirectionsPanel
        result={result}
        loading={loading}
        error={error}
        onClear={onClearRoute}
        onFloorChangeTap={onFloorChangeTap}
      />
    </View>
  );
}

BuildingFloorSelectors.propTypes = {
  buildings: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedBuilding: PropTypes.string,
  selectedFloor: PropTypes.number,
  availableOptions: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.number)).isRequired,
  onBuildingSelect: PropTypes.func.isRequired,
  onFloorSelect: PropTypes.func.isRequired,
};

FloorPlanArea.propTypes = {
  isMultiFloor: PropTypes.bool.isRequired,
  routeFloors: PropTypes.arrayOf(PropTypes.number),
  displayFloor: PropTypes.number,
  onFloorSwitch: PropTypes.func.isRequired,
  currentGraph: PropTypes.shape({
    svgString: PropTypes.string,
    image: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
  }),
  mapAspectRatio: PropTypes.number.isRequired,
  pathPoints: PropTypes.arrayOf(PropTypes.object).isRequired,
  showOriginMarker: PropTypes.bool.isRequired,
  originNode: PropTypes.object,
  showDestMarker: PropTypes.bool.isRequired,
  destNode: PropTypes.object,
  userPositionNode: PropTypes.object,
  viewBoxSize: PropTypes.shape({
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
  }).isRequired,
  result: PropTypes.object,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onClearRoute: PropTypes.func.isRequired,
  onFloorChangeTap: PropTypes.func.isRequired,
  accessibleOnly: PropTypes.bool,
};


// ─── Main component ──────────────────────────────────────────────────────────


export default function IndoorMapViewer({ visible, onClose, initialBuildingId }) {
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


  const buildings = Object.keys(availableOptions);


  // ── Initialise from prop ───────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !availableOptions) return;
    const initBldg = resolveInitialBuilding(initialBuildingId, buildings);
    setSelectedBuilding(initBldg);
    const firstFloor = getInitialFloorForBuilding(initBldg, availableOptions);
    setSelectedFloor(firstFloor);
    setDisplayFloor(firstFloor);
    setOriginId(null);
    setDestinationId(null);
    setUserPositionId(null);
    setPickerTarget(null);
  }, [visible, initialBuildingId]);


  // Reset navigation only when the building changes (not when browsing floors).
  useEffect(() => {
    setOriginId(null);
    setDestinationId(null);
    setUserPositionId(null);
  }, [selectedBuilding]);


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


  // Single-floor: follow the floor chip unless both stops share one floor — then show that plan
  // so markers/path align with coordinates. Multi-floor: floor switcher / origin sync.
  useEffect(() => {
    if (isMultiFloor) return;
    const { commonFloor } = getFloorInfoForStops(
      selectedBuilding,
      originId,
      destinationId
    );
    if (commonFloor != null) {
      setDisplayFloor(commonFloor);
      return;
    }
    setDisplayFloor(selectedFloor);
  }, [
    selectedFloor,
    isMultiFloor,
    originId,
    destinationId,
    selectedBuilding,
    availableOptions,
  ]);


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

  const { result, loading, error } = useIndoorDirections({
    graph: routingGraph,
    originId,
    destinationId,
    userPosition: userPositionObj,
    accessibleOnly,
  });


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
    ROOM_SETTER[pickerTarget]?.(roomId);
    closePicker();
  }, [pickerTarget, closePicker]);


  const clearRoute = useCallback(() => {
    setOriginId(null);
    setDestinationId(null);
    setUserPositionId(null);
  }, []);

  const handleBuildingSelect = useCallback((building) => {
    setSelectedBuilding(building);
    setSelectedFloor(getDefaultFloorForBuilding(building, availableOptions));
  }, [availableOptions]);

  const handleSwapOriginDestination = useCallback(() => {
    setOriginId(destinationId);
    setDestinationId(originId);
  }, [originId, destinationId]);


  // ── Floor switcher (multi-floor route) ────────────────────────────────
  const routeFloors = useMemo(() => {
    if (!isMultiFloor || !routingFloorsNeeded) return null;
    return [...routingFloorsNeeded].sort((a, b) => a - b);
  }, [isMultiFloor, routingFloorsNeeded]);


  const handleFloorChangeTap = useCallback((toFloor) => {
    setDisplayFloor(toFloor);
  }, []);


  // ── Derived display values ─────────────────────────────────────────────
  // For overlay: only show path points that are on the current displayFloor.
  const originNode = originId ? routingGraph?.nodes?.[originId] : null;
  const destNode = destinationId ? routingGraph?.nodes?.[destinationId] : null;
  const allPathPoints = result?.pathPoints ?? [];
  const pathPoints = getFilteredPathPoints(
    isMultiFloor,
    allPathPoints,
    routingGraph,
    displayFloor
  );


  // Only show origin/dest markers when they are on the displayed floor.
  const showOriginMarker = originNode?.floor == null || originNode?.floor === displayFloor;
  const showDestMarker = destNode?.floor == null || destNode?.floor === displayFloor;


  // Use the graph's viewBox (computed from node bounds for new graphs) to
  // set the container aspect ratio.  This ensures the path overlay and the
  // SVG/PNG background share the same proportional layout.
  const mapAspectRatio = useMemo(() => {
    return viewBoxSize.width / viewBoxSize.height;
  }, [viewBoxSize]);


  const originLabel = originId
    ? (routingGraph?.nodes?.[originId]?.label ?? originId)
    : null;
  const destLabel = destinationId
    ? (routingGraph?.nodes?.[destinationId]?.label ?? destinationId)
    : null;
  const userLabel = userPositionId
    ? (routingGraph?.nodes?.[userPositionId]?.label ?? userPositionId)
    : null;


  // ── Picker titles ──────────────────────────────────────────────────────
  const pickerTitles = {
    origin: 'Select Origin',
    destination: 'Select Destination',
    userPosition: 'Set My Position',
  };
  const pickerSelectedId = getPickerSelectedId(pickerTarget, originId, destinationId, userPositionId);


  if (!visible) return null;


  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>


            {/* ── Header ──────────────────────────────────────────── */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Indoor Maps</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>


            <BuildingFloorSelectors
              buildings={buildings}
              selectedBuilding={selectedBuilding}
              selectedFloor={selectedFloor}
              availableOptions={availableOptions}
              onBuildingSelect={handleBuildingSelect}
              onFloorSelect={setSelectedFloor}
            />


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


            <FloorPlanArea
              isMultiFloor={isMultiFloor}
              routeFloors={routeFloors}
              displayFloor={displayFloor}
              onFloorSwitch={setDisplayFloor}
              currentGraph={currentGraph}
              mapAspectRatio={mapAspectRatio}
              pathPoints={pathPoints}
              showOriginMarker={showOriginMarker}
              originNode={originNode}
              showDestMarker={showDestMarker}
              destNode={destNode}
              userPositionNode={userPositionNode}
              viewBoxSize={viewBoxSize}
              result={result}
              loading={loading}
              error={error}
              onClearRoute={clearRoute}
              onFloorChangeTap={handleFloorChangeTap}
              accessibleOnly={accessibleOnly}
            />

            {/* ── Room picker overlay ──────────────────────────────── */}
            <RoomPickerOverlay
              visible={!!pickerTarget}
              rooms={pickerTarget === 'userPosition' ? roomNodes : allRoomNodes}
              defaultFloorFilter={
                pickerTarget === 'origin' ? null : selectedFloor
              }
              onSelect={handleRoomSelect}
              onClose={closePicker}
              title={pickerTitles[pickerTarget] ?? 'Select Room'}
              selectedId={pickerSelectedId}
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
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const BLUE = '#3B82F6';
const GREEN = '#22C55E';
const RED = '#EF4444';


const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.75)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 50 : 30,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 12,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: { fontSize: 16, fontWeight: '800', color: '#64748B' },

  // Building / floor chip rows
  pickerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginRight: 10,
    width: 58,
  },
  chipScroll: { paddingRight: 16, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#FFFFFF' },

  // Navigation From / To row
  navSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 6,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  navBtnOrigin: { borderColor: GREEN + '55' },
  navBtnDest: { borderColor: RED + '55' },
  navBtnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
  },
  navBtnDotDest: { backgroundColor: RED },
  navBtnContent: { flex: 1 },
  navBtnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navBtnValue: { fontSize: 13, fontWeight: '600', color: '#0F172A', marginTop: 1 },
  navBtnPlaceholder: { color: '#94A3B8', fontWeight: '400' },
  navBtnArrow: { fontSize: 10, color: '#94A3B8' },

  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapIcon: { fontSize: 16, color: '#64748B' },

  // Options row (accessible + my position)
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  optionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionToggleActive: { backgroundColor: '#EFF6FF', borderColor: BLUE },
  optionToggleText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  optionToggleTextActive: { color: BLUE },

  myPositionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  myPositionBtnActive: { backgroundColor: '#EFF6FF', borderColor: BLUE },
  myPositionIcon: { fontSize: 13 },
  myPositionText: { fontSize: 12, fontWeight: '600', color: '#475569', flex: 1 },

  // Map
  mapAreaWrapper: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  mapScrollH: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  mapScrollV: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  mapContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  emptyMap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyMapText: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },

  // Floor switcher bar (shown only for multi-floor routes)
  floorSwitcherBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1E293B',
    gap: 8,
  },
  floorSwitcherLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginRight: 4,
  },
  floorSwitcherBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#334155',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  floorSwitcherBtnActive: {
    backgroundColor: BLUE,
    borderColor: '#93C5FD',
  },
  floorSwitcherText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  floorSwitcherTextActive: { color: '#fff' },
});

// ── Directions panel styles ──────────────────────────────────────────────────
const panelStyles = StyleSheet.create({
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    maxHeight: '55%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: BLUE,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignSelf: 'center',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  summaryDuration: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  summaryDistance: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  loadingText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginLeft: 8 },
  errorText: { flex: 1, fontSize: 13, color: '#fecaca' },
  chevron: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  stepList: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  stepRow: { flexDirection: 'row', paddingBottom: 4, minHeight: 56 },
  iconCol: { width: 36, alignItems: 'center', marginRight: 12 },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBubbleDest: { backgroundColor: '#EFF6FF', borderColor: BLUE },
  stepIcon: { fontSize: 15 },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 3,
  },
  stepContent: { flex: 1, paddingTop: 5, paddingBottom: 10 },
  stepInstruction: { fontSize: 14, fontWeight: '500', color: '#1A202C', lineHeight: 20 },
  stepMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  distBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  distBadgeText: { fontSize: 12, fontWeight: '600', color: BLUE },
  stepDur: { fontSize: 12, color: '#718096' },


  // Floor-change step styling
  stepRowFloorChange: {
    backgroundColor: '#FFF7ED',
    borderRadius: 10,
    marginHorizontal: 2,
    marginBottom: 2,
    paddingHorizontal: 6,
  },
  iconBubbleFloorChange: {
    backgroundColor: '#FED7AA',
    borderColor: '#F97316',
  },
  connectorFloorChange: { backgroundColor: '#F97316', opacity: 0.4 },
  stepInstructionFloorChange: { color: '#C2410C', fontWeight: '700' },
  floorChangeBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#FFEDD5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#F97316',
  },
  floorChangeBadgeText: { fontSize: 11, fontWeight: '700', color: '#EA580C' },
});


// ── Room picker styles ───────────────────────────────────────────────────────
const pickerStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.6)',
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, fontWeight: '800', color: '#64748B' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 15, color: '#0F172A', padding: 0 },
  clearSearch: { fontSize: 14, color: '#94A3B8', fontWeight: '700' },
  floorChipSection: {
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  floorChipHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  floorChipScroll: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
    alignItems: 'center',
  },
  floorChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  floorChipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  floorChipText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  floorChipTextActive: { color: '#FFFFFF' },
  sectionHeader: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionHeaderText: { fontSize: 12, fontWeight: '800', color: '#475569', letterSpacing: 0.3 },
  list: { flexGrow: 1 },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemActive: { backgroundColor: '#EFF6FF' },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemText: { fontSize: 15, fontWeight: '500', color: '#334155' },
  itemTextActive: { color: BLUE, fontWeight: '700' },
  limitedBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  limitedBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  emptyRow: { paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94A3B8' },
  // Floor badge shown next to room name in the picker
  floorBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  floorBadgeText: { fontSize: 11, fontWeight: '700', color: BLUE },
});
