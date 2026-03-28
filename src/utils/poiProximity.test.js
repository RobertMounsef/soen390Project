import {
  distanceMetres,
  formatDistanceLabel,
  getNearbyOutdoorPois,
} from './poiProximity';

describe('poiProximity', () => {
  const pois = [
    {
      type: 'Feature',
      properties: {
        id: 'cafe-1',
        name: 'Cafe 1',
        category: 'cafe',
        campus: 'SGW',
      },
      geometry: { type: 'Point', coordinates: [-73.579, 45.497] },
    },
    {
      type: 'Feature',
      properties: {
        id: 'restaurant-1',
        name: 'Restaurant 1',
        category: 'restaurant',
        campus: 'SGW',
      },
      geometry: { type: 'Point', coordinates: [-73.5784, 45.4974] },
    },
    {
      type: 'Feature',
      properties: {
        id: 'service-1',
        name: 'Service 1',
        category: 'services',
        campus: 'SGW',
      },
      geometry: { type: 'Point', coordinates: [-73.575, 45.5] },
    },
  ];

  it('computes haversine distance in metres', () => {
    const distance = distanceMetres(
      { latitude: 45.497, longitude: -73.579 },
      { latitude: 45.4974, longitude: -73.5784 },
    );

    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(100);
  });

  it('formats metres and kilometres', () => {
    expect(formatDistanceLabel(85)).toBe('85 m');
    expect(formatDistanceLabel(1200)).toBe('1.2 km');
  });

  it('returns the nearest X pois sorted by distance', () => {
    const result = getNearbyOutdoorPois({
      pois,
      userCoords: { latitude: 45.497, longitude: -73.579 },
      mode: 'count',
      count: 2,
    });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('cafe-1');
    expect(result[1].distanceMetres).toBeGreaterThanOrEqual(result[0].distanceMetres);
  });

  it('filters by range and category', () => {
    const result = getNearbyOutdoorPois({
      pois,
      userCoords: { latitude: 45.497, longitude: -73.579 },
      mode: 'range',
      rangeMetres: 120,
      category: 'restaurant',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('restaurant-1');
  });

  it('returns an empty list when user location is missing', () => {
    expect(getNearbyOutdoorPois({ pois, userCoords: null })).toEqual([]);
  });

  it('skips POIs with invalid coordinates', () => {
    const invalidPois = [
      ...pois,
      {
        type: 'Feature',
        properties: {
          id: 'broken-poi',
          name: 'Broken',
          category: 'cafe',
          campus: 'SGW',
        },
        geometry: { type: 'Point', coordinates: ['bad', null] },
      },
    ];

    const result = getNearbyOutdoorPois({
      pois: invalidPois,
      userCoords: { latitude: 45.497, longitude: -73.579 },
      mode: 'count',
      count: 10,
    });

    expect(result.find((poi) => poi.id === 'broken-poi')).toBeUndefined();
  });
});
