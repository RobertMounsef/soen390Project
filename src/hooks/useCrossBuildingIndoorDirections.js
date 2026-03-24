import { useState, useEffect, useMemo, useRef } from 'react';
import { getAvailableFloors } from '../floor_plans/waypoints/waypointsIndex';
import {
  getFullBuildingRoutingGraph,
  bestIndoorPathToExit,
  bestIndoorPathFromExit,
  mergeCrossBuildingSteps,
  summarizeHybridTotals,
} from '../services/routing/crossBuildingIndoorDirections';
import { fetchDirections } from '../services/routing/googleDirections';
import { getBuildingCoords, getBuildingInfo } from '../services/api/buildings';

const DEBOUNCE_MS = 500;

function floorsByBuildingFromIndex() {
  const map = {};
  for (const { building, floor } of getAvailableFloors()) {
    if (!map[building]) map[building] = [];
    if (typeof floor === 'number' && !Number.isNaN(floor)) {
      map[building].push(floor);
    }
  }
  Object.keys(map).forEach((b) => {
    map[b] = [...new Set(map[b])].sort((a, c) => a - c);
  });
  return map;
}

/**
 * Indoor + outdoor directions when origin and destination rooms are in different buildings.
 *
 * @param {{
 *   originBuilding: string | null,
 *   destinationBuilding: string | null,
 *   originRoomId: string | null,
 *   destinationRoomId: string | null,
 *   accessibleOnly: boolean,
 *   enabled: boolean,
 * }} params
 */
export default function useCrossBuildingIndoorDirections({
  originBuilding,
  destinationBuilding,
  originRoomId,
  destinationRoomId,
  accessibleOnly = false,
  enabled = false,
}) {
  const [outdoorSteps, setOutdoorSteps] = useState([]);
  const [outdoorDistanceText, setOutdoorDistanceText] = useState('');
  const [outdoorDurationText, setOutdoorDurationText] = useState('');
  const [outdoorLoading, setOutdoorLoading] = useState(false);
  const [outdoorError, setOutdoorError] = useState(null);

  const floorsMap = useMemo(() => floorsByBuildingFromIndex(), []);
  const debounceRef = useRef(null);

  const originGraph = useMemo(() => {
    if (!originBuilding) return null;
    return getFullBuildingRoutingGraph(floorsMap, originBuilding);
  }, [originBuilding, floorsMap]);

  const destGraph = useMemo(() => {
    if (!destinationBuilding) return null;
    return getFullBuildingRoutingGraph(floorsMap, destinationBuilding);
  }, [destinationBuilding, floorsMap]);

  const indoorSync = useMemo(() => {
    if (!enabled || !originGraph || !destGraph || !originRoomId || !destinationRoomId) {
      return { error: null, legOut: null, legIn: null };
    }

    const toExit = bestIndoorPathToExit(originGraph, originRoomId, accessibleOnly);
    if (!toExit) {
      return {
        error: `No mapped building exits in ${originBuilding} for outdoor handoff. Cross-building indoor directions need exit nodes in the floor data.`,
        legOut: null,
        legIn: null,
      };
    }

    const fromExit = bestIndoorPathFromExit(destGraph, destinationRoomId, accessibleOnly);
    if (!fromExit) {
      return {
        error: `No mapped building exits in ${destinationBuilding} for outdoor handoff.`,
        legOut: null,
        legIn: null,
      };
    }

    const pathOut = toExit.indoorResult;
    const pathIn = fromExit.indoorResult;
    if (!pathOut || !pathIn) {
      return {
        error: 'Could not compute indoor paths to or from an exit.',
        legOut: null,
        legIn: null,
      };
    }

    return { error: null, legOut: pathOut, legIn: pathIn };
  }, [
    enabled,
    originGraph,
    destGraph,
    originRoomId,
    destinationRoomId,
    accessibleOnly,
    originBuilding,
    destinationBuilding,
  ]);

  useEffect(() => {
    if (!enabled || indoorSync.error || !indoorSync.legOut || !indoorSync.legIn) {
      setOutdoorSteps([]);
      setOutdoorDistanceText('');
      setOutdoorDurationText('');
      setOutdoorError(null);
      setOutdoorLoading(false);
      return;
    }

    const oCoords = getBuildingCoords(originBuilding);
    const dCoords = getBuildingCoords(destinationBuilding);
    if (!oCoords || !dCoords) {
      setOutdoorError('Missing building coordinates for outdoor segment.');
      setOutdoorSteps([]);
      setOutdoorLoading(false);
      return;
    }

    clearTimeout(debounceRef.current);
    setOutdoorLoading(true);
    setOutdoorError(null);

    debounceRef.current = setTimeout(() => {
      fetchDirections(oCoords, dCoords, 'walking')
        .then((res) => {
          if (res) {
            setOutdoorSteps(res.steps || []);
            setOutdoorDistanceText(res.distanceText || '');
            setOutdoorDurationText(res.durationText || '');
            setOutdoorError(null);
          } else {
            setOutdoorSteps([]);
            setOutdoorDistanceText('');
            setOutdoorDurationText('');
            setOutdoorError('No outdoor route found between buildings.');
          }
        })
        .catch((e) => {
          setOutdoorError(e.message || 'Outdoor directions failed.');
          setOutdoorSteps([]);
        })
        .finally(() => {
          setOutdoorLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [
    enabled,
    originBuilding,
    destinationBuilding,
    indoorSync.error,
    indoorSync.legOut,
    indoorSync.legIn,
  ]);

  const result = useMemo(() => {
    if (!enabled || indoorSync.error) return null;
    if (!indoorSync.legOut || !indoorSync.legIn) return null;
    if (outdoorLoading) return null;

    const startInfo = getBuildingInfo(originBuilding);
    const endInfo = getBuildingInfo(destinationBuilding);
    const startName = startInfo?.name || originBuilding;
    const endName = endInfo?.name || destinationBuilding;

    let crossCampusNote = null;
    if (startInfo?.campus && endInfo?.campus && startInfo.campus !== endInfo.campus) {
      crossCampusNote =
        'Different campuses: for SGW ↔ Loyola you can also use the Concordia shuttle — plan that segment from the main campus map (walking / shuttle mode).';
    }

    const steps = mergeCrossBuildingSteps({
      startBuildingName: startName,
      endBuildingName: endName,
      legToExit: indoorSync.legOut,
      outdoorSteps,
      legFromExit: indoorSync.legIn,
      crossCampusNote,
    });

    const { distanceText, durationText, totalMetres } = summarizeHybridTotals(
      indoorSync.legOut,
      indoorSync.legIn,
      outdoorDistanceText,
      outdoorDurationText,
    );

    return {
      steps,
      distanceText,
      durationText,
      totalMetres,
      pathPointsOrigin: indoorSync.legOut.pathPoints || [],
      pathPointsDestination: indoorSync.legIn.pathPoints || [],
      originGraph,
      destGraph,
    };
  }, [
    enabled,
    indoorSync,
    originBuilding,
    destinationBuilding,
    outdoorSteps,
    outdoorDistanceText,
    outdoorDurationText,
    originGraph,
    destGraph,
    outdoorLoading,
  ]);

  const loading = outdoorLoading;
  const error =
    indoorSync.error || (outdoorError && !outdoorLoading ? outdoorError : null);

  return {
    result,
    loading,
    error,
    outdoorLoading,
  };
}
