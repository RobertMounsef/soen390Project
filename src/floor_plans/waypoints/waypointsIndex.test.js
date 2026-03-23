import { getFloorGraph, getAvailableFloors, injectViewBoxIfMissing, resolveViewBox, getMultiFloorGraph } from './waypointsIndex';

describe('waypointsIndex', () => {
  it('lists MB and VL floors as available', () => {
    const floors = getAvailableFloors();

    expect(floors).toEqual(expect.arrayContaining([{ building: 'MB', floor: 1 }]));
    expect(floors).toEqual(expect.arrayContaining([{ building: 'MB', floor: 2 }]));
    expect(floors).toEqual(expect.arrayContaining([{ building: 'VL', floor: 1 }]));
    expect(floors).toEqual(expect.arrayContaining([{ building: 'VL', floor: 2 }]));
  });

  it('uppercases building codes for lookup', () => {
    const graph = getFloorGraph('mb', 2);
    expect(graph).not.toBeNull();
    expect(graph.image).toBeTruthy();
  });

  it('computes viewBox from node bounds for new graphs (H1)', () => {
    const graph = getFloorGraph('H', 1);
    expect(graph.viewBox).toBeTruthy();
    const parts = graph.viewBox.split(' ').map(Number);
    expect(parts).toHaveLength(4);
    // New graphs derive viewBox from actual node positions, not IMAGE_META
    expect(parts[2]).toBeGreaterThan(1024);
    expect(parts[3]).toBeGreaterThan(1024);
  });

  it('returns nodes as object keyed by id (new building-level graph)', () => {
    const graph = getFloorGraph('VE', 1);
    expect(graph).not.toBeNull();
    expect(typeof graph.nodes).toBe('object');
    expect(Array.isArray(graph.nodes)).toBe(false);

    const ids = Object.keys(graph.nodes);
    expect(ids.length).toBeGreaterThan(0);
    const someNode = Object.values(graph.nodes)[0];
    expect(someNode).toHaveProperty('id');
    expect(someNode).toHaveProperty('x');
    expect(someNode).toHaveProperty('y');
    expect(someNode).toHaveProperty('type');
  });

  it('computes viewBox from node bounds for new graphs (H9)', () => {
    const graph = getFloorGraph('H', 9);
    const parts = graph.viewBox.split(' ').map(Number);
    expect(parts).toHaveLength(4);
    // H9 node-space is currently smaller than 1024 in width; assert valid bounds.
    expect(parts[2]).toBeGreaterThan(0);
    expect(parts[3]).toBeGreaterThan(0);
  });

  it('uses graph.meta dimensions as viewBox for PNG-backed floors (VL1 = 1024×1024)', () => {
    const graph = getFloorGraph('VL', 1);
    expect(graph.viewBox).toBe('0 0 1024 1024');
  });

  it('uses graph.meta dimensions as viewBox for PNG-backed floors (VE2 = 801×378)', () => {
    const graph = getFloorGraph('VE', 2);
    // ve2.json declares meta.width=801, meta.height=378 — these are the
    // actual PNG coordinate dimensions, not 1024×1024.
    expect(graph.viewBox).toBe('0 0 801 378');
  });

  it('uses graph.meta dimensions as viewBox for PNG-backed floors (VE1 = 249×222)', () => {
    const graph = getFloorGraph('VE', 1);
    expect(graph.viewBox).toBe('0 0 249 222');
  });

  it('normalises source/target edges to from/to', () => {
    const graph = getFloorGraph('H', 8);
    expect(graph).not.toBeNull();
    expect(graph.edges.length).toBeGreaterThan(0);
    for (const e of graph.edges) {
      expect(e).toHaveProperty('from');
      expect(e).toHaveProperty('to');
      // Some source edges may omit weight; router falls back to Euclidean distance.
      expect(['number', 'undefined']).toContain(typeof e.weight);
    }
  });

  it('filters nodes to the requested floor only', () => {
    const graph = getFloorGraph('H', 8);
    expect(graph).not.toBeNull();
    for (const node of Object.values(graph.nodes)) {
      expect(node.floor).toBe(8);
    }
  });

  it('computes viewBox from node bounding box when no other source exists', () => {
    const graph = getFloorGraph('CC', 1);
    expect(graph).not.toBeNull();
    expect(graph.viewBox).toBeTruthy();
    const parts = graph.viewBox.split(' ').map(Number);
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe(0);
    expect(parts[1]).toBe(0);
    expect(parts[2]).toBeGreaterThan(0);
    expect(parts[3]).toBeGreaterThan(0);
  });
});

  // ─── injectViewBoxIfMissing ───────────────────────────────────────────────────

