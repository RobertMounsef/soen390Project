import { isShuttleOperating, getShuttleStop, getNextDepartures, getNextDeparture } from './shuttle';
import { SHUTTLE_STOPS } from '../../data/shuttleInfo';

describe('shuttle api', () => {
    describe('isShuttleOperating', () => {
        it('returns true for a Monday', () => {
            const monday = new Date(2026, 1, 23, 12, 0, 0); // Feb 23 2026 is a Monday
            expect(isShuttleOperating(monday)).toBe(true);
        });
        it('returns true for a Friday', () => {
            const friday = new Date(2026, 1, 27, 12, 0, 0); // Feb 27 2026 is a Friday
            expect(isShuttleOperating(friday)).toBe(true);
        });
        it('returns false for a Saturday', () => {
            const saturday = new Date(2026, 1, 28, 12, 0, 0); // Feb 28 2026 is a Saturday
            expect(isShuttleOperating(saturday)).toBe(false);
        });
        it('returns false for a Sunday', () => {
            const sunday = new Date(2026, 2, 1, 12, 0, 0); // March 1st 2026 is a Sunday
            expect(isShuttleOperating(sunday)).toBe(false);
        });
    });

    describe('getShuttleStop', () => {
        it('returns stop info for SGW', () => {
            expect(getShuttleStop('SGW')).toEqual(SHUTTLE_STOPS.SGW);
        });
        it('returns stop info for LOY', () => {
            expect(getShuttleStop('LOY')).toEqual(SHUTTLE_STOPS.LOY);
        });
        it('returns null for unknown campus', () => {
            expect(getShuttleStop('UNKNOWN')).toBeNull();
            expect(getShuttleStop(null)).toBeNull();
        });
    });

    describe('getNextDepartures', () => {
        it('returns upcoming departures for a given valid morning time on SGW', () => {
            const date = new Date(2026, 1, 23, 9, 0, 0); // Monday Feb 23, 9:00 AM
            const departures = getNextDepartures('SGW', 3, date);
            expect(departures.length).toBe(3);
            expect(departures[0].label).toBe('09:15');
            expect(departures[1].label).toBe('09:30');
            expect(departures[2].label).toBe('09:45');
        });

        it('returns correct upcoming departures for Friday schedule', () => {
            const date = new Date(2026, 1, 27, 9, 0, 0); // Friday Feb 27, 9:00 AM
            const departures = getNextDepartures('SGW', 2, date);
            expect(departures.length).toBe(2);
            expect(departures[0].label).toBe('09:45'); // Friday first bus is later!
            expect(departures[1].label).toBe('10:00');
        });

        it('returns empty array when past the last bus of the day', () => {
            const lateDate = new Date(2026, 1, 23, 22, 0, 0); // 10 PM
            const departures = getNextDepartures('SGW', 3, lateDate);
            expect(departures).toEqual([]);
        });

        it('returns empty array on weekends', () => {
            const date = new Date(2026, 1, 28, 9, 0, 0); // Saturday
            expect(getNextDepartures('SGW', 3, date)).toEqual([]);
        });

        it('computes arrival times properly according to travel time', () => {
            const date = new Date(2026, 1, 23, 9, 0, 0);
            const departures = getNextDepartures('SGW', 1, date);
            const dep = departures[0];

            // 09:15 + 30m travel time = 09:45
            expect(dep.arrivalTime.getHours()).toBe(9);
            expect(dep.arrivalTime.getMinutes()).toBe(45);
        });

        it('parses the isLastBus asterisk correctly', () => {
            // Ask for bus just before 18:30 (last bus on Mon-Thu)
            const lateDate = new Date(2026, 1, 23, 18, 20, 0);
            const departures = getNextDepartures('SGW', 1, lateDate);
            expect(departures[0].isLastBus).toBe(true);
            expect(departures[0].label).toBe('18:30');
        });
    });

    describe('getNextDeparture', () => {
        it('returns single next departure', () => {
            const date = new Date(2026, 1, 23, 9, 0, 0); // Monday
            const departure = getNextDeparture('SGW', date);
            expect(departure).toBeDefined();
            expect(departure.label).toBe('09:15');
        });
        it('returns null if there are no more departures', () => {
            const date = new Date(2026, 1, 23, 23, 0, 0); // Monday at 11 PM
            const departure = getNextDeparture('SGW', date);
            expect(departure).toBeNull();
        });
    });
});
