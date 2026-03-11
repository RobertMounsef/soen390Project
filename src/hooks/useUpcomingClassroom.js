import { useCallback, useEffect, useState } from 'react';
import { resolveNextClassroomEvent } from '../utils/calendarClassLocation';

// Possible states of the upcoming classroom detection
const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  RESOLVED: 'resolved',
  UNRESOLVED: 'unresolved',
  ERROR: 'error',
};

// Refresh calendar events every minute
const REFRESH_MS = 60 * 1000;

/**
 * @typedef {Object} UpcomingClassroomState
 * @property {'idle' | 'loading' | 'resolved' | 'unresolved' | 'error'} status
 * @property {any | null} event
 * @property {string | null} buildingId
 * @property {string | null} room
 * @property {string | null} buildingName
 * @property {string | null} campus
 * @property {string | null} error
 */

// Hook that reads upcoming Google Calendar events and determines the next classroom
export default function useUpcomingClassroom() {
  /** @type {[UpcomingClassroomState, import('react').Dispatch<import('react').SetStateAction<UpcomingClassroomState>>]} */
  const [state, setState] = useState({
    status: STATUS.LOADING,
    event: null,
    buildingId: null,
    room: null,
    buildingName: null,
    campus: null,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState({
        status: STATUS.LOADING,
        event: null,
        buildingId: null,
        room: null,
        buildingName: null,
        campus: null,
        error: null,
    });

    try {
      // Calendar utilities already used by the app
      const calendarAuth = require('../services/calendar/auth');
      const {
        getStoredCredentials,
        getStoredSelectedCalendarIds,
        fetchCalendarEvents,
      } = calendarAuth;

      const creds = await getStoredCredentials();

      // If the user has not connected Google Calendar yet
      if (!creds?.accessToken) {
        setState({
          status: STATUS.IDLE,
          event: null,
          buildingId: null,
          room: null,
          buildingName: null,
          campus: null,
          error: 'Connect Google Calendar to automatically find your next classroom.',
        });
        return;
      }

      const calendarIds = await getStoredSelectedCalendarIds();

      // Fetch upcoming events from selected calendars
      const { events, error } = await fetchCalendarEvents(creds.accessToken, {
        maxResults: 20,
        calendarIds,
      });

      if (error && (!events || events.length === 0)) {
        setState({
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

      // Determine the next classroom event from the list
      const resolved = resolveNextClassroomEvent(events || [], new Date());

      if (!resolved) {
        setState({
          status: STATUS.UNRESOLVED,
          event: null,
          buildingId: null,
          room: null,
          buildingName: null,
          campus: null,
          error: 'No upcoming class events were found.',
        });
        return;
      }

      if (resolved.status === 'resolved') {
        setState({
          status: STATUS.RESOLVED,
          event: resolved.event,
          buildingId: resolved.buildingId,
          room: resolved.room,
          buildingName: resolved.name,
          campus: resolved.campus,
          error: null,
        });
        return;
      }

      setState({
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
      setState({
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

  // Run detection on mount and refresh periodically
  useEffect(() => {
    refresh();
    const intervalId = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(intervalId);
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}