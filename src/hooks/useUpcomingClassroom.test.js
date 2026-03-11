/**
 * Tests for useUpcomingClassroom hook:
 *  - idle when no credentials stored
 *  - resolved / unresolved based on calendar events
 *  - error state on fetch failure
 *  - exposes a refresh function
 *  - periodic refresh via setInterval
 */

import { renderHook, act } from '@testing-library/react-native';
import useUpcomingClassroom from './useUpcomingClassroom';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetStoredCredentials = jest.fn();
const mockFetchCalendarEvents = jest.fn();
const mockGetStoredSelectedCalendarIds = jest.fn();
const mockResolveNextClassroomEvent = jest.fn();

jest.mock('../services/calendar/auth', () => ({
  getStoredCredentials: (...a) => mockGetStoredCredentials(...a),
  fetchCalendarEvents: (...a) => mockFetchCalendarEvents(...a),
  getStoredSelectedCalendarIds: (...a) => mockGetStoredSelectedCalendarIds(...a),
}));

jest.mock('../utils/calendarClassLocation', () => ({
  resolveNextClassroomEvent: (...a) => mockResolveNextClassroomEvent(...a),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const futureEvent = {
  summary: 'SOEN 390',
  location: 'H 820',
  start: { dateTime: new Date(Date.now() + 3600000).toISOString() },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useUpcomingClassroom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetStoredSelectedCalendarIds.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets status to idle when no credentials are stored', async () => {
    mockGetStoredCredentials.mockResolvedValue(null);

    const { result } = renderHook(() => useUpcomingClassroom());

    await act(async () => { });

    expect(result.current.status).toBe('idle');
    expect(result.current.buildingId).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets status to resolved when a class with a building is found', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockFetchCalendarEvents.mockResolvedValue({ events: [futureEvent], error: null });
    mockResolveNextClassroomEvent.mockReturnValue({
      status: 'resolved',
      event: futureEvent,
      buildingId: 'H',
      room: '820',
      buildingName: 'Hall Building',
      campus: 'SGW',
    });

    const { result } = renderHook(() => useUpcomingClassroom());

    await act(async () => { });

    expect(result.current.status).toBe('resolved');
    expect(result.current.buildingId).toBe('H');
    expect(result.current.room).toBe('820');
    expect(result.current.buildingName).toBe('Hall Building');
  });

  it('sets status to unresolved when next class has no building', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockFetchCalendarEvents.mockResolvedValue({ events: [futureEvent], error: null });
    mockResolveNextClassroomEvent.mockReturnValue({
      status: 'unresolved',
      event: futureEvent,
      buildingId: null,
      room: null,
      buildingName: null,
      campus: null,
    });

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(result.current.status).toBe('unresolved');
    expect(result.current.buildingId).toBeNull();
  });

  it('sets status to unresolved when resolveNextClassroomEvent returns null (no future events)', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockFetchCalendarEvents.mockResolvedValue({ events: [], error: null });
    mockResolveNextClassroomEvent.mockReturnValue(null);

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(result.current.status).toBe('unresolved');
    expect(result.current.event).toBeNull();
  });

  it('sets status to error when fetchCalendarEvents returns an error', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockFetchCalendarEvents.mockResolvedValue({ events: [], error: '401 Unauthorized' });

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('401 Unauthorized');
  });

  it('sets status to error when an exception is thrown', async () => {
    mockGetStoredCredentials.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Network error');
  });

  it('exposes a refresh function', async () => {
    mockGetStoredCredentials.mockResolvedValue(null);

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(typeof result.current.refresh).toBe('function');
  });

  it('calling refresh re-fetches and updates state', async () => {
    mockGetStoredCredentials.mockResolvedValue(null);

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });
    expect(result.current.status).toBe('idle');

    // Now simulate credentials appearing
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockFetchCalendarEvents.mockResolvedValue({ events: [futureEvent], error: null });
    mockResolveNextClassroomEvent.mockReturnValue({
      status: 'resolved',
      event: futureEvent,
      buildingId: 'H',
      room: '820',
      buildingName: 'Hall Building',
      campus: 'SGW',
    });

    await act(async () => {
      result.current.refresh();
    });

    expect(result.current.status).toBe('resolved');
  });

  it('triggers an automatic refresh after 5 minutes', async () => {
    mockGetStoredCredentials.mockResolvedValue(null);
    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    const callsBefore = mockGetStoredCredentials.mock.calls.length;

    // Advance timers by 5 minutes
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(mockGetStoredCredentials.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('passes calendarIds to fetchCalendarEvents when stored', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockGetStoredSelectedCalendarIds.mockResolvedValue(['cal1', 'cal2']);
    mockFetchCalendarEvents.mockResolvedValue({ events: [], error: null });
    mockResolveNextClassroomEvent.mockReturnValue(null);

    renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(mockFetchCalendarEvents).toHaveBeenCalledWith(
      'tok',
      expect.objectContaining({ calendarIds: ['cal1', 'cal2'] })
    );
  });

  it('does not include calendarIds when none are stored', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockGetStoredSelectedCalendarIds.mockResolvedValue([]);
    mockFetchCalendarEvents.mockResolvedValue({ events: [], error: null });
    mockResolveNextClassroomEvent.mockReturnValue(null);

    renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    const callArg = mockFetchCalendarEvents.mock.calls[0][1];
    expect(callArg).not.toHaveProperty('calendarIds');
  });
});
