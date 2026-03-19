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
  Dimensions,
  Platform,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, Line, SvgXml } from 'react-native-svg';
import PropTypes from 'prop-types';
import { getAvailableFloors, getFloorGraph } from '../floor_plans/waypoints/waypointsIndex';
import useIndoorDirections from '../hooks/useIndoorDirections';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStepIcon(instruction = '') {
  const t = instruction.toLowerCase();
  if (t.includes('turn left'))  return '←';
  if (t.includes('turn right')) return '→';
  if (t.includes('turn around') || t.includes('u-turn')) return '↩';
  if (t.includes('arrive') || t.includes('destination')) return '⚑';
  if (t.includes('start') || t.includes('you are'))      return '●';
  return '↑';
}

// ─── Room Picker Overlay ────────────────────────────────────────────────────

function RoomPickerOverlay({ visible, rooms, onSelect, onClose, title, selectedId }) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) setSearch('');
  }, [visible]);

  if (!visible) return null;

  const normalise = s => s.toLowerCase().replaceAll('-', '');
  const filtered = rooms.filter(r =>
    normalise(r.label).includes(normalise(search))
  );

  return (
    <View style={pickerStyles.overlay}>
      <View style={pickerStyles.sheet}>
        {/* Header */}
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={pickerStyles.closeBtn} testID="picker-close">
            <Text style={pickerStyles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={pickerStyles.searchRow}>
          <Text style={pickerStyles.searchIcon}>🔍</Text>
          <TextInput
            style={pickerStyles.searchInput}
            placeholder="Search rooms…"
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={pickerStyles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* None option */}
        <TouchableOpacity
          style={[pickerStyles.item, !selectedId && pickerStyles.itemActive]}
          onPress={() => onSelect(null)}
        >
          <Text style={[pickerStyles.itemText, !selectedId && pickerStyles.itemTextActive]}>
            — None —
          </Text>
        </TouchableOpacity>

        {/* Room list */}
        <ScrollView style={pickerStyles.list} keyboardShouldPersistTaps="handled">
          {filtered.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[pickerStyles.item, selectedId === r.id && pickerStyles.itemActive]}
              onPress={() => onSelect(r.id)}
              testID={`room-option-${r.id}`}
            >
              <View style={pickerStyles.itemRow}>
                <Text style={[pickerStyles.itemText, selectedId === r.id && pickerStyles.itemTextActive]}>
                  {r.label}
                </Text>
                {!r.accessible && (
                  <View style={pickerStyles.limitedBadge}>
                    <Text style={pickerStyles.limitedBadgeText}>Limited access</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <View style={pickerStyles.emptyRow}>
              <Text style={pickerStyles.emptyText}>No rooms match "{search}"</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

RoomPickerOverlay.propTypes = {
  visible:    PropTypes.bool.isRequired,
  rooms:      PropTypes.array.isRequired,
  onSelect:   PropTypes.func.isRequired,
  onClose:    PropTypes.func.isRequired,
  title:      PropTypes.string.isRequired,
  selectedId: PropTypes.string,
};

// ─── Indoor Directions Panel ─────────────────────────────────────────────────

function IndoorDirectionsPanel({ result, loading, error, onClear }) {
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
          {result.steps.map((step, idx) => {
            const isLast = idx === result.steps.length - 1;
            return (
              <View key={step.id} style={panelStyles.stepRow}>
                <View style={panelStyles.iconCol}>
                  <View style={[panelStyles.iconBubble, isLast && panelStyles.iconBubbleDest]}>
                    <Text style={panelStyles.stepIcon}>{getStepIcon(step.instruction)}</Text>
                  </View>
                  {!isLast && <View style={panelStyles.connector} />}
                </View>
                <View style={panelStyles.stepContent}>
                  <Text style={panelStyles.stepInstruction}>{step.instruction}</Text>
                  {(step.distance || step.duration) && (
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
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

IndoorDirectionsPanel.propTypes = {
  result:  PropTypes.object,
  loading: PropTypes.bool.isRequired,
  error:   PropTypes.string,
  onClear: PropTypes.func.isRequired,
};

// ─── Map overlay (SVG path + markers) ───────────────────────────────────────

function PathOverlay({ pathPoints, originNode, destNode, userNode, viewBoxSize }) {
  if (!viewBoxSize) return null;

  const { width: vw, height: vh } = viewBoxSize;
  const strokeW  = Math.max(3, vw * 0.009);
  const markerR  = Math.max(10, vw * 0.022);
  const strokeM  = Math.max(2, vw * 0.005);

  const polyPoints = pathPoints && pathPoints.length > 1
    ? pathPoints.map(p => `${p.x},${p.y}`).join(' ')
    : null;

  return (
    <Svg
      style={StyleSheet.absoluteFillObject}
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid meet"
      testID="indoor-path-overlay"
    >
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
  pathPoints:  PropTypes.array,
  originNode:  PropTypes.object,
  destNode:    PropTypes.object,
  userNode:    PropTypes.object,
  viewBoxSize: PropTypes.shape({ width: PropTypes.number, height: PropTypes.number }),
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

// ─── Main component ──────────────────────────────────────────────────────────

export default function IndoorMapViewer({ visible, onClose, initialBuildingId }) {
  // ── Building / floor selection ─────────────────────────────────────────
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor,    setSelectedFloor]    = useState(null);

  // ── Navigation state ───────────────────────────────────────────────────
  const [originId,      setOriginId]      = useState(null);
  const [destinationId, setDestinationId] = useState(null);
  const [userPositionId, setUserPositionId] = useState(null);
  const [accessibleOnly, setAccessibleOnly] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────
  // pickerTarget: 'origin' | 'destination' | 'userPosition' | null
  const [pickerTarget, setPickerTarget] = useState(null);

  // ── Available options ──────────────────────────────────────────────────
  const availableOptions = useMemo(() => {
    const floors = getAvailableFloors();
    const map = {};
    floors.forEach(({ building, floor }) => {
      if (!map[building]) map[building] = [];
      if (typeof floor === 'number' && !Number.isNaN(floor)) {
        map[building].push(floor);
      }
    });
    Object.keys(map).forEach(b => map[b].sort((a, b) => a - b));
    return map;
  }, []);

  const buildings = Object.keys(availableOptions);

  // ── Initialise from prop ───────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !availableOptions) return;
    const initBldg = resolveInitialBuilding(initialBuildingId, buildings);
    setSelectedBuilding(initBldg);
    if (initBldg && availableOptions[initBldg]?.length > 0) {
      setSelectedFloor(availableOptions[initBldg][0]);
    }
    setOriginId(null);
    setDestinationId(null);
    setUserPositionId(null);
    setPickerTarget(null);
  }, [visible, initialBuildingId]);

  // Reset navigation when building or floor changes
  useEffect(() => {
    setOriginId(null);
    setDestinationId(null);
    setUserPositionId(null);
  }, [selectedBuilding, selectedFloor]);

  // ── Graph & rooms ──────────────────────────────────────────────────────
  const currentGraph = useMemo(() => {
    if (!selectedBuilding || selectedFloor === null) return null;
    return getFloorGraph(selectedBuilding, selectedFloor);
  }, [selectedBuilding, selectedFloor]);

  const allNodes = useMemo(() => {
    if (!currentGraph?.nodes) return [];
    return Object.entries(currentGraph.nodes)
      .map(([id, data]) => ({
        id,
        ...data,
        // Ensure every node has a non-empty display label
        label: data.label || id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [currentGraph]);

  const roomNodes = useMemo(
    () => allNodes.filter((node) => {
      const type = (node.type || '').toString().toLowerCase();
      const label = (node.label || '').toString().toLowerCase();
      const id = (node.id || '').toString();
      return type === 'room' && !label.includes('corridor') && !id.includes('__HUB');
    }),
    [allNodes]
  );

  const viewBoxSize = useMemo(() => {
    if (!currentGraph?.viewBox) return { width: 1024, height: 1024 };
    const parts = currentGraph.viewBox.split(' ').map(Number);
    return parts.length === 4
      ? { width: parts[2], height: parts[3] }
      : { width: 1024, height: 1024 };
  }, [currentGraph]);

  // ── Direction hook ─────────────────────────────────────────────────────
  const userPositionNode = userPositionId ? currentGraph?.nodes?.[userPositionId] : null;

  const { result, loading, error } = useIndoorDirections({
    graph: currentGraph,
    originId,
    destinationId,
    userPosition: userPositionNode
      ? { x: userPositionNode.x, y: userPositionNode.y }
      : null,
    accessibleOnly,
  });

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

  // ── Derived display values ─────────────────────────────────────────────
  const originNode    = originId      ? currentGraph?.nodes?.[originId]      : null;
  const destNode      = destinationId ? currentGraph?.nodes?.[destinationId] : null;
  const pathPoints    = result?.pathPoints ?? [];

  // Use the graph's viewBox (computed from node bounds for new graphs) to
  // set the container aspect ratio.  This ensures the path overlay and the
  // SVG/PNG background share the same proportional layout.
  const mapAspectRatio = useMemo(() => {
    return viewBoxSize.width / viewBoxSize.height;
  }, [viewBoxSize]);

  const originLabel = originId      ? (currentGraph?.nodes?.[originId]?.label      ?? originId)      : null;
  const destLabel   = destinationId ? (currentGraph?.nodes?.[destinationId]?.label ?? destinationId) : null;
  const userLabel   = userPositionId ? (currentGraph?.nodes?.[userPositionId]?.label ?? userPositionId) : null;

  // ── Picker titles ──────────────────────────────────────────────────────
  const pickerTitles = {
    origin:       'Select Origin',
    destination:  'Select Destination',
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

            {/* ── Building selection ──────────────────────────────── */}
            <View style={styles.pickerSection}>
              <Text style={styles.sectionLabel}>Building:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScroll}
              >
                {buildings.map(b => (
                  <TouchableOpacity
                    key={'bld-' + b}
                    style={[styles.chip, selectedBuilding === b && styles.chipActive]}
                    onPress={() => {
                      setSelectedBuilding(b);
                      if (availableOptions[b]?.length > 0) {
                        setSelectedFloor(availableOptions[b][0]);
                      } else {
                        setSelectedFloor(null);
                      }
                    }}
                  >
                    <Text style={[styles.chipText, selectedBuilding === b && styles.chipTextActive]}>
                      {b}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* ── Floor selection ─────────────────────────────────── */}
            {selectedBuilding && (
              <View style={styles.pickerSection}>
                <Text style={styles.sectionLabel}>Floor:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipScroll}
                >
                  {availableOptions[selectedBuilding]?.map(f => (
                    <TouchableOpacity
                      key={'flr-' + f}
                      style={[styles.chip, selectedFloor === f && styles.chipActive]}
                      onPress={() => setSelectedFloor(f)}
                    >
                      <Text style={[styles.chipText, selectedFloor === f && styles.chipTextActive]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

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
                onPress={() => {
                  const tmp = originId;
                  setOriginId(destinationId);
                  setDestinationId(tmp);
                }}
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

            {/* ── Map area ────────────────────────────────────────── */}
            <View style={styles.mapAreaWrapper}>
              {(currentGraph?.svgString || currentGraph?.image) ? (
                <ScrollView
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
                      {/* Prefer vector SVG floor plan for accurate overlay alignment */}
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

                      {/* SVG path + markers overlay */}
                      <PathOverlay
                        pathPoints={pathPoints}
                        originNode={originNode}
                        destNode={destNode}
                        userNode={userPositionNode}
                        viewBoxSize={viewBoxSize}
                      />
                    </View>
                  </ScrollView>
                </ScrollView>
              ) : (
                <View style={styles.emptyMap}>
                  <Text style={styles.emptyMapText}>Waiting for floor plan…</Text>
                </View>
              )}

              {/* Directions panel – absolute overlay at bottom of map */}
              <IndoorDirectionsPanel
                result={result}
                loading={loading}
                error={error}
                onClear={clearRoute}
              />
            </View>

            {/* ── Room picker overlay ──────────────────────────────── */}
            <RoomPickerOverlay
              visible={!!pickerTarget}
              rooms={roomNodes}
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
  visible:           PropTypes.bool.isRequired,
  onClose:           PropTypes.func.isRequired,
  initialBuildingId: PropTypes.string,
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const BLUE  = '#3B82F6';
const GREEN = '#22C55E';
const RED   = '#EF4444';

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
  navBtnDest:   { borderColor: RED   + '55' },
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
});

// ── Directions panel styles ──────────────────────────────────────────────────
const panelStyles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  errorText:   { flex: 1, fontSize: 13, color: '#fecaca' },
  chevron:     { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
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
  stepRow:  { flexDirection: 'row', paddingBottom: 4, minHeight: 56 },
  iconCol:  { width: 36, alignItems: 'center', marginRight: 12 },
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
  stepIcon:       { fontSize: 15 },
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
  stepDur:       { fontSize: 12, color: '#718096' },
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
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 15, color: '#0F172A', padding: 0 },
  clearSearch: { fontSize: 14, color: '#94A3B8', fontWeight: '700' },
  list:        { flexGrow: 1 },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemActive:   { backgroundColor: '#EFF6FF' },
  itemRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemText:     { fontSize: 15, fontWeight: '500', color: '#334155' },
  itemTextActive: { color: BLUE, fontWeight: '700' },
  limitedBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  limitedBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  emptyRow: { paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' },
  emptyText:  { fontSize: 14, color: '#94A3B8' },
});
