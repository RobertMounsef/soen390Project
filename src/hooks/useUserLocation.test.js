import { renderHook, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import useUserLocation from './useUserLocation';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 3,
  },
}));

describe('useUserLocation', () => {
  let mockSubscription;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscription = {
      remove: jest.fn(),
    };
  });


  it('should request permissions on mount', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.hasServicesEnabledAsync.mockResolvedValue(true);
    Location.watchPositionAsync.mockResolvedValue(mockSubscription);

    renderHook(() => useUserLocation());

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });
  });

  it('should set status to denied when permission is not granted', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => {
      expect(result.current.status).toBe('denied');
      expect(result.current.message).toContain('Location permission denied');
    });
  });

  it('should set status to unavailable when location services are disabled', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.hasServicesEnabledAsync.mockResolvedValue(false);

    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => {
      expect(result.current.status).toBe('unavailable');
      expect(result.current.message).toContain('Location services are off');
    });
  });

  it('should start watching position when permissions are granted', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.hasServicesEnabledAsync.mockResolvedValue(true);
    Location.watchPositionAsync.mockResolvedValue(mockSubscription);

    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => {
      expect(result.current.status).toBe('watching');
      expect(Location.watchPositionAsync).toHaveBeenCalled();
    });
  });

  it('should update coords when position changes', async () => {
    const mockCoords = {
      latitude: 45.497,
      longitude: -73.579,
      accuracy: 10,
    };

    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.hasServicesEnabledAsync.mockResolvedValue(true);
    Location.watchPositionAsync.mockImplementation((options, callback) => {
      // Simulate position update
      setTimeout(() => callback({ coords: mockCoords }), 100);
      return Promise.resolve(mockSubscription);
    });

    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => {
      expect(result.current.coords).toEqual(mockCoords);
    }, { timeout: 2000 });
  });

  it('should handle errors gracefully', async () => {
    Location.requestForegroundPermissionsAsync.mockRejectedValue(new Error('Permission error'));

    const { result } = renderHook(() => useUserLocation());

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.message).toContain('Location cannot be determined');
    });
  });

  it('should cleanup subscription on unmount', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.hasServicesEnabledAsync.mockResolvedValue(true);
    Location.watchPositionAsync.mockResolvedValue(mockSubscription);

    const { unmount } = renderHook(() => useUserLocation());

    await waitFor(() => {
      expect(Location.watchPositionAsync).toHaveBeenCalled();
    });

    unmount();

    expect(mockSubscription.remove).toHaveBeenCalled();
  });
});
