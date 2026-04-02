describe('outdoorPois data transform', () => {
  const loadOutdoorPoisModule = ({ sgwFeatures = [], loyFeatures = [] } = {}) => {
    jest.resetModules();
    jest.doMock('./sgw.json', () => ({
      __esModule: true,
      default: { type: 'FeatureCollection', features: sgwFeatures },
    }), { virtual: true });
    jest.doMock('./loyola.json', () => ({
      __esModule: true,
      default: { type: 'FeatureCollection', features: loyFeatures },
    }), { virtual: true });

    let moduleExports;
    jest.isolateModules(() => {
      moduleExports = require('./outdoorPois');
    });

    jest.dontMock('./sgw.json');
    jest.dontMock('./loyola.json');
    return moduleExports;
  };

  afterEach(() => {
    jest.resetModules();
    jest.dontMock('./sgw.json');
    jest.dontMock('./loyola.json');
  });

  it('keeps valid point POIs and sanitizes ids', () => {
    const { OUTDOOR_POIS_GEOJSON } = loadOutdoorPoisModule({
      sgwFeatures: [
        {
          type: 'Feature',
          properties: {
            '@id': 'node/abc 123',
            name: 'Campus Cafe',
            amenity: 'cafe',
          },
          geometry: {
            type: 'Point',
            coordinates: [-73.57, 45.49],
          },
        },
      ],
    });

    expect(OUTDOOR_POIS_GEOJSON.features).toEqual([
      expect.objectContaining({
        properties: expect.objectContaining({
          id: 'node-abc-123',
          name: 'Campus Cafe',
          campus: 'SGW',
          category: 'cafe',
        }),
        geometry: {
          type: 'Point',
          coordinates: [-73.57, 45.49],
        },
      }),
    ]);
  });

  it('converts polygon and multipolygon POIs to point centroids', () => {
    const { OUTDOOR_POIS_GEOJSON } = loadOutdoorPoisModule({
      sgwFeatures: [
        {
          type: 'Feature',
          properties: {
            '@id': 'way/1',
            name: 'Gallery',
            tourism: 'gallery',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-73.58, 45.50],
              [-73.56, 45.50],
              [-73.56, 45.48],
              [-73.58, 45.48],
            ]],
          },
        },
      ],
      loyFeatures: [
        {
          type: 'Feature',
          properties: {
            '@id': 'way/2',
            name: 'Sports Centre',
            leisure: 'sports_centre',
          },
          geometry: {
            type: 'MultiPolygon',
            coordinates: [[[
              [-73.64, 45.46],
              [-73.62, 45.46],
              [-73.62, 45.44],
              [-73.64, 45.44],
            ]]],
          },
        },
      ],
    });

    expect(OUTDOOR_POIS_GEOJSON.features).toHaveLength(2);
    expect(OUTDOOR_POIS_GEOJSON.features[0]).toEqual(expect.objectContaining({
      properties: expect.objectContaining({
        id: 'way-1',
        category: 'services',
      }),
    }));
    expect(OUTDOOR_POIS_GEOJSON.features[0].geometry.type).toBe('Point');
    expect(OUTDOOR_POIS_GEOJSON.features[0].geometry.coordinates[0]).toBeCloseTo(-73.57, 6);
    expect(OUTDOOR_POIS_GEOJSON.features[0].geometry.coordinates[1]).toBeCloseTo(45.49, 6);

    expect(OUTDOOR_POIS_GEOJSON.features[1]).toEqual(expect.objectContaining({
      properties: expect.objectContaining({
        id: 'way-2',
        campus: 'LOY',
        category: 'services',
      }),
    }));
    expect(OUTDOOR_POIS_GEOJSON.features[1].geometry.type).toBe('Point');
    expect(OUTDOOR_POIS_GEOJSON.features[1].geometry.coordinates[0]).toBeCloseTo(-73.63, 6);
    expect(OUTDOOR_POIS_GEOJSON.features[1].geometry.coordinates[1]).toBeCloseTo(45.45, 6);
  });

  it('skips features with missing names, unsupported geometry, invalid rings, invalid coordinates, or duplicate ids', () => {
    const { OUTDOOR_POIS_GEOJSON } = loadOutdoorPoisModule({
      sgwFeatures: [
        {
          type: 'Feature',
          properties: { '@id': 'node/1', amenity: 'cafe' },
          geometry: { type: 'Point', coordinates: [-73.57, 45.49] },
        },
        {
          type: 'Feature',
          properties: { '@id': 'node/2', name: 'Path', amenity: 'cafe' },
          geometry: { type: 'LineString', coordinates: [[-73.57, 45.49], [-73.56, 45.48]] },
        },
        {
          type: 'Feature',
          properties: { '@id': 'node/3', name: 'Broken Point', amenity: 'cafe' },
          geometry: { type: 'Point', coordinates: ['bad', 45.49] },
        },
        {
          type: 'Feature',
          properties: { '@id': 'node/3b', name: 'Missing Geometry Type', amenity: 'cafe' },
          geometry: {},
        },
        {
          type: 'Feature',
          properties: { '@id': 'way/4', name: 'Empty Polygon', tourism: 'gallery' },
          geometry: { type: 'Polygon', coordinates: [] },
        },
        {
          type: 'Feature',
          properties: { '@id': 'way/5', name: 'Invalid Ring', tourism: 'gallery' },
          geometry: { type: 'Polygon', coordinates: [[['x', 'y']]] },
        },
        {
          type: 'Feature',
          properties: { '@id': 'node/6', name: 'Bookstore', 'disused:shop': 'books' },
          geometry: { type: 'Point', coordinates: [-73.55, 45.47] },
        },
        {
          type: 'Feature',
          properties: { '@id': 'node/6', name: 'Bookstore Duplicate', shop: 'books' },
          geometry: { type: 'Point', coordinates: [-73.54, 45.46] },
        },
      ],
    });

    expect(OUTDOOR_POIS_GEOJSON.features).toHaveLength(1);
    expect(OUTDOOR_POIS_GEOJSON.features[0]).toEqual(expect.objectContaining({
      properties: expect.objectContaining({
        id: 'node-6',
        category: 'services',
      }),
    }));
  });

  it('uses a fallback id when the source feature has no @id', () => {
    const { OUTDOOR_POIS_GEOJSON } = loadOutdoorPoisModule({
      loyFeatures: [
        {
          type: 'Feature',
          properties: {
            name: 'Fallback Theatre',
            amenity: 'theatre',
          },
          geometry: {
            type: 'Point',
            coordinates: [-73.61, 45.43],
          },
        },
      ],
    });

    expect(OUTDOOR_POIS_GEOJSON.features).toHaveLength(1);
    expect(OUTDOOR_POIS_GEOJSON.features[0].properties.id).toBe('poi-loy-0');
    expect(OUTDOOR_POIS_GEOJSON.features[0].properties.category).toBe('other');
  });

  it('trims leading and trailing dashes from sanitized ids', () => {
    const { OUTDOOR_POIS_GEOJSON } = loadOutdoorPoisModule({
      sgwFeatures: [
        {
          type: 'Feature',
          properties: {
            '@id': ' /strange id/ ',
            name: 'Trim Test',
            amenity: 'cafe',
          },
          geometry: {
            type: 'Point',
            coordinates: [-73.57, 45.49],
          },
        },
      ],
    });

    expect(OUTDOOR_POIS_GEOJSON.features[0].properties.id).toBe('strange-id');
  });
});
