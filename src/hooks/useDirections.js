import { useState, useEffect, useRef } from 'react';
import { fetchDirections } from '../services/routing/googleDirections';

const DEBOUNCE_MS = 500;
const RECALC_DISTANCE_M = 50;

/**
 * Convert degrees to radians.
 * @param {number} deg
 * @returns {number}
 */
function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Haversine distance in metres between two LatLng points.
 * @param {{ latitude: number, longitude: number }} a
 * @param {{ latitude: number, longitude: number }} b
 * @returns {number}
 */
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

/**
 * Returns the closest distance from `point` to any point on the route polyline.
 * @param {{ latitude: number, longitude: number }} point
 * @param {{ latitude: number, longitude: number }[]} polyline
 * @returns {number} metres
 */
function minDistanceToRoute(point, polyline) {
  if (!polyline || polyline.length === 0) return Infinity;
  return Math.min(...polyline.map((p) => distanceMetres(point, p)));
}

/**
 * Hook that fetches and manages a route between two coordinate sets.
 *
 * @param {{
 *   originCoords: { latitude: number, longitude: number } | null,
 *   destinationCoords: { latitude: number, longitude: number } | null,
 *   travelMode: 'walking' | 'driving' | 'transit',
 *   userCoords: { latitude: number, longitude: number } | null,
 * }} params
 *
 * @returns {{
 *   route: { latitude: number, longitude: number }[],
 *   steps: { instruction: string, distance: string, duration: string }[],
 *   distanceText: string,
 *   durationText: string,
 *   loading: boolean,
 *   error: string | null,
 * }}
 */
export default function useDirections({
  originCoords,
  destinationCoords,
  travelMode = 'walking',
  userCoords = null,
}) {
  const [route, setRoute] = useState([]);
  const [steps, setSteps] = useState([]);
  const [distanceText, setDistanceText] = useState('');
  const [durationText, setDurationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const debounceTimer = useRef(null);
  const lastFetchOrigin = useRef(null);
  const lastFetchDest = useRef(null);
  const lastFetchMode = useRef(null);

  const doFetch = (origin, dest, mode) => {
    setLoading(true);
    setError(null);
    fetchDirections(origin, dest, mode)
      .then((result) => {
        if (result) {
          setRoute([{ id: 'standard', coordinates: result.polyline, mode }]);
          setSteps(result.steps);
          setDistanceText(result.distanceText);
          setDurationText(result.durationText);
          lastFetchOrigin.current = origin;
          lastFetchDest.current = dest;
          lastFetchMode.current = mode;
        } else {
          setError('No route found.');
          setRoute([]);
          setSteps([]);
          setDistanceText('');
          setDurationText('');
        }
      })
      .catch((e) => {
        setError(e.message || 'Failed to fetch directions.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Re-fetch when origin, destination or mode changes (debounced).
  useEffect(() => {
    if (!originCoords || !destinationCoords) {
      setRoute([]);
      setSteps([]);
      setDistanceText('');
      setDurationText('');
      setError(null);
      return;
    }

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      doFetch(originCoords, destinationCoords, travelMode);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceTimer.current);
  }, [originCoords, destinationCoords, travelMode]);

  // Re-fetch if user deviates from current route by > RECALC_DISTANCE_M metres.
  useEffect(() => {
    if (!userCoords || route.length === 0) return;
    if (!lastFetchOrigin.current || !lastFetchDest.current) return;

    const allPoints = route.flatMap(segment => segment.coordinates);
    const dist = minDistanceToRoute(userCoords, allPoints);
    if (dist > RECALC_DISTANCE_M) {
      doFetch(userCoords, lastFetchDest.current, lastFetchMode.current || travelMode);
    }
  }, [userCoords]);

  return { route, steps, distanceText, durationText, loading, error };
}
