import { getFloorGraph, getAvailableFloors } from './waypointsIndex';

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
    expect(parts[2]).toBeGreaterThan(1024);
    expect(parts[3]).toBeGreaterThan(1024);
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
      expect(typeof e.weight).toBe('number');
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

