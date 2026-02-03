import React from 'react';
import { render, screen } from '@testing-library/react-native';
import MapView from './MapView';

const mockCenter = { lat: 0, lng: 0 };
const mockMarkers = [{ id: 1 }, { id: 2 }];

test('renders map view', () => {
  render(<MapView center={mockCenter} zoom={18} markers={mockMarkers} />);
  expect(screen.getByTestId('map-view')).toBeTruthy();
});

test('renders markers', () => {
  render(<MapView center={mockCenter} zoom={18} markers={mockMarkers} />);
  const markers = screen.getAllByTestId('map-marker');
  expect(markers).toHaveLength(2);
});

test('renders with default props', () => {
  render(<MapView center={mockCenter} />);
  expect(screen.getByTestId('map-view')).toBeTruthy();
});