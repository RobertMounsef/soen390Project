import {
  getOutdoorPoisByCampus,
  getOutdoorPoiCoords,
  getOutdoorPoiInfo,
  getOutdoorPoiFeature,
} from './pois';

describe('pois service', () => {
  it('getOutdoorPoisByCampus filters by campus', () => {
    const sgw = getOutdoorPoisByCampus('SGW');
    expect(sgw.length).toBeGreaterThanOrEqual(2);
    expect(sgw.every((f) => f.properties.campus === 'SGW')).toBe(true);

    const loy = getOutdoorPoisByCampus('LOY');
    expect(loy.length).toBeGreaterThanOrEqual(1);
    expect(loy.every((f) => f.properties.campus === 'LOY')).toBe(true);
  });

  it('getOutdoorPoiCoords returns lat/lng for a known POI', () => {
    const coords = getOutdoorPoiCoords('lbee-lb-sgw');
    expect(coords).not.toBeNull();
    expect(coords.latitude).toBeCloseTo(45.49705, 4);
    expect(coords.longitude).toBeCloseTo(-73.578009, 4);
  });

  it('getOutdoorPoiCoords returns null for unknown id', () => {
    expect(getOutdoorPoiCoords('unknown-poi')).toBeNull();
  });

  it('getOutdoorPoiInfo returns metadata', () => {
    const info = getOutdoorPoiInfo('buzz-sc-loy');
    expect(info).toMatchObject({
      id: 'buzz-sc-loy',
      campus: 'LOY',
      category: 'restaurant',
    });
    expect(info.name).toBeTruthy();
  });

  it('getOutdoorPoiFeature returns null for missing id', () => {
    expect(getOutdoorPoiFeature('nope')).toBeNull();
  });
});
