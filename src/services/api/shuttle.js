import { SHUTTLE_STOPS, SHUTTLE_SCHEDULES } from '../../data/shuttleInfo';

// Parse '09:30' or '18:30'
function parseTime(timeStr) {
    const isLastBus = timeStr.endsWith('*');
    const clean = timeStr.replace('*', '');
    const [h, m] = clean.split(':').map(Number);
    return { hours: h, minutes: m, isLastBus, label: clean };
}

// Build a Date on the same calendar day as baseDate but with the given time.
function toDateWithTime(hours, minutes, baseDate = new Date()) {
    const d = new Date(baseDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
}

// Return the schedule key for a given date, or null on weekend
function getScheduleKey(date = new Date()) {
    const day = date.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0 || day === 6) return null;
    return day === 5 ? 'FRIDAY' : 'MON_THU';
}


export function isShuttleOperating(date = new Date()) {
    return getScheduleKey(date) !== null;
}


export function getShuttleStop(campusId) {
    return SHUTTLE_STOPS[campusId] ?? null;
}

export function getNextDepartures(fromCampusId, count = 3, date = new Date()) {
    const key = getScheduleKey(date);
    if (!key) return [];

    const routeKey = fromCampusId === 'SGW' ? 'SGW_TO_LOY' : 'LOY_TO_SGW';
    const schedule = SHUTTLE_SCHEDULES[key]?.[routeKey];
    if (!schedule) return [];

    const upcoming = schedule.times
        .map((timeStr) => {
            const { hours, minutes, isLastBus, label } = parseTime(timeStr);
            const departureTime = toDateWithTime(hours, minutes, date);
            const arrivalTime = new Date(
                departureTime.getTime() + schedule.travelMinutes * 60_000,
            );
            return {
                label,
                isLastBus,
                departureTime,
                arrivalTime,
                fromCampus: schedule.fromCampus,
                toCampus: schedule.toCampus,
                travelMinutes: schedule.travelMinutes,
            };
        })
        .filter((d) => d.departureTime >= date);

    return upcoming.slice(0, count);
}

export function getNextDeparture(fromCampusId, date = new Date()) {
    const [next = null] = getNextDepartures(fromCampusId, 1, date);
    return next;
}
