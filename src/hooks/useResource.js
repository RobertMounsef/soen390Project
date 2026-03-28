import { useState, useEffect, useMemo } from 'react';

/**
 * useResource – Simple declarative fetch hook
 * Supports sync/async fetchers (sync is useful for Jest mocks).
 */
export default function useResource(fetcher, deps = []) {
  const [state, setState] = useState(() => {
    if (deps.every(d => d !== null)) {
      try {
        const result = fetcher(...deps);
        if (!(result instanceof Promise)) {
          return { data: result, loading: false, error: null };
        }
      } catch (err) {}
    }
    return { data: null, loading: false, error: null };
  });

  useEffect(() => {
    let active = true;
    if (deps.some(d => d === null)) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    const run = async () => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const result = fetcher(...deps);
        const resolved = (result instanceof Promise) ? await result : result;
        if (active) setState({ data: resolved, loading: false, error: null });
      } catch (err) {
        if (active) setState({ data: null, loading: false, error: err.message || String(err) });
      }
    };

    run();
    return () => { active = false; };
  }, deps);

  return state;
}
