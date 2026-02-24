import { BUILDINGS_GEOJSON } from "../../data/buildings";
import { getBuildingInfo as getBuildingInfoData } from "../../data/buildingInfo";

export const getBuildings = () => BUILDINGS_GEOJSON.features;

export const getBuildingsByCampus = (campus) =>
  BUILDINGS_GEOJSON.features.filter((feature) => feature.properties.campus === campus);

/**
 * Get detailed building information including departments, services, and accessibility
 * @param {string} id - Building code (e.g., "EV", "H", "MB")
 * @returns {Object|null} Building information object or null if not found
 */
export const getBuildingInfo = (id) => {
  return getBuildingInfoData(id);
};

/**
 * Resolve a building ID to a { latitude, longitude } coordinate.
 * For Point geometry, returns the point directly.
 * For Polygon/MultiPolygon, returns the centroid of the first ring.
 * @param {string} id
 * @returns {{ latitude: number, longitude: number } | null}
 */
export const getBuildingCoords = (id) => {
  const feature = BUILDINGS_GEOJSON.features.find(
    (f) => f?.properties?.id === id,
  );
  if (!feature) return null;

  const geom = feature.geometry;
  if (!geom) return null;

  if (geom.type === 'Point') {
    const [lng, lat] = geom.coordinates;
    return { latitude: lat, longitude: lng };
  }

  // Polygon or MultiPolygon — compute centroid of the first ring
  const ring =
    geom.type === 'Polygon'
      ? geom.coordinates[0]
      : geom.coordinates[0][0];

  if (!ring || ring.length === 0) return null;

  const sumLat = ring.reduce((acc, c) => acc + c[1], 0);
  const sumLng = ring.reduce((acc, c) => acc + c[0], 0);
  return { latitude: sumLat / ring.length, longitude: sumLng / ring.length };
};