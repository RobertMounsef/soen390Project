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

  const clientId = useMemo(() => {
    try {
      return getClientId();
    } catch {
      return null;
    }
  }, []);

  const redirectUri = useMemo(() => getRedirectUri(), []);
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

  const checkStoredConnection = useCallback(async () => {
    setStatus(STATUS.LOADING);
    setErrorMessage(null);
    try {
      const creds = await getStoredCredentials();
      setIsConnected(!!creds);
      setStatus(creds ? STATUS.CONNECTED : STATUS.IDLE);
    } catch (e) {
      setErrorMessage(e.message || 'Failed to check connection');
      setStatus(STATUS.ERROR);
      setIsConnected(false);
    }
  }, []);

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
      if (!result || !result.params?.code) {
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
    } catch (e) {
      setErrorMessage(e.message || 'Failed to connect calendar');
      setStatus(STATUS.ERROR);
      setIsConnected(false);
    }
  }, [request, redirectUri]);

  const disconnect = useCallback(async () => {
    setStatus(STATUS.LOADING);
    setErrorMessage(null);
    try {
      await clearStoredCredentials();
      setIsConnected(false);
      setStatus(STATUS.IDLE);
    } catch (e) {
      setErrorMessage(e.message || 'Failed to disconnect');
      setStatus(STATUS.ERROR);
    }
  }, []);

  const fetchCalendarEvents = useCallback(async (options = {}) => {
    const creds = await getStoredCredentials();
    if (!creds) return { events: [], error: 'Not connected to Google Calendar' };
    return fetchEventsApi(creds.accessToken, options);
  }, []);

  return {
    status,
    isConnected,
    errorMessage,
    connect,
    disconnect,
    fetchCalendarEvents,
    isReady: !!clientId,
  };
}
