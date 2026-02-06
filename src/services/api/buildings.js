import { BUILDINGS_GEOJSON } from "../../data/buildings";
import { getBuildingInfo as getBuildingInfoData } from "../../data/buildingInfo";

export const getBuildings = () => BUILDINGS_GEOJSON.features;

export const getBuildingsByCampus = (campus) => 
  BUILDINGS_GEOJSON.features.filter((feature) => feature.properties.campus === campus);

export const getBuildingById = (id) =>
  BUILDINGS_GEOJSON.features.find((feature) => feature.properties.id === id);

/**
 * Get detailed building information including departments, services, and accessibility
 * @param {string} id - Building code (e.g., "EV", "H", "MB")
 * @returns {Object|null} Building information object or null if not found
 */
export const getBuildingInfo = (id) => {
  return getBuildingInfoData(id);
};