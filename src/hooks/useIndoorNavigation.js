import { useState, useMemo, useEffect, useCallback } from 'react';
import useResource from './useResource';
import useIndoorDirections from './useIndoorDirections';
import { getFloorGraph, getMultiFloorGraph, getFloorInfoForStops } from '../floor_plans/waypoints/waypointsIndex';

export default function useIndoorNavigation({
  selectedBuilding,
  selectedFloor,
  originId,
  destinationId,
  userPositionId,
  accessibleOnly,
}) {
  const [displayFloor, setDisplayFloor] = useState(selectedFloor);

  useEffect(() => {
    setDisplayFloor(selectedFloor);
  }, [selectedFloor]);

  // Fetch the graph for the currently displayed floor (visual map)
  const { 
    data: displayGraph, 
    loading: displayLoading, 
    error: displayError 
  } = useResource(
    getFloorGraph,
    [selectedBuilding, displayFloor]
  );

  // Determine if we need multi-floor routing
  const floorInfo = useMemo(() => {
    if (!selectedBuilding || !originId || !destinationId) return null;
    return getFloorInfoForStops(selectedBuilding, originId, destinationId);
  }, [selectedBuilding, originId, destinationId]);

  const isMultiFloor = useMemo(() => {
    return floorInfo && floorInfo.commonFloor === null;
  }, [floorInfo]);

  const floorsNeeded = useMemo(() => {
    if (!isMultiFloor || !floorInfo) return null;
    return [floorInfo.originFloor, floorInfo.destFloor].sort((a, b) => a - b);
  }, [isMultiFloor, floorInfo]);

  // Fetch the routing graph (multi-floor if needed, otherwise same as displayGraph)
  const {
    data: multiGraph,
    loading: multiLoading,
    error: multiError
  } = useResource(
    getMultiFloorGraph,
    [selectedBuilding, floorsNeeded]
  );

  const routingGraph = isMultiFloor ? multiGraph : displayGraph;

  const userPositionNode = useMemo(() => {
    if (!userPositionId || !routingGraph?.nodes) return null;
    return routingGraph.nodes[userPositionId];
  }, [userPositionId, routingGraph]);

  const { result, loading: routeLoading, error: routeError } = useIndoorDirections({
    graph: routingGraph,
    originId,
    destinationId,
    userPosition: userPositionNode ? { x: userPositionNode.x, y: userPositionNode.y } : null,
    accessibleOnly,
  });

  // Auto-sync displayFloor to route origin when a multi-floor route is first calculated
  useEffect(() => {
    if (isMultiFloor && floorInfo?.originFloor != null) {
      setDisplayFloor(floorInfo.originFloor);
    }
  }, [isMultiFloor, floorInfo?.originFloor]);

  const handleFloorChange = useCallback((floor) => {
    setDisplayFloor(floor);
  }, []);

  return {
    displayGraph,
    routingGraph,
    result,
    displayFloor,
    handleFloorChange,
    loading: displayLoading || multiLoading || routeLoading,
    error: displayError || multiError || routeError,
    isMultiFloor,
    floorsNeeded,
  };
}
