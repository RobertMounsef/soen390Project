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
  MB: {
    // Floor 1 and a second level (e.g., S2) mapped to numeric floors 1 and 2
    1: require('./mb1.json'),
    2: require('./mbS2.json'),
  },
  VL: {
    1: require('./vl1.json'),
    2: require('./vl2.json'),
  },
};

// Default metadata for each (building, floor) that tells the UI
// which floor-plan image to use and what its native size is.
// This keeps the JSON waypoint files focused on navigation data only.
const IMAGE_META = {
  H: {
    1: { image: require('../H1.png'), width: 849, height: 853 },
    2: { image: require('../H2.png'), width: 1024, height: 1024 },
    8: { image: require('../H8.png'), width: 1024, height: 1024 },
    9: { image: require('../H9.png'), width: 1024, height: 1024 },
  },
  CC: {
    1: { image: require('../cc1.png'), width: 1024, height: 1024 },
  },
  VE: {
    1: { image: require('../ve1.png'), width: 249, height: 222 },
    2: { image: require('../ve2.png'), width: 1024, height: 1024 },
  },
  MB: {
    // Update width/height once you know the exact PNG dimensions
    1: { image: require('../mb1.png'), width: 1024, height: 1024 },
    2: { image: require('../mbS2.png'), width: 1024, height: 1024 },
  },
  VL: {
    1: { image: require('../vl1.png'), width: 1024, height: 1024 },
    2: { image: require('../vl2.png'), width: 1024, height: 1024 },
  },
};

function attachGraphMeta(building, floor, graph) {
  const meta = IMAGE_META[building]?.[floor];

  // Prefer any explicit dimensions defined in the JSON itself.
  // You can set either:
  //   "viewBox": "0 0 WIDTH HEIGHT"
  // or
  //   "meta": { "width": 4096, "height": 3072 }
  //   (or "meta": { "viewBox": "0 0 4096 3072" })
  let viewBox = graph.viewBox;
  if (!viewBox && graph.meta) {
    if (graph.meta.viewBox) {
      viewBox = graph.meta.viewBox;
    } else if (graph.meta.width && graph.meta.height) {
      viewBox = `0 0 ${graph.meta.width} ${graph.meta.height}`;
    }
  }

  // Finally, fall back to the default per-floor metadata if nothing is provided.
  if (!viewBox && meta?.width && meta?.height) {
    viewBox = `0 0 ${meta.width} ${meta.height}`;
  }

  const image = graph.image || meta?.image;

  // IndoorMapViewer expects nodes as an object keyed by id. Normalize if JSON has nodes as array.
  let nodes = graph.nodes;
  if (Array.isArray(nodes)) {
    nodes = nodes.reduce((acc, node) => {
      if (node && node.id != null) acc[node.id] = node;
      return acc;
    }, {});
  }

  return {
    ...graph,
    nodes,
    image,
    viewBox,
  };
}

/**
 * Get the waypoint graph for a specific building and floor.
 * @param {string} building - Building code: 'H', 'CC', or 'VE'
 * @param {number} floor    - Floor number
 * @returns {object|null}   - Graph object with { nodes, edges } or null if not found
 */
export function getFloorGraph(building, floor) {
  const b = (building || '').toString().toUpperCase();
  const graph = WAYPOINT_GRAPHS[b]?.[floor] ?? null;
  if (!graph) return null;
  return attachGraphMeta(b, floor, graph);
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
