// src/screens/MapScreen.test.js
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MapScreen from './MapScreen';
import * as api from '../services/api';
import * as buildingsApi from '../services/api/buildings';
import useUserLocation from '../hooks/useUserLocation';
import useDirections from '../hooks/useDirections';
import { getFeatureCenter } from '../utils/geometry';
import { pointInPolygonFeature } from '../utils/geolocation';

jest.mock('../services/api', () => ({
  getCampuses: jest.fn(),
}));

jest.mock('../services/api/buildings', () => ({
  getBuildingsByCampus: jest.fn(),
  getBuildingInfo: jest.fn(),
  getBuildingCoords: jest.fn(),
}));

jest.mock('../hooks/useUserLocation', () => jest.fn());
jest.mock('../hooks/useDirections', () => jest.fn());

jest.mock('../components/MapView', () => 'MapView');
jest.mock('../components/BuildingInfoPopup', () => 'BuildingInfoPopup');

/**
 * NOTE:
 * In your real MapScreen, DirectionsPanel is NOT used (you render buttons directly in the bubble),
 * but some older tests may expect a "Clear route" testID. We keep this mock harmless.
 */
jest.mock('../components/DirectionsPanel', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockDirectionsPanel() {
    return <View />;
  };
});

jest.mock('../utils/geometry', () => ({
  getFeatureCenter: jest.fn(),
}));

jest.mock('../utils/geolocation', () => ({
  pointInPolygonFeature: jest.fn(),
  getBuildingId: jest.fn((f) => f?.properties?.id),
}));

/**
 * MapScreen renders only the toggle button (🗺️) by default in tests.
 * The search inputs + 📍 button appear only AFTER opening the panel.
 */
async function openSearchUI(utils) {
  fireEvent.press(utils.getByTestId('Toggle search route'));

  await waitFor(() => {
    expect(utils.getAllByPlaceholderText(/Search origin building/i).length).toBeGreaterThan(0);
  });
}

