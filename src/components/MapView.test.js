import React from 'react';
import { render, screen } from '@testing-library/react-native';
import MapView from './MapView';

const mockCenter = { latitude: 45.4967, longitude: -73.5789 };
const mockMarkers = [
  { latitude: 45.4967, longitude: -73.5789 },
  { latitude: 45.4581, longitude: -73.6393 },
];

test('renders map view', () => {
  render(<MapView center={mockCenter} zoom={18} markers={mockMarkers} />);
  
  expect(screen.getByTestId('map-view')).toBeOnTheScreen();
});

test('renders markers', () => {
  render(<MapView center={mockCenter} zoom={18} markers={mockMarkers} />);
  
  const markers = screen.getAllByTestId('map-marker');
  expect(markers).toHaveLength(2);
});

test('renders with default props', () => {
  render(<MapView center={mockCenter} />);
  
  expect(screen.getByTestId('map-view')).toBeOnTheScreen();
});
