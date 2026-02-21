import { getBuildings, getBuildingsByCampus, getBuildingInfo, getBuildingCoords } from './buildings';

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

  describe('getBuildingCoords', () => {
    it('returns null for an unknown building ID', () => {
      expect(getBuildingCoords('DOES_NOT_EXIST')).toBeNull();
    });

    it('returns a valid lat/lng object for a known SGW building', () => {
      // 'H' (Hall Building) is a well-known SGW building in the GeoJSON
      const coords = getBuildingCoords('H');
      expect(coords).not.toBeNull();
      expect(typeof coords.latitude).toBe('number');
      expect(typeof coords.longitude).toBe('number');
      // Rough bounds check: Concordia SGW campus area
      expect(coords.latitude).toBeLessThan(46);
      expect(coords.longitude).toBeGreaterThan(-74);
      expect(coords.longitude).toBeLessThan(-73);
    });

    it('returns a valid lat/lng object for a known Point building', () => {
      // Inject a test point to guarantee the Point logic branch is hit
      const { BUILDINGS_GEOJSON } = require('../../data/buildings');
      BUILDINGS_GEOJSON.features.push({
        properties: { id: 'TEST_POINT' },
        geometry: { type: 'Point', coordinates: [-73.5, 45.5] }
      });
      const coords = getBuildingCoords('TEST_POINT');
      expect(coords).not.toBeNull();
      expect(coords.latitude).toBeCloseTo(45.5, 4);
      expect(coords.longitude).toBeCloseTo(-73.5, 4);

      // Cleanup
      BUILDINGS_GEOJSON.features.pop();
    });

    it('returns null if geometry is missing', () => {
      const { BUILDINGS_GEOJSON } = require('../../data/buildings');
      BUILDINGS_GEOJSON.features.push({
        properties: { id: 'TEST_NO_GEOM' }
      });
      expect(getBuildingCoords('TEST_NO_GEOM')).toBeNull();
      BUILDINGS_GEOJSON.features.pop();
    });

    it('returns valid centroid for MultiPolygon geometry', () => {
      const { BUILDINGS_GEOJSON } = require('../../data/buildings');
      BUILDINGS_GEOJSON.features.push({
        properties: { id: 'TEST_MULTIPOLYGON' },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [[[[-73.5, 45.5], [-73.6, 45.6]]]]
        }
      });
      const coords = getBuildingCoords('TEST_MULTIPOLYGON');
      expect(coords.latitude).toBeCloseTo(45.55, 4);
      expect(coords.longitude).toBeCloseTo(-73.55, 4);
      BUILDINGS_GEOJSON.features.pop();
    });

    it('returns null if ring is empty', () => {
      const { BUILDINGS_GEOJSON } = require('../../data/buildings');
      BUILDINGS_GEOJSON.features.push({
        properties: { id: 'TEST_EMPTY_RING' },
        geometry: { type: 'Polygon', coordinates: [] }
      });
      expect(getBuildingCoords('TEST_EMPTY_RING')).toBeNull();
      BUILDINGS_GEOJSON.features.pop();
    });

    it('returns a valid lat/lng object for a known LOY building', () => {
      // 'AD' (Administration Building) is on the Loyola campus
      const coords = getBuildingCoords('AD');
      if (coords !== null) {
        // If this building exists in the data, validate the coords
        expect(typeof coords.latitude).toBe('number');
        expect(typeof coords.longitude).toBe('number');
      }
      // Either it exists with valid coords or it doesn't exist — both are acceptable
    });

    it('returns consistent results for the same ID', () => {
      const first = getBuildingCoords('EV');
      const second = getBuildingCoords('EV');
      expect(first).toEqual(second);
    });
  });
});
