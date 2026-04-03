/**
 * Tests for CalendarConnectionModal: status, Connect/Disconnect, errors, loading.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CalendarConnectionModal from './CalendarConnectionModal';

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  status: 'idle',
  isConnected: false,
  errorMessage: null,
  onConnect: jest.fn(),
  onDisconnect: jest.fn(),
  isReady: true,
  calendars: [],
  selectedCalendarIds: [],
  calendarsLoading: false,
  calendarsError: null,
  onToggleCalendar: jest.fn(),
  onReloadCalendars: jest.fn(),
};

describe('CalendarConnectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with title and status when visible', () => {
    render(<CalendarConnectionModal {...defaultProps} />);
    expect(screen.getByText('Google Calendar')).toBeOnTheScreen();
    expect(screen.getByText('Calendar not connected')).toBeOnTheScreen();
  });

  it('shows Calendar connected when isConnected is true', () => {
    render(<CalendarConnectionModal {...defaultProps} isConnected={true} />);
    expect(screen.getByText('Calendar connected')).toBeOnTheScreen();
  });

  it('shows Connect Google Calendar button when not connected and isReady', () => {
    render(<CalendarConnectionModal {...defaultProps} />);
    expect(screen.getByTestId('calendar-connect')).toBeOnTheScreen();
    expect(screen.getByLabelText('Connect Google Calendar')).toBeOnTheScreen();
  });

  it('shows Disconnect button when connected', () => {
    render(<CalendarConnectionModal {...defaultProps} isConnected={true} />);
    expect(screen.getByTestId('calendar-disconnect')).toBeOnTheScreen();
    expect(screen.getByLabelText('Disconnect calendar')).toBeOnTheScreen();
  });

  it('renders calendar section when connected', () => {
    render(
      <CalendarConnectionModal
        {...defaultProps}
        isConnected={true}
        calendars={[
          { id: 'cal1', summary: 'Classes', primary: true },
          { id: 'cal2', summary: 'Personal' },
        ]}
        selectedCalendarIds={['cal1']}
      />
    );
    expect(screen.getByText('Calendars to use')).toBeOnTheScreen();
    expect(screen.getByText('Classes')).toBeOnTheScreen();
    expect(screen.getByText('Personal')).toBeOnTheScreen();
  });

  it('shows loading and error states for calendars', () => {
    const { rerender } = render(
      <CalendarConnectionModal
        {...defaultProps}
        isConnected={true}
        calendarsLoading={true}
      />
    );
    expect(screen.getByText('Loading calendars…')).toBeOnTheScreen();

    rerender(
      <CalendarConnectionModal
        {...defaultProps}
        isConnected={true}
        calendarsLoading={false}
        calendarsError="Failed to load"
      />
    );
    expect(screen.getByText('Failed to load')).toBeOnTheScreen();
  });

  it('shows empty state when no calendars are available', () => {
    render(
      <CalendarConnectionModal
        {...defaultProps}
        isConnected={true}
        calendars={[]}
        calendarsLoading={false}
      />
    );
    expect(screen.getByText('No calendars found for this account.')).toBeOnTheScreen();
  });

  it('calls onToggleCalendar when a calendar row is pressed', () => {
    const onToggleCalendar = jest.fn();
    render(
      <CalendarConnectionModal
        {...defaultProps}
        isConnected={true}
        calendars={[{ id: 'cal1', summary: 'Classes' }]}
        selectedCalendarIds={[]}
        onToggleCalendar={onToggleCalendar}
      />
    );
    fireEvent.press(screen.getByTestId('calendar-row-first'));
    expect(onToggleCalendar).toHaveBeenCalledWith('cal1');
  });

  it('calls onReloadCalendars when Refresh button is pressed', () => {
    const onReloadCalendars = jest.fn();
    render(
      <CalendarConnectionModal
        {...defaultProps}
        isConnected={true}
        onReloadCalendars={onReloadCalendars}
      />
    );
    fireEvent.press(screen.getByTestId('reload-calendars'));
    expect(onReloadCalendars).toHaveBeenCalledTimes(1);
  });

  it('calls onConnect when Connect button is pressed', () => {
    const onConnect = jest.fn();
    render(<CalendarConnectionModal {...defaultProps} onConnect={onConnect} />);
    fireEvent.press(screen.getByTestId('calendar-connect'));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it('calls onDisconnect when Disconnect button is pressed', () => {
    const onDisconnect = jest.fn();
    render(<CalendarConnectionModal {...defaultProps} isConnected={true} onDisconnect={onDisconnect} />);
    fireEvent.press(screen.getByTestId('calendar-disconnect'));
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    render(<CalendarConnectionModal {...defaultProps} onClose={onClose} />);
    fireEvent.press(screen.getByTestId('calendar-modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows error message when status is error and errorMessage is set', () => {
    render(
      <CalendarConnectionModal
        {...defaultProps}
        status="error"
        errorMessage="Sign-in was cancelled."
      />
    );
    expect(screen.getByText('Sign-in was cancelled.')).toBeOnTheScreen();
  });

  it('shows loading state when status is loading', () => {
    render(<CalendarConnectionModal {...defaultProps} status="loading" />);
    expect(screen.getByText('Please wait…')).toBeOnTheScreen();
  });

  it('shows hint when isReady is false', () => {
    render(<CalendarConnectionModal {...defaultProps} isReady={false} />);
    expect(screen.getByText(/EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID/)).toBeOnTheScreen();
  });

  it('Connect button is disabled when loading', () => {
    render(<CalendarConnectionModal {...defaultProps} status="loading" />);
    const connectBtn = screen.getByTestId('calendar-connect');
    expect(connectBtn.props.accessibilityState?.disabled ?? connectBtn.props.disabled).toBe(true);
  });

  it('Connect button is disabled when not isReady', () => {
    render(<CalendarConnectionModal {...defaultProps} isReady={false} />);
    const connectBtn = screen.getByTestId('calendar-connect');
    expect(connectBtn.props.accessibilityState?.disabled ?? connectBtn.props.disabled).toBe(true);
  });

  it('has correct testID for modal', () => {
    render(<CalendarConnectionModal {...defaultProps} />);
    expect(screen.getByTestId('calendar-connection-modal')).toBeOnTheScreen();
  });

  it('pressing card content does not close modal (stopPropagation)', () => {
    const onClose = jest.fn();
    render(<CalendarConnectionModal {...defaultProps} onClose={onClose} />);
    fireEvent.press(screen.getByTestId('calendar-modal-card'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ─── Next Class Section ──────────────────────────────────────────────────────

describe('CalendarConnectionModal — Next Class section', () => {
  beforeEach(() => jest.clearAllMocks());

  const connectedProps = { ...defaultProps, isConnected: true };

  const resolvedClass = {
    status: 'resolved',
    event: { summary: 'SOEN 390', start: { dateTime: new Date(Date.now() + 3600000).toISOString() } },
    buildingId: 'H',
    room: '820',
    buildingName: 'Hall Building',
    campus: 'SGW',
    error: null,
  };

  const unresolvedClass = {
    status: 'unresolved',
    event: { summary: 'my class', location: '1455 De Maisonneuve', start: { dateTime: new Date(Date.now() + 3600000).toISOString() } },
    buildingId: null,
    room: null,
    buildingName: null,
    campus: null,
    error: null,
  };

  it('shows Next Class section when connected', () => {
    render(<CalendarConnectionModal {...connectedProps} />);
    expect(screen.getByText('📅 Next Class')).toBeOnTheScreen();
  });

  it('hides Next Class section when not connected', () => {
    render(<CalendarConnectionModal {...defaultProps} isConnected={false} />);
    expect(screen.queryByText('📅 Next Class')).toBeNull();
  });

  it('shows "Checking your calendar…" when nextClass is null', () => {
    render(<CalendarConnectionModal {...connectedProps} nextClass={null} />);
    expect(screen.getByText('Checking your calendar…')).toBeOnTheScreen();
  });

  it('shows "Checking your calendar…" when nextClass status is loading', () => {
    render(
      <CalendarConnectionModal
        {...connectedProps}
        nextClass={{ status: 'loading', event: null, buildingId: null, error: null }}
      />
    );
    expect(screen.getByText('Checking your calendar…')).toBeOnTheScreen();
  });

  it('shows "Checking your calendar…" when nextClass status is idle', () => {
    render(
      <CalendarConnectionModal
        {...connectedProps}
        nextClass={{ status: 'idle', event: null, buildingId: null, error: null }}
      />
    );
    expect(screen.getByText('Checking your calendar…')).toBeOnTheScreen();
  });

  it('shows class name, building, and Get Directions button when resolved', () => {
    render(
      <CalendarConnectionModal
        {...connectedProps}
        nextClass={resolvedClass}
      />
    );
    expect(screen.getByText(/SOEN 390/)).toBeOnTheScreen();
    expect(screen.getByText(/Room 820/)).toBeOnTheScreen();
    expect(screen.getByText(/Hall Building/)).toBeOnTheScreen();
    expect(screen.getByTestId('go-to-class-button')).toBeOnTheScreen();
  });

  it('calls onClose and onGetDirections when Get Directions is pressed', () => {
    const onClose = jest.fn();
    const onGetDirections = jest.fn();
    render(
      <CalendarConnectionModal
        {...connectedProps}
        onClose={onClose}
        nextClass={resolvedClass}
        onGetDirections={onGetDirections}
      />
    );
    fireEvent.press(screen.getByTestId('go-to-class-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onGetDirections).toHaveBeenCalledTimes(1);
  });

  it('shows event summary and debug location when unresolved', () => {
    render(
      <CalendarConnectionModal
        {...connectedProps}
        nextClass={unresolvedClass}
      />
    );
    expect(screen.getByText(/"my class" — no building found\./)).toBeOnTheScreen();
    expect(screen.getByText(/1455 De Maisonneuve/)).toBeOnTheScreen();
  });

  it('shows no location warning when event has no location field', () => {
    render(
      <CalendarConnectionModal
        {...connectedProps}
        nextClass={{
          ...unresolvedClass,
          event: { summary: 'my class', start: { dateTime: new Date(Date.now() + 3600000).toISOString() } },
        }}
      />
    );
    expect(screen.getByText(/No location field set/)).toBeOnTheScreen();
  });

  it('shows error message when nextClass status is error', () => {
    render(
      <CalendarConnectionModal
        {...connectedProps}
        nextClass={{ status: 'error', event: null, buildingId: null, error: '401 Unauthorized', room: null, buildingName: null }}
      />
    );
    expect(screen.getByText('401 Unauthorized')).toBeOnTheScreen();
  });

  it('shows fallback error text when error field is empty', () => {
    render(
      <CalendarConnectionModal
        {...connectedProps}
        nextClass={{ status: 'error', event: null, buildingId: null, error: null, room: null, buildingName: null }}
      />
    );
    expect(screen.getByText('Could not load calendar events.')).toBeOnTheScreen();
  });

  it('shows Retry button when nextClass is error and onRetry is provided', () => {
    const onRetry = jest.fn();
    render(
      <CalendarConnectionModal
        {...connectedProps}
        nextClass={{ status: 'error', event: null, buildingId: null, error: 'oops', room: null, buildingName: null }}
        onRetry={onRetry}
      />
    );
    expect(screen.getByTestId('retry-calendar')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('retry-calendar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides Retry button when onRetry is not provided', () => {
    render(
      <CalendarConnectionModal
        {...connectedProps}
        nextClass={{ status: 'error', event: null, buildingId: null, error: 'oops', room: null, buildingName: null }}
      />
    );
    expect(screen.queryByTestId('retry-calendar')).toBeNull();
  });

  it('renders nothing for Next Class if status is unrecognized', () => {
    const { queryByText, queryAllByText } = render(
      <CalendarConnectionModal
        {...connectedProps}
        nextClass={{ status: 'some_weird_unknown_status' }}
      />
    );

    // It should hit the final `return null;` at line 90
    // Header still exists: "📅 Next Class"
    expect(queryAllByText(/Class/i).length).toBeGreaterThan(0);
    expect(queryByText(/no building found/i)).toBeNull();
  });

  it('shows generic "Class" when resolved event has no summary, no room, and no building name', () => {
    const noSummaryClass = {
      ...resolvedClass,
      event: { start: resolvedClass.event.start }, // no summary
      room: null,
      buildingName: null,
      buildingId: 'H',
    };
    render(<CalendarConnectionModal {...connectedProps} nextClass={noSummaryClass} />);
    expect(screen.getByText('Class')).toBeOnTheScreen();
    expect(screen.getByText('H')).toBeOnTheScreen();
  });

  it('shows generic message for unresolved event when there is no summary', () => {
    const noSummaryUnresolved = {
      ...unresolvedClass,
      event: { location: 'Somewhere' }, // no summary
    };
    render(<CalendarConnectionModal {...connectedProps} nextClass={noSummaryUnresolved} />);
    expect(screen.getByText('No upcoming events with a Concordia building location.')).toBeOnTheScreen();
  });

  it('falls back to calendar id when summary is missing', () => {
    render(
      <CalendarConnectionModal
        {...connectedProps}
        calendars={[{ id: 'cal123', primary: true }]} // no summary
      />
    );
    expect(screen.getByText('cal123')).toBeOnTheScreen();
  });
});
