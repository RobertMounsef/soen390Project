/**
 * Campus coordinates and config (reused from original web app).
 * SGW and Loyola - Concordia University.
 */

export const SGW = { latitude: 45.496953450868936, longitude: -73.57880920781449 };
export const LOY = { latitude: 45.45807166641666, longitude: -73.63926547807088 };

export const CAMPUSES = [
  { id: 'SGW', label: 'SGW', center: SGW, markers: [SGW, LOY] },
  { id: 'LOYOLA', label: 'LOYOLA', center: LOY, markers: [SGW, LOY] },
];
