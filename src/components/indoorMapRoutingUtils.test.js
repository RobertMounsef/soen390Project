import { getCommonFloorForStops, resolveRoutingSingleFloor } from './indoorMapRoutingUtils';

jest.mock('../floor_plans/waypoints/waypointsIndex', () => ({
  getFloorInfoForStops: jest.fn(),
}));

describe('indoorMapRoutingUtils', () => {
  const wp = require('../floor_plans/waypoints/waypointsIndex');

  beforeEach(() => {
    wp.getFloorInfoForStops.mockReset();
  });

  describe('resolveRoutingSingleFloor', () => {
    it('returns selectedFloor when no building', () => {
      expect(resolveRoutingSingleFloor(null, 3, 'A', 'B')).toBe(3);
    });

    it('uses commonFloor when present', () => {
      wp.getFloorInfoForStops.mockReturnValue({ originFloor: 1, destFloor: 2, commonFloor: 5 });
      expect(resolveRoutingSingleFloor('VE', 1, 'A', 'B')).toBe(5);
    });

    it('uses origin floor when destination id is missing', () => {
      wp.getFloorInfoForStops.mockReturnValue({ originFloor: 4, destFloor: null, commonFloor: null });
      expect(resolveRoutingSingleFloor('VE', 1, 'A', null)).toBe(4);
    });

    it('uses destination floor when origin id is missing', () => {
      wp.getFloorInfoForStops.mockReturnValue({ originFloor: null, destFloor: 6, commonFloor: null });
      expect(resolveRoutingSingleFloor('VE', 1, null, 'B')).toBe(6);
    });

    it('falls back to selectedFloor when both stops set but no common floor', () => {
      wp.getFloorInfoForStops.mockReturnValue({ originFloor: 1, destFloor: 2, commonFloor: null });
      expect(resolveRoutingSingleFloor('VE', 8, 'A', 'B')).toBe(8);
    });
  });

  describe('getCommonFloorForStops', () => {
    it('returns null without building', () => {
      expect(getCommonFloorForStops(null, {}, 'A', 'B')).toBeNull();
    });

    it('returns commonFloor when set', () => {
      wp.getFloorInfoForStops.mockReturnValue({ originFloor: 1, destFloor: 2, commonFloor: 2 });
      expect(getCommonFloorForStops('VE', {}, 'a', 'b')).toBe(2);
    });

    it('returns origin floor when only origin is set', () => {
      wp.getFloorInfoForStops.mockReturnValue({ originFloor: 3, destFloor: null, commonFloor: null });
      expect(getCommonFloorForStops('VE', {}, 'a', null)).toBe(3);
    });

    it('returns dest floor when only destination is set', () => {
      wp.getFloorInfoForStops.mockReturnValue({ originFloor: null, destFloor: 7, commonFloor: null });
      expect(getCommonFloorForStops('VE', {}, null, 'b')).toBe(7);
    });

    it('returns null when both ids set but floors differ with no common', () => {
      wp.getFloorInfoForStops.mockReturnValue({ originFloor: 1, destFloor: 9, commonFloor: null });
      expect(getCommonFloorForStops('VE', {}, 'a', 'b')).toBeNull();
    });
  });
});
