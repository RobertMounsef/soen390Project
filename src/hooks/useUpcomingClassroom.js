/**
 * Hook: useUpcomingClassroom
 *
 * Fetches Google Calendar events and resolves the next upcoming classroom.
 * Returns a status object that MapScreen uses to display the Next Class Banner.
 *
 * Statuses:
 *   'idle'       — user is not connected to Google Calendar
 *   'loading'    — fetching events
 *   'resolved'   — next class found with a known building
 *   'unresolved' — next class found but location is unclear
 *   'error'      — something went wrong
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getStoredCredentials,
  fetchCalendarEvents,
  getStoredSelectedCalendarIds,
} from '../services/calendar/auth';
import { resolveNextClassroomEvent } from '../utils/calendarClassLocation';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default function useUpcomingClassroom() {
  const [result, setResult] = useState({
    status: 'idle',
    event: null,
    buildingId: null,
    room: null,
    buildingName: null,
    campus: null,
    error: null,
  });

  const refresh = useCallback(async () => {
    setResult((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const creds = await getStoredCredentials();
      if (!creds) {
        setResult({
          status: 'idle',
          event: null,
          buildingId: null,
          room: null,
          buildingName: null,
          campus: null,
          error: null,
        });
        return;
      }

      const calendarIds = await getStoredSelectedCalendarIds();
      const { events, error } = await fetchCalendarEvents(creds.accessToken, {
        maxResults: 20,
        timeMin: new Date().toISOString(),
        ...(calendarIds?.length ? { calendarIds } : {}),
      });

      if (error) {
        setResult({
          status: 'error',
          event: null,
          buildingId: null,
          room: null,
          buildingName: null,
          campus: null,
          error,
        });
        return;
      }

      const resolved = resolveNextClassroomEvent(events, new Date());

      if (!resolved) {
        // Connected, but no upcoming class found today
        setResult({
          status: 'unresolved',
          event: null,
          buildingId: null,
          room: null,
          buildingName: null,
          campus: null,
          error: null,
        });
        return;
      }

      setResult({
        status: resolved.status,
        event: resolved.event,
        buildingId: resolved.buildingId,
        room: resolved.room,
        buildingName: resolved.buildingName,
        campus: resolved.campus,
        error: null,
      });
    } catch (e) {
      setResult({
        status: 'error',
        event: null,
        buildingId: null,
        room: null,
        buildingName: null,
        campus: null,
        error: e?.message || 'Failed to load upcoming class',
      });
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Periodic refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { ...result, refresh };
}
