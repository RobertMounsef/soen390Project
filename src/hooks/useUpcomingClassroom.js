/**
 * Hook: useUpcomingClassroom
 *
 * Fetches Google Calendar events and resolves the next upcoming classroom.
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

// Possible statuses
const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  RESOLVED: 'resolved',
  UNRESOLVED: 'unresolved',
  ERROR: 'error',
};

// Refresh calendar data every 5 minutes
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * @typedef {Object} UpcomingClassroomState
 * @property {'idle' | 'loading' | 'resolved' | 'unresolved' | 'error'} status
 * @property {any | null} event
 * @property {string | null} buildingId
 * @property {string | null} room
 * @property {string | null} buildingName
 * @property {string | null} campus
 * @property {string | null} error
 * @property {Function} refresh
 */

export default function useUpcomingClassroom() {
  const [result, setResult] = useState({
    status: STATUS.IDLE,
    event: null,
    buildingId: null,
    room: null,
    buildingName: null,
    campus: null,
    error: null,
  });

  const refresh = useCallback(async () => {
    setResult((prev) => ({ ...prev, status: STATUS.LOADING, error: null }));

    try {
      const creds = await getStoredCredentials();

      if (!creds?.accessToken) {
        setResult({
          status: STATUS.IDLE,
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

      if (error && (!events || events.length === 0)) {
        setResult({
          status: STATUS.ERROR,
          event: null,
          buildingId: null,
          room: null,
          buildingName: null,
          campus: null,
          error: typeof error === 'string' ? error : 'Failed to fetch calendar events.',
        });
        return;
      }

      const resolved = resolveNextClassroomEvent(events || [], new Date());

      if (!resolved) {
        setResult({
          status: STATUS.UNRESOLVED,
          event: null,
          buildingId: null,
          room: null,
          buildingName: null,
          campus: null,
          error: null,
        });
        return;
      }

      if (resolved.status === 'resolved') {
        setResult({
          status: STATUS.RESOLVED,
          event: resolved.event,
          buildingId: resolved.buildingId,
          room: resolved.room,
          buildingName: resolved.name ?? resolved.buildingName ?? null,
          campus: resolved.campus,
          error: null,
        });
        return;
      }

      // unresolved — event found but building unknown
      setResult({
        status: STATUS.UNRESOLVED,
        event: resolved.event || null,
        buildingId: null,
        room: null,
        buildingName: null,
        campus: null,
        error:
          typeof resolved.reason === 'string'
            ? resolved.reason
            : 'Class found but classroom location could not be determined.',
      });
    } catch (e) {
      setResult({
        status: STATUS.ERROR,
        event: null,
        buildingId: null,
        room: null,
        buildingName: null,
        campus: null,
        error: e instanceof Error ? e.message : 'Failed to read upcoming calendar events.',
      });
    }
  }, []);

  // Initial load + periodic refresh
  useEffect(() => {
    refresh();
    const intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [refresh]);

  return { ...result, refresh };
}
