import { renderHook, act, waitFor } from '@testing-library/react-native';
import useCrossBuildingIndoorDirections from './useCrossBuildingIndoorDirections';
import * as googleDirections from '../services/routing/googleDirections';
import * as buildingsApi from '../services/api/buildings';
import * as crossSvc from '../services/routing/crossBuildingIndoorDirections';

jest.mock('../floor_plans/waypoints/waypointsIndex', () => ({
  getAvailableFloors: jest.fn(),
  getMultiFloorGraph: jest.fn(),
}));

jest.mock('../services/routing/googleDirections', () => ({
  fetchDirections: jest.fn(),
}));

jest.mock('../services/api/buildings', () => ({
  getBuildingCoords: jest.fn(),
  getBuildingInfo: jest.fn(),
}));

const waypoints = require('../floor_plans/waypoints/waypointsIndex');
const { getAvailableFloors, getMultiFloorGraph } = waypoints;

const graphH = {
  nodes: {
    R1: { id: 'R1', type: 'room', x: 0, y: 0, floor: 1, accessible: true },
    E1: { id: 'E1', type: 'building_entry_exit', x: 10, y: 0, floor: 1, accessible: true },
  },
  edges: [{ from: 'R1', to: 'E1', weight: 5 }],
  meta: {},
  viewBox: '0 0 20 20',
};

const graphCC = {
  nodes: {
    R2: { id: 'R2', type: 'room', x: 0, y: 0, floor: 1, accessible: true },
    E2: { id: 'E2', type: 'building_entry_exit', x: 10, y: 0, floor: 1, accessible: true },
  },
  edges: [{ from: 'E2', to: 'R2', weight: 5 }],
  meta: {},
  viewBox: '0 0 20 20',
};

const defaultProps = {
  originBuilding: 'H',
  destinationBuilding: 'CC',
  originRoomId: 'R1',
  destinationRoomId: 'R2',
  accessibleOnly: false,
  enabled: true,
};

const indoorLeg = {
  steps: [{ id: 's0', instruction: 'Walk', distance: '1 m', duration: '10 s' }],
  pathPoints: [{ id: 'n1', x: 0, y: 0 }],
  totalMetres: 5,
  durationText: '10 s',
};

