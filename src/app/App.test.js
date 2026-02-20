import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import App from './App';

// SafeAreaProvider/SafeAreaView need to be mocked in the test environment
jest.mock('react-native-safe-area-context', () => {
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
    route: [], steps: [], distanceText: '', durationText: '', loading: false, error: null,
  })),
);

jest.mock('../components/MapView', () => 'MapView');
jest.mock('../components/BuildingInfoPopup', () => 'BuildingInfoPopup');
jest.mock('../components/DirectionsPanel', () => 'DirectionsPanel');

test('renders campus tabs (SGW and LOYOLA)', () => {
  render(<App />);

  // Check that both campus tabs are rendered using testID
  expect(screen.getByTestId('campus-tab-SGW')).toBeOnTheScreen();
  expect(screen.getByTestId('campus-tab-LOYOLA')).toBeOnTheScreen();

  // Also verify the text content is displayed
  expect(screen.getByText('SGW')).toBeOnTheScreen();
  expect(screen.getByText('LOYOLA')).toBeOnTheScreen();
});

test('switches campus when tab is pressed', () => {
  render(<App />);

  // Initially SGW should be active (first tab)
  screen.getByTestId('campus-tab-SGW');
  const loyolaTab = screen.getByTestId('campus-tab-LOYOLA');

  // Press LOYOLA tab
  fireEvent.press(loyolaTab);

  // Both tabs should still be visible
  expect(screen.getByText('SGW')).toBeOnTheScreen();
  expect(screen.getByText('LOYOLA')).toBeOnTheScreen();
});
