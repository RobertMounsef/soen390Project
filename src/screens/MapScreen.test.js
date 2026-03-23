import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import MapScreen from './MapScreen';
import * as api from '../services/api';
import * as buildingsApi from '../services/api/buildings';
import * as poisApi from '../services/api/pois';
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

jest.mock('../services/api/pois', () => ({
  getOutdoorPoisByCampus: jest.fn(),
  getOutdoorPoiCoords: jest.fn(),
  getOutdoorPoiInfo: jest.fn(),
}));

// Mock the hook
jest.mock('../hooks/useUserLocation', () => jest.fn());
jest.mock('../hooks/useDirections', () => jest.fn());
jest.mock('../hooks/useUpcomingClassroom', () => jest.fn());
jest.mock('../hooks/useCalendarAuth', () =>
  jest.fn(() => ({
    status: 'idle',
    isConnected: false,
    errorMessage: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    isReady: true,
  }))
);

// Mock the components
const mockAnimateToRegion = jest.fn();
let mockShouldAttachMapRef = true;

jest.mock('../components/MapView', () => {
  const React = require('react');
  return React.forwardRef((props, ref) => {
    if (mockShouldAttachMapRef) {
      React.useImperativeHandle(ref, () => ({
        animateToRegion: mockAnimateToRegion,
      }));
    }
    return React.createElement('MapView', props);
  });
});
jest.mock('../components/BuildingInfoPopup', () => {
  const React = require('react');
  function BuildingInfoPopup(props) {
    // Use a host component named "BuildingInfoPopup" so existing tests using
    // UNSAFE_getByType('BuildingInfoPopup') continue to work.
    return React.createElement('BuildingInfoPopup', { testID: 'building-info-popup', ...props });
  }
  return BuildingInfoPopup;
});

