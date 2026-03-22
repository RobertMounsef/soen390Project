/**
 * Outdoor points of interest — dining on campus (GeoJSON FeatureCollection).
 * Coordinates match building centroids from buildings.js (same [lng, lat] as Point features).
 */

export const OUTDOOR_POIS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'stingers-h-sgw',
        name: 'Stingers Café',
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
        name: 'LBEE Café',
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
        id: 'buzz-sc-loy',
        name: 'Buzz dining hall',
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
        name: 'Faro Café',
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
  ],
};
