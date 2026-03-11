/**
 * Indoor Navigation Waypoint Graph Index
 *
 * Maps building + floor to the corresponding JSON waypoint graph file.
 * Each graph file contains:
 *   - nodes: room/corridor/stair/elevator waypoints with SVG x,y coordinates
 *   - edges: connections between nodes with traversal weights
 *
 * Usage:
 *   import { getFloorGraph } from './waypointsIndex';
 *   const graph = await getFloorGraph('H', 8);
 *   // then run Dijkstra on graph.nodes + graph.edges
 */

const WAYPOINT_GRAPHS = {
  H: {
    1: require('./H1.json'),
    2: require('./H2.json'),
    8: require('./hall8.json'),
    9: require('./hall9.json'),
  },
  CC: {
    1: require('./CC1.json'),
  },
  VE: {
    1: require('./ve1.json'),
    2: require('./ve2.json'),
  },
};

/**
 * Get the waypoint graph for a specific building and floor.
 * @param {string} building - Building code: 'H', 'CC', or 'VE'
 * @param {number} floor    - Floor number
 * @returns {object|null}   - Graph object with { nodes, edges } or null if not found
 */
export function getFloorGraph(building, floor) {
  return WAYPOINT_GRAPHS[building]?.[floor] ?? null;
}

/**
 * Get all available building + floor combinations.
 * @returns {Array<{building: string, floor: number}>}
 */
export function getAvailableFloors() {
  const result = [];
  for (const [building, floors] of Object.entries(WAYPOINT_GRAPHS)) {
    for (const floor of Object.keys(floors)) {
      result.push({ building, floor: Number(floor) });
    }
  }
  return result;
}

export default WAYPOINT_GRAPHS;