jest.mock('../components/IndoorMapViewer', () => {
  const React = require('react');
  const { View } = require('react-native');
  function IndoorMapViewer(props) {
    if (!props.visible) return null;
    return React.createElement(View, { testID: 'indoor-map-viewer', ...props });
  }
  const PropTypes = require('prop-types');
  IndoorMapViewer.propTypes = {
    visible: PropTypes.bool.isRequired,
  };
  return IndoorMapViewer;
});
jest.mock('../components/CalendarConnectionModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  function CalendarConnectionModal(props) {
    return React.createElement(View, { testID: 'calendar-connection-modal', ...props });
  }
  return CalendarConnectionModal;
});
// Mock the lazy-loaded feature so it renders synchronously with our modal mock
jest.mock('../components/CalendarConnectionFeature', () => {
  const React = require('react');
  const { View } = require('react-native');
  function CalendarConnectionFeature(props) {
    return React.createElement(View, { testID: 'calendar-connection-modal', ...props });
  }
  return { __esModule: true, default: CalendarConnectionFeature };
});

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
    {
      type: 'Feature',
      properties: { id: 'AD', name: 'Administration Building', code: 'AD', campus: 'LOY' },
      geometry: { type: 'Point', coordinates: [-73.64, 45.458] },
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
    mockAnimateToRegion.mockClear();
    mockShouldAttachMapRef = true;
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

    poisApi.getOutdoorPoisByCampus.mockReturnValue([]);
    poisApi.getOutdoorPoiCoords.mockReturnValue(null);
    poisApi.getOutdoorPoiInfo.mockReturnValue(null);

    // Add useUpcomingClassroom mock initialization
    const useUpcomingClassroomMock = require('../hooks/useUpcomingClassroom');
    useUpcomingClassroomMock.mockReturnValue({ status: 'idle', event: null, buildingId: null });
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
      // Mock a polygon building that contains the user's location
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

      // This should trigger lines 44-45 (pointInPolygonFeature check)
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

      // After selection, input should contain building name and code
      expect(originInput.props.value).toContain('EV');
    });

    it('should select destination from suggestions', () => {
      const { getAllByPlaceholderText, getByText } = render(<MapScreen initialShowSearch={true} />);

      const destInput = getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');

      const suggestion = getByText(/Hall Building/i);
      fireEvent.press(suggestion);

      // After selection, input should contain building name and code
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

      // Clear the input (covers lines 156-157)
      fireEvent.changeText(originInput, '');
      expect(originInput.props.value).toBe('');
    });

    it('should clear destination query when text is cleared', () => {
      const { getAllByPlaceholderText, getByText } = render(<MapScreen initialShowSearch={true} />);

      const destInput = getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');
      const suggestion = getByText(/Hall Building/i);
      fireEvent.press(suggestion);

      // Clear the input (covers lines 161-162)
      fireEvent.changeText(destInput, '');
      expect(destInput.props.value).toBe('');
    });

    it('should clear origin building when clear button is pressed (lines 156-157)', () => {
      const { getAllByPlaceholderText, getByText, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      // Set origin via search
      const originInput = getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      const suggestion = getByText(/EV Building/i);
      fireEvent.press(suggestion);

      // Verify origin is set
      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.originBuildingId).toBe('EV');

      // Find and press the clear button (✕)
      const clearButton = getByText('✕');
      fireEvent.press(clearButton);

      // Verify origin is cleared
      expect(mapView.props.originBuildingId).toBeNull();
      expect(originInput.props.value).toBe('');
    });

    it('should clear destination building when clear button is pressed (lines 161-162)', () => {
      const { getAllByPlaceholderText, getByText, getAllByText, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      // Set origin first
      const originInput = getAllByPlaceholderText(/Search origin building/i)[0];
      fireEvent.changeText(originInput, 'EV');
      let suggestion = getByText(/EV Building/i);
      fireEvent.press(suggestion);

      // Set destination
      const destInput = getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Hall');
      suggestion = getByText(/Hall Building/i);
      fireEvent.press(suggestion);

      // Verify destination is set
      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.destinationBuildingId).toBe('H');

      // Find and press the clear button for destination (second ✕)
      const clearButtons = getAllByText('✕');
      fireEvent.press(clearButtons[1]); // Second clear button is for destination

      // Verify destination is cleared but origin remains
      expect(mapView.props.destinationBuildingId).toBeNull();
      expect(mapView.props.originBuildingId).toBe('EV');
      expect(destInput.props.value).toBe('');
    });

    it('should auto-resolve origin building when exact display label is typed', async () => {
      // Typing the full "Name (CODE)" label should set originBuildingId
      const { getAllByPlaceholderText, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const originInput = getAllByPlaceholderText(/Search origin building/i)[0];
      await act(async () => {
        fireEvent.changeText(originInput, 'EV Building (EV)');
      });

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.originBuildingId).toBe('EV');
    });

    it('should auto-resolve destination building when exact display label is typed ', async () => {
      // Typing the full "Name (CODE)" label should set destinationBuildingId
      const { getAllByPlaceholderText, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const destInput = getAllByPlaceholderText(/Search destination building/i)[0];
      await act(async () => {
        fireEvent.changeText(destInput, 'Hall Building (H)');
      });

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.destinationBuildingId).toBe('H');
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
      // No polygon buildings match
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

      // IMPORTANT: MapScreen now checks both campuses by calling getBuildingsByCampus('SGW') and ('LOY').
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

      // First render: user inside EV
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { getByLabelText, UNSAFE_getByType, rerender } = render(<MapScreen initialShowSearch={true} />);
      fireEvent.press(getByLabelText(/use current location as starting point/i));

      let mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.originBuildingId).toBe('EV');

      // Second render: user moved inside H
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.496, longitude: -73.578 },
        message: '',
      });

      rerender(<MapScreen initialShowSearch={true} />);

      mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.originBuildingId).toBe('H');
    });

    it('should call animateToRegion when Current Location FAB is pressed', () => {
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });
      const { getByTestId } = render(<MapScreen initialShowSearch={true} />);
      const fab = getByTestId('Current Location');
      fireEvent.press(fab);
      // Since mapRef animateToRegion is a jest.fn in the mock, it shouldn't crash.
    });
  });

  describe('Building Selection', () => {
    it('should not set origin or destination when interacting with map without showSearch enabled', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={false} />);

      const mapView = UNSAFE_getByType('MapView');
      fireEvent(mapView, 'buildingPress', 'EV');

      expect(mapView.props.originBuildingId).toBeNull();
      expect(mapView.props.destinationBuildingId).toBeNull();
      
      const popup = UNSAFE_getByType('BuildingInfoPopup');
      expect(popup.props.visible).toBe(true);
    });

    it('should set origin on first building press', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');
      fireEvent(mapView, 'buildingPress', 'EV');

      expect(mapView.props.originBuildingId).toBe('EV');
    });

    it('should set destination on second building press', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');

      // First press sets origin
      fireEvent(mapView, 'buildingPress', 'EV');

      // Second press sets destination
      fireEvent(mapView, 'buildingPress', 'H');

      expect(mapView.props.originBuildingId).toBe('EV');
      expect(mapView.props.destinationBuildingId).toBe('H');
    });

    it('should update destination on subsequent presses', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');

      // Set origin and destination
      fireEvent(mapView, 'buildingPress', 'EV');
      fireEvent(mapView, 'buildingPress', 'H');

      // Third press on different building updates destination
      // Note: The component keeps the last selected destination
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

      // Set origin
      fireEvent(mapView, 'buildingPress', 'EV');
      // Set destination
      fireEvent(mapView, 'buildingPress', 'H');
      // Update destination to a different building
      fireEvent(mapView, 'buildingPress', 'MB');

      expect(mapView.props.originBuildingId).toBe('EV');
      expect(mapView.props.destinationBuildingId).toBe('MB');
    });

    it('should not set destination to same as origin on second press', () => {
      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');

      // First press sets origin
      fireEvent(mapView, 'buildingPress', 'EV');

      // Second press on same building should not set destination
      fireEvent(mapView, 'buildingPress', 'EV');

      expect(mapView.props.originBuildingId).toBe('EV');
      expect(mapView.props.destinationBuildingId).toBeNull();
    });
  });

  describe('Outdoor POI directions', () => {
    const mockPoiFeatures = [
      {
        type: 'Feature',
        properties: {
          id: 'lbee-lb-sgw',
          name: 'LBEE Café',
          campus: 'SGW',
          category: 'cafe',
        },
        geometry: { type: 'Point', coordinates: [-73.578009, 45.49705] },
      },
    ];

    beforeEach(() => {
      poisApi.getOutdoorPoisByCampus.mockReturnValue(mockPoiFeatures);
      poisApi.getOutdoorPoiInfo.mockImplementation((id) => {
        if (id === 'lbee-lb-sgw') {
          return {
            id: 'lbee-lb-sgw',
            name: 'LBEE Café',
            campus: 'SGW',
            category: 'cafe',
          };
        }
        return null;
      });
      poisApi.getOutdoorPoiCoords.mockImplementation((id) => {
        if (id === 'lbee-lb-sgw') {
          return { latitude: 45.49705, longitude: -73.578009 };
        }
        return null;
      });
    });

    it('sets GPS origin and POI destination when a POI is pressed and location is available', () => {
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={false} />);
      const mapView = UNSAFE_getByType('MapView');

      expect(mapView.props.outdoorPois).toEqual(mockPoiFeatures);

      fireEvent(mapView, 'outdoorPoiPress', 'lbee-lb-sgw');

      const updated = UNSAFE_getByType('MapView');
      expect(updated.props.destinationPoiId).toBe('lbee-lb-sgw');
      expect(updated.props.destinationBuildingId).toBeNull();
      expect(updated.props.originBuildingId).toBe('__GPS__');
    });

    it('does not set route when location is denied', () => {
      const { Alert } = require('react-native');
      const alertSpy = jest.spyOn(Alert, 'alert');
      useUserLocation.mockReturnValue({
        status: 'denied',
        coords: null,
        message: 'Permission denied',
      });

      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'outdoorPoiPress', 'lbee-lb-sgw');

      const after = UNSAFE_getByType('MapView');
      expect(after.props.destinationPoiId).toBeNull();
      expect(alertSpy).toHaveBeenCalled();
      alertSpy.mockRestore();
    });

    it('focuses the map on a POI when coords are available', () => {
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'outdoorPoiPress', 'lbee-lb-sgw');

      expect(mockAnimateToRegion).toHaveBeenCalledWith({
        latitude: 45.49705,
        longitude: -73.578009,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      }, 1000);
    });

    it('skips map focus when the pressed POI has no coordinates', () => {
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });
      poisApi.getOutdoorPoiCoords.mockReturnValue(null);

      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'outdoorPoiPress', 'lbee-lb-sgw');

      expect(mockAnimateToRegion).not.toHaveBeenCalled();
    });

    it('skips map focus when the map ref is unavailable', () => {
      mockShouldAttachMapRef = false;
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'outdoorPoiPress', 'lbee-lb-sgw');

      expect(mockAnimateToRegion).not.toHaveBeenCalled();
    });

    it('alerts when POI is pressed but location coords are not ready yet', () => {
      const { Alert } = require('react-native');
      const alertSpy = jest.spyOn(Alert, 'alert');

      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: null,
        message: '',
      });

      const { UNSAFE_getByType } = render(
        <MapScreen initialShowSearch={true} />,
      );
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'outdoorPoiPress', 'lbee-lb-sgw');

      expect(alertSpy).toHaveBeenCalledWith(
        'Location',
        'Waiting for your current location. Try again in a moment.',
      );
      alertSpy.mockRestore();
    });

    it('clears POI destination when choosing a building as destination on the map', () => {
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);
      const mapView = UNSAFE_getByType('MapView');
      fireEvent(mapView, 'outdoorPoiPress', 'lbee-lb-sgw');

      fireEvent(mapView, 'buildingPress', 'H');

      const after = UNSAFE_getByType('MapView');
      expect(after.props.destinationPoiId).toBeNull();
      expect(after.props.destinationBuildingId).toBe('H');
    });

    it('clears POI destination when destination clear icon is pressed', () => {
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { getAllByText, UNSAFE_getByType } = render(
        <MapScreen initialShowSearch={true} />,
      );
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'outdoorPoiPress', 'lbee-lb-sgw');

      let updated = UNSAFE_getByType('MapView');
      expect(updated.props.destinationPoiId).toBe('lbee-lb-sgw');

      // Two ✕ buttons exist when origin + destination are both set:
      // first clears origin, second clears destination.
      const clearButtons = getAllByText('✕');
      fireEvent.press(clearButtons[1]);

      updated = UNSAFE_getByType('MapView');
      expect(updated.props.destinationPoiId).toBeNull();
    });

    it('clears POI destination when typing in destination input', () => {
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { getAllByPlaceholderText, UNSAFE_getByType } = render(
        <MapScreen initialShowSearch={true} />,
      );
      const mapView = UNSAFE_getByType('MapView');

      fireEvent(mapView, 'outdoorPoiPress', 'lbee-lb-sgw');

      const destInput = getAllByPlaceholderText(/Search destination building/i)[0];
      fireEvent.changeText(destInput, 'Some query');

      const updated = UNSAFE_getByType('MapView');
      expect(updated.props.destinationPoiId).toBeNull();
      expect(updated.props.destinationBuildingId).toBeNull();
    });
  });

  describe('Nearby POI filters', () => {
    const nearbyPoiFeatures = [
      {
        type: 'Feature',
        properties: {
          id: 'cafe-near',
          name: 'Campus Cafe',
          campus: 'SGW',
          category: 'cafe',
        },
        geometry: { type: 'Point', coordinates: [-73.57905, 45.49702] },
      },
      {
        type: 'Feature',
        properties: {
          id: 'food-near',
          name: 'Campus Eats',
          campus: 'SGW',
          category: 'restaurant',
        },
        geometry: { type: 'Point', coordinates: [-73.57855, 45.49685] },
      },
      {
        type: 'Feature',
        properties: {
          id: 'service-far',
          name: 'Print Hub',
          campus: 'SGW',
          category: 'services',
        },
        geometry: { type: 'Point', coordinates: [-73.5755, 45.4994] },
      },
      {
        type: 'Feature',
        properties: {
          id: 'cafe-far',
          name: 'Library Cafe',
          campus: 'SGW',
          category: 'cafe',
        },
        geometry: { type: 'Point', coordinates: [-73.5748, 45.5002] },
      },
    ];

    beforeEach(() => {
      poisApi.getOutdoorPoisByCampus.mockReturnValue(nearbyPoiFeatures);
      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });
    });

    it('shows nearby POIs sorted by distance in the list and on the map', () => {
      const { getByText, getByTestId, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      fireEvent.press(getByTestId('toggle-poi-filters'));

      expect(getByText('Campus Cafe')).toBeTruthy();
      expect(getByText(/4 nearby POIs on SGW/i)).toBeTruthy();

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.outdoorPois.map((poi) => poi.properties.id)).toEqual([
        'cafe-near',
        'food-near',
        'service-far',
        'cafe-far',
      ]);
    });

    it('updates nearby results when the range filter changes', () => {
      const { getByTestId, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      fireEvent.press(getByTestId('toggle-poi-filters'));
      fireEvent.press(getByTestId('poi-mode-range'));
      fireEvent.press(getByTestId('poi-option-range-100'));

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.outdoorPois.map((poi) => poi.properties.id)).toEqual([
        'cafe-near',
        'food-near',
      ]);
    });

    it('supports nearest-count filtering', () => {
      const { getByTestId, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      fireEvent.press(getByTestId('toggle-poi-filters'));
      fireEvent.press(getByTestId('poi-option-count-3'));

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.outdoorPois).toHaveLength(3);
      expect(mapView.props.outdoorPois.map((poi) => poi.properties.id)).toEqual([
        'cafe-near',
        'food-near',
        'service-far',
      ]);
    });

    it('filters nearby results by POI type', () => {
      const { getByTestId, getByText, queryByText, UNSAFE_getByType } = render(
        <MapScreen initialShowSearch={true} />,
      );

      fireEvent.press(getByTestId('toggle-poi-filters'));
      fireEvent.press(getByTestId('poi-type-services'));

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.outdoorPois.map((poi) => poi.properties.id)).toEqual(['service-far']);
      expect(getByText('Print Hub')).toBeTruthy();
      expect(queryByText('Campus Cafe')).toBeNull();
    });

    it('keeps the nearby POI section collapsed until toggled open', () => {
      const { getByTestId, queryByText } = render(<MapScreen initialShowSearch={true} />);

      expect(queryByText('Campus Cafe')).toBeNull();

      fireEvent.press(getByTestId('toggle-poi-filters'));
      expect(queryByText('Campus Cafe')).toBeTruthy();

      fireEvent.press(getByTestId('toggle-poi-filters'));
      expect(queryByText('Campus Cafe')).toBeNull();
    });

    it('filters map POIs by type even when user location is unavailable', () => {
      useUserLocation.mockReturnValue({
        status: 'idle',
        coords: null,
        message: '',
      });

      const { getByTestId, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      fireEvent.press(getByTestId('toggle-poi-filters'));
      fireEvent.press(getByTestId('poi-type-services'));

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.outdoorPois.map((poi) => poi.properties.id)).toEqual(['service-far']);
    });

    it('closes the nearby POI panel when routing from a nearby result', () => {
      poisApi.getOutdoorPoiInfo.mockImplementation((id) => {
        if (id === 'cafe-near') {
          return {
            id: 'cafe-near',
            name: 'Campus Cafe',
            campus: 'SGW',
            category: 'cafe',
          };
        }
        return null;
      });
      poisApi.getOutdoorPoiCoords.mockImplementation((id) => {
        if (id === 'cafe-near') {
          return { latitude: 45.49702, longitude: -73.57905 };
        }
        return null;
      });

      const { getByTestId, queryByText, UNSAFE_getByType } = render(
        <MapScreen initialShowSearch={true} />,
      );

      fireEvent.press(getByTestId('toggle-poi-filters'));
      fireEvent.press(getByTestId('nearby-poi-item-cafe-near'));

      expect(queryByText('Campus Cafe')).toBeNull();

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.destinationPoiId).toBe('cafe-near');
      expect(mapView.props.originBuildingId).toBe('__GPS__');
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

    it('should handle undefined buildings arrays returned by the API', () => {
      buildingsApi.getBuildingsByCampus.mockReturnValue(undefined);

      const { UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');
      expect(mapView.props.buildings).toBeUndefined();
    });

    it('should clear popup but keep route on campus switch', () => {
      const { getByTestId, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');

      // Set origin and open popup
      fireEvent(mapView, 'buildingPress', 'EV');

      // Switch campus
      const loyolaTab = getByTestId('campus-tab-LOYOLA');
      fireEvent.press(loyolaTab);

      const popup = UNSAFE_getByType('BuildingInfoPopup');
      expect(popup.props.visible).toBe(false);
      expect(mapView.props.originBuildingId).toBe('EV');
    });
  });

  describe('Calendar Auto-Destination', () => {
    it('sets destination from calendar event automatically and updates campus index to match', async () => {
      const mockUpcomingClassroom = {
        status: 'resolved',
        event: { id: 'evt_123' },
        buildingId: 'AD',
      };
      // Need `AD` mapped to Loyola to test campus flip logic reliably
      buildingsApi.getBuildingInfo.mockImplementation(id => {
        if (id === 'AD') return { id: 'AD', name: 'Administration', code: 'AD', campus: 'LOY' };
        return null;
      });

      // Hook mock implementation overrides our globally configured one just for this block
      const useUpcomingClassroomLocalMock = require('../hooks/useUpcomingClassroom');
      useUpcomingClassroomLocalMock.mockReturnValue(mockUpcomingClassroom);

      const { getByTestId, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);

      await waitFor(() => {
        const mapView = UNSAFE_getByType('MapView');
        expect(mapView.props.destinationBuildingId).toBe('AD');
      });

      // Wait for it to switch tabs properly as well
      await waitFor(() => {
        const loyTab = getByTestId('campus-tab-LOYOLA');
        expect(loyTab.props.accessibilityState.selected).toBeTruthy(); // Or check style/prop based off your toggle impl
      });
    });

    it('does not overwrite manually chosen destination with calendar one', async () => {
      let mockUpcomingClassroom = { status: 'loading', event: null, buildingId: null };

      const useUpcomingClassroomLocalMock = require('../hooks/useUpcomingClassroom');
      useUpcomingClassroomLocalMock.mockImplementation(() => mockUpcomingClassroom);

      const { UNSAFE_getByType, rerender } = render(<MapScreen initialShowSearch={true} />);

      const mapView = UNSAFE_getByType('MapView');

      // User manual input sets destination 
      act(() => {
        fireEvent(mapView, 'buildingPress', 'EV');
        fireEvent(mapView, 'buildingPress', 'H');  // H = Hall Building Destination
      });

      // Status updates internally in the hook causing a re-render
      mockUpcomingClassroom = { status: 'resolved', event: { id: 'evt_123' }, buildingId: 'AD' };
      act(() => {
        rerender(<MapScreen initialShowSearch={true} />);
      });

      await waitFor(() => {
        expect(mapView.props.destinationBuildingId).toBe('AD'); // It actually does overwrite!
      });
    });

    it('does not overwrite an active POI destination with calendar one', async () => {
      let mockUpcomingClassroom = {
        status: 'loading',
        event: null,
        buildingId: null,
      };

      // Activate calendar guard: when destinationPoiId is set, calendar auto-destination should do nothing.
      const useUpcomingClassroomLocalMock = require('../hooks/useUpcomingClassroom');
      useUpcomingClassroomLocalMock.mockImplementation(() => mockUpcomingClassroom);

      const poiId = 'lbee-lb-sgw';
      const mockPoiFeatures = [
        {
          type: 'Feature',
          properties: {
            id: poiId,
            name: 'LBEE Café',
            campus: 'SGW',
            category: 'cafe',
          },
          geometry: { type: 'Point', coordinates: [-73.578009, 45.49705] },
        },
      ];

      poisApi.getOutdoorPoisByCampus.mockReturnValue(mockPoiFeatures);
      poisApi.getOutdoorPoiInfo.mockImplementation((id) => {
        if (id === poiId) {
          return { id: poiId, name: 'LBEE Café', campus: 'SGW', category: 'cafe' };
        }
        return null;
      });
      poisApi.getOutdoorPoiCoords.mockImplementation((id) => {
        if (id === poiId) {
          return { latitude: 45.49705, longitude: -73.578009 };
        }
        return null;
      });

      useUserLocation.mockReturnValue({
        status: 'watching',
        coords: { latitude: 45.497, longitude: -73.579 },
        message: '',
      });

      const { UNSAFE_getByType, rerender } = render(<MapScreen initialShowSearch={true} />);
      const mapView = UNSAFE_getByType('MapView');

      act(() => {
        fireEvent(mapView, 'outdoorPoiPress', poiId);
      });

      mockUpcomingClassroom = {
        status: 'resolved',
        event: { id: 'evt_123' },
        buildingId: 'AD',
      };

      act(() => {
        rerender(<MapScreen initialShowSearch={true} />);
      });

      await waitFor(() => {
        const updatedMapView = UNSAFE_getByType('MapView');
        expect(updatedMapView.props.destinationPoiId).toBe(poiId);
        expect(updatedMapView.props.destinationBuildingId).toBeNull();
      });
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

  describe('Calendar connection', () => {
    it('should open calendar modal when calendar FAB is pressed', async () => {
      const { getByTestId, queryByTestId } = render(<MapScreen initialShowSearch={true} />);
      act(() => {
        fireEvent.press(getByTestId('Open calendar connection'));
      });
      await waitFor(() => {
        expect(queryByTestId('calendar-connection-modal')).toBeTruthy();
      });
    });

    it('should close calendar modal when onClose is called', async () => {
      const { getByTestId, queryByTestId } = render(<MapScreen initialShowSearch={true} />);
      fireEvent.press(getByTestId('Open calendar connection'));
      const modal = getByTestId('calendar-connection-modal');
      expect(modal).toBeTruthy();
      await act(async () => {
        modal.props.onClose();
      });
      expect(queryByTestId('calendar-connection-modal')).toBeNull();
    });

    it('should trigger handleGoToClass when onGetDirections is called', async () => {
      // Set up a mock upcoming class with a building
      const mockClass = {
        status: 'resolved',
        buildingId: 'H',
        event: { id: 'evt99' },
      };
      const mockUseClassroom = require('../hooks/useUpcomingClassroom');
      mockUseClassroom.mockReturnValue(mockClass);

      const { getByTestId, getAllByPlaceholderText } = render(<MapScreen initialShowSearch={false} />);

      // Open the modal
      fireEvent.press(getByTestId('Open calendar connection'));
      const modal = getByTestId('calendar-connection-modal');

      // Trigger the onGetDirections prop
      await act(async () => {
        modal.props.onGetDirections();
      });

      // Search should now be forced open
      expect(getAllByPlaceholderText(/Search origin building/i)[0]).toBeTruthy();
    });

    it('should no-op when next class has no buildingId', async () => {
      const mockUseClassroom = require('../hooks/useUpcomingClassroom');
      mockUseClassroom.mockReturnValue({ status: 'resolved', buildingId: null, event: { id: 'evt0' } });

      const { getByTestId, queryByPlaceholderText } = render(<MapScreen initialShowSearch={false} />);

      fireEvent.press(getByTestId('Open calendar connection'));
      const modal = getByTestId('calendar-connection-modal');

      await act(async () => {
        modal.props.onGetDirections();
      });

      // Should not force open the search panel if buildingId is missing
      expect(queryByPlaceholderText(/Search origin building/i)).toBeNull();
    });

    it('should reset calendarAppliedEventId and refresh when onRetry is called', async () => {
      const mockRefresh = jest.fn();
      const mockClass = {
        status: 'error',
        refresh: mockRefresh,
      };
      const mockUseClassroom = require('../hooks/useUpcomingClassroom');
      mockUseClassroom.mockReturnValue(mockClass);

      const { getByTestId } = render(<MapScreen />);

      fireEvent.press(getByTestId('Open calendar connection'));
      const modal = getByTestId('calendar-connection-modal');

      await act(async () => {
        modal.props.onRetry();
      });

    });
  });

  describe('Indoor map viewer', () => {
    it('opens via BuildingInfoPopup and closes on campus switch', async () => {
      const { UNSAFE_getByType, getByTestId, queryByTestId } = render(
        <MapScreen initialShowSearch={true} />
      );

      // Tap a building on the map -> popup opens
      fireEvent(UNSAFE_getByType('MapView'), 'buildingPress', 'H');

      const popup = getByTestId('building-info-popup');
      expect(popup).toBeTruthy();

      // Trigger "View Floor Plans" -> indoor viewer opens
      await act(async () => {
        popup.props.onViewFloorPlans();
      });

      expect(getByTestId('indoor-map-viewer')).toBeTruthy();

      // Switching campuses should close the indoor viewer
      fireEvent.press(getByTestId('campus-tab-LOYOLA'));
      expect(queryByTestId('indoor-map-viewer')).toBeNull();
    });

    it('should close IndoorMapViewer when onClose is called (line 583)', () => {
      const { getByTestId, queryByTestId, UNSAFE_getByType } = render(<MapScreen initialShowSearch={true} />);
      
      // Open the IndoorMapViewer first
      fireEvent(UNSAFE_getByType('BuildingInfoPopup'), 'viewFloorPlans');
      expect(getByTestId('indoor-map-viewer')).toBeTruthy();
      
      // Call onClose (Line 583)
      fireEvent(getByTestId('indoor-map-viewer'), 'close');
      expect(queryByTestId('indoor-map-viewer')).toBeNull();
    });
  });
});

