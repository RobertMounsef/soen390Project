import { renderHook, act, waitFor } from '@testing-library/react-native';
import useIndoorNavigation from './useIndoorNavigation';

// Standard mock prefix to allow hoisting
const mockGetFloorGraph = jest.fn();
const mockGetMultiFloorGraph = jest.fn();
const mockGetFloorInfoForStops = jest.fn();

jest.mock('../floor_plans/waypoints/waypointsIndex', () => ({
  getFloorGraph: (...args) => mockGetFloorGraph(...args),
  getMultiFloorGraph: (...args) => mockGetMultiFloorGraph(...args),
  getFloorInfoForStops: (...args) => mockGetFloorInfoForStops(...args),
}));

jest.mock('./useIndoorDirections', () => jest.fn(() => ({ result: 'mockRoute', loading: false, error: null })));

describe('useIndoorNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFloorGraph.mockReturnValue({ nodes: {}, edges: [] });
    mockGetMultiFloorGraph.mockReturnValue({ nodes: {}, edges: [] });
    mockGetFloorInfoForStops.mockReturnValue({ commonFloor: 1, originFloor: 1, destFloor: 1 });
  });

  it('initializes correctly', async () => {
    const { result } = renderHook(() => useIndoorNavigation({
      selectedBuilding: 'H',
      selectedFloor: 1,
    }));
    
    await waitFor(() => {
      expect(result.current.displayFloor).toBe(1);
    });
  });

  it('handles floor changes', async () => {
    const { result } = renderHook(() => useIndoorNavigation({
      selectedBuilding: 'H',
      selectedFloor: 1,
    }));
    
    await waitFor(() => expect(result.current.displayFloor).toBe(1));

    act(() => {
      result.current.handleFloorChange(4);
    });
    
    expect(result.current.displayFloor).toBe(4);
  });

  it('detects multi-floor needs', async () => {
    mockGetFloorInfoForStops.mockReturnValue({ commonFloor: null, originFloor: 1, destFloor: 4 });
    
    const { result } = renderHook(() => useIndoorNavigation({
      selectedBuilding: 'H',
      selectedFloor: 1,
      originId: 'r1',
      destinationId: 'r4',
    }));
    
    await waitFor(() => {
      expect(result.current.isMultiFloor).toBe(true);
    });
  });
});
