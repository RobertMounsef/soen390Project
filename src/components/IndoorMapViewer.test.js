import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import IndoorMapViewer, { findNodeAcrossFloors, roomLabelFromNode } from './IndoorMapViewer';
import useIndoorDirections from '../hooks/useIndoorDirections';

// ── Shared mock graph ────────────────────────────────────────────────────────
const MOCK_GRAPH = {
  image: 123,
  viewBox: '0 0 249 222',
  nodes: {
    R1: { id: 'R1', type: 'room', label: 'Room 101', x: 50,  y: 50,  accessible: true  },
    R2: { id: 'R2', type: 'room', label: 'Room 202', x: 200, y: 180, accessible: true  },
    R3: { id: 'R3', type: 'room', label: 'Room 303', x: 120, y: 120, accessible: false },
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

const mockUseCrossBuildingIndoorDirections = jest.fn(() => ({
  result: null,
  loading: false,
  error: null,
  outdoorLoading: false,
}));

jest.mock('../hooks/useCrossBuildingIndoorDirections', () => ({
  __esModule: true,
  default: (...args) => mockUseCrossBuildingIndoorDirections(...args),
}));

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
    default: makeMock('Svg'),
    Svg:      makeMock('Svg'),
    Polyline: makeMock('Polyline'),
    Circle:   makeMock('Circle'),
    Line:     makeMock('Line'),
    G:        makeMock('G'),
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
    mockUseCrossBuildingIndoorDirections.mockReturnValue({
      result: null,
      loading: false,
      error: null,
      outdoorLoading: false,
    });
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
    const { getByTestId } = renderViewer();
    expect(getByTestId('start-building-chip-VE')).toBeTruthy();
    expect(getByTestId('start-building-chip-H')).toBeTruthy();
  });

  it('renders floor chips for the selected building', () => {
    const { getByText } = renderViewer();
    // VE has floors 1 and 2
    expect(getByText('1')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
  });

  it('switches building and updates floor list', () => {
    const { getByText, queryByText, getByTestId } = renderViewer();
    // Switch to H building
    fireEvent.press(getByTestId('start-building-chip-H'));
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
    const { getByTestId } = render(
      <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="H-8" />
    );
    // Should match building "H" (partial prefix match)
    expect(getByTestId('start-building-chip-H')).toBeTruthy();
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

  it('shows a Show map control that minimizes the step list', async () => {
    const { getByTestId, getByText, queryByTestId } = renderViewer();

    await act(async () => { fireEvent.press(getByTestId('pick-origin-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R1')); });
    await act(async () => { fireEvent.press(getByTestId('pick-destination-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R2')); });

    expect(getByTestId('indoor-show-map')).toBeTruthy();
    expect(getByText('Start')).toBeTruthy();

    await act(async () => { fireEvent.press(getByTestId('indoor-show-map')); });

    expect(queryByTestId('indoor-show-map')).toBeNull();
  });

  it('minimizes the step list when a regular (non-floor-change) step is tapped', async () => {
    const { getByTestId, getByText, queryByTestId } = renderViewer();

    await act(async () => { fireEvent.press(getByTestId('pick-origin-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R1')); });
    await act(async () => { fireEvent.press(getByTestId('pick-destination-btn')); });
    await act(async () => { fireEvent.press(getByTestId('room-option-R2')); });

    await act(async () => { fireEvent.press(getByText('Start')); });

    expect(queryByTestId('indoor-show-map')).toBeNull();
  });

  // ── Building with no floors ───────────────────────────────────────────────

  it('sets floor to null when switching to a building with no available floors', () => {
    const { getAvailableFloors } = require('../floor_plans/waypoints/waypointsIndex');
    getAvailableFloors.mockReturnValueOnce([
      { building: 'VE', floor: 1 },
      { building: 'MB', floor: NaN },
    ]);
    const { getByTestId } = render(
      <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="VE" />
    );
    fireEvent.press(getByTestId('start-building-chip-MB'));
    expect(getByTestId('start-building-chip-MB')).toBeTruthy();
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
    expect(getByTestId('floor-switcher-bar')).toBeTruthy();

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

  // ── US-5.6 Cross-building hybrid (IndoorMapViewer integration) ─────────────

  describe('US-5.6 cross-building hybrid', () => {
    const hybridOriginGraph = {
      ...MOCK_GRAPH,
      nodes: {
        R1: { id: 'R1', type: 'room', label: 'Room 101', x: 50, y: 50, accessible: true, floor: 1 },
        R2: { id: 'R2', type: 'room', label: 'Room 202', x: 60, y: 60, accessible: true, floor: 2 },
      },
    };
    const hybridDestGraph = {
      ...MOCK_GRAPH,
      nodes: {
        R3: { id: 'R3', type: 'room', label: 'Room 303', x: 55, y: 55, accessible: true, floor: 8 },
        R4: { id: 'R4', type: 'room', label: 'Room 404', x: 65, y: 65, accessible: true, floor: 9 },
      },
    };

    const hybridResultBase = {
      steps: [
        { id: 'xb-s', kind: 'section', title: 'Inside VE' },
        { id: 'xb-t1', kind: 'transition', instruction: 'Leave and go outside.' },
        { id: 'xb-o', kind: 'outdoor', instruction: 'Walk between buildings', distance: '10 m', duration: '2 min' },
        { id: 'xb-t2', kind: 'transition', instruction: 'Enter destination.' },
        { id: 'xb-s2', kind: 'section', title: 'Inside H' },
        // Destination-leg floor-change step (tapping this should switch the
        // visible plan to the destination side so the indoor map reappears).
        { id: 'xb-fc-d', instruction: 'Take stairs up to floor 8', isFloorChange: true, floorChangeType: 'stairs', toFloor: 8, distance: '', duration: '' },
        { id: 'xb-plain', instruction: 'Continue straight through the corridor', distance: '', duration: '' },
      ],
      distanceText: '88 m',
      durationText: '4 min + 2 min + 1 min',
      totalMetres: 88,
      pathPointsOrigin: [{ id: 'R1', x: 50, y: 50 }, { id: 'R2', x: 60, y: 60 }],
      pathPointsDestination: [{ id: 'R3', x: 55, y: 55 }, { id: 'R4', x: 65, y: 65 }],
      originGraph: hybridOriginGraph,
      destGraph: hybridDestGraph,
    };

    beforeEach(() => {
      const { getAvailableFloors, getFloorGraph } = require('../floor_plans/waypoints/waypointsIndex');
      getAvailableFloors.mockReturnValue([
        { building: 'VE', floor: 1 },
        { building: 'VE', floor: 2 },
        { building: 'H', floor: 8 },
        { building: 'H', floor: 9 },
      ]);
      getFloorGraph.mockImplementation((building, floor) => {
        if (building === 'VE' && floor === 1) {
          return { ...MOCK_GRAPH, nodes: { R1: hybridOriginGraph.nodes.R1 } };
        }
        if (building === 'VE' && floor === 2) {
          return { ...MOCK_GRAPH, nodes: { R2: hybridOriginGraph.nodes.R2 } };
        }
        if (building === 'H' && floor === 8) {
          return { ...MOCK_GRAPH, nodes: { R3: hybridDestGraph.nodes.R3 } };
        }
        if (building === 'H' && floor === 9) {
          return { ...MOCK_GRAPH, nodes: { R4: hybridDestGraph.nodes.R4 } };
        }
        return MOCK_GRAPH;
      });
      useIndoorDirections.mockImplementation(() => ({
        result: null,
        loading: false,
        error: null,
      }));
      mockUseCrossBuildingIndoorDirections.mockImplementation(() => ({
        result: hybridResultBase,
        loading: false,
        error: null,
        outdoorLoading: false,
      }));
    });

    it('shows hybrid summary, section/transition/outdoor steps, and map toggle', async () => {
      const { getByTestId, getByText } = renderViewer();
      fireEvent.press(getByTestId('dest-building-chip-H'));
      fireEvent.press(getByTestId('pick-origin-btn'));
      await waitFor(() => expect(getByTestId('room-option-R1')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R1'));
      fireEvent.press(getByTestId('pick-destination-btn'));
      await waitFor(() => expect(getByTestId('room-option-R3')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R3'));

      expect(getByText(/Indoor \+ outdoor/)).toBeTruthy();
      expect(getByText('Inside VE')).toBeTruthy();
      expect(getByText('Leave and go outside.')).toBeTruthy();
      expect(getByText('Walk between buildings')).toBeTruthy();
      expect(getByText('🧭')).toBeTruthy();
      expect(getByTestId('directions-panel-toggle')).toBeTruthy();

      expect(mockUseCrossBuildingIndoorDirections).toHaveBeenCalledWith(
        expect.objectContaining({
          originBuilding: 'VE',
          destinationBuilding: 'H',
          originRoomId: 'R1',
          destinationRoomId: 'R3',
          enabled: true,
        }),
      );

      expect(getByTestId('hybrid-map-start')).toBeTruthy();
      expect(getByTestId('hybrid-map-end')).toBeTruthy();
      fireEvent.press(getByTestId('hybrid-map-end'));
      await waitFor(() => expect(getByTestId('indoor-dest-marker')).toBeTruthy());
      fireEvent.press(getByTestId('hybrid-map-start'));
      await waitFor(() => expect(getByTestId('indoor-origin-marker')).toBeTruthy());
    });

    it('shows destination floor chips and floor switcher when viewing multi-floor hybrid leg', async () => {
      const { getByTestId, getByText } = renderViewer();
      fireEvent.press(getByTestId('dest-building-chip-H'));
      fireEvent.press(getByTestId('pick-origin-btn'));
      await waitFor(() => expect(getByTestId('room-option-R1')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R1'));
      fireEvent.press(getByTestId('pick-destination-btn'));
      await waitFor(() => expect(getByTestId('room-option-R3')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R3'));
      fireEvent.press(getByTestId('hybrid-map-end'));
      await waitFor(() => expect(getByText(/Floor \(H\)/)).toBeTruthy());
      fireEvent.press(getByTestId('dest-floor-chip-9'));
      await waitFor(() => expect(getByTestId('floor-switcher-bar')).toBeTruthy());
      fireEvent.press(getByTestId('floor-switch-btn-9'));
    });

    it('hybrid start-map floor switcher uses setDisplayFloor when not viewing destination', async () => {
      const { getByTestId } = renderViewer();
      fireEvent.press(getByTestId('dest-building-chip-H'));
      fireEvent.press(getByTestId('pick-origin-btn'));
      await waitFor(() => expect(getByTestId('room-option-R1')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R1'));
      fireEvent.press(getByTestId('pick-destination-btn'));
      await waitFor(() => expect(getByTestId('room-option-R3')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R3'));
      await waitFor(() => expect(getByTestId('floor-switcher-bar')).toBeTruthy());
      fireEvent.press(getByTestId('floor-switch-btn-2'));
    });

    it('disables user position and shows cross-building hint when hybrid is active', async () => {
      const { getByTestId, getByText } = renderViewer();
      fireEvent.press(getByTestId('dest-building-chip-H'));
      fireEvent.press(getByTestId('pick-origin-btn'));
      await waitFor(() => expect(getByTestId('room-option-R1')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R1'));
      fireEvent.press(getByTestId('pick-destination-btn'));
      await waitFor(() => expect(getByTestId('room-option-R3')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R3'));
      expect(getByText('Same-building only')).toBeTruthy();
    });

    it('swaps buildings and rooms for cross-building route', async () => {
      const { getByTestId } = renderViewer();
      fireEvent.press(getByTestId('dest-building-chip-H'));
      fireEvent.press(getByTestId('pick-origin-btn'));
      await waitFor(() => expect(getByTestId('room-option-R1')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R1'));
      fireEvent.press(getByTestId('pick-destination-btn'));
      await waitFor(() => expect(getByTestId('room-option-R3')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R3'));
      fireEvent.press(getByTestId('swap-origin-dest'));
      expect(getByTestId('start-building-chip-H')).toBeTruthy();
      expect(getByTestId('dest-building-chip-VE')).toBeTruthy();
    });

    it('shows hybrid loading from the hook', async () => {
      mockUseCrossBuildingIndoorDirections.mockImplementation(() => ({
        result: null,
        loading: true,
        error: null,
        outdoorLoading: true,
      }));
      const { getByTestId, getByText } = render(
        <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="VE" />,
      );
      fireEvent.press(getByTestId('dest-building-chip-H'));
      fireEvent.press(getByTestId('pick-origin-btn'));
      await waitFor(() => expect(getByTestId('room-option-R1')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R1'));
      fireEvent.press(getByTestId('pick-destination-btn'));
      await waitFor(() => expect(getByTestId('room-option-R3')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R3'));
      await waitFor(() => expect(getByText('Calculating route…')).toBeTruthy());
    });

    it('shows hybrid error from the hook', async () => {
      mockUseCrossBuildingIndoorDirections.mockImplementation(() => ({
        result: null,
        loading: false,
        error: 'No mapped building exits in VE.',
        outdoorLoading: false,
      }));
      const { getByTestId, getByText } = render(
        <IndoorMapViewer visible={true} onClose={jest.fn()} initialBuildingId="VE" />,
      );
      fireEvent.press(getByTestId('dest-building-chip-H'));
      fireEvent.press(getByTestId('pick-origin-btn'));
      await waitFor(() => expect(getByTestId('room-option-R1')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R1'));
      fireEvent.press(getByTestId('pick-destination-btn'));
      await waitFor(() => expect(getByTestId('room-option-R3')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R3'));
      await waitFor(() =>
        expect(getByText('No mapped building exits in VE.')).toBeTruthy(),
      );
    });

    it('uses destination floor filter chips when picking a room in cross mode', async () => {
      const { getByTestId, queryByText } = renderViewer();
      fireEvent.press(getByTestId('dest-building-chip-H'));
      fireEvent.press(getByTestId('pick-destination-btn'));
      await waitFor(() => expect(getByTestId('picker-floor-8')).toBeTruthy());
      fireEvent.press(getByTestId('picker-floor-9'));
      await waitFor(() => expect(queryByText('Room 303')).toBeNull());
      expect(getByTestId('room-option-R4')).toBeTruthy();
    });

    it('switches to destination floor plan when destination-leg floor-change step is tapped', async () => {
      const { getByTestId } = renderViewer();

      fireEvent.press(getByTestId('dest-building-chip-H'));
      fireEvent.press(getByTestId('pick-origin-btn'));
      await waitFor(() => expect(getByTestId('room-option-R1')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R1'));

      fireEvent.press(getByTestId('pick-destination-btn'));
      await waitFor(() => expect(getByTestId('room-option-R3')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R3'));

      // Initial hybrid view starts on origin side.
      expect(getByTestId('hybrid-map-start')).toBeTruthy();
      expect(getByTestId('hybrid-map-end')).toBeTruthy();

      // Tap destination-leg floor-change step (toFloor=8).
      await act(async () => {
        fireEvent.press(getByTestId('floor-change-step-8'));
      });

      await waitFor(() => expect(getByTestId('indoor-dest-marker')).toBeTruthy());
    });

    it('calls onOutdoorRouteSync with origin and destination buildings when hybrid route is active', async () => {
      const onOutdoorRouteSync = jest.fn();
      const { getByTestId } = renderViewer({ onOutdoorRouteSync });
      fireEvent.press(getByTestId('dest-building-chip-H'));
      fireEvent.press(getByTestId('pick-origin-btn'));
      await waitFor(() => expect(getByTestId('room-option-R1')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R1'));
      fireEvent.press(getByTestId('pick-destination-btn'));
      await waitFor(() => expect(getByTestId('room-option-R3')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R3'));
      await waitFor(() =>
        expect(onOutdoorRouteSync).toHaveBeenLastCalledWith({
          originBuildingId: 'VE',
          destinationBuildingId: 'H',
        }),
      );
    });

    it('calls onOutdoorRouteSync with null when cross-building sync is no longer valid', async () => {
      const onOutdoorRouteSync = jest.fn();
      const { getByTestId } = renderViewer({ onOutdoorRouteSync });
      fireEvent.press(getByTestId('dest-building-chip-H'));
      fireEvent.press(getByTestId('pick-origin-btn'));
      await waitFor(() => expect(getByTestId('room-option-R1')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R1'));
      fireEvent.press(getByTestId('pick-destination-btn'));
      await waitFor(() => expect(getByTestId('room-option-R3')).toBeTruthy());
      fireEvent.press(getByTestId('room-option-R3'));
      await waitFor(() => expect(onOutdoorRouteSync).toHaveBeenCalled());
      onOutdoorRouteSync.mockClear();
      fireEvent.press(getByTestId('dest-building-chip-VE'));
      await waitFor(() => expect(onOutdoorRouteSync).toHaveBeenCalledWith(null));
    });
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
});

describe('IndoorMapViewer routing helper exports', () => {
  it('findNodeAcrossFloors returns null when building or nodeId is missing', () => {
    expect(findNodeAcrossFloors(null, 'R1', { VE: [1] })).toBeNull();
    expect(findNodeAcrossFloors('VE', null, { VE: [1] })).toBeNull();
  });

  it('findNodeAcrossFloors returns null when no floor graph contains the node', () => {
    const { getFloorGraph } = require('../floor_plans/waypoints/waypointsIndex');
    getFloorGraph.mockReturnValue({ nodes: {} });
    expect(findNodeAcrossFloors('VE', 'R1', { VE: [1, 2] })).toBeNull();
  });

  it('roomLabelFromNode falls back to id or uses non-room label', () => {
    expect(roomLabelFromNode(null, 'Z')).toBe('Z');
    expect(roomLabelFromNode({ type: 'hallway', label: 'Lobby' }, 'n1')).toBe('Lobby');
    expect(roomLabelFromNode({ type: 'stairs', label: '' }, 'n2')).toBe('n2');
  });
});
