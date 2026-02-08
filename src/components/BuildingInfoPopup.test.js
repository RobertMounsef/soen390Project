import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import BuildingInfoPopup from './BuildingInfoPopup';

// Mock Linking
const mockOpenURL = jest.fn();
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Linking = {
    openURL: mockOpenURL,
  };
  return RN;
});

describe('BuildingInfoPopup', () => {
  const mockBuildingInfo = {
    id: 'EV',
    name: 'Engineering, Computer Science and Visual Arts Integrated Complex',
    code: 'EV',
    campus: 'SGW',
    accessibility: {
      ramps: true,
      elevators: true,
      accessibleWashrooms: true,
      notes: 'Ramp & elevators',
    },
    keyServices: ['Student Service Centre', 'Library Services'],
    departments: ['Engineering Dept.', 'Computer Science Dept.'],
    facilities: ['Washrooms', 'Water fountains', 'Elevators'],
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render nothing when buildingInfo is null', () => {
    const { toJSON } = render(
      <BuildingInfoPopup visible={true} buildingInfo={null} onClose={mockOnClose} />
    );
    expect(toJSON()).toBeNull();
  });

  it('should render building name when visible', () => {
    const { getByText } = render(
      <BuildingInfoPopup visible={true} buildingInfo={mockBuildingInfo} onClose={mockOnClose} />
    );

    expect(getByText('Engineering, Computer Science and Visual Arts Integrated Complex')).toBeTruthy();
  });

  it('should render accessibility information', () => {
    const { getByText } = render(
      <BuildingInfoPopup visible={true} buildingInfo={mockBuildingInfo} onClose={mockOnClose} />
    );

    expect(getByText('Accessibility')).toBeTruthy();
    expect(getByText('Ramp & elevators')).toBeTruthy();
  });

  it('should render key services', () => {
    const { getByText } = render(
      <BuildingInfoPopup visible={true} buildingInfo={mockBuildingInfo} onClose={mockOnClose} />
    );

    expect(getByText('Key Services')).toBeTruthy();
    expect(getByText('• Student Service Centre')).toBeTruthy();
    expect(getByText('• Library Services')).toBeTruthy();
  });

  it('should render departments', () => {
    const { getByText } = render(
      <BuildingInfoPopup visible={true} buildingInfo={mockBuildingInfo} onClose={mockOnClose} />
    );

    expect(getByText('Departments')).toBeTruthy();
    expect(getByText('• Engineering Dept.')).toBeTruthy();
    expect(getByText('• Computer Science Dept.')).toBeTruthy();
  });

  it('should render facilities', () => {
    const { getByText } = render(
      <BuildingInfoPopup visible={true} buildingInfo={mockBuildingInfo} onClose={mockOnClose} />
    );

    expect(getByText('Facilities')).toBeTruthy();
    expect(getByText('• Washrooms')).toBeTruthy();
    expect(getByText('• Water fountains')).toBeTruthy();
  });

  it('should render More Details button', () => {
    const { getByText } = render(
      <BuildingInfoPopup visible={true} buildingInfo={mockBuildingInfo} onClose={mockOnClose} />
    );

    expect(getByText('More Details')).toBeTruthy();
  });

  it('should open Concordia building page when More Details is pressed', () => {
    const { getByText } = render(
      <BuildingInfoPopup visible={true} buildingInfo={mockBuildingInfo} onClose={mockOnClose} />
    );

    const button = getByText('More Details');
    fireEvent.press(button);

    expect(Linking.openURL).toHaveBeenCalledWith('https://www.concordia.ca/maps/buildings/ev.html');
  });

  it('should not render accessibility section when no accessibility info', () => {
    const buildingWithoutAccessibility = {
      ...mockBuildingInfo,
      accessibility: {},
    };

    const { queryByText } = render(
      <BuildingInfoPopup visible={true} buildingInfo={buildingWithoutAccessibility} onClose={mockOnClose} />
    );

    expect(queryByText('Accessibility')).toBeNull();
  });

  it('should not render key services section when empty', () => {
    const buildingWithoutServices = {
      ...mockBuildingInfo,
      keyServices: [],
    };

    const { queryByText } = render(
      <BuildingInfoPopup visible={true} buildingInfo={buildingWithoutServices} onClose={mockOnClose} />
    );

    expect(queryByText('Key Services')).toBeNull();
  });

  it('should not render departments section when empty', () => {
    const buildingWithoutDepartments = {
      ...mockBuildingInfo,
      departments: [],
    };

    const { queryByText } = render(
      <BuildingInfoPopup visible={true} buildingInfo={buildingWithoutDepartments} onClose={mockOnClose} />
    );

    expect(queryByText('Departments')).toBeNull();
  });

  it('should not render facilities section when empty', () => {
    const buildingWithoutFacilities = {
      ...mockBuildingInfo,
      facilities: [],
    };

    const { queryByText } = render(
      <BuildingInfoPopup visible={true} buildingInfo={buildingWithoutFacilities} onClose={mockOnClose} />
    );

    expect(queryByText('Facilities')).toBeNull();
  });
});
