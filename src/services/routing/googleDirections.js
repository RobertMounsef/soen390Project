// src/services/routing/googleDirections.js
import Constants from 'expo-constants';

/**
 * Normalize spaces without regex (Sonar: prefer replaceAll over replace)
 */
function normalizeSpaces(text = '') {
  const oneLine = String(text)
    .replaceAll('\n', ' ')
    .replaceAll('\r', ' ')
    .replaceAll('\t', ' ')
    .trim();

  // collapse multiple spaces
  return oneLine.split(' ').filter(Boolean).join(' ');
}

/**
 * Decode Google encoded polyline into [{latitude, longitude}, ...]
 * (Sonar: prefer codePointAt over charCodeAt)
 */
function decodePolyline(encoded) {
  if (!encoded) return [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const points = [];

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = (encoded.codePointAt(index++) ?? 0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = (encoded.codePointAt(index++) ?? 0) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return points;
}

/**
 * Strip HTML tags and normalize whitespace.
 * (Sonar: for-of loop instead of index for-loop)
 */
function stripHtml(input) {
  const s = String(input ?? '');
  let out = '';
  let inTag = false;

  for (const ch of s) {
    if (ch === '<') {
      inTag = true;
      continue;
    }

    if (ch === '>' && inTag) {
      inTag = false;
      continue;
    }

    if (!inTag) out += ch;
  }

  return normalizeSpaces(out);
}

/**
 * Normalize a Google Directions step.
 * - WALKING steps: keep instruction/distance/duration
 * - TRANSIT steps: include vehicle (bus/subway/rail), line, stops, stations
 */
function normalizeStep(s) {
  const mode = s?.travel_mode;

  // WALKING step (often inside transit routes too)
  if (mode === 'WALKING') {
    return {
      kind: 'walk',
      instruction: stripHtml(s?.html_instructions || 'Walk'),
      detail: '',
      stopsText: '',
      headsign: '',
      departTime: '',
      arriveTime: '',
      distanceText: s?.distance?.text || '',
      durationText: s?.duration?.text || '',
    };
  }

  // TRANSIT step (bus/metro/train)
  if (mode === 'TRANSIT' && s?.transit_details) {
    const td = s.transit_details;
    const line = td?.line || {};
    const vehicle = line?.vehicle || {};

    const vehicleType = String(vehicle?.type || 'TRANSIT').toLowerCase(); // bus, subway, heavy_rail, rail, tram...
    const lineName = line?.short_name || line?.name || 'Line';

    const from = td?.departure_stop?.name || '';
    const to = td?.arrival_stop?.name || '';
    const stops = td?.num_stops;

    const headsign = td?.headsign ? stripHtml(td.headsign) : '';
    const departTime = td?.departure_time?.text || '';
    const arriveTime = td?.arrival_time?.text || '';

    return {
      kind: vehicleType,
      instruction: `${vehicleType.toUpperCase()} ${lineName}`,
      detail: from && to ? `${from} → ${to}` : '',
      stopsText: Number.isFinite(stops) ? `${stops} stops` : '',
      headsign,
      departTime,
      arriveTime,
      distanceText: s?.distance?.text || '',
      durationText: s?.duration?.text || '',
    };
  }

  // fallback for anything else
  return {
    kind: 'other',
    instruction: stripHtml(s?.html_instructions || 'Step'),
    detail: '',
    stopsText: '',
    headsign: '',
    departTime: '',
    arriveTime: '',
    distanceText: s?.distance?.text || '',
    durationText: s?.duration?.text || '',
  };
}

const MODE_TO_GOOGLE = {
  walk: 'walking',
  drive: 'driving',
  transit: 'transit',
};

export async function fetchGoogleDirections({ start, end, mode }) {
  const apiKey = Constants?.expoConfig?.extra?.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Missing GOOGLE_MAPS_API_KEY (app.json expo.extra)');

  const googleMode = MODE_TO_GOOGLE[mode] ?? null;
  if (!googleMode) {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  const origin = `${start.latitude},${start.longitude}`;
  const destination = `${end.latitude},${end.longitude}`;
  const departure = Math.floor(Date.now() / 1000);

  const transitModeParam =
    mode === 'transit' ? `&transit_mode=${encodeURIComponent('bus|subway|train|tram')}` : '';

  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}` +
    `&mode=${encodeURIComponent(googleMode)}` +
    `&departure_time=${departure}` +
    transitModeParam +
    `&key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data?.status !== 'OK' || !data?.routes?.length) {
    throw new Error(`Directions API: ${data?.status} ${data?.error_message || ''}`.trim());
  }

  const route = data.routes[0];
  const leg = route?.legs?.[0];

  const distanceMeters = leg?.distance?.value ?? 0;

  const durationSeconds =
    mode === 'drive'
      ? leg?.duration_in_traffic?.value ?? leg?.duration?.value ?? 0
      : leg?.duration?.value ?? 0;

  const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
  const steps = (leg?.steps || []).map(normalizeStep);

  let summary = 'Route (Google API)';
  if (mode === 'walk') summary = 'Walking route (Google API)';
  else if (mode === 'drive') summary = 'Driving route (Google API)';
  else if (mode === 'transit') summary = 'Transit route (with schedules)';

  return {
    mode,
    distanceMeters,
    durationMinutes,
    summary,
    polyline: decodePolyline(route?.overview_polyline?.points),
    steps,
  };
}
