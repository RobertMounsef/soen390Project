/**
 * Shuttle Information Data
 * Contains Concordia Shuttle stops and schedule for SGW ↔ Loyola campuses
 */

// Helper function to create shuttle stop info
const createShuttleStop = (id, name, campus, coords, address, overrides = {}) => ({
  id,
  name,
  campus,
  coords, 
  address, 
  ...overrides,
});

// Shuttle Stops - with approximate addresses
export const SHUTTLE_STOPS = [
  createShuttleStop(
    'SGW_MAIN', 
    'SGW Main Stop', 
    'SGW', 
    { latitude: 45.495, longitude: -73.578 },
    '1455 De Maisonneuve Blvd W, Montreal, QC H3G 1M8'  
  ),
  createShuttleStop(
    'LOYOLA_LIB', 
    'Loyola Library Stop', 
    'LOY', 
    { latitude: 45.458, longitude: -73.640 },
    '7141 Sherbrooke St W, Montreal, QC H4B 1R6'  
  ),
];

// Helper function to create shuttle schedule info
const createShuttleSchedule = (routeId, fromCampus, toCampus, times) => ({
  routeId,
  fromCampus,
  toCampus,
  times, 
});

// Shuttle Schedules
export const SHUTTLE_SCHEDULES = {
  MON_THU: {
    SGW_TO_LOY: createShuttleSchedule('SGW_TO_LOY_MON_THU', 'SGW', 'LOY', [
      '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15',
      '12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '13:45', '14:00',
      '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '16:00', '16:15',
      '16:45', '17:00', '17:15', '17:30', '17:45', '18:00', '18:15', '18:30*'
    ]),
    
    LOY_TO_SGW: createShuttleSchedule('LOY_TO_SGW_MON_THU', 'LOY', 'SGW', [
      '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00',
      '11:15', '11:30', '11:45', '12:30', '12:45', '13:00', '13:15', '13:30',
      '13:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30',
      '15:45', '16:30', '16:45', '17:00', '17:15', '17:30', '17:45', '18:00',
      '18:15', '18:30*'
    ]),
  },
  
  FRIDAY: {
    SGW_TO_LOY: createShuttleSchedule('SGW_TO_LOY_FRI', 'SGW', 'LOY', [
      '09:45', '10:00', '10:15', '10:45', '11:15', '11:30', '12:15', '12:30',
      '12:45', '13:15', '13:45', '14:00', '14:15', '14:45', '15:00', '15:15',
      '15:45', '16:00', '16:45', '17:15', '17:45', '18:15*'
    ]),
    
    LOY_TO_SGW: createShuttleSchedule('LOY_TO_SGW_FRI', 'LOY', 'SGW', [
      '09:15', '09:30', '09:45', '10:15', '10:45', '11:00', '11:15', '12:00',
      '12:15', '12:45', '13:00', '13:15', '13:45', '14:15', '14:30', '14:45',
      '15:15', '15:30', '15:45', '16:45', '17:15', '17:45', '18:15*'
    ]),
  },
};

// Combined export for convenience
export const SHUTTLE_DATA = {
  stops: SHUTTLE_STOPS,
  schedules: SHUTTLE_SCHEDULES,
};