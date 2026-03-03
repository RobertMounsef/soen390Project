import { getBuildingInfo } from '../services/api/buildings';

/**
 * Builds a deduplicated, alphabetically-sorted list of buildings from
 * GeoJSON features.  Used by MapScreen to populate search suggestions.
 *
 * @param {Array} allBuildings — array of GeoJSON Feature objects.
 * @returns {Array<{id: string, code: string, name: string}>}
 */
export function buildCampusBuildings(allBuildings) {
  const byId = new Map();
  for (const feature of allBuildings) {
    const props = feature?.properties || {};
    const id = props.id;
    if (!id || byId.has(id)) continue;
    const info = getBuildingInfo(id);
    byId.set(id, {
      id,
      code: props.code || info?.code || id,
      name: props.name || info?.name || id,
    });
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}
