import { useState, useEffect, useRef } from 'react';
import { fetchDirections } from '../services/api/directions';
import { getShuttleStop, getNextDeparture, isShuttleOperating } from '../services/api/shuttle';

const DEBOUNCE_MS = 500;
const RECALC_DISTANCE_M = 50;

function toRad(deg) {
  return deg * (Math.PI / 180);
}

function distanceMetres(a, b) {
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sinDlat = Math.sin(dLat / 2);
  const sinDlng = Math.sin(dLng / 2);
  const x =
    sinDlat * sinDlat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinDlng * sinDlng;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function minDistanceToRoute(point, polyline) {
  if (!polyline || polyline.length === 0) return Infinity;
  return Math.min(...polyline.map((p) => distanceMetres(point, p)));
}

// Helpers
function pad(n) {
  return String(n).padStart(2, '0');
}

function parseDurationToSeconds(text = '') {
  let secs = 0;
  const hourMatch = text.match(/(\d+)\s*h(our)?/i);
  const minMatch = text.match(/(\d+)\s*m(in)?/i);
  if (hourMatch) secs += parseInt(hourMatch[1], 10) * 3600;
  if (minMatch) secs += parseInt(minMatch[1], 10) * 60;
  return secs || 300;
}

function parseDistanceToMetres(text = '') {
  const kmMatch = text.match(/([\d.]+)\s*km/i);
  if (kmMatch) return Math.round(parseFloat(kmMatch[1]) * 1000);
  const mMatch = text.match(/([\d.]+)\s*m/i);
  if (mMatch) return Math.round(parseFloat(mMatch[1]));
  return 0;
}

function formatDistance(m) {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${m} m`;
}

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.ceil((totalSeconds % 3600) / 60);
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
}

export default function useShuttleDirections({
  originCoords,
  destinationCoords,
  originCampus,
  userCoords = null,
  enabled = true,
}) {
  const [route, setRoute] = useState([]);
  const [steps, setSteps] = useState([]);
  const [distanceText, setDistanceText] = useState('');
  const [durationText, setDurationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextDeparture, setNextDeparture] = useState(null);

  const debounceRef = useRef(null);
  const lastFetchOrigin = useRef(null);
  const lastFetchDest = useRef(null);
  const lastFetchRoute = useRef(null);

  const compute = async (currentOrigin, currentDestination) => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();

      // Determine shuttle stops
      const destCampus = originCampus === 'SGW' ? 'LOY' : 'SGW';
      const originStop = getShuttleStop(originCampus);
      const destStop = getShuttleStop(destCampus);

      if (!originStop || !destStop) throw new Error('Shuttle stop info missing.');
      if (!isShuttleOperating(now)) throw new Error('Shuttle does not operate today.');

      // 1. Fetch walk to stop first to get accurate arrival time
      const walkToStop = await fetchDirections(currentOrigin, originStop.coords, 'walking');
      if (!walkToStop) throw new Error('Failed to compute route to shuttle stop.');

      const leg1S = parseDurationToSeconds(walkToStop.durationText);
      const arrivalAtStop = new Date(now.getTime() + leg1S * 1000);

      // 2. Get next departure based on when the user actually arrives at the stop!
      const departure = getNextDeparture(originCampus, arrivalAtStop);
      if (!departure) throw new Error('No more shuttle buses today after you arrive.');
      setNextDeparture(departure);

      // 3. Fetch remaining 2 legs
      const [shuttleLeg, walkFromStop] = await Promise.all([
        fetchDirections(originStop.coords, destStop.coords, 'driving'), // shuttle as driving
        fetchDirections(destStop.coords, currentDestination, 'walking'),
      ]);

      if (!shuttleLeg || !walkFromStop)
        throw new Error('Failed to fetch directions.');

      // Segment the polylines so MapScreen can render them with different visual styles
      const segmentedRoute = [
        { id: 'leg1_walk', coordinates: walkToStop.polyline, mode: 'walking' },
        { id: 'leg2_shuttle', coordinates: shuttleLeg.polyline, mode: 'shuttle' },
        { id: 'leg3_walk', coordinates: walkFromStop.polyline, mode: 'walking' },
      ];

      // Combine steps, excluding redundant shuttle stop announcements
      const departureLabel = departure.label;
      const arrivalLabel = `${pad(departure.arrivalTime.getHours())}:${pad(departure.arrivalTime.getMinutes())}`;

      // Filter out redundant "destination" steps from the ends of the fetched walking/driving legs
      const cleanWalkToStop = walkToStop.steps.filter((s, i, arr) => i !== arr.length - 1 || !s.instruction.toLowerCase().includes('destination'));
      const cleanWalkFromStop = walkFromStop.steps.filter((s, i, arr) => i !== arr.length - 1 || !s.instruction.toLowerCase().includes('destination'));

      const combinedSteps = [
        ...cleanWalkToStop.map((s) => ({ ...s, leg: 'walk_to_stop' })),
        {
          instruction: `Ride shuttle from ${originStop.name} to ${destStop.name} (departs ${departureLabel}${departure.isLastBus ? ' — last bus' : ''})`,
          distance: shuttleLeg.distanceText,
          duration: shuttleLeg.durationText,
          leg: 'shuttle',
          isShuttleStep: true,
          isLastBus: departure.isLastBus,
        },
        {
          instruction: `Exit shuttle at ${destStop.name}`,
          distance: '',
          duration: '',
          isShuttleStep: true
        },
        ...cleanWalkFromStop.map((s) => ({ ...s, leg: 'walk_from_stop' })),
      ];

      // Compute total distances and durations
      const leg1M = parseDistanceToMetres(walkToStop.distanceText);
      const leg3M = parseDistanceToMetres(walkFromStop.distanceText);
      const totalM = leg1M + leg3M + parseDistanceToMetres(shuttleLeg.distanceText);

      const shuttleS = parseDurationToSeconds(shuttleLeg.durationText);
      const leg3S = parseDurationToSeconds(walkFromStop.durationText);

      // Add wait time until shuttle departs (based on arrival at stop, not 'now')
      const waitS = Math.max(0, (departure.departureTime.getTime() - arrivalAtStop.getTime()) / 1000);
      const totalS = leg1S + waitS + shuttleS + leg3S;

      setRoute(segmentedRoute);
      setSteps(combinedSteps);
      setDistanceText(formatDistance(totalM));
      setDurationText(formatDuration(totalS));

      lastFetchOrigin.current = currentOrigin;
      lastFetchDest.current = currentDestination;
      lastFetchRoute.current = segmentedRoute;
    } catch (e) {
      setError(e.message || 'Could not compute shuttle directions.');
      setRoute([]);
      setSteps([]);
      setDistanceText('');
      setDurationText('');
    } finally {
      setLoading(false);
    }
  };

  // Debounced compute on origin/destination/campus change
  useEffect(() => {
    if (!enabled || !originCoords || !destinationCoords || !originCampus) {
      setRoute([]);
      setSteps([]);
      setDistanceText('');
      setDurationText('');
      setError(null);
      setNextDeparture(null);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      compute(originCoords, destinationCoords);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [enabled, originCoords, destinationCoords, originCampus]);

  // Recompute if user deviates from route > RECALC_DISTANCE_M
  useEffect(() => {
  }, [userCoords]);

  return { route, steps, distanceText, durationText, loading, error, nextDeparture };
}