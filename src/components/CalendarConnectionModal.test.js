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
});
