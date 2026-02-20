import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import DirectionsPanel from './DirectionsPanel';

const BASE_PROPS = {
  distanceText: '1.2 km',
  durationText: '15 min',
  loading: false,
  error: null,
  onClear: jest.fn(),
};

describe('DirectionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders distance and duration summary', () => {
    render(<DirectionsPanel {...BASE_PROPS} />);
    expect(screen.getByText('1.2 km')).toBeOnTheScreen();
    expect(screen.getByText('15 min')).toBeOnTheScreen();
  });


  it('calls onClear when the clear button is pressed', () => {
    render(<DirectionsPanel {...BASE_PROPS} />);
    fireEvent.press(screen.getByText('✕ Clear'));
    expect(BASE_PROPS.onClear).toHaveBeenCalledTimes(1);
  });

  it('shows a loading spinner instead of summary when loading', () => {
    render(<DirectionsPanel {...BASE_PROPS} loading={true} />);
    expect(screen.queryByText('1.2 km')).not.toBeOnTheScreen();
    expect(screen.queryByText('15 min')).not.toBeOnTheScreen();
  });

  it('shows the error text when error is set', () => {
    render(<DirectionsPanel {...BASE_PROPS} error="No route found." />);
    expect(screen.getByText('No route found.')).toBeOnTheScreen();
    expect(screen.queryByText('1.2 km')).not.toBeOnTheScreen();
  });

});
