// src/services/routing/googleDirections.test.js
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      GOOGLE_MAPS_API_KEY: 'test-key',
    },
  },
}));

import { fetchGoogleDirections } from './googleDirections';

describe('googleDirections', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls fetch and returns parsed route data', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [
          {
            legs: [
              {
                distance: { value: 1200 },
                duration: { value: 900 },
                steps: [{ html_instructions: 'Head north' }],
              },
            ],
            overview_polyline: { points: 'abcd' },
          },
        ],
      }),
    });

    const r = await fetchGoogleDirections({
      start: { latitude: 45, longitude: -73 },
      end: { latitude: 45.1, longitude: -73.1 },
      mode: 'walk',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);

    expect(r).toBeTruthy();
    expect(r.distanceMeters).toBe(1200);
    expect(r.durationMinutes).toBeDefined();
    expect(r.polyline).toBeTruthy();
  });

  it('throws when fetch fails', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(
      fetchGoogleDirections({
        start: { latitude: 45, longitude: -73 },
        end: { latitude: 45.1, longitude: -73.1 },
        mode: 'walk',
      })
    ).rejects.toBeTruthy();
  });

  it('throws when no routes returned', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [] }),
    });

    await expect(
      fetchGoogleDirections({
        start: { latitude: 45, longitude: -73 },
        end: { latitude: 45.1, longitude: -73.1 },
        mode: 'walk',
      })
    ).rejects.toBeTruthy();
  });
});
