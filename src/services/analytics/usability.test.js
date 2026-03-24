import {
  completeUsabilityTask,
  createFirebaseAnalyticsTransport,
  failUsabilityTask,
  resetUsabilityAnalyticsForTests,
  setUsabilityAnalyticsTransport,
  startUsabilityTask,
  trackUsabilityStep,
} from './usability';

describe('usability analytics', () => {
  const logEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    resetUsabilityAnalyticsForTests();
    setUsabilityAnalyticsTransport({ logEvent });
  });

  it('starts and completes a task with a shared session id', () => {
    const sessionId = startUsabilityTask({
      taskId: 'task_1',
      campus: 'SGW',
    });

    trackUsabilityStep({
      taskId: 'task_1',
      step_name: 'select_building',
    });

    completeUsabilityTask({
      taskId: 'task_1',
      campus: 'SGW',
    });

    expect(sessionId).toBeTruthy();
    expect(logEvent).toHaveBeenNthCalledWith(1, 'usability_task_started', expect.objectContaining({
      task_id: 'task_1',
      session_id: sessionId,
    }));
    expect(logEvent).toHaveBeenNthCalledWith(2, 'usability_task_step', expect.objectContaining({
      task_id: 'task_1',
      session_id: sessionId,
      step_name: 'select_building',
    }));
    expect(logEvent).toHaveBeenNthCalledWith(3, 'usability_task_completed', expect.objectContaining({
      task_id: 'task_1',
      session_id: sessionId,
    }));
  });

  it('fails an active task with a failure reason', () => {
    startUsabilityTask({ taskId: 'task_3' });
    failUsabilityTask({
      taskId: 'task_3',
      failureReason: 'modal_closed',
    });

    expect(logEvent).toHaveBeenLastCalledWith('usability_task_failed', expect.objectContaining({
      task_id: 'task_3',
      failure_reason: 'modal_closed',
    }));
  });

  it('creates a firebase-compatible transport', async () => {
    const analyticsFactory = jest.fn(() => ({ logEvent }));
    const transport = createFirebaseAnalyticsTransport(analyticsFactory);

    await transport.logEvent('usability_task_started', { task_id: 'task_1', unknown: null });

    expect(analyticsFactory).toHaveBeenCalled();
    expect(logEvent).toHaveBeenCalledWith('usability_task_started', { task_id: 'task_1' });
  });

  it('returns null for unknown task ids', () => {
    expect(startUsabilityTask({ taskId: 'task_unknown' })).toBeNull();
    expect(trackUsabilityStep({ taskId: 'task_unknown', step_name: 'noop' })).toBeNull();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it('returns null when completing or failing a task that never started', () => {
    expect(completeUsabilityTask({ taskId: 'task_5' })).toBeNull();
    expect(failUsabilityTask({ taskId: 'task_5', failureReason: 'missing_session' })).toBeNull();
    expect(logEvent).not.toHaveBeenCalled();
  });
});
