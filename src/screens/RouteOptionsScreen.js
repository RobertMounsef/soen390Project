// src/screens/RouteOptionsScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import PropTypes from 'prop-types';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import TransportModeSelector from '../components/TransportModeSelector';
import { calculateRoute } from '../services/routing/routeCalculator';
import { getBuildingsByCampus, getBuildingInfo } from '../services/api/buildings';
import { getBuildingId } from '../utils/geolocation';
import { getFeatureCenter } from '../utils/geometry';

function formatBuildingLabel(name = '', code = '') {
  const safeName = name || '';
  const safeCode = code || '';
  return safeCode ? `${safeName} (${safeCode})` : safeName;
}

function buildCampusBuildings() {
  const byId = new Map();

  const sgwBuildings = getBuildingsByCampus('SGW') || [];
  const loyBuildings = getBuildingsByCampus('LOY') || [];
  const allBuildings = [...sgwBuildings, ...loyBuildings];

  if (!Array.isArray(allBuildings)) return [];

  for (const feature of allBuildings) {
    const properties = feature?.properties || {};
    const { id: rawId, code: rawCode, name: rawName, campus: rawCampus } = properties;

    const id = rawId || getBuildingId(feature);
    if (!id || byId.has(id)) continue;

    const info = getBuildingInfo(id);
    const code = rawCode || info?.code || id;
    const name = rawName || info?.name || id;
    const campus = rawCampus || info?.campus || '';

    byId.set(String(id), {
      id: String(id),
      code: String(code),
      name: String(name),
      campus: String(campus),
    });
  }

  return Array.from(byId.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

function buildAllCampusFeatures() {
  const sgw = getBuildingsByCampus('SGW') || [];
  const loy = getBuildingsByCampus('LOY') || [];
  return [...sgw, ...loy];
}

function normalizeSpaces(text = '') {
  // replace all common whitespace chars with spaces, then collapse
  const oneLine = String(text)
    .replaceAll('\n', ' ')
    .replaceAll('\r', ' ')
    .replaceAll('\t', ' ')
    .trim();
  // collapse multiple spaces without regex replace
  return oneLine.split(' ').filter(Boolean).join(' ');
}

function makeStepKey(step = {}, idx = 0) {
  const i = normalizeSpaces(step.instruction || '').slice(0, 80);
  const d = step.distanceText || '';
  const t = step.durationText || '';
  const base = `${i}|${d}|${t}`;
  return base ? `${base}#${idx}` : `step#${idx}`;
}

const BuildingSuggestionPropType = PropTypes.shape({
  id: PropTypes.string.isRequired,
  code: PropTypes.string,
  name: PropTypes.string,
  campus: PropTypes.string,
});

function SuggestionsBox({ prefix, visible, suggestions = [], onSelect }) {
  if (!visible || suggestions.length === 0) return null;

  return (
    <View style={styles.suggestionsBox}>
      {suggestions.map(({ id, code, name }) => (
        <TouchableOpacity
          key={`${prefix}-${id}`}
          style={styles.suggestionItem}
          onPressIn={() => onSelect({ id, code, name })}
        >
          <Text style={styles.suggestionText}>{formatBuildingLabel(name, code)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

SuggestionsBox.propTypes = {
  prefix: PropTypes.string.isRequired,
  visible: PropTypes.bool,
  suggestions: PropTypes.arrayOf(BuildingSuggestionPropType),
  onSelect: PropTypes.func.isRequired,
};

SuggestionsBox.defaultProps = {
  visible: false,
  suggestions: [],
};

export default function RouteOptionsScreen({ route, onBack }) {
  const { start, end, destinationName } = route?.params ?? {};

  const [mode, setMode] = useState('walk');
  const [result, setResult] = useState(null);

  const [showSteps, setShowSteps] = useState(false);

  const [editingOrigin, setEditingOrigin] = useState(false);
  const [editingDestination, setEditingDestination] = useState(false);

  const [startLoc, setStartLoc] = useState(start);
  const [endLoc, setEndLoc] = useState(end);

  const [draftStartLoc, setDraftStartLoc] = useState(start);
  const [draftEndLoc, setDraftEndLoc] = useState(end);

  const [originQuery, setOriginQuery] = useState(start?.label ?? '');
  const [destinationQuery, setDestinationQuery] = useState(destinationName ?? end?.label ?? '');

  const [originBuildingId, setOriginBuildingId] = useState(null);
  const [destinationBuildingId, setDestinationBuildingId] = useState(null);

  const mapRef = useRef(null);
  const [recalcTick, setRecalcTick] = useState(0);

  const allCampusFeatures = useMemo(() => buildAllCampusFeatures(), []);
  const allCampusBuildings = useMemo(() => buildCampusBuildings(), []);

  const filterBuildings = (query = '') => {
    const q = String(query).trim().toLowerCase();
    if (!q) return [];
    return allCampusBuildings.filter((b) => {
      const n = (b.name || '').toLowerCase();
      const c = (b.code || '').toLowerCase();
      return n.includes(q) || c.includes(q);
    });
  };

  const originSuggestions = useMemo(() => filterBuildings(originQuery).slice(0, 6), [originQuery, allCampusBuildings]);

  const destinationSuggestions = useMemo(
    () => filterBuildings(destinationQuery).slice(0, 6),
    [destinationQuery, allCampusBuildings]
  );

  const getCenterForBuildingId = (buildingId = null) => {
    if (!buildingId) return null;
    const feat = allCampusFeatures.find((f) => getBuildingId(f) === buildingId);
    return feat ? getFeatureCenter(feat) : null;
  };

  const clearOrigin = () => {
    setOriginBuildingId(null);
    setOriginQuery('');
    setDraftStartLoc(start);
    setShowSteps(false);
    setEditingOrigin(false);
  };

  const clearDestination = () => {
    setDestinationBuildingId(null);
    setDestinationQuery('');
    setDraftEndLoc(end);
    setShowSteps(false);
    setEditingDestination(false);
  };

  const selectOriginFromSearch = (b) => {
    const label = formatBuildingLabel(b?.name, b?.code);
    setOriginBuildingId(b.id);
    setOriginQuery(label);

    const center = getCenterForBuildingId(b.id);
    if (center) setDraftStartLoc({ ...center, label });
    else setDraftStartLoc((prev) => (prev ? { ...prev, label: b?.name } : prev));

    setEditingOrigin(false);
    setShowSteps(false);
  };

  const selectDestinationFromSearch = (b) => {
    const label = formatBuildingLabel(b?.name, b?.code);
    setDestinationBuildingId(b.id);
    setDestinationQuery(label);

    const center = getCenterForBuildingId(b.id);
    if (center) setDraftEndLoc({ ...center, label });
    else setDraftEndLoc((prev) => (prev ? { ...prev, label: b?.name } : prev));

    setEditingDestination(false);
    setShowSteps(false);
  };

  const pickFirstSuggestionIfNeeded = ({
    buildingId = null,
    suggestions = [],
    setBuildingId = () => {},
    setQuery = () => {},
    setDraftLoc = () => {},
    currentDraftLoc = null,
  } = {}) => {
    if (buildingId) return currentDraftLoc;
    if (!suggestions.length) return currentDraftLoc;

    const b = suggestions[0];
    const label = formatBuildingLabel(b?.name, b?.code);
    const center = getCenterForBuildingId(b?.id);

    setBuildingId(b.id);
    setQuery(label);

    if (center) {
      const next = { ...center, label };
      setDraftLoc(next);
      return next;
    }
    return currentDraftLoc;
  };

  const applyQueriesToCoords = () => {
    const nextDraftStart = pickFirstSuggestionIfNeeded({
      buildingId: originBuildingId,
      suggestions: originSuggestions,
      setBuildingId: setOriginBuildingId,
      setQuery: setOriginQuery,
      setDraftLoc: setDraftStartLoc,
      currentDraftLoc: draftStartLoc,
    });

    const nextDraftEnd = pickFirstSuggestionIfNeeded({
      buildingId: destinationBuildingId,
      suggestions: destinationSuggestions,
      setBuildingId: setDestinationBuildingId,
      setQuery: setDestinationQuery,
      setDraftLoc: setDraftEndLoc,
      currentDraftLoc: draftEndLoc,
    });

    setStartLoc(nextDraftStart);
    setEndLoc(nextDraftEnd);
    setEditingOrigin(false);
    setEditingDestination(false);
    setRecalcTick((t) => t + 1);
  };

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!startLoc || !endLoc) return;

      if (mode === 'shuttle') {
        if (!cancelled) {
          setResult({
            mode,
            distanceMeters: 0,
            durationMinutes: '-',
            summary: 'Shuttle Not Implemented yet',
            steps: [],
            polyline: [],
          });
        }
        return;
      }

      try {
        const routeResult = await calculateRoute({ start: startLoc, end: endLoc, mode });
        if (!cancelled) setResult(routeResult);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Route calculation failed', e);
        if (!cancelled) {
          setResult({
            mode,
            distanceMeters: 0,
            durationMinutes: '-',
            summary: 'Could not calculate route.',
            steps: [],
            polyline: [],
          });
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [startLoc, endLoc, mode, recalcTick]);

  const distanceText = useMemo(() => {
    if (!result) return '';
    const km = (result.distanceMeters || 0) / 1000;
    return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(result.distanceMeters || 0)} m`;
  }, [result]);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!result?.polyline?.length) return;

    mapRef.current.fitToCoordinates(result.polyline, {
      edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
      animated: true,
    });
  }, [result?.polyline]);

  if (!startLoc || !endLoc) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.fallbackWrap}>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Route Options</Text>
            <View style={styles.titleBar} />
          </View>

          <Text style={styles.fallbackText}>Missing start or destination coordinates.</Text>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!result) return null;

  const stepsForDisplay = (result.steps || []).slice(0, 8);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.pageContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Route Options</Text>
            <View style={styles.titleBar} />
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.directionsHeader}>
              <Text style={styles.directionsTitle}>Directions</Text>
            </View>

            {/* FROM */}
            <View style={styles.searchRow}>
              <View style={styles.searchLabelContainer}>
                <Text style={styles.searchLabel}>From</Text>
              </View>

              <View style={styles.searchInputWrapper}>
                <View style={styles.searchInputRow}>
                  <TextInput
                    value={originQuery}
                    onFocus={() => setEditingOrigin(true)}
                    onChangeText={(t) => {
                      setOriginQuery(t);
                      setOriginBuildingId(null);
                      setEditingOrigin(true);
                    }}
                    placeholder="Search origin building"
                    placeholderTextColor="#a0aec0"
                    style={styles.searchInput}
                    autoCorrect={false}
                    autoCapitalize="characters"
                  />

                  {!!originQuery && (
                    <TouchableOpacity onPress={clearOrigin} accessibilityLabel="Clear origin">
                      <Text style={styles.clearIcon}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            <SuggestionsBox
              prefix="origin"
              visible={editingOrigin}
              suggestions={originSuggestions}
              onSelect={(b) => {
                selectOriginFromSearch(b);
                setEditingOrigin(false);
              }}
            />

            {/* TO */}
            <View style={styles.searchRow}>
              <View style={styles.searchLabelContainer}>
                <Text style={styles.searchLabel}>To</Text>
              </View>

              <View style={styles.searchInputWrapper}>
                <View style={styles.searchInputRow}>
                  <TextInput
                    value={destinationQuery}
                    onFocus={() => setEditingDestination(true)}
                    onChangeText={(t) => {
                      setDestinationQuery(t);
                      setDestinationBuildingId(null);
                      setEditingDestination(true);
                    }}
                    placeholder="Search destination building"
                    placeholderTextColor="#a0aec0"
                    style={styles.searchInput}
                    autoCorrect={false}
                    autoCapitalize="characters"
                  />

                  {!!destinationQuery && (
                    <TouchableOpacity onPress={clearDestination} accessibilityLabel="Clear destination">
                      <Text style={styles.clearIcon}>✕</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={applyQueriesToCoords}
                    accessibilityLabel="Recalculate route"
                    style={styles.recalcBtn}
                  >
                    <Text style={styles.recalcIcon}>→</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <SuggestionsBox
              prefix="dest"
              visible={editingDestination}
              suggestions={destinationSuggestions}
              onSelect={(b) => {
                selectDestinationFromSearch(b);
                setEditingDestination(false);
              }}
            />
          </View>

          <TransportModeSelector value={mode} onChange={setMode} />

          {mode === 'shuttle' && (
            <View style={[styles.card, styles.cardShadow]}>
              <Text>Shuttle routing is handled separately.</Text>
            </View>
          )}

          <View style={styles.mapCard}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: startLoc.latitude,
                longitude: startLoc.longitude,
                latitudeDelta: 0.03,
                longitudeDelta: 0.03,
              }}
            >
              <Marker coordinate={{ latitude: startLoc.latitude, longitude: startLoc.longitude }} title="Start" />
              <Marker coordinate={{ latitude: endLoc.latitude, longitude: endLoc.longitude }} title="Destination" />
              {result.polyline?.length > 0 && <Polyline coordinates={result.polyline} strokeWidth={5} />}
            </MapView>
          </View>

          <View style={styles.routeCard}>
            <Text style={styles.big}>
              {result.durationMinutes === '-' ? 'Shuttle' : `${result.durationMinutes} min`}
            </Text>
            <Text style={styles.small}>{distanceText}</Text>
            <Text style={styles.small}>{result.summary}</Text>

            <TouchableOpacity
              style={[styles.primaryBtn, styles.primaryBtnRed]}
              onPress={() => setShowSteps((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel="Toggle directions steps"
            >
              <Text style={styles.primaryText}>{showSteps ? 'Hide directions' : 'Show directions'}</Text>
            </TouchableOpacity>
          </View>

          {showSteps && (
            <>
              <Text style={styles.label}>Directions</Text>
              <View style={styles.directionsCard}>
                <Text style={styles.directionsHeaderText}>
                  {result.durationMinutes} min • {distanceText}
                </Text>
                <View style={styles.divider} />

                <ScrollView
                  style={styles.directionsScroll}
                  contentContainerStyle={styles.directionsScrollContent}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                >
                  {stepsForDisplay.map((step, idx) => (
                    <View
                      key={makeStepKey(step, idx)}
                      style={[styles.stepRowCompact, idx === stepsForDisplay.length - 1 && styles.stepRowLast]}
                    >
                      <View style={styles.stepDot}>
                        <Text style={styles.stepDotText}>{idx + 1}</Text>
                      </View>

                      <View style={styles.stepBody}>
                        <Text style={styles.stepInstruction}>{step.instruction}</Text>
                        <Text style={styles.stepMeta}>
                          {step.distanceText}
                          {step.distanceText && step.durationText ? ' • ' : ''}
                          {step.durationText}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.secondaryBtn} onPress={onBack} accessibilityLabel="Back">
            <Text style={styles.secondaryText}>Back</Text>
          </TouchableOpacity>

          <View style={{ height: 16 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

RouteOptionsScreen.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      start: PropTypes.shape({
        latitude: PropTypes.number.isRequired,
        longitude: PropTypes.number.isRequired,
        label: PropTypes.string,
      }),
      end: PropTypes.shape({
        latitude: PropTypes.number.isRequired,
        longitude: PropTypes.number.isRequired,
        label: PropTypes.string,
      }),
      destinationName: PropTypes.string,
    }),
  }),
  onBack: PropTypes.func,
};

RouteOptionsScreen.defaultProps = {
  route: undefined,
  onBack: undefined,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  pageContent: { padding: 16, paddingBottom: 26 },

  titleWrap: { marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#1a202c' },
  titleBar: { height: 3, width: 38, backgroundColor: '#e53e3e', marginTop: 6, borderRadius: 999 },

  searchContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },

  directionsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  directionsTitle: { fontSize: 16, fontWeight: '800', color: '#1a202c' },

  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  searchLabelContainer: { width: 52 },
  searchLabel: { fontSize: 13, fontWeight: '800', color: '#2d3748' },

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
  searchInput: { flex: 1, color: '#1a202c', fontSize: 14, paddingVertical: 0 },
  clearIcon: { fontSize: 16, color: '#718096', paddingHorizontal: 4 },

  recalcBtn: { paddingHorizontal: 6, paddingVertical: 2 },
  recalcIcon: { fontSize: 18, color: '#e53e3e', fontWeight: '900' },

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

  mapCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  map: { height: 220, width: '100%' },

  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },

  big: { fontSize: 22, fontWeight: '900', color: '#1a202c' },
  small: { fontSize: 13, color: '#4a5568', marginTop: 4 },

  primaryBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnRed: { backgroundColor: '#e53e3e' },
  primaryText: { color: '#fff', fontWeight: '800' },

  label: { fontSize: 14, fontWeight: '800', color: '#2d3748', marginBottom: 8 },

  directionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 12,
  },

  directionsHeaderText: { fontSize: 13, fontWeight: '800', color: '#1a202c', padding: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#edf2f7' },

  directionsScroll: { maxHeight: 260 },
  directionsScrollContent: { padding: 12, paddingTop: 10 },

  stepRowCompact: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  stepRowLast: { paddingBottom: 4 },

  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#edf2f7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepDotText: { fontSize: 12, fontWeight: '800', color: '#2d3748' },

  stepBody: { flex: 1 },
  stepInstruction: { fontSize: 13, color: '#1a202c', fontWeight: '700' },
  stepMeta: { fontSize: 12, color: '#718096', marginTop: 4 },

  secondaryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  secondaryText: { fontSize: 13, fontWeight: '800', color: '#2d3748' },

  fallbackWrap: { padding: 16 },
  fallbackText: { marginTop: 10, marginBottom: 12, color: '#4a5568' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  cardShadow: {
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
