// src/services/routing/routeCalculator.js
import { fetchGoogleDirections } from './googleDirections';

/**
 * Haversine distance in meters between 2 coords
 */
function haversineMeters(a, b) {
    const R = 6371000;
    const toRad = (x) => (x * Math.PI) / 180;

    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);

    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

    return R * c;
}

function clampMin1(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 1;
    return Math.max(1, Math.round(x));
}

function estimateDurationMinutes(distanceMeters, speedKmh) {
    const metersPerMinute = (speedKmh * 1000) / 60;
    return clampMin1(distanceMeters / metersPerMinute);
}

function stringifyError(err) {
    if (err instanceof Error) return err.message || String(err);
    return String(err);
}

const SPEED_KMH = {
    walk: 5,
    drive: 25,
    transit: 18,
    shuttle: 22,
};

/**
 * calculateRoute
 * - shuttle: local estimate only (no Google call)
 * - walk/drive/transit: Google Directions, fallback to estimate on error
 */
export async function calculateRoute({ start, end, mode }) {
    if (!start || !end) {
        throw new Error('calculateRoute requires start and end');
    }
    if (!mode) {
        throw new Error('calculateRoute requires mode');
    }

    // Shuttle is handled locally (tests expect NO Google call)
    if (mode === 'shuttle') {
        const distanceMeters = haversineMeters(start, end);
        const durationMinutes = estimateDurationMinutes(distanceMeters, SPEED_KMH.shuttle);

        return {
            mode: 'shuttle',
            distanceMeters,
            durationMinutes,
            summary: 'Shuttle option (handled separately)',
            polyline: [start, end],
            steps: [],
        };
    }

    // For supported Google modes: try API first
    try {
        const googleResult = await fetchGoogleDirections({ start, end, mode });
        return googleResult;
    } catch (err) {
        // Fallback estimate (tests expect exact summary string + polyline)
        const distanceMeters = haversineMeters(start, end);
        const speed = SPEED_KMH[mode] ?? 15;
        const durationMinutes = estimateDurationMinutes(distanceMeters, speed);

        return {
            mode,
            distanceMeters,
            durationMinutes,
            summary: 'Fallback estimate (API error)',
            error: stringifyError(err),
            polyline: [start, end],
            steps: [],
        };
    }
}
