import { renderHook, act, waitFor } from '@testing-library/react-native';
import useHybridIndoorDirections from './useHybridIndoorDirections';

jest.mock('../services/routing/hybridIndoorDirections', () => ({
  computeHybridIndoorOutdoorRoute: jest.fn(),
}));

const { computeHybridIndoorOutdoorRoute } = require('../services/routing/hybridIndoorDirections');

const baseParams = {
  enabled: true,
  originBuilding: 'A',
  destBuilding: 'B',
  originRoomId: 'R1',
  destRoomId: 'R2',
  availableOptions: { A: [1], B: [1] },
  accessibleOnly: false,
};

describe('useHybridIndoorDirections', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    computeHybridIndoorOutdoorRoute.mockResolvedValue({
      kind: 'hybrid',
      steps: [],
      distanceText: '100 m',
      durationText: '2 min',
    });
  });

  const expectIdle = (result) => {
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  };

  it('does not fetch when disabled', () => {
    const { result } = renderHook(() =>
      useHybridIndoorDirections({ ...baseParams, enabled: false })
    );
    expectIdle(result);
    expect(computeHybridIndoorOutdoorRoute).not.toHaveBeenCalled();
  });

  it('does not fetch when same building', () => {
    const { result } = renderHook(() =>
      useHybridIndoorDirections({
        ...baseParams,
        destBuilding: 'A',
      })
    );
    expectIdle(result);
    expect(computeHybridIndoorOutdoorRoute).not.toHaveBeenCalled();
  });

  it.each([
    ['originBuilding', { ...baseParams, originBuilding: null }],
    ['destBuilding', { ...baseParams, destBuilding: null }],
    ['originRoomId', { ...baseParams, originRoomId: null }],
    ['destRoomId', { ...baseParams, destRoomId: null }],
  ])('does not fetch when %s is missing', (_, params) => {
    const { result } = renderHook(() => useHybridIndoorDirections(params));
    expectIdle(result);
    expect(computeHybridIndoorOutdoorRoute).not.toHaveBeenCalled();
  });

  it('loads hybrid route when all gates pass', async () => {
    const { result } = renderHook(() => useHybridIndoorDirections(baseParams));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.result).toEqual(
      expect.objectContaining({ kind: 'hybrid', distanceText: '100 m' })
    );
    expect(computeHybridIndoorOutdoorRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        originBuilding: 'A',
        destBuilding: 'B',
        originRoomId: 'R1',
        destRoomId: 'R2',
        accessibleOnly: false,
      })
    );
  });

  it('sets error message when compute rejects without message', async () => {
    computeHybridIndoorOutdoorRoute.mockRejectedValueOnce(new Error(''));

    const { result } = renderHook(() => useHybridIndoorDirections(baseParams));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe('Hybrid route failed.');
  });

  it('sets error from rejection message', async () => {
    computeHybridIndoorOutdoorRoute.mockRejectedValueOnce(new Error('No exit'));

    const { result } = renderHook(() => useHybridIndoorDirections(baseParams));

    await waitFor(() => {
      expect(result.current.error).toBe('No exit');
    });
  });

  it('clears prior result when parameters become invalid', async () => {
    computeHybridIndoorOutdoorRoute.mockResolvedValueOnce({
      kind: 'hybrid',
      steps: [],
      distanceText: '100 m',
      durationText: '2 min',
    });

    const { result, rerender } = renderHook(
      (p) => useHybridIndoorDirections(p),
      { initialProps: baseParams }
    );

    await waitFor(() => {
      expect(result.current.result).not.toBeNull();
    });

    rerender({ ...baseParams, enabled: false });

    expect(result.current.result).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('ignores stale resolution when unmounted before completion', async () => {
    let resolveRoute;
    computeHybridIndoorOutdoorRoute.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRoute = resolve;
        })
    );

    const { result, unmount } = renderHook(() => useHybridIndoorDirections(baseParams));

    expect(result.current.loading).toBe(true);

    unmount();

    await act(async () => {
      resolveRoute({ kind: 'hybrid', steps: [] });
    });
  });
});
