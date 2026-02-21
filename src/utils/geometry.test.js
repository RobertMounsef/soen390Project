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
});