beforeEach(() => {
  jest.useFakeTimers();
  getAvailableFloors.mockReturnValue([
    { building: 'H', floor: 1 },
    { building: 'CC', floor: 1 },
  ]);
  getMultiFloorGraph.mockImplementation((b) => {
    if (b === 'H') return graphH;
    return graphCC;
  });
  buildingsApi.getBuildingCoords.mockImplementation((id) => {
    if (id === 'H') return { latitude: 45.497, longitude: -73.578 };
    if (id === 'CC') return { latitude: 45.496, longitude: -73.579 };
    return null;
  });
  buildingsApi.getBuildingInfo.mockImplementation((id) => {
    if (id === 'H') return { name: 'Hall', campus: 'SGW' };
    if (id === 'CC') return { name: 'Central', campus: 'SGW' };
    return { name: id, campus: 'SGW' };
  });
  googleDirections.fetchDirections.mockResolvedValue({
    steps: [{ instruction: 'Go', distance: '20 m', duration: '2 min' }],
    distanceText: '20 m',
    durationText: '2 min',
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('useCrossBuildingIndoorDirections', () => {
  it('uses default enabled=false and accessibleOnly=false when props are omitted', () => {
    const { result } = renderHook(() =>
      useCrossBuildingIndoorDirections({
        originBuilding: 'H',
        destinationBuilding: 'CC',
        originRoomId: 'R1',
        destinationRoomId: 'R2',
      }),
    );
    expect(result.current.result).toBeNull();
    expect(googleDirections.fetchDirections).not.toHaveBeenCalled();
  });

  it('is idle when disabled or missing selections', () => {
    const { result } = renderHook(() =>
      useCrossBuildingIndoorDirections({
        ...defaultProps,
        enabled: false,
      }),
    );
    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();

    const { result: r2 } = renderHook(() =>
      useCrossBuildingIndoorDirections({
        ...defaultProps,
        originRoomId: null,
        enabled: true,
      }),
    );
    expect(r2.current.result).toBeNull();
  });

  it('returns indoor error when the origin building has no exits', () => {
    getMultiFloorGraph.mockImplementation((b) => {
      if (b === 'H') {
        return {
          nodes: { R1: { id: 'R1', type: 'room', x: 0, y: 0, floor: 1, accessible: true } },
          edges: [],
          meta: {},
          viewBox: '0 0 10 10',
        };
      }
      return graphCC;
    });

    const { result } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));
    expect(result.current.error).toMatch(/No mapped building exits in H/);
    expect(result.current.result).toBeNull();
    expect(googleDirections.fetchDirections).not.toHaveBeenCalled();
  });

  it('returns indoor error when the destination building has no exits', () => {
    getMultiFloorGraph.mockImplementation((b) => {
      if (b === 'H') return graphH;
      return {
        nodes: { R2: { id: 'R2', type: 'room', x: 0, y: 0, floor: 1, accessible: true } },
        edges: [],
        meta: {},
        viewBox: '0 0 10 10',
      };
    });

    const { result } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));
    expect(result.current.error).toMatch(/No mapped building exits in CC/);
  });

  it('returns compute error when indoor result is missing', () => {
    jest.spyOn(crossSvc, 'bestIndoorPathToExit').mockReturnValue({
      indoorResult: null,
      exitId: 'E1',
    });
    jest.spyOn(crossSvc, 'bestIndoorPathFromExit').mockReturnValue({
      indoorResult: indoorLeg,
      exitId: 'E2',
    });

    const { result } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));
    expect(result.current.error).toBe('Could not compute indoor paths to or from an exit.');
  });

  it('sets outdoor error when building coordinates are missing', () => {
    buildingsApi.getBuildingCoords.mockReturnValue(null);

    const { result } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));

    expect(result.current.error).toBe('Missing building coordinates for outdoor segment.');
    expect(googleDirections.fetchDirections).not.toHaveBeenCalled();
  });

  it('passes accessibleOnly through to indoor routing', async () => {
    const { result } = renderHook(() =>
      useCrossBuildingIndoorDirections({ ...defaultProps, accessibleOnly: true }),
    );
    act(() => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(result.current.result).not.toBeNull());
    expect(result.current.error).toBeNull();
  });

  it('fetches outdoor directions and merges a full hybrid result', async () => {
    const { result } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.result).not.toBeNull();
    });

    expect(googleDirections.fetchDirections).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
    expect(result.current.result.steps.length).toBeGreaterThan(3);
    expect(result.current.result.pathPointsOrigin.length).toBeGreaterThan(0);
    expect(result.current.result.pathPointsDestination.length).toBeGreaterThan(0);
    expect(result.current.result.originGraph).toBe(graphH);
    expect(result.current.result.destGraph).toBe(graphCC);
  });

  it('keeps result null while outdoor segment is loading', () => {
    googleDirections.fetchDirections.mockImplementation(
      () => new Promise(() => {}),
    );

    const { result } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.result).toBeNull();
  });

  it('sets outdoor error when API returns no route', async () => {
    googleDirections.fetchDirections.mockResolvedValue(null);

    const { result } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('No outdoor route found between buildings.');
  });

  it('sets outdoor error when fetch rejects with a message', async () => {
    googleDirections.fetchDirections.mockRejectedValueOnce(new Error('net down'));

    const { result } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));

    act(() => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(result.current.error).toBe('net down'));
  });

  it('sets outdoor error when fetch rejects without a message', async () => {
    googleDirections.fetchDirections.mockRejectedValueOnce({});

    const { result } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));

    act(() => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() =>
      expect(result.current.error).toBe('Outdoor directions failed.'),
    );
  });

  it('adds cross-campus note when campuses differ', async () => {
    buildingsApi.getBuildingInfo.mockImplementation((id) => {
      if (id === 'H') return { name: 'Hall', campus: 'SGW' };
      return { name: 'Loyola Hall', campus: 'LOY' };
    });

    const { result } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => expect(result.current.result).not.toBeNull());

    const shuttle = result.current.result.steps.some((s) =>
      String(s.instruction || '').includes('Concordia shuttle'),
    );
    expect(shuttle).toBe(true);
  });

  it('clears outdoor state when indoor prerequisites disappear', async () => {
    const { result, rerender } = renderHook(
      (p) => useCrossBuildingIndoorDirections(p),
      { initialProps: defaultProps },
    );

    act(() => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(result.current.result).not.toBeNull());

    rerender({ ...defaultProps, enabled: false });

    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('clears debounce on unmount', () => {
    const { unmount } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));
    unmount();
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(googleDirections.fetchDirections).not.toHaveBeenCalled();
  });

  it('does not fetch when origin or destination building is null', () => {
    const { result: r1 } = renderHook(() =>
      useCrossBuildingIndoorDirections({ ...defaultProps, originBuilding: null, enabled: true }),
    );
    expect(googleDirections.fetchDirections).not.toHaveBeenCalled();
    expect(r1.current.result).toBeNull();

    const { result: r2 } = renderHook(() =>
      useCrossBuildingIndoorDirections({
        ...defaultProps,
        destinationBuilding: null,
        enabled: true,
      }),
    );
    expect(r2.current.result).toBeNull();
  });

  it('dedupes floors and ignores NaN or non-numeric floors in the index', async () => {
    getAvailableFloors.mockReturnValue([
      { building: 'H', floor: 2 },
      { building: 'H', floor: 1 },
      { building: 'H', floor: 2 },
      { building: 'CC', floor: 1 },
      { building: 'Z', floor: NaN },
      { building: 'Q', floor: 'bad' },
    ]);
    getMultiFloorGraph.mockImplementation((b) => {
      if (b === 'H') return graphH;
      if (b === 'CC') return graphCC;
      return { nodes: {}, edges: [], meta: {}, viewBox: '0 0 1 1' };
    });

    const { result } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));

    act(() => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(result.current.result).not.toBeNull());
    expect(getMultiFloorGraph).toHaveBeenCalledWith('H', [1, 2]);
    expect(getMultiFloorGraph).toHaveBeenCalledWith('CC', [1]);
  });

  it('uses optional API fields when Google omits step text', async () => {
    googleDirections.fetchDirections.mockResolvedValue({});

    const { result } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));

    act(() => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.result).not.toBeNull();
  });

  it('falls back to building codes when getBuildingInfo returns null', async () => {
    buildingsApi.getBuildingInfo.mockReturnValue(null);

    const { result } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));

    act(() => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(result.current.result).not.toBeNull());
    expect(
      result.current.result.steps.some((s) => s.title === 'Inside H' || s.instruction?.includes('H')),
    ).toBe(true);
  });

  it('defaults missing pathPoints on indoor legs to empty arrays', async () => {
    jest.spyOn(crossSvc, 'bestIndoorPathToExit').mockReturnValue({
      indoorResult: {
        steps: [{ instruction: 'out' }],
        totalMetres: 1,
        durationText: '1 s',
      },
      exitId: 'E1',
    });
    jest.spyOn(crossSvc, 'bestIndoorPathFromExit').mockReturnValue({
      indoorResult: {
        steps: [{ instruction: 'in' }],
        totalMetres: 1,
        durationText: '1 s',
      },
      exitId: 'E2',
    });

    const { result } = renderHook(() => useCrossBuildingIndoorDirections(defaultProps));

    act(() => {
      jest.advanceTimersByTime(500);
    });
    await waitFor(() => expect(result.current.result).not.toBeNull());
    expect(result.current.result.pathPointsOrigin).toEqual([]);
    expect(result.current.result.pathPointsDestination).toEqual([]);
  });
});
