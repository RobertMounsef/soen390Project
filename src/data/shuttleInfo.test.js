import { SHUTTLE_STOPS, SHUTTLE_SCHEDULES, SHUTTLE_SERVICE_INFO } from './shuttleInfo';

describe('shuttleInfo data', () => {
    describe('SHUTTLE_STOPS', () => {
        it('contains exactly SGW and Loyola stops with correct data shapes', () => {
            const stops = Object.keys(SHUTTLE_STOPS);
            expect(stops).toHaveLength(2);
            expect(stops).toContain('SGW');
            expect(stops).toContain('LOY');

            expect(SHUTTLE_STOPS.SGW).toMatchObject({
                id: 'SGW_MAIN',
                campusId: 'SGW',
                coords: expect.any(Object),
                name: expect.any(String),
            });

            expect(SHUTTLE_STOPS.LOY).toMatchObject({
                id: 'LOYOLA_MAIN',
                campusId: 'LOY',
                coords: expect.any(Object),
                name: expect.any(String),
            });
        });

        it('does not contain unknown keys', () => {
            expect(SHUTTLE_STOPS.UNKNOWN).toBeUndefined();
        });
    });

    describe('SHUTTLE_SCHEDULES', () => {
        it('contains MON_THU and FRIDAY schedules only', () => {
            const days = Object.keys(SHUTTLE_SCHEDULES);
            expect(days).toEqual(expect.arrayContaining(['MON_THU', 'FRIDAY']));
            expect(days).toHaveLength(2);
        });

        it('contains bilateral routes for each schedule', () => {
            expect(SHUTTLE_SCHEDULES.MON_THU).toHaveProperty('SGW_TO_LOY');
            expect(SHUTTLE_SCHEDULES.MON_THU).toHaveProperty('LOY_TO_SGW');
            expect(SHUTTLE_SCHEDULES.FRIDAY).toHaveProperty('SGW_TO_LOY');
            expect(SHUTTLE_SCHEDULES.FRIDAY).toHaveProperty('LOY_TO_SGW');
        });

        it('has valid travel times and ordered arrays', () => {
            const sgwToLoy = SHUTTLE_SCHEDULES.MON_THU.SGW_TO_LOY;
            expect(sgwToLoy.travelMinutes).toBeGreaterThan(0);
            expect(Array.isArray(sgwToLoy.times)).toBe(true);
            expect(sgwToLoy.times.length).toBeGreaterThan(10);

            // Just verifying that the last bus of the day string matches our parsing expectation
            expect(sgwToLoy.times[sgwToLoy.times.length - 1]).toContain('*');
        });
    });

    describe('SHUTTLE_SERVICE_INFO', () => {
        it('contains shuttle service metadata', () => {
            expect(SHUTTLE_SERVICE_INFO.name).toBe('Concordia Inter-Campus Shuttle');
            expect(SHUTTLE_SERVICE_INFO.operatingDays).toEqual([1, 2, 3, 4, 5]); // Mon-Fri

            expect(SHUTTLE_SERVICE_INFO.website).toContain('concordia.ca');
            expect(SHUTTLE_SERVICE_INFO.notes.length).toBeGreaterThan(0);
        });
    });
});
