import { buildCampusBuildings } from './buildingHelpers';
import { getBuildingInfo } from '../services/api/buildings';

jest.mock('../services/api/buildings', () => ({
  getBuildingInfo: jest.fn(),
}));

describe('buildCampusBuildings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty array when given no features', () => {
    expect(buildCampusBuildings([])).toEqual([]);
  });

  it('deduplicates features with the same id', () => {
    getBuildingInfo.mockReturnValue(null);

    const features = [
      { properties: { id: 'EV', name: 'EV Building', code: 'EV' } },
      { properties: { id: 'EV', name: 'EV Duplicate', code: 'EV2' } },
    ];

    const result = buildCampusBuildings(features);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('EV Building');
  });

  it('sorts buildings alphabetically by name', () => {
    getBuildingInfo.mockReturnValue(null);

    const features = [
      { properties: { id: 'H', name: 'Hall Building', code: 'H' } },
      { properties: { id: 'AD', name: 'Administration', code: 'AD' } },
      { properties: { id: 'EV', name: 'Engineering', code: 'EV' } },
    ];

    const result = buildCampusBuildings(features);
    expect(result.map((b) => b.name)).toEqual([
      'Administration',
      'Engineering',
      'Hall Building',
    ]);
  });

  it('uses feature properties first (name, code)', () => {
    getBuildingInfo.mockReturnValue({ name: 'Info Name', code: 'INFO' });

    const features = [
      { properties: { id: 'EV', name: 'Feature Name', code: 'FT' } },
    ];

    const result = buildCampusBuildings(features);
    expect(result[0]).toEqual({ id: 'EV', name: 'Feature Name', code: 'FT' });
  });

  it('falls back to getBuildingInfo when feature properties are missing', () => {
    getBuildingInfo.mockReturnValue({ name: 'Info Name', code: 'INFO' });

    const features = [
      { properties: { id: 'EV' } }, // no name or code
    ];

    const result = buildCampusBuildings(features);
    expect(result[0]).toEqual({ id: 'EV', name: 'Info Name', code: 'INFO' });
  });

  it('falls back to id when both feature props and buildingInfo are missing', () => {
    getBuildingInfo.mockReturnValue(null);

    const features = [
      { properties: { id: 'EV' } },
    ];

    const result = buildCampusBuildings(features);
    expect(result[0]).toEqual({ id: 'EV', name: 'EV', code: 'EV' });
  });

  it('skips features without an id', () => {
    getBuildingInfo.mockReturnValue(null);

    const features = [
      { properties: { name: 'No ID Building', code: 'X' } },
      { properties: { id: 'H', name: 'Hall Building', code: 'H' } },
    ];

    const result = buildCampusBuildings(features);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('H');
  });

  it('handles features with missing or null properties gracefully', () => {
    getBuildingInfo.mockReturnValue(null);

    const features = [
      null,
      { properties: null },
      {},
      { properties: { id: 'OK', name: 'Valid', code: 'OK' } },
    ];

    const result = buildCampusBuildings(features);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('OK');
  });
});
