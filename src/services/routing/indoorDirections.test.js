import {
  computeIndoorDirections,
  findNearestNode,
  generateSteps,
  getComponents,
} from './indoorDirections';

// ── Shared test graph ────────────────────────────────────────────────────────
//
// Nodes are deliberately placed OFF the direct A→C axis so that the auto-
// generated A→C Euclidean edge (≈600 units) is much more expensive than the
// explicit corridor edges A→B→C (weight 50+50=100).  This guarantees Dijkstra
// always picks the explicit corridor path, making path assertions deterministic.
//
//   A(0,0) ──(50)── B(300,150) ──(50)── C(600,0)
//                        │(50)
//                      D(300,450)
//
const NODES = {
  A: { id: 'A', label: 'Room A', x: 0,   y: 0,   accessible: true  },
  B: { id: 'B', label: 'Room B', x: 300, y: 150, accessible: true  },
  C: { id: 'C', label: 'Room C', x: 600, y: 0,   accessible: true  },
  D: { id: 'D', label: 'Room D', x: 300, y: 450, accessible: true  },
  X: { id: 'X', label: 'Room X', x: 300, y: 450, accessible: false },
};

// Explicit corridor edges have weight=50, far cheaper than any Euclidean shortcut.
const EDGES = [
  { from: 'A', to: 'B', weight: 50 },
  { from: 'B', to: 'C', weight: 50 },
  { from: 'B', to: 'D', weight: 50 },
];

const GRAPH = { nodes: NODES, edges: EDGES, viewBox: '0 0 700 500' };

describe('getComponents', () => {
  it('uses an empty neighbour list when adj omits a node (defensive BFS)', () => {
    const nodesMap = { A: {}, B: {} };
    const adj = { A: ['B'] };
    const comps = getComponents(nodesMap, adj);
    expect(comps).toHaveLength(1);
    expect(comps[0].slice().sort((a, b) => a.localeCompare(b))).toEqual(['A', 'B']);
  });

  it('skips re-adding already-visited neighbours', () => {
    const nodesMap = { A: {}, B: {}, C: {} };
    const adj = {
      A: ['B', 'C'],
      B: ['A', 'C'],
      C: ['A', 'B'],
    };
    const comps = getComponents(nodesMap, adj);
    expect(comps).toHaveLength(1);
    expect(comps[0].length).toBe(3);
  });
});

// ── computeIndoorDirections ───────────────────────────────────────────────────

