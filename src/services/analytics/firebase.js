import { createFirebaseAnalyticsTransport, setUsabilityAnalyticsTransport } from './usability';

let configurePromise = null;
let setupState = {
  configured: false,
  reason: 'uninitialized',
};

function getErrorMessage(error) {
  if (!error) {
    return 'Firebase Analytics is unavailable';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Firebase Analytics is unavailable';
}

function isExpoGoRuntime() {
  try {
    const constantsModule = require('expo-constants').default;
    return constantsModule?.executionEnvironment === 'storeClient';
  } catch {
    return false;
  }
}

async function configureNativeFirebaseAnalytics() {
  const analyticsModule = require('@react-native-firebase/analytics').default;
  const analytics = analyticsModule();

  if (typeof analytics.setAnalyticsCollectionEnabled === 'function') {
    await analytics.setAnalyticsCollectionEnabled(true);
  }

  setUsabilityAnalyticsTransport(createFirebaseAnalyticsTransport(() => analytics));
  setupState = {
    configured: true,
    reason: null,
  };

  return true;
}

export async function configureFirebaseAnalytics() {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }

  if (!configurePromise) {
    configurePromise = (async () => {
      if (process.env.EXPO_PUBLIC_DISABLE_FIREBASE_ANALYTICS === '1') {
        setupState = {
          configured: false,
          reason: 'Firebase Analytics disabled by environment',
        };
        setUsabilityAnalyticsTransport(null);
        return false;
      }

      if (isExpoGoRuntime()) {
        setupState = {
          configured: false,
          reason: 'Expo Go does not support React Native Firebase Analytics',
        };
        setUsabilityAnalyticsTransport(null);
        return false;
      }

      try {
        return await configureNativeFirebaseAnalytics();
      } catch (error) {
        const message = getErrorMessage(error);

        setupState = {
          configured: false,
          reason: message,
        };
        setUsabilityAnalyticsTransport(null);

        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.info('[analytics] Firebase Analytics unavailable, using fallback transport.', message);
        }

        return false;
      }
    })();
  }

  return configurePromise;
}

export function getFirebaseAnalyticsSetupState() {
  return setupState;
}

export function resetFirebaseAnalyticsForTests() {
  configurePromise = null;
  setupState = {
    configured: false,
    reason: 'uninitialized',
  };
  setUsabilityAnalyticsTransport(null);
}
