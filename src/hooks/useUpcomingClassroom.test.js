import { renderHook, act, waitFor } from '@testing-library/react-native';
import useUpcomingClassroom from './useUpcomingClassroom';
import { resolveNextClassroomEvent } from '../utils/calendarClassLocation';

jest.mock('../utils/calendarClassLocation', () => ({
  resolveNextClassroomEvent: jest.fn(),
}));

jest.mock('../services/calendar/auth', () => ({
  getStoredCredentials: jest.fn(),
  getStoredSelectedCalendarIds: jest.fn(),
  fetchCalendarEvents: jest.fn(),
}));

const authMock = require('../services/calendar/auth');

describe('useUpcomingClassroom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const advanceTimersByTime = async (ms) => {
    act(() => {
      jest.advanceTimersByTime(ms);
    });
  };

  it('initializes with loading status', () => {
    const { result } = renderHook(() => useUpcomingClassroom());
    expect(result.current.status).toBe('loading');
  });

  it('sets idle status when user has no credentials', async () => {
    authMock.getStoredCredentials.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useUpcomingClassroom());

    await waitFor(() => {
      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBe('Connect Google Calendar to automatically find your next classroom.');
    });
  });

  it('sets error status when fetching events fails completely', async () => {
    authMock.getStoredCredentials.mockResolvedValueOnce({ accessToken: 'token' });
    authMock.getStoredSelectedCalendarIds.mockResolvedValueOnce(['primary']);
    authMock.fetchCalendarEvents.mockResolvedValueOnce({ events: [], error: 'Fetch failed' });

    const { result } = renderHook(() => useUpcomingClassroom());

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Fetch failed');
    });
  });

  it('sets error status when throwing an error', async () => {
    authMock.getStoredCredentials.mockRejectedValue(new Error('Auth failed'));
    const { result } = renderHook(() => useUpcomingClassroom());

    await waitFor(() => {
      expect(result.current.status).toBe('error');
      expect(result.current.error).toBe('Auth failed');
    });
  });

  it('sets unresolved status when absolutely no upcoming events exist', async () => {
    authMock.getStoredCredentials.mockResolvedValueOnce({ accessToken: 'token' });
    authMock.getStoredSelectedCalendarIds.mockResolvedValueOnce(['primary']);
    authMock.fetchCalendarEvents.mockResolvedValueOnce({ events: [], error: null });

    resolveNextClassroomEvent.mockReturnValueOnce(null);

    const { result } = renderHook(() => useUpcomingClassroom());

    await waitFor(() => {
      expect(result.current.status).toBe('unresolved');
      expect(result.current.error).toBe('No upcoming class events were found.');
    });
  });

  it('sets unresolved status when class is found but location cannot be determined', async () => {
    authMock.getStoredCredentials.mockResolvedValueOnce({ accessToken: 'token' });
    authMock.getStoredSelectedCalendarIds.mockResolvedValueOnce(['primary']);

    const mockEvents = [{ id: '1', summary: 'Some Class' }];
    authMock.fetchCalendarEvents.mockResolvedValueOnce({ events: mockEvents, error: null });

    resolveNextClassroomEvent.mockReturnValueOnce({
      status: 'unresolved',
      event: mockEvents[0],
      reason: 'Could not figure out location.',
    });

    const { result } = renderHook(() => useUpcomingClassroom());

    await waitFor(() => {
      expect(result.current.status).toBe('unresolved');
      expect(result.current.event).toBe(mockEvents[0]);
      expect(result.current.error).toBe('Could not figure out location.');
    });
  });

  it('sets unresolved status with generic message when class is found but location cannot be determined sans string reason', async () => {
    authMock.getStoredCredentials.mockResolvedValueOnce({ accessToken: 'token' });
    authMock.getStoredSelectedCalendarIds.mockResolvedValueOnce(['primary']);

    const mockEvents = [{ id: '1', summary: 'Some Class' }];
    authMock.fetchCalendarEvents.mockResolvedValueOnce({ events: mockEvents, error: null });

    resolveNextClassroomEvent.mockReturnValueOnce({
      status: 'unresolved',
      event: mockEvents[0],
      reason: { customReason: 'Some random unreadable error object' }
    });

    const { result } = renderHook(() => useUpcomingClassroom());

    await waitFor(() => {
      expect(result.current.status).toBe('unresolved');
      expect(result.current.event).toBe(mockEvents[0]);
      expect(result.current.error).toBe('Class found but classroom location could not be determined.');
    });
  });

  it('sets resolved status when a classroom is accurately identified', async () => {
    authMock.getStoredCredentials.mockResolvedValueOnce({ accessToken: 'token' });
    authMock.getStoredSelectedCalendarIds.mockResolvedValueOnce(['primary']);

    const mockEvents = [{ id: '1', summary: 'SOEN 390' }];
    authMock.fetchCalendarEvents.mockResolvedValueOnce({ events: mockEvents, error: null });

    resolveNextClassroomEvent.mockReturnValueOnce({
      status: 'resolved',
      event: mockEvents[0],
      buildingId: 'H',
      name: 'Hall Building',
      room: '820',
      campus: 'SGW',
    });

    const { result } = renderHook(() => useUpcomingClassroom());

    await waitFor(() => {
      expect(result.current.status).toBe('resolved');
      expect(result.current.event).toBe(mockEvents[0]);
      expect(result.current.buildingId).toBe('H');
      expect(result.current.room).toBe('820');
      expect(result.current.buildingName).toBe('Hall Building');
      expect(result.current.campus).toBe('SGW');
    });
  });

  it('handles periodic refresh', async () => {
    jest.useFakeTimers();

    authMock.getStoredCredentials.mockResolvedValue({ accessToken: 'token' });
    authMock.getStoredSelectedCalendarIds.mockResolvedValue(['primary']);

    const mockEvents = [{ id: '1', summary: 'SOEN 390' }];
    authMock.fetchCalendarEvents.mockResolvedValue({ events: mockEvents, error: null });

    resolveNextClassroomEvent.mockReturnValue({
      status: 'resolved',
      event: mockEvents[0],
      buildingId: 'H',
      name: 'Hall Building',
      room: '820',
      campus: 'SGW',
    });

    const { result } = renderHook(() => useUpcomingClassroom());

    await waitFor(() => {
      expect(result.current.status).toBe('resolved');
    });

    // Assume credentials dropped or something
    authMock.getStoredCredentials.mockResolvedValueOnce(null);

    // Advance by 1 minute
    await advanceTimersByTime(60000);

    await waitFor(() => {
      expect(result.current.status).toBe('idle');
    });

    jest.useRealTimers();
  });
});
