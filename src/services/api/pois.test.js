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

  it('fetchNearbyGooglePois returns an empty list when userCoords are missing', async () => {
    const results = await fetchNearbyGooglePois({
      userCoords: null,
      category: 'all',
    });

    expect(results).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetchNearbyGooglePois throws when the API key is missing or left as the placeholder', async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    await expect(fetchNearbyGooglePois({
      userCoords: { latitude: 45.497, longitude: -73.579 },
    })).rejects.toThrow('Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env');

    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'your_google_maps_api_key_here';
    await expect(fetchNearbyGooglePois({
      userCoords: { latitude: 45.497, longitude: -73.579 },
    })).rejects.toThrow('Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env');
  });

  it('fetchNearbyGooglePois maps restaurant, services, and other categories and filters invalid places', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        places: [
          {
            id: 'google-food-1',
            displayName: { text: 'Food Court' },
            location: { latitude: 45.4971, longitude: -73.5791 },
            primaryType: 'restaurant',
            types: ['restaurant'],
          },
          {
            id: 'google-service-1',
            displayName: { text: 'Campus Pharmacy' },
            location: { latitude: 45.4972, longitude: -73.5792 },
            primaryType: 'pharmacy',
            types: ['point_of_interest', 'pharmacy'],
          },
          {
            id: 'google-other-1',
            displayName: { text: 'Lecture Hall' },
            location: { latitude: 45.4973, longitude: -73.5793 },
            primaryType: 'school',
            types: ['point_of_interest', 'school'],
          },
          {
            id: 'bad-location',
            displayName: { text: 'Broken Place' },
            location: { latitude: 'bad', longitude: -73.5794 },
          },
          {
            displayName: { text: 'Missing Id' },
            location: { latitude: 45.4975, longitude: -73.5795 },
          },
        ],
      }),
    });

    const results = await fetchNearbyGooglePois({
      userCoords: { latitude: 45.497, longitude: -73.579 },
      category: 'all',
      radiusMetres: 250,
      maxResultCount: 10,
    });

    expect(results).toHaveLength(3);
    expect(results.map((feature) => feature.properties.category)).toEqual([
      'restaurant',
      'services',
      'other',
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://places.googleapis.com/v1/places:searchNearby',
      expect.objectContaining({
        body: expect.stringContaining('"maxResultCount":10'),
      }),
    );
    expect(global.fetch.mock.calls[0][1].body).not.toContain('includedTypes');
  });
});
