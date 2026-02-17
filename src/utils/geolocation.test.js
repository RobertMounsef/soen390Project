import { pointInRing, pointInPolygonFeature, getBuildingId } from './geolocation';

describe('geolocation utilities', () => {
  describe('pointInRing', () => {
    it('should return true for point inside a simple square', () => {
      const point = { latitude: 45.5, longitude: -73.5 };
      const ring = [
        [-73.6, 45.4],
        [-73.4, 45.4],
        [-73.4, 45.6],
        [-73.6, 45.6],
        [-73.6, 45.4], // closing point
      ];
      expect(pointInRing(point, ring)).toBe(true);
    });

    it('should return false for point outside a simple square', () => {
      const point = { latitude: 45.7, longitude: -73.5 };
      const ring = [
        [-73.6, 45.4],
        [-73.4, 45.4],
        [-73.4, 45.6],
        [-73.6, 45.6],
        [-73.6, 45.4],
      ];
      expect(pointInRing(point, ring)).toBe(false);
    });
  });

  describe('pointInPolygonFeature', () => {
    it('should return true for point inside a Polygon feature', () => {
      const point = { latitude: 45.5, longitude: -73.5 };
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.6, 45.4],
              [-73.4, 45.4],
              [-73.4, 45.6],
              [-73.6, 45.6],
              [-73.6, 45.4],
            ],
          ],
        },
      };
      expect(pointInPolygonFeature(point, feature)).toBe(true);
    });

    it('should return false for point outside a Polygon feature', () => {
      const point = { latitude: 45.7, longitude: -73.5 };
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.6, 45.4],
              [-73.4, 45.4],
              [-73.4, 45.6],
              [-73.6, 45.6],
              [-73.6, 45.4],
            ],
          ],
        },
      };
      expect(pointInPolygonFeature(point, feature)).toBe(false);
    });

    it('should return false for point in a hole of a Polygon', () => {
      const point = { latitude: 45.5, longitude: -73.5 };
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            // Outer ring
            [
              [-73.6, 45.4],
              [-73.4, 45.4],
              [-73.4, 45.6],
              [-73.6, 45.6],
              [-73.6, 45.4],
            ],
            // Hole
            [
              [-73.55, 45.45],
              [-73.45, 45.45],
              [-73.45, 45.55],
              [-73.55, 45.55],
              [-73.55, 45.45],
            ],
          ],
        },
      };
      expect(pointInPolygonFeature(point, feature)).toBe(false);
    });

    it('should return true for point inside a MultiPolygon feature', () => {
      const point = { latitude: 45.5, longitude: -73.5 };
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [-73.6, 45.4],
                [-73.4, 45.4],
                [-73.4, 45.6],
                [-73.6, 45.6],
                [-73.6, 45.4],
              ],
            ],
          ],
        },
      };
      expect(pointInPolygonFeature(point, feature)).toBe(true);
    });

    it('should return false for point outside all polygons in MultiPolygon', () => {
      const point = { latitude: 45.7, longitude: -73.5 };
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [-73.6, 45.4],
                [-73.4, 45.4],
                [-73.4, 45.6],
                [-73.6, 45.6],
                [-73.6, 45.4],
              ],
            ],
          ],
        },
      };
      expect(pointInPolygonFeature(point, feature)).toBe(false);
    });

    it('should return false for invalid feature with no geometry', () => {
      const point = { latitude: 45.5, longitude: -73.5 };
      const feature = { type: 'Feature' };
      expect(pointInPolygonFeature(point, feature)).toBe(false);
    });

    it('should return false for feature with unsupported geometry type', () => {
      const point = { latitude: 45.5, longitude: -73.5 };
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-73.5, 45.5],
        },
      };
      expect(pointInPolygonFeature(point, feature)).toBe(false);
    });

    it('should return false for point in hole of MultiPolygon (lines 48-50)', () => {
      const point = { latitude: 45.5, longitude: -73.5 };
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              // Outer ring
              [
                [-73.6, 45.4],
                [-73.4, 45.4],
                [-73.4, 45.6],
                [-73.6, 45.6],
                [-73.6, 45.4],
              ],
              // Hole
              [
                [-73.55, 45.45],
                [-73.45, 45.45],
                [-73.45, 45.55],
                [-73.55, 45.55],
                [-73.55, 45.45],
              ],
            ],
          ],
        },
      };
      expect(pointInPolygonFeature(point, feature)).toBe(false);
    });

    it('should return true for point in MultiPolygon outer ring but not in hole', () => {
      const point = { latitude: 45.42, longitude: -73.58 };
      const feature = {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              // Outer ring
              [
                [-73.6, 45.4],
                [-73.4, 45.4],
                [-73.4, 45.6],
                [-73.6, 45.6],
                [-73.6, 45.4],
              ],
              // Hole (point is not in this hole)
              [
                [-73.55, 45.45],
                [-73.45, 45.45],
                [-73.45, 45.55],
                [-73.55, 45.55],
                [-73.55, 45.45],
              ],
            ],
          ],
        },
      };
      expect(pointInPolygonFeature(point, feature)).toBe(true);
    });
  });

  describe('getBuildingId', () => {
    it('should return building ID from feature properties', () => {
      const feature = {
        type: 'Feature',
        properties: { id: 'EV', name: 'Engineering Building' },
      };
      expect(getBuildingId(feature)).toBe('EV');
    });

    it('should return null for feature without properties', () => {
      const feature = { type: 'Feature' };
      expect(getBuildingId(feature)).toBeNull();
    });

    it('should return null for feature without id property', () => {
      const feature = {
        type: 'Feature',
        properties: { name: 'Building' },
      };
      expect(getBuildingId(feature)).toBeNull();
    });

    it('should return null for null feature', () => {
      expect(getBuildingId(null)).toBeNull();
    });
  });
});
