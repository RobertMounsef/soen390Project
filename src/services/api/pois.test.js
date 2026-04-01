import {
  fetchNearbyGooglePois,
  getOutdoorPoisByCampus,
  getOutdoorPoiCoords,
  getOutdoorPoiInfo,
  getOutdoorPoiFeature,
} from './pois';

describe('pois service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-maps-key';
  });

  it('getOutdoorPoisByCampus filters by campus', () => {
    const sgw = getOutdoorPoisByCampus('SGW');
    expect(sgw.length).toBeGreaterThanOrEqual(2);
    expect(sgw.every((f) => f.properties.campus === 'SGW')).toBe(true);

    const loy = getOutdoorPoisByCampus('LOY');
    expect(loy.length).toBeGreaterThanOrEqual(1);
    expect(loy.every((f) => f.properties.campus === 'LOY')).toBe(true);
  });

  it('getOutdoorPoiCoords returns lat/lng for a known POI', () => {
    const coords = getOutdoorPoiCoords('node-6005200875');
    expect(coords).not.toBeNull();
    expect(coords.latitude).toBeCloseTo(45.4978224, 4);
    expect(coords.longitude).toBeCloseTo(-73.5794186, 4);
  });

  it('getOutdoorPoiCoords returns null for unknown id', () => {
    expect(getOutdoorPoiCoords('unknown-poi')).toBeNull();
  });

  it('getOutdoorPoiInfo returns metadata', () => {
    const info = getOutdoorPoiInfo('way-604324443');
    expect(info).toMatchObject({
      id: 'way-604324443',
      campus: 'LOY',
      category: 'other',
    });
    expect(info.name).toBeTruthy();
  });

  it('getOutdoorPoiFeature returns null for missing id', () => {
    expect(getOutdoorPoiFeature('nope')).toBeNull();
  });

  it('fetchNearbyGooglePois calls Google Places with the selected category and maps the response', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        places: [
          {
            id: 'google-cafe-1',
            displayName: { text: 'Cafe X' },
            location: { latitude: 45.497, longitude: -73.579 },
            primaryType: 'coffee_shop',
            types: ['point_of_interest', 'coffee_shop'],
            shortFormattedAddress: '1455 De Maisonneuve Blvd W',
            googleMapsUri: 'https://maps.google.com/?cid=1',
          },
        ],
      }),
    });

    const results = await fetchNearbyGooglePois({
      userCoords: { latitude: 45.497, longitude: -73.579 },
      category: 'cafe',
      radiusMetres: 250,
      maxResultCount: 5,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://places.googleapis.com/v1/places:searchNearby',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Goog-Api-Key': 'test-maps-key',
        }),
      }),
    );
    expect(results).toEqual([
      expect.objectContaining({
        properties: expect.objectContaining({
          id: 'google-cafe-1',
          name: 'Cafe X',
          category: 'cafe',
          source: 'google_places',
        }),
      }),
    ]);
  });

  it('fetchNearbyGooglePois throws when Google returns an error', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"error":"bad request"}',
    });

    await expect(fetchNearbyGooglePois({
      userCoords: { latitude: 45.497, longitude: -73.579 },
      category: 'services',
      radiusMetres: 250,
      maxResultCount: 10,
    })).rejects.toThrow(/Google Places request failed: 400/);
  });
});
