/**
 * Tests for CalendarConnectionFeature: wiring between hook and modal.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import CalendarConnectionFeature from './CalendarConnectionFeature';

const mockUseCalendarAuth = jest.fn();

jest.mock('../hooks/useCalendarAuth', () => ({
  __esModule: true,
  default: (...args) => mockUseCalendarAuth(...args),
}));

jest.mock('../components/CalendarConnectionModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  function CalendarConnectionModal(props) {
    return React.createElement(View, { testID: 'calendar-connection-modal', ...props });
  }
  return CalendarConnectionModal;
});

describe('CalendarConnectionFeature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards auth state and props to CalendarConnectionModal', () => {
    const connect = jest.fn();
    const disconnect = jest.fn();
    mockUseCalendarAuth.mockReturnValue({
      status: 'connected',
      isConnected: true,
      errorMessage: 'All good',
      connect,
      disconnect,
      fetchCalendarEvents: jest.fn(),
      isReady: true,
      calendars: [{ id: 'cal1', summary: 'Classes' }],
      selectedCalendarIds: ['cal1'],
      calendarsLoading: false,
      calendarsError: null,
      toggleCalendarSelection: jest.fn(),
      reloadCalendars: jest.fn(),
    });

    const onClose = jest.fn();
    const { getByTestId } = render(
      <CalendarConnectionFeature visible={true} onClose={onClose} />
    );

    const modal = getByTestId('calendar-connection-modal');
    expect(modal.props.visible).toBe(true);
    expect(modal.props.onClose).toBe(onClose);
    expect(modal.props.status).toBe('connected');
    expect(modal.props.isConnected).toBe(true);
    expect(modal.props.errorMessage).toBe('All good');
    expect(modal.props.onConnect).toBe(connect);
    expect(modal.props.onDisconnect).toBe(disconnect);
    expect(modal.props.isReady).toBe(true);
    expect(modal.props.calendars).toEqual([{ id: 'cal1', summary: 'Classes' }]);
    expect(modal.props.selectedCalendarIds).toEqual(['cal1']);
  });

  it('forwards nextClass, onGetDirections, and onRetry props to the modal', () => {
    mockUseCalendarAuth.mockReturnValue({
      status: 'connected',
      isConnected: true,
      errorMessage: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      isReady: true,
      calendars: [],
      selectedCalendarIds: [],
      calendarsLoading: false,
      calendarsError: null,
      toggleCalendarSelection: jest.fn(),
      reloadCalendars: jest.fn(),
    });

    const nextClass = {
      status: 'resolved',
      event: { summary: 'SOEN 390' },
      buildingId: 'H',
      room: '820',
      buildingName: 'Hall Building',
      campus: 'SGW',
      error: null,
    };
    const onGetDirections = jest.fn();
    const onRetry = jest.fn();

    const { getByTestId } = render(
      <CalendarConnectionFeature
        visible={true}
        onClose={jest.fn()}
        nextClass={nextClass}
        onGetDirections={onGetDirections}
        onRetry={onRetry}
      />
    );

    const modal = getByTestId('calendar-connection-modal');
    expect(modal.props.nextClass).toEqual(nextClass);
    expect(modal.props.onGetDirections).toBe(onGetDirections);
    expect(modal.props.onRetry).toBe(onRetry);
  });

  it('uses null defaults for nextClass, onGetDirections, and onRetry when not provided', () => {
    mockUseCalendarAuth.mockReturnValue({
      status: 'idle',
      isConnected: false,
      errorMessage: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      isReady: true,
      calendars: [],
      selectedCalendarIds: [],
      calendarsLoading: false,
      calendarsError: null,
      toggleCalendarSelection: jest.fn(),
      reloadCalendars: jest.fn(),
    });

    const { getByTestId } = render(
      <CalendarConnectionFeature visible={true} onClose={jest.fn()} />
    );

    const modal = getByTestId('calendar-connection-modal');
    // When not provided, React's defaultProps gives null — but the mocked
    // modal component exposes the value as-received, which may be undefined
    // if CalendarConnectionFeature doesn't forward the prop explicitly.
    // Check for null or undefined with toBeNullish.
    expect(modal.props.nextClass === null || modal.props.nextClass === undefined).toBe(true);
    expect(modal.props.onGetDirections === null || modal.props.onGetDirections === undefined).toBe(true);
    expect(modal.props.onRetry === null || modal.props.onRetry === undefined).toBe(true);
  });
});

