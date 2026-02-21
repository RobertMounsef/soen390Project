// src/screens/RouteOptionsScreen.js

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import TransportModeSelector from '../components/TransportModeSelector';
import { calculateRoute } from '../services/routing/routeCalculator';
import { getBuildingsByCampus, getBuildingInfo } from '../services/api/buildings';
import { getBuildingId } from '../utils/geolocation';
import { getFeatureCenter } from '../utils/geometry';

export default function RouteOptionsScreen({ route, onBack }) {
    const { start, end, destinationName } = route?.params || {};

    const [mode, setMode] = useState('walk');
    const [result, setResult] = useState(null);
    const [showSteps, setShowSteps] = useState(false);

    const [editingOrigin, setEditingOrigin] = useState(false);
    const [editingDestination, setEditingDestination] = useState(false);

    const [startLoc, setStartLoc] = useState(start);
    const [endLoc, setEndLoc] = useState(end);
    const [draftStartLoc, setDraftStartLoc] = useState(start); // user selection (no calc yet)
    const [draftEndLoc, setDraftEndLoc] = useState(end);
    // Bubble inputs (editable)
    const [originQuery, setOriginQuery] = useState(start?.label ?? '');
    const [destinationQuery, setDestinationQuery] = useState(
        destinationName ?? end?.label ?? ''
    );

    // IDs optionnels
    const [originBuildingId, setOriginBuildingId] = useState(null);
    const [destinationBuildingId, setDestinationBuildingId] = useState(null);

    const mapRef = useRef(null);
    const [recalcTick, setRecalcTick] = useState(0);

    const allCampusFeatures = useMemo(() => {
        const sgw = getBuildingsByCampus('SGW') || [];
        const loy = getBuildingsByCampus('LOY') || [];
        return [...sgw, ...loy];
    }, []);

    const allCampusBuildings = useMemo(() => {
        const byId = new Map();

        const sgwBuildings = getBuildingsByCampus('SGW') || [];
        const loyBuildings = getBuildingsByCampus('LOY') || [];
        const allBuildings = [...sgwBuildings, ...loyBuildings];

        if (!Array.isArray(allBuildings)) return [];

        for (const feature of allBuildings) {
            const props = feature?.properties || {};
            const id = props.id || getBuildingId(feature);
            if (!id || byId.has(id)) continue;

            const info = getBuildingInfo(id);

            byId.set(id, {
                id,
                code: props.code || info?.code || id,
                name: props.name || info?.name || id,
                campus: props.campus || info?.campus,
            });
        }

        return Array.from(byId.values()).sort((a, b) =>
            (a.name || '').localeCompare(b.name || '')
        );
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

    const originSuggestions = useMemo(
        () => filterBuildings(originQuery).slice(0, 6),
        [originQuery, allCampusBuildings]
    );

    const destinationSuggestions = useMemo(
        () => filterBuildings(destinationQuery).slice(0, 6),
        [destinationQuery, allCampusBuildings]
    );

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

    const getCenterForBuildingId = (buildingId) => {
        const feat = allCampusFeatures.find((f) => getBuildingId(f) === buildingId);
        return feat ? getFeatureCenter(feat) : null;
    };

    const selectOriginFromSearch = (b) => {
        setOriginBuildingId(b.id);
        setOriginQuery(`${b.name}${b.code ? ` (${b.code})` : ''}`);

        const center = getCenterForBuildingId(b.id);
        if (center) {
            setDraftStartLoc({
                ...center,
                label: `${b.name}${b.code ? ` (${b.code})` : ''}`,
            });
        } else {
            setDraftStartLoc((prev) => (prev ? { ...prev, label: b.name } : prev));
        }

        setEditingOrigin(false);
        setShowSteps(false);
    };

    const selectDestinationFromSearch = (b) => {
        setDestinationBuildingId(b.id);
        setDestinationQuery(`${b.name}${b.code ? ` (${b.code})` : ''}`);

        const center = getCenterForBuildingId(b.id);
        if (center) {
            setDraftEndLoc({
                ...center,
                label: `${b.name}${b.code ? ` (${b.code})` : ''}`,
            });
        } else {
            setDraftEndLoc((prev) => (prev ? { ...prev, label: b.name } : prev));
        }

        setEditingDestination(false);
        setShowSteps(false);
    };
    const applyQueriesToCoords = () => {
        let nextDraftStart = draftStartLoc;
        let nextDraftEnd = draftEndLoc;

        if (!originBuildingId && originSuggestions.length > 0) {
            const b = originSuggestions[0];
            const center = getCenterForBuildingId(b.id);
            nextDraftStart = center
                ? { ...center, label: `${b.name}${b.code ? ` (${b.code})` : ''}` }
                : nextDraftStart;
            setOriginBuildingId(b.id);
            setOriginQuery(`${b.name}${b.code ? ` (${b.code})` : ''}`);
            setDraftStartLoc(nextDraftStart);
        }

        if (!destinationBuildingId && destinationSuggestions.length > 0) {
            const b = destinationSuggestions[0];
            const center = getCenterForBuildingId(b.id);
            nextDraftEnd = center
                ? { ...center, label: `${b.name}${b.code ? ` (${b.code})` : ''}` }
                : nextDraftEnd;
            setDestinationBuildingId(b.id);
            setDestinationQuery(`${b.name}${b.code ? ` (${b.code})` : ''}`);
            setDraftEndLoc(nextDraftEnd);
        }

       
        setStartLoc(nextDraftStart);
        setEndLoc(nextDraftEnd);

        setEditingOrigin(false);
        setEditingDestination(false);
        setRecalcTick((t) => t + 1);
    };


    // Calc route when start/end/mode changes
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

    // Fit map to polyline
    useEffect(() => {
        if (!mapRef.current) return;
        if (!result?.polyline?.length) return;

        mapRef.current.fitToCoordinates(result.polyline, {
            edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
            animated: true,
        });
    }, [result?.polyline]);

    // Fallback missing coords
    if (!startLoc || !endLoc) {
        return (
            <View style={styles.container}>
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
            </View>
        );
    }

  
    if (!result) return null;

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.pageContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Title */}
                <View style={styles.titleWrap}>
                    <Text style={styles.title}>Route Options</Text>
                    <View style={styles.titleBar} />
                </View>

                {/* Directions bubble */}
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

                    {editingOrigin && originSuggestions.length > 0 && (
                        <View style={styles.suggestionsBox}>
                            {originSuggestions.map((b) => (
                                <TouchableOpacity
                                    key={`origin-${b.id}`}
                                    style={styles.suggestionItem}
                                    onPressIn={() => {
                                        // onPressIn arrive AVANT le blur, donc ça marche à 100%
                                        selectOriginFromSearch(b);
                                        setEditingOrigin(false);
                                    }}
                                >
                                    <Text style={styles.suggestionText}>
                                        {b.name} {b.code ? `(${b.code})` : ''}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

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
                                    onBlur={() => {
                                        // ne ferme pas ici (sinon ça casse le tap sur suggestions)
                                    }}
                                    onChangeText={(t) => {
                                        setDestinationQuery(t);
                                        setDestinationBuildingId(null);
                                        setEditingDestination(true); // garde la liste ouverte pendant la saisie
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

                    {editingDestination && destinationSuggestions.length > 0 && (
                        <View style={styles.suggestionsBox}>
                            {destinationSuggestions.map((b) => (
                                <TouchableOpacity
                                    key={`dest-${b.id}`}
                                    style={styles.suggestionItem}
                                    onPressIn={() => {
                                        selectDestinationFromSearch(b);
                                        setEditingDestination(false);
                                    }}
                                >
                                    <Text style={styles.suggestionText}>
                                        {b.name} {b.code ? `(${b.code})` : ''}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>

                {/* Transport mode */}
                <TransportModeSelector value={mode} onChange={setMode} />

                {mode === 'shuttle' && (
                    <View style={[styles.card, styles.cardShadow]}>
                        <Text>Shuttle routing is handled separately.</Text>
                    </View>
                )}

                {/* Map */}
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

                {/* Summary */}
                <View style={styles.routeCard}>
                    <Text style={styles.big}>
                        {result.durationMinutes === '-' ? 'Shuttle' : `${result.durationMinutes} min`}
                    </Text>
                    <Text style={styles.small}>{distanceText}</Text>
                    <Text style={styles.small}>{result.summary}</Text>
                </View>

                {/* Steps */}
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
                                {result.steps?.slice(0, 8).map((step, index) => (
                                    <View
                                        key={index}
                                        style={[
                                            styles.stepRowCompact,
                                            index === (result.steps?.length || 0) - 1 && styles.stepRowLast,
                                        ]}
                                    >
                                        <View style={styles.stepDot}>
                                            <Text style={styles.stepDotText}>{index + 1}</Text>
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
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => setShowSteps((v) => !v)}
                    disabled={mode === 'shuttle' || !result.steps?.length}
                >
                    <Text style={styles.primaryText}>{showSteps ? 'Hide directions' : 'Show directions'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
                    <Text style={styles.secondaryText}>Back</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f7fafc' },
    pageContent: { padding: 16, paddingBottom: 200 },

    titleWrap: { alignItems: 'center', marginBottom: 10 },
    title: { fontSize: 20, fontWeight: '800', textAlign: 'center', color: '#1a202c' },
    titleBar: { marginTop: 8, width: 48, height: 4, borderRadius: 999, backgroundColor: '#8B1538' },

    label: { fontSize: 14, fontWeight: '600', marginTop: 10, marginBottom: 6, color: '#2d3748' },

    card: {
        backgroundColor: '#ffffff',
        padding: 12,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#e2e8f0',
        marginTop: 10,
    },

    cardShadow: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },

    fallbackWrap: { flex: 1, padding: 16, justifyContent: 'center' },
    fallbackText: { marginTop: 10, textAlign: 'center', color: '#475569' },

    searchContainer: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
        marginBottom: 12,
    },

    directionsHeader: { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    directionsTitle: { fontSize: 14, fontWeight: '700', color: '#2d3748' },

    searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    searchLabelContainer: { width: 56, marginRight: 8 },

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

    searchInputRow: { flexDirection: 'row', alignItems: 'center' },
    searchInput: { fontSize: 14, color: '#1a202c', flex: 1 },
    clearIcon: { fontSize: 14, color: '#a0aec0', marginLeft: 6 },

    recalcBtn: {
        marginLeft: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#eef2ff',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#c7d2fe',
    },
    recalcIcon: { fontSize: 16, color: '#8B1538', fontWeight: '900' },

    suggestionsBox: {
        marginTop: 2,
        marginBottom: 6,
        borderRadius: 12,
        backgroundColor: '#f7fafc',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
    },
    suggestionItem: { paddingHorizontal: 10, paddingVertical: 8 },
    suggestionText: { fontSize: 13, color: '#2d3748' },

    mapCard: {
        marginTop: 8,
        backgroundColor: '#ffffff',
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    map: { height: 220, width: '100%' },

    routeCard: {
        backgroundColor: '#ffffff',
        padding: 14,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#e2e8f0',
        marginTop: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#8B1538',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },

    big: { fontSize: 20, fontWeight: '800', color: '#1a202c' },
    small: { marginTop: 4, color: '#4a5568' },

    directionsCard: {
        backgroundColor: '#ffffff',
        padding: 12,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#e2e8f0',
        marginTop: 10,
    },
    directionsHeaderText: { fontWeight: '700', color: '#2d3748' },
    divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },

    directionsScroll: { maxHeight: 240 },
    directionsScrollContent: { paddingBottom: 6 },

    stepRowCompact: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e2e8f0',
    },
    stepRowLast: { borderBottomWidth: 0 },

    stepDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#8B1538',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        marginTop: 2,
    },

    stepDotText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
    stepBody: { flex: 1 },

    stepInstruction: { color: '#1a202c', lineHeight: 18 },
    stepMeta: { marginTop: 4, fontSize: 12, color: '#4a5568' },

    footer: { position: 'absolute', left: 16, right: 16, bottom: 16 },

    primaryBtn: {
        backgroundColor: '#8B1538',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },

    primaryText: { color: '#ffffff', fontWeight: '800' },

    secondaryBtn: {
        marginTop: 10,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
    },

    secondaryText: { fontWeight: '800', color: '#2d3748' },
});
