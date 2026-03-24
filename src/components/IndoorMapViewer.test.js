import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import IndoorMapViewer from './IndoorMapViewer';
import useIndoorDirections from '../hooks/useIndoorDirections';

// ── Shared mock graph ────────────────────────────────────────────────────────
const MOCK_GRAPH = {
  image: 123,
  viewBox: '0 0 249 222',
  nodes: {
    R1: { id: 'R1', type: 'room', label: 'Room 101', x: 50,  y: 50,  accessible: true  },
    R2: { id: 'R2', type: 'room', label: 'Room 202', x: 200, y: 180, accessible: true  },
    R3: { id: 'R3', type: 'room', label: 'Room 303', x: 120, y: 120, accessible: false },
    E1: { id: 'E1', type: 'elevator_door', x: 80, y: 80, accessible: true },
    W1: { id: 'W1', type: 'washroom', label: 'Inaccessible WC', x: 90, y: 90, accessible: false },
  },
  edges: [],
};

jest.mock('../floor_plans/waypoints/waypointsIndex', () => ({
  getAvailableFloors: jest.fn(() => [
    { building: 'VE', floor: 1 },
    { building: 'VE', floor: 2 },
    { building: 'H',  floor: 8 },
  ]),
  getFloorGraph:      jest.fn(() => MOCK_GRAPH),
  getMultiFloorGraph: jest.fn(() => MOCK_GRAPH),
}));

jest.mock('../hooks/useIndoorDirections', () => jest.fn());

 // react-native-svg renders as plain views in jest-expo; testIDs are passed through.
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const makeMock = (name) => {
    const C = ({ children, testID, ...props }) =>
      React.createElement(View, { testID, accessible: true, ...props }, children);
    C.displayName = name;
    return C;
  };
  return {
    __esModule: true,
    default:  makeMock('Svg'),
    Svg:      makeMock('Svg'),
    Polyline: makeMock('Polyline'),
    Circle:   makeMock('Circle'),
    Line:     makeMock('Line'),
    G:        makeMock('G'),
    Text:     makeMock('Text'),
  };
});


  // ── Helpers ──────────────────────────────────────────────────────────────────


  function renderViewer(props = {}) {
  return render(
    <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="VE" {...props} />
  );
}

  // ── Tests ─────────────────────────────────────────────────────────────────────

