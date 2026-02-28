/**
 * Tests for useCalendarAuth hook: connect, disconnect, status, fetchCalendarEvents.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import useCalendarAuth from './useCalendarAuth';

const mockGetClientId = jest.fn();
const mockGetRedirectUri = jest.fn();
const mockGetStoredCredentials = jest.fn();
const mockClearStoredCredentials = jest.fn();
const mockExchangeCodeAndStore = jest.fn();
const mockRunProxyAuthFlow = jest.fn();
const mockFetchCalendarEvents = jest.fn();

jest.mock('../services/calendar/auth', () => ({
  getClientId: (...args) => mockGetClientId(...args),
  getRedirectUri: (...args) => mockGetRedirectUri(...args),
  getStoredCredentials: (...args) => mockGetStoredCredentials(...args),
  clearStoredCredentials: (...args) => mockClearStoredCredentials(...args),
  exchangeCodeAndStore: (...args) => mockExchangeCodeAndStore(...args),
  runProxyAuthFlow: (...args) => mockRunProxyAuthFlow(...args),
  fetchCalendarEvents: (...args) => mockFetchCalendarEvents(...args),
  GOOGLE_DISCOVERY: {},
  CALENDAR_SCOPES: ['https://www.googleapis.com/auth/calendar.events.readonly'],
}));

const mockRequest = { codeVerifier: 'verifier', makeAuthUrlAsync: jest.fn() };
jest.mock('expo-auth-session', () => ({
  useAuthRequest: () => [mockRequest],
}));

describe('useCalendarAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClientId.mockReturnValue('test-client-id');
    mockGetRedirectUri.mockReturnValue('https://auth.expo.io/@test/campus-guide');
    mockGetStoredCredentials.mockResolvedValue(null);
  });

  it('starts with loading then idle when not connected', async () => {
    mockGetStoredCredentials.mockResolvedValue(null);
    const { result } = renderHook(() => useCalendarAuth());
    expect(result.current.status).toBe('loading');
    await waitFor(() => {
      expect(result.current.status).toBe('idle');
    });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isReady).toBe(true);
  });

  it('starts with loading then connected when credentials exist', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
    const { result } = renderHook(() => useCalendarAuth());
    expect(result.current.status).toBe('loading');
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });
    expect(result.current.isConnected).toBe(true);
  });

  it('sets error state when getStoredCredentials throws', async () => {
    mockGetStoredCredentials.mockRejectedValue(new Error('Storage error'));
    const { result } = renderHook(() => useCalendarAuth());
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.errorMessage).toContain('Storage error');
    expect(result.current.isConnected).toBe(false);
  });

  it('connect sets idle when runProxyAuthFlow returns no code', async () => {
    mockRunProxyAuthFlow.mockResolvedValue(null);
    mockGetStoredCredentials.mockResolvedValue(null);
    const { result } = renderHook(() => useCalendarAuth());
    await waitFor(() => expect(result.current.status).toBe('idle'));
    await act(async () => {
      result.current.connect();
    });
    expect(mockRunProxyAuthFlow).toHaveBeenCalledWith(mockRequest);
    await waitFor(() => {
      expect(result.current.status).toBe('idle');
    });
  });

  it('connect sets idle when result has no code in params', async () => {
    mockRunProxyAuthFlow.mockResolvedValue({ url: 'exp://x', params: {} });
    mockGetStoredCredentials.mockResolvedValue(null);
    const { result } = renderHook(() => useCalendarAuth());
    await waitFor(() => expect(result.current.status).toBe('idle'));
    await act(async () => {
      result.current.connect();
    });
    await waitFor(() => {
      expect(result.current.status).toBe('idle');
    });
  });

  it('connect exchanges code and sets connected on success', async () => {
    mockRunProxyAuthFlow.mockResolvedValue({
      url: 'exp://x?code=abc&state=s',
      params: { code: 'abc', state: 's' },
    });
    mockExchangeCodeAndStore.mockResolvedValue(undefined);
    mockGetStoredCredentials.mockResolvedValue(null);
    const { result } = renderHook(() => useCalendarAuth());
    await waitFor(() => expect(result.current.status).toBe('idle'));
    await act(async () => {
      result.current.connect();
    });
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
      expect(result.current.isConnected).toBe(true);
    });
    expect(mockExchangeCodeAndStore).toHaveBeenCalledWith('abc', 'https://auth.expo.io/@test/campus-guide', 'verifier');
  });

  it('connect sets error when codeVerifier is missing', async () => {
    const originalVerifier = mockRequest.codeVerifier;
    mockRequest.codeVerifier = undefined;
    mockRunProxyAuthFlow.mockResolvedValue({
      url: 'exp://x?code=abc',
      params: { code: 'abc' },
    });
    mockGetStoredCredentials.mockResolvedValue(null);
    const { result } = renderHook(() => useCalendarAuth());
    await waitFor(() => expect(result.current.status).toBe('idle'));
    await act(async () => {
      result.current.connect();
    });
    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.errorMessage).toContain('session expired');
    });
    mockRequest.codeVerifier = originalVerifier;
  });

  it('connect sets error when exchangeCodeAndStore throws', async () => {
    mockRunProxyAuthFlow.mockResolvedValue({
      url: 'exp://x?code=abc',
      params: { code: 'abc' },
    });
    mockExchangeCodeAndStore.mockRejectedValue(new Error('Token exchange failed'));
    mockGetStoredCredentials.mockResolvedValue(null);
    const { result } = renderHook(() => useCalendarAuth());
    await waitFor(() => expect(result.current.status).toBe('idle'));
    await act(async () => {
      result.current.connect();
    });
    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.errorMessage).toContain('Token exchange failed');
      expect(result.current.isConnected).toBe(false);
    });
  });

  it('disconnect clears storage and sets idle', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'at' });
    const { result } = renderHook(() => useCalendarAuth());
    await waitFor(() => expect(result.current.isConnected).toBe(true));
    await act(async () => {
      result.current.disconnect();
    });
    expect(mockClearStoredCredentials).toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.status).toBe('idle');
      expect(result.current.isConnected).toBe(false);
    });
  });

  it('disconnect sets error when clearStoredCredentials throws', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'at' });
    const { result } = renderHook(() => useCalendarAuth());
    await waitFor(() => expect(result.current.isConnected).toBe(true));
    mockClearStoredCredentials.mockRejectedValue(new Error('Clear failed'));
    await act(async () => {
      result.current.disconnect();
    });
    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.errorMessage).toContain('Clear failed');
    });
  });

  it('fetchCalendarEvents returns error when not connected', async () => {
    mockGetStoredCredentials.mockResolvedValue(null);
    const { result } = renderHook(() => useCalendarAuth());
    await waitFor(() => expect(result.current.status).toBe('idle'));
    let eventsResult;
    await act(async () => {
      eventsResult = await result.current.fetchCalendarEvents();
    });
    expect(eventsResult).toEqual({ events: [], error: 'Not connected to Google Calendar' });
    expect(mockFetchCalendarEvents).not.toHaveBeenCalled();
  });

  it('fetchCalendarEvents calls API when connected', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
    mockFetchCalendarEvents.mockResolvedValue({ events: [{ id: '1', summary: 'Class' }] });
    const { result } = renderHook(() => useCalendarAuth());
    await waitFor(() => expect(result.current.isConnected).toBe(true));
    let eventsResult;
    await act(async () => {
      eventsResult = await result.current.fetchCalendarEvents({ maxResults: 10 });
    });
    expect(mockFetchCalendarEvents).toHaveBeenCalledWith('at', { maxResults: 10 });
    expect(eventsResult.events).toHaveLength(1);
    expect(eventsResult.events[0].summary).toBe('Class');
  });

  it('isReady is false when getClientId throws', async () => {
    mockGetClientId.mockImplementation(() => {
      throw new Error('Missing config');
    });
    const { result } = renderHook(() => useCalendarAuth());
    await waitFor(() => {
      expect(result.current.isReady).toBe(false);
    });
  });
});
