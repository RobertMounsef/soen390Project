import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import IndoorMapViewer from './IndoorMapViewer';

jest.mock('../floor_plans/waypoints/waypointsIndex', () => ({
  getAvailableFloors: jest.fn(() => [{ building: 'VE', floor: 1 }]),
  getFloorGraph: jest.fn(() => ({
    image: 123,
    viewBox: '0 0 249 222',
    nodes: {
      've 101': { id: 've 101', type: 'room', label: 've 101', x: 187, y: 51 },
    },
    edges: [],
  })),
}));

describe('IndoorMapViewer', () => {
  it('renders the PNG floor plan image when visible', () => {
    const { getByTestId } = render(
      <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="VE" />
    );

    expect(getByTestId('indoor-map-image')).toBeTruthy();
  });

  it('shows a pin when a room is selected', () => {
    const { getByText, getByTestId, queryByTestId } = render(
      <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="VE" />
    );

    // Open room list and select the only room
    fireEvent.press(getByText('Select a Room (Optional)'));
    fireEvent.press(getByText('ve 101'));

    expect(getByTestId('indoor-map-marker')).toBeTruthy();

    // Tooltip label was removed; ensure we don't render a separate tooltip element
    expect(queryByTestId('indoor-map-marker-tooltip')).toBeNull();
  });
});

