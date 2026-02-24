import { renderHook, act, waitFor } from '@testing-library/react-native';
import useShuttleDirections from './useShuttleDirections';
import * as directionsService from '../services/api/directions';
import * as shuttleService from '../services/api/shuttle';

jest.mock('../services/api/directions');
jest.mock('../services/api/shuttle');

const ORIGIN = { latitude: 45.497, longitude: -73.579 };
const DESTINATION = { latitude: 45.458, longitude: -73.64 };

const SHUTTLE_STOP_SGW = { name: 'SGW Stop', coords: { latitude: 45.4959, longitude: -73.5788 } };
const SHUTTLE_STOP_LOY = { name: 'LOY Stop', coords: { latitude: 45.4582, longitude: -73.6405 } };

const SUCCESS_WALK_TO_STOP = {
    polyline: [ORIGIN, SHUTTLE_STOP_SGW.coords],
    steps: [{ instruction: 'Walk to SGW stop', distance: '100 m', duration: '2 min' }],
    distanceText: '100 m',
    durationText: '2 min'
};

const SUCCESS_SHUTTLE = {
    polyline: [SHUTTLE_STOP_SGW.coords, SHUTTLE_STOP_LOY.coords],
    steps: [{ instruction: 'Take shuttle', distance: '6 km', duration: '30 min' }],
    distanceText: '6 km',
    durationText: '30 min'
};

const SUCCESS_WALK_FROM_STOP = {
    polyline: [SHUTTLE_STOP_LOY.coords, DESTINATION],
    steps: [{ instruction: 'Walk to destination', distance: '200 m', duration: '3 min' }],
    distanceText: '200 m',
    durationText: '3 min'
};

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 1, 23, 12, 0, 0)); // Mon Feb 23 2026 12:00:00

    shuttleService.isShuttleOperating.mockReturnValue(true);
    shuttleService.getShuttleStop.mockImplementation((campus) => campus === 'SGW' ? SHUTTLE_STOP_SGW : SHUTTLE_STOP_LOY);
    shuttleService.getNextDeparture.mockReturnValue({
        label: '12:15',
        isLastBus: false,
        departureTime: new Date(2026, 1, 23, 12, 15, 0),
        arrivalTime: new Date(2026, 1, 23, 12, 45, 0)
    });

    directionsService.fetchDirections.mockImplementation((origin, dest, mode) => {
        if (mode === 'walking' && origin === ORIGIN) return Promise.resolve(SUCCESS_WALK_TO_STOP);
        if (mode === 'driving') return Promise.resolve(SUCCESS_SHUTTLE);
        if (mode === 'walking' && dest === DESTINATION) return Promise.resolve(SUCCESS_WALK_FROM_STOP);
        return Promise.resolve(null);
    });
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
});

describe('useShuttleDirections', () => {
    it('starts with empty state', () => {
        const { result } = renderHook(() => useShuttleDirections({
            originCoords: null, destinationCoords: null, originCampus: null
        }));
        expect(result.current.route).toEqual([]);
        expect(result.current.loading).toBe(false);
    });

    it('computes shuttle route successfully', async () => {
        const { result } = renderHook(() => useShuttleDirections({
            originCoords: ORIGIN,
            destinationCoords: DESTINATION,
            originCampus: 'SGW'
        }));

        act(() => { jest.runAllTimers(); });
        await waitFor(() => expect(result.current.route.length).toBeGreaterThan(0));

        expect(result.current.route).toHaveLength(3); // 3 segments
        expect(result.current.route[0].mode).toBe('walking');
        expect(result.current.route[1].mode).toBe('shuttle');
        expect(result.current.route[2].mode).toBe('walking');

        expect(result.current.steps.length).toBeGreaterThan(0);
        expect(result.current.distanceText).toBe('6.3 km'); // 100m + 6km + 200m
        expect(result.current.durationText).toContain('min'); // wait + travel + walks
    });

    it('handles no shuttle operating', async () => {
        shuttleService.isShuttleOperating.mockReturnValue(false);

        const { result } = renderHook(() => useShuttleDirections({
            originCoords: ORIGIN,
            destinationCoords: DESTINATION,
            originCampus: 'SGW'
        }));

        act(() => { jest.runAllTimers(); });
        await waitFor(() => expect(result.current.error).toBe('Shuttle does not operate today.'));
        expect(result.current.route).toEqual([]);
    });

    it('handles missing shuttle stops', async () => {
        shuttleService.getShuttleStop.mockReturnValue(null);

        const { result } = renderHook(() => useShuttleDirections({
            originCoords: ORIGIN,
            destinationCoords: DESTINATION,
            originCampus: 'SGW'
        }));

        act(() => { jest.runAllTimers(); });
        await waitFor(() => expect(result.current.error).toBe('Shuttle stop info missing.'));
    });
});
