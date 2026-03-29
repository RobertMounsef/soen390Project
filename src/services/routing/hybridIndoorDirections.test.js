import {
  findBuildingForRoom,
  computeHybridIndoorOutdoorRoute,
  getGlobalRoomPickerEntries,
  getGlobalRoomPickerSections,
} from './hybridIndoorDirections';

jest.mock('../api/buildings', () => ({
  getBuildingCoords: jest.fn((id) => {
    if (id === 'A') return { latitude: 45.5, longitude: -73.57 };
    if (id === 'B') return { latitude: 45.45, longitude: -73.64 };
    return null;
  }),
  getBuildingInfo: jest.fn((id) => {
    if (id === 'A') return { name: 'Building A', campus: 'SGW' };
    if (id === 'B') return { name: 'Building B', campus: 'LOY' };
    return { name: id, campus: 'SGW' };
  }),
}));

jest.mock('./googleDirections', () => ({
  fetchDirections: jest.fn(() =>
    Promise.resolve({
      polyline: [],
      steps: [{ id: 'o1', instruction: 'Walk', distance: '50 m', duration: '1 min' }],
      distanceText: '50 m',
      durationText: '1 min',
      distanceMeters: 50,
      durationSeconds: 60,
    })
  ),
}));

const graphA = {
  nodes: {
    RA: { id: 'RA', type: 'room', label: 'Room A', floor: 1, x: 0, y: 0, accessible: true },
    EXA: {
      id: 'EXA',
      type: 'building_entry_exit',
      label: 'Exit',
      floor: 1,
      x: 100,
      y: 0,
      accessible: true,
    },
  },
  edges: [{ from: 'RA', to: 'EXA', weight: 10 }],
  meta: { metresPerUnit: 0.01 },
  viewBox: '0 0 200 200',
};

const graphB = {
  nodes: {
    EXB: {
      id: 'EXB',
      type: 'building_entry_exit',
      label: 'Entrance',
      floor: 1,
      x: 0,
      y: 0,
      accessible: true,
    },
    RB: { id: 'RB', type: 'room', label: 'Room B', floor: 1, x: 100, y: 0, accessible: true },
  },
  edges: [{ from: 'EXB', to: 'RB', weight: 10 }],
  meta: { metresPerUnit: 0.01 },
  viewBox: '0 0 200 200',
};

jest.mock('../../floor_plans/waypoints/waypointsIndex', () => ({
  getMultiFloorGraph: jest.fn((building) => {
    if (building === 'A') return graphA;
    if (building === 'B') return graphB;
    return null;
  }),
  getFloorGraph: jest.fn((building, floor) => {
    if (floor !== 1) return null;
    return building === 'A' ? graphA : building === 'B' ? graphB : null;
  }),
}));

const { fetchDirections } = require('./googleDirections');

function resetWaypointMocks() {
  const wp = require('../../floor_plans/waypoints/waypointsIndex');
  wp.getMultiFloorGraph.mockImplementation((building) => {
    if (building === 'A') return graphA;
    if (building === 'B') return graphB;
    return null;
  });
  wp.getFloorGraph.mockImplementation((building, floor) => {
    if (floor !== 1) return null;
    return building === 'A' ? graphA : building === 'B' ? graphB : null;
  });
}

