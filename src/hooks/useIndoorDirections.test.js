import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import useIndoorDirections from './useIndoorDirections';
import * as indoorDirectionsSvc from '../services/routing/indoorDirections';

// ── Test graph ────────────────────────────────────────────────────────────────
// Corridor edges have weight=50 so they are far cheaper (total=100) than any
// auto-generated Euclidean shortcut (A→C direct ≈ 600).  This makes the path
// through B strictly optimal and assertions deterministic.
const GRAPH = {
  nodes: {
    A: { id: 'A', label: 'Room A', x: 0,   y: 0,   accessible: true },
    B: { id: 'B', label: 'Room B', x: 300, y: 150, accessible: true },
    C: { id: 'C', label: 'Room C', x: 600, y: 0,   accessible: true },
  },
  edges: [
    { from: 'A', to: 'B', weight: 50 },
    { from: 'B', to: 'C', weight: 50 },
  ],
  viewBox: '0 0 700 200',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useIndoorDirections', () => {
  it('returns null result when no origin or destination is provided', () => {
    const { result } = renderHook(() =>
      useIndoorDirections({ graph: GRAPH, originId: null, destinationId: null })
    );
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('returns null result when only origin is provided', () => {
    const { result } = renderHook(() =>
      useIndoorDirections({ graph: GRAPH, originId: 'A', destinationId: null })
    );
    expect(result.current.result).toBeNull();
  });

  it('calculates a route when both origin and destination are given', () => {
    const { result } = renderHook(() =>
      useIndoorDirections({ graph: GRAPH, originId: 'A', destinationId: 'C' })
    );
    expect(result.current.result).not.toBeNull();
    expect(result.current.result.path).toEqual(['A', 'B', 'C']);
    expect(result.current.error).toBeNull();
  });

  it('sets an error when origin node does not exist in graph', () => {
    const { result } = renderHook(() =>
      useIndoorDirections({
        graph: GRAPH,
        originId: 'NONEXISTENT',
        destinationId: 'C',
      })
    );
    expect(result.current.error).toBeTruthy();
    expect(result.current.result).toBeNull();
  });

  it('returns null when graph is null', () => {
    const { result } = renderHook(() =>
      useIndoorDirections({ graph: null, originId: 'A', destinationId: 'C' })
    );
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('recalculates when originId changes', () => {
    const { result, rerender } = renderHook(
      ({ origin }) =>
        useIndoorDirections({ graph: GRAPH, originId: origin, destinationId: 'C' }),
      { initialProps: { origin: 'A' } }
    );

    expect(result.current.result?.path[0]).toBe('A');

    act(() => {
      rerender({ origin: 'B' });
    });

    expect(result.current.result?.path[0]).toBe('B');
  });

  it('recalculates when destinationId changes', () => {
    const { result, rerender } = renderHook(
      ({ dest }) =>
        useIndoorDirections({ graph: GRAPH, originId: 'A', destinationId: dest }),
      { initialProps: { dest: 'C' } }
    );

    expect(result.current.result?.path?.at(-1)).toBe('C');

    act(() => {
      rerender({ dest: 'B' });
    });

    expect(result.current.result?.path?.at(-1)).toBe('B');
  });

  it('triggers recalculation when user deviates from path', () => {
    // Start: A → C (path goes through B at x=100,y=0)
    const { result, rerender } = renderHook(
      ({ userPos }) =>
        useIndoorDirections({
          graph: GRAPH,
          originId: 'A',
          destinationId: 'C',
          userPosition: userPos,
        }),
      { initialProps: { userPos: null } }
    );

    const initialPath = result.current.result?.path;
    expect(initialPath).toEqual(['A', 'B', 'C']);

    // Place user 300 units below B (way off the A→B→C path)
    act(() => {
      rerender({ userPos: { x: 300, y: 450 } }); // 300 units below B(300,150)
    });

    // Route should be recalculated from nearest node (B) to C.
    expect(result.current.result?.path).toEqual(['B', 'C']);
  });

  it('does NOT recalculate when user is close to the path', () => {
    const { result, rerender } = renderHook(
      ({ userPos }) =>
        useIndoorDirections({
          graph: GRAPH,
          originId: 'A',
          destinationId: 'C',
          userPosition: userPos,
        }),
      { initialProps: { userPos: null } }
    );

    const initialPath = result.current.result?.path;

    // User is within 50 units of node A – no recalculation
    act(() => {
      rerender({ userPos: { x: 10, y: 10 } }); // ~14 units from A
    });

    expect(result.current.result?.path).toEqual(initialPath);
  });

  it('surfaces compute errors without crashing the hook', () => {
    const spy = jest.spyOn(indoorDirectionsSvc, 'computeIndoorDirections').mockImplementation(() => {
      throw new Error('graph error');
    });
    const { result } = renderHook(() =>
      useIndoorDirections({ graph: GRAPH, originId: 'A', destinationId: 'C' }),
    );
    expect(result.current.result).toBeNull();
    expect(result.current.error).toMatch(/graph error/);
    expect(result.current.loading).toBe(false);
    spy.mockRestore();
  });

  it('clears the result when origin is cleared', () => {
    const { result, rerender } = renderHook(
      ({ origin }) =>
        useIndoorDirections({ graph: GRAPH, originId: origin, destinationId: 'C' }),
      { initialProps: { origin: 'A' } }
    );

    expect(result.current.result).not.toBeNull();

    act(() => { rerender({ origin: null }); });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });
});