describe('computeIndoorDirections', () => {
  it('returns null when graph is missing', () => {
    expect(computeIndoorDirections(null, 'A', 'C')).toBeNull();
  });

  it('returns null when origin node is not in graph', () => {
    expect(computeIndoorDirections(GRAPH, 'Z', 'C')).toBeNull();
  });

  it('returns null when destination node is not in graph', () => {
    expect(computeIndoorDirections(GRAPH, 'A', 'Z')).toBeNull();
  });

  it('handles same-origin-and-destination gracefully', () => {
    const r = computeIndoorDirections(GRAPH, 'A', 'A');
    expect(r).not.toBeNull();
    expect(r.path).toEqual(['A']);
    expect(r.totalMetres).toBe(0);
    expect(r.distanceText).toBe('0 m');
    expect(r.steps[0].instruction).toMatch(/already at/i);
  });

  it('finds the shortest path from A to C (must start at A, end at C)', () => {
    const r = computeIndoorDirections(GRAPH, 'A', 'C');
    expect(r).not.toBeNull();
    expect(r.path[0]).toBe('A');
    expect(r.path.at(-1)).toBe('C');
    // Only valid path through explicit edges is A→B→C
    expect(r.path).toEqual(['A', 'B', 'C']);
  });

  it('does not add KNN shortcuts from a room to the hallway (must use door edges)', () => {
    const graph = {
      nodes: {
        R: { id: 'R', type: 'room', label: 'Room', x: 0, y: 0, accessible: true },
        D: { id: 'D', type: 'doorway', x: 80, y: 0, accessible: true },
        H: { id: 'H', type: 'hallway_waypoint', x: 150, y: 0, accessible: true },
      },
      edges: [
        { from: 'R', to: 'D', weight: 100 },
        { from: 'D', to: 'H', weight: 100 },
      ],
      viewBox: '0 0 200 50',
    };
    const r = computeIndoorDirections(graph, 'R', 'H');
    expect(r).not.toBeNull();
    // Euclidean R→H is 150; that auto-edge would beat R→D→H (200) if rooms were KNN-linked.
    expect(r.path).toEqual(['R', 'D', 'H']);
  });

  it('allows passing through an outer room on explicit edges to reach a nested inner room', () => {
    const graph = {
      nodes: {
        W: { id: 'W', type: 'hallway_waypoint', x: 0, y: 0, accessible: true },
        DO: { id: 'DO', type: 'doorway', x: 50, y: 0, accessible: true },
        RO: { id: 'RO', type: 'room', label: 'Outer', x: 100, y: 0, accessible: true },
        DI: { id: 'DI', type: 'doorway', x: 150, y: 0, accessible: true },
        RI: { id: 'RI', type: 'room', label: 'Inner', x: 200, y: 0, accessible: true },
      },
      edges: [
        { from: 'W', to: 'DO', weight: 50 },
        { from: 'DO', to: 'RO', weight: 50 },
        { from: 'RO', to: 'DI', weight: 50 },
        { from: 'DI', to: 'RI', weight: 50 },
      ],
      viewBox: '0 0 250 50',
    };
    const r = computeIndoorDirections(graph, 'W', 'RI');
    expect(r).not.toBeNull();
    expect(r.path).toEqual(['W', 'DO', 'RO', 'DI', 'RI']);
  });

  it('computes correct distance', () => {
    const r = computeIndoorDirections(GRAPH, 'A', 'C');
    // Explicit corridor: A→B(50) + B→C(50) = 100 units; scale = 100/700
    const expectedMetres = 100 * (100 / 700);
    expect(r.totalMetres).toBeCloseTo(expectedMetres, 4);
    expect(r.totalMetres).toBeGreaterThan(0);
  });

  it('returns pathPoints with x, y, id for each node', () => {
    const r = computeIndoorDirections(GRAPH, 'A', 'B');
    expect(r.pathPoints).toHaveLength(2);
    expect(r.pathPoints[0]).toMatchObject({ id: 'A', x: 0,   y: 0   });
    expect(r.pathPoints[1]).toMatchObject({ id: 'B', x: 300, y: 150 });
  });

  it('returns distance and duration text strings', () => {
    const r = computeIndoorDirections(GRAPH, 'A', 'C');
    expect(typeof r.distanceText).toBe('string');
    expect(typeof r.durationText).toBe('string');
    expect(r.distanceText.length).toBeGreaterThan(0);
    expect(r.durationText.length).toBeGreaterThan(0);
  });

  it('generates at least two steps (start + arrive)', () => {
    const r = computeIndoorDirections(GRAPH, 'A', 'D');
    expect(r.steps.length).toBeGreaterThanOrEqual(2);
    expect(r.steps[0].instruction).toMatch(/start at/i);
    expect(r.steps.at(-1).instruction).toMatch(/arrive at/i);
  });

  it('includes a turn step when path changes direction', () => {
    // A→B is horizontal (0°), B→D is downward (90°), so "turn right" at B
    const r = computeIndoorDirections(GRAPH, 'A', 'D');
    const turnStep = r.steps.find(s =>
      /turn left|turn right|turn around/i.test(s.instruction)
    );
    expect(turnStep).toBeTruthy();
  });

  it('does not expose internal hallway/door node IDs in instruction text', () => {
    const graph = {
      nodes: {
        R1: { id: 'R1', type: 'room', label: 'H-101', x: 0, y: 0, accessible: true },
        W1: { id: 'Hall_F8_hallway_waypoint_119', type: 'hallway_waypoint', x: 100, y: 0, accessible: true },
        D1: { id: 'Hall_F8_doorway_12', type: 'doorway', x: 100, y: 100, accessible: true },
        R2: { id: 'R2', type: 'room', label: 'H-103', x: 200, y: 100, accessible: true },
      },
      edges: [
        { from: 'R1', to: 'W1', weight: 10 },
        { from: 'W1', to: 'D1', weight: 10 },
        { from: 'D1', to: 'R2', weight: 10 },
      ],
      viewBox: '0 0 400 300',
    };

    const r = computeIndoorDirections(graph, 'R1', 'R2');
    expect(r).not.toBeNull();
    const allText = r.steps.map((s) => s.instruction).join(' ').toLowerCase();
    expect(allText).not.toContain('hallway_waypoint');
    expect(allText).not.toContain('doorway_');
  });

  it('skips inaccessible nodes when accessibleOnly is true', () => {
    // Add inaccessible X as the only connection to an isolated node
    const restrictedGraph = {
      nodes: {
        ...NODES,
        Y: { id: 'Y', label: 'Room Y', x: 200, y: 100, accessible: true },
      },
      edges: [
        ...EDGES,
        { from: 'D', to: 'X', weight: 10 },
        { from: 'X', to: 'Y', weight: 10 },
      ],
      viewBox: '0 0 300 200',
    };
    // Without accessible filter: A→Y should route through X
    const r1 = computeIndoorDirections(restrictedGraph, 'A', 'Y', false);
    expect(r1).not.toBeNull();

    // With accessible filter: path via X should be blocked (X is not accessible)
    // However auto-generated edges may still connect nodes; just verify no crash
    const r2 = computeIndoorDirections(restrictedGraph, 'A', 'Y', true);
    // r2 may be null if the only path goes through X
    if (r2) {
      const usesX = r2.path.includes('X');
      expect(usesX).toBe(false);
    }
  });

  it('falls back to auto-generated edges when graph.edges is empty', () => {
    // Pure KNN (no distance cap) means even widely-spaced nodes get connected.
    const emptyEdgesGraph = {
      nodes: {
        P: { id: 'P', label: 'P', x: 0,   y: 0, accessible: true },
        Q: { id: 'Q', label: 'Q', x: 500, y: 0, accessible: true },
        R: { id: 'R', label: 'R', x: 1000, y: 0, accessible: true },
      },
      edges: [],
      viewBox: '0 0 1200 100',
    };
    const r = computeIndoorDirections(emptyEdgesGraph, 'P', 'R');
    expect(r).not.toBeNull();
    expect(r.path[0]).toBe('P');
    expect(r.path.at(-1)).toBe('R');
  });

  it('returns kilometres when total distance exceeds 1000 m', () => {
    // Use meta.metresPerUnit = 1 so each unit = 1 m, making arithmetic exact.
    // 20 edges × 1000 units × 1 m/unit = 20 000 m = 20 km.
    const bigNodes = {};
    for (let i = 0; i <= 20; i++) {
      bigNodes[`N${i}`] = { id: `N${i}`, label: `N${i}`, x: i * 1000, y: 0, accessible: true };
    }
    const bigEdges = [];
    for (let i = 0; i < 20; i++) {
      bigEdges.push({ from: `N${i}`, to: `N${i + 1}`, weight: 1000 });
    }
    const bigGraph = {
      nodes: bigNodes,
      edges: bigEdges,
      viewBox: '0 0 21000 100',
      meta: { metresPerUnit: 1 },
    };
    const r = computeIndoorDirections(bigGraph, 'N0', 'N20');
    expect(r.distanceText).toMatch(/km/i);
  });

  it('formats duration in minutes when walk time exceeds 60 s', () => {
    // meta.metresPerUnit = 1; edge weight = 200 units → 200 m; at 1.2 m/s = 167 s > 60 s.
    const longGraph = {
      nodes: {
        S: { id: 'S', label: 'S', x: 0,   y: 0, accessible: true },
        E: { id: 'E', label: 'E', x: 200, y: 0, accessible: true },
      },
      edges: [{ from: 'S', to: 'E', weight: 200 }],
      viewBox: '0 0 300 100',
      meta: { metresPerUnit: 1 },
    };
    const r = computeIndoorDirections(longGraph, 'S', 'E');
    expect(r.durationText).toMatch(/min/i);
  });

  it('uses building entrance human label for building_entry_exit same-node case', () => {
    const graph = {
      nodes: {
        ENTRANCE: { id: 'ENTRANCE', type: 'building_entry_exit', x: 10, y: 10, accessible: true },
      },
      edges: [],
      viewBox: '0 0 100 100',
    };
    const r = computeIndoorDirections(graph, 'ENTRANCE', 'ENTRANCE');
    expect(r).not.toBeNull();
    expect(r.steps[0].instruction).toBe('You are already at the building entrance');
  });

  it('falls back to underscore-spaced id label for unknown node type', () => {
    const graph = {
      nodes: {
        node_with_underscores: {
          id: 'node_with_underscores',
          type: 'mystery_type',
          x: 1,
          y: 1,
          accessible: true,
        },
      },
      edges: [],
      viewBox: '0 0 10 10',
    };
    const r = computeIndoorDirections(graph, 'node_with_underscores', 'node_with_underscores');
    expect(r).not.toBeNull();
    expect(r.steps[0].instruction).toBe('You are already at node with underscores');
  });

  it('emits "Turn around at ..." on landmark u-turn', () => {
    const graph = {
      nodes: {
        A: { id: 'A', type: 'hallway_waypoint', x: 0, y: 0, accessible: true },
        B: { id: 'B', type: 'building_entry_exit', x: 10, y: 0, accessible: true },
        C: { id: 'C', type: 'hallway_waypoint', x: 0, y: 1, accessible: true },
      },
      edges: [
        { from: 'A', to: 'B', weight: 1 },
        { from: 'B', to: 'C', weight: 1 },
      ],
      viewBox: '0 0 20 20',
      meta: { metresPerUnit: 1 },
    };
    const r = computeIndoorDirections(graph, 'A', 'C');
    expect(r).not.toBeNull();
    expect(r.steps.some((s) => s.instruction.startsWith('Turn around at '))).toBe(true);
  });

  it('emits "Turn around" without landmark for hallway waypoint u-turn', () => {
    const graph = {
      nodes: {
        A: { id: 'A', type: 'hallway_waypoint', x: 0, y: 0, accessible: true },
        B: { id: 'B', type: 'hallway_waypoint', x: 10, y: 0, accessible: true },
        C: { id: 'C', type: 'hallway_waypoint', x: 0, y: 1, accessible: true },
      },
      edges: [
        { from: 'A', to: 'B', weight: 1 },
        { from: 'B', to: 'C', weight: 1 },
      ],
      viewBox: '0 0 20 20',
      meta: { metresPerUnit: 1 },
    };
    const r = computeIndoorDirections(graph, 'A', 'C');
    expect(r).not.toBeNull();
    expect(r.steps.some((s) => s.instruction === 'Turn around')).toBe(true);
  });
});

