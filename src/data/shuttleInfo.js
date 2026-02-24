/**
 * Shuttle Information Data
 * Contains Concordia Shuttle stops and schedule for SGW ↔ Loyola campuses.
 */
export const SHUTTLE_STOPS = {
    SGW: {
        id: 'SGW_MAIN',
        campusId: 'SGW',
        name: 'SGW Campus',
        landmark: 'Sir George Williams Campus – GM Building',
        address: '1550 De Maisonneuve Blvd W, Montréal, QC H3G 1M8',
        coords: { latitude: 45.4959, longitude: -73.5788 },
        icon: '🏙',
    },
    LOY: {
        id: 'LOYOLA_MAIN',
        campusId: 'LOY',
        name: 'Loyola Campus',
        landmark: 'Loyola Campus – Vanier Library',
        address: '7141 Sherbrooke St W, Montréal, QC H4B 1R6',
        coords: { latitude: 45.4582, longitude: -73.6405 },
        icon: '🏛',
    },
};

export const SHUTTLE_SCHEDULES = {
    MON_THU: {
        SGW_TO_LOY: {
            routeId: 'SGW_TO_LOY_MON_THU',
            fromCampus: 'SGW',
            toCampus: 'LOY',
            travelMinutes: 30,
            times: [
                '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15',
                '12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '13:45', '14:00',
                '14:15', '14:30', '14:45', '15:00', '15:15', '15:30',
                '16:00', '16:15',
                '16:45', '17:00', '17:15', '17:30', '17:45', '18:00', '18:15', '18:30*',
            ],
        },
        LOY_TO_SGW: {
            routeId: 'LOY_TO_SGW_MON_THU',
            fromCampus: 'LOY',
            toCampus: 'SGW',
            travelMinutes: 30,
            times: [
                '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00',
                '11:15', '11:30', '11:45',
                '12:30', '12:45', '13:00', '13:15', '13:30',
                '13:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45',
                '16:30', '16:45', '17:00', '17:15', '17:30', '17:45', '18:00',
                '18:15', '18:30*',
            ],
        },
    },
    FRIDAY: {
        SGW_TO_LOY: {
            routeId: 'SGW_TO_LOY_FRI',
            fromCampus: 'SGW',
            toCampus: 'LOY',
            travelMinutes: 30,
            times: [
                '09:45', '10:00', '10:15', '10:45', '11:15', '11:30',
                '12:15', '12:30', '12:45', '13:15', '13:45',
                '14:00', '14:15', '14:45', '15:00', '15:15', '15:45',
                '16:00', '16:45', '17:15', '17:45', '18:15*',
            ],
        },
        LOY_TO_SGW: {
            routeId: 'LOY_TO_SGW_FRI',
            fromCampus: 'LOY',
            toCampus: 'SGW',
            travelMinutes: 30,
            times: [
                '09:15', '09:30', '09:45', '10:15', '10:45', '11:00', '11:15',
                '12:00', '12:15', '12:45', '13:00', '13:15', '13:45',
                '14:15', '14:30', '14:45', '15:15', '15:30', '15:45',
                '16:45', '17:15', '17:45', '18:15*',
            ],
        },
    },
};



export const SHUTTLE_SERVICE_INFO = {
    name: 'Concordia Inter-Campus Shuttle',
    operator: 'Concordia University',
    website: 'https://www.concordia.ca/maps/shuttle-bus.html',
    operatingDays: [1, 2, 3, 4, 5],
    notes: [
        'The shuttle does not operate on weekends or university holidays.',
        'Last bus of the day is marked with an asterisk (*).',
        'Travel time between campuses is approximately 30 minutes.',
        'Concordia ID required to board.',
    ],
};