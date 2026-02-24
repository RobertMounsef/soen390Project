/**
 * Google Maps Directions API service.
 *
 * Usage:
 *   import { fetchDirections } from './directions';
 *   // Requires EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to be set in .env
 *   const result = await fetchDirections(origin, destination, 'walking');
 */

const GOOGLE_ROUTES_API = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// Google Routes API v2 travel modes
const GOOGLE_MODES = {
  walking: 'WALK',
  driving: 'DRIVE',
  transit: 'TRANSIT',
};

/**
 * Decode a Polyline string into LatLng points.
 * @param {string} encoded
 * @returns {{ latitude: number, longitude: number }[]}
 */
export function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.codePointAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      byte = encoded.codePointAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

/**
 * Strips HTML tags from a string.
 * Google Maps instructions often contain <b> tags for bolding.
 * @param {string} html
 * @returns {string}
 */
export function stripHtml(html) {
  if (!html) return '';
  let result = '';
  let insideTag = false;
  for (const char of html) {
    if (char === '<') {
      insideTag = true;
    } else if (char === '>') {
      insideTag = false;
    } else if (!insideTag) {
      result += char;
    }
  }
  return result.replaceAll('&nbsp;', ' ').trim();
}

/**
 * Fetch directions using the modern Google Maps Routes API (v2).
 *
 * @param {{ latitude: number, longitude: number }} origin
 * @param {{ latitude: number, longitude: number }} destination
 * @param {'walking'|'driving'|'transit'} [mode='walking']
 * @returns {Promise<{
 *   polyline: { latitude: number, longitude: number }[],
 *   steps: { instruction: string, distance: string, duration: string }[],
 *   distanceText: string,
 *   durationText: string,
 * } | null>}
 */
export async function fetchDirections(origin, destination, mode = 'walking') {
  if (!origin || !destination) return null;

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    const msg = 'Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env file';
    console.warn(`[directions] ${msg}`);
    throw new Error(msg);
  }

  const travelMode = GOOGLE_MODES[mode] || 'WALK';

  const requestBody = {
    origin: {
      location: {
        latLng: {
          latitude: origin.latitude,
          longitude: origin.longitude,
        }
      }
    },
    destination: {
      location: {
        latLng: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        }
      }
    },
    travelMode: travelMode,
    computeAlternativeRoutes: false,
    routeModifiers: {
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: false
    },
    languageCode: 'en-US',
    units: 'METRIC'
  };

  try {
    const response = await fetch(GOOGLE_ROUTES_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // The Routes API requires explicitly telling it which fields to return
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs,routes.localizedValues'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || response.statusText;
      throw new Error(`Google API HTTP error ${response.status}: ${errorMessage}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found between these locations.');
    }

    const route = data.routes[0];
    const leg = route.legs?.[0]; // Usually only one leg for A to B routing
    if (!leg) {
      throw new Error('Route data is missing leg information.');
    }

    const polylineStr = route.polyline?.encodedPolyline;
    const polyline = polylineStr ? decodePolyline(polylineStr) : [];

    const steps = (leg.steps || []).map((step, i) => {
      let instruction = stripHtml(step.navigationInstruction?.instructions || '');

      if (step.transitDetails) {
        const line = step.transitDetails.transitLine;
        const vehicleType = line?.vehicle?.type || '';
        const lineStr = line?.nameShort || line?.name || 'Transit';

        let typeStr = 'Transit';
        if (vehicleType === 'SUBWAY' || vehicleType === 'METRO') typeStr = 'Metro';
        else if (vehicleType === 'BUS') typeStr = 'Bus';
        else if (vehicleType === 'TRAIN' || vehicleType === 'COMMUTER_TRAIN') typeStr = 'Train';

        const depStop = step.transitDetails.stopDetails?.departureStop?.name;
        const arrStop = step.transitDetails.stopDetails?.arrivalStop?.name;
        const headsign = step.transitDetails.headsign;

        let desc = `Take ${typeStr} ${lineStr}`;
        if (headsign) desc += ` towards ${headsign}`;
        if (depStop) desc += ` from ${depStop}`;
        if (arrStop) desc += `. Get off at ${arrStop}`;

        instruction = desc.trim();
      }

      return {
        id: `step-${i}`,
        instruction,
        // Routes API v2 uses localizedValues for formatted text
        distance: step.localizedValues?.distance?.text || '',
        duration: step.localizedValues?.duration?.text || '',
      };
    });

    return {
      polyline,
      steps,
      distanceText: route.localizedValues?.distance?.text || '',
      durationText: route.localizedValues?.duration?.text || '',
    };
  } catch (error) {
    console.warn('[directions] Fetch error:', error.message);
    throw error;
  }
}
