import { getBuildings, getBuildingsByCampus, getBuildingInfo } from './buildings';

describe('buildings API', () => {
  describe('getBuildings', () => {
    it('should return an array of building features', () => {
      const buildings = getBuildings();
      expect(Array.isArray(buildings)).toBe(true);
      expect(buildings.length).toBeGreaterThan(0);
    });

    it('should return features with required properties', () => {
      const buildings = getBuildings();
      const firstBuilding = buildings[0];

      expect(firstBuilding).toHaveProperty('type', 'Feature');
      expect(firstBuilding).toHaveProperty('properties');
      expect(firstBuilding).toHaveProperty('geometry');
      expect(firstBuilding.properties).toHaveProperty('name');
    });
  });

  describe('getBuildingsByCampus', () => {
    it('should return only SGW buildings when filtered by SGW', () => {
      const sgwBuildings = getBuildingsByCampus('SGW');

      expect(Array.isArray(sgwBuildings)).toBe(true);
      expect(sgwBuildings.length).toBeGreaterThan(0);

      sgwBuildings.forEach(building => {
        expect(building.properties.campus).toBe('SGW');
      });
    });

    it('should return only LOY buildings when filtered by LOY', () => {
      const loyBuildings = getBuildingsByCampus('LOY');

      expect(Array.isArray(loyBuildings)).toBe(true);
      expect(loyBuildings.length).toBeGreaterThan(0);

      loyBuildings.forEach(building => {
        expect(building.properties.campus).toBe('LOY');
      });
    });

    it('should return empty array for non-existent campus', () => {
      const buildings = getBuildingsByCampus('INVALID');
      expect(buildings).toEqual([]);
    });

    it('should return different results for different campuses', () => {
      const sgwBuildings = getBuildingsByCampus('SGW');
      const loyBuildings = getBuildingsByCampus('LOY');

      expect(sgwBuildings.length).not.toBe(loyBuildings.length);
    });
  });

  describe('getBuildingInfo', () => {
    it('should return building info for valid building ID', () => {
      const evInfo = getBuildingInfo('EV');

      expect(evInfo).toBeDefined();
      expect(evInfo).toHaveProperty('id', 'EV');
      expect(evInfo).toHaveProperty('name');
      expect(evInfo).toHaveProperty('campus');
      expect(evInfo).toHaveProperty('accessibility');
    });

    it('should return building info with accessibility details', () => {
      const evInfo = getBuildingInfo('EV');

      expect(evInfo.accessibility).toHaveProperty('ramps');
      expect(evInfo.accessibility).toHaveProperty('elevators');
      expect(evInfo.accessibility).toHaveProperty('accessibleWashrooms');
      expect(evInfo.accessibility).toHaveProperty('notes');
    });

    it('should return building info with departments and services', () => {
      const evInfo = getBuildingInfo('EV');

      expect(Array.isArray(evInfo.departments)).toBe(true);
      expect(Array.isArray(evInfo.keyServices)).toBe(true);
      expect(Array.isArray(evInfo.facilities)).toBe(true);
    });

    it('should return null for non-existent building ID', () => {
      const info = getBuildingInfo('INVALID');
      expect(info).toBeNull();
    });

    it('should return different info for different buildings', () => {
      const evInfo = getBuildingInfo('EV');
      const hInfo = getBuildingInfo('H');

      expect(evInfo).not.toEqual(hInfo);
      expect(evInfo.name).not.toBe(hInfo.name);
    });
  });
});
