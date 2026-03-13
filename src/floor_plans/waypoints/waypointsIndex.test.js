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
    // `mbS2.json` exists and is wired as MB floor 2.
    const graph = getFloorGraph('mb', 2);
    expect(graph).not.toBeNull();
    expect(graph.image).toBeTruthy();
  });

  it('derives viewBox from JSON meta width/height', () => {
    // H1.json defines meta.width/meta.height = 849/853
    const graph = getFloorGraph('H', 1);
    expect(graph.viewBox).toBe('0 0 849 853');
  });

  it('normalizes nodes arrays into objects keyed by id', () => {
    // ve1.json provides nodes as an array
    const graph = getFloorGraph('VE', 1);
    expect(graph).not.toBeNull();
    expect(typeof graph.nodes).toBe('object');
    expect(Array.isArray(graph.nodes)).toBe(false);

    expect(Object.keys(graph.nodes)).toEqual(
      expect.arrayContaining(['ve 101', 've 102', 've 103'])
    );
  });
});

