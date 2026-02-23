// routeCalculator.test.js
import { calculateRoute } from './routeCalculator';
import { fetchGoogleDirections } from './googleDirections';

jest.mock('./googleDirections', () => ({
  fetchGoogleDirections: jest.fn(),
}));

describe('calculateRoute', () => {
  const start = { latitude: 45.4973, longitude: -73.579 };
  const end = { latitude: 45.495, longitude: -73.577 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns shuttle fallback route without calling Google', async () => {
    const result = await calculateRoute({ start, end, mode: 'shuttle' });

    expect(fetchGoogleDirections).not.toHaveBeenCalled();

    expect(result).toEqual(
      expect.objectContaining({
        mode: 'shuttle',
        summary: 'Shuttle option (handled separately)',
      })
    );

    // Basic sanity checks
    expect(typeof result.distanceMeters).toBe('number');
    expect(result.distanceMeters).toBeGreaterThan(0);

    expect(typeof result.durationMinutes).toBe('number');
    expect(result.durationMinutes).toBeGreaterThan(0);

    expect(result.polyline).toEqual([start, end]);
  });

  test('uses Google directions for walk/drive/transit when API succeeds', async () => {
    const googleResult = {
      mode: 'walk',
      distanceMeters: 1234,
      durationMinutes: 18,
      summary: 'Walk via Google',
      polyline: [start, end],
    };

    fetchGoogleDirections.mockResolvedValueOnce(googleResult);

    const result = await calculateRoute({ start, end, mode: 'walk' });

    expect(fetchGoogleDirections).toHaveBeenCalledTimes(1);
    expect(fetchGoogleDirections).toHaveBeenCalledWith({ start, end, mode: 'walk' });

    expect(result).toBe(googleResult);
  });

  test('falls back to estimate when Google directions throws', async () => {
    fetchGoogleDirections.mockRejectedValueOnce(new Error('API down'));

    const result = await calculateRoute({ start, end, mode: 'transit' });

    expect(fetchGoogleDirections).toHaveBeenCalledTimes(1);
    expect(fetchGoogleDirections).toHaveBeenCalledWith({ start, end, mode: 'transit' });

    expect(result).toEqual(
      expect.objectContaining({
        mode: 'transit',
        summary: 'Fallback estimate (API error)',
        polyline: [start, end],
      })
    );

    expect(typeof result.distanceMeters).toBe('number');
    expect(result.distanceMeters).toBeGreaterThan(0);

    expect(typeof result.durationMinutes).toBe('number');
    expect(result.durationMinutes).toBeGreaterThan(0);

    // Should include error string
    expect(typeof result.error).toBe('string');
    expect(result.error.toLowerCase()).toContain('api');
  });

  test('falls back to string error when error is not an Error instance', async () => {
    fetchGoogleDirections.mockRejectedValueOnce('Some string error');
    const result = await calculateRoute({ start, end, mode: 'transit' });
    expect(result.error).toBe('Some string error');
  });

  test('throws error if start/end is missing', async () => {
    await expect(calculateRoute({ mode: 'walk' })).rejects.toThrow('calculateRoute requires start and end');
  });

  test('throws error if mode is missing', async () => {
    await expect(calculateRoute({ start, end })).rejects.toThrow('calculateRoute requires mode');
  });
});

