/**
 * Outdoor points of interest derived from the campus GeoJSON datasets.
 * Coordinates use GeoJSON [longitude, latitude].
 */

import SGW_DATA from './sgw.json';
import LOYOLA_DATA from './loyola.json';

const POI_GEOMETRY_TYPES = new Set(['Point', 'Polygon', 'MultiPolygon']);

const hasPoiTag = (properties = {}) => Boolean(
  properties.amenity
  || properties.shop
  || properties['disused:shop']
  || properties.tourism
  || properties.leisure,
);

const normalizeCategory = (properties = {}) => {
  const amenity = properties.amenity;
  const shop = properties.shop || properties['disused:shop'];
  const tourism = properties.tourism;
  const leisure = properties.leisure;

  if (amenity === 'cafe') return 'cafe';
  if (amenity === 'restaurant' || amenity === 'fast_food') return 'restaurant';

  if (
    shop
    || amenity === 'bicycle_repair_station'
    || amenity === 'toilets'
    || tourism === 'gallery'
    || leisure === 'sports_centre'
  ) {
    return 'services';
  }

  return 'other';
};

const sanitizeId = (value, fallback) => {
  const raw = String(value || fallback || '').trim().toLowerCase();
  let sanitized = '';
  let previousWasDash = false;

  for (const char of raw) {
    const isAlphaNumeric = (char >= 'a' && char <= 'z') || (char >= '0' && char <= '9');

    if (isAlphaNumeric) {
      sanitized += char;
      previousWasDash = false;
      continue;
    }

    if (!previousWasDash) {
      sanitized += '-';
      previousWasDash = true;
    }
  }

  if (sanitized.startsWith('-')) {
    sanitized = sanitized.slice(1);
  }

  if (sanitized.endsWith('-')) {
    sanitized = sanitized.slice(0, -1);
  }

  return sanitized || fallback;
};

const centroidFromRing = (ring = []) => {
  if (!Array.isArray(ring) || ring.length === 0) {
    return null;
  }

  const totals = ring.reduce(
    (acc, [lng, lat]) => {
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        return acc;
      }

      return {
        count: acc.count + 1,
        lng: acc.lng + lng,
        lat: acc.lat + lat,
      };
    },
    { count: 0, lng: 0, lat: 0 },
  );

  if (totals.count === 0) {
    return null;
  }

  return [totals.lng / totals.count, totals.lat / totals.count];
};

const toPointGeometry = (geometry = null) => {
  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates || [];
    if (typeof lng !== 'number' || typeof lat !== 'number') {
      return null;
    }

    return {
      type: 'Point',
      coordinates: [lng, lat],
    };
  }

  let ring = null;
  if (geometry.type === 'Polygon') {
    ring = geometry.coordinates?.[0];
  } else if (geometry.type === 'MultiPolygon') {
    ring = geometry.coordinates?.[0]?.[0];
  }

  const centroid = centroidFromRing(ring);

  if (!centroid) {
    return null;
  }

  return {
    type: 'Point',
    coordinates: centroid,
  };
};

const extractOutdoorPois = (geojson, campus) => {
  const seen = new Set();
  const features = geojson?.features || [];

  return features.reduce((pois, feature, index) => {
    const properties = feature?.properties || {};
    const geometry = feature?.geometry || null;

    if (!properties.name || !hasPoiTag(properties)) {
      return pois;
    }

    if (!POI_GEOMETRY_TYPES.has(geometry?.type)) {
      return pois;
    }

    const pointGeometry = toPointGeometry(geometry);
    if (!pointGeometry) {
      return pois;
    }

    const id = sanitizeId(properties['@id'], `poi-${campus.toLowerCase()}-${index}`);
    if (seen.has(id)) {
      return pois;
    }
    seen.add(id);

    pois.push({
      type: 'Feature',
      properties: {
        id,
        name: properties.name,
        campus,
        category: normalizeCategory(properties),
        sourceId: properties['@id'] || null,
      },
      geometry: pointGeometry,
    });

    return pois;
  }, []);
};

export const OUTDOOR_POIS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    ...extractOutdoorPois(SGW_DATA, 'SGW'),
    ...extractOutdoorPois(LOYOLA_DATA, 'LOY'),
  ],
};
