import { fetchGoogleDirections } from './googleDirections';

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

const SPEED_KMH = { walk: 5, drive: 25, transit: 15, shuttle: 25 };
const EXTRA_MIN = { walk: 0, drive: 2, transit: 8, shuttle: 5 };

export async function calculateRoute({ start, end, mode }) {
    // Shuttle = visible mode only (not implemented)
    if (mode === 'shuttle') {
        const distanceMeters = Math.round(haversineMeters(start, end));
        const km = distanceMeters / 1000;
        const baseMinutes = (km / SPEED_KMH.shuttle) * 60;
        const durationMinutes = Math.max(1, Math.round(baseMinutes + EXTRA_MIN.shuttle));

        return {
            mode,
            distanceMeters,
            durationMinutes,
            summary: 'Shuttle option (handled separately)',
            polyline: [start, end],
        };
    }

    // Real routes for walk/drive/transit via Google
    try {
        return await fetchGoogleDirections({ start, end, mode });
    } catch (e) {
        const distanceMeters = Math.round(haversineMeters(start, end));
        const km = distanceMeters / 1000;
        const speed = SPEED_KMH[mode] ?? SPEED_KMH.walk;
        const baseMinutes = (km / speed) * 60;

        return {
            mode,
            distanceMeters,
            durationMinutes: Math.max(1, Math.round(baseMinutes + (EXTRA_MIN[mode] ?? 0))),
            summary: `Fallback estimate (API error)`,
            polyline: [start, end],
            error: String(e?.message || e),
        };
    }
}
