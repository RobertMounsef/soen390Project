import { getFloorInfoForStops } from '../floor_plans/waypoints/waypointsIndex';

/**
 * Single-floor Dijkstra must use the graph that actually contains both node ids.
 * Automatically switches to the correct floor if stops share one or if only one is set.
 */
export function resolveRoutingSingleFloor(selectedBuilding, selectedFloor, originId, destinationId) {
  if (!selectedBuilding) return selectedFloor;

  const { originFloor, destFloor, commonFloor } = getFloorInfoForStops(
    selectedBuilding,
    originId,
    destinationId,
  );

  if (commonFloor != null) return commonFloor;
  if (originFloor != null && !destinationId) return originFloor;
  if (destFloor != null && !originId) return destFloor;

  return selectedFloor;
}

/**
 * Floor to show for single-floor routes when it is implied by the picked stops.
 * Returns null when both stops are unset or span floors (caller keeps selectedFloor).
 */
export function getCommonFloorForStops(selectedBuilding, _availableOptions, originId, destinationId) {
  if (!selectedBuilding) return null;
  const { originFloor, destFloor, commonFloor } = getFloorInfoForStops(
    selectedBuilding,
    originId,
    destinationId,
  );
  if (commonFloor != null) return commonFloor;
  if (originFloor != null && !destinationId) return originFloor;
  if (destFloor != null && !originId) return destFloor;
  return null;
}
