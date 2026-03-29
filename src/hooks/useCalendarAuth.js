/**
 * Hook for Google Calendar connection: connect, disconnect, status, and errors.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthRequest } from 'expo-auth-session';
import {
  getRedirectUri,
  GOOGLE_DISCOVERY,
  CALENDAR_SCOPES,
  getClientId,
  exchangeCodeAndStore,
  getStoredCredentials,
  clearStoredCredentials,
  fetchCalendarEvents as fetchEventsApi,
  runProxyAuthFlow,
  fetchCalendarList,
  getStoredSelectedCalendarIds,
  storeSelectedCalendarIds,
} from '../services/calendar/auth';

const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  CONNECTED: 'connected',
  ERROR: 'error',
};

export default function useCalendarAuth() {
  const [status, setStatus] = useState(STATUS.LOADING);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState([]);
  const [calendarsLoading, setCalendarsLoading] = useState(false);
  const [calendarsError, setCalendarsError] = useState(null);

  const clientId = useMemo(() => {
    try {
      return getClientId();
    } catch {
      return null;
    }
  }, []);

  const redirectUri = useMemo(() => {
    try {
      return getRedirectUri();
    } catch {
      return 'https://localhost';
    }
  }, []);
  const authConfig = useMemo(
    () =>
      clientId
        ? {
            clientId,
            redirectUri,
            scopes: CALENDAR_SCOPES,
            responseType: 'code',
            usePKCE: true,
          }
        : {
            clientId: 'placeholder',
            redirectUri: 'https://localhost',
            scopes: [],
            responseType: 'code',
            usePKCE: true,
          },
    [clientId, redirectUri]
  );

  const [request] = useAuthRequest(authConfig, GOOGLE_DISCOVERY);

  const loadCalendars = useCallback(async () => {
    setCalendarsLoading(true);
    setCalendarsError(null);
    try {
      const creds = await getStoredCredentials();
      if (!creds) {
        setCalendars([]);
        setSelectedCalendarIds([]);
        setCalendarsLoading(false);
        return;
      }

      const [storedIds, listResult] = await Promise.all([
        getStoredSelectedCalendarIds(),
        fetchCalendarList(creds.accessToken),
      ]);

      const calendarsFromApi = listResult.calendars || [];
      let effectiveSelectedIds = Array.isArray(storedIds) ? storedIds : [];

      // When user has never chosen calendars, default to primary (or first) calendar.
      if (effectiveSelectedIds.length === 0 && calendarsFromApi.length > 0) {
        const primary = calendarsFromApi.find((c) => c.primary);
        const fallbackId = (primary || calendarsFromApi[0]).id;
        effectiveSelectedIds = [fallbackId];
        await storeSelectedCalendarIds(effectiveSelectedIds);
      }

      setCalendars(calendarsFromApi);
      setSelectedCalendarIds(effectiveSelectedIds);

      if (listResult.error) {
        setCalendarsError(listResult.error);
      }
    } catch (e) {
      setCalendars([]);
      setSelectedCalendarIds([]);
      setCalendarsError(e.message || 'Failed to load calendars');
    } finally {
      setCalendarsLoading(false);
    }
  }, []);

  const checkStoredConnection = useCallback(async () => {
    setStatus(STATUS.LOADING);
    setErrorMessage(null);
    try {
      const creds = await getStoredCredentials();
      setIsConnected(!!creds);
      setStatus(creds ? STATUS.CONNECTED : STATUS.IDLE);
      if (creds) {
        await loadCalendars();
      } else {
        setCalendars([]);
        setSelectedCalendarIds([]);
      }
    } catch (e) {
      setErrorMessage(e.message || 'Failed to check connection');
      setStatus(STATUS.ERROR);
      setIsConnected(false);
      setCalendars([]);
      setSelectedCalendarIds([]);
    }
  }, [loadCalendars]);

  useEffect(() => {
    checkStoredConnection();
  }, [checkStoredConnection]);

  const connect = useCallback(async () => {
    if (!request) {
      setErrorMessage('Google OAuth is not configured. Add EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID to .env');
      setStatus(STATUS.ERROR);
      return;
    }
    setErrorMessage(null);
    setStatus(STATUS.LOADING);
    try {
      const result = await runProxyAuthFlow(request);
      if (!result?.params?.code) {
        setStatus(STATUS.IDLE);
        return;
      }
      const { code } = result.params;
      const codeVerifier = request.codeVerifier;
      if (!codeVerifier) {
        setErrorMessage('Authentication session expired. Please try again.');
        setStatus(STATUS.ERROR);
        return;
      }
      await exchangeCodeAndStore(code, redirectUri, codeVerifier);
      setIsConnected(true);
      setStatus(STATUS.CONNECTED);
      setErrorMessage(null);
      await loadCalendars();
    } catch (e) {
      setErrorMessage(e.message || 'Failed to connect calendar');
      setStatus(STATUS.ERROR);
      setIsConnected(false);
    }
  }, [request, redirectUri, loadCalendars]);

  const disconnect = useCallback(async () => {
    setStatus(STATUS.LOADING);
    setErrorMessage(null);
    try {
      await clearStoredCredentials();
      setIsConnected(false);
      setStatus(STATUS.IDLE);
      setCalendars([]);
      setSelectedCalendarIds([]);
      setCalendarsError(null);
      setCalendarsLoading(false);
    } catch (e) {
      setErrorMessage(e.message || 'Failed to disconnect');
      setStatus(STATUS.ERROR);
    }
  }, []);

  const fetchCalendarEvents = useCallback(async (options = {}) => {
    const creds = await getStoredCredentials();
    if (!creds) return { events: [], error: 'Not connected to Google Calendar' };
    let finalOptions = options;
    if (!options.calendarIds || options.calendarIds.length === 0) {
      const storedIds = await getStoredSelectedCalendarIds();
      if (Array.isArray(storedIds) && storedIds.length > 0) {
        finalOptions = { ...options, calendarIds: storedIds };
      }
    }
    return fetchEventsApi(creds.accessToken, finalOptions);
  }, []);

  const toggleCalendarSelection = useCallback(async (calendarId) => {
    if (!calendarId) return;
    setSelectedCalendarIds((prev) => {
      const exists = prev.includes(calendarId);
      const next = exists ? prev.filter((id) => id !== calendarId) : [...prev, calendarId];
      storeSelectedCalendarIds(next).catch((err) => {
        setCalendarsError(err?.message || 'Failed to save calendar selection');
      });
      return next;
    });
  }, []);

  return {
    status,
    isConnected,
    errorMessage,
    connect,
    disconnect,
    fetchCalendarEvents,
    isReady: !!clientId,
    calendars,
    selectedCalendarIds,
    calendarsLoading,
    calendarsError,
    reloadCalendars: loadCalendars,
    toggleCalendarSelection,
  };
}
