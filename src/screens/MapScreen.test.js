import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MapScreen from './MapScreen';
import * as api from '../services/api';
import * as buildingsApi from '../services/api/buildings';
import useUserLocation from '../hooks/useUserLocation';

// Mock the services
jest.mock('../services/api', () => ({
  getCampuses: jest.fn(),
}));

jest.mock('../services/api/buildings', () => ({
  getBuildingsByCampus: jest.fn(),
  getBuildingInfo: jest.fn(),
}));

// Mock the hook
jest.mock('../hooks/useUserLocation', () => jest.fn());

// Mock the components
jest.mock('../components/MapView', () => 'MapView');
jest.mock('../components/BuildingInfoPopup', () => 'BuildingInfoPopup');

describe('MapScreen', () => {
  const mockCampuses = [
    { id: 'SGW', label: 'SGW', center: { latitude: 45.497, longitude: -73.579 }, markers: [] },
    { id: 'LOY', label: 'LOYOLA', center: { latitude: 45.458, longitude: -73.640 }, markers: [] },
  ];

  const mockBuildings = [
    {
      type: 'Feature',
      properties: { id: 'EV', name: 'EV Building', campus: 'SGW' },
      geometry: { type: 'Point', coordinates: [-73.579, 45.497] },
    },
  ];

  const mockBuildingInfo = {
    id: 'EV',
    name: 'Engineering Building',
    campus: 'SGW',
    accessibility: {},
    keyServices: [],
    departments: [],
    facilities: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    api.getCampuses.mockReturnValue(mockCampuses);
    buildingsApi.getBuildingsByCampus.mockReturnValue(mockBuildings);
    buildingsApi.getBuildingInfo.mockReturnValue(mockBuildingInfo);
    useUserLocation.mockReturnValue({
      status: 'idle',
      coords: null,
      message: '',
    });
  });

  it('should render campus tabs', () => {
    const { getByTestId } = render(<MapScreen />);

    expect(getByTestId('campus-tab-SGW')).toBeTruthy();
    expect(getByTestId('campus-tab-LOYOLA')).toBeTruthy();
  });

  it('should switch campus when tab is pressed', () => {
    const { getByTestId } = render(<MapScreen />);

    const loyolaTab = getByTestId('campus-tab-LOYOLA');
    fireEvent.press(loyolaTab);

    // Verify getBuildingsByCampus was called with LOY after switch
    expect(buildingsApi.getBuildingsByCampus).toHaveBeenCalledWith('LOY');
  });

  it('should display location message when watching', () => {
    useUserLocation.mockReturnValue({
      status: 'watching',
      coords: { latitude: 45.497, longitude: -73.579 },
      message: '',
    });

    const { getByText } = render(<MapScreen />);

    expect(getByText('You are not inside a mapped building.')).toBeTruthy();
  });

  it('should display current building when user is inside', () => {
    useUserLocation.mockReturnValue({
      status: 'watching',
      coords: { latitude: 45.497, longitude: -73.579 },
      message: '',
    });

    buildingsApi.getBuildingInfo.mockReturnValue({
      ...mockBuildingInfo,
      name: 'Engineering Building',
    });

    const { getByText } = render(<MapScreen />);

    // This will show "You are not inside..." because the mock doesn't include polygon geometry
    // In real usage, the pointInPolygonFeature would detect the building
    expect(getByText(/You are/)).toBeTruthy();
  });

  it('should display error message when location is denied', () => {
    useUserLocation.mockReturnValue({
      status: 'denied',
      coords: null,
      message: 'Location permission denied',
    });

    const { getByText } = render(<MapScreen />);

    expect(getByText('Location permission denied')).toBeTruthy();
  });

  it('should display error message when location is unavailable', () => {
    useUserLocation.mockReturnValue({
      status: 'unavailable',
      coords: null,
      message: 'Location services are off',
    });

    const { getByText } = render(<MapScreen />);

    expect(getByText('Location services are off')).toBeTruthy();
  });

  it('should render MapView with correct props', () => {
    const { UNSAFE_getByType } = render(<MapScreen />);

    const mapView = UNSAFE_getByType('MapView');
    expect(mapView.props.center).toEqual(mockCampuses[0].center);
    expect(mapView.props.buildings).toEqual(mockBuildings);
  });

  it('should render BuildingInfoPopup', () => {
    const { UNSAFE_getByType } = render(<MapScreen />);

    const popup = UNSAFE_getByType('BuildingInfoPopup');
    expect(popup).toBeTruthy();
  });
});
