import { renderHook, act, waitFor } from '@testing-library/react-native';
import useResource from './useResource';

describe('useResource', () => {
  it('should return initial data if fetcher is sync and dependencies are present', () => {
    const fetcher = jest.fn((id) => `data-${id}`);
    const { result } = renderHook(() => useResource(fetcher, ['123']));
    
    expect(result.current.data).toBe('data-123');
    expect(result.current.loading).toBe(false);
  });
  it('should handle async fetchers', async () => {
    const fetcher = jest.fn(async (id) => {
      return new Promise((resolve) => setTimeout(() => resolve(`async-${id}`), 10));
    });

    const { result } = renderHook(() => useResource(fetcher, ['async']));
    
    await waitFor(() => expect(result.current.data).toBe('async-async'), { timeout: 1000 });
    expect(result.current.loading).toBe(false);
  });

  it('should return null if any dependency is null', () => {
    const fetcher = jest.fn();
    const { result } = renderHook(() => useResource(fetcher, [null, 'valid']));
    
    expect(result.current.data).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const fetcher = jest.fn(() => { throw new Error('fetch failed'); });
    const { result } = renderHook(() => useResource(fetcher, ['error']));
    
    await waitFor(() => expect(result.current.error).toBe('fetch failed'), { timeout: 1000 });
    expect(result.current.data).toBeNull();
  });

  it('should ignore results from stale requests', async () => {
    const fetcher = jest.fn(async (id) => {
      const delay = id === 'first' ? 50 : 10;
      return new Promise((resolve) => setTimeout(() => resolve(`data-${id}`), delay));
    });

    const { result, rerender } = renderHook(
      ({ id }) => useResource(fetcher, [id]),
      { initialProps: { id: 'first' } }
    );

    // Immediately trigger second call
    rerender({ id: 'second' });

    await waitFor(() => expect(result.current.data).toBe('data-second'), { timeout: 1000 });
    
    // Result should be 'second', even though 'first' finishes later
    expect(result.current.data).toBe('data-second');
    
    // Wait more to ensure first doesn't overwrite
    await new Promise(r => setTimeout(r, 60));
    expect(result.current.data).toBe('data-second');
  });
});
