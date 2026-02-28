/**
 * Google Calendar OAuth2 and token storage.
 * Handles auth flow, secure token storage, and Calendar API access.
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { exchangeCodeAsync, refreshAsync, TokenResponse } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events.readonly';
const STORAGE_KEYS = {
  TOKEN_RESPONSE: 'google_calendar_token_response',
};

/** Google OAuth2 discovery (authorization + token endpoints). */
export const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export function getClientId() {
  const id = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
  if (!id || id === 'your_google_oauth_client_id_here') {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID in .env');
  }
  return id;
}

/** Optional: Web application OAuth clients require client_secret for token exchange. Do not commit; dev/demo only. */
function getClientSecret() {
  const secret = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_SECRET;
  return secret && secret !== 'your_client_secret_here' ? secret : undefined;
}

/**
 * Redirect URI for OAuth. Must be the Expo Auth proxy (https://auth.expo.io/...)
 * so Google accepts it (Google rejects exp:// and custom schemes for Web OAuth clients).
 *
 * Uses EXPO_PUBLIC_EXPO_PROJECT_FULLNAME from .env when set (e.g. @nicole12341234/campus-guide).
 * Otherwise tries AuthSession.getRedirectUrl() which works when the dev server provides the project name.
 */
export function getRedirectUri() {
  const fullName = process.env.EXPO_PUBLIC_EXPO_PROJECT_FULLNAME;
  if (fullName && fullName.startsWith('@')) {
    return `https://auth.expo.io/${fullName}`;
  }
  try {
    return AuthSession.getRedirectUrl();
  } catch {
    throw new Error(
      'OAuth redirect URI could not be determined. Set EXPO_PUBLIC_EXPO_PROJECT_FULLNAME in .env to your Expo project full name (e.g. @nicole12341234/campus-guide).'
    );
  }
}

/** Scopes for Calendar read-only access. */
export const CALENDAR_SCOPES = [CALENDAR_SCOPE];

/**
 * App deep link so the proxy can redirect back to the app with the code (exp://... in Expo Go).
 */
export function getAppReturnUri() {
  return AuthSession.makeRedirectUri();
}

/**
 * Build the Expo proxy /start URL so the proxy can redirect back to the app after Google OAuth.
 * Without this, auth.expo.io shows "Something went wrong" because it doesn't know where to send the user.
 */
export function buildProxyStartUrl(googleAuthUrl, appReturnUri) {
  const proxyBase = getRedirectUri();
  const params = new URLSearchParams({
    authUrl: googleAuthUrl,
    returnUrl: appReturnUri,
  });
  return `${proxyBase}/start?${params.toString()}`;
}

/**
 * Run the OAuth flow via the proxy /start so the app receives the code back.
 * Returns the redirect URL (exp://...?code=...&state=...) or null on cancel/dismiss.
 * @param {import('expo-auth-session').AuthRequest} authRequest - Loaded request from useAuthRequest
 * @returns {Promise<{ url: string, params: Record<string, string> } | null>}
 */
export async function runProxyAuthFlow(authRequest) {
  const discovery = GOOGLE_DISCOVERY;
  const googleAuthUrl = await authRequest.makeAuthUrlAsync(discovery);
  const appReturnUri = getAppReturnUri();
  const startUrl = buildProxyStartUrl(googleAuthUrl, appReturnUri);
  const result = await WebBrowser.openAuthSessionAsync(startUrl, appReturnUri);
  if (result.type !== 'success' || !result.url) return null;
  const queryStart = result.url.indexOf('?');
  const params = queryStart >= 0
    ? Object.fromEntries(new URLSearchParams(result.url.slice(queryStart)))
    : {};
  return { url: result.url, params };
}

/**
 * Exchange authorization code for tokens and store them securely.
 * @param {string} code - Authorization code from OAuth redirect
 * @param {string} redirectUri - Must match the one used in auth request
 * @param {string} codeVerifier - PKCE code verifier from the AuthRequest
 */
export async function exchangeCodeAndStore(code, redirectUri, codeVerifier) {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const tokenResponse = await exchangeCodeAsync(
    {
      clientId,
      ...(clientSecret && { clientSecret }),
      code,
      redirectUri,
      extraParams: {
        code_verifier: codeVerifier,
      },
    },
    { tokenEndpoint: GOOGLE_DISCOVERY.tokenEndpoint }
  );
  await storeTokenResponse(tokenResponse);
  return tokenResponse;
}

/**
 * Store token response in SecureStore.
 * @param {TokenResponse} tokenResponse
 */
export async function storeTokenResponse(tokenResponse) {
  const payload = {
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken,
    expiresIn: tokenResponse.expiresIn,
    issuedAt: tokenResponse.issuedAt,
  };
  await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN_RESPONSE, JSON.stringify(payload));
}

/**
 * Load stored credentials. Returns null if none or invalid.
 * @returns {Promise<{ accessToken: string, refreshToken?: string } | null>}
 */
export async function getStoredCredentials() {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN_RESPONSE);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    const tokenResponse = new TokenResponse({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      expiresIn: payload.expiresIn,
      issuedAt: payload.issuedAt ?? Math.floor(Date.now() / 1000),
    });
    if (tokenResponse.shouldRefresh()) {
      const refreshed = await refreshStoredToken(payload.refreshToken);
      return refreshed ? { accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken } : null;
    }
    return {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
    };
  } catch {
    return null;
  }
}

/**
 * Refresh access token using stored refresh token.
 * @param {string} refreshToken
 * @returns {Promise<TokenResponse | null>}
 */
export async function refreshStoredToken(refreshToken) {
  if (!refreshToken) return null;
  try {
    const clientId = getClientId();
    const clientSecret = getClientSecret();
    const tokenResponse = await refreshAsync(
      {
        clientId,
        ...(clientSecret && { clientSecret }),
        refreshToken,
      },
      { tokenEndpoint: GOOGLE_DISCOVERY.tokenEndpoint }
    );
    await storeTokenResponse(tokenResponse);
    return tokenResponse;
  } catch {
    return null;
  }
}

/**
 * Clear all stored calendar credentials (disconnect).
 */
export async function clearStoredCredentials() {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN_RESPONSE);
}

/**
 * Fetch upcoming events from the user's primary calendar.
 * @param {string} accessToken - Valid Google access token
 * @param {{ maxResults?: number, timeMin?: string }} options
 * @returns {Promise<{ events: Array, error?: string }>}
 */
export async function fetchCalendarEvents(accessToken, options = {}) {
  const { maxResults = 50, timeMin } = options;
  const timeMinParam = timeMin || new Date().toISOString();
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('maxResults', String(maxResults));
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('timeMin', timeMinParam);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        events: [],
        error: data.error?.message || `Calendar API error: ${res.status}`,
      };
    }
    return {
      events: data.items || [],
    };
  } catch (e) {
    return {
      events: [],
      error: e.message || 'Failed to fetch calendar events',
    };
  }
}
