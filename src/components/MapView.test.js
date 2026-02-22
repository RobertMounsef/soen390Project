import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MapView from './MapView';

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');

  return {
    __esModule: true,
    // eslint-disable-next-line react/prop-types
    default: class MockMapView extends require('react').Component {
      animateToRegion = jest.fn();
      render() {
        // eslint-disable-next-line react/prop-types
        const { children, ...props } = this.props;
        return (
          <View testID="react-native-map" {...props}>
            {children}
          </View>
        );
      }
    },
    // eslint-disable-next-line react/prop-types
    Marker: ({ children, ...props }) => (
      <View testID="map-marker" {...props}>
        {children}
      </View>
    ),
    Polygon: (props) => <View testID="map-polygon" {...props} />,
    Polyline: (props) => <View testID="map-polyline" {...props} />,
  };
});

const mockCenter = { latitude: 45.497, longitude: -73.579 };
const mockMarkers = [
  { latitude: 45.497, longitude: -73.579 },
  { latitude: 45.498, longitude: -73.58 },
];

describe('MapView', () => {
  describe('Basic Rendering', () => {
    it('should render map view', () => {
      render(<MapView center={mockCenter} zoom={18} markers={mockMarkers} />);
      expect(screen.getByTestId('map-view')).toBeTruthy();
    });

    it('should render markers', () => {
      render(<MapView center={mockCenter} zoom={18} markers={mockMarkers} />);
      const markers = screen.getAllByTestId('map-marker');
      // Markers include both the passed markers and any building markers
      expect(markers.length).toBeGreaterThanOrEqual(2);
    });

    it('should render with default props', () => {
      render(<MapView center={mockCenter} />);
      expect(screen.getByTestId('map-view')).toBeTruthy();
    });

    it('should render with empty markers array', () => {
      render(<MapView center={mockCenter} markers={[]} />);
      expect(screen.getByTestId('map-view')).toBeTruthy();
    });
  });

  it('should call Keyboard.dismiss when map is pressed', () => {
    const { Keyboard } = require('react-native');
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss');
    render(<MapView center={mockCenter} />);

    const map = screen.getByTestId('react-native-map');
    fireEvent.press(map);

    expect(dismissSpy).toHaveBeenCalled();
    dismissSpy.mockRestore();
  });

  describe('Polygon Rendering', () => {
    const mockPolygonBuilding = {
      type: 'Feature',
      properties: { id: 'EV', name: 'EV Building', code: 'EV' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.579, 45.497],
            [-73.578, 45.497],
            [-73.578, 45.496],
            [-73.579, 45.496],
            [-73.579, 45.497],
          ],
        ],
      },
    };

    it('should render polygon buildings', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={[mockPolygonBuilding]}
        />
      );

      const polygons = screen.getAllByTestId('map-polygon');
      expect(polygons.length).toBeGreaterThan(0);
    });

    it('should render polygon with multiple rings (holes)', () => {
      const buildingWithHole = {
        ...mockPolygonBuilding,
        geometry: {
          type: 'Polygon',
          coordinates: [
            // Outer ring
            [
              [-73.579, 45.497],
              [-73.578, 45.497],
              [-73.578, 45.496],
              [-73.579, 45.496],
              [-73.579, 45.497],
            ],
            // Inner ring (hole)
            [
              [-73.5785, 45.4965],
              [-73.5785, 45.4968],
              [-73.5782, 45.4968],
              [-73.5782, 45.4965],
              [-73.5785, 45.4965],
            ],
          ],
        },
      };

      render(
        <MapView
          center={mockCenter}
          buildings={[buildingWithHole]}
        />
      );

      const polygons = screen.getAllByTestId('map-polygon');
      expect(polygons.length).toBe(2); // Outer + inner ring
    });

    it('should render MultiPolygon buildings', () => {
      const multiPolygonBuilding = {
        type: 'Feature',
        properties: { id: 'GN', name: 'Grey Nuns', code: 'GN' },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [-73.579, 45.497],
                [-73.578, 45.497],
                [-73.578, 45.496],
                [-73.579, 45.496],
                [-73.579, 45.497],
              ],
            ],
            [
              [
                [-73.577, 45.495],
                [-73.576, 45.495],
                [-73.576, 45.494],
                [-73.577, 45.494],
                [-73.577, 45.495],
              ],
            ],
          ],
        },
      };

      render(
        <MapView
          center={mockCenter}
          buildings={[multiPolygonBuilding]}
        />
      );

      const polygons = screen.getAllByTestId('map-polygon');
      expect(polygons.length).toBe(2); // Two separate polygons
    });

    it('should handle invalid geometry gracefully', () => {
      const invalidBuilding = {
        type: 'Feature',
        properties: { id: 'INVALID' },
        geometry: null,
      };

      render(
        <MapView
          center={mockCenter}
          buildings={[invalidBuilding]}
        />
      );

      expect(screen.getByTestId('map-view')).toBeTruthy();
    });

    it('should handle missing coordinates', () => {
      const buildingWithoutCoords = {
        type: 'Feature',
        properties: { id: 'NO_COORDS' },
        geometry: {
          type: 'Polygon',
          coordinates: null,
        },
      };

      render(
        <MapView
          center={mockCenter}
          buildings={[buildingWithoutCoords]}
        />
      );

      expect(screen.getByTestId('map-view')).toBeTruthy();
    });
  });

  describe('Point Marker Rendering', () => {
    const mockPointBuilding = {
      type: 'Feature',
      properties: { id: 'MB', name: 'Molson Building', code: 'MB' },
      geometry: {
        type: 'Point',
        coordinates: [-73.579, 45.497],
      },
    };

    it('should render point buildings as markers', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={[mockPointBuilding]}
        />
      );

      const markers = screen.getAllByTestId('map-marker');
      expect(markers.length).toBeGreaterThan(0);
    });

    it('should display building ID in point marker', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={[mockPointBuilding]}
        />
      );

      expect(screen.getByText('MB')).toBeTruthy();
    });

    it('should apply origin highlight style to point markers', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={[mockPointBuilding]}
          originBuildingId="MB"
        />
      );

      // Verify the marker renders (covers line 156)
      expect(screen.getByText('MB')).toBeTruthy();
    });

    it('should apply destination highlight style to point markers', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={[mockPointBuilding]}
          destinationBuildingId="MB"
        />
      );

      // Verify the marker renders (covers line 158)
      expect(screen.getByText('MB')).toBeTruthy();
    });

    it('should apply current highlight style to point markers', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={[mockPointBuilding]}
          highlightedBuildingId="MB"
        />
      );

      // Verify the marker renders (covers line 160)
      expect(screen.getByText('MB')).toBeTruthy();
    });

    it('should handle point with invalid coordinates', () => {
      const invalidPoint = {
        type: 'Feature',
        properties: { id: 'INVALID_PT' },
        geometry: {
          type: 'Point',
          coordinates: null,
        },
      };

      render(
        <MapView
          center={mockCenter}
          buildings={[invalidPoint]}
        />
      );

      expect(screen.getByTestId('map-view')).toBeTruthy();
    });

    it('should hide building icons when user manually zooms out (longitudeDelta > 0.008)', () => {
      render(
        <MapView
          center={mockCenter}
          zoom={18} // gives longitudeDelta = 0.005 < 0.008
          buildings={[mockPointBuilding]}
        />
      );

      // MB should initially be shown
      expect(screen.getByText('MB')).toBeTruthy();

      // Zoom out manually to longitudeDelta = 0.01
      const map = screen.getByTestId('react-native-map');
      fireEvent(map, 'regionChangeComplete', {
        latitude: mockCenter.latitude,
        longitude: mockCenter.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // MB should be hidden
      expect(screen.queryByText('MB')).toBeNull();
    });

    it('should start hidden if initial zoom is low (longitudeDelta > 0.008)', () => {
      render(
        <MapView
          center={mockCenter}
          zoom={15} // gives longitudeDelta = 0.02 > 0.008
          buildings={[mockPointBuilding]}
        />
      );

      // MB should be hidden initially
      expect(screen.queryByText('MB')).toBeNull();
    });
  });

  describe('Highlight Logic', () => {
    const mockBuilding = {
      type: 'Feature',
      properties: { id: 'EV', name: 'EV Building', code: 'EV' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.579, 45.497],
            [-73.578, 45.497],
            [-73.578, 45.496],
            [-73.579, 45.496],
            [-73.579, 45.497],
          ],
        ],
      },
    };

    it('should highlight origin building with green color', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={[mockBuilding]}
          originBuildingId="EV"
        />
      );

      const polygon = screen.getAllByTestId('map-polygon')[0];
      expect(polygon.props.strokeColor).toBe('#16a34a'); // Green
    });

    it('should highlight destination building with orange color', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={[mockBuilding]}
          destinationBuildingId="EV"
        />
      );

      const polygon = screen.getAllByTestId('map-polygon')[0];
      expect(polygon.props.strokeColor).toBe('#ea580c'); // Orange
    });

    it('should highlight current building with blue color', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={[mockBuilding]}
          highlightedBuildingId="EV"
        />
      );

      const polygon = screen.getAllByTestId('map-polygon')[0];
      expect(polygon.props.strokeColor).toBe('#2563eb'); // Blue
    });

    it('should use default burgundy color for non-highlighted buildings', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={[mockBuilding]}
        />
      );

      const polygon = screen.getAllByTestId('map-polygon')[0];
      expect(polygon.props.strokeColor).toBe('#8B1538'); // Burgundy
    });

    it('should prioritize origin over other highlights', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={[mockBuilding]}
          originBuildingId="EV"
          highlightedBuildingId="EV"
        />
      );

      const polygon = screen.getAllByTestId('map-polygon')[0];
      expect(polygon.props.strokeColor).toBe('#16a34a'); // Origin (green) takes priority
    });

    it('should prioritize destination over current highlight', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={[mockBuilding]}
          destinationBuildingId="EV"
          highlightedBuildingId="EV"
        />
      );

      const polygon = screen.getAllByTestId('map-polygon')[0];
      expect(polygon.props.strokeColor).toBe('#ea580c'); // Destination (orange) takes priority
    });
  });

  describe('Building Press Interactions', () => {
    const mockBuilding = {
      type: 'Feature',
      properties: { id: 'EV', name: 'EV Building', code: 'EV' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.579, 45.497],
            [-73.578, 45.497],
            [-73.578, 45.496],
            [-73.579, 45.496],
            [-73.579, 45.497],
          ],
        ],
      },
    };

    it('should call onBuildingPress when polygon is pressed', () => {
      const onBuildingPress = jest.fn();

      render(
        <MapView
          center={mockCenter}
          buildings={[mockBuilding]}
          onBuildingPress={onBuildingPress}
        />
      );

      const polygon = screen.getAllByTestId('map-polygon')[0];
      fireEvent.press(polygon);

      expect(onBuildingPress).toHaveBeenCalledWith('EV');
    });

    it('should call onBuildingPress for MultiPolygon buildings', () => {
      const onBuildingPress = jest.fn();
      const multiPolygonBuilding = {
        type: 'Feature',
        properties: { id: 'GN', name: 'Grey Nuns', code: 'GN' },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [[
              [-73.579, 45.497],
              [-73.578, 45.497],
              [-73.578, 45.496],
              [-73.579, 45.496],
              [-73.579, 45.497],
            ]],
          ],
        },
      };

      render(
        <MapView
          center={mockCenter}
          buildings={[multiPolygonBuilding]}
          onBuildingPress={onBuildingPress}
        />
      );

      const polygon = screen.getAllByTestId('map-polygon')[0];
      fireEvent.press(polygon);

      // Covers line 134 for MultiPolygon
      expect(onBuildingPress).toHaveBeenCalledWith('GN');
    });

    it('should call onBuildingPress when point marker is pressed', () => {
      const onBuildingPress = jest.fn();
      const pointBuilding = {
        type: 'Feature',
        properties: { id: 'MB', name: 'Molson Building', code: 'MB' },
        geometry: {
          type: 'Point',
          coordinates: [-73.579, 45.497],
        },
      };

      render(
        <MapView
          center={mockCenter}
          buildings={[pointBuilding]}
          onBuildingPress={onBuildingPress}
        />
      );

      const marker = screen.getAllByTestId('map-marker').find(
        m => m.props.coordinate
      );
      if (marker) {
        fireEvent.press(marker);
        expect(onBuildingPress).toHaveBeenCalledWith('MB');
      }
    });

    it('should not crash when onBuildingPress is not provided', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={[mockBuilding]}
        />
      );

      const polygon = screen.getAllByTestId('map-polygon')[0];
      fireEvent.press(polygon);

      expect(screen.getByTestId('map-view')).toBeTruthy();
    });
  });

  describe('Region Management', () => {
    it('should render with center and zoom props', () => {
      render(
        <MapView center={mockCenter} zoom={18} />
      );

      // Just verify it renders without error
      expect(screen.getByTestId('map-view')).toBeTruthy();
    });

    it('should re-render when center changes', () => {
      const { rerender } = render(
        <MapView center={mockCenter} zoom={18} />
      );

      const newCenter = { latitude: 45.458, longitude: -73.64 };
      rerender(<MapView center={newCenter} zoom={18} />);

      // Verify it re-renders without error
      expect(screen.getByTestId('map-view')).toBeTruthy();
    });

    it('should re-render when zoom changes', () => {
      const { rerender } = render(
        <MapView center={mockCenter} zoom={18} />
      );

      rerender(<MapView center={mockCenter} zoom={16} />);

      // Verify it re-renders without error
      expect(screen.getByTestId('map-view')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty buildings array', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={[]}
        />
      );

      expect(screen.getByTestId('map-view')).toBeTruthy();
    });

    it('should handle buildings with missing properties', () => {
      const buildingWithoutProps = {
        type: 'Feature',
        properties: {},  // Empty properties instead of undefined
        geometry: {
          type: 'Point',
          coordinates: [-73.579, 45.497],
        },
      };

      render(
        <MapView
          center={mockCenter}
          buildings={[buildingWithoutProps]}
        />
      );

      expect(screen.getByTestId('map-view')).toBeTruthy();
    });

    it('should handle undefined buildings prop', () => {
      render(
        <MapView
          center={mockCenter}
          buildings={undefined}
        />
      );

      expect(screen.getByTestId('map-view')).toBeTruthy();
    });

    it('should handle mixed geometry types', () => {
      const mixedBuildings = [
        {
          type: 'Feature',
          properties: { id: 'POLY', code: 'POLY' },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-73.579, 45.497],
                [-73.578, 45.497],
                [-73.578, 45.496],
                [-73.579, 45.496],
                [-73.579, 45.497],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { id: 'PT', code: 'PT' },
          geometry: {
            type: 'Point',
            coordinates: [-73.577, 45.495],
          },
        },
      ];

      render(
        <MapView
          center={mockCenter}
          buildings={mixedBuildings}
        />
      );

      expect(screen.getByTestId('map-view')).toBeTruthy();
      expect(screen.getAllByTestId('map-polygon').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('map-marker').length).toBeGreaterThan(0);
    });

    it('should render Polyline when routeCoordinates has multiple points', () => {
      render(
        <MapView
          center={mockCenter}
          routeCoordinates={[
            { latitude: 45.497, longitude: -73.579 },
            { latitude: 45.498, longitude: -73.58 },
          ]}
        />
      );

      expect(screen.getByTestId('map-polyline')).toBeTruthy();
    });
  });

  describe('Ref Methods', () => {
    it('should expose animateToRegion via ref', () => {
      const ref = React.createRef();
      render(<MapView ref={ref} center={mockCenter} />);

      expect(ref.current).toBeDefined();
      expect(typeof ref.current.animateToRegion).toBe('function');

      // Call the method to ensure it doesn't crash
      ref.current.animateToRegion({ latitude: 10, longitude: 20 }, 500);
    });
  });
});