describe('generateSteps', () => {
  it('returns "You are at ..." when path contains only one node', () => {
    const nodesMap = {
      A: { id: 'A', type: 'room', label: 'Room 101', floor: 1, x: 0, y: 0, accessible: true },
    };
    const steps = generateSteps(['A'], nodesMap, 1);
    expect(steps).toEqual([
      { id: 's0', instruction: 'You are at Room 101 (Floor 1)', distance: '', duration: '' },
    ]);
  });
});

// ── findNearestNode ───────────────────────────────────────────────────────────

describe('findNearestNode', () => {
  it('returns null when nodesMap is null', () => {
    expect(findNearestNode(null, { x: 0, y: 0 })).toBeNull();
  });

  it('returns null when pos is null', () => {
    expect(findNearestNode(NODES, null)).toBeNull();
  });

  it('finds the nearest node by Euclidean distance', () => {
    // Position very close to node C (600, 0) – nearest should be C
    expect(findNearestNode(NODES, { x: 598, y: 2 })).toBe('C');
  });

  it('finds the exact node when position matches exactly', () => {
    expect(findNearestNode(NODES, { x: 0, y: 0 })).toBe('A');
  });
});

// ─── Multi-floor routing ──────────────────────────────────────────────────────

describe('multi-floor routing – generateSteps floor-change detection', () => {
  // Two-floor graph: RoomF1 (floor 1) → StairF1 (floor 1, stair_landing)
  //               → StairF2 (floor 2, stair_landing) → RoomF2 (floor 2)
  // The StairF1→StairF2 edge is a cross-floor edge.
  const MULTI_FLOOR_NODES = {
    RoomF1: { id: 'RoomF1', label: 'Room 101', type: 'room',          floor: 1, x: 0,   y: 0,   accessible: true },
    StairA: { id: 'StairA', label: 'Stair A',  type: 'stair_landing', floor: 1, x: 100, y: 0,   accessible: true },
    StairB: { id: 'StairB', label: 'Stair A',  type: 'stair_landing', floor: 2, x: 100, y: 100, accessible: true },
    RoomF2: { id: 'RoomF2', label: 'Room 201', type: 'room',          floor: 2, x: 200, y: 100, accessible: true },
  };


  const MULTI_FLOOR_EDGES = [
    { from: 'RoomF1', to: 'StairA', weight: 10 },
    { from: 'StairA', to: 'StairB', weight: 5  },   // cross-floor stair edge
    { from: 'StairB', to: 'RoomF2', weight: 10 },
  ];


  const MULTI_GRAPH = {
    nodes: MULTI_FLOOR_NODES,
    edges: MULTI_FLOOR_EDGES,
    viewBox: '0 0 300 200',
    meta: { metresPerUnit: 1 },
  };


  it('finds a path across floors on a multi-floor graph', () => {
    const r = computeIndoorDirections(MULTI_GRAPH, 'RoomF1', 'RoomF2');
    expect(r).not.toBeNull();
    expect(r.path[0]).toBe('RoomF1');
    expect(r.path.at(-1)).toBe('RoomF2');
  });


  it('emits a floor-change step with isFloorChange:true for stair transitions', () => {
    const r = computeIndoorDirections(MULTI_GRAPH, 'RoomF1', 'RoomF2');
    const floorChangeStep = r.steps.find(s => s.isFloorChange);
    expect(floorChangeStep).toBeTruthy();
    expect(floorChangeStep.floorChangeType).toBe('stairs');
    expect(floorChangeStep.toFloor).toBe(2);
    expect(floorChangeStep.instruction).toMatch(/take the stairs (up|down) to floor 2/i);
  });


  it('emits an elevator step when the transition node is elevator_door', () => {
    const elevNodes = {
      ...MULTI_FLOOR_NODES,
      StairA: { ...MULTI_FLOOR_NODES.StairA, type: 'elevator_door' },
      StairB: { ...MULTI_FLOOR_NODES.StairB, type: 'elevator_door' },
    };
    const graph = { ...MULTI_GRAPH, nodes: elevNodes };
    const r = computeIndoorDirections(graph, 'RoomF1', 'RoomF2');
    const floorChangeStep = r.steps.find(s => s.isFloorChange);
    expect(floorChangeStep).toBeTruthy();
    expect(floorChangeStep.floorChangeType).toBe('elevator');
    expect(floorChangeStep.instruction).toMatch(/take the elevator (up|down) to floor 2/i);
  });


  it('does not emit a floor-change step on a single-floor path', () => {
    const r = computeIndoorDirections(MULTI_GRAPH, 'RoomF1', 'StairA');
    const floorChangeStep = r?.steps?.find(s => s.isFloorChange);
    expect(floorChangeStep).toBeFalsy();
  });


  it('includes standard start and arrive steps alongside floor-change steps', () => {
    const r = computeIndoorDirections(MULTI_GRAPH, 'RoomF1', 'RoomF2');
    expect(r.steps[0].instruction).toMatch(/start at/i);
    expect(r.steps.at(-1).instruction).toMatch(/arrive at/i);
  });

  it('orders steps: start → walk to stairs on origin floor → vertical move → from landing to destination', () => {
    const r = computeIndoorDirections(MULTI_GRAPH, 'RoomF1', 'RoomF2');
    expect(r.steps.length).toBeGreaterThanOrEqual(4);
    expect(r.steps[0].instruction).toMatch(/start at room 101/i);
    expect(r.steps[1].instruction).toMatch(/walk to stair a on floor 1/i);
    const floorIdx = r.steps.findIndex((s) => s.isFloorChange);
    expect(floorIdx).toBe(2);
    expect(r.steps[floorIdx].instruction).toMatch(/take the stairs/i);
    expect(r.steps.at(-1).instruction).toMatch(/from stair a on floor 2/i);
    expect(r.steps.at(-1).instruction).toMatch(/arrive at room 201/i);
  });

  it('prefers a shorter route via type "elevator" edges when cheaper than stairs', () => {
    const nodes = {
      R1: { id: 'R1', type: 'room', floor: 1, x: 0, y: 0, accessible: true },
      E1: { id: 'E1', type: 'elevator_door', floor: 1, x: 50, y: 0, accessible: true },
      S1: { id: 'S1', type: 'stair_landing', floor: 1, x: 0, y: 200, accessible: true },
      E2: { id: 'E2', type: 'elevator_door', floor: 2, x: 50, y: 0, accessible: true },
      S2: { id: 'S2', type: 'stair_landing', floor: 2, x: 0, y: 200, accessible: true },
      R2: { id: 'R2', type: 'room', floor: 2, x: 200, y: 0, accessible: true },
    };
    const edges = [
      { from: 'R1', to: 'E1', weight: 10 },
      { from: 'E1', to: 'E2', type: 'elevator', weight: 0, accessible: true },
      { from: 'E2', to: 'R2', weight: 10 },
      { from: 'R1', to: 'S1', weight: 50 },
      { from: 'S1', to: 'S2', type: 'stair', weight: 0, accessible: true },
      { from: 'S2', to: 'R2', weight: 50 },
    ];
    const graph = { nodes, edges, viewBox: '0 0 500 500', meta: { metresPerUnit: 1 } };
    const r = computeIndoorDirections(graph, 'R1', 'R2');
    expect(r).not.toBeNull();
    expect(r.path).toContain('E1');
    expect(r.path).toContain('E2');
    const floorChange = r.steps.find((s) => s.isFloorChange);
    expect(floorChange?.floorChangeType).toBe('elevator');
  });

  it('does not add auto-edges across floors (stacked rooms same x,y must use stairs)', () => {
    const stacked = {
      RoomA: { id: 'RoomA', type: 'room', floor: 1, x: 100, y: 100, accessible: true },
      RoomB: { id: 'RoomB', type: 'room', floor: 2, x: 100, y: 100, accessible: true },
      S1: { id: 'S1', type: 'stair_landing', floor: 1, x: 100, y: 300, accessible: true },
      S2: { id: 'S2', type: 'stair_landing', floor: 2, x: 100, y: 300, accessible: true },
    };
    const edges = [
      { from: 'RoomA', to: 'S1', weight: 10 },
      { from: 'S1', to: 'S2', weight: 1 },
      { from: 'S2', to: 'RoomB', weight: 10 },
    ];
    const graph = { nodes: stacked, edges, viewBox: '0 0 400 400', meta: { metresPerUnit: 1 } };
    const r = computeIndoorDirections(graph, 'RoomA', 'RoomB');
    expect(r).not.toBeNull();
    expect(r.path).toContain('S1');
    expect(r.path).toContain('S2');
    expect(r.path).not.toEqual(['RoomA', 'RoomB']);
  });
});