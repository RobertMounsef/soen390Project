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
const mockFetchCalendarList = jest.fn();
const mockGetStoredSelectedCalendarIds = jest.fn();
const mockStoreSelectedCalendarIds = jest.fn();

jest.mock('../services/calendar/auth', () => ({
  getClientId: (...args) => mockGetClientId(...args),
  getRedirectUri: (...args) => mockGetRedirectUri(...args),
  getStoredCredentials: (...args) => mockGetStoredCredentials(...args),
  clearStoredCredentials: (...args) => mockClearStoredCredentials(...args),
  exchangeCodeAndStore: (...args) => mockExchangeCodeAndStore(...args),
  runProxyAuthFlow: (...args) => mockRunProxyAuthFlow(...args),
  fetchCalendarEvents: (...args) => mockFetchCalendarEvents(...args),
  fetchCalendarList: (...args) => mockFetchCalendarList(...args),
  getStoredSelectedCalendarIds: (...args) => mockGetStoredSelectedCalendarIds(...args),
  storeSelectedCalendarIds: (...args) => mockStoreSelectedCalendarIds(...args),
  GOOGLE_DISCOVERY: {},
  CALENDAR_SCOPES: ['https://www.googleapis.com/auth/calendar.events.readonly'],
}));

const mockRequest = { codeVerifier: 'verifier', makeAuthUrlAsync: jest.fn() };
/** Control what useAuthRequest returns so we can test connect() when request is null */
let mockAuthRequestReturn = mockRequest;
jest.mock('expo-auth-session', () => ({
  useAuthRequest: () => [mockAuthRequestReturn],
}));

describe('useCalendarAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetClientId.mockReturnValue('test-client-id');
    mockGetRedirectUri.mockReturnValue('https://auth.expo.io/@test/campus-guide');
    mockGetStoredCredentials.mockResolvedValue(null);
    mockFetchCalendarList.mockResolvedValue({ calendars: [] });
    mockGetStoredSelectedCalendarIds.mockResolvedValue([]);
    mockStoreSelectedCalendarIds.mockResolvedValue(undefined);
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
    mockFetchCalendarList.mockResolvedValue({
      calendars: [
        { id: 'primary-id', summary: 'Primary', primary: true },
        { id: 'other-id', summary: 'Other' },
      ],
    });
    mockGetStoredSelectedCalendarIds.mockResolvedValue(['primary-id']);
    const { result } = renderHook(() => useCalendarAuth());
    expect(result.current.status).toBe('loading');
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });
    expect(result.current.isConnected).toBe(true);
    expect(result.current.calendars).toHaveLength(2);
    expect(result.current.selectedCalendarIds).toEqual(['primary-id']);
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

  it('uses fallback error message when getStoredCredentials throws without message', async () => {
    mockGetStoredCredentials.mockRejectedValue({});
    const { result } = renderHook(() => useCalendarAuth());
    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.errorMessage).toBe('Failed to check connection');
    expect(result.current.isConnected).toBe(false);
  });

  it('connect sets error when request is null (OAuth not configured)', async () => {
    mockAuthRequestReturn = null;
    mockGetStoredCredentials.mockResolvedValue(null);
    const { result } = renderHook(() => useCalendarAuth());
    await waitFor(() => expect(result.current.status).toBe('idle'));
    await act(async () => {
      result.current.connect();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe(
      'Google OAuth is not configured. Add EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID to .env'
    );
    expect(mockRunProxyAuthFlow).not.toHaveBeenCalled();
    mockAuthRequestReturn = mockRequest;
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

  it('loads calendars and defaults to primary when no stored selection', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'at' });
    mockGetStoredSelectedCalendarIds.mockResolvedValue([]);
    mockFetchCalendarList.mockResolvedValue({
      calendars: [
        { id: 'primary-id', summary: 'Primary', primary: true },
        { id: 'other-id', summary: 'Other' },
      ],
    });

    const { result } = renderHook(() => useCalendarAuth());

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    await waitFor(() => expect(result.current.calendarsLoading).toBe(false));

    expect(result.current.calendars).toHaveLength(2);
    expect(result.current.selectedCalendarIds).toEqual(['primary-id']);
    expect(mockStoreSelectedCalendarIds).toHaveBeenCalledWith(['primary-id']);
  });

  it('sets calendarsError when loading calendars fails', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'at' });
    mockFetchCalendarList.mockRejectedValue(new Error('Network down'));

    const { result } = renderHook(() => useCalendarAuth());

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    await waitFor(() => expect(result.current.calendarsLoading).toBe(false));

    expect(result.current.calendars).toEqual([]);
    expect(result.current.selectedCalendarIds).toEqual([]);
    expect(result.current.calendarsError).toBe('Network down');
  });

  it('sets calendarsError when fetchCalendarList returns error with calendars', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'at' });
    mockGetStoredSelectedCalendarIds.mockResolvedValue(['cal1']);
    mockFetchCalendarList.mockResolvedValue({
      calendars: [{ id: 'cal1', summary: 'My Cal' }],
      error: 'Request had insufficient authentication scopes',
    });

    const { result } = renderHook(() => useCalendarAuth());

    await waitFor(() => expect(result.current.isConnected).toBe(true));
    await waitFor(() => expect(result.current.calendarsLoading).toBe(false));

    expect(result.current.calendars).toHaveLength(1);
    expect(result.current.calendarsError).toBe('Request had insufficient authentication scopes');
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

  it('fetchCalendarEvents falls back to stored selected calendar IDs', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
    mockGetStoredSelectedCalendarIds.mockResolvedValue(['cal-1']);
    mockFetchCalendarEvents.mockResolvedValue({ events: [] });
    const { result } = renderHook(() => useCalendarAuth());

    await waitFor(() => expect(result.current.isConnected).toBe(true));

    await act(async () => {
      await result.current.fetchCalendarEvents();
    });

    expect(mockFetchCalendarEvents).toHaveBeenCalledWith('at', { calendarIds: ['cal-1'] });
  });

  it('toggleCalendarSelection updates selectedCalendarIds and persists', async () => {
    const { result } = renderHook(() => useCalendarAuth());

    await waitFor(() => expect(result.current.status === 'idle' || result.current.status === 'connected').toBe(true));

    await act(async () => {
      await result.current.toggleCalendarSelection('cal-1');
    });

    await waitFor(() => {
      expect(result.current.selectedCalendarIds).toEqual(['cal-1']);
    });
    expect(mockStoreSelectedCalendarIds).toHaveBeenCalledWith(['cal-1']);
  });

  it('toggleCalendarSelection sets calendarsError when persistence fails', async () => {
    mockStoreSelectedCalendarIds.mockRejectedValue(new Error('Storage full'));
    const { result } = renderHook(() => useCalendarAuth());

    await waitFor(() => expect(result.current.status === 'idle' || result.current.status === 'connected').toBe(true));

    await act(async () => {
      result.current.toggleCalendarSelection('cal-1');
    });

    await waitFor(() => {
      expect(result.current.calendarsError).toBe('Storage full');
    });
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

  it('falls back to localhost redirectUri when getRedirectUri throws', async () => {
    mockGetRedirectUri.mockImplementation(() => {
      throw new Error('No redirect');
    });
    const { result } = renderHook(() => useCalendarAuth());
    await waitFor(() => {
      expect(result.current.status === 'idle' || result.current.status === 'connected').toBe(true);
    });
    expect(result.current.fetchCalendarEvents).toBeDefined();
  });
});
