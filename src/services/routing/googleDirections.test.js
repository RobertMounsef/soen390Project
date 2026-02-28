import { fetchDirections, decodePolyline } from './googleDirections';

// ---------- decodePolyline ----------
describe('decodePolyline', () => {
  it('returns an empty array for an empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });

  it('decodes a known polyline correctly', () => {
    // Standard Google polyline example string for:
    // (38.5, -120.2)
    const encoded = '_p~iF~ps|U';
    const points = decodePolyline(encoded);
    expect(points).toHaveLength(1);
    expect(points[0].latitude).toBeCloseTo(38.5, 3);
    expect(points[0].longitude).toBeCloseTo(-120.2, 3);
  });

  it('decodes a two-point polyline', () => {
    // A simple L-shaped path: (0,0) → (1,1)
    const encoded = '_ibE_ibE_ibE_ibE';
    const points = decodePolyline(encoded);
    expect(points.length).toBeGreaterThanOrEqual(1);
    points.forEach((p) => {
      expect(typeof p.latitude).toBe('number');
      expect(typeof p.longitude).toBe('number');
    });
  });
});

// ---------- fetchDirections ----------
describe('fetchDirections', () => {
  const origin = { latitude: 45.497, longitude: -73.579 };
  const destination = { latitude: 45.458, longitude: -73.64 };

  beforeEach(() => {
    globalThis.fetch = jest.fn();
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'TEST_API_KEY';
  });

  afterEach(() => {
    jest.resetAllMocks();
    delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  });

  it('returns null when origin is missing', async () => {
    const result = await fetchDirections(null, destination);
    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns null when destination is missing', async () => {
    const result = await fetchDirections(origin, null);
    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('throws an error when API key is missing', async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    await expect(fetchDirections(origin, destination)).rejects.toThrow(/Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY/);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('throws an error on HTTP error', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Internal Server Error' } }),
    });
    await expect(fetchDirections(origin, destination)).rejects.toThrow(/Google API HTTP error 500: Internal Server Error/);
  });

  it('throws an error when routes array is empty', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [] }),
    });
    await expect(fetchDirections(origin, destination)).rejects.toThrow(/No route found between these locations/);
  });

  it('throws an error when routes array is empty', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [] }),
    });
    await expect(fetchDirections(origin, destination)).rejects.toThrow(/No route found between these locations/);
  });

  it('throws an error when route data is missing leg information', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [{ legs: [] }],
      }),
    });
    await expect(fetchDirections(origin, destination)).rejects.toThrow(/Route data is missing leg information/);
  });

  it('throws an error on network/fetch error', async () => {
    globalThis.fetch.mockRejectedValueOnce(new Error('Network failure'));
    await expect(fetchDirections(origin, destination)).rejects.toThrow(/Network failure/);
  });

  it('returns parsed route data on success and strips HTML from instructions', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [
          {
            polyline: { encodedPolyline: '_p~iF~ps|U' },
            localizedValues: {
              distance: { text: '1.5 km' },
              duration: { text: '20 mins' },
            },
            legs: [
              {
                steps: [
                  {
                    navigationInstruction: { instructions: 'Head <b>north</b> on <b>Main St</b>' },
                    localizedValues: {
                      distance: { text: '800 m' },
                      duration: { text: '10 mins' },
                    },
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    const result = await fetchDirections(origin, destination, 'walking');

    expect(result).not.toBeNull();
    expect(result.distanceText).toBe('1.5 km');
    expect(result.durationText).toBe('20 mins');
    expect(Array.isArray(result.polyline)).toBe(true);
    expect(result.polyline.length).toBeGreaterThan(0);
    expect(Array.isArray(result.steps)).toBe(true);
    expect(result.steps[0].instruction).toBe('Head north on Main St');
    expect(result.steps[0].distance).toBe('800 m');
  });

  it('uses travelMode: TRANSIT for transit mode', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [
          {
            polyline: { encodedPolyline: '_p~iF~ps|U' },
            legs: [{ steps: [] }],
          },
        ],
      }),
    });
    await fetchDirections(origin, destination, 'transit');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"travelMode":"TRANSIT"'),
      })
    );
  });

  it('uses travelMode: DRIVE for driving mode', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [
          {
            polyline: { encodedPolyline: '_p~iF~ps|U' },
            legs: [{ steps: [] }],
          },
        ],
      }),
    });
    await fetchDirections(origin, destination, 'driving');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"travelMode":"DRIVE"'),
      })
    );
  });

  it('correctly formats instruction for transit steps (Metro)', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [
          {
            polyline: { encodedPolyline: '_p~iF~ps|U' },
            legs: [
              {
                steps: [
                  {
                    transitDetails: {
                      transitLine: {
                        nameShort: '1',
                        vehicle: { type: 'SUBWAY' },
                      },
                      stopDetails: {
                        departureStop: { name: 'Peel' },
                        arrivalStop: { name: 'Guy-Concordia' },
                      },
                      headsign: 'Angrignon',
                    },
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    const result = await fetchDirections(origin, destination, 'transit');
    expect(result.steps[0].instruction).toBe('Take Metro 1 towards Angrignon from Peel. Get off at Guy-Concordia');
  });

  it('correctly formats instruction for transit steps (Bus with only name)', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [
          {
            polyline: { encodedPolyline: '_p~iF~ps|U' },
            legs: [
              {
                steps: [
                  {
                    transitDetails: {
                      transitLine: {
                        name: 'Express Bus',
                        vehicle: { type: 'BUS' },
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    const result = await fetchDirections(origin, destination, 'transit');
    expect(result.steps[0].instruction).toBe('Take Bus Express Bus');
  });

  it('correctly formats instruction for transit steps (Train)', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [
          {
            polyline: { encodedPolyline: '_p~iF~ps|U' },
            legs: [
              {
                steps: [
                  {
                    transitDetails: {
                      transitLine: {
                        vehicle: { type: 'COMMUTER_TRAIN' },
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      }),
    });

    const result = await fetchDirections(origin, destination, 'transit');
    expect(result.steps[0].instruction).toBe('Take Train Transit');
  });
});
