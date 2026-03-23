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
