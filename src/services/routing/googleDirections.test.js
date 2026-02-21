// src/services/routing/googleDirections.test.js

let MOCK_API_KEY = 'test-key';

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      get GOOGLE_MAPS_API_KEY() {
        return MOCK_API_KEY;
      },
    },
  },
}));

import { fetchGoogleDirections } from './googleDirections';

describe('googleDirections', () => {
  beforeEach(() => {
    MOCK_API_KEY = 'test-key';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const baseArgs = {
    start: { latitude: 45, longitude: -73 },
    end: { latitude: 45.1, longitude: -73.1 },
  };

  it('walk: calls fetch, parses OK response, decodes polyline, normalizes WALKING step, strips html', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        status: 'OK',
        routes: [
          {
            legs: [
              {
                distance: { value: 1200 },
                duration: { value: 900 },
                steps: [
                  {
                    travel_mode: 'WALKING',
                    html_instructions: '<b>Head</b> north',
                    distance: { text: '0.5 km' },
                    duration: { text: '6 mins' },
                  },
                ],
              },
            ],
            overview_polyline: { points: '_p~iF~ps|U_ulLnnqC' },
          },
        ],
      }),
    });

    const r = await fetchGoogleDirections({ ...baseArgs, mode: 'walk' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(r.mode).toBe('walk');
    expect(r.distanceMeters).toBe(1200);
    expect(r.durationMinutes).toBe(15);
    expect(r.summary).toMatch(/Walking route/i);

    expect(Array.isArray(r.polyline)).toBe(true);
    expect(r.polyline.length).toBeGreaterThan(0);
    expect(r.polyline[0]).toHaveProperty('latitude');
    expect(r.polyline[0]).toHaveProperty('longitude');

    expect(Array.isArray(r.steps)).toBe(true);
    expect(r.steps[0]).toEqual(
      expect.objectContaining({
        kind: 'walk',
        instruction: 'Head north',
        distanceText: '0.5 km',
        durationText: '6 mins',
      })
    );
  });

  it('drive: uses duration_in_traffic when present', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        status: 'OK',
        routes: [
          {
            legs: [
              {
                distance: { value: 5000 },
                duration: { value: 600 },
                duration_in_traffic: { value: 1200 },
                steps: [
                  {
                    travel_mode: 'WALKING',
                    html_instructions: 'Walk to car',
                    distance: { text: '0.1 km' },
                    duration: { text: '1 min' },
                  },
                ],
              },
            ],
            overview_polyline: { points: '_p~iF~ps|U_ulLnnqC' },
          },
        ],
      }),
    });

    const r = await fetchGoogleDirections({ ...baseArgs, mode: 'drive' });

    expect(r.mode).toBe('drive');
    expect(r.distanceMeters).toBe(5000);
    expect(r.durationMinutes).toBe(20);
    expect(r.summary).toMatch(/Driving route/i);
  });

  it('transit: normalizes TRANSIT step (vehicle type, line, stops, stations, headsign, times)', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        status: 'OK',
        routes: [
          {
            legs: [
              {
                distance: { value: 3000 },
                duration: { value: 1800 },
                steps: [
                  {
                    travel_mode: 'WALKING',
                    html_instructions: 'Walk to station',
                    distance: { text: '0.4 km' },
                    duration: { text: '5 mins' },
                  },
                  {
                    travel_mode: 'TRANSIT',
                    distance: { text: '2 km' },
                    duration: { text: '10 mins' },
                    transit_details: {
                      departure_stop: { name: 'Station A' },
                      arrival_stop: { name: 'Station B' },
                      num_stops: 3,
                      headsign: '<div>Downtown</div>',
                      departure_time: { text: '10:05' },
                      arrival_time: { text: '10:15' },
                      line: {
                        short_name: '1',
                        name: 'Green Line',
                        vehicle: { type: 'SUBWAY' },
                      },
                    },
                  },
                ],
              },
            ],
            overview_polyline: { points: '_p~iF~ps|U_ulLnnqC' },
          },
        ],
      }),
    });

    const r = await fetchGoogleDirections({ ...baseArgs, mode: 'transit' });

    expect(r.mode).toBe('transit');
    expect(r.summary).toMatch(/Transit route/i);

    expect(r.steps[0]).toEqual(
      expect.objectContaining({
        kind: 'walk',
        instruction: 'Walk to station',
      })
    );

    expect(r.steps[1]).toEqual(
      expect.objectContaining({
        kind: 'subway',
        instruction: 'SUBWAY 1',
        detail: 'Station A → Station B',
        stopsText: '3 stops',
        headsign: 'Downtown',
        departTime: '10:05',
        arriveTime: '10:15',
        distanceText: '2 km',
        durationText: '10 mins',
      })
    );
  });

  it('falls back to kind=other when travel_mode is unknown', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        status: 'OK',
        routes: [
          {
            legs: [
              {
                distance: { value: 100 },
                duration: { value: 60 },
                steps: [
                  {
                    travel_mode: 'FLYING',
                    html_instructions: '<b>Do something</b>',
                    distance: { text: '0.1 km' },
                    duration: { text: '1 min' },
                  },
                ],
              },
            ],
            overview_polyline: { points: '_p~iF~ps|U_ulLnnqC' },
          },
        ],
      }),
    });

    const r = await fetchGoogleDirections({ ...baseArgs, mode: 'walk' });

    expect(r.steps[0]).toEqual(
      expect.objectContaining({
        kind: 'other',
        instruction: 'Do something',
      })
    );
  });

  it('throws when API key missing (no dynamic import)', async () => {
    MOCK_API_KEY = undefined;

    await expect(
      fetchGoogleDirections({ ...baseArgs, mode: 'walk' })
    ).rejects.toThrow(/Missing GOOGLE_MAPS_API_KEY/i);
  });

  it('throws when mode unsupported', async () => {
    await expect(
      fetchGoogleDirections({ ...baseArgs, mode: 'shuttle' })
    ).rejects.toThrow(/Unsupported mode/i);
  });

  it('throws when status is not OK', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        status: 'REQUEST_DENIED',
        error_message: 'bad key',
        routes: [],
      }),
    });

    await expect(
      fetchGoogleDirections({ ...baseArgs, mode: 'walk' })
    ).rejects.toThrow(/Directions API: REQUEST_DENIED/i);
  });

  it('throws when routes empty', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        status: 'OK',
        routes: [],
      }),
    });

    await expect(
      fetchGoogleDirections({ ...baseArgs, mode: 'walk' })
    ).rejects.toThrow(/Directions API:/i);
  });

  it('ensures minimum durationMinutes is 1 even if duration is 0', async () => {
    global.fetch.mockResolvedValueOnce({
      json: async () => ({
        status: 'OK',
        routes: [
          {
            legs: [
              {
                distance: { value: 10 },
                duration: { value: 0 },
                steps: [],
              },
            ],
            overview_polyline: { points: '_p~iF~ps|U_ulLnnqC' },
          },
        ],
      }),
    });

    const r = await fetchGoogleDirections({ ...baseArgs, mode: 'walk' });
    expect(r.durationMinutes).toBe(1);
  });
});
