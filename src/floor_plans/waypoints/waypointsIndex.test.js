import mb1 from './mb1.json';
import mbS2 from './mbS2.json';
import {
  getFloorGraph,
  getAvailableFloors,
  injectViewBoxIfMissing,
  resolveViewBox,
  getMultiFloorGraph,
  mergeWaypointGraphsFromWaypointEntry,
  floorOfRoomId,
  getFloorInfoForStops,
} from './waypointsIndex';

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

  it('uses floor_plans_2 PNG + IMAGE_META viewBox for Hall floor 1', () => {
    const graph = getFloorGraph('H', 1);
    expect(graph.svgString).toBeNull();
    expect(graph.image).toBeTruthy();
    expect(graph.viewBox).toBe('0 0 1024 1024');
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
    expect(someProperty => someNode.hasOwnProperty(someProperty)).toBeTruthy();
  });

  it('uses floor_plans_2 PNG + IMAGE_META viewBox for Hall floor 9', () => {
    const graph = getFloorGraph('H', 9);
    expect(graph.svgString).toBeNull();
    expect(graph.viewBox).toBe('0 0 1024 1024');
  });

  it('uses graph.meta dimensions as viewBox for PNG-backed floors (VL1 = 1024×1024)', () => {
    const graph = getFloorGraph('VL', 1);
    expect(graph.viewBox).toBe('0 0 1024 1024');
  });

  it('uses graph.meta dimensions as viewBox for PNG-backed VE floors (1024×1024)', () => {
    expect(getFloorGraph('VE', 1).viewBox).toBe('0 0 1024 1024');
    expect(getFloorGraph('VE', 2).viewBox).toBe('0 0 1024 1024');
  });

  it('normalises source/target edges to from/to', () => {
    const graph = getFloorGraph('H', 8);
    expect(graph).not.toBeNull();
    expect(graph.edges.length).toBeGreaterThan(0);
    for (const e of graph.edges) {
      expect(e).toHaveProperty('from');
      expect(e).toHaveProperty('to');
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

  it('returns null for a non-existent floor in a known building', () => {
    expect(getFloorGraph('H', 99)).toBeNull();
  });

  it('returns null for an entirely unknown building', () => {
    expect(getFloorGraph('XYZ', 1)).toBeNull();
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


  // ─── mergeWaypointGraphsFromWaypointEntry (legacy multi-floor merge) ─────────

describe('mergeWaypointGraphsFromWaypointEntry', () => {
  it('returns null when waypoint entry is missing or floors are empty', () => {
    expect(mergeWaypointGraphsFromWaypointEntry(null, 'MB', [1])).toBeNull();
    expect(mergeWaypointGraphsFromWaypointEntry({ 1: {} }, 'MB', [])).toBeNull();
  });

  it('returns null when no requested floor exists in the waypoint entry', () => {
    expect(mergeWaypointGraphsFromWaypointEntry({ 1: { nodes: [], edges: [] } }, 'MB', [99])).toBeNull();
  });

  it('returns null when merged node set is empty', () => {
    const wg = { 1: { meta: {}, nodes: [], edges: [] } };
    expect(mergeWaypointGraphsFromWaypointEntry(wg, 'MB', [1])).toBeNull();
  });

  it('merges real MB legacy floors 1 and 2 with nodes on both floors', () => {
    const graph = mergeWaypointGraphsFromWaypointEntry({ 1: mb1, 2: mbS2 }, 'MB', [1, 2]);
    expect(graph).not.toBeNull();
    const floors = new Set(Object.values(graph.nodes).map((n) => n.floor));
    expect(floors.has(1)).toBe(true);
    expect(floors.has(2)).toBe(true);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.edges.every((e) => e.from && e.to)).toBe(true);
  });

  it('dedupes undirected edges and skips invalid endpoints; accepts source/target', () => {
    const wg = {
      1: {
        meta: { buildingId: 'mb', width: 1024, height: 1024 },
        nodes: [{ id: 'merge-a', type: 'room', floor: 1, x: 0, y: 0, label: 'merge-a' }],
        edges: [
          { from: '', to: 'merge-a' },
          { from: 'merge-a', to: 'merge-b' },
          { source: 'merge-b', target: 'merge-a' },
        ],
      },
      2: {
        nodes: [{ id: 'merge-b', type: 'room', floor: 2, x: 1, y: 1, label: 'merge-b' }],
        edges: [
          { from: 'merge-a', to: 'merge-b' },
          { from: null, to: 'merge-b' },
        ],
      },
    };
    const graph = mergeWaypointGraphsFromWaypointEntry(wg, 'MB', [2, 1, 2]);
    expect(graph).not.toBeNull();
    const between = graph.edges.filter(
      (e) =>
        (e.from === 'merge-a' && e.to === 'merge-b') ||
        (e.from === 'merge-b' && e.to === 'merge-a')
    );
    expect(between.length).toBe(1);
  });
});


  // ─── getMultiFloorGraph ───────────────────────────────────────────────────────

describe('getMultiFloorGraph', () => {
  it('returns null for an unknown building', () => {
    expect(getMultiFloorGraph('UNKNOWN', [1, 2])).toBeNull();
  });

  it('returns null when building is null', () => {
    expect(getMultiFloorGraph(null, [1, 2])).toBeNull();
  });

  it('returns null when floors is null', () => {
    expect(getMultiFloorGraph('MB', null)).toBeNull();
  });

  it('returns null when floors array is empty', () => {
    expect(getMultiFloorGraph('MB', [])).toBeNull();
  });

  it('returns nodes from all requested floors (VL floors 1 and 2)', () => {
    const graph = getMultiFloorGraph('VL', [1, 2]);
    expect(graph).not.toBeNull();
    const nodes = Object.values(graph.nodes);
    const onlyFloor1 = nodes.filter(n => n.floor === 1);
    expect(onlyFloor1.length).toBeGreaterThan(0);
    expect(nodes.length).toBeGreaterThan(onlyFloor1.length);
  });

  it('preserves cross-floor stair/elevator edges between VL floors', () => {
    const graph = getMultiFloorGraph('VL', [1, 2]);
    expect(graph).not.toBeNull();
    const nodeFloor = (id) => graph.nodes[id]?.floor;
    const crossFloorEdge = graph.edges.find(
      (e) => nodeFloor(e.from) !== nodeFloor(e.to)
    );
    expect(crossFloorEdge).toBeTruthy();
  });

  it('Hall merged graph includes F1 to F8 stair connection', () => {
    const g18 = getMultiFloorGraph('H', [1, 8]);
    expect(g18).not.toBeNull();
    const hasF1ToF8Stair = g18.edges.some(
      (e) =>
        (e.from === 'Hall_F1_stair_landing_3' && e.to === 'Hall_F8_stair_landing_28') ||
        (e.to === 'Hall_F1_stair_landing_3' && e.from === 'Hall_F8_stair_landing_28')
    );
    expect(hasF1ToF8Stair).toBe(true);
  });

  it('returns a valid viewBox string for multi-floor graph', () => {
    const graph = getMultiFloorGraph('VL', [1, 2]);
    expect(graph).not.toBeNull();
    expect(graph.viewBox).toBeTruthy();
  });

  it('returns nodes from multiple floors', () => {
    const graph = getMultiFloorGraph('VL', [1, 2]);
    const floors = new Set(Object.values(graph.nodes).map(n => n.floor));
    expect(floors.size).toBeGreaterThanOrEqual(2);
  });


  it('VE building-level graph merges floors 1–2 with stair edge for routing', () => {
    const graph = getMultiFloorGraph('VE', [1, 2]);
    expect(graph).not.toBeNull();
    const floors = new Set(Object.values(graph.nodes).map((n) => n.floor));
    expect(floors.has(1)).toBe(true);
    expect(floors.has(2)).toBe(true);
    const stair = graph.edges.find(
      (e) =>
        (e.from === 'VE_F1_stair_landing_24' && e.to === 'VE_F1_stair_landing_25') ||
        (e.from === 'VE_F1_stair_landing_25' && e.to === 'VE_F1_stair_landing_24')
    );
    expect(stair).toBeTruthy();
    expect(graph.viewBox).toBeTruthy();
  });

  describe('floorOfRoomId', () => {
    it('returns the floor number when the node exists', () => {
      expect(floorOfRoomId('VE', 'VE_F1_room_240')).toBe(1);
    });

    it('returns null when the room does not exist', () => {
      expect(floorOfRoomId('VE', 'NON_EXISTENT')).toBeNull();
    });

    it('handles lowercase building codes', () => {
      expect(floorOfRoomId('ve', 'VE_F1_room_240')).toBe(1);
    });
  });

  describe('getFloorInfoForStops', () => {
    it('returns nulls for non-existent rooms', () => {
      const info = getFloorInfoForStops('VE', 'NONE_1', 'NONE_2');
      expect(info.originFloor).toBeNull();
      expect(info.destFloor).toBeNull();
      expect(info.commonFloor).toBeNull();
    });

    it('identifies common floor correctly', () => {
      // Both on floor 1
      const info = getFloorInfoForStops('VE', 'VE_F1_room_240', 'VE_F1_elevator_door_1');
      expect(info.originFloor).toBe(1);
      expect(info.destFloor).toBe(1);
      expect(info.commonFloor).toBe(1);
    });

    it('identifies different floors and null commonFloor', () => {
      const info = getFloorInfoForStops('VE', 'VE_F1_room_240', 'VE_F1_room_242');
      expect(info.originFloor).toBe(1);
      expect(info.destFloor).toBe(2);
      expect(info.commonFloor).toBeNull();
    });
  });
});
