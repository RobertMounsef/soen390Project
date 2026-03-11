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
  id: 'evt1',
  summary: 'SOEN 390',
  location: 'H 820',
  start: { dateTime: new Date(Date.now() + 3_600_000).toISOString() },
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
      name: 'Hall Building',
      campus: 'SGW',
    });

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(result.current.status).toBe('resolved');
    expect(result.current.buildingId).toBe('H');
    expect(result.current.room).toBe('820');
    expect(result.current.buildingName).toBe('Hall Building');
    expect(result.current.campus).toBe('SGW');
  });

  it('sets status to unresolved when next class has no building', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockFetchCalendarEvents.mockResolvedValue({ events: [futureEvent], error: null });
    mockResolveNextClassroomEvent.mockReturnValue({
      status: 'unresolved',
      event: futureEvent,
      reason: 'Could not figure out location.',
    });

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(result.current.status).toBe('unresolved');
    expect(result.current.buildingId).toBeNull();
    expect(result.current.error).toBe('Could not figure out location.');
  });

  it('sets status to unresolved with generic message when reason is not a string', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockFetchCalendarEvents.mockResolvedValue({ events: [futureEvent], error: null });
    mockResolveNextClassroomEvent.mockReturnValue({
      status: 'unresolved',
      event: futureEvent,
      reason: { someObject: true },
    });

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(result.current.status).toBe('unresolved');
    expect(result.current.error).toBe('Class found but classroom location could not be determined.');
  });

  it('sets status to unresolved when resolveNextClassroomEvent returns null', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockFetchCalendarEvents.mockResolvedValue({ events: [], error: null });
    mockResolveNextClassroomEvent.mockReturnValue(null);

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(result.current.status).toBe('unresolved');
    expect(result.current.event).toBeNull();
  });

  it('sets status to error when fetchCalendarEvents returns an error with no events', async () => {
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

  it('sets error to generic string for non-Error exceptions', async () => {
    mockGetStoredCredentials.mockRejectedValue('some string error');

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Failed to read upcoming calendar events.');
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

    // Credentials now available
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockFetchCalendarEvents.mockResolvedValue({ events: [futureEvent], error: null });
    mockResolveNextClassroomEvent.mockReturnValue({
      status: 'resolved',
      event: futureEvent,
      buildingId: 'H',
      room: '820',
      name: 'Hall Building',
      campus: 'SGW',
    });

    await act(async () => { result.current.refresh(); });

    expect(result.current.status).toBe('resolved');
  });

  it('triggers an automatic refresh after 5 minutes', async () => {
    mockGetStoredCredentials.mockResolvedValue(null);

    renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    const callsBefore = mockGetStoredCredentials.mock.calls.length;

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

  it('initializes with loading status before first fetch completes', () => {
    // Don't await so we catch the in-flight state
    mockGetStoredCredentials.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(null), 9999))
    );

    const { result } = renderHook(() => useUpcomingClassroom());
    // Should be loading immediately
    expect(result.current.status).toBe('loading');
  });

  it('ignores fetch error if events are still returned', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockFetchCalendarEvents.mockResolvedValue({ events: [futureEvent], error: 'Some partial error' });
    mockResolveNextClassroomEvent.mockReturnValue({
      status: 'resolved',
      event: futureEvent,
      buildingId: 'H',
      room: '820',
      name: 'Hall Building',
      campus: 'SGW',
    });

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(result.current.status).toBe('resolved');
    expect(result.current.buildingName).toBe('Hall Building');
  });

  it('sets generic error message when fetch error is not a string', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockFetchCalendarEvents.mockResolvedValue({ events: [], error: { code: 500 } });

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Failed to fetch calendar events.');
  });

  it('falls back to buildingName when name is undefined on resolved event', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockFetchCalendarEvents.mockResolvedValue({ events: [futureEvent], error: null });
    mockResolveNextClassroomEvent.mockReturnValue({
      status: 'resolved',
      event: futureEvent,
      buildingId: 'H',
      room: '820',
      buildingName: 'Legacy Building Name',
      campus: 'SGW',
      name: undefined, // this forces the ?? fallback
    });

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(result.current.status).toBe('resolved');
    expect(result.current.buildingName).toBe('Legacy Building Name');
  });

  it('falls back to null when both buildingName and name are undefined', async () => {
    mockGetStoredCredentials.mockResolvedValue({ accessToken: 'tok' });
    mockFetchCalendarEvents.mockResolvedValue({ events: [futureEvent], error: null });
    mockResolveNextClassroomEvent.mockReturnValue({
      status: 'resolved',
      event: futureEvent,
      buildingId: 'H',
      room: '820',
      campus: 'SGW',
      name: undefined,
      buildingName: undefined,
    });

    const { result } = renderHook(() => useUpcomingClassroom());
    await act(async () => { });

    expect(result.current.status).toBe('resolved');
    expect(result.current.buildingName).toBeNull();
  });
});
