import {
  computeIndoorDirections,
  findNearestNode,
  METRES_PER_UNIT,
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
    expect(r.path[r.path.length - 1]).toBe('C');
    // Only valid path through explicit edges is A→B→C
    expect(r.path).toEqual(['A', 'B', 'C']);
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
    expect(r.steps[r.steps.length - 1].instruction).toMatch(/arrive at/i);
  });

  it('includes a turn step when path changes direction', () => {
    // A→B is horizontal (0°), B→D is downward (90°), so "turn right" at B
    const r = computeIndoorDirections(GRAPH, 'A', 'D');
    const turnStep = r.steps.find(s =>
      /turn left|turn right|turn around/i.test(s.instruction)
    );
    expect(turnStep).toBeTruthy();
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
    expect(r.path[r.path.length - 1]).toBe('R');
  });

  it('returns kilometres when total distance exceeds 1000 m', () => {
    // Use meta.metresPerUnit = 1.0 so each unit = 1 m, making arithmetic exact.
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
      meta: { metresPerUnit: 1.0 },
    };
    const r = computeIndoorDirections(bigGraph, 'N0', 'N20');
    expect(r.distanceText).toMatch(/km/i);
  });

  it('formats duration in minutes when walk time exceeds 60 s', () => {
    // meta.metresPerUnit = 1.0; edge weight = 200 units → 200 m; at 1.2 m/s = 167 s > 60 s.
    const longGraph = {
      nodes: {
        S: { id: 'S', label: 'S', x: 0,   y: 0, accessible: true },
        E: { id: 'E', label: 'E', x: 200, y: 0, accessible: true },
      },
      edges: [{ from: 'S', to: 'E', weight: 200 }],
      viewBox: '0 0 300 100',
      meta: { metresPerUnit: 1.0 },
    };
    const r = computeIndoorDirections(longGraph, 'S', 'E');
    expect(r.durationText).toMatch(/min/i);
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
