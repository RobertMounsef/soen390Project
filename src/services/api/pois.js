import { OUTDOOR_POIS_GEOJSON } from '../../data/outdoorPois';

export const getOutdoorPois = () => OUTDOOR_POIS_GEOJSON.features;

export const getOutdoorPoisByCampus = (campus) =>
  OUTDOOR_POIS_GEOJSON.features.filter(
    (feature) => feature.properties.campus === campus,
  );

/**
 * @param {string} id
 * @returns {{ type: string, properties: Object, geometry: Object } | null}
 */
export const getOutdoorPoiFeature = (id) =>
  OUTDOOR_POIS_GEOJSON.features.find((f) => f?.properties?.id === id) || null;

/**
 * @param {string} id
 * @returns {{ id: string, name: string, campus: string, category: string } | null}
 */
export const getOutdoorPoiInfo = (id) => {
  const feature = getOutdoorPoiFeature(id);
  if (!feature?.properties) return null;
  const { id: pid, name, campus, category } = feature.properties;
  return { id: pid, name, campus, category };
};

/**
 * @param {string} id
 * @returns {{ latitude: number, longitude: number } | null}
 */
export const getOutdoorPoiCoords = (id) => {
  const feature = getOutdoorPoiFeature(id);
  const geom = feature?.geometry;
  if (geom?.type !== 'Point') return null;
  const [lng, lat] = geom.coordinates;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { latitude: lat, longitude: lng };
};

const GOOGLE_PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';

const GOOGLE_TYPE_FILTERS = {
  cafe: ['cafe', 'coffee_shop', 'bakery'],
  restaurant: ['restaurant', 'meal_takeaway', 'meal_delivery', 'fast_food_restaurant'],
  services: ['atm', 'bank', 'pharmacy', 'convenience_store', 'library', 'post_office', 'drugstore'],
};

const SERVICE_TYPES = new Set(['atm', 'bank', 'pharmacy', 'convenience_store', 'library', 'post_office', 'drugstore']);
const FOOD_TYPES = new Set(['restaurant', 'meal_takeaway', 'meal_delivery', 'fast_food_restaurant', 'bakery']);
const CAFE_TYPES = new Set(['cafe', 'coffee_shop']);

function classifyGooglePlace(place) {
  const types = Array.isArray(place?.types) ? place.types : [];
  const primaryType = place?.primaryType || '';

  if (CAFE_TYPES.has(primaryType) || types.some((type) => CAFE_TYPES.has(type))) {
    return 'cafe';
  }

  if (FOOD_TYPES.has(primaryType) || types.some((type) => FOOD_TYPES.has(type))) {
    return 'restaurant';
  }

  if (SERVICE_TYPES.has(primaryType) || types.some((type) => SERVICE_TYPES.has(type))) {
    return 'services';
  }

  return 'other';
}

function toOutdoorPoiFeature(place) {
  const latitude = place?.location?.latitude;
  const longitude = place?.location?.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }

  const placeId = place?.id || place?.name;
  if (!placeId) {
    return null;
  }

  return {
    type: 'Feature',
    properties: {
      id: placeId,
      name: place?.displayName?.text || placeId,
      campus: 'nearby',
      category: classifyGooglePlace(place),
      primaryType: place?.primaryType || 'unknown',
      address: place?.shortFormattedAddress || '',
      googleMapsUri: place?.googleMapsUri || null,
      source: 'google_places',
    },
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
  };
}

export async function fetchNearbyGooglePois({
  userCoords,
  category = 'all',
  radiusMetres = 500,
  maxResultCount = 20,
}) {
  if (!userCoords) {
    return [];
  }

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    throw new Error('Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY in .env');
  }

  const body = {
    maxResultCount,
    rankPreference: 'DISTANCE',
    locationRestriction: {
      circle: {
        center: {
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
        },
        radius: radiusMetres,
      },
    },
  };

  const includedTypes = GOOGLE_TYPE_FILTERS[category];
  if (includedTypes?.length) {
    body.includedTypes = includedTypes;
  }

  const response = await fetch(GOOGLE_PLACES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.location',
        'places.primaryType',
        'places.types',
        'places.shortFormattedAddress',
        'places.googleMapsUri',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Places request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return (data?.places || [])
    .map(toOutdoorPoiFeature)
    .filter(Boolean);
}
