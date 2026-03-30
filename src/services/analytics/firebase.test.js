describe('firebase analytics setup', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('configures the usability transport when native analytics is available', async () => {
    const setAnalyticsCollectionEnabled = jest.fn(() => Promise.resolve());
    const logEvent = jest.fn(() => Promise.resolve());

    jest.doMock('@react-native-firebase/analytics', () => ({
      __esModule: true,
      default: jest.fn(() => ({
        setAnalyticsCollectionEnabled,
        logEvent,
      })),
    }), { virtual: true });

    const analytics = require('./firebase');
    const usability = require('./usability');
    analytics.resetFirebaseAnalyticsForTests();

    const configured = await analytics.configureFirebaseAnalytics();
    usability.startUsabilityTask({ taskId: 'task_1', campus: 'SGW' });

    expect(configured).toBe(true);
    expect(setAnalyticsCollectionEnabled).toHaveBeenCalledWith(true);
    expect(logEvent).toHaveBeenCalledWith(
      'usability_task_started',
      expect.objectContaining({ task_id: 'task_1', campus: 'SGW' }),
    );
    expect(analytics.getFirebaseAnalyticsSetupState()).toEqual({
      configured: true,
      reason: null,
    });
  });

  it('falls back cleanly when the native analytics module is unavailable', async () => {
    const consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    const previousNodeEnv = process.env.NODE_ENV;
    const previousDev = global.__DEV__;

    process.env.NODE_ENV = 'development';
    global.__DEV__ = true;

    jest.doMock('@react-native-firebase/analytics', () => {
      throw new Error('native module missing');
    }, { virtual: true });

    const analytics = require('./firebase');
    analytics.resetFirebaseAnalyticsForTests();

    const configured = await analytics.configureFirebaseAnalytics();

    expect(configured).toBe(false);
    expect(analytics.getFirebaseAnalyticsSetupState()).toEqual({
      configured: false,
      reason: 'native module missing',
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      '[analytics] Firebase Analytics unavailable, using fallback transport.',
      'native module missing',
    );

    process.env.NODE_ENV = previousNodeEnv;
    global.__DEV__ = previousDev;
    consoleSpy.mockRestore();
  });
});
