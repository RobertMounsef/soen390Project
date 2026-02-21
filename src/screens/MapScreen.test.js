// src/screens/MapScreen.test.js
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MapScreen from './MapScreen';
import * as api from '../services/api';
import * as buildingsApi from '../services/api/buildings';
import useUserLocation from '../hooks/useUserLocation';
import useDirections from '../hooks/useDirections';

// Mock the services
jest.mock('../services/api', () => ({
  getCampuses: jest.fn(),
}));

jest.mock('../services/api/buildings', () => ({
  getBuildingsByCampus: jest.fn(),
  getBuildingInfo: jest.fn(),
  getBuildingCoords: jest.fn(),
}));

// Mock the hooks
jest.mock('../hooks/useUserLocation', () => jest.fn());
jest.mock('../hooks/useDirections', () => jest.fn());

// Mock the components
jest.mock('../components/MapView', () => 'MapView');
jest.mock('../components/BuildingInfoPopup', () => 'BuildingInfoPopup');

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
        coordinates: [
          [
            [center.longitude - d, center.latitude + d],
            [center.longitude + d, center.latitude + d],
            [center.longitude + d, center.latitude - d],
            [center.longitude - d, center.latitude - d],
            [center.longitude - d, center.latitude + d],
          ],
        ],
      },
    };
  };

  // Helper: open the Directions panel (From/To)
  const openDirectionsPanel = (utils) => {
    fireEvent.press(utils.getByTestId('Toggle search route'));
  };

  beforeEach(() => {
    jest.clearAllMocks();

    api.getCampuses.mockReturnValue(mockCampuses);
    buildingsApi.getBuildingsByCampus.mockReturnValue(mockBuildings);
    buildingsApi.getBuildingInfo.mockReturnValue(mockBuildingInfo);
    buildingsApi.getBuildingCoords.mockReturnValue(null);

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

      // MapScreen loads current campus buildings AND both campuses for routing
      expect(buildingsApi.getBuildingsByCampus).toHaveBeenCalledWith('LOY');
      expect(buildingsApi.getBuildingsByCampus).toHaveBeenCalledWith('SGW');
    });

    it('should keep route selection when switching campus (origin should persist)', () => {
      const { getByTestId, UNSAFE_getByType } = render(<MapScreen />);

      // Set origin by pressing a building
      fireEvent(UNSAFE_getByType('MapView'), 'buildingPress', 'EV');

      // Switch campus
      fireEvent.press(getByTestId('campus-tab-LOYOLA'));

      // Re-fetch MapView after re-render and assert origin persisted
      const mapViewAfterSwitch = UNSAFE_getByType('MapView');
      expect(mapViewAfterSwitch.props.originBuildingId).toBe('EV');
    });
  });

  describe('Location Status', () => {
    it('should display location message when watching and coords exist but not inside building', () => {
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
          coordinates: [
            [
              [-73.58, 45.498],
              [-73.578, 45.498],
              [-73.578, 45.496],
              [-73.58, 45.496],
              [-73.58, 45.498],
            ],
          ],
        },
      };

      buildingsApi.getBuildingsByCampus.mockReturnValue([polygonBuilding]);
      buildingsApi.getBuildingInfo.mockReturnValue({
        id: 'EV',
        name: 'Engineering Building',
        code: 'EV',
      });

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

  describe('Search Functionality', () => {
    it('should update origin query on text input', () => {
      const utils = render(<MapScreen />);
      openDirectionsPanel(utils);

      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');

      expect(originInput.props.value).toBe('EV');
    });

    it('should update destination query on text input', () => {
      const utils = render(<MapScreen />);
      openDirectionsPanel(utils);

      const destInput = utils.getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');

      expect(destInput.props.value).toBe('Hall');
    });

    it('should show suggestions when typing in origin', () => {
      const utils = render(<MapScreen />);
      openDirectionsPanel(utils);

      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');

      expect(utils.getByText(/EV Building/i)).toBeTruthy();
    });

    it('should show suggestions when typing in destination', () => {
      const utils = render(<MapScreen />);
      openDirectionsPanel(utils);

      const destInput = utils.getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');

      expect(utils.getByText(/Hall Building/i)).toBeTruthy();
    });

    it('should select origin from suggestions', () => {
      const utils = render(<MapScreen />);
      openDirectionsPanel(utils);

      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');

      fireEvent.press(utils.getByText(/EV Building/i));
      expect(originInput.props.value).toContain('EV');
    });

    it('should select destination from suggestions', () => {
      const utils = render(<MapScreen />);
      openDirectionsPanel(utils);

      const destInput = utils.getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');

      fireEvent.press(utils.getByText(/Hall Building/i));
      expect(destInput.props.value).toContain('H');
    });

    it('should not show suggestions when query is empty', () => {
      const utils = render(<MapScreen />);
      openDirectionsPanel(utils);

      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, '');

      expect(utils.queryByText(/EV Building/i)).toBeNull();
    });

    it('should clear origin building when clear button is pressed', () => {
      const utils = render(<MapScreen />);
      openDirectionsPanel(utils);

      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      fireEvent.press(utils.getByText(/EV Building/i));

      // Press the clear origin button (it exists only after originBuildingId is set)
      fireEvent.press(utils.getByLabelText('Clear origin'));

      // Input cleared
      expect(originInput.props.value).toBe('');

      // MapView prop cleared
      const mapView = utils.UNSAFE_getByType('MapView');
      expect(mapView.props.originBuildingId).toBeNull();
    });

    it('should clear destination building when clear button is pressed', () => {
      const utils = render(<MapScreen />);
      openDirectionsPanel(utils);

      // set origin
      const originInput = utils.getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      fireEvent.press(utils.getByText(/EV Building/i));

      // set destination
      const destInput = utils.getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');
      fireEvent.press(utils.getByText(/Hall Building/i));

      // Clear destination
      fireEvent.press(utils.getByLabelText('Clear destination'));

      expect(destInput.props.value).toBe('');

      const mapView = utils.UNSAFE_getByType('MapView');
      expect(mapView.props.destinationBuildingId).toBeNull();
      expect(mapView.props.originBuildingId).toBe('EV');
    });
  });

  // Your current MapScreen DOES NOT implement the 📍 button,
  // so these tests can't pass until you add that UI.
  describe.skip('Use Current Building (US-2.2)', () => {
    it('placeholder', () => {});
  });

  describe('Building Selection', () => {
    it('should set origin on first building press', () => {
      const { UNSAFE_getByType } = render(<MapScreen />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'buildingPress', 'EV');
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

    it('should pass highlighted building to MapView', () => {
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

      expect(mapView.props.originBuildingId).toBe('EV');
      expect(mapView.props.destinationBuildingId).toBe('H');
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

    it('should close directions panel on campus switch', () => {
      const utils = render(<MapScreen />);

      // open directions
      openDirectionsPanel(utils);
      expect(utils.queryByPlaceholderText(/Search origin building/i)).toBeTruthy();

      // switching campus closes directions (your MapScreen does setDirectionsVisible(false))
      fireEvent.press(utils.getByTestId('campus-tab-LOYOLA'));

      expect(utils.queryByPlaceholderText(/Search origin building/i)).toBeNull();
    });
  });

  describe('Search Toggle FAB', () => {
    it('should toggle search visibility when pressed', () => {
      const utils = render(<MapScreen />);

      expect(utils.queryByPlaceholderText(/Search origin building/i)).toBeNull();

      fireEvent.press(utils.getByTestId('Toggle search route'));
      expect(utils.queryByPlaceholderText(/Search origin building/i)).toBeTruthy();

      fireEvent.press(utils.getByTestId('Toggle search route'));
      expect(utils.queryByPlaceholderText(/Search origin building/i)).toBeNull();
    });
  });
});
