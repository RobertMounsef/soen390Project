import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import DirectionsPanel from './DirectionsPanel';

const BASE_PROPS = {
  distanceText: '1.2 km',
  durationText: '15 min',
  loading: false,
  error: null,
  onClear: jest.fn(),
  travelMode: 'walking',
  onModeChange: jest.fn(),
};

describe('DirectionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders distance and duration summary', () => {
    render(<DirectionsPanel {...BASE_PROPS} />);
    expect(screen.getByText(/1\.2 km/i)).toBeOnTheScreen();
    expect(screen.getByText('15 min')).toBeOnTheScreen();
  });

  it('calls onClear when the clear button is pressed', () => {
    render(<DirectionsPanel {...BASE_PROPS} />);
    fireEvent.press(screen.getByTestId('Clear route'));
    expect(BASE_PROPS.onClear).toHaveBeenCalledTimes(1);
  });

  it('shows calculating route text when loading', () => {
    render(<DirectionsPanel {...BASE_PROPS} loading={true} />);
    expect(screen.queryByText('1.2 km')).not.toBeOnTheScreen();
    expect(screen.queryByText('15 min')).not.toBeOnTheScreen();
    expect(screen.getByText('Calculating route…')).toBeOnTheScreen();
  });

  it('shows the error text when error is set', () => {
    render(<DirectionsPanel {...BASE_PROPS} error="No route found." />);
    expect(screen.getByText('No route found.')).toBeOnTheScreen();
    expect(screen.queryByText('1.2 km')).not.toBeOnTheScreen();
  });

  it('expands when clicking the summary row and calls onToggleCollapse if controlled', () => {
    const onToggleMock = jest.fn();
    render(<DirectionsPanel {...BASE_PROPS} collapsed={true} onToggleCollapse={onToggleMock} />);

    // Tap the header to expand (where durationText is rendered)
    fireEvent.press(screen.getByText('15 min'));

    expect(onToggleMock).toHaveBeenCalled();
  });

  it('shows travel modes when not collapsed', () => {
    const onToggleMock = jest.fn();
    render(<DirectionsPanel {...BASE_PROPS} collapsed={false} showShuttle={true} onToggleCollapse={onToggleMock} />);

    expect(screen.getByText('Walk')).toBeOnTheScreen();
    expect(screen.getByText('Drive')).toBeOnTheScreen();
    expect(screen.getByText('Transit')).toBeOnTheScreen();
    expect(screen.getByText('Shuttle')).toBeOnTheScreen();

    // Test mode change
    fireEvent.press(screen.getByText('Transit'));
    expect(BASE_PROPS.onModeChange).toHaveBeenCalledWith('transit');
  });

  it('renders appropriate icons based on step instructions', () => {
    const steps = [
      { instruction: 'Turn left onto Main St' },
      { instruction: 'Turn right next' },
      { instruction: 'Slight left ahead' },
      { instruction: 'Slight right' },
      { instruction: 'Make a u-turn' },
      { instruction: 'Enter the roundabout' },
      { instruction: 'Merge onto highway' },
      { instruction: 'Take the ferry' },
      { instruction: 'Take Transit 110' },
      { instruction: 'Arrive at destination' },
      { instruction: 'Go straight' }, // Unmatched defaults to ↑
    ];

    const onToggleMock = jest.fn();
    render(<DirectionsPanel {...BASE_PROPS} collapsed={false} onToggleCollapse={onToggleMock} steps={steps} />);

    // Assert icons are rendered
    expect(screen.getByText('←')).toBeOnTheScreen();
    expect(screen.getByText('→')).toBeOnTheScreen();
    expect(screen.getByText('↖')).toBeOnTheScreen();
    expect(screen.getByText('↗')).toBeOnTheScreen();
    expect(screen.getByText('↩')).toBeOnTheScreen();
    expect(screen.getByText('↻')).toBeOnTheScreen();
    expect(screen.getByText('⤵')).toBeOnTheScreen();
    expect(screen.getByText('⛴')).toBeOnTheScreen();
    expect(screen.queryAllByText('🚌').length).toBeGreaterThan(0);
    expect(screen.getByText('⚑')).toBeOnTheScreen();
    expect(screen.queryAllByText('↑').length).toBeGreaterThan(0);
  });

  it('renders shuttle-specific departure text and last bus badge', () => {
    const steps = [
      {
        instruction: 'Ride shuttle from SGW to LOY',
        isShuttleStep: true,
        isLastBus: true,
        distance: '7.5 km',
        duration: '25 min',
      }
    ];

    render(
      <DirectionsPanel
        {...BASE_PROPS}
        travelMode="shuttle"
        showShuttle={true}
        collapsed={false}
        onToggleCollapse={jest.fn()}
        steps={steps}
        nextDeparture={{ label: '6:30 PM', isLastBus: true }}
      />
    );

    // Shuttle departure summary
    expect(screen.getByText(/Departs 6:30 PM/)).toBeOnTheScreen();
    expect(screen.getAllByText(/last bus/i).length).toBe(2);

    // Step specifics
    expect(screen.getByText('Ride shuttle from SGW to LOY')).toBeOnTheScreen();
    expect(screen.getByText('⛔ Last bus')).toBeOnTheScreen();
  });
});
