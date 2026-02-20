// src/screens/RouteOptionsScreen.js

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import TransportModeSelector from '../components/TransportModeSelector';
import { calculateRoute } from '../services/routing/routeCalculator';

/**
 * RouteOptionsScreen
 *
 * This screen allows users to:
 * - Select a transportation mode (walk, car, transit)
 * - View a route summary (duration and distance)
 * - Visualize the route on a map
 * - Display step-by-step directions
 *
 * Expected route params:
 * route.params = {
 *   start: { latitude, longitude, label },
 *   end: { latitude, longitude, label },
 *   destinationName?: string
 * }
 */
export default function RouteOptionsScreen({ route, onBack }) {
    const { start, end, destinationName } = route?.params || {};

    const [mode, setMode] = useState('walk');
    const [result, setResult] = useState(null);
    const [showDirections, setShowDirections] = useState(false);

    const mapRef = useRef(null);

    /**
     * Fetch and calculate the route whenever:
     * - start location changes
     * - end location changes
     * - transportation mode changes
     */
    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!start || !end) return;

            // Reset UI state before recalculating a route
            setResult(null);
            setShowDirections(false);

            // Shuttle routing is handled separately and not implemented here
            if (mode === 'shuttle') {
                if (!cancelled) {
                    setResult({
                        mode,
                        distanceMeters: 0,
                        durationMinutes: '-',
                        summary: 'Shuttle routing is handled separately.',
                        steps: [],
                        polyline: [],
                    });
                }
                return;
            }

            const routeResult = await calculateRoute({ start, end, mode });
            if (!cancelled) setResult(routeResult);
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [start, end, mode]);

    /**
     * Human-readable distance formatting
     */
    const distanceText = useMemo(() => {
        if (!result) return '';
        const km = result.distanceMeters / 1000;
        return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(result.distanceMeters)} m`;
    }, [result]);

    /**
     * Adjust the map viewport to fit the route polyline
     */
    useEffect(() => {
        if (!mapRef.current) return;
        if (!result?.polyline?.length) return;

        mapRef.current.fitToCoordinates(result.polyline, {
            edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
            animated: true,
        });
    }, [result?.polyline]);

    // Fallback UI when start or end coordinates are missing
    if (!start || !end) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Route Options</Text>
                <Text>Missing start or destination coordinates.</Text>

                <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
                    <Text style={styles.secondaryText}>Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Loading state while route is being calculated
    if (!result) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Route Options</Text>
                <Text>Calculating route…</Text>

                <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
                    <Text style={styles.secondaryText}>Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.pageContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Route Options</Text>

                {/* Start location */}
                <Text style={styles.label}>Start</Text>
                <View style={styles.card}>
                    <Text>{start.label ?? 'Current location'}</Text>
                </View>

                {/* Destination */}
                <Text style={styles.label}>Destination</Text>
                <View style={styles.card}>
                    <Text>{destinationName ?? end.label ?? 'Selected building'}</Text>
                </View>

                {/* Transportation mode selector */}
                <TransportModeSelector value={mode} onChange={setMode} />

                {mode === 'shuttle' && (
                    <View style={styles.card}>
                        <Text>Shuttle routing is handled separately.</Text>
                    </View>
                )}

                {/* Map displaying the calculated route */}
                <View style={styles.mapCard}>
                    <MapView
                        ref={mapRef}
                        provider={PROVIDER_GOOGLE}
                        style={styles.map}
                        initialRegion={{
                            latitude: start.latitude,
                            longitude: start.longitude,
                            latitudeDelta: 0.03,
                            longitudeDelta: 0.03,
                        }}
                    >
                        <Marker
                            coordinate={{ latitude: start.latitude, longitude: start.longitude }}
                            title="Start"
                        />
                        <Marker
                            coordinate={{ latitude: end.latitude, longitude: end.longitude }}
                            title="Destination"
                        />

                        {result.polyline?.length > 0 && (
                            <Polyline coordinates={result.polyline} strokeWidth={5} />
                        )}
                    </MapView>
                </View>

                {/* Route summary */}
                <View style={styles.routeCard}>
                    <Text style={styles.big}>
                        {result.durationMinutes === '-'
                            ? 'Shuttle'
                            : `${result.durationMinutes} min`}
                    </Text>
                    <Text style={styles.small}>{distanceText}</Text>
                    <Text style={styles.small}>{result.summary}</Text>
                </View>

                {/* Step-by-step directions */}
                {showDirections && (
                    <>
                        <Text style={styles.label}>Directions</Text>

                        <View style={styles.directionsCard}>
                            <Text style={styles.directionsHeader}>
                                {result.durationMinutes} min • {distanceText}
                            </Text>

                            <View style={styles.divider} />

                            {/* Limits height to avoid overlapping the footer */}
                            <ScrollView
                                style={styles.directionsScroll}
                                contentContainerStyle={styles.directionsScrollContent}
                                nestedScrollEnabled
                                showsVerticalScrollIndicator
                            >
                                {result.steps.slice(0, 8).map((step, index) => (
                                    <View
                                        key={index}
                                        style={[
                                            styles.stepRowCompact,
                                            index === result.steps.length - 1 &&
                                            styles.stepRowLast,
                                        ]}
                                    >
                                        <View style={styles.stepDot}>
                                            <Text style={styles.stepDotText}>
                                                {index + 1}
                                            </Text>
                                        </View>

                                        <View style={styles.stepBody}>
                                            <Text style={styles.stepInstruction}>
                                                {step.instruction}
                                            </Text>
                                            <Text style={styles.stepMeta}>
                                                {step.distanceText}
                                                {step.distanceText && step.durationText
                                                    ? ' • '
                                                    : ''}
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

            {/* Fixed footer containing primary navigation actions */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => setShowDirections(v => !v)}
                    disabled={mode === 'shuttle' || !result.steps?.length}
                >
                    <Text style={styles.primaryText}>
                        {showDirections ? 'Hide directions' : 'Show directions'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
                    <Text style={styles.secondaryText}>Back</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f2f4f8',
    },
    pageContent: {
        padding: 16,
        paddingBottom: 200,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 14,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 10,
        marginBottom: 6,
    },
    card: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    routeCard: {
        backgroundColor: 'white',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        marginTop: 10,
    },
    big: {
        fontSize: 20,
        fontWeight: '700',
    },
    small: {
        marginTop: 4,
        color: '#444',
    },
    mapCard: {
        marginTop: 12,
        backgroundColor: 'white',
        borderRadius: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#eee',
    },
    map: {
        height: 220,
        width: '100%',
    },
    directionsCard: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#eee',
        marginTop: 10,
    },
    directionsHeader: {
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 8,
    },
    directionsScroll: {
        maxHeight: 240,
    },
    directionsScrollContent: {
        paddingBottom: 6,
    },
    stepRowCompact: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    stepRowLast: {
        borderBottomWidth: 0,
    },
    stepDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#1e63ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        marginTop: 2,
    },
    stepDotText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '700',
    },
    stepBody: {
        flex: 1,
    },
    stepInstruction: {
        color: '#111',
        lineHeight: 18,
    },
    stepMeta: {
        marginTop: 4,
        fontSize: 12,
        color: '#444',
    },
    footer: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
    },
    primaryBtn: {
        backgroundColor: '#1e63ff',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    primaryText: {
        color: 'white',
        fontWeight: '700',
    },
    secondaryBtn: {
        marginTop: 10,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        backgroundColor: 'white',
    },
    secondaryText: {
        fontWeight: '700',
        color: '#111',
    },
});