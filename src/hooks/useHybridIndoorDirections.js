import { useState, useEffect } from 'react';
import { computeHybridIndoorOutdoorRoute } from '../services/routing/hybridIndoorDirections';

/**
 * Async hybrid indoor + outdoor route when origin and destination rooms are in
 * different buildings.
 *
 * @param {{
 *   enabled: boolean,
 *   originBuilding: string | null,
 *   destBuilding: string | null,
 *   originRoomId: string | null,
 *   destRoomId: string | null,
 *   availableOptions: Record<string, number[]>,
 *   accessibleOnly: boolean,
 * }} params
 */
export default function useHybridIndoorDirections({
  enabled,
  originBuilding,
  destBuilding,
  originRoomId,
  destRoomId,
  availableOptions,
  accessibleOnly = false,
}) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (
      !enabled ||
      !originBuilding ||
      !destBuilding ||
      !originRoomId ||
      !destRoomId ||
      originBuilding === destBuilding
    ) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setResult(null);

    computeHybridIndoorOutdoorRoute({
      originBuilding,
      destBuilding,
      originRoomId,
      destRoomId,
      availableOptions,
      accessibleOnly,
    })
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setResult(null);
        setError(e.message || 'Hybrid route failed.');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    originBuilding,
    destBuilding,
    originRoomId,
    destRoomId,
    accessibleOnly,
    availableOptions,
  ]);

  return { result, loading, error };
}
