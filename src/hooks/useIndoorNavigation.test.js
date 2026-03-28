import { renderHook, act, waitFor } from '@testing-library/react-native';
import useIndoorNavigation from './useIndoorNavigation';

// Mock dependencies to avoid side-effects
const mockGetFloorGraph = jest.fn();
const mockGetMultiFloorGraph = jest.fn();
const mockGetFloorInfoForStops = jest.fn();

jest.mock('../floor_plans/waypoints/waypointsIndex', () => ({
  getFloorGraph: (...args) => mockGetFloorGraph(...args),
  getMultiFloorGraph: (...args) => mockGetMultiFloorGraph(...args),
  getFloorInfoForStops: (...args) => mockGetFloorInfoForStops(...args),
}));

// Mock useIndoorDirections
jest.mock('./useIndoorDirections', () => () => ({ result: 'mockRoute', loading: false, error: null }));

describe('useIndoorNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Reset any singleton hook state if necessary
  });

  it('should return initial state based on props', () => {
    const { result } = renderHook(() => useIndoorNavigation({
      selectedBuilding: 'H',
      selectedFloor: 1,
    }));
    
    expect(result.current.displayFloor).toBe(1);
    expect(result.current.isMultiFloor).toBe(false);
  });

  it('should sync displayFloor to selectedFloor prop changes', () => {
    const { result, rerender } = renderHook(
      ({ floor }) => useIndoorNavigation({ selectedBuilding: 'H', selectedFloor: floor }),
      { initialProps: { floor: 1 } }
    );
    
    expect(result.current.displayFloor).toBe(1);
    
    rerender({ floor: 2 });
    expect(result.current.displayFloor).toBe(2);
  });

  it('should allow manual floor changes', () => {
    const { result } = renderHook(() => useIndoorNavigation({ selectedBuilding: 'H', selectedFloor: 1 }));
    
    act(() => {
      result.current.handleFloorChange(4);
    });
    
    expect(result.current.displayFloor).toBe(4);
  });

  it('should detect multi-floor routing needs', () => {
    // Force a multi-floor response
    mockGetFloorInfoForStops.mockReturnValue({ commonFloor: null, originFloor: 1, destFloor: 4 });
    
    const { result } = renderHook(() => useIndoorNavigation({
      selectedBuilding: 'H',
      selectedFloor: 1,
      originId: 'room-1',
      destinationId: 'room-4',
    }));
    
    expect(result.current.isMultiFloor).toBe(true);
    expect(result.current.floorsNeeded).toEqual([1, 4]);
  });
});
