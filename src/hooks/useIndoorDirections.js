/**
 * ───────────────────────────────────────────────────────────────────────────
 * useIndoorDirections – React hook for indoor navigation state
 * ───────────────────────────────────────────────────────────────────────────
 * Mirrors the shape of useDirections (outdoor) but drives the synchronous
 * computeIndoorDirections() function instead of calling a remote API.
 *
 * Recalculation on deviation
 * ──────────────────────────
 * If `userPosition` (SVG {x,y} coordinates) is provided and strays more than
 * RECALC_THRESHOLD_PX units from the current path, the route is automatically
 * recalculated from the node nearest to the user's position to the original
 * destination.  This satisfies the "I am here" deviation-recalc requirement.
 * ───────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef } from 'react';
import { computeIndoorDirections, findNearestNode } from '../services/routing/indoorDirections';

/** Minimum deviation (SVG units) before a route recalculation is triggered. */
const RECALC_THRESHOLD_PX = 50;

/**
 * Minimum distance (SVG units) from `pos` to the closest point on `pathPoints`.
 */
function minDistToPath(pos, pathPoints) {
  if (!pathPoints || pathPoints.length === 0) return Infinity;
  return Math.min(
    ...pathPoints.map(p => Math.sqrt((p.x - pos.x) ** 2 + (p.y - pos.y) ** 2))
  );
}

/**
 * @param {{
 *   graph: object | null,
 *   originId: string | null,
 *   destinationId: string | null,
 *   userPosition: { x: number, y: number } | null,
 *   accessibleOnly: boolean,
 * }} params
 *
 * @returns {{
 *   result: {
 *     path: string[],
 *     pathPoints: {x,y,id}[],
 *     steps: {id,instruction,distance,duration}[],
 *     distanceText: string,
 *     durationText: string,
 *     totalMetres: number,
 *   } | null,
 *   loading: boolean,
 *   error: string | null,
 * }}
 */
export default function useIndoorDirections({
  graph,
  originId,
  destinationId,
  userPosition = null,
  accessibleOnly = false,
}) {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // Track destination so we can recalculate towards the same destination
  // when the user deviates from the path.
  const lastDestRef = useRef(null);

  const calculate = (origin, dest) => {
    if (!graph || !origin || !dest) {
      setResult(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const r = computeIndoorDirections(graph, origin, dest, accessibleOnly);
      if (r) {
        setResult(r);
        lastDestRef.current = dest;
      } else {
        setResult(null);
        setError('No path found between these locations.');
      }
    } catch (e) {
      setError(e.message || 'Path calculation failed.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate whenever origin, destination, graph, or accessibility changes.
  useEffect(() => {
    calculate(originId, destinationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originId, destinationId, graph, accessibleOnly]);

  // Recalculate if user deviates from the current path by more than the threshold.
  useEffect(() => {
    if (!userPosition || !result?.pathPoints || !lastDestRef.current) return;

    const dist = minDistToPath(userPosition, result.pathPoints);
    if (dist > RECALC_THRESHOLD_PX) {
      const nearestId = findNearestNode(graph?.nodes, userPosition);
      // Avoid infinite loop: don't recalculate if already at the destination
      if (nearestId && nearestId !== lastDestRef.current) {
        calculate(nearestId, lastDestRef.current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPosition]);

  return { result, loading, error };
}
