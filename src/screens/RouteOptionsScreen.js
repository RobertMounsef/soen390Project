// src/screens/RouteOptionsScreen.js

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import TransportModeSelector from '../components/TransportModeSelector';
import { calculateRoute } from '../services/routing/routeCalculator';

/**
 * RouteOptionsScreen
 *
 * Lets the user:
 * - Select a transportation mode (Walk, Car, Transit)
 * - See estimated travel time & distance for that mode
 *
 * Params expected from MapScreen:
 * route.params = { start: {latitude,longitude,label}, end: {latitude,longitude,label}, destinationName? }
 */
export default function RouteOptionsScreen({ route, onBack }) {
    const { start, end, destinationName } = route?.params || {};

    const [mode, setMode] = useState('walk');
    const [result, setResult] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!start || !end) return;

            // Reset UI while we fetch a new route
            setResult(null);
            if (mode === 'shuttle') {
                if (!cancelled) {
                    setResult({
                        mode,
                        distanceMeters: 0,
                        durationMinutes: '-',
                        summary: 'Shuttle directions are handled separately (not implemented).',
                        steps: [],
                    });
                }
                return;
            }

            const r = await calculateRoute({ start, end, mode });
            if (!cancelled) setResult(r);
        }


        run();
        return () => { cancelled = true; };
    }, [start, end, mode]);


    const distanceText = useMemo(() => {
        if (!result) return '';
        const km = result.distanceMeters / 1000;
        return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(result.distanceMeters)} m`;
    }, [result]);

    // Simple loading/fallback UI
    if (!start || !end) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Route Options</Text>
                <Text>Missing start/end coordinates.</Text>

                <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
                    <Text style={styles.secondaryText}>Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!result) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Route Options</Text>
                <Text>Calculating route...</Text>

                <TouchableOpacity style={styles.secondaryBtn} onPress={onBack}>
                    <Text style={styles.secondaryText}>Back</Text>
                </TouchableOpacity>
            </View>
        );
    }


    return (
        <View style={styles.container}>
                <Text style={styles.title}>Route Options</Text>

                {/* Start */}
                <Text style={styles.label}>Start</Text>
                <View style={styles.card}>
                    <Text>{start.label ?? 'Current location'}</Text>
                </View>

                {/* Destination */}
                <Text style={styles.label}>Destination</Text>
                <View style={styles.card}>
                    <Text>{destinationName ?? end.label ?? 'Selected building'}</Text>
                </View>

                {/* Mode selector */}
                <TransportModeSelector value={mode} onChange={setMode} />
                {mode === 'shuttle' && (
                    <View style={styles.card}>
                        <Text>
                            Shuttle directions are handled separately (not implemented in this app).
                        </Text>
                    </View>
                )}

                {/* Summary */}
                <View style={styles.routeCard}>
                    <Text style={styles.big}>
                        {result.durationMinutes === '-' ? 'Shuttle' : `${result.durationMinutes} min`}
                    </Text>
                    <Text style={styles.small}>{distanceText}</Text>
                    <Text style={styles.small}>{result.summary}</Text>
                </View>

                {/* Directions */}
                <Text style={styles.label}>Directions</Text>

                <View style={styles.directionsCard}>
                    <Text style={styles.directionsHeader}>
                        {result.durationMinutes === '-' ? 'Shuttle' : `${result.durationMinutes} min`} • {distanceText}
                    </Text>

                    <View style={styles.divider} />
                    <ScrollView
                        style={styles.directionsScroll}
                        contentContainerStyle={styles.directionsScrollContent}
                        showsVerticalScrollIndicator={true}
                    >
                    {Array.isArray(result.steps) && result.steps.length > 0 ? (
                        result.steps.slice(0, 8).map((s, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.stepRowCompact,
                                    i === Math.min(result.steps.length, 8) - 1 && styles.stepRowLast,
                                ]}
                            >
                                <View style={styles.stepDot}>
                                    <Text style={styles.stepDotText}>{i + 1}</Text>
                                </View>

                                <View style={styles.stepBody}>
                                    <Text style={styles.stepInstruction}>{s.instruction}</Text>

                                    {(s.distanceText || s.durationText) ? (
                                        <Text style={styles.stepMeta}>
                                            {s.distanceText ? s.distanceText : ''}
                                            {s.distanceText && s.durationText ? ' • ' : ''}
                                            {s.durationText ? s.durationText : ''}
                                        </Text>
                                    ) : null}
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.small}>No step-by-step directions available.</Text>
                    )}
                </ScrollView>
                </View>

                {/* DEBUG: API error */}
                {result?.error ? (
                    <Text style={styles.apiError}>
                        API ERROR: {result.error}
                    </Text>
                ) : null}

            {/* Boutons fixés en bas */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.primaryBtn} onPress={onBack}>
                    <Text style={styles.primaryText}>Show Directions</Text>
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
        padding: 16,
        flex: 1,
        backgroundColor: '#f7f7f7',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
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
    primaryBtn: {
        marginTop: 14,
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
        color: '#111',
    },

    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginTop: 10,
        marginBottom: 6,
    },

    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },

    stepRowLast: {
        borderBottomWidth: 0,
        paddingBottom: 2,
    },

    stepBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#1e63ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
        marginTop: 2,
    },

    stepBadgeText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 12,
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
        color: '#444',
        fontSize: 12,
    },
    apiError: {
        marginTop: 8,
        color: 'red',
    },
    scrollContent: {
        paddingBottom: 140, // laisse de la place pour le footer
    },

    footer: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
    },
    directionsScroll: {
        maxHeight: 170, // ajuste: 150-220 selon ton écran
    },

    directionsScrollContent: {
        paddingBottom: 6,
    },

    stepRowCompact: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
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
        fontWeight: '700',
        fontSize: 10,
    },
});
