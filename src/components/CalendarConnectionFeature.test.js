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
});

