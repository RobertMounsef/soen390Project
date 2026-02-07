import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import BuildingInfoPopup from './BuildingInfoPopup';
import { Animated, Dimensions, Linking } from 'react-native';

// Mock Dimensions
const mockDimensions = {
  window: {
    height: 800,
  },
};
Dimensions.get = jest.fn(() => mockDimensions.window);

// Mock Linking
Linking.openURL = jest.fn(() => Promise.resolve());

// Mock image assets
jest.mock('../../assets/images/wheelchair.png', () => 'wheelchair.png');
jest.mock('../../assets/images/info.png', () => 'info.png');
jest.mock('../../assets/images/people.png', () => 'people.png');
jest.mock('../../assets/images/home.png', () => 'home.png');

describe('BuildingInfoPopup', () => {
  const mockBuildingInfo = {
    name: 'Test Building',
    code: 'TB',
    accessibility: {
      ramps: true,
      elevators: true,
      notes: 'Ramp & elevators available',
    },
    keyServices: ['Service 1', 'Service 2'],
    departments: ['Department 1', 'Department 2'],
    facilities: ['Facility 1', 'Facility 2'],
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Animated values
    jest.spyOn(Animated, 'spring').mockImplementation((value, config) => {
      return {
        start: (callback) => {
          if (config.toValue !== undefined) {
            value.setValue(config.toValue);
          }
          if (callback) callback();
        },
      };
    });
    jest.spyOn(Animated, 'timing').mockImplementation((value, config) => {
      return {
        start: (callback) => {
          if (config.toValue !== undefined) {
            value.setValue(config.toValue);
          }
          if (callback) callback();
        },
      };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    test('does not render when visible is false', () => {
      const { queryByText } = render(
        <BuildingInfoPopup
          visible={false}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );
      expect(queryByText('Test Building')).toBeNull();
    });

    test('does not render when buildingInfo is null', () => {
      const { queryByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={null}
          onClose={mockOnClose}
        />
      );
      expect(queryByText('Test Building')).toBeNull();
    });

    test('renders when visible is true and buildingInfo is provided', () => {
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Test Building')).toBeTruthy();
    });

    test('renders building name', () => {
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Test Building')).toBeTruthy();
    });

    test('renders accessibility section when available', () => {
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Accessibility')).toBeTruthy();
      expect(getByText('Ramp & elevators available')).toBeTruthy();
    });

    test('renders key services section when available', () => {
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Key Services')).toBeTruthy();
      expect(getByText('• Service 1')).toBeTruthy();
      expect(getByText('• Service 2')).toBeTruthy();
    });

    test('renders departments section when available', () => {
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Departments')).toBeTruthy();
      expect(getByText('• Department 1')).toBeTruthy();
      expect(getByText('• Department 2')).toBeTruthy();
    });

    test('renders facilities section when available', () => {
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Facilities')).toBeTruthy();
      expect(getByText('• Facility 1')).toBeTruthy();
      expect(getByText('• Facility 2')).toBeTruthy();
    });

    test('does not render accessibility section when not available', () => {
      const buildingInfoWithoutAccessibility = {
        ...mockBuildingInfo,
        accessibility: null,
      };
      const { queryByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={buildingInfoWithoutAccessibility}
          onClose={mockOnClose}
        />
      );
      expect(queryByText('Accessibility')).toBeNull();
    });

    test('does not render sections when arrays are empty', () => {
      const buildingInfoEmpty = {
        name: 'Test Building',
        code: 'TB',
        keyServices: [],
        departments: [],
        facilities: [],
      };
      const { queryByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={buildingInfoEmpty}
          onClose={mockOnClose}
        />
      );
      expect(queryByText('Key Services')).toBeNull();
      expect(queryByText('Departments')).toBeNull();
      expect(queryByText('Facilities')).toBeNull();
    });

    test('renders default accessibility message when notes are not provided', () => {
      const buildingInfoWithDefaultAccessibility = {
        ...mockBuildingInfo,
        accessibility: {
          ramps: true,
          elevators: true,
        },
      };
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={buildingInfoWithDefaultAccessibility}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Ramp & elevators available')).toBeTruthy();
    });
  });

  describe('Expand/Collapse Functionality', () => {
    test('shows "Tap to expand" hint when collapsed', () => {
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );
      expect(getByText('Tap to expand')).toBeTruthy();
    });

    test('toggles expand state when handle is pressed', () => {
      const { getByText, queryByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );

      const handleArea = getByText('Tap to expand').parent;
      fireEvent.press(handleArea);

      expect(getByText('Tap to collapse')).toBeTruthy();
      expect(queryByText('Tap to expand')).toBeNull();
    });

    test('collapses when handle is pressed while expanded', () => {
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );

      const handleArea = getByText('Tap to expand').parent;
      
      // Expand
      fireEvent.press(handleArea);
      expect(getByText('Tap to collapse')).toBeTruthy();
      
      // Collapse
      fireEvent.press(handleArea);
      expect(getByText('Tap to expand')).toBeTruthy();
    });
  });

  describe('Close Functionality', () => {
    test('calls onClose when close button is pressed', async () => {
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );

      const closeButton = getByText('✕').parent;
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 500 });
    });

    test('prevents multiple close calls when closing', async () => {
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );

      const closeButton = getByText('✕').parent;
      
      // Press multiple times rapidly
      fireEvent.press(closeButton);
      fireEvent.press(closeButton);
      fireEvent.press(closeButton);

      await waitFor(() => {
        // Should only be called once due to isClosing guard
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }, { timeout: 500 });
    });
  });

  describe('More Details Button', () => {
    test('renders "More Details" button', () => {
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );
      expect(getByText('More Details')).toBeTruthy();
    });

    test('opens building details URL when "More Details" is pressed', () => {
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );

      const moreDetailsButton = getByText('More Details').parent;
      fireEvent.press(moreDetailsButton);

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://www.concordia.ca/maps/buildings/tb.html'
      );
    });

    test('handles building code with uppercase letters', () => {
      const buildingInfoUpperCase = {
        ...mockBuildingInfo,
        code: 'EV',
      };
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={buildingInfoUpperCase}
          onClose={mockOnClose}
        />
      );

      const moreDetailsButton = getByText('More Details').parent;
      fireEvent.press(moreDetailsButton);

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://www.concordia.ca/maps/buildings/ev.html'
      );
    });

    test('handles missing building code', () => {
      const buildingInfoNoCode = {
        ...mockBuildingInfo,
        code: null,
      };
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={buildingInfoNoCode}
          onClose={mockOnClose}
        />
      );

      const moreDetailsButton = getByText('More Details').parent;
      fireEvent.press(moreDetailsButton);

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://www.concordia.ca/maps/buildings/.html'
      );
    });
  });

  describe('Animation', () => {
    test('animates in when visible becomes true', () => {
      const { rerender } = render(
        <BuildingInfoPopup
          visible={false}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );

      rerender(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );

      expect(Animated.spring).toHaveBeenCalled();
    });

    test('resets expanded state when popup becomes visible', () => {
      const { getByText, rerender } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );

      // Expand
      const handleArea = getByText('Tap to expand').parent;
      fireEvent.press(handleArea);
      expect(getByText('Tap to collapse')).toBeTruthy();

      // Hide and show again
      rerender(
        <BuildingInfoPopup
          visible={false}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );
      rerender(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );

      // Should be collapsed again
      expect(getByText('Tap to expand')).toBeTruthy();
    });
  });

  describe('ScrollView', () => {
    test('renders ScrollView for content', () => {
      const { getByText } = render(
        <BuildingInfoPopup
          visible={true}
          buildingInfo={mockBuildingInfo}
          onClose={mockOnClose}
        />
      );
      
      // Verify component renders with scrollable content
      expect(getByText('Test Building')).toBeTruthy();
      expect(getByText('Accessibility')).toBeTruthy();
    });
  });
});
