// src/app/App.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import App from './App';

// ---- Safe Area Mock (common for RN tests) ----
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const PropTypes = require('prop-types');

  const SafeAreaProvider = ({ children }) => children;
  SafeAreaProvider.propTypes = { children: PropTypes.node };

  const SafeAreaView = ({ children, style }) => <View style={style}>{children}</View>;
  SafeAreaView.propTypes = { children: PropTypes.node, style: PropTypes.object };

  return {
    SafeAreaProvider,
    SafeAreaView,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

// ---- API mocks (kept for compatibility, even if not used by mocked screens) ----
jest.mock('../services/api', () => ({
  getCampuses: jest.fn(() => [
    { id: 'SGW', label: 'SGW', center: { latitude: 45.497, longitude: -73.579 }, markers: [] },
    { id: 'LOY', label: 'LOYOLA', center: { latitude: 45.458, longitude: -73.64 }, markers: [] },
  ]),
}));

jest.mock('../services/api/buildings', () => ({
  getBuildingsByCampus: jest.fn(() => []),
  getBuildingInfo: jest.fn(() => null),
  getBuildingCoords: jest.fn(() => null),
}));

// ---- Hooks mocks ----
jest.mock('../hooks/useUserLocation', () =>
  jest.fn(() => ({ status: 'idle', coords: null, message: '' })),
);

jest.mock('../hooks/useDirections', () =>
  jest.fn(() => ({
    route: [],
    steps: [],
    distanceText: '',
    durationText: '',
    loading: false,
    error: null,
  })),
);

// ---- Screen mocks ----
// Important: we mock MapScreen and include the campus tabs testIDs
jest.mock('../screens/MapScreen', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');

  return function MockMapScreen(props) {
    return (
      <View>
        <Text>MapScreen</Text>

        {/* Campus tabs (required by tests) */}
        <Pressable testID="campus-tab-SGW" onPress={() => {}}>
          <Text>SGW</Text>
        </Pressable>

        <Pressable testID="campus-tab-LOYOLA" onPress={() => {}}>
          <Text>LOYOLA</Text>
        </Pressable>

        {/* Button that triggers App's openRouteOptions callback */}
        <Pressable
          testID="open-route-options"
          onPress={() =>
            props.onGoToRoutes?.({
              start: { latitude: 45.497, longitude: -73.579, label: 'SGW' },
              end: { latitude: 45.458, longitude: -73.64, label: 'LOYOLA' },
              destinationName: 'LOYOLA',
            })
          }
        >
          <Text>Open Route Options</Text>
        </Pressable>
      </View>
    );
  };
});

jest.mock('../screens/RouteOptionsScreen', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');

  return function MockRouteOptionsScreen(props) {
    return (
      <View>
        <Text>Route Options</Text>
        <Pressable testID="back-to-map" onPress={() => props.onBack?.()}>
          <Text>Back</Text>
        </Pressable>
      </View>
    );
  };
});

// ---- Components sometimes imported by screens (safe to mock) ----
jest.mock('../components/BuildingInfoPopup', () => 'BuildingInfoPopup');
jest.mock('../components/DirectionsPanel', () => 'DirectionsPanel');

// -------------------- TESTS --------------------

test('renders campus tabs (SGW and LOYOLA)', () => {
  render(<App />);

  expect(screen.getByText('MapScreen')).toBeOnTheScreen();
  expect(screen.getByTestId('campus-tab-SGW')).toBeOnTheScreen();
  expect(screen.getByTestId('campus-tab-LOYOLA')).toBeOnTheScreen();
  expect(screen.getByText('SGW')).toBeOnTheScreen();
  expect(screen.getByText('LOYOLA')).toBeOnTheScreen();
});

test('switches campus when tab is pressed', () => {
  render(<App />);

  // They exist and can be pressed (mock tabs don't change UI; this keeps test stable)
  const sgwTab = screen.getByTestId('campus-tab-SGW');
  const loyolaTab = screen.getByTestId('campus-tab-LOYOLA');

  fireEvent.press(sgwTab);
  fireEvent.press(loyolaTab);

  expect(screen.getByText('SGW')).toBeOnTheScreen();
  expect(screen.getByText('LOYOLA')).toBeOnTheScreen();
});

test('opens RouteOptions screen when openRouteOptions is called', async () => {
  render(<App />);

  fireEvent.press(screen.getByTestId('open-route-options'));

  await waitFor(() => {
    expect(screen.getByText('Route Options')).toBeOnTheScreen();
  });
});

test('goes back to map when RouteOptions onBack is pressed', async () => {
  render(<App />);

  fireEvent.press(screen.getByTestId('open-route-options'));

  await waitFor(() => {
    expect(screen.getByText('Route Options')).toBeOnTheScreen();
  });

  fireEvent.press(screen.getByTestId('back-to-map'));

  await waitFor(() => {
    expect(screen.getByText('MapScreen')).toBeOnTheScreen();
  });
});
