import { getBuildingInfo } from './buildingInfo';

describe('buildingInfo data module', () => {
  describe('getBuildingInfo', () => {
    it('should return building info for EV building', () => {
      const info = getBuildingInfo('EV');

      expect(info).toBeDefined();
      expect(info.id).toBe('EV');
      expect(info.name).toBe('Engineering, Computer Science and Visual Arts Integrated Complex');
      expect(info.campus).toBe('SGW');
    });

    it('should return building info for H building', () => {
      const info = getBuildingInfo('H');

      expect(info).toBeDefined();
      expect(info.id).toBe('H');
      expect(info.name).toBe('Henry F. Hall Building');
      expect(info.campus).toBe('SGW');
    });

    it('should return building info for VL building (Loyola)', () => {
      const info = getBuildingInfo('VL');

      expect(info).toBeDefined();
      expect(info.id).toBe('VL');
      expect(info.name).toBe('Vanier Library Building');
      expect(info.campus).toBe('LOY');
    });

    it('should include accessibility information', () => {
      const info = getBuildingInfo('EV');

      expect(info.accessibility).toBeDefined();
      expect(info.accessibility).toHaveProperty('ramps');
      expect(info.accessibility).toHaveProperty('elevators');
      expect(info.accessibility).toHaveProperty('accessibleWashrooms');
      expect(info.accessibility).toHaveProperty('notes');
    });

    it('should include departments array', () => {
      const info = getBuildingInfo('EV');

      expect(Array.isArray(info.departments)).toBe(true);
      expect(info.departments.length).toBeGreaterThan(0);
    });

    it('should include keyServices array', () => {
      const info = getBuildingInfo('EV');

      expect(Array.isArray(info.keyServices)).toBe(true);
    });

    it('should include facilities array', () => {
      const info = getBuildingInfo('EV');

      expect(Array.isArray(info.facilities)).toBe(true);
    });

    it('should return null for non-existent building', () => {
      const info = getBuildingInfo('INVALID');
      expect(info).toBeNull();
    });

    it('should return null for undefined input', () => {
      const info = getBuildingInfo(undefined);
      expect(info).toBeNull();
    });

    it('should return null for null input', () => {
      const info = getBuildingInfo(null);
      expect(info).toBeNull();
    });
  });
});
