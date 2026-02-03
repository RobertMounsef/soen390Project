import { BUILDINGS_GEOJSON } from "../../data/buildings";

export const getBuildings = () => BUILDINGS_GEOJSON.features;

export const getBuildingsByCampus = (campus) => 
  BUILDINGS_GEOJSON.features.filter((feature) => feature.properties.campus === campus);

export const getBuildingById = (id) =>
  BUILDINGS_GEOJSON.features.find((feature) => feature.properties.id === id);