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
