/**
 * Merges Google outdoor directions with an indoor leg (building entrance → class room)
 * for "next class" calendar navigation.
 */

import { getAvailableFloors, getFloorGraph } from '../../floor_plans/waypoints/waypointsIndex';
import { getBuildingInfo } from '../api/buildings';
import {
  computeIndoorLegFromBuildingEntranceToRoom,
  fmtDist,
  fmtDur,
  WALKING_SPEED_MPS,
} from './hybridIndoorDirections';

/** @returns {Record<string, number[]>} */
export function buildAvailableOptionsFromWaypoints() {
  const floors = getAvailableFloors();
  const map = {};
  floors.forEach(({ building, floor }) => {
    if (!map[building]) map[building] = [];
    if (typeof floor === 'number' && !Number.isNaN(floor)) {
      map[building].push(floor);
    }
  });
  Object.keys(map).forEach((b) => map[b].sort((a, b2) => a - b2));
  return map;
}

function normalizeRoomToken(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/^room\s+/i, '')
    .replaceAll(/\s+/g, '')
    .replaceAll('.', '');
}

function isSkippableNonRoomNode(id, data) {
  const type = (data.type || '').toString().toLowerCase();
  if (type !== 'room') return true;
  const rawLabel = (data.label || '').toString().toLowerCase();
  return rawLabel.includes('corridor') || id.includes('__HUB');
}

function graphRoomIdToken(id) {
  return id.split('_').pop().replaceAll(/[^a-z0-9]/gi, '').toLowerCase();
}

/**
 * @param {string} id
 * @param {object} data
 * @param {string} hintNorm
 * @param {string[]} exact
 * @param {string[]} fuzzy
 */
function classifyCalendarRoomMatch(id, data, hintNorm, exact, fuzzy) {
  if (isSkippableNonRoomNode(id, data)) return;
  const fromId = graphRoomIdToken(id);
  const labelNorm = normalizeRoomToken(data.label || '');
  const isExact =
    labelNorm === hintNorm
    || fromId === hintNorm
    || labelNorm.endsWith(hintNorm)
    || hintNorm.endsWith(labelNorm);
  if (isExact) {
    exact.push(id);
    return;
  }
  if (hintNorm.length >= 2 && (labelNorm.includes(hintNorm) || fromId.includes(hintNorm))) {
    fuzzy.push(id);
  }
}

/**
 * Match parsed calendar room text (e.g. "1.162", "820", "S2.285") to an indoor graph room node.
 *
 * @param {string} buildingId – building code (e.g. "H", "EV")
 * @param {string|null|undefined} roomHint – from calendarClassLocation parse
 * @param {Record<string, number[]>} availableOptions
 * @returns {string|null}
 */
export function findRoomNodeIdForCalendar(buildingId, roomHint, availableOptions) {
  if (!buildingId || roomHint == null || !availableOptions) return null;
  const hintRaw = String(roomHint).trim();
  if (!hintRaw) return null;
  const hintNorm = normalizeRoomToken(hintRaw);
  if (!hintNorm) return null;

  const floors = availableOptions[buildingId] ?? [];
  /** @type {string[]} */
  const exact = [];
  /** @type {string[]} */
  const fuzzy = [];

  for (const f of floors) {
    const g = getFloorGraph(buildingId, f);
    if (!g?.nodes) continue;
    for (const [id, data] of Object.entries(g.nodes)) {
      classifyCalendarRoomMatch(id, data, hintNorm, exact, fuzzy);
    }
  }

  if (exact.length >= 1) return exact[0];
  if (fuzzy.length === 1) return fuzzy[0];
  return null;
}

/**
 * @param {{
 *   destBuildingId: string,
 *   destRoomNodeId: string,
 *   availableOptions: Record<string, number[]>,
 *   outdoorSteps: object[],
 *   outdoorDistanceMeters: number|null,
 *   outdoorDurationSeconds: number|null,
 * }} p
 */
export function mergeCalendarOutdoorWithIndoorLeg(p) {
  const {
    destBuildingId,
    destRoomNodeId,
    availableOptions,
    outdoorSteps,
    outdoorDistanceMeters,
    outdoorDurationSeconds,
  } = p;

  const leg = computeIndoorLegFromBuildingEntranceToRoom(
    destBuildingId,
    destRoomNodeId,
    availableOptions,
    false,
  );
  if (!leg) return null;

  const infoB = getBuildingInfo(destBuildingId);
  const nameB = infoB?.name || destBuildingId;

  const indoorSecs = leg.indoor.totalMetres / WALKING_SPEED_MPS;
  const outdoorSecs = outdoorDurationSeconds ?? 0;
  const totalSecs = indoorSecs + outdoorSecs;
  const outdoorMetres = outdoorDistanceMeters ?? 0;
  const totalMetres = leg.indoor.totalMetres + outdoorMetres;

  const destTransition = `Enter ${nameB} and follow the indoor steps to your room.`;
  const destEntranceNode = leg.graph?.nodes?.[leg.entranceId];
  let destEntranceFloor = null;
  if (destEntranceNode?.floor != null && !Number.isNaN(Number(destEntranceNode.floor))) {
    destEntranceFloor = Number(destEntranceNode.floor);
  }

  const indoorStepsMapped = (leg.indoor.steps ?? []).map((s, i) => ({
    ...s,
    id: `cal-in-${s.id ?? i}`,
  }));
  const outdoorLegSteps = (outdoorSteps ?? []).map((s, i) => {
    const defaultOutId = `s${i}`;
    return {
      ...s,
      id: `cal-out-${s.id ?? defaultOutId}`,
    };
  });

  const steps = [
    { kind: 'segment', id: 'cal-seg-outdoor', title: 'Outside — walking' },
    ...outdoorLegSteps,
    {
      kind: 'transition',
      id: 'cal-t-indoor-resume',
      instruction: destTransition,
      openIndoor: {
        buildingId: destBuildingId,
        floor: destEntranceFloor,
        entranceNodeId: leg.entranceId,
        destinationRoomId: destRoomNodeId,
      },
    },
    {
      kind: 'segment',
      id: 'cal-seg-indoor-end',
      title: `Inside ${nameB} (${destBuildingId})`,
    },
    ...indoorStepsMapped,
  ];

  return {
    steps,
    distanceText: fmtDist(totalMetres),
    durationText: fmtDur(totalSecs),
    // Not full hybrid (origin+dest buildings); must stay false so MapScreen does not skip outdoor fetch via indoorOnlyOnMap.
    isHybrid: false,
    originBuildingId: null,
    destinationBuildingId: destBuildingId,
    originRoomId: leg.entranceId,
    destinationRoomId: destRoomNodeId,
  };
}
