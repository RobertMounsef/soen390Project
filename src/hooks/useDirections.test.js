import { renderHook, act, waitFor } from '@testing-library/react-native';
import useDirections from './useDirections';
import * as directionsService from '../services/api/directions';

jest.mock('../services/api/directions');

const ORIGIN = { latitude: 45.497, longitude: -73.579 };
const DESTINATION = { latitude: 45.458, longitude: -73.64 };
const ROUTE = [
  ORIGIN,
  { latitude: 45.477, longitude: -73.61 },
  DESTINATION,
];

const SUCCESS_RESULT = {
  polyline: ROUTE,
  steps: [{ instruction: 'Head north', distance: '500 m', duration: '6 min' }],
  distanceText: '5 km',
  durationText: '15 min',
};

beforeEach(() => {
  jest.useFakeTimers();
  directionsService.fetchDirections.mockResolvedValue(SUCCESS_RESULT);
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('useDirections', () => {
  it('starts with empty/idle state', () => {
    const { result } = renderHook(() =>
      useDirections({ originCoords: null, destinationCoords: null }),
    );
    expect(result.current.route).toEqual([]);
    expect(result.current.steps).toEqual([]);
    expect(result.current.distanceText).toBe('');
    expect(result.current.durationText).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('clears state when either coord is null', async () => {
    const { result, rerender } = renderHook(
      ({ originCoords, destinationCoords }) =>
        useDirections({ originCoords, destinationCoords }),
      { initialProps: { originCoords: ORIGIN, destinationCoords: DESTINATION } },
    );

    act(() => { jest.runAllTimers(); });
    await waitFor(() => expect(result.current.route.length).toBeGreaterThan(0));

    rerender({ originCoords: null, destinationCoords: DESTINATION });
    expect(result.current.route).toEqual([]);
    expect(result.current.steps).toEqual([]);
  });

  it('fetches directions after debounce when both coords are set', async () => {
    const { result } = renderHook(() =>
      useDirections({
        originCoords: ORIGIN,
        destinationCoords: DESTINATION,
        travelMode: 'walking',
      }),
    );

    expect(directionsService.fetchDirections).not.toHaveBeenCalled();

    act(() => { jest.runAllTimers(); });
    await waitFor(() => expect(result.current.route.length).toBeGreaterThan(0));

    expect(directionsService.fetchDirections).toHaveBeenCalledWith(
      ORIGIN, DESTINATION, 'walking',
    );
    expect(result.current.distanceText).toBe('5 km');
    expect(result.current.durationText).toBe('15 min');
    expect(result.current.steps).toHaveLength(1);
  });

  it('sets error state when no route is found', async () => {
    directionsService.fetchDirections.mockResolvedValueOnce(null);

    const { result } = renderHook(() =>
      useDirections({ originCoords: ORIGIN, destinationCoords: DESTINATION }),
    );

    act(() => { jest.runAllTimers(); });
    await waitFor(() => expect(result.current.error).toBe('No route found.'));

    expect(result.current.route).toEqual([]);
  });

  it('sets error state on fetch rejection', async () => {
    directionsService.fetchDirections.mockRejectedValueOnce(
      new Error('Network error'),
    );

    const { result } = renderHook(() =>
      useDirections({ originCoords: ORIGIN, destinationCoords: DESTINATION }),
    );

    act(() => { jest.runAllTimers(); });
    await waitFor(() => expect(result.current.error).toBe('Network error'));
  });

  it('sets fallback error message when error object has no message', async () => {
    directionsService.fetchDirections.mockRejectedValueOnce({});

    const { result } = renderHook(() =>
      useDirections({ originCoords: ORIGIN, destinationCoords: DESTINATION }),
    );

    act(() => { jest.runAllTimers(); });
    await waitFor(() => expect(result.current.error).toBe('Failed to fetch directions.'));
  });

  it('re-fetches when travel mode changes', async () => {
    const { rerender } = renderHook(
      ({ travelMode }) =>
        useDirections({ originCoords: ORIGIN, destinationCoords: DESTINATION, travelMode }),
      { initialProps: { travelMode: 'walking' } },
    );

    act(() => { jest.runAllTimers(); });
    await waitFor(() => expect(directionsService.fetchDirections).toHaveBeenCalledTimes(1));

    rerender({ travelMode: 'driving' });
    act(() => { jest.runAllTimers(); });
    await waitFor(() => expect(directionsService.fetchDirections).toHaveBeenCalledTimes(2));

    expect(directionsService.fetchDirections).toHaveBeenLastCalledWith(
      ORIGIN, DESTINATION, 'driving',
    );
  });

  it('recalculates when user deviates more than 50m from route', async () => {
    const { result, rerender } = renderHook(
      ({ userCoords }) =>
        useDirections({
          originCoords: ORIGIN,
          destinationCoords: DESTINATION,
          travelMode: 'walking',
          userCoords,
        }),
      { initialProps: { userCoords: null } },
    );

    // Initial fetch
    act(() => { jest.runAllTimers(); });
    await waitFor(() => expect(result.current.route.length).toBeGreaterThan(0));
    expect(directionsService.fetchDirections).toHaveBeenCalledTimes(1);

    // User moves far off route (>50m away from any point)
    const farAwayCoords = { latitude: 45.6, longitude: -73.7 };
    rerender({ userCoords: farAwayCoords });

    await waitFor(() =>
      expect(directionsService.fetchDirections).toHaveBeenCalledTimes(2),
    );
    // Recalculation should use the deviated position as the new origin
    expect(directionsService.fetchDirections).toHaveBeenLastCalledWith(
      farAwayCoords,
      DESTINATION,
      'walking',
    );
  });

  it('does NOT recalculate when user is close to the route (<50m)', async () => {
    const { rerender } = renderHook(
      ({ userCoords }) =>
        useDirections({
          originCoords: ORIGIN,
          destinationCoords: DESTINATION,
          travelMode: 'walking',
          userCoords,
        }),
      { initialProps: { userCoords: null } },
    );

    act(() => { jest.runAllTimers(); });
    await waitFor(() => expect(directionsService.fetchDirections).toHaveBeenCalledTimes(1));

    // User is very close to ORIGIN (within a few metres)
    rerender({ userCoords: { latitude: 45.4970001, longitude: -73.5790001 } });

    // Should not trigger a 2nd call
    act(() => { jest.runAllTimers(); });
    expect(directionsService.fetchDirections).toHaveBeenCalledTimes(1);
  });
});
