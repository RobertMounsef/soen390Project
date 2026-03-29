/**
 * ───────────────────────────────────────────────────────────────────────────
 * DESIGN PATTERN: Component Pattern (React Native)
 * ───────────────────────────────────────────────────────────────────────────
 * DirectionsPanel is a reusable collapsible panel that renders route summary,
 * travel-mode selector, and turn-by-turn step list.  It encapsulates its own
 * collapse/expand state and can be placed in any screen that needs to display
 * navigation directions.
 * ───────────────────────────────────────────────────────────────────────────
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import PropTypes from 'prop-types';

// Parses a step instruction and returns an arrow/icon
function getDirectionIcon(instruction = '') {
  const t = instruction.toLowerCase();
  if (t.includes('slight left') || t.includes('keep left')) return '↖';
  if (t.includes('slight right') || t.includes('keep right')) return '↗';
  if (t.includes('turn left') || t.includes('left')) return '←';
  if (t.includes('turn right') || t.includes('right')) return '→';
  if (t.includes('u-turn') || t.includes('uturn')) return '↩';
  if (t.includes('roundabout') || t.includes('exit')) return '↻';
  if (t.includes('merge')) return '⤵';
  if (t.includes('arrive') || t.includes('destination')) return '⚑';
  if (t.includes('ferry')) return '⛴';
  if (t.includes('transit') || t.includes('bus') || t.includes('subway') || t.includes('train') || t.includes('metro')) return '🚌';
  return '↑';
}

// Base travel modes
const BASE_TRAVEL_MODES = [
  { label: 'Walk', value: 'walking', icon: '🚶' },
  { label: 'Drive', value: 'driving', icon: '🚗' },
  { label: 'Transit', value: 'transit', icon: '🚌' },
];

// Shuttle mode
const SHUTTLE_MODE = { label: 'Shuttle', value: 'shuttle', icon: '🚍' };

function MapDirectionsStepRow({ step, isLast, onOpenIndoorMap }) {
  if (step.kind === 'segment') {
    return (
      <View style={styles.segmentBlock}>
        <Text style={styles.segmentTitle}>{step.title}</Text>
      </View>
    );
  }
  if (step.kind === 'transition') {
    return (
      <View style={styles.transitionBlock}>
        <View style={styles.transitionRow}>
          <Text style={styles.transitionGlyph}>↔</Text>
          <Text style={styles.transitionText}>{step.instruction}</Text>
        </View>
        {step.openIndoor && onOpenIndoorMap ? (
          <TouchableOpacity
            style={styles.openIndoorButton}
            onPress={() => onOpenIndoorMap(step.openIndoor)}
            accessibilityRole="button"
            accessibilityLabel="View indoor floor plan for this building"
            testID={`directions-open-indoor-${step.openIndoor.buildingId}`}
          >
            <Text style={styles.openIndoorButtonText}>🏢 View floor plan</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  const isShuttleStep = !!step.isShuttleStep;
  const instruction = step.instruction ?? '';
  return (
    <View style={[styles.stepRow, isLast && styles.stepRowLast]}>
      <View style={styles.stepIconCol}>
        <View
          style={[
            styles.iconBubble,
            isLast && styles.iconBubbleLast,
            isShuttleStep && styles.iconBubbleShuttle,
          ]}
        >
          <Text style={styles.directionIcon}>
            {isShuttleStep ? '🚍' : getDirectionIcon(instruction)}
          </Text>
        </View>
        {!isLast && <View style={[styles.connector, isShuttleStep && styles.connectorShuttle]} />}
      </View>

      <View style={styles.stepContent}>
        <Text style={[styles.stepInstruction, isShuttleStep && styles.stepInstructionShuttle]}>
          {instruction}
        </Text>
        {(step.distance || step.duration) && (
          <View style={styles.stepMeta}>
            {step.distance && (
              <View style={[styles.distanceBadge, isShuttleStep && styles.distanceBadgeShuttle]}>
                <Text style={[styles.distanceBadgeText, isShuttleStep && styles.distanceBadgeTextShuttle]}>
                  {step.distance}
                </Text>
              </View>
            )}
            {step.duration && <Text style={styles.stepDuration}>{step.duration}</Text>}
            {isShuttleStep && step.isLastBus && (
              <View style={styles.lastBusBadge}>
                <Text style={styles.lastBusBadgeText}>⛔ Last bus</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const openIndoorPayloadPropType = PropTypes.shape({
  buildingId: PropTypes.string.isRequired,
  floor: PropTypes.number,
  entranceNodeId: PropTypes.string,
  destinationRoomId: PropTypes.string,
});

MapDirectionsStepRow.propTypes = {
  step: PropTypes.shape({
    kind: PropTypes.string,
    title: PropTypes.string,
    instruction: PropTypes.string,
    openIndoor: openIndoorPayloadPropType,
    distance: PropTypes.string,
    duration: PropTypes.string,
    isShuttleStep: PropTypes.bool,
    isLastBus: PropTypes.bool,
  }).isRequired,
  isLast: PropTypes.bool.isRequired,
  onOpenIndoorMap: PropTypes.func,
};

MapDirectionsStepRow.defaultProps = {
  onOpenIndoorMap: undefined,
};

export default function DirectionsPanel({
  distanceText,
  durationText,
  loading,
  error,
  onClear,
  travelMode,
  onModeChange,
  steps = [],
  showShuttle = false,
  nextDeparture = null,
  collapsed: collapsedProp,
  onToggleCollapse,
  onOpenIndoorMap,
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(true);

  const isControlled = collapsedProp !== undefined && onToggleCollapse !== undefined;
  const collapsed = isControlled ? collapsedProp : internalCollapsed;
  const toggleCollapsed = isControlled
    ? onToggleCollapse
    : () => setInternalCollapsed((prev) => !prev);

  const travelModes = showShuttle ? [...BASE_TRAVEL_MODES, SHUTTLE_MODE] : BASE_TRAVEL_MODES;

  const renderSummary = () => {
    if (loading) {
      return (
        <View style={styles.summaryInfo}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.summaryLoadingText}>Calculating route…</Text>
        </View>
      );
    }
    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }
    let departureLabel = '';
    if (travelMode === 'shuttle' && nextDeparture) {
      const lastBusWarn = nextDeparture.isLastBus ? ' ⛔ last bus' : '';
      departureLabel = ` · Departs ${nextDeparture.label}${lastBusWarn}`;
    }

    return (
      <View style={styles.summaryInfo}>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryDuration}>{durationText}</Text>
          <Text style={styles.summaryDistance}>
            {distanceText}
            {departureLabel}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.panel, collapsed && styles.collapsedPanel]}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={toggleCollapsed} activeOpacity={0.85}>
        <View style={styles.dragHandle} />
        <View style={styles.headerInner}>
          {renderSummary()}
          <View style={styles.headerActions}>
            <Text style={styles.chevron}>{collapsed ? '▲' : '▼'}</Text>
            <TouchableOpacity style={styles.clearBtn} onPress={onClear} testID="Clear route">
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {!collapsed && (
        <>
          {/* Travel modes */}
          <View style={styles.modeRow}>
            {travelModes.map((mode) => {
              const isActive = travelMode === mode.value;
              return (
                <TouchableOpacity
                  key={mode.value}
                  style={[
                    styles.modeBtn,
                    isActive && styles.modeBtnActive,
                    mode.value === 'shuttle' && styles.modeBtnShuttle,
                    mode.value === 'shuttle' && isActive && styles.modeBtnShuttleActive,
                  ]}
                  onPress={() => onModeChange(mode.value)}
                >
                  <Text style={styles.modeIcon}>{mode.icon}</Text>
                  <Text style={[styles.modeBtnText, isActive && styles.modeBtnTextActive]}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Steps list */}
          {steps.length > 0 && (
            <ScrollView style={styles.stepList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {steps.map((step, idx) => (
                <MapDirectionsStepRow
                  key={step.id ?? `row-${idx}`}
                  step={step}
                  isLast={idx === steps.length - 1}
                  onOpenIndoorMap={onOpenIndoorMap}
                />
              ))}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

DirectionsPanel.propTypes = {
  distanceText: PropTypes.string.isRequired,
  durationText: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onClear: PropTypes.func.isRequired,
  travelMode: PropTypes.oneOf(['walking', 'driving', 'transit', 'shuttle']).isRequired,
  onModeChange: PropTypes.func.isRequired,
  steps: PropTypes.arrayOf(PropTypes.object),
  showShuttle: PropTypes.bool,
  nextDeparture: PropTypes.object,
  collapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func,
  onOpenIndoorMap: PropTypes.func,
};

DirectionsPanel.defaultProps = {
  error: null,
  steps: [],
  onOpenIndoorMap: undefined,
};

// ─── Styles ───────────────────────────────────────────────────────────────
const BRAND = '#DC3220';
const BRAND_DARK = '#A32215';

const styles = StyleSheet.create({
  panel: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 10, maxHeight: '55%', overflow: 'hidden' },
  collapsedPanel: { maxHeight: 90 },
  header: { backgroundColor: BRAND, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)', alignSelf: 'center', marginBottom: 10 },
  headerInner: { flexDirection: 'row', alignItems: 'center' },
  summaryInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  summaryBlock: { flexDirection: 'column' },
  summaryDuration: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  summaryDistance: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  summaryLoadingText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginLeft: 8 },
  errorText: { flex: 1, fontSize: 13, color: '#fecaca' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chevron: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  clearBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  clearBtnText: { fontSize: 13, color: '#fff', fontWeight: '700' },

  modeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },

  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: 'transparent' },

  modeBtnActive: { backgroundColor: '#fff5f7', borderColor: BRAND },

  modeIcon: { fontSize: 15 },

  modeBtnText: { fontSize: 13, color: '#4a5568', fontWeight: '600' },

  modeBtnTextActive: { color: BRAND_DARK, fontWeight: '700' },

  modeBtnShuttle: { borderColor: '#005AB5' },

  modeBtnShuttleActive: { backgroundColor: '#EFF4FA', borderColor: '#005AB5' },

  stepList: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4 },

  segmentBlock: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  segmentTitle: { fontSize: 13, fontWeight: '800', color: BRAND_DARK, letterSpacing: 0.2 },

  transitionBlock: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  transitionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  transitionGlyph: { fontSize: 14, color: '#64748b', marginTop: 1 },
  transitionText: { flex: 1, fontSize: 13, color: '#334155', lineHeight: 19 },

  openIndoorButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: BRAND,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  openIndoorButtonText: { fontSize: 13, fontWeight: '700', color: BRAND_DARK },

  stepRow: { flexDirection: 'row', paddingBottom: 4, minHeight: 60 },

  stepRowLast: { minHeight: 44 },

  stepIconCol: { width: 36, alignItems: 'center', marginRight: 12 },

  iconBubble: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },

  iconBubbleLast: { backgroundColor: '#fff5f7', borderColor: BRAND },

  directionIcon: { fontSize: 16, color: '#1a202c' },

  connector: { flex: 1, width: 2, backgroundColor: '#e2e8f0', marginVertical: 3 },

  iconBubbleShuttle: { backgroundColor: '#005AB5', borderColor: '#005AB5' },

  connectorShuttle: { backgroundColor: '#005AB5' },

  stepContent: { flex: 1, paddingTop: 6, paddingBottom: 10 },

  stepInstruction: { fontSize: 14, fontWeight: '500', color: '#1a202c', lineHeight: 20 },

  stepInstructionShuttle: { fontWeight: '700', color: '#005AB5' },

  stepMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 6 },

  distanceBadge: { backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },

  distanceBadgeText: { fontSize: 12, fontWeight: '600', color: '#4a5568' },

  distanceBadgeShuttle: { backgroundColor: '#dbeafe' },

  distanceBadgeTextShuttle: { color: '#005AB5' },

  stepDuration: { fontSize: 12, color: '#718096' },

  lastBusBadge: { backgroundColor: '#fef2f2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },

  lastBusBadgeText: { fontSize: 11, fontWeight: '700', color: '#DC3220' },
});