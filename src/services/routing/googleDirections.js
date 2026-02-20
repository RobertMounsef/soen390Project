import Constants from 'expo-constants';

/**
 * Decode Google encoded polyline into [{latitude, longitude}, ...]
 */
function decodePolyline(encoded) {
    if (!encoded) return [];
    let index = 0, lat = 0, lng = 0;
    const points = [];

    while (index < encoded.length) {
        let b, shift = 0, result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += dlat;

        shift = 0; result = 0;
        do {
            b = encoded.charCodeAt(index++) - 63;
            result |= (b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += dlng;

        points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return points;
}

export async function fetchGoogleDirections({ start, end, mode }) {
    const apiKey = Constants?.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;

    if (!apiKey) throw new Error('Missing GOOGLE_MAPS_API_KEY (app.json expo.extra)');

    const googleMode =
        mode === 'walk' ? 'walking'
            : mode === 'drive' ? 'driving'
                : mode === 'transit' ? 'transit'
                    : null;

    if (!googleMode) {
        throw new Error(`Unsupported mode: ${mode}`);
    }
    const origin = `${start.latitude},${start.longitude}`;
    const destination = `${end.latitude},${end.longitude}`;

    const departure = Math.floor(Date.now() / 1000);

    const url =
        `https://maps.googleapis.com/maps/api/directions/json` +
        `?origin=${encodeURIComponent(origin)}` +
        `&destination=${encodeURIComponent(destination)}` +
        `&mode=${encodeURIComponent(googleMode)}` +
        `&departure_time=${departure}` +
        `&key=${encodeURIComponent(apiKey)}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.routes?.length) {
        throw new Error(`Directions API: ${data.status} ${data.error_message || ''}`.trim());
    }
    const route0 = data.routes?.[0];
    const leg0 = route0?.legs?.[0];

    const steps =
        leg0?.steps?.map((s) => ({
            instruction: (s.html_instructions || '').replace(/<[^>]+>/g, ''),
            distanceText: s.distance?.text || '',
            durationText: s.duration?.text || '',
        })) ?? [];
    const route = data.routes[0];
    const leg = route.legs?.[0];

    const distanceMeters = leg?.distance?.value ?? 0;

    const durationSeconds =
        mode === 'drive'
            ? (leg?.duration_in_traffic?.value ?? leg?.duration?.value ?? 0)
            : (leg?.duration?.value ?? 0);

    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

    return {
        mode,
        distanceMeters,
        durationMinutes,
        summary:
            mode === 'walk'
                ? 'Walking route (pedestrian-friendly)'
                : mode === 'drive'
                    ? 'Driving route (traffic-aware)'
                    : 'Transit route (with schedules)',
        polyline: decodePolyline(route?.overview_polyline?.points),
        steps,

    };
}