describe('hybridIndoorDirections', () => {
  beforeEach(() => {
    fetchDirections.mockClear();
    resetWaypointMocks();
    const { getBuildingCoords } = require('../api/buildings');
    getBuildingCoords.mockImplementation((id) => {
      if (id === 'A') return { latitude: 45.5, longitude: -73.57 };
      if (id === 'B') return { latitude: 45.45, longitude: -73.64 };
      return null;
    });
  });

  it('findBuildingForRoom returns the first building that contains the node', () => {
    const opts = { A: [1], B: [1] };
    expect(findBuildingForRoom('RA', opts)).toBe('A');
    expect(findBuildingForRoom('RB', opts)).toBe('B');
    expect(findBuildingForRoom('missing', opts)).toBeNull();
  });

  it('findBuildingForRoom returns null when room id or options missing', () => {
    expect(findBuildingForRoom(null, { A: [1] })).toBeNull();
    expect(findBuildingForRoom('RA', null)).toBeNull();
  });

  it('getGlobalRoomPickerSections titles include campus labels', () => {
    const sections = getGlobalRoomPickerSections({ A: [1], B: [1] });
    const a = sections.find((s) => s.title.startsWith('A'));
    const b = sections.find((s) => s.title.startsWith('B'));
    expect(a.title).toContain('SGW');
    expect(b.title).toContain('Loyola');
  });

  it('getGlobalRoomPickerEntries includes navLabel and buildingCode', () => {
    const entries = getGlobalRoomPickerEntries({ A: [1], B: [1] });
    const ra = entries.find((e) => e.id === 'RA');
    expect(ra.buildingCode).toBe('A');
    expect(ra.navLabel).toContain('A');
    expect(ra.navLabel).toContain('Room');
  });

  it('computeHybridIndoorOutdoorRoute stitches indoor, outdoor, indoor and flags cross-campus', async () => {
    const r = await computeHybridIndoorOutdoorRoute({
      originBuilding: 'A',
      destBuilding: 'B',
      originRoomId: 'RA',
      destRoomId: 'RB',
      availableOptions: { A: [1], B: [1] },
      accessibleOnly: false,
    });

    expect(r.kind).toBe('hybrid');
    expect(r.crossCampus).toBe(true);
    expect(r.originExitId).toBe('EXA');
    expect(r.destEntranceId).toBe('EXB');
    expect(fetchDirections).toHaveBeenCalledWith(
      { latitude: 45.5, longitude: -73.57 },
      { latitude: 45.45, longitude: -73.64 },
      'walking'
    );
    expect(r.steps.some((s) => s.kind === 'segment')).toBe(true);
    expect(r.steps.some((s) => s.kind === 'transition')).toBe(true);
    expect(r.steps.filter((s) => s.instruction === 'Walk').length).toBeGreaterThanOrEqual(1);
  });

  it('rejects same-building hybrid calls', async () => {
    await expect(
      computeHybridIndoorOutdoorRoute({
        originBuilding: 'A',
        destBuilding: 'A',
        originRoomId: 'RA',
        destRoomId: 'RB',
        availableOptions: { A: [1] },
      })
    ).rejects.toThrow(/Same-building/);
  });

  it('rejects when required ids are missing', async () => {
    await expect(
      computeHybridIndoorOutdoorRoute({
        originBuilding: '',
        destBuilding: 'B',
        originRoomId: 'RA',
        destRoomId: 'RB',
        availableOptions: { A: [1], B: [1] },
      })
    ).rejects.toThrow(/Missing origin or destination/);
  });

  it('rejects when origin room is absent from indoor graph', async () => {
    await expect(
      computeHybridIndoorOutdoorRoute({
        originBuilding: 'A',
        destBuilding: 'B',
        originRoomId: 'NOPE',
        destRoomId: 'RB',
        availableOptions: { A: [1], B: [1] },
      })
    ).rejects.toThrow(/Origin room is not in the indoor map/);
  });

  it('rejects when destination room is absent from indoor graph', async () => {
    await expect(
      computeHybridIndoorOutdoorRoute({
        originBuilding: 'A',
        destBuilding: 'B',
        originRoomId: 'RA',
        destRoomId: 'NOPE',
        availableOptions: { A: [1], B: [1] },
      })
    ).rejects.toThrow(/Destination room is not in the indoor map/);
  });

  it('rejects when no building exits exist for origin', async () => {
    const wp = require('../../floor_plans/waypoints/waypointsIndex');
    const noExitGraph = {
      nodes: {
        RA: { id: 'RA', type: 'room', label: 'Room A', floor: 1, x: 0, y: 0, accessible: true },
      },
      edges: [],
      meta: { metresPerUnit: 0.01 },
      viewBox: '0 0 200 200',
    };
    wp.getMultiFloorGraph.mockImplementation((building) => {
      if (building === 'A') return noExitGraph;
      if (building === 'B') return graphB;
      return null;
    });
    wp.getFloorGraph.mockImplementation((building, floor) => {
      if (floor !== 1) return null;
      if (building === 'A') return noExitGraph;
      if (building === 'B') return graphB;
      return null;
    });

    await expect(
      computeHybridIndoorOutdoorRoute({
        originBuilding: 'A',
        destBuilding: 'B',
        originRoomId: 'RA',
        destRoomId: 'RB',
        availableOptions: { A: [1], B: [1] },
      })
    ).rejects.toThrow(/No building exit is defined/);
  });

  it('rejects when no building exits exist for destination', async () => {
    const wp = require('../../floor_plans/waypoints/waypointsIndex');
    const noEntranceGraph = {
      nodes: {
        RB: { id: 'RB', type: 'room', label: 'Room B', floor: 1, x: 100, y: 0, accessible: true },
      },
      edges: [],
      meta: { metresPerUnit: 0.01 },
      viewBox: '0 0 200 200',
    };
    wp.getMultiFloorGraph.mockImplementation((building) => {
      if (building === 'A') return graphA;
      if (building === 'B') return noEntranceGraph;
      return null;
    });
    wp.getFloorGraph.mockImplementation((building, floor) => {
      if (floor !== 1) return null;
      if (building === 'A') return graphA;
      if (building === 'B') return noEntranceGraph;
      return null;
    });

    await expect(
      computeHybridIndoorOutdoorRoute({
        originBuilding: 'A',
        destBuilding: 'B',
        originRoomId: 'RA',
        destRoomId: 'RB',
        availableOptions: { A: [1], B: [1] },
      })
    ).rejects.toThrow(/No building exit is defined/);
  });

  it('rejects when building coordinates are missing', async () => {
    const { getBuildingCoords } = require('../api/buildings');
    getBuildingCoords.mockReturnValueOnce(null);

    await expect(
      computeHybridIndoorOutdoorRoute({
        originBuilding: 'A',
        destBuilding: 'B',
        originRoomId: 'RA',
        destRoomId: 'RB',
        availableOptions: { A: [1], B: [1] },
      })
    ).rejects.toThrow(/Could not resolve building locations/);
  });

  it('rejects when outdoor segment is null', async () => {
    fetchDirections.mockResolvedValueOnce(null);

    await expect(
      computeHybridIndoorOutdoorRoute({
        originBuilding: 'A',
        destBuilding: 'B',
        originRoomId: 'RA',
        destRoomId: 'RB',
        availableOptions: { A: [1], B: [1] },
      })
    ).rejects.toThrow(/Outdoor segment could not be computed/);
  });

  it('formats long hybrid durations and distances via fmtDur/fmtDist', async () => {
    const { getMultiFloorGraph } = require('../../floor_plans/waypoints/waypointsIndex');
    const longLegGraph = {
      ...graphA,
      edges: [{ from: 'RA', to: 'EXA', weight: 1 }],
      nodes: {
        ...graphA.nodes,
        RA: { ...graphA.nodes.RA, accessible: true },
        EXA: { ...graphA.nodes.EXA, accessible: true },
      },
    };
    getMultiFloorGraph.mockImplementation((b) => {
      if (b === 'A') return longLegGraph;
      if (b === 'B') return graphB;
      return null;
    });
    fetchDirections.mockResolvedValueOnce({
      polyline: [],
      steps: [],
      distanceText: '2 km',
      durationText: '40 min',
      distanceMeters: 2500,
      durationSeconds: 4000,
    });

    const r = await computeHybridIndoorOutdoorRoute({
      originBuilding: 'A',
      destBuilding: 'B',
      originRoomId: 'RA',
      destRoomId: 'RB',
      availableOptions: { A: [1], B: [1] },
    });

    expect(r.distanceText).toMatch(/km/);
    expect(r.durationText).toBeTruthy();
    expect(r.crossCampus).toBe(true);
  });
});