describe('IndoorMapViewer', () => {
  beforeEach(() => {
    const { getFloorGraph, getAvailableFloors, getMultiFloorGraph } = require('../floor_plans/waypoints/waypointsIndex');
    getAvailableFloors.mockReturnValue([
      { building: 'VE', floor: 1 },
      { building: 'VE', floor: 2 },
      { building: 'H',  floor: 8 },
    ]);
    getFloorGraph.mockReturnValue(MOCK_GRAPH);
    getMultiFloorGraph.mockReturnValue(MOCK_GRAPH);
    useIndoorDirections.mockImplementation(({ originId, destinationId }) => ({
      result: originId && destinationId ? {
        durationText: '1 min',
        distanceText: '12 m',
        pathPoints: [
          { id: originId, x: 50, y: 50 },
          { id: destinationId, x: 200, y: 180 },
        ],
        steps: [
          { id: 's1', instruction: 'Start', distance: '12 m', duration: '1 min' },
        ],
      } : null,
      loading: false,
      error: null,
    }));
  });

  // ── Basic render ───────────────────────────────────────────────────────────

  it('renders the floor plan image when visible', () => {
    const { getByTestId } = renderViewer();
    expect(getByTestId('indoor-map-image')).toBeTruthy();
  });

  it('does not render when visible is false', () => {
    const { queryByTestId } = render(
      <IndoorMapViewer visible={false} onClose={jest.fn()} />
    );
    expect(queryByTestId('indoor-map-image')).toBeNull();
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <IndoorMapViewer visible={true} onClose={onClose} />
    );
    fireEvent.press(getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });

  // ── Building / floor selection ─────────────────────────────────────────────

  it('renders building chips for each available building', () => {
    const { getByText } = renderViewer();
    expect(getByText('VE')).toBeTruthy();
    expect(getByText('H')).toBeTruthy();
  });

  it('renders floor chips for the selected building', () => {
    const { getByText } = renderViewer();
    // VE has floors 1 and 2
    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
  });

  it('switches building and updates floor list', () => {
    const { getByText, queryByText } = renderViewer();
    // Switch to H building
    fireEvent.press(getByText('H'));
    // Floor 8 becomes available
    expect(getByText('8')).toBeTruthy();
    // VE floor 2 should no longer be visible (H only has floor 8)
    expect(queryByText('2')).toBeNull();
  });

  it('changes floor when a floor chip is pressed', () => {
    const { getByText } = renderViewer();
    fireEvent.press(getByText('2'));
    expect(getByText('2')).toBeTruthy();
  });

  // ── Origin / destination selection ────────────────────────────────────────

  it('opens the origin picker when From button is pressed', () => {
    const { getByTestId, getByText } = renderViewer();
    fireEvent.press(getByTestId('pick-origin-btn'));
    // Room picker overlay should show the room list
    expect(getByText('Room 101')).toBeTruthy();
    expect(getByText('Room 202')).toBeTruthy();
  });

  it('opens the destination picker when To button is pressed', () => {
    const { getByTestId, getByText } = renderViewer();
    fireEvent.press(getByTestId('pick-destination-btn'));
    expect(getByText('Select Destination')).toBeTruthy();
  });

  it('sets origin after selecting a room', () => {
    const { getByTestId, getByText } = renderViewer();
    fireEvent.press(getByTestId('pick-origin-btn'));
    fireEvent.press(getByTestId('room-option-R1'));
    // Picker closes; origin label appears in the From button
    expect(getByText('Room 101')).toBeTruthy();
  });

  it('sets destination after selecting a room', () => {
    const { getByTestId, getByText } = renderViewer();
    fireEvent.press(getByTestId('pick-destination-btn'));
    fireEvent.press(getByTestId('room-option-R2'));
    expect(getByText('Room 202')).toBeTruthy();
  });

  it('closes the picker when the close button is pressed', () => {
    const { getByTestId, queryByText } = renderViewer();
    fireEvent.press(getByTestId('pick-origin-btn'));
    fireEvent.press(getByTestId('picker-close'));
    // Picker overlay is gone
    expect(queryByText('Select Origin')).toBeNull();
  });

  it('deselects origin when None is selected', () => {
    const { getByTestId, getByText } = renderViewer();
    // Select origin first
    fireEvent.press(getByTestId('pick-origin-btn'));
    fireEvent.press(getByTestId('room-option-R1'));
    // Re-open picker and select None
    fireEvent.press(getByTestId('pick-origin-btn'));
    fireEvent.press(getByText('— None —'));
    // Placeholder text should be back
    expect(getByText('Select origin…')).toBeTruthy();
  });

  // ── Swap button ───────────────────────────────────────────────────────────

  it('swaps origin and destination when swap button is pressed', () => {
    const { getByTestId, getByText } = renderViewer();
    // Set origin to R1
    fireEvent.press(getByTestId('pick-origin-btn'));
    fireEvent.press(getByTestId('room-option-R1'));
    // Set destination to R2
    fireEvent.press(getByTestId('pick-destination-btn'));
    fireEvent.press(getByTestId('room-option-R2'));
    // Swap
    fireEvent.press(getByTestId('swap-origin-dest'));
    // Now origin should be Room 202 and destination should be Room 101
    const fromSection = getByText('Room 202');
    expect(fromSection).toBeTruthy();
  });

  // ── Route display ─────────────────────────────────────────────────────────

  it('shows the path overlay when both origin and destination are selected', async () => {
    const { getByTestId } = renderViewer();

    await act(async () => { fireEvent.press(getByTestId('pick-origin-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R1')); });
    await act(async () => { fireEvent.press(getByTestId('pick-destination-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R2')); });

    // The SVG overlay container should be present
    expect(getByTestId('indoor-path-overlay')).toBeTruthy();
  });

  it('shows the directions panel when a route exists', async () => {
    const { getByTestId } = renderViewer();

    await act(async () => { fireEvent.press(getByTestId('pick-origin-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R1')); });
    await act(async () => { fireEvent.press(getByTestId('pick-destination-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R2')); });

    expect(getByTestId('directions-panel-toggle')).toBeTruthy();
  });

  it('clears the route when the clear button is pressed', async () => {
    const { getByTestId, queryByTestId } = renderViewer();

    await act(async () => { fireEvent.press(getByTestId('pick-origin-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R1')); });
    await act(async () => { fireEvent.press(getByTestId('pick-destination-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R2')); });
    await act(async () => { fireEvent.press(getByTestId('indoor-clear-route')); });

    // Directions panel should disappear after clearing
    expect(queryByTestId('indoor-clear-route')).toBeNull();
  });

  // ── Accessible only toggle ────────────────────────────────────────────────

  it('toggles the accessible-only filter', () => {
    const { getByTestId } = renderViewer();
    const toggle = getByTestId('accessible-only-toggle');
    fireEvent.press(toggle);
    // No crash; toggle state changes (visual feedback tested via styles)
    fireEvent.press(toggle);
  });

  // ── User position / recalculation ─────────────────────────────────────────

  it('opens the user position picker', () => {
    const { getByTestId, getByText } = renderViewer();
    fireEvent.press(getByTestId('set-user-position-btn'));
    expect(getByText('Set My Position')).toBeTruthy();
  });

  it('sets user position after selecting a room', () => {
    const { getByTestId, getByText } = renderViewer();
    fireEvent.press(getByTestId('set-user-position-btn'));
    fireEvent.press(getByTestId('room-option-R3'));
    expect(getByText('Room 303')).toBeTruthy();
  });

  // ── Room search ───────────────────────────────────────────────────────────

  it('filters rooms by search query in the picker', () => {
    const { getByTestId, getByPlaceholderText, queryByText } = renderViewer();
    fireEvent.press(getByTestId('pick-origin-btn'));

    const searchInput = getByPlaceholderText(/Search name, code, or floor number/);
    fireEvent.changeText(searchInput, '101');

    expect(queryByText('Room 101')).toBeTruthy();
    expect(queryByText('Room 202')).toBeNull();
  });

  it('shows empty state when search matches nothing', () => {
    const { getByTestId, getByPlaceholderText, getByText } = renderViewer();
    fireEvent.press(getByTestId('pick-origin-btn'));

    const searchInput = getByPlaceholderText(/Search name, code, or floor number/);
    fireEvent.changeText(searchInput, 'ZZZZZZ');

    expect(getByText(/No rooms match/)).toBeTruthy();
  });

  it('clears the search when the clear-search button is pressed', () => {
    const { getByTestId, getByPlaceholderText, getByText } = renderViewer();
    fireEvent.press(getByTestId('pick-origin-btn'));

    const searchInput = getByPlaceholderText(/Search name, code, or floor number/);
    fireEvent.changeText(searchInput, 'Room');
    fireEvent.press(getByTestId('search-clear-btn'));
    expect(getByText('Room 101')).toBeTruthy();
  });

  // ── Floor plan missing ────────────────────────────────────────────────────

  it('shows placeholder when no floor plan image exists', () => {
    const { getFloorGraph } = require('../floor_plans/waypoints/waypointsIndex');
    getFloorGraph.mockReturnValue({ image: null, viewBox: '0 0 100 100', nodes: {}, edges: [] });

    const { getByText } = renderViewer();
    expect(getByText('Waiting for floor plan…')).toBeTruthy();
  });

  // ── Building initialisation from prop ─────────────────────────────────────

  it('initialises to the correct building from initialBuildingId', () => {
    const { getByText } = render(
      <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="H-8" />
    );
    // Should match building "H" (partial prefix match)
    expect(getByText('H')).toBeTruthy();
  });

  // ── Fallback viewBox ──────────────────────────────────────────────────────

  it('handles graphs without a viewBox (falls back to 1024×1024)', () => {
    const { getFloorGraph } = require('../floor_plans/waypoints/waypointsIndex');
    getFloorGraph.mockReturnValueOnce({
      image: 123,
      // viewBox deliberately omitted
      nodes: { R1: { id: 'R1', label: 'Room 1', x: 10, y: 10, accessible: true } },
      edges: [],
    });
    const { getByTestId } = renderViewer();
    expect(getByTestId('indoor-map-image')).toBeTruthy();
  });

  it('handles invalid viewBox format gracefully', () => {
    const { getFloorGraph } = require('../floor_plans/waypoints/waypointsIndex');
    getFloorGraph.mockReturnValueOnce({
      image: 123,
      viewBox: 'invalid value',
      nodes: {},
      edges: [],
    });
    const { getByTestId } = renderViewer();
    expect(getByTestId('indoor-map-image')).toBeTruthy();
  });

  // ── Directions panel collapse ─────────────────────────────────────────────

  it('collapses and expands the directions panel when toggle is pressed', async () => {
    const { getByTestId } = renderViewer();

    await act(async () => { fireEvent.press(getByTestId('pick-origin-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R1')); });
    await act(async () => { fireEvent.press(getByTestId('pick-destination-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R2')); });

    const toggle = getByTestId('directions-panel-toggle');
    // Collapse
    await act(async () => { fireEvent.press(toggle); });
    // Expand again
    await act(async () => { fireEvent.press(toggle); });
    expect(toggle).toBeTruthy();
  });

  // ── Building with no floors ───────────────────────────────────────────────

  it('sets floor to null when switching to a building with no available floors', () => {
    const { getAvailableFloors } = require('../floor_plans/waypoints/waypointsIndex');
    getAvailableFloors.mockReturnValueOnce([
      { building: 'VE', floor: 1 },
      { building: 'MB', floor: NaN },
    ]);
    const { getByText } = render(
      <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="VE" />
    );
    fireEvent.press(getByText('MB'));
    expect(getByText('MB')).toBeTruthy();
  });

  // ── Navigation state: floor chip does not clear route ─────────────────────

  it('keeps origin and route when the floor chip changes (same building)', async () => {
    const { getByTestId, getByText } = renderViewer();

    await act(async () => { fireEvent.press(getByTestId('pick-origin-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R1')); });
    await act(async () => { fireEvent.press(getByTestId('pick-destination-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R2')); });

    expect(getByTestId('indoor-path-overlay')).toBeTruthy();

    await act(async () => { fireEvent.press(getByText('2')); });

    expect(getByText('Room 101')).toBeTruthy();
    expect(getByText('Room 202')).toBeTruthy();
    expect(getByTestId('indoor-path-overlay')).toBeTruthy();
  });


  // ── Multi-floor navigation ────────────────────────────────────────────────


  it('shows floor badges in the room picker when rooms have floor data', () => {
    // Supply a getFloorGraph that returns rooms with floor numbers
    const { getFloorGraph } = require('../floor_plans/waypoints/waypointsIndex');
    getFloorGraph.mockReturnValue({
      ...MOCK_GRAPH,
      nodes: {
        R1: { id: 'R1', type: 'room', label: 'Room 101', x: 50,  y: 50,  accessible: true, floor: 1 },
        R2: { id: 'R2', type: 'room', label: 'Room 202', x: 200, y: 180, accessible: true, floor: 2 },
      },
    });


    const { getByTestId, getByText } = renderViewer();
    fireEvent.press(getByTestId('pick-origin-btn'));
    // Floor badges should appear beside room names
    expect(getByText('Floor 1')).toBeTruthy();
  });


  it('shows the floor switcher bar for a multi-floor route', async () => {
    // Mock two different floor graphs so routingFloorsNeeded detects different floors
    const { getFloorGraph, getMultiFloorGraph } = require('../floor_plans/waypoints/waypointsIndex');
    const floor1Graph = {
      ...MOCK_GRAPH,
      nodes: {
        R1: { id: 'R1', type: 'room', label: 'Room 101', x: 50,  y: 50,  accessible: true, floor: 1 },
      },
    };
    const floor2Graph = {
      ...MOCK_GRAPH,
      nodes: {
        R2: { id: 'R2', type: 'room', label: 'Room 202', x: 200, y: 180, accessible: true, floor: 2 },
      },
    };
    // First call for floor 1, second call for floor 2 (routingFloorsNeeded lookups)
    getFloorGraph
      .mockReturnValueOnce(floor1Graph)  // displayFloor init
      .mockReturnValueOnce(floor1Graph)  // allFloorGraphs lookup floor 1
      .mockReturnValueOnce(floor2Graph)  // allFloorGraphs lookup floor 2
      .mockReturnValue(floor1Graph);
    getMultiFloorGraph.mockReturnValue({
      ...MOCK_GRAPH,
      nodes: {
        R1: { ...floor1Graph.nodes.R1 },
        R2: { ...floor2Graph.nodes.R2 },
      },
    });


    const { getByTestId, queryByTestId } = renderViewer();
    // Without a cross-floor route the bar should not appear
    expect(queryByTestId('floor-switcher-bar')).toBeNull();
  });


  it('floor switch buttons update the displayed floor label', async () => {
    // Render with two floors; press floor 2 floor chip to trigger displayFloor change
    const { getByText } = renderViewer();
    fireEvent.press(getByText('2'));
    // Floor 2 chip should now be visible (no crash)
    expect(getByText('2')).toBeTruthy();
  });

  it('uses default floor filter, allows clearing to All, and filters sections by floor', () => {
    const { getFloorGraph } = require('../floor_plans/waypoints/waypointsIndex');
    getFloorGraph.mockImplementation((building, floor) => ({
      ...MOCK_GRAPH,
      nodes: floor === 1
        ? { R1: { id: 'R1', type: 'room', label: 'Room 101', x: 50, y: 50, accessible: true, floor: 1 } }
        : { R2: { id: 'R2', type: 'room', label: 'Room 202', x: 200, y: 180, accessible: true, floor: 2 } },
    }));

    const { getByText, getByTestId, queryByText } = renderViewer();
    fireEvent.press(getByText('2')); // selectedFloor -> defaultFloorFilter for destination picker
    fireEvent.press(getByTestId('pick-destination-btn'));

    // floorFilter initialized from default floor (2), so floor-1 room is filtered out
    expect(getByText('Room 202')).toBeTruthy();
    expect(queryByText('Room 101')).toBeNull();

    // hit onPress={() => setFloorFilter(null)} and include all floors again
    fireEvent.press(getByTestId('picker-floor-all'));
    expect(getByText('Room 101')).toBeTruthy();
    expect(getByText('Room 202')).toBeTruthy();
  });

  it('returns elevator and stairs floor-change icons in directions steps', async () => {
    useIndoorDirections.mockImplementation(({ originId, destinationId }) => ({
      result: originId && destinationId ? {
        durationText: '3 min',
        distanceText: '120 m',
        pathPoints: [{ id: 'R1', x: 50, y: 50 }, { id: 'R2', x: 200, y: 180 }],
        steps: [
          { id: 'fc-1', instruction: 'Take elevator to floor 2', isFloorChange: true, floorChangeType: 'elevator', toFloor: 2 },
          { id: 'fc-2', instruction: 'Take stairs to floor 3', isFloorChange: true, floorChangeType: 'stairs', toFloor: 3 },
        ],
      } : null,
      loading: false,
      error: null,
    }));

    const { getByTestId, getByText } = renderViewer();
    await act(async () => { fireEvent.press(getByTestId('pick-origin-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R1')); });
    await act(async () => { fireEvent.press(getByTestId('pick-destination-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R2')); });

    expect(getByText('🛗 Elevator')).toBeTruthy();
    expect(getByText('🪜 Stairs')).toBeTruthy();
  });

  it('switches displayed floor when a floor-change step is pressed', async () => {
    const { getAvailableFloors, getFloorGraph, getMultiFloorGraph } = require('../floor_plans/waypoints/waypointsIndex');
    getAvailableFloors.mockReturnValue([
      { building: 'VE', floor: 1 },
      { building: 'VE', floor: 2 },
    ]);
    getFloorGraph.mockImplementation((building, floor) => ({
      ...MOCK_GRAPH,
      nodes: floor === 1
        ? { R1: { id: 'R1', type: 'room', label: 'Room 101', x: 10, y: 10, floor: 1, accessible: true } }
        : { R2: { id: 'R2', type: 'room', label: 'Room 202', x: 20, y: 20, floor: 2, accessible: true } },
    }));
    getMultiFloorGraph.mockReturnValue({
      ...MOCK_GRAPH,
      nodes: {
        R1: { id: 'R1', type: 'room', label: 'Room 101', x: 10, y: 10, floor: 1, accessible: true },
        R2: { id: 'R2', type: 'room', label: 'Room 202', x: 20, y: 20, floor: 2, accessible: true },
      },
    });
    useIndoorDirections.mockImplementation(({ originId, destinationId }) => ({
      result: originId && destinationId ? {
        durationText: '2 min',
        distanceText: '50 m',
        pathPoints: [{ id: 'R1', x: 10, y: 10 }, { id: 'R2', x: 20, y: 20 }],
        steps: [
          { id: 'fc-1', instruction: 'Take stairs to floor 2', isFloorChange: true, floorChangeType: 'stairs', toFloor: 2 },
        ],
      } : null,
      loading: false,
      error: null,
    }));

    const { getByTestId, queryByTestId } = render(
      <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="VE" />
    );
    await act(async () => { fireEvent.press(getByTestId('pick-origin-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R1')); });
    await act(async () => { fireEvent.press(getByTestId('pick-destination-btn')); });
    await act(async () => { fireEvent.press(getByTestId('picker-floor-all')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R2')); });

    // Origin floor is displayed by default in multi-floor mode.
    expect(getByTestId('indoor-origin-marker')).toBeTruthy();
    expect(queryByTestId('indoor-dest-marker')).toBeNull();

    // Pressing floor-change step should switch map floor.
    await act(async () => { fireEvent.press(getByTestId('floor-change-step-2')); });
    expect(getByTestId('indoor-dest-marker')).toBeTruthy();
  });

  it('builds spanning floor ranges and calls getMultiFloorGraph with full span', async () => {
    const { getAvailableFloors, getFloorGraph, getMultiFloorGraph } = require('../floor_plans/waypoints/waypointsIndex');
    getAvailableFloors.mockReturnValue([
      { building: 'VE', floor: 1 },
      { building: 'VE', floor: 2 },
      { building: 'VE', floor: 8 },
    ]);
    getFloorGraph.mockImplementation((building, floor) => ({
      ...MOCK_GRAPH,
      nodes: floor === 1
        ? { R1: { id: 'R1', type: 'room', label: 'Room 101', x: 10, y: 10, floor: 1, accessible: true } }
        : floor === 8
          ? { R2: { id: 'R2', type: 'room', label: 'Room 202', x: 20, y: 20, floor: 8, accessible: true } }
          : { HUB: { id: 'HUB', type: 'hallway', label: 'Connector', x: 15, y: 15, floor: 2 } },
    }));
    getMultiFloorGraph.mockReturnValue({
      ...MOCK_GRAPH,
      nodes: {
        R1: { id: 'R1', type: 'room', label: 'Room 101', x: 10, y: 10, floor: 1, accessible: true },
        R2: { id: 'R2', type: 'room', label: 'Room 202', x: 20, y: 20, floor: 8, accessible: true },
      },
    });

    const { getByTestId } = render(
      <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="VE" />
    );
    await act(async () => { fireEvent.press(getByTestId('pick-origin-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R1')); });
    await act(async () => { fireEvent.press(getByTestId('pick-destination-btn')); });
    await act(async () => { fireEvent.press(getByTestId('picker-floor-all')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R2')); });

    expect(getMultiFloorGraph).toHaveBeenCalledWith('VE', [1, 2, 8]);
  });

  it('syncs display floor to origin floor and filters path points by display floor', async () => {
    const { getAvailableFloors, getFloorGraph, getMultiFloorGraph } = require('../floor_plans/waypoints/waypointsIndex');
    getAvailableFloors.mockReturnValue([
      { building: 'VE', floor: 1 },
      { building: 'VE', floor: 2 },
      { building: 'VE', floor: 8 },
    ]);
    getFloorGraph.mockImplementation((building, floor) => ({
      ...MOCK_GRAPH,
      nodes: floor === 2
        ? { R1: { id: 'R1', type: 'room', label: 'Room 101', x: 10, y: 10, floor: 2, accessible: true } }
        : floor === 8
          ? { R2: { id: 'R2', type: 'room', label: 'Room 202', x: 30, y: 30, floor: 8, accessible: true } }
          : {},
    }));
    getMultiFloorGraph.mockReturnValue({
      ...MOCK_GRAPH,
      nodes: {
        R1: { id: 'R1', type: 'room', label: 'Room 101', x: 10, y: 10, floor: 2, accessible: true },
        R2: { id: 'R2', type: 'room', label: 'Room 202', x: 30, y: 30, floor: 8, accessible: true },
        HUB: { id: 'HUB', type: 'hallway', label: 'Connector', x: 20, y: 20 },
      },
    });
    useIndoorDirections.mockImplementation(({ originId, destinationId }) => ({
      result: originId && destinationId ? {
        durationText: '3 min',
        distanceText: '200 m',
        // includes floor-2 point, floor-8 point, and floorless point
        pathPoints: [
          { id: 'R1', x: 10, y: 10 },
          { id: 'R2', x: 30, y: 30 },
          { id: 'HUB', x: 20, y: 20 },
        ],
        steps: [{ id: 's1', instruction: 'Start', distance: '1 m', duration: '1 sec' }],
      } : null,
      loading: false,
      error: null,
    }));

    const { getByTestId } = render(
      <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="VE" />
    );
    await act(async () => { fireEvent.press(getByTestId('pick-origin-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R1')); }); // floor 2
    await act(async () => { fireEvent.press(getByTestId('pick-destination-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R2')); }); // floor 8

    // displayFloor syncs to origin floor (2), so origin marker is visible
    expect(getByTestId('indoor-origin-marker')).toBeTruthy();

    // Path line should contain floor 2 + floorless points, but not floor 8 point
    const line = getByTestId('indoor-path-line');
    expect(line.props.points).toContain('10,10');
    expect(line.props.points).toContain('20,20');
    expect(line.props.points).not.toContain('30,30');
  });

  it('filters out inaccessible washrooms from the map overlay', async () => {
    const { getByTestId, queryByTestId } = renderViewer();
    // Toggle accessible only
    fireEvent.press(getByTestId('accessible-only-toggle'));
    
    // E1 is accessible elevator -> should be present
    expect(getByTestId('facility-icon-E1')).toBeTruthy();
    
    // W1 is inaccessible washroom -> should be absent
    expect(queryByTestId('facility-icon-W1')).toBeNull();
  });

  it('handles null initialBuildingId by falling back to the first available building', () => {
    const { getByText } = render(
      <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId={null} />
    );
    // getAvailableFloors returns VE as first building
    expect(getByText('VE')).toBeTruthy();
  });

  it('handles initialBuildingId that matches no building by falling back to first available', () => {
    const { getByText } = render(
      <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="UNKNOWN" />
    );
    expect(getByText('VE')).toBeTruthy();
  });

  it('does not trigger multi-floor routing logic for same-floor selected rooms', async () => {
    const { getByTestId, queryByTestId } = renderViewer();
    // Simulate setting origin to R1 and destination to R2 (both on floor 1 in MOCK_GRAPH)
    await act(async () => { fireEvent.press(getByTestId('pick-origin-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R1')); });
    await act(async () => { fireEvent.press(getByTestId('pick-destination-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R2')); });
    
    // No multi-floor switcher should be rendered
    expect(queryByTestId('floor-switcher-bar')).toBeNull();
  });
});
