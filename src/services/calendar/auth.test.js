/**
 * Tests for calendar auth service: redirect URI, proxy URL, token exchange,
 * storage, and fetchCalendarEvents.
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { exchangeCodeAsync, refreshAsync } from 'expo-auth-session';
import {
  getClientId,
  getRedirectUri,
  getAppReturnUri,
  buildProxyStartUrl,
  GOOGLE_DISCOVERY,
  CALENDAR_SCOPES,
  runProxyAuthFlow,
  exchangeCodeAndStore,
  storeTokenResponse,
  getStoredCredentials,
  refreshStoredToken,
  clearStoredCredentials,
  fetchCalendarEvents,
} from './auth';

jest.mock('expo-auth-session', () => ({
  ...jest.requireActual('expo-auth-session'),
  makeRedirectUri: jest.fn(),
  getRedirectUrl: jest.fn(),
  exchangeCodeAsync: jest.fn(),
  refreshAsync: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('calendar auth service', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID = 'test-client-id';
    process.env.EXPO_PUBLIC_EXPO_PROJECT_FULLNAME = '@testuser/campus-guide';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID = 'test-client-id';
    process.env.EXPO_PUBLIC_EXPO_PROJECT_FULLNAME = '@testuser/campus-guide';
  });

  describe('getClientId', () => {
    it('returns client ID when set', () => {
      expect(getClientId()).toBe('test-client-id');
    });

    it('throws when missing', () => {
      delete process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
      expect(() => getClientId()).toThrow('Missing EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID');
    });

    it('throws when placeholder value', () => {
      process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID = 'your_google_oauth_client_id_here';
      expect(() => getClientId()).toThrow('Missing EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID');
    });
  });

  describe('getRedirectUri', () => {
    it('returns proxy URL when EXPO_PUBLIC_EXPO_PROJECT_FULLNAME is set', () => {
      expect(getRedirectUri()).toBe('https://auth.expo.io/@testuser/campus-guide');
    });

    it('falls back to getRedirectUrl when fullName not set', () => {
      delete process.env.EXPO_PUBLIC_EXPO_PROJECT_FULLNAME;
      AuthSession.getRedirectUrl.mockReturnValue('https://auth.expo.io/@fallback/slug');
      expect(getRedirectUri()).toBe('https://auth.expo.io/@fallback/slug');
      expect(AuthSession.getRedirectUrl).toHaveBeenCalled();
    });

    it('throws when fullName not set and getRedirectUrl throws', () => {
      delete process.env.EXPO_PUBLIC_EXPO_PROJECT_FULLNAME;
      AuthSession.getRedirectUrl.mockImplementation(() => {
        throw new Error('No project name');
      });
      expect(() => getRedirectUri()).toThrow('OAuth redirect URI could not be determined');
    });
  });

  describe('getAppReturnUri', () => {
    it('returns makeRedirectUri()', () => {
      AuthSession.makeRedirectUri.mockReturnValue('exp://192.168.1.1:8081');
      expect(getAppReturnUri()).toBe('exp://192.168.1.1:8081');
      expect(AuthSession.makeRedirectUri).toHaveBeenCalled();
    });
  });

  describe('buildProxyStartUrl', () => {
    it('builds URL with authUrl and returnUrl', () => {
      const googleUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=abc';
      const appReturn = 'exp://localhost:8081';
      const url = buildProxyStartUrl(googleUrl, appReturn);
      expect(url).toContain('https://auth.expo.io/@testuser/campus-guide/start?');
      expect(url).toContain('authUrl=');
      expect(url).toContain('returnUrl=');
      const params = new URLSearchParams(url.split('?')[1]);
      expect(params.get('authUrl')).toBe(googleUrl);
      expect(params.get('returnUrl')).toBe(appReturn);
    });
  });

  describe('runProxyAuthFlow', () => {
    it('returns null when openAuthSessionAsync does not return success', async () => {
      const mockRequest = {
        makeAuthUrlAsync: jest.fn().mockResolvedValue('https://accounts.google.com/...'),
      };
      WebBrowser.openAuthSessionAsync.mockResolvedValue({ type: 'dismiss' });
      const result = await runProxyAuthFlow(mockRequest);
      expect(result).toBeNull();
      expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalled();
    });

    it('returns params with code when success URL has query string', async () => {
      const mockRequest = {
        makeAuthUrlAsync: jest.fn().mockResolvedValue('https://accounts.google.com/...'),
      };
      WebBrowser.openAuthSessionAsync.mockResolvedValue({
        type: 'success',
        url: 'exp://localhost?code=abc123&state=xyz',
      });
      const result = await runProxyAuthFlow(mockRequest);
      expect(result).not.toBeNull();
      expect(result.params).toEqual({ code: 'abc123', state: 'xyz' });
      expect(result.url).toBe('exp://localhost?code=abc123&state=xyz');
    });

    it('returns empty params when success URL has no query string', async () => {
      const mockRequest = {
        makeAuthUrlAsync: jest.fn().mockResolvedValue('https://accounts.google.com/...'),
      };
      WebBrowser.openAuthSessionAsync.mockResolvedValue({
        type: 'success',
        url: 'exp://localhost',
      });
      const result = await runProxyAuthFlow(mockRequest);
      expect(result).not.toBeNull();
      expect(result.params).toEqual({});
    });
  });

  describe('exchangeCodeAndStore', () => {
    it('calls exchangeCodeAsync and storeTokenResponse', async () => {
      const tokenResponse = {
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 3600,
        issuedAt: Math.floor(Date.now() / 1000),
      };
      exchangeCodeAsync.mockResolvedValue(tokenResponse);
      await exchangeCodeAndStore('code', 'https://auth.expo.io/foo', 'verifier');
      expect(exchangeCodeAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'test-client-id',
          code: 'code',
          redirectUri: 'https://auth.expo.io/foo',
          extraParams: { code_verifier: 'verifier' },
        }),
        expect.any(Object)
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"accessToken":"at"')
      );
    });
  });

  describe('storeTokenResponse', () => {
    it('serializes token response to SecureStore', async () => {
      const tokenResponse = {
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 3600,
        issuedAt: 12345,
      };
      await storeTokenResponse(tokenResponse);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'google_calendar_token_response',
        JSON.stringify({
          accessToken: 'at',
          refreshToken: 'rt',
          expiresIn: 3600,
          issuedAt: 12345,
        })
      );
    });
  });

  describe('getStoredCredentials', () => {
    it('returns null when nothing stored', async () => {
      SecureStore.getItemAsync.mockResolvedValue(null);
      const result = await getStoredCredentials();
      expect(result).toBeNull();
    });

    it('returns creds when stored and token is fresh', async () => {
      const payload = {
        accessToken: 'at',
        refreshToken: 'rt',
        expiresIn: 3600,
        issuedAt: Math.floor(Date.now() / 1000) - 100,
      };
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(payload));
      const result = await getStoredCredentials();
      expect(result).toEqual({ accessToken: 'at', refreshToken: 'rt' });
    });

    it('calls refreshAsync when token should refresh', async () => {
      const payload = {
        accessToken: 'old_at',
        refreshToken: 'rt',
        expiresIn: 3600,
        issuedAt: Math.floor(Date.now() / 1000) - 4000,
      };
      SecureStore.getItemAsync.mockResolvedValue(JSON.stringify(payload));
      refreshAsync.mockResolvedValue({
        accessToken: 'new_at',
        refreshToken: 'rt',
        expiresIn: 3600,
        issuedAt: Math.floor(Date.now() / 1000),
      });
      const result = await getStoredCredentials();
      expect(refreshAsync).toHaveBeenCalled();
      expect(result).toEqual({ accessToken: 'new_at', refreshToken: 'rt' });
    });

    it('returns null on invalid stored JSON', async () => {
      SecureStore.getItemAsync.mockResolvedValue('not-json');
      const result = await getStoredCredentials();
      expect(result).toBeNull();
    });
  });

  describe('refreshStoredToken', () => {
    it('returns null when no refresh token', async () => {
      const result = await refreshStoredToken(null);
      expect(result).toBeNull();
      expect(refreshAsync).not.toHaveBeenCalled();
    });

    it('calls refreshAsync and storeTokenResponse when refresh token provided', async () => {
      const newToken = {
        accessToken: 'new_at',
        refreshToken: 'rt',
        expiresIn: 3600,
        issuedAt: Math.floor(Date.now() / 1000),
      };
      refreshAsync.mockResolvedValue(newToken);
      const result = await refreshStoredToken('rt');
      expect(refreshAsync).toHaveBeenCalledWith(
        expect.objectContaining({ clientId: 'test-client-id', refreshToken: 'rt' }),
        expect.any(Object)
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalled();
      expect(result).toEqual(newToken);
    });

    it('returns null when refreshAsync throws', async () => {
      refreshAsync.mockRejectedValue(new Error('Invalid refresh token'));
      const result = await refreshStoredToken('rt');
      expect(result).toBeNull();
    });
  });

  describe('clearStoredCredentials', () => {
    it('calls deleteItemAsync', async () => {
      await clearStoredCredentials();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('google_calendar_token_response');
    });
  });

  describe('fetchCalendarEvents', () => {
    it('returns events when API succeeds', async () => {
      const events = [{ id: '1', summary: 'Meeting' }];
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ items: events }),
      });
      const result = await fetchCalendarEvents('access_token');
      expect(result.events).toEqual(events);
      expect(result.error).toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('calendar/v3/calendars/primary/events'),
        expect.objectContaining({
          headers: { Authorization: 'Bearer access_token' },
        })
      );
    });

    it('returns error when API returns non-ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Invalid credentials' } }),
      });
      const result = await fetchCalendarEvents('bad_token');
      expect(result.events).toEqual([]);
      expect(result.error).toBeDefined();
    });

    it('returns error on network failure', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const result = await fetchCalendarEvents('token');
      expect(result.events).toEqual([]);
      expect(result.error).toContain('Network error');
    });

    it('uses options maxResults and timeMin', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [] }) });
      await fetchCalendarEvents('token', { maxResults: 10, timeMin: '2025-01-01T00:00:00.000Z' });
      const url = fetch.mock.calls[0][0];
      expect(url).toContain('maxResults=10');
      expect(url).toContain('timeMin=2025-01-01');
    });
  });

  describe('exports', () => {
    it('GOOGLE_DISCOVERY has required endpoints', () => {
      expect(GOOGLE_DISCOVERY.authorizationEndpoint).toContain('accounts.google.com');
      expect(GOOGLE_DISCOVERY.tokenEndpoint).toContain('oauth2.googleapis.com');
    });

    it('CALENDAR_SCOPES includes readonly scope', () => {
      expect(CALENDAR_SCOPES).toContain('https://www.googleapis.com/auth/calendar.events.readonly');
    });
  });
});
