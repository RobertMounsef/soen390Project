import * as indoorDirections from './indoorDirections';
import * as waypointsIndex from '../../floor_plans/waypoints/waypointsIndex';
import {
  listEntranceNodeIds,
  getFullBuildingRoutingGraph,
  bestIndoorPathToExit,
  bestIndoorPathFromExit,
  mergeCrossBuildingSteps,
  summarizeHybridTotals,
} from './crossBuildingIndoorDirections';

const SIMPLE_GRAPH = {
  nodes: {
    R1: { id: 'R1', type: 'room', x: 0, y: 0, floor: 1, accessible: true },
    E1: { id: 'E1', type: 'building_entry_exit', x: 100, y: 0, floor: 1, accessible: true },
    E2: { id: 'E2', type: 'building_entry_exit', x: 50, y: 0, floor: 1, accessible: true },
  },
  edges: [
    { from: 'R1', to: 'E2', weight: 50 },
    { from: 'E2', to: 'E1', weight: 50 },
  ],
  meta: {},
  viewBox: '0 0 200 200',
};

describe('crossBuildingIndoorDirections', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lists entrance node ids', () => {
    expect(listEntranceNodeIds(SIMPLE_GRAPH).sort()).toEqual(['E1', 'E2']);
    expect(listEntranceNodeIds(null)).toEqual([]);
    expect(listEntranceNodeIds({ nodes: {} })).toEqual([]);
    expect(
      listEntranceNodeIds({
        nodes: {
          X: { type: 'BUILDING_ENTRY_EXIT', id: 'X' },
          Y: { type: 'room', id: 'Y' },
          Z: { id: 'Z' },
        },
      }),
    ).toEqual(['X']);
  });

  it('getFullBuildingRoutingGraph returns null without floors and delegates when present', () => {
    expect(getFullBuildingRoutingGraph({}, 'H')).toBeNull();
    expect(getFullBuildingRoutingGraph({ H: [] }, 'H')).toBeNull();
    expect(getFullBuildingRoutingGraph({ H: [1] }, '')).toBeNull();

    const spy = jest.spyOn(waypointsIndex, 'getMultiFloorGraph').mockReturnValue({ nodes: { x: 1 } });
    const g = getFullBuildingRoutingGraph({ HA: [1, 3] }, 'ha');
    expect(spy).toHaveBeenCalledWith('HA', [1, 3]);
    expect(g).toEqual({ nodes: { x: 1 } });
  });

  it('getFullBuildingRoutingGraph uses legacy merge when no combined building JSON', () => {
    jest.spyOn(waypointsIndex, 'getMultiFloorGraph').mockReturnValue(null);
    const spyLeg = jest.spyOn(waypointsIndex, 'getMultiFloorGraphLegacyMerged').mockReturnValue({ nodes: { z: 1 } });
    const g = getFullBuildingRoutingGraph({ VE: [1, 2] }, 'VE');
    expect(spyLeg).toHaveBeenCalledWith('VE', [1, 2]);
    expect(g).toEqual({ nodes: { z: 1 } });
  });

  it('returns null from bestIndoorPathToExit/FromExit without room id or exits', () => {
    expect(bestIndoorPathToExit(SIMPLE_GRAPH, '', false)).toBeNull();
    expect(bestIndoorPathToExit(SIMPLE_GRAPH, null, false)).toBeNull();
    expect(bestIndoorPathFromExit(SIMPLE_GRAPH, '', false)).toBeNull();

    const noExit = {
      nodes: { R1: { id: 'R1', type: 'room', x: 0, y: 0, floor: 1, accessible: true } },
      edges: [],
      meta: {},
      viewBox: '0 0 10 10',
    };
    expect(bestIndoorPathToExit(noExit, 'R1', false)).toBeNull();
    expect(bestIndoorPathFromExit(noExit, 'R1', false)).toBeNull();
  });

  it('returns null when every exit path fails', () => {
    jest.spyOn(indoorDirections, 'computeIndoorDirections').mockReturnValue(null);
    expect(bestIndoorPathToExit(SIMPLE_GRAPH, 'R1', false)).toBeNull();
    expect(bestIndoorPathFromExit(SIMPLE_GRAPH, 'R1', false)).toBeNull();
  });

  it('picks shortest path from room to an exit', () => {
    const r = bestIndoorPathToExit(SIMPLE_GRAPH, 'R1', false);
    expect(r).not.toBeNull();
    expect(r.exitId).toBe('E2');
    expect(r.indoorResult.path).toContain('R1');
    expect(r.indoorResult.path).toContain('E2');
  });

  it('picks shortest path from an exit to room', () => {
    const r = bestIndoorPathFromExit(SIMPLE_GRAPH, 'R1', false);
    expect(r).not.toBeNull();
    expect(r.exitId).toBe('E2');
  });

  it('merges hybrid steps with sections and transitions', () => {
    const legToExit = {
      steps: [{ id: 'a', instruction: 'Walk', distance: '1 m', duration: '1 s' }],
      totalMetres: 1,
    };
    const legFromExit = {
      steps: [{ id: 'b', instruction: 'Arrive', distance: '', duration: '' }],
      totalMetres: 2,
    };
    const steps = mergeCrossBuildingSteps({
      startBuildingName: 'Hall',
      endBuildingName: 'Central',
      legToExit,
      outdoorSteps: [{ instruction: 'Head north', distance: '10 m', duration: '1 min' }],
      legFromExit,
      crossCampusNote: 'Consider shuttle.',
    });
    expect(steps.some((s) => s.kind === 'section' && s.title?.includes('Hall'))).toBe(true);
    expect(steps.some((s) => s.kind === 'transition')).toBe(true);
    expect(steps.some((s) => s.kind === 'outdoor' && s.instruction.includes('north'))).toBe(true);
    expect(steps.some((s) => s.kind === 'section' && s.title?.includes('Central'))).toBe(true);
  });

  it('merge uses placeholder when outdoor steps are empty and skips cross-campus note when absent', () => {
    const leg = { steps: [], totalMetres: 0 };
    const merged = mergeCrossBuildingSteps({
      startBuildingName: 'A',
      endBuildingName: 'B',
      legToExit: leg,
      outdoorSteps: [],
      legFromExit: leg,
    });
    expect(
      merged.some(
        (s) => s.kind === 'outdoor' && s.instruction.includes('outdoor path loading'),
      ),
    ).toBe(true);
    expect(merged.some((s) => String(s.instruction || '').includes('Different campuses'))).toBe(false);

    const undefinedOutdoor = mergeCrossBuildingSteps({
      startBuildingName: 'A',
      endBuildingName: 'B',
      legToExit: { steps: [{ instruction: 'a' }], totalMetres: 0 },
      outdoorSteps: undefined,
      legFromExit: { steps: [], totalMetres: 0 },
    });
    expect(
      undefinedOutdoor.some(
        (s) => s.kind === 'outdoor' && s.instruction.includes('outdoor path loading'),
      ),
    ).toBe(true);

    const withOutdoor = mergeCrossBuildingSteps({
      startBuildingName: 'A',
      endBuildingName: 'B',
      legToExit: { steps: [{ instruction: 'a' }], totalMetres: 0 },
      outdoorSteps: [{ instruction: undefined, distance: undefined, duration: undefined }],
      legFromExit: { steps: [], totalMetres: 0 },
    });
    const outdoorRow = withOutdoor.find((s) => s.kind === 'outdoor');
    expect(outdoorRow.instruction).toBe('');
    expect(outdoorRow.distance).toBe('');
  });

  it('summarizes hybrid distance totals', () => {
    const t = summarizeHybridTotals(
      { totalMetres: 10 },
      { totalMetres: 20 },
      '100 m',
      '2 min',
    );
    expect(t.totalMetres).toBe(130);
    expect(t.distanceText).toMatch(/m|km/);

    const km = summarizeHybridTotals(
      { totalMetres: 0, durationText: '1 min' },
      { totalMetres: 0, durationText: '2 min' },
      '1.5 km',
      '',
    );
    expect(km.totalMetres).toBe(1500);
    expect(km.distanceText).toContain('km');

    const zero = summarizeHybridTotals(null, null, null, null);
    expect(zero.distanceText).toBe('—');
    expect(zero.durationText).toBe('—');

    const parseOnlyM = summarizeHybridTotals(
      { totalMetres: 5, durationText: 'a' },
      { totalMetres: 5 },
      'not a distance',
      'b',
    );
    expect(parseOnlyM.totalMetres).toBe(10);
  });

  it('cloneSteps tolerates undefined step lists', () => {
    const merged = mergeCrossBuildingSteps({
      startBuildingName: 'S',
      endBuildingName: 'E',
      legToExit: { steps: undefined, totalMetres: 0 },
      outdoorSteps: [],
      legFromExit: { steps: undefined, totalMetres: 0 },
    });
    expect(merged.filter((s) => s.kind === 'section')).toHaveLength(3);
  });
});
