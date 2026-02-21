import { getFeatureCenter } from './geometry';

describe('geometry', () => {
    it('returns null for invalid feature', () => {
        expect(getFeatureCenter(null)).toBeNull();
        expect(getFeatureCenter({})).toBeNull();
    });

    it('computes center for Point feature', () => {
        const f = {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-73.57, 45.50] },
            properties: {},
        };
        const c = getFeatureCenter(f);
        expect(c).toEqual({ latitude: 45.50, longitude: -73.57 });
    });

    it('computes center for Polygon feature', () => {
        const f = {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-73.0, 45.0],
                    [-73.2, 45.0],
                    [-73.2, 45.2],
                    [-73.0, 45.2],
                    [-73.0, 45.0],
                ]],
            },
            properties: {},
        };
        const c = getFeatureCenter(f);
        expect(c).toHaveProperty('latitude');
        expect(c).toHaveProperty('longitude');
        expect(typeof c.latitude).toBe('number');
        expect(typeof c.longitude).toBe('number');
    });
    it('computes center for LineString feature', () => {
  const f = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-73.0, 45.0],
        [-73.2, 45.2],
      ],
    },
    properties: {},
  };

  const c = getFeatureCenter(f);
  expect(c).toHaveProperty('latitude');
  expect(c).toHaveProperty('longitude');
  expect(typeof c.latitude).toBe('number');
  expect(typeof c.longitude).toBe('number');
});

it('computes center for MultiLineString feature', () => {
  const f = {
    type: 'Feature',
    geometry: {
      type: 'MultiLineString',
      coordinates: [
        [
          [-73.0, 45.0],
          [-73.1, 45.1],
        ],
        [
          [-73.2, 45.2],
          [-73.3, 45.3],
        ],
      ],
    },
    properties: {},
  };

  const c = getFeatureCenter(f);
  expect(c).toHaveProperty('latitude');
  expect(c).toHaveProperty('longitude');
  expect(typeof c.latitude).toBe('number');
  expect(typeof c.longitude).toBe('number');
});

it('computes center for MultiPolygon feature', () => {
  const f = {
    type: 'Feature',
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-73.0, 45.0],
            [-73.2, 45.0],
            [-73.2, 45.2],
            [-73.0, 45.2],
            [-73.0, 45.0],
          ],
        ],
      ],
    },
    properties: {},
  };

  const c = getFeatureCenter(f);
  expect(c).toHaveProperty('latitude');
  expect(c).toHaveProperty('longitude');
  expect(typeof c.latitude).toBe('number');
  expect(typeof c.longitude).toBe('number');
});
});
