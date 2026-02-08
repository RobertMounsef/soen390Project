import * as api from './index';

describe('services/api/index', () => {
  it('should export getCampuses from campuses module', () => {
    expect(api.getCampuses).toBeDefined();
    expect(typeof api.getCampuses).toBe('function');
  });

  it('should export getCampusById from campuses module', () => {
    expect(api.getCampusById).toBeDefined();
    expect(typeof api.getCampusById).toBe('function');
  });

  it('should export getBuildings from buildings module', () => {
    expect(api.getBuildings).toBeDefined();
    expect(typeof api.getBuildings).toBe('function');
  });

  it('should export getBuildingsByCampus from buildings module', () => {
    expect(api.getBuildingsByCampus).toBeDefined();
    expect(typeof api.getBuildingsByCampus).toBe('function');
  });

  it('should export getBuildingInfo from buildings module', () => {
    expect(api.getBuildingInfo).toBeDefined();
    expect(typeof api.getBuildingInfo).toBe('function');
  });
});
