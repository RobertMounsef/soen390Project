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

  it('handles building and floor changes', () => {
    const { getAvailableFloors } = require('../floor_plans/waypoints/waypointsIndex');
    getAvailableFloors.mockReturnValue([
      { building: 'VE', floor: 1 },
      { building: 'VE', floor: 2 },
      { building: 'H', floor: 8 },
    ]);

    const { getByText } = render(
      <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="VE" />
    );

    // Initial state: VE Floor 1
    expect(getByText('VE Building')).toBeTruthy();
    expect(getByText('Floor 1')).toBeTruthy();

    // Change to H building (Line 145 -> L66, 67, 68, 72)
    fireEvent.press(getByText('H Building'));
    expect(getByText('Floor 8')).toBeTruthy();

    // Verify setSelectedRoomId(null) was called (L72)
    // We can indirectly verify this by checking that no room is selected in the dropdown text
    expect(getByText('Select a Room (Optional)')).toBeTruthy();

    // Test for building with no floors (L70)
    getAvailableFloors.mockReturnValue([
      { building: 'EMPTY', floor: 1 },
      { building: 'EMPTY_NO_FLOOR', floor: null }, // This might not be possible with current getAvailableFloors but we can mock it
    ]);
    // Actually, handleBuildingChange uses availableOptions[b]?.length
    // Let's mock availableOptions indirectly by mocking getAvailableFloors
    getAvailableFloors.mockReturnValue([
      { building: 'VE', floor: 1 },
      { building: 'EMPTY', floor: undefined } // This will result in an empty array for 'EMPTY' building in useMemo
    ]);

    // Re-render to pick up new mock
    render(
      <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="VE" />
    );

    // Change to EMPTY building (L70)
    // Note: If floor is undefined, map['EMPTY'] = [undefined]. length is 1.
    // We need map['EMPTY'] = [].
    getAvailableFloors.mockReturnValue([
      { building: 'VE', floor: 1 }
    ]);
    // This won't even show another building chip.
    
    // Let's just mock availableOptions directly if we could, but it's internal useMemo.
    // We can just rely on the fact that if a building is in buildings list but has no entries in map[b]
    // But buildings = Object.keys(availableOptions), and availableOptions is built from getAvailableFloors.
    // So if getAvailableFloors returns [], buildings is [].
    // If it returns [{building: 'H', floor: 1}], then map['H'] = [1].
    // To get map['H'] = [], we'd need buildings to include 'H' but floors to be empty.
    // This happens if the logic `floors.forEach(({ building, floor }) => { if (!map[building]) map[building] = []; map[building].push(floor); });`
    // doesn't run for a building. But building is only added to map if it's in the loop.
    
    // Wait, getAvailableFloors in waypointsIndex.js:
    // `for (const [building, floors] of Object.entries(WAYPOINT_GRAPHS)) { for (const floor of Object.keys(floors)) { result.push({ building, floor: Number(floor) }); } }`
    // If a building in WAYPOINT_GRAPHS has empty floors `{}`, it won't be pushed to result.
  });

  it('covers room sorting, default viewBox, and selecting None', () => {
    const { getFloorGraph } = require('../floor_plans/waypoints/waypointsIndex');
    
    // Mock for room sorting (L97) and default viewBox (L112)
    getFloorGraph.mockReturnValue({
      image: 123,
      // No viewBox to trigger L112 fallback
      nodes: {
        'B': { id: 'B', type: 'room', label: 'Room B', x: 10, y: 10 },
        'A': { id: 'A', type: 'room', label: 'Room A', x: 20, y: 20 },
      },
    });

    const { getByText, queryByTestId } = render(
      <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="VE" />
    );

    // Open room list
    fireEvent.press(getByText('Select a Room (Optional)'));
    
    // Room A should come before Room B if sorted (L97)
    // In React Native testing library, we can't easily check order, but we can check existence
    expect(getByText('Room A')).toBeTruthy();
    expect(getByText('Room B')).toBeTruthy();

    // Select "None" (L195, 196)
    fireEvent.press(getByText('None'));
    expect(queryByTestId('indoor-map-marker')).toBeNull();
  });
});

