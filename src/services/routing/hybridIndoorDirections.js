/**
 * Cross-building / cross-campus indoor + outdoor stitched routes.
 * Uses building_entry_exit nodes for indoor legs to the perimeter, then
 * Google walking directions between building centroids, then indoor to the room.
 */

import { getFloorGraph, getMultiFloorGraph } from '../../floor_plans/waypoints/waypointsIndex';
import { computeIndoorDirections } from './indoorDirections';
import { fetchDirections } from './googleDirections';
import { getBuildingCoords, getBuildingInfo } from '../api/buildings';

const WALKING_SPEED_MPS = 1.2;
const EXIT_TYPES = new Set(['building_entry_exit']);

function fmtDist(m) {
  if (m == null || Number.isNaN(m)) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function fmtDur(secs) {
  if (secs == null || Number.isNaN(secs)) return '';
  if (secs < 60) return `${Math.round(secs)} sec`;
  const min = Math.round(secs / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/**
 * @param {string} roomId
 * @param {Record<string, number[]>} availableOptions
 * @returns {string|null}
 */
export function findBuildingForRoom(roomId, availableOptions) {
  if (!roomId || !availableOptions) return null;
  for (const b of Object.keys(availableOptions)) {
    const floors = availableOptions[b] || [];
    for (const f of floors) {
      const g = getFloorGraph(b, f);
      if (g?.nodes?.[roomId]) return b;
    }
  }
  return null;
}

function fullBuildingGraph(building, availableOptions) {
  const floors = availableOptions[building];
  if (!floors?.length) return null;
  return getMultiFloorGraph(building, floors);
}

function collectExitIds(graph) {
  if (!graph?.nodes) return [];
  return Object.entries(graph.nodes)
    .filter(([, n]) => EXIT_TYPES.has(String(n.type || '')))
    .map(([id]) => id);
}

function pickBestExitFromRoom(fullGraph, roomId, accessibleOnly) {
  const exits = collectExitIds(fullGraph);
  if (exits.length === 0) return null;
  let best = null;
  let bestM = Infinity;
  for (const e of exits) {
    const r = computeIndoorDirections(fullGraph, roomId, e, accessibleOnly);
    if (r && r.totalMetres < bestM) {
      bestM = r.totalMetres;
      best = { exitId: e, indoor: r };
    }
  }
  return best;
}

function pickBestEntranceToRoom(fullGraph, roomId, accessibleOnly) {
  const exits = collectExitIds(fullGraph);
  if (exits.length === 0) return null;
  let best = null;
  let bestM = Infinity;
  for (const e of exits) {
    const r = computeIndoorDirections(fullGraph, e, roomId, accessibleOnly);
    if (r && r.totalMetres < bestM) {
      bestM = r.totalMetres;
      best = { entranceId: e, indoor: r };
    }
  }
  return best;
}

function campusLabel(campusId) {
  if (campusId === 'LOY') return 'Loyola';
  if (campusId === 'SGW') return 'SGW';
  return campusId || '';
}

/** Alphabetical compare for building codes (Sonar: sort must use localeCompare). */
function compareBuildingCode(a, b) {
  return String(a).localeCompare(String(b));
}

function appendGlobalRoomPickerNodesForGraph(entries, seen, b, f, g) {
  if (!g?.nodes) return;
  for (const [id, data] of Object.entries(g.nodes)) {
    if (seen.has(id)) continue;
    const type = (data.type || '').toString().toLowerCase();
    const label = (data.label || '').toString().toLowerCase();
    if (type === 'room' && !label.includes('corridor') && !id.includes('__HUB')) {
      seen.add(id);
      const raw = String(data?.label || '').trim();
      const fromId = String(id || '')
        .split('_')
        .pop()
        .replaceAll(/[^A-Za-z0-9-]/g, '')
        .trim();
      const base = raw || fromId || String(id || '').trim();
      const stripped = base.replace(/^room\s+/i, '').trim();
      const roomLabel = stripped ? `Room ${stripped}` : 'Room';
      entries.push({
        id,
        ...data,
        buildingCode: b,
        floor: data.floor ?? f,
        label: roomLabel,
        navLabel: `${b} · ${roomLabel}`,
      });
    }
  }
}

/**
 * @param {Record<string, number[]>} availableOptions
 * @returns {{ id: string, label: string, floor: number, buildingCode: string, accessible?: boolean }[]}
 */
export function getGlobalRoomPickerEntries(availableOptions) {
  const entries = [];
  for (const b of Object.keys(availableOptions).sort(compareBuildingCode)) {
    const floors = availableOptions[b] || [];
    const seen = new Set();
    for (const f of floors) {
      const g = getFloorGraph(b, f);
      appendGlobalRoomPickerNodesForGraph(entries, seen, b, f, g);
    }
  }
  return entries.sort((a, c) =>
    `${a.buildingCode} ${a.label}`.localeCompare(`${c.buildingCode} ${c.label}`)
  );
}

/**
 * @param {Record<string, number[]>} availableOptions
 * @returns {{ title: string, data: object[] }[]}
 */
export function getGlobalRoomPickerSections(availableOptions) {
  const entries = getGlobalRoomPickerEntries(availableOptions);
  const byB = {};
  for (const r of entries) {
    if (!byB[r.buildingCode]) byB[r.buildingCode] = [];
    byB[r.buildingCode].push(r);
  }
  return Object.keys(byB)
    .sort(compareBuildingCode)
    .map((b) => {
      const info = getBuildingInfo(b);
      const campus = info?.campus ? ` (${campusLabel(info.campus)})` : '';
      return {
        title: `${b} — ${info?.name || b}${campus}`,
        data: byB[b].sort((a, c) => {
          if (a.floor !== c.floor) return a.floor - c.floor;
          return a.label.localeCompare(c.label);
        }),
      };
    });
}

/**
 * @param {{
 *   originBuilding: string,
 *   destBuilding: string,
 *   originRoomId: string,
 *   destRoomId: string,
 *   availableOptions: Record<string, number[]>,
 *   accessibleOnly?: boolean,
 * }} params
 * @returns {Promise<object>}
 */
export async function computeHybridIndoorOutdoorRoute({
  originBuilding,
  destBuilding,
  originRoomId,
  destRoomId,
  availableOptions,
  accessibleOnly = false,
}) {
  if (!originBuilding || !destBuilding || !originRoomId || !destRoomId) {
    throw new Error('Missing origin or destination.');
  }
  if (originBuilding === destBuilding) {
    throw new Error('Same-building route should use indoor-only routing.');
  }

  const graphA = fullBuildingGraph(originBuilding, availableOptions);
  const graphB = fullBuildingGraph(destBuilding, availableOptions);
  if (!graphA?.nodes?.[originRoomId]) {
    throw new Error('Origin room is not in the indoor map for this building.');
  }
  if (!graphB?.nodes?.[destRoomId]) {
    throw new Error('Destination room is not in the indoor map for this building.');
  }

  const outPick = pickBestExitFromRoom(graphA, originRoomId, accessibleOnly);
  const inPick = pickBestEntranceToRoom(graphB, destRoomId, accessibleOnly);
  if (!outPick) {
    throw new Error(
      `No building exit is defined in the indoor map for ${originBuilding}. Cross-building routes need exit points.`
    );
  }
  if (!inPick) {
    throw new Error(
      `No building exit is defined in the indoor map for ${destBuilding}. Cross-building routes need exit points.`
    );
  }

  const coordsA = getBuildingCoords(originBuilding);
  const coordsB = getBuildingCoords(destBuilding);
  if (!coordsA || !coordsB) {
    throw new Error('Could not resolve building locations for outdoor routing.');
  }

  const outdoor = await fetchDirections(coordsA, coordsB, 'walking');
  if (!outdoor) {
    throw new Error('Outdoor segment could not be computed.');
  }

  const infoA = getBuildingInfo(originBuilding);
  const infoB = getBuildingInfo(destBuilding);
  const nameA = infoA?.name || originBuilding;
  const nameB = infoB?.name || destBuilding;
  const campusA = infoA?.campus;
  const campusB = infoB?.campus;
  const crossCampus = campusA && campusB && campusA !== campusB;

  const indoorSecs =
    (outPick.indoor.totalMetres + inPick.indoor.totalMetres) / WALKING_SPEED_MPS;
  const outdoorSecs = outdoor.durationSeconds ?? 0;
  const totalSecs = indoorSecs + outdoorSecs;
  const outdoorMetres = outdoor.distanceMeters ?? 0;
  const totalMetres =
    outPick.indoor.totalMetres + inPick.indoor.totalMetres + outdoorMetres;

  const originTransition = crossCampus
    ? `Exit ${nameA} (${campusLabel(campusA)}) and follow the outdoor directions toward ${nameB} on ${campusLabel(campusB)}.`
    : `Exit ${nameA} and follow the outdoor directions toward ${nameB}.`;

  const destTransition = `Enter ${nameB} and follow the indoor steps to your room.`;

  const leg1Steps = (outPick.indoor.steps ?? []).map((s, i) => ({
    ...s,
    id: `l1-${s.id ?? i}`,
  }));
  const outdoorLegSteps = (outdoor.steps ?? []).map((s, i) => ({
    ...s,
    id: `out-${s.id ?? i}`,
  }));
  const leg2Steps = (inPick.indoor.steps ?? []).map((s, i) => ({
    ...s,
    id: `l2-${s.id ?? i}`,
  }));

  const shuttleHintStep = crossCampus
    ? [
        {
          kind: 'transition',
          id: 't-shuttle-hint',
          instruction:
            'Between SGW and Loyola, the Campus Shuttle can be faster than walking the whole way. You can open the main map and choose Shuttle as the travel mode if you prefer.',
        },
      ]
    : [];

  const steps = [
    {
      kind: 'segment',
      id: 'seg-indoor-start',
      title: `Inside ${nameA} (${originBuilding})`,
    },
    ...leg1Steps,
    {
      kind: 'transition',
      id: 't-outdoor-start',
      instruction: originTransition,
    },
    {
      kind: 'segment',
      id: 'seg-outdoor',
      title: 'Outside — walking',
    },
    ...outdoorLegSteps,
    {
      kind: 'transition',
      id: 't-indoor-resume',
      instruction: destTransition,
    },
    ...shuttleHintStep,
    {
      kind: 'segment',
      id: 'seg-indoor-end',
      title: `Inside ${nameB} (${destBuilding})`,
    },
    ...leg2Steps,
  ];

  return {
    kind: 'hybrid',
    originBuilding,
    destBuilding,
    originExitId: outPick.exitId,
    destEntranceId: inPick.entranceId,
    leg1Indoor: outPick.indoor,
    outdoor,
    leg2Indoor: inPick.indoor,
    steps,
    distanceText: fmtDist(totalMetres),
    durationText: fmtDur(totalSecs),
    totalMetres,
    crossCampus,
  };
}
