/**
 * Combines two indoor legs (room ↔ nearest mapped exit) with outdoor turn-by-turn
 * steps for cross-building and cross-campus navigation (US-5.6).
 */

import { computeIndoorDirections } from './indoorDirections';
import { getMultiFloorGraph, getMultiFloorGraphLegacyMerged } from '../../floor_plans/waypoints/waypointsIndex';

/**
 * @param {object} graph
 * @returns {string[]}
 */
export function listEntranceNodeIds(graph) {
  if (!graph?.nodes) return [];
  return Object.keys(graph.nodes).filter(
    (id) =>
      String(graph.nodes[id]?.type || '').toLowerCase() === 'building_entry_exit',
  );
}

/**
 * @param {Record<string, number[]>} floorsByBuilding
 * @param {string} building
 * @returns {object|null}
 */
export function getFullBuildingRoutingGraph(floorsByBuilding, building) {
  const b = (building || '').toString().toUpperCase();
  const floors = floorsByBuilding[b];
  if (!floors?.length) return null;
  return getMultiFloorGraph(b, floors) || getMultiFloorGraphLegacyMerged(b, floors);
}

/**
 * Shortest indoor path from room to any building_entry_exit node.
 * @returns {{ indoorResult: object, exitId: string } | null}
 */
export function bestIndoorPathToExit(graph, roomId, accessibleOnly) {
  const exits = listEntranceNodeIds(graph);
  if (!exits.length || !roomId) return null;
  let best = null;
  let bestExit = null;
  for (const exitId of exits) {
    const r = computeIndoorDirections(graph, roomId, exitId, accessibleOnly);
    if (r && (!best || r.totalMetres < best.totalMetres)) {
      best = r;
      bestExit = exitId;
    }
  }
  if (!best || !bestExit) return null;
  return { indoorResult: best, exitId: bestExit };
}

/**
 * Shortest indoor path from any exit to room.
 * @returns {{ indoorResult: object, exitId: string } | null}
 */
export function bestIndoorPathFromExit(graph, roomId, accessibleOnly) {
  const exits = listEntranceNodeIds(graph);
  if (!exits.length || !roomId) return null;
  let best = null;
  let bestExit = null;
  for (const exitId of exits) {
    const r = computeIndoorDirections(graph, exitId, roomId, accessibleOnly);
    if (r && (!best || r.totalMetres < best.totalMetres)) {
      best = r;
      bestExit = exitId;
    }
  }
  if (!best || !bestExit) return null;
  return { indoorResult: best, exitId: bestExit };
}

function cloneStepsWithNewIds(steps, idPrefix) {
  return (steps || []).map((s, i) => ({
    ...s,
    id: `${idPrefix}-${i}`,
  }));
}

/**
 * @param {{
 *   startBuildingName: string,
 *   endBuildingName: string,
 *   legToExit: object,
 *   outdoorSteps: { instruction: string, distance?: string, duration?: string }[],
 *   legFromExit: object,
 *   crossCampusNote?: string | null,
 * }} p
 * @returns {object[]}
 */
export function mergeCrossBuildingSteps({
  startBuildingName,
  endBuildingName,
  legToExit,
  outdoorSteps,
  legFromExit,
  crossCampusNote = null,
}) {
  const out = [];
  let seq = 0;
  const sid = () => `xb-${seq++}`;

  out.push({ id: sid(), kind: 'section', title: `Inside ${startBuildingName}` });
  for (const s of cloneStepsWithNewIds(legToExit.steps, 'in1')) {
    out.push({ ...s, id: sid() });
  }

  out.push({
    id: sid(),
    kind: 'transition',
    instruction: `Leave ${startBuildingName} and go outside. Follow the outdoor directions toward ${endBuildingName}.`,
    distance: '',
    duration: '',
  });

  if (crossCampusNote) {
    out.push({
      id: sid(),
      kind: 'transition',
      instruction: crossCampusNote,
      distance: '',
      duration: '',
    });
  }

  out.push({
    id: sid(),
    kind: 'section',
    title: 'Outdoor — between buildings',
  });

  const outdoor = outdoorSteps || [];
  if (outdoor.length === 0) {
    out.push({
      id: sid(),
      kind: 'outdoor',
      instruction: 'Open the campus map and walk toward the destination building (outdoor path loading or unavailable).',
      distance: '',
      duration: '',
    });
  } else {
    for (const os of outdoor) {
      out.push({
        id: sid(),
        kind: 'outdoor',
        instruction: os.instruction || '',
        distance: os.distance || '',
        duration: os.duration || '',
      });
    }
  }

  out.push({
    id: sid(),
    kind: 'transition',
    instruction: `Enter ${endBuildingName} and continue indoors.`,
    distance: '',
    duration: '',
  });

  out.push({ id: sid(), kind: 'section', title: `Inside ${endBuildingName}` });
  for (const s of cloneStepsWithNewIds(legFromExit.steps, 'in2')) {
    out.push({ ...s, id: sid() });
  }

  return out;
}

/**
 * @param {object} legToExit
 * @param {object} legFromExit
 * @param {string} outdoorDistanceText
 * @param {string} outdoorDurationText
 * @returns {{ distanceText: string, durationText: string, totalMetres: number }}
 */
export function summarizeHybridTotals(legToExit, legFromExit, outdoorDistanceText, outdoorDurationText) {
  const parseMetres = (text) => {
    if (typeof text !== 'string') return 0;
    const safe = text.substring(0, 60);
    const km = /([\d.]{1,8})\s*km/i.exec(safe);
    if (km) return Math.round(Number.parseFloat(km[1]) * 1000);
    const m = /([\d.]{1,8})\s*m\b/i.exec(safe);
    if (m) return Math.round(Number.parseFloat(m[1]));
    return 0;
  };

  const indoorM = (legToExit?.totalMetres || 0) + (legFromExit?.totalMetres || 0);
  const outdoorM = parseMetres(outdoorDistanceText);
  const totalM = indoorM + outdoorM;

  let distLabel;
  if (totalM >= 1000) {
    distLabel = `${(totalM / 1000).toFixed(1)} km`;
  } else if (totalM > 0) {
    distLabel = `${Math.round(totalM)} m`;
  } else {
    distLabel = '—';
  }

  const durParts = [legToExit?.durationText, outdoorDurationText, legFromExit?.durationText].filter(Boolean);
  const durationText = durParts.length ? durParts.join(' + ') : '—';

  return {
    distanceText: distLabel,
    durationText,
    totalMetres: totalM,
  };
}
