/**
 * Outdoor points of interest (amenities near campus) — GeoJSON FeatureCollection.
 * IDs must not collide with building codes (use descriptive slugs).
 */

export const OUTDOOR_POIS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'sgw-cafe-01',
        name: 'Campus Coffee (SGW)',
        campus: 'SGW',
        category: 'cafe',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.57825, 45.49715],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'sgw-food-01',
        name: 'De Maisonneuve Eatery',
        campus: 'SGW',
        category: 'restaurant',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.57945, 45.49585],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 'loy-cafe-01',
        name: 'Loyola Café Spot',
        campus: 'LOY',
        category: 'cafe',
      },
      geometry: {
        type: 'Point',
        coordinates: [-73.64015, 45.45835],
      },
    },
  ],
};
