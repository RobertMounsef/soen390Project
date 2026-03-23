/**
 * Outdoor points of interest around Concordia campuses.
 * Coordinates use GeoJSON [longitude, latitude].
 */

export const OUTDOOR_POIS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'stingers-h-sgw',
        name: 'Stingers Cafe',
        campus: 'SGW',
        building: 'H',
        category: 'cafe',
        note: 'Henry F. Hall Building, 4th floor',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.5788, 45.497092],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'lbee-lb-sgw',
        name: 'LBEE Cafe',
        campus: 'SGW',
        building: 'LB',
        category: 'cafe',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.578009, 45.49705],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'reggie-h-sgw',
        name: 'Reggie Snack Bar',
        campus: 'SGW',
        building: 'H',
        category: 'restaurant',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.57865, 45.49684],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'print-hub-ev-sgw',
        name: 'Print Hub',
        campus: 'SGW',
        building: 'EV',
        category: 'services',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.57911, 45.49728],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'terrace-bites-fa-sgw',
        name: 'Terrace Bites',
        campus: 'SGW',
        building: 'FA',
        category: 'restaurant',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.57695, 45.49592],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'jmsb-coffee-sgw',
        name: 'JMSB Coffee Corner',
        campus: 'SGW',
        building: 'MB',
        category: 'cafe',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.57735, 45.49525],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'campus-pharmacy-sgw',
        name: 'Campus Pharmacy',
        campus: 'SGW',
        building: 'GM',
        category: 'services',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.57592, 45.49748],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'buzz-sc-loy',
        name: 'Buzz Dining Hall',
        campus: 'LOY',
        building: 'SC',
        category: 'restaurant',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.639251, 45.459131],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'faro-sp-loy',
        name: 'Faro Cafe',
        campus: 'LOY',
        building: 'SP',
        category: 'cafe',
        note: 'Richard J. Renaud Science Complex (SP)',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.641565, 45.457881],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'loyola-bookstop',
        name: 'Book Stop Kiosk',
        campus: 'LOY',
        building: 'AD',
        category: 'services',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.64005, 45.45862],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'quad-coffee-loy',
        name: 'Quad Coffee',
        campus: 'LOY',
        building: 'CC',
        category: 'cafe',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.64082, 45.45874],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'athletics-snacks-loy',
        name: 'Athletics Snack Bar',
        campus: 'LOY',
        building: 'PERF',
        category: 'restaurant',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.63876, 45.45812],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'student-services-loy',
        name: 'Student Services Desk',
        campus: 'LOY',
        building: 'AD',
        category: 'services',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.63972, 45.45848],
      },
    },
  ],
};
