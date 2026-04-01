import {
  buildAvailableOptionsFromWaypoints,
  findRoomNodeIdForCalendar,
  mergeCalendarOutdoorWithIndoorLeg,
} from './calendarClassDirections';

jest.mock('../../floor_plans/waypoints/waypointsIndex', () => ({
  getAvailableFloors: jest.fn(() => [
    { building: 'X', floor: 1 },
  ]),
  getFloorGraph: jest.fn((b, f) => {
    if (b !== 'X' || f !== 1) return null;
    return {
      nodes: {
        R999: { type: 'room', label: 'Lab 999', floor: 1, x: 0, y: 0 },
        R888: { type: 'room', label: 'Annex 8888', floor: 1, x: 1, y: 1 },
        RAA: { type: 'room', label: 'Room A', floor: 1, x: 2, y: 2 },
        RAB: { type: 'room', label: 'Room A', floor: 1, x: 3, y: 3 },
        EX: { type: 'building_entry_exit', label: 'Door', floor: 1, x: 10, y: 0 },
      },
      edges: [{ from: 'EX', to: 'R999', weight: 10 }],
      meta: { metresPerUnit: 0.01 },
    };
  }),
}));

jest.mock('./hybridIndoorDirections', () => ({
  computeIndoorLegFromBuildingEntranceToRoom: jest.fn(() => ({
    entranceId: 'EX',
    indoor: {
      steps: [{ id: 's0', instruction: 'Walk to room', distance: '5 m', duration: '' }],
      totalMetres: 5,
    },
    graph: {
      nodes: {
        EX: { floor: 1 },
        R999: { floor: 1 },
      },
    },
  })),
  fmtDist: (m) => `${Math.round(m)} m`,
  fmtDur: () => '1 min',
}));

jest.mock('../api/buildings', () => ({
  getBuildingInfo: jest.fn(() => ({ name: 'Test Hall', code: 'X' })),
}));

describe('calendarClassDirections', () => {
  const wp = require('../../floor_plans/waypoints/waypointsIndex');

  it('buildAvailableOptionsFromWaypoints skips invalid floors and sorts per building', () => {
    wp.getAvailableFloors.mockReturnValueOnce([
      { building: 'A', floor: 2 },
      { building: 'B', floor: 1 },
      { building: 'A', floor: Number.NaN },
      { building: 'A', floor: 1 },
    ]);
    const m = buildAvailableOptionsFromWaypoints();
    expect(m.A).toEqual([1, 2]);
    expect(m.B).toEqual([1]);
  });

  it('findRoomNodeIdForCalendar matches room number in label', () => {
    const opts = { X: [1] };
    expect(findRoomNodeIdForCalendar('X', '999', opts)).toBe('R999');
    expect(findRoomNodeIdForCalendar('X', 'Lab 999', opts)).toBe('R999');
  });

  it('findRoomNodeIdForCalendar uses fuzzy match when unique substring hit', () => {
    const opts = { X: [1] };
    expect(findRoomNodeIdForCalendar('X', '88', opts)).toBe('R888');
  });

  it('findRoomNodeIdForCalendar returns first room when several exact-normalized matches exist', () => {
    const opts = { X: [1] };
    expect(findRoomNodeIdForCalendar('X', 'Room A', opts)).toBe('RAA');
  });

  it('findRoomNodeIdForCalendar returns null when several fuzzy substring matches exist', () => {
    wp.getFloorGraph.mockImplementationOnce((b, f) => {
      if (b !== 'X' || f !== 1) return null;
      return {
        nodes: {
          R1: { type: 'room', label: 'Lab 9900', floor: 1, x: 0, y: 0 },
          R2: { type: 'room', label: 'Wing 9911', floor: 1, x: 1, y: 1 },
          EX: { type: 'building_entry_exit', label: 'Door', floor: 1, x: 10, y: 0 },
        },
        edges: [],
        meta: { metresPerUnit: 0.01 },
      };
    });
    expect(findRoomNodeIdForCalendar('X', '99', { X: [1] })).toBeNull();
  });

  it('mergeCalendarOutdoorWithIndoorLeg returns null when indoor leg cannot be computed', () => {
    const hybrid = require('./hybridIndoorDirections');
    hybrid.computeIndoorLegFromBuildingEntranceToRoom.mockReturnValueOnce(null);
    const out = mergeCalendarOutdoorWithIndoorLeg({
      destBuildingId: 'X',
      destRoomNodeId: 'R999',
      availableOptions: { X: [1] },
      outdoorSteps: [{ id: 'o1', instruction: 'Walk outside', distance: '', duration: '' }],
      outdoorDistanceMeters: 100,
      outdoorDurationSeconds: 120,
    });
    expect(out).toBeNull();
    expect(hybrid.computeIndoorLegFromBuildingEntranceToRoom).toHaveBeenCalled();
  });

  it('mergeCalendarOutdoorWithIndoorLeg stitches outdoor and indoor steps', () => {
    const merged = mergeCalendarOutdoorWithIndoorLeg({
      destBuildingId: 'X',
      destRoomNodeId: 'R999',
      availableOptions: { X: [1] },
      outdoorSteps: [{ id: 'o1', instruction: 'Walk outside', distance: '', duration: '' }],
      outdoorDistanceMeters: 100,
      outdoorDurationSeconds: 120,
    });
    expect(merged).not.toBeNull();
    expect(merged.steps.some((s) => s.kind === 'segment' && s.title?.includes('Outside'))).toBe(true);
    expect(merged.steps.some((s) => s.openIndoor?.buildingId === 'X')).toBe(true);
    expect(merged.destinationRoomId).toBe('R999');
    expect(merged.originRoomId).toBe('EX');
  });
});