describe('MapScreen', () => {
  const mockCampuses = [
    { id: 'SGW', label: 'SGW', center: { latitude: 45.497, longitude: -73.579 }, markers: [] },
    { id: 'LOY', label: 'LOYOLA', center: { latitude: 45.458, longitude: -73.64 }, markers: [] },
  ];

  const mockBuildings = [
    {
      type: 'Feature',
      properties: { id: 'EV', name: 'EV Building', code: 'EV', campus: 'SGW' },
      geometry: { type: 'Point', coordinates: [-73.579, 45.497] },
    },
    {
      type: 'Feature',
      properties: { id: 'H', name: 'Hall Building', code: 'H', campus: 'SGW' },
      geometry: { type: 'Point', coordinates: [-73.578, 45.496] },
    },
  ];

  const mockBuildingInfo = {
    id: 'EV',
    name: 'Engineering Building',
    code: 'EV',
    campus: 'SGW',
    accessibility: {},
    keyServices: [],
    departments: [],
    facilities: [],
  };

  const makeSquarePolygon = ({ id, name, code, campus, center }) => {
    const d = 0.0002;
    return {
      type: 'Feature',
      properties: { id, name, code, campus },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [center.longitude - d, center.latitude + d],
          [center.longitude + d, center.latitude + d],
          [center.longitude + d, center.latitude - d],
          [center.longitude - d, center.latitude - d],
          [center.longitude - d, center.latitude + d],
        ]],
      },
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    api.getCampuses.mockReturnValue(mockCampuses);
    buildingsApi.getBuildingsByCampus.mockReturnValue(mockBuildings);
    buildingsApi.getBuildingInfo.mockReturnValue(mockBuildingInfo);
    buildingsApi.getBuildingCoords.mockReturnValue(null);

    pointInPolygonFeature.mockReturnValue(false); // default: not in a polygon

    useUserLocation.mockReturnValue({
      status: 'idle',
      coords: null,
      message: '',
    });

    useDirections.mockReturnValue({
      route: [],
      steps: [],
      distanceText: '',
      durationText: '',
      loading: false,
      error: null,
    });

    getFeatureCenter.mockReset();
  });

  describe('Campus Tabs', () => {
    it('should render campus tabs', () => {
      const { getByTestId } = render(<MapScreen />);
      expect(getByTestId('campus-tab-SGW')).toBeTruthy();
      expect(getByTestId('campus-tab-LOYOLA')).toBeTruthy();
    });

    it('should switch campus when tab is pressed', () => {
      const { getByTestId } = render(<MapScreen />);
      fireEvent.press(getByTestId('campus-tab-LOYOLA'));

      expect(buildingsApi.getBuildingsByCampus).toHaveBeenCalledWith('LOY');
      expect(buildingsApi.getBuildingsByCampus).toHaveBeenCalledWith('SGW');
    });

    it('should keep route selection when switching campus', () => {
      const { getByTestId, UNSAFE_getByType } = render(<MapScreen />);
      fireEvent(UNSAFE_getByType('MapView'), 'buildingPress', 'EV');
      fireEvent.press(getByTestId('campus-tab-LOYOLA'));

      const mapViewAfterSwitch = UNSAFE_getByType('MapView');
      expect(mapViewAfterSwitch.props.originBuildingId).toBe('EV');
    });
  });

  describe('Location Status', () => {
    it('should display location message when watching (not inside a building)', () => {
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { getByText } = render(<MapScreen />);
      expect(getByText('You are not inside a mapped building.')).toBeTruthy();
    });

    it('should detect when user is inside a polygon building', () => {
      const polygonBuilding = {
        type: 'Feature',
        properties: { id: 'EV', name: 'EV Building', code: 'EV', campus: 'SGW' },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-73.58, 45.498],
            [-73.578, 45.498],
            [-73.578, 45.496],
            [-73.58, 45.496],
            [-73.58, 45.498],
          ]],
        },
      };

      buildingsApi.getBuildingsByCampus.mockReturnValue([polygonBuilding]);
      buildingsApi.getBuildingInfo.mockReturnValue({
        id: 'EV',
        name: 'Engineering Building',
        code: 'EV',
      });

      pointInPolygonFeature.mockReturnValue(true);

      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { getByText } = render(<MapScreen />);
      expect(getByText(/You are in: Engineering Building/i)).toBeTruthy();
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

    it('should display error message when location has error', () => {
      useUserLocation.mockReturnValue({
        status: 'error',
        coords: null,
        message: 'Location cannot be determined.',
      });

      const { getByText } = render(<MapScreen />);
      expect(getByText('Location cannot be determined.')).toBeTruthy();
    });

    it('should show finding location message when coords are null', () => {
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: null,
        message: '',
      });

      const { getByText } = render(<MapScreen />);
      expect(getByText('Finding your location...')).toBeTruthy();
    });
  });

  describe('Search Toggle FAB', () => {
    it('should toggle search visibility when pressed', async () => {
      const utils = render(<MapScreen />);

      // starts hidden
      expect(utils.queryByPlaceholderText(/Search origin building/i)).toBeNull();

      // open
      fireEvent.press(utils.getByTestId('Toggle search route'));
      await waitFor(() => {
        expect(utils.queryByPlaceholderText(/Search origin building/i)).toBeTruthy();
      });

      // close
      fireEvent.press(utils.getByTestId('Toggle search route'));
      await waitFor(() => {
        expect(utils.queryByPlaceholderText(/Search origin building/i)).toBeNull();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should update origin query on text input', async () => {
      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      expect(originInput.props.value).toBe('EV');
    });

    it('should update destination query on text input', async () => {
      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      const destInput = utils.getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');
      expect(destInput.props.value).toBe('Hall');
    });

    it('should show suggestions when typing in origin', async () => {
      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      expect(utils.getByText(/EV Building/i)).toBeTruthy();
    });

    it('should show suggestions when typing in destination', async () => {
      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      const destInput = utils.getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');
      expect(utils.getByText(/Hall Building/i)).toBeTruthy();
    });

    it('should select origin from suggestions', async () => {
      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');

      fireEvent.press(utils.getByText(/EV Building/i));
      expect(originInput.props.value).toContain('EV');
    });

    it('should select destination from suggestions', async () => {
      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      const destInput = utils.getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');

      fireEvent.press(utils.getByText(/Hall Building/i));
      expect(destInput.props.value).toContain('H');
    });

    it('should not show suggestions when query is empty', async () => {
      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, '');
      expect(utils.queryByText(/EV Building/i)).toBeNull();
    });

    it('should clear origin building when clear button is pressed', async () => {
      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      fireEvent.press(utils.getByText(/EV Building/i));

      const mapView = utils.UNSAFE_getByType('MapView');
      expect(mapView.props.originBuildingId).toBe('EV');

      // origin clear
      fireEvent.press(utils.getByText('✕'));

      const mapViewAfter = utils.UNSAFE_getByType('MapView');
      expect(mapViewAfter.props.originBuildingId).toBeNull();
      expect(originInput.props.value).toBe('');
    });

    it('should clear destination building when clear button is pressed', async () => {
      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      fireEvent.press(utils.getByText(/EV Building/i));

      const destInput = utils.getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');
      fireEvent.press(utils.getByText(/Hall Building/i));

      const mapView = utils.UNSAFE_getByType('MapView');
      expect(mapView.props.destinationBuildingId).toBe('H');

      // destination clear (second ✕)
      const clearButtons = utils.getAllByText('✕');
      fireEvent.press(clearButtons[1]);

      const mapViewAfter = utils.UNSAFE_getByType('MapView');
      expect(mapViewAfter.props.destinationBuildingId).toBeNull();
      expect(destInput.props.value).toBe('');
    });

    it('should clear both origin and destination when Clear route is pressed', async () => {
      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      fireEvent.press(utils.getByText(/EV Building/i));

      const destInput = utils.getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');
      fireEvent.press(utils.getByText(/Hall Building/i));

      // This is the real button in your MapScreen bubble
      fireEvent.press(utils.getByTestId('Clear route'));

      const mapView = utils.UNSAFE_getByType('MapView');
      expect(mapView.props.originBuildingId).toBeNull();
      expect(mapView.props.destinationBuildingId).toBeNull();
      expect(originInput.props.value).toBe('');
      expect(destInput.props.value).toBe('');
    });
  });

  describe('Use Current Building (US-2.2)', () => {
    it('should render the Use Current Location button (📍)', async () => {
      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      expect(utils.getByLabelText(/use current location as starting point/i)).toBeTruthy();
    });

    it('should show feedback if location is denied when pressing 📍', async () => {
      useUserLocation.mockReturnValue({
        status: 'denied',
        coords: null,
        message: 'Location permission denied',
      });

      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      fireEvent.press(utils.getByLabelText(/use current location as starting point/i));
      expect(utils.getByText('Location permission denied')).toBeTruthy();
    });

    it('should show feedback "Finding your location..." if coords are null when pressing 📍', async () => {
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: null,
        message: '',
      });

      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      fireEvent.press(utils.getByLabelText(/use current location as starting point/i));
      expect(utils.getByText('Finding your location...')).toBeTruthy();
    });

    it('should show feedback if user is not inside a mapped building when pressing 📍', async () => {
      buildingsApi.getBuildingsByCampus.mockReturnValue([]);

      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      fireEvent.press(utils.getByLabelText(/use current location as starting point/i));
      expect(utils.getByText('You are not inside a mapped building.')).toBeTruthy();
    });

    it('should set origin to current building when pressing 📍 (SGW)', async () => {
      const sgwPoly = makeSquarePolygon({
        id: 'EV',
        name: 'Engineering Building',
        code: 'EV',
        campus: 'SGW',
        center: { latitude: 45.497, longitude: -73.579 },
      });

      buildingsApi.getBuildingsByCampus.mockImplementation((campusId) => {
        if (campusId === 'SGW') return [sgwPoly];
        if (campusId === 'LOY') return [];
        return [];
      });

      // ensure "inside polygon"
      pointInPolygonFeature.mockReturnValue(true);

      buildingsApi.getBuildingInfo.mockImplementation((id) => {
        if (id === 'EV') return { id: 'EV', name: 'Engineering Building', code: 'EV', campus: 'SGW' };
        return null;
      });

      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      fireEvent.press(utils.getByLabelText(/use current location as starting point/i));

      await waitFor(() => {
        const mapView = utils.UNSAFE_getByType('MapView');
        expect(mapView.props.originBuildingId).toBe('EV');
      });
    });

    it('should work for Loyola as well (LOY)', async () => {
      const loyPoly = makeSquarePolygon({
        id: 'CC',
        name: 'Central Building',
        code: 'CC',
        campus: 'LOY',
        center: { latitude: 45.458, longitude: -73.64 },
      });

      buildingsApi.getBuildingsByCampus.mockImplementation((campusId) => {
        if (campusId === 'SGW') return [];
        if (campusId === 'LOY') return [loyPoly];
        return [];
      });

      pointInPolygonFeature.mockReturnValue(true);

      buildingsApi.getBuildingInfo.mockImplementation((id) => {
        if (id === 'CC') return { id: 'CC', name: 'Central Building', code: 'CC', campus: 'LOY' };
        return null;
      });

      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.458, longitude: -73.64 },
        message: '',
      });

      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      fireEvent.press(utils.getByLabelText(/use current location as starting point/i));

      await waitFor(() => {
        const mapView = utils.UNSAFE_getByType('MapView');
        expect(mapView.props.originBuildingId).toBe('CC');
      });
    });

    it('should update origin automatically when user moves while originMode is current', async () => {
      const evPoly = makeSquarePolygon({
        id: 'EV',
        name: 'Engineering Building',
        code: 'EV',
        campus: 'SGW',
        center: { latitude: 45.497, longitude: -73.579 },
      });

      const hPoly = makeSquarePolygon({
        id: 'H',
        name: 'Hall Building',
        code: 'H',
        campus: 'SGW',
        center: { latitude: 45.496, longitude: -73.578 },
      });

      buildingsApi.getBuildingsByCampus.mockImplementation((campusId) => {
        if (campusId === 'SGW') return [evPoly, hPoly];
        if (campusId === 'LOY') return [];
        return [];
      });

      buildingsApi.getBuildingInfo.mockImplementation((id) => {
        if (id === 'EV') return { id: 'EV', name: 'Engineering Building', code: 'EV', campus: 'SGW' };
        if (id === 'H') return { id: 'H', name: 'Hall Building', code: 'H', campus: 'SGW' };
        return null;
      });

      
      const { pointInPolygonFeature } = require('../utils/geolocation');

      
      pointInPolygonFeature.mockImplementation((_point, feature) =>
          feature?.properties?.id === 'EV'
      );

      useUserLocation.mockReturnValueOnce({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const utils = render(<MapScreen />);
      await openSearchUI(utils);

      fireEvent.press(utils.getByLabelText(/use current location as starting point/i));

      await waitFor(() => {
        const mapView = utils.UNSAFE_getByType('MapView');
        expect(mapView.props.originBuildingId).toBe('EV');
      });

      
      pointInPolygonFeature.mockImplementation((_point, feature) =>
          feature?.properties?.id === 'H'
      );

      useUserLocation.mockReturnValueOnce({
        status: 'watching',
        coords: { latitude: 45.496, longitude: -73.578 },
        message: '',
      });

      utils.rerender(<MapScreen />);

      await waitFor(() => {
        const mapView = utils.UNSAFE_getByType('MapView');
        expect(mapView.props.originBuildingId).toBe('H');
      });
    });
  });
  
  describe('Building Selection', () => {
    it('should set origin on first building press', () => {
      const { UNSAFE_getByType } = render(<MapScreen />);
      fireEvent(UNSAFE_getByType('MapView'), 'buildingPress', 'EV');

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.originBuildingId).toBe('EV');
    });

    it('should set destination on second building press', () => {
      const { UNSAFE_getByType } = render(<MapScreen />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'buildingPress', 'EV');
      fireEvent(mapView, 'buildingPress', 'H');

      expect(mapView.props.originBuildingId).toBe('EV');
      expect(mapView.props.destinationBuildingId).toBe('H');
    });

    it('should update destination when both are already set', () => {
      buildingsApi.getBuildingInfo
          .mockReturnValueOnce({ id: 'EV', name: 'EV Building', code: 'EV' })
          .mockReturnValueOnce({ id: 'H', name: 'Hall Building', code: 'H' })
          .mockReturnValueOnce({ id: 'MB', name: 'Molson Building', code: 'MB' });

      const { UNSAFE_getByType } = render(<MapScreen />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'buildingPress', 'EV');
      fireEvent(mapView, 'buildingPress', 'H');
      fireEvent(mapView, 'buildingPress', 'MB');

      expect(mapView.props.originBuildingId).toBe('EV');
      expect(mapView.props.destinationBuildingId).toBe('MB');
    });

    it('should not set destination to same as origin on second press', () => {
      const { UNSAFE_getByType } = render(<MapScreen />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'buildingPress', 'EV');
      fireEvent(mapView, 'buildingPress', 'EV');

      expect(mapView.props.originBuildingId).toBe('EV');
      expect(mapView.props.destinationBuildingId).toBeNull();
    });
  });

  describe('Popup Interactions', () => {
    it('should open popup on building press', () => {
      const { UNSAFE_getByType } = render(<MapScreen />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'buildingPress', 'EV');

      const popup = UNSAFE_getByType('BuildingInfoPopup');
      expect(popup.props.visible).toBe(true);
    });

    it('should close popup on onClose', () => {
      const { UNSAFE_getByType } = render(<MapScreen />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'buildingPress', 'EV');
      const popup = UNSAFE_getByType('BuildingInfoPopup');

      fireEvent(popup, 'close');

      const popupAfter = UNSAFE_getByType('BuildingInfoPopup');
      expect(popupAfter.props.visible).toBe(false);
    });

    it('should close popup on onMoreDetails', () => {
      const { UNSAFE_getByType } = render(<MapScreen />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'buildingPress', 'EV');
      const popup = UNSAFE_getByType('BuildingInfoPopup');

      fireEvent(popup, 'moreDetails');

      const popupAfter = UNSAFE_getByType('BuildingInfoPopup');
      expect(popupAfter.props.visible).toBe(false);
    });

    it('should pass building info to popup', () => {
      const { UNSAFE_getByType } = render(<MapScreen />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'buildingPress', 'EV');
      const popup = UNSAFE_getByType('BuildingInfoPopup');

      expect(popup.props.buildingInfo).toEqual(mockBuildingInfo);
    });
  });

  describe('MapView Integration', () => {
    it('should render MapView with correct props', () => {
      const { UNSAFE_getByType } = render(<MapScreen />);
      const mapView = UNSAFE_getByType('MapView');

      expect(mapView.props.center).toEqual(mockCampuses[0].center);
      expect(mapView.props.buildings).toEqual(mockBuildings);
      expect(mapView.props.zoom).toBe(18);
    });

    it('should pass highlighted building to MapView (when inside polygon)', () => {
      const polygonBuilding = makeSquarePolygon({
        id: 'EV',
        name: 'Engineering Building',
        code: 'EV',
        campus: 'SGW',
        center: { latitude: 45.497, longitude: -73.579 },
      });

      buildingsApi.getBuildingsByCampus.mockImplementation((campusId) => {
        if (campusId === 'SGW') return [polygonBuilding];
        if (campusId === 'LOY') return [];
        return [];
      });

      pointInPolygonFeature.mockReturnValue(true);

      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { UNSAFE_getByType } = render(<MapScreen />);
      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.highlightedBuildingId).toBeDefined();
    });

    it('should pass origin and destination to MapView', () => {
      const { UNSAFE_getByType } = render(<MapScreen />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'buildingPress', 'EV');
      fireEvent(mapView, 'buildingPress', 'H');

      const mapViewAfter = UNSAFE_getByType('MapView');
      expect(mapViewAfter.props.originBuildingId).toBe('EV');
      expect(mapViewAfter.props.destinationBuildingId).toBe('H');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null building info gracefully', () => {
      buildingsApi.getBuildingInfo.mockReturnValue(null);

      const { UNSAFE_getByType } = render(<MapScreen />);
      const mapView = UNSAFE_getByType('MapView');
      fireEvent(mapView, 'buildingPress', 'UNKNOWN');

      const popup = UNSAFE_getByType('BuildingInfoPopup');
      expect(popup.props.buildingInfo).toBeNull();
    });

    it('should handle empty buildings array', () => {
      buildingsApi.getBuildingsByCampus.mockReturnValue([]);

      const { UNSAFE_getByType } = render(<MapScreen />);
      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.buildings).toEqual([]);
    });

    it('should clear popup but keep route on campus switch', () => {
      const { getByTestId, UNSAFE_getByType } = render(<MapScreen />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'buildingPress', 'EV');
      fireEvent.press(getByTestId('campus-tab-LOYOLA'));

      const popup = UNSAFE_getByType('BuildingInfoPopup');
      expect(popup.props.visible).toBe(false);

      const mapViewAfter = UNSAFE_getByType('MapView');
      expect(mapViewAfter.props.originBuildingId).toBe('EV');
    });
  });

  describe('Coverage for routing & new handlers', () => {
    it('should NOT navigate if origin or destination is missing (covers early return)', async () => {
      const onGoToRoutes = jest.fn();
      const utils = render(<MapScreen onGoToRoutes={onGoToRoutes} />);
      await openSearchUI(utils);

      // select ONLY origin
      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      fireEvent.press(utils.getByText(/EV Building/i));

      // "Go to routes" arrow is only shown when destinationBuildingId exists,
      // so it should NOT exist yet (and navigation should not happen)
      expect(utils.queryByLabelText(/go to routes/i)).toBeNull();
      expect(onGoToRoutes).not.toHaveBeenCalled();
    });

    it('should fallback to GPS coords when origin center is missing (covers safeStart)', async () => {
      const onGoToRoutes = jest.fn();

      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.501, longitude: -73.58 },
        message: '',
      });

      // startCoord null -> fallback to GPS; endCoord exists
      getFeatureCenter
          .mockReturnValueOnce(null) // originFeature
          .mockReturnValueOnce({ latitude: 45.458, longitude: -73.64 }); // destFeature

      const utils = render(<MapScreen onGoToRoutes={onGoToRoutes} />);
      await openSearchUI(utils);

      // origin
      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      fireEvent.press(utils.getByText(/EV Building/i));

      // destination
      const destInput = utils.getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');
      fireEvent.press(utils.getByText(/Hall Building/i));

      // real trigger in your MapScreen:
      fireEvent.press(utils.getByLabelText(/go to routes/i));

      expect(onGoToRoutes).toHaveBeenCalled();
      const call = onGoToRoutes.mock.calls[0][0];
      expect(call.start.latitude).toBe(45.501);
      expect(call.start.longitude).toBe(-73.58);
      expect(call.end.latitude).toBe(45.458);
      expect(call.end.longitude).toBe(-73.64);
    });

    it('should log and return when coordinates are missing (covers missing coords branch)', async () => {
      const onGoToRoutes = jest.fn();

      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: null,
        message: '',
      });

      // both null -> triggers log + return
      getFeatureCenter.mockReturnValue(null);

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const utils = render(<MapScreen onGoToRoutes={onGoToRoutes} />);
      await openSearchUI(utils);

      // origin
      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      fireEvent.press(utils.getByText(/EV Building/i));

      // destination
      const destInput = utils.getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');
      fireEvent.press(utils.getByText(/Hall Building/i));

      // try go
      fireEvent.press(utils.getByLabelText(/go to routes/i));

      expect(logSpy).toHaveBeenCalled();
      expect(onGoToRoutes).not.toHaveBeenCalled();

      logSpy.mockRestore();
    });

    it('should log and return when onGoToRoutes is missing (covers typeof check)', async () => {
      // Provide good coords so we pass coord checks first
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.501, longitude: -73.58 },
        message: '',
      });

      getFeatureCenter
          .mockReturnValueOnce({ latitude: 45.497, longitude: -73.579 }) // originFeature
          .mockReturnValueOnce({ latitude: 45.458, longitude: -73.64 }); // destFeature

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      const utils = render(<MapScreen /* onGoToRoutes intentionally omitted */ />);
      await openSearchUI(utils);

      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      fireEvent.press(utils.getByText(/EV Building/i));

      const destInput = utils.getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');
      fireEvent.press(utils.getByText(/Hall Building/i));

      fireEvent.press(utils.getByLabelText(/go to routes/i));

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should set FROM from selected building when popup mapPress is triggered (covers new code)', () => {
      const utils = render(<MapScreen />);
      const mapView = utils.UNSAFE_getByType('MapView');

      // select building -> popup visible + selectedBuildingId set
      fireEvent(mapView, 'buildingPress', 'EV');

      const popup = utils.UNSAFE_getByType('BuildingInfoPopup');
      fireEvent(popup, 'mapPress'); // triggers BuildingInfoPopup onMapPress handler in MapScreen

      const mapViewAfter = utils.UNSAFE_getByType('MapView');
      expect(mapViewAfter.props.originBuildingId).toBe('EV');
      expect(mapViewAfter.props.destinationBuildingId).toBeNull();
    });

    it('should close directions and clear route when Close directions is pressed', async () => {
      const utils = render(<MapScreen />);

      // open bubble
      fireEvent.press(utils.getByTestId('Toggle search route'));
      await waitFor(() => {
        expect(utils.queryByPlaceholderText(/Search origin building/i)).toBeTruthy();
      });

      // close bubble (this covers setDirectionsVisible(false); clearRoute();)
      fireEvent.press(utils.getByLabelText(/close directions/i));

      await waitFor(() => {
        expect(utils.queryByPlaceholderText(/Search origin building/i)).toBeNull();
      });
    });
  });
});
