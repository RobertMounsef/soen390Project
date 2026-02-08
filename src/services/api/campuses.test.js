import { getCampuses, getCampusById } from './campuses';

describe('campuses API', () => {
  describe('getCampuses', () => {
    it('should return an array of campuses', () => {
      const campuses = getCampuses();
      expect(Array.isArray(campuses)).toBe(true);
      expect(campuses.length).toBeGreaterThan(0);
    });

    it('should return campuses with required properties', () => {
      const campuses = getCampuses();
      const firstCampus = campuses[0];

      expect(firstCampus).toHaveProperty('id');
      expect(firstCampus).toHaveProperty('label');
      expect(firstCampus).toHaveProperty('center');
      expect(firstCampus.center).toHaveProperty('latitude');
      expect(firstCampus.center).toHaveProperty('longitude');
    });

    it('should include both SGW and LOY campuses', () => {
      const campuses = getCampuses();
      const campusIds = campuses.map(c => c.id);

      expect(campusIds).toContain('SGW');
      expect(campusIds).toContain('LOY');
    });
  });

  describe('getCampusById', () => {
    it('should return SGW campus when given SGW id', () => {
      const campus = getCampusById('SGW');

      expect(campus).toBeDefined();
      expect(campus.id).toBe('SGW');
      expect(campus.center).toHaveProperty('latitude');
      expect(campus.center).toHaveProperty('longitude');
    });

    it('should return LOY campus when given LOY id', () => {
      const campus = getCampusById('LOY');

      expect(campus).toBeDefined();
      expect(campus.id).toBe('LOY');
      expect(campus.center).toHaveProperty('latitude');
      expect(campus.center).toHaveProperty('longitude');
    });

    it('should return undefined for non-existent campus id', () => {
      const campus = getCampusById('INVALID');
      expect(campus).toBeUndefined();
    });

    it('should return different campuses for different ids', () => {
      const sgw = getCampusById('SGW');
      const loy = getCampusById('LOY');

      expect(sgw).not.toEqual(loy);
      expect(sgw.center).not.toEqual(loy.center);
    });
  });
});
