// src/screens/RouteOptionsScreen.test.js
//
// RouteOptionsScreen unit tests
// - Verifies route calculation on mount and when switching transportation modes
// - Validates UI behavior for showing/hiding step-by-step directions
// - Ensures error handling and back navigation
// - Adds coverage for search/clear/recalculate flows (origin/destination helpers)

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RouteOptionsScreen from './RouteOptionsScreen';

// Mock: routing service
jest.mock('../services/routing/routeCalculator', () => ({
  calculateRoute: jest.fn(),
}));

// Mock: buildings API + building info lookups (deterministic suggestions)
jest.mock('../services/api/buildings', () => ({
  getBuildingsByCampus: jest.fn(() => [
    {
      type: 'Feature',
      properties: { id: 'EV', name: 'Engineering Building', code: 'EV', campus: 'SGW' },
      geometry: { type: 'Polygon', coordinates: [] },
    },
    {
      type: 'Feature',
      properties: { id: 'H', name: 'Hall Building', code: 'H', campus: 'SGW' },
      geometry: { type: 'Polygon', coordinates: [] },
    },
    {
      type: 'Feature',
      properties: { id: 'CC', name: 'Communication Studies and Journalism', code: 'CC', campus: 'LOY' },
      geometry: { type: 'Polygon', coordinates: [] },
    },
  ]),
  getBuildingInfo: jest.fn((id) => {
    if (id === 'EV') return { id: 'EV', name: 'Engineering Building', code: 'EV', campus: 'SGW' };
    if (id === 'H') return { id: 'H', name: 'Hall Building', code: 'H', campus: 'SGW' };
    if (id === 'CC') return { id: 'CC', name: 'Communication Studies and Journalism', code: 'CC', campus: 'LOY' };
    return { id, name: id, code: id };
  }),
}));

// Mock: building ID extraction from GeoJSON features
jest.mock('../utils/geolocation', () => ({
  getBuildingId: jest.fn((feature) => feature?.properties?.id),
}));

// Mock: geometry helper used for "center" coordinates (stable value for tests)
jest.mock('../utils/geometry', () => ({
  getFeatureCenter: jest.fn(() => ({ latitude: 45.497, longitude: -73.579 })),
}));

const { calculateRoute } = require('../services/routing/routeCalculator');

const baseParams = {
  start: { latitude: 45.497, longitude: -73.579, label: 'SGW' },
  end: { latitude: 45.458, longitude: -73.64, label: 'LOY' },
  destinationName: 'Loyola',
};

