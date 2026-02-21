// src/app/App.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import App from './App';

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

jest.mock('../screens/MapScreen', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');

  return function MockMapScreen(props) {
    return (
      <View>
        <Text>MapScreen</Text>
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

jest.mock('../components/BuildingInfoPopup', () => 'BuildingInfoPopup');
jest.mock('../components/DirectionsPanel', () => 'DirectionsPanel');

test('renders campus tabs (SGW and LOYOLA)', () => {
  render(<App />);

  expect(screen.getByTestId('campus-tab-SGW')).toBeOnTheScreen();
  expect(screen.getByTestId('campus-tab-LOYOLA')).toBeOnTheScreen();
  expect(screen.getByText('SGW')).toBeOnTheScreen();
  expect(screen.getByText('LOYOLA')).toBeOnTheScreen();
});

test('switches campus when tab is pressed', () => {
  render(<App />);

  screen.getByTestId('campus-tab-SGW');
  const loyolaTab = screen.getByTestId('campus-tab-LOYOLA');

  fireEvent.press(loyolaTab);

  expect(screen.getByText('SGW')).toBeOnTheScreen();
  expect(screen.getByText('LOYOLA')).toBeOnTheScreen();
});

test('opens RouteOptions screen when openRouteOptions is called', () => {
  render(<App />);

  fireEvent.press(screen.getByTestId('open-route-options'));
  expect(screen.getByText('Route Options')).toBeOnTheScreen();
});

test('goes back to map when RouteOptions onBack is pressed', () => {
  render(<App />);

  fireEvent.press(screen.getByTestId('open-route-options'));
  expect(screen.getByText('Route Options')).toBeOnTheScreen();

  fireEvent.press(screen.getByTestId('back-to-map'));
  expect(screen.getByText('MapScreen')).toBeOnTheScreen();
});
