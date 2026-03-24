const activeSessions = new Map();

const TASK_DEFINITIONS = {
  task_1: 'locate_building',
  task_2: 'outdoor_directions',
  task_3: 'next_class_directions',
  task_4: 'indoor_navigation',
  task_5: 'nearest_poi',
  task_6: 'accessibility_routing',
};

let analyticsTransport = {
  async logEvent(name, params) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // Firebase is not configured in this repo yet, so use a quiet dev fallback.
      console.info(`[analytics] ${name}`, params);
    }
  },
};

function createSessionId(taskId) {
  return `${taskId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
  );
}

async function logEvent(name, params) {
  return analyticsTransport.logEvent(name, sanitizeParams(params));
}

export function setUsabilityAnalyticsTransport(transport) {
  analyticsTransport = transport || analyticsTransport;
}

export function createFirebaseAnalyticsTransport(analyticsFactory) {
  return {
    async logEvent(name, params) {
      return analyticsFactory().logEvent(name, sanitizeParams(params));
    },
  };
}

export function startUsabilityTask({ taskId, ...params }) {
  if (!TASK_DEFINITIONS[taskId]) {
    return null;
  }

  const existing = activeSessions.get(taskId);
  if (existing) {
    return existing.sessionId;
  }

  const sessionId = createSessionId(taskId);
  activeSessions.set(taskId, {
    sessionId,
    startedAt: Date.now(),
  });

  void logEvent('usability_task_started', {
    task_id: taskId,
    task_name: TASK_DEFINITIONS[taskId],
    session_id: sessionId,
    ...params,
  });

  return sessionId;
}

export function trackUsabilityStep({ taskId, ...params }) {
  const session = activeSessions.get(taskId);
  const sessionId = session?.sessionId || startUsabilityTask({ taskId, ...params });

  if (!sessionId) {
    return null;
  }

  void logEvent('usability_task_step', {
    task_id: taskId,
    task_name: TASK_DEFINITIONS[taskId],
    session_id: sessionId,
    ...params,
  });

  return sessionId;
}

export function completeUsabilityTask({ taskId, ...params }) {
  const session = activeSessions.get(taskId);
  if (!session) {
    return null;
  }

  activeSessions.delete(taskId);
  const durationMs = Date.now() - session.startedAt;

  void logEvent('usability_task_completed', {
    task_id: taskId,
    task_name: TASK_DEFINITIONS[taskId],
    session_id: session.sessionId,
    duration_ms: durationMs,
    ...params,
  });

  return session.sessionId;
}

export function failUsabilityTask({ taskId, failureReason, ...params }) {
  const session = activeSessions.get(taskId);
  if (!session) {
    return null;
  }

  activeSessions.delete(taskId);
  const durationMs = Date.now() - session.startedAt;

  void logEvent('usability_task_failed', {
    task_id: taskId,
    task_name: TASK_DEFINITIONS[taskId],
    session_id: session.sessionId,
    duration_ms: durationMs,
    failure_reason: failureReason,
    ...params,
  });

  return session.sessionId;
}

export function resetUsabilityAnalyticsForTests() {
  activeSessions.clear();
}