describe('injectViewBoxIfMissing', () => {
  it('returns the SVG unchanged when it already has a viewBox', () => {
    const svg = '<svg viewBox="0 0 100 100"><rect/></svg>';
    expect(injectViewBoxIfMissing(svg)).toBe(svg);
  });

  it('injects a viewBox derived from width/height when absent', () => {
    const svg = '<svg width="200" height="150"><rect/></svg>';
    const result = injectViewBoxIfMissing(svg);
    expect(result).toContain('viewBox="0 0 200 150"');
  });

  it('returns the SVG unchanged when it has no viewBox, width, or height', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
    expect(injectViewBoxIfMissing(svg)).toBe(svg);
  });
});

  // ─── resolveViewBox ───────────────────────────────────────────────────────────

describe('resolveViewBox', () => {
  it('returns graph.viewBox when already present', () => {
    const graph = { viewBox: '0 0 500 400', meta: {} };
    expect(resolveViewBox(null, {}, graph, null)).toBe('0 0 500 400');
  });

  it('computes viewBox from node bounds as last resort when no other source exists', () => {
    const nodes = { A: { x: 100, y: 200 }, B: { x: 300, y: 400 } };
    const graph = { meta: {} };
    const result = resolveViewBox(null, nodes, graph, null);
    expect(result).toBeTruthy();
    expect(result).toMatch(/^0 0 \d+ \d+$/);
  });

  it('returns null when there are no nodes and no other viewBox source', () => {
    const graph = { meta: {} };
    expect(resolveViewBox(null, {}, graph, null)).toBeNull();
  });
  });


  // ─── getMultiFloorGraph ───────────────────────────────────────────────────────

describe('getMultiFloorGraph', () => {
  it('returns null for an unknown building', () => {
    expect(getMultiFloorGraph('UNKNOWN', [1, 2])).toBeNull();
  });


  it('returns null when floors array is empty', () => {
    expect(getMultiFloorGraph('MB', [])).toBeNull();
  });


  it('returns nodes from all requested floors (VL floors 1 and 2)', () => {
    const graph = getMultiFloorGraph('VL', [1, 2]);
    expect(graph).not.toBeNull();


    const nodes = Object.values(graph.nodes);
    const onlyFloor1 = nodes.filter(n => n.floor === 1);


    // Both floor populations must be non-empty and combined count beats floor-1 alone
    expect(onlyFloor1.length).toBeGreaterThan(0);
    expect(nodes.length).toBeGreaterThan(onlyFloor1.length);
  });


  it('preserves cross-floor stair/elevator edges between VL floors (not filtered out)', () => {
    const graph = getMultiFloorGraph('VL', [1, 2]);
    expect(graph).not.toBeNull();


    // At least one edge in VL connects nodes on different floors
    const nodeFloor = (id) => graph.nodes[id]?.floor;
    const crossFloorEdge = graph.edges.find(
      (e) => nodeFloor(e.from) !== nodeFloor(e.to)
    );
    expect(crossFloorEdge).toBeTruthy();
  });


  it('Hall merged [1,8] graph includes direct F1 stair landing to F8 (and F1 to F9 in full graph)', () => {
    const g18 = getMultiFloorGraph('H', [1, 8]);
    expect(g18).not.toBeNull();
    const hasF1ToF8Stair = g18.edges.some(
      (e) =>
        (e.from === 'Hall_F1_stair_landing_3' && e.to === 'Hall_F8_stair_landing_28') ||
        (e.to === 'Hall_F1_stair_landing_3' && e.from === 'Hall_F8_stair_landing_28')
    );
    expect(hasF1ToF8Stair).toBe(true);

    const g19 = getMultiFloorGraph('H', [1, 9]);
    expect(g19).not.toBeNull();
    const hasF1ToF9Stair = g19.edges.some(
      (e) =>
        (e.from === 'Hall_F1_stair_landing_3' && e.to === 'Hall_F9_stair_landing_21') ||
        (e.to === 'Hall_F1_stair_landing_3' && e.from === 'Hall_F9_stair_landing_21')
    );
    expect(hasF1ToF9Stair).toBe(true);
  });


  it('returns a valid viewBox string', () => {
    const graph = getMultiFloorGraph('VL', [1, 2]);
    expect(graph).not.toBeNull();
    expect(graph.viewBox).toBeTruthy();
  });


  it('returns nodes from both VL floors', () => {
    const graph = getMultiFloorGraph('VL', [1, 2]);
    const floors = new Set(Object.values(graph.nodes).map(n => n.floor));
    expect(floors.size).toBeGreaterThanOrEqual(2);
  });

  });