describe('RouteOptionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders and calls calculateRoute on mount', async () => {
    calculateRoute.mockResolvedValueOnce({
      mode: 'walk',
      distanceMeters: 1200,
      durationMinutes: 15,
      summary: 'Walk route',
      steps: [],
      polyline: [],
    });

    const { getByText } = render(
      <RouteOptionsScreen route={{ params: baseParams }} onBack={() => {}} />
    );

    await waitFor(() => expect(calculateRoute).toHaveBeenCalled());
    expect(getByText('Route Options')).toBeTruthy();
    expect(getByText('15 min')).toBeTruthy();
  });

  it('switching modes triggers route recalculation with correct mode', async () => {
    calculateRoute
      .mockResolvedValueOnce({
        mode: 'walk',
        distanceMeters: 1000,
        durationMinutes: 12,
        summary: 'Walk route',
        steps: [],
        polyline: [],
      })
      .mockResolvedValueOnce({
        mode: 'drive',
        distanceMeters: 2500,
        durationMinutes: 7,
        summary: 'Drive route',
        steps: [],
        polyline: [],
      });

    const { getByLabelText, getByText } = render(
      <RouteOptionsScreen route={{ params: baseParams }} onBack={() => {}} />
    );

    await waitFor(() => expect(calculateRoute).toHaveBeenCalledTimes(1));

    // TransportModeSelector is expected to expose mode toggles via accessibility labels.
    fireEvent.press(getByLabelText('mode-drive'));

    await waitFor(() => expect(calculateRoute).toHaveBeenCalledTimes(2));
    expect(calculateRoute).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: 'drive' })
    );

    await waitFor(() => expect(getByText('7 min')).toBeTruthy());
  });

  it('shows and hides directions when steps exist', async () => {
    calculateRoute.mockResolvedValueOnce({
      mode: 'walk',
      distanceMeters: 400,
      durationMinutes: 5,
      summary: 'Walk route',
      polyline: [],
      steps: [
        { instruction: 'Head north', kind: 'walk', distanceText: '100 m', durationText: '1 min' },
        { instruction: 'Turn left', kind: 'walk', distanceText: '300 m', durationText: '4 min' },
      ],
    });

    const { getByText, queryByText } = render(
      <RouteOptionsScreen route={{ params: baseParams }} onBack={() => {}} />
    );

    await waitFor(() => expect(getByText('Show directions')).toBeTruthy());

    fireEvent.press(getByText('Show directions'));
    expect(getByText('Hide directions')).toBeTruthy();
    expect(getByText(/Head north/i)).toBeTruthy();

    fireEvent.press(getByText('Hide directions'));
    expect(queryByText(/Head north/i)).toBeNull();
  });

  it('gracefully handles calculateRoute error', async () => {
    calculateRoute.mockRejectedValueOnce(new Error('boom'));

    const { getByText } = render(
      <RouteOptionsScreen route={{ params: baseParams }} onBack={() => {}} />
    );

    await waitFor(() => expect(getByText('Could not calculate route.')).toBeTruthy());
  });

  it('calls onBack when Back is pressed', async () => {
    calculateRoute.mockResolvedValueOnce({
      mode: 'walk',
      distanceMeters: 1200,
      durationMinutes: 15,
      summary: 'Walk route',
      steps: [],
      polyline: [],
    });

    const onBack = jest.fn();
    const { getByText } = render(
      <RouteOptionsScreen route={{ params: baseParams }} onBack={onBack} />
    );

    await waitFor(() => expect(getByText('Back')).toBeTruthy());
    fireEvent.press(getByText('Back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('selecting origin and destination suggestions and pressing Recalculate triggers route recalculation', async () => {
    calculateRoute.mockResolvedValue({
      mode: 'walk',
      distanceMeters: 1000,
      durationMinutes: 10,
      summary: 'Walk route',
      steps: [],
      polyline: [],
    });

    const { getByPlaceholderText, getByText, getByLabelText } = render(
      <RouteOptionsScreen route={{ params: baseParams }} onBack={() => {}} />
    );

    // Initial calculation is performed on mount.
    await waitFor(() => expect(calculateRoute).toHaveBeenCalledTimes(1));

    // Origin: focus + type to open suggestion list, then pick a suggestion.
    const originInput = getByPlaceholderText('Search origin building');
    fireEvent.focus(originInput);
    fireEvent.changeText(originInput, 'Eng');
    fireEvent(getByText(/Engineering Building/i), 'pressIn');

    // Destination: focus + type to open suggestion list, then pick a suggestion.
    const destInput = getByPlaceholderText('Search destination building');
    fireEvent.focus(destInput);
    fireEvent.changeText(destInput, 'Hall');
    fireEvent(getByText(/Hall Building/i), 'pressIn');

    // Apply changes and trigger recalculation.
    fireEvent.press(getByLabelText('Recalculate route'));

    await waitFor(() => expect(calculateRoute).toHaveBeenCalledTimes(2));
  });

  it('clear origin and destination buttons reset queries and allow recalculation', async () => {
    calculateRoute.mockResolvedValue({
      mode: 'walk',
      distanceMeters: 900,
      durationMinutes: 9,
      summary: 'Walk route',
      steps: [],
      polyline: [],
    });

    const { getByPlaceholderText, getAllByText, getByLabelText } = render(
      <RouteOptionsScreen route={{ params: baseParams }} onBack={() => {}} />
    );

    await waitFor(() => expect(calculateRoute).toHaveBeenCalledTimes(1));

    // Ensure clear icons render (component displays clear buttons when query is non-empty).
    fireEvent.changeText(getByPlaceholderText('Search origin building'), 'abc');
    fireEvent.changeText(getByPlaceholderText('Search destination building'), 'xyz');

    const clearIcons = getAllByText('✕');
    expect(clearIcons.length).toBeGreaterThanOrEqual(2);

    // Clear origin then destination.
    fireEvent.press(clearIcons[0]);
    fireEvent.press(clearIcons[1]);

    // Trigger recalculation to cover apply flow and ensure no runtime errors.
    fireEvent.press(getByLabelText('Recalculate route'));

    await waitFor(() => expect(calculateRoute).toHaveBeenCalledTimes(2));
  });

  it('typing queries and pressing Recalculate applies top suggestions when IDs are null', async () => {
    calculateRoute.mockResolvedValue({
      mode: 'walk',
      distanceMeters: 800,
      durationMinutes: 8,
      summary: 'Walk route',
      steps: [],
      polyline: [],
    });

    const { getByPlaceholderText, getByLabelText } = render(
      <RouteOptionsScreen route={{ params: baseParams }} onBack={() => {}} />
    );

    await waitFor(() => expect(calculateRoute).toHaveBeenCalledTimes(1));

    // Do not press a suggestion item: keep IDs null while ensuring suggestions exist.
    fireEvent.changeText(getByPlaceholderText('Search origin building'), 'Eng');
    fireEvent.changeText(getByPlaceholderText('Search destination building'), 'Hall');

    fireEvent.press(getByLabelText('Recalculate route'));

    await waitFor(() => expect(calculateRoute).toHaveBeenCalledTimes(2));
  });
});
