import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MapScreen from './MapScreen';
import * as api from '../services/api';
import * as buildingsApi from '../services/api/buildings';
import useUserLocation from '../hooks/useUserLocation';
import useDirections from '../hooks/useDirections';

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
    buildingsApi.getBuildingCoords.mockReturnValue(null);
  });

  describe('Campus Tabs', () => {
    it('should render campus tabs', () => {
      const { getByTestId } = render(<MapScreen initialShowSearch={true} />);

      expect(getByTestId('campus-tab-SGW')).toBeTruthy();
      expect(getByTestId('campus-tab-LOYOLA')).toBeTruthy();
    });

    it('should switch campus when tab is pressed', () => {
      const { getByTestId } = render(<MapScreen initialShowSearch={true} />);

      const loyolaTab = getByTestId('campus-tab-LOYOLA');
      fireEvent.press(loyolaTab);

      expect(buildingsApi.getBuildingsByCampus).toHaveBeenCalledWith('LOY');
      expect(buildingsApi.getBuildingsByCampus).toHaveBeenCalledWith('SGW');
    });

    it('should keep route selection when switching campus', () => {
      const { getByTestId, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      fireEvent(UNSAFE_getByType('MapView'), 'buildingPress', 'EV');
      fireEvent.press(getByTestId('campus-tab-LOYOLA'));

      const mapViewAfterSwitch = UNSAFE_getByType('MapView');
      expect(mapViewAfterSwitch.props.originBuildingId).toBe('EV');
    });
  });

  describe('Location Status', () => {
    it('should display location message when watching', () => {
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { getByText } = render(<MapScreen initialShowSearch={true} />);

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

      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { getByText } = render(<MapScreen initialShowSearch={true} />);

      expect(getByText(/You are in: Engineering Building/i)).toBeTruthy();
    });

    it('should display error message when location is denied', () => {
      useUserLocation.mockReturnValue({
        status: 'denied',
        coords: null,
        message: 'Location permission denied',
      });

      const { getByText } = render(<MapScreen initialShowSearch={true} />);

      expect(getByText('Location permission denied')).toBeTruthy();
    });

    it('should display error message when location is unavailable', () => {
      useUserLocation.mockReturnValue({
        status: 'unavailable',
        coords: null,
        message: 'Location services are off',
      });

      const { getByText } = render(<MapScreen initialShowSearch={true} />);

      expect(getByText('Location services are off')).toBeTruthy();
    });

    it('should display error message when location has error', () => {
      useUserLocation.mockReturnValue({
        status: 'error',
        coords: null,
        message: 'Location cannot be determined.',
      });

      const { getByText } = render(<MapScreen initialShowSearch={true} />);

      expect(getByText('Location cannot be determined.')).toBeTruthy();
    });

    it('should show finding location message when coords are null', () => {
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: null,
        message: '',
      });

      const { getByText } = render(<MapScreen initialShowSearch={true} />);

      expect(getByText('Finding your location...')).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    it('should update origin query on text input', () => {
      const { getAllByPlaceholderText } = render(<MapScreen initialShowSearch={true} />);

      const originInput = getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');

      expect(originInput.props.value).toBe('EV');
    });

    it('should update destination query on text input', () => {
      const { getAllByPlaceholderText } = render(<MapScreen initialShowSearch={true} />);

      const destInput = getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');

      expect(destInput.props.value).toBe('Hall');
    });

    it('should show suggestions when typing in origin', () => {
      const { getAllByPlaceholderText, getByText } = render(<MapScreen initialShowSearch={true} />);

      const originInput = getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');

      expect(getByText(/EV Building/i)).toBeTruthy();
    });

    it('should show suggestions when typing in destination', () => {
      const { getAllByPlaceholderText, getByText } = render(<MapScreen initialShowSearch={true} />);

      const destInput = getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');

      expect(getByText(/Hall Building/i)).toBeTruthy();
    });

    it('should select origin from suggestions', () => {
      const { getAllByPlaceholderText, getByText } = render(<MapScreen initialShowSearch={true} />);

      const originInput = getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');

      const suggestion = getByText(/EV Building/i);
      fireEvent.press(suggestion);

      expect(originInput.props.value).toContain('EV');
    });

    it('should select destination from suggestions', () => {
      const { getAllByPlaceholderText, getByText } = render(<MapScreen initialShowSearch={true} />);

      const destInput = getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');

      const suggestion = getByText(/Hall Building/i);
      fireEvent.press(suggestion);

      expect(destInput.props.value).toContain('H');
    });

    it('should not show suggestions when query is empty', () => {
      const { getAllByPlaceholderText, queryByText } = render(<MapScreen initialShowSearch={true} />);

      const originInput = getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, '');

      expect(queryByText(/EV Building/i)).toBeNull();
    });

    it('should clear origin query when text is cleared', () => {
      const { getAllByPlaceholderText, getByText } = render(<MapScreen initialShowSearch={true} />);

      const originInput = getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      const suggestion = getByText(/EV Building/i);
      fireEvent.press(suggestion);

      fireEvent.changeText(originInput, '');
      expect(originInput.props.value).toBe('');
    });

    it('should clear destination query when text is cleared', () => {
      const { getAllByPlaceholderText, getByText } = render(<MapScreen initialShowSearch={true} />);

      const destInput = getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');
      const suggestion = getByText(/Hall Building/i);
      fireEvent.press(suggestion);

      fireEvent.changeText(destInput, '');
      expect(destInput.props.value).toBe('');
    });

    it('should clear origin building when clear button is pressed (lines 156-157)', () => {
      const { getAllByPlaceholderText, getByText, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const originInput = getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      const suggestion = getByText(/EV Building/i);
      fireEvent.press(suggestion);

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.originBuildingId).toBe('EV');

      const clearButton = getByText('✕');
      fireEvent.press(clearButton);

      expect(mapView.props.originBuildingId).toBeNull();
      expect(originInput.props.value).toBe('');
    });

    it('should clear destination building when clear button is pressed (lines 161-162)', () => {
      const { getAllByPlaceholderText, getByText, getAllByText, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const originInput = getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      let suggestion = getByText(/EV Building/i);
      fireEvent.press(suggestion);

      const destInput = getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');
      suggestion = getByText(/Hall Building/i);
      fireEvent.press(suggestion);

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.destinationBuildingId).toBe('H');

      const clearButtons = getAllByText('✕');
      fireEvent.press(clearButtons[1]);

      expect(mapView.props.destinationBuildingId).toBeNull();
      expect(mapView.props.originBuildingId).toBe('EV');
      expect(destInput.props.value).toBe('');
    });

    it('should clear both origin and destination when clearRoute is called from DirectionsPanel', () => {
      buildingsApi.getBuildingCoords.mockReturnValue({ latitude: 45.497, longitude: -73.579 });
      const { getAllByPlaceholderText, getByText, getByTestId, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const originInput = getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      fireEvent.press(getByText(/EV Building/i));

      const destInput = getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');
      fireEvent.press(getByText(/Hall Building/i));

      // Use the testID we added for Maestro
      const clearRouteBtn = getByTestId('Clear route');
      fireEvent.press(clearRouteBtn);

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.originBuildingId).toBeNull();
      expect(mapView.props.destinationBuildingId).toBeNull();
      expect(originInput.props.value).toBe('');
      expect(destInput.props.value).toBe('');
    });
  });

  describe('Use Current Building (US-2.2)', () => {
    it('should render the Use Current Location button (📍)', () => {
      const { getByLabelText } = render(<MapScreen initialShowSearch={true} />);
      expect(getByLabelText(/use current location as starting point/i)).toBeTruthy();
    });

    it('should show feedback if location is denied when pressing 📍', () => {
      useUserLocation.mockReturnValue({
        status: 'denied',
        coords: null,
        message: 'Location permission denied',
      });

      const { getByLabelText, getByText } = render(<MapScreen initialShowSearch={true} />);
      fireEvent.press(getByLabelText(/use current location as starting point/i));

      expect(getByText('Location permission denied')).toBeTruthy();
    });

    it('should show feedback "Finding your location..." if coords are null when pressing 📍', () => {
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: null,
        message: '',
      });

      const { getByLabelText, getByText } = render(<MapScreen initialShowSearch={true} />);
      fireEvent.press(getByLabelText(/use current location as starting point/i));

      expect(getByText('Finding your location...')).toBeTruthy();
    });

    it('should show feedback if user is not inside a mapped building when pressing 📍', () => {
      buildingsApi.getBuildingsByCampus.mockReturnValue([]);

      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { getByLabelText, getByText } = render(<MapScreen initialShowSearch={true} />);
      fireEvent.press(getByLabelText(/use current location as starting point/i));

      expect(getByText('You are not inside a mapped building.')).toBeTruthy();
    });

    it('should set origin to current building when pressing 📍 (SGW)', () => {
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

      buildingsApi.getBuildingInfo.mockReturnValue({
        id: 'EV',
        name: 'Engineering Building',
        code: 'EV',
        campus: 'SGW',
      });

      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { getByLabelText, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);
      fireEvent.press(getByLabelText(/use current location as starting point/i));

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.originBuildingId).toBe('EV');
    });

    it('should work for Loyola as well (LOY)', () => {
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

      buildingsApi.getBuildingInfo.mockReturnValue({
        id: 'CC',
        name: 'Central Building',
        code: 'CC',
        campus: 'LOY',
      });

      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.458, longitude: -73.64 },
        message: '',
      });

      const { getByLabelText, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);
      fireEvent.press(getByLabelText(/use current location as starting point/i));

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.originBuildingId).toBe('CC');
    });

    it('should update origin automatically when user moves while originMode is current', () => {
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

      useUserLocation.mockReturnValueOnce({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { getByLabelText, UNSAFE_getByType, rerender } = render(<MapScreen initialShowSearch={true} />);
      fireEvent.press(getByLabelText(/use current location as starting point/i));

      let mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.originBuildingId).toBe('EV');

      useUserLocation.mockReturnValueOnce({
        status: 'watching',
        coords: { latitude: 45.496, longitude: -73.578 },
        message: '',
      });

      rerender(<MapScreen initialShowSearch={true} />);

      mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.originBuildingId).toBe('H');
    });
  });

  describe('Building Selection', () => {
    it('should set origin on first building press', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');
      fireEvent(mapView, 'buildingPress', 'EV');

      expect(mapView.props.originBuildingId).toBe('EV');
    });

    it('should set destination on second building press', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'buildingPress', 'EV');
      fireEvent(mapView, 'buildingPress', 'H');

      expect(mapView.props.originBuildingId).toBe('EV');
      expect(mapView.props.destinationBuildingId).toBe('H');
    });

    it('should update destination on subsequent presses', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'buildingPress', 'EV');
      fireEvent(mapView, 'buildingPress', 'H');

      expect(mapView.props.originBuildingId).toBe('EV');
      expect(mapView.props.destinationBuildingId).toBe('H');
    });

    it('should update destination when both are already set (covers lines 70-72)', () => {
      buildingsApi.getBuildingInfo
        .mockReturnValueOnce({ id: 'EV', name: 'EV Building', code: 'EV' })
        .mockReturnValueOnce({ id: 'H', name: 'Hall Building', code: 'H' })
        .mockReturnValueOnce({ id: 'MB', name: 'Molson Building', code: 'MB' });

      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'buildingPress', 'EV');
      fireEvent(mapView, 'buildingPress', 'H');
      fireEvent(mapView, 'buildingPress', 'MB');

      expect(mapView.props.originBuildingId).toBe('EV');
      expect(mapView.props.destinationBuildingId).toBe('MB');
    });

    it('should not set destination to same as origin on second press', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'buildingPress', 'EV');
      fireEvent(mapView, 'buildingPress', 'EV');

      expect(mapView.props.originBuildingId).toBe('EV');
      expect(mapView.props.destinationBuildingId).toBeNull();
    });
  });

  describe('Popup Interactions', () => {
    it('should open popup on building press', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');
      fireEvent(mapView, 'buildingPress', 'EV');

      const popup = UNSAFE_getByType('BuildingInfoPopup');
      expect(popup.props.visible).toBe(true);
    });

    it('should close popup on close callback', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');
      fireEvent(mapView, 'buildingPress', 'EV');

      const popup = UNSAFE_getByType('BuildingInfoPopup');
      fireEvent(popup, 'close');

      expect(popup.props.visible).toBe(false);
    });

    it('should close popup on more details callback', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');
      fireEvent(mapView, 'buildingPress', 'EV');

      const popup = UNSAFE_getByType('BuildingInfoPopup');
      fireEvent(popup, 'moreDetails');

      expect(popup.props.visible).toBe(false);
    });

    it('should pass building info to popup', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');
      fireEvent(mapView, 'buildingPress', 'EV');

      const popup = UNSAFE_getByType('BuildingInfoPopup');
      expect(popup.props.buildingInfo).toEqual(mockBuildingInfo);
    });
  });

  describe('MapView Integration', () => {
    it('should render MapView with correct props', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.center).toEqual(mockCampuses[0].center);
      expect(mapView.props.buildings).toEqual(mockBuildings);
      expect(mapView.props.zoom).toBe(18);
    });

    it('should pass highlighted building to MapView', () => {
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.highlightedBuildingId).toBeDefined();
    });

    it('should pass origin and destination to MapView', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

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

      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');
      fireEvent(mapView, 'buildingPress', 'UNKNOWN');

      const popup = UNSAFE_getByType('BuildingInfoPopup');
      expect(popup.props.buildingInfo).toBeNull();
    });

    it('should handle empty buildings array', () => {
      buildingsApi.getBuildingsByCampus.mockReturnValue([]);

      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.buildings).toEqual([]);
    });

    it('should clear popup but keep route on campus switch', () => {
      const { getByTestId, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');
      fireEvent(mapView, 'buildingPress', 'EV');

      const loyolaTab = getByTestId('campus-tab-LOYOLA');
      fireEvent.press(loyolaTab);

      const popup = UNSAFE_getByType('BuildingInfoPopup');
      expect(popup.props.visible).toBe(false);
      expect(mapView.props.originBuildingId).toBe('EV');
    });
  });

  describe('Search Toggle FAB', () => {
    it('should toggle search visibility when pressed', () => {
      const { queryByPlaceholderText, getByLabelText } = render(<MapScreen initialShowSearch={false} />);
      expect(queryByPlaceholderText(/Search origin building/i)).toBeNull();

      fireEvent.press(getByLabelText('Toggle search route'));
      expect(queryByPlaceholderText(/Search origin building/i)).toBeTruthy();

      fireEvent.press(getByLabelText('Toggle search route'));
      expect(queryByPlaceholderText(/Search origin building/i)).toBeNull();
    });
  });
});
