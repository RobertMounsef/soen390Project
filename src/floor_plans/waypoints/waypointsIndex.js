/** 
 * Indoor Navigation Waypoint Graph Index
*
* Maps building + floor to the corresponding JSON waypoint graph file.
* Prefers new building-level graphs in floor_plans_2/ (which combine all
* floors for a building into one file) over the legacy per-floor JSONs.
*
* Usage:
*   import { getFloorGraph } from './waypointsIndex';
*   const graph = getFloorGraph('H', 8);
*   // graph.nodes    – object keyed by id
*   // graph.edges    – array of { from, to, weight, ... }
*   // graph.image    – floor-plan image asset (PNG, used when no SVG available)
*   // graph.svgString – inline SVG string for SvgXml (preferred over image)
*   // graph.viewBox  – SVG viewBox string
*/

import { SVG_STRINGS } from '../svgStrings';

// ─── Legacy per-floor graphs (fallback) ──────────────────────────────────────

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
    1: require('./mb1.json'),
    2: require('./mbS2.json'),
  },
  VL: {
    1: require('./vl1.json'),
    2: require('./vl2.json'),
  },
};


// ─── New building-level graphs ───────────────────────────────────────────────


// VE is intentionally excluded — the new ve.json coordinates (x ≈ 1400,
// y ≈ 200) are incompatible with every available VE floor-plan image
// (PNGs at 249×222 / 1024×1024, old Inkscape SVGs at 1024×1024).
// Using legacy per-floor JSONs instead until matching images are created.
const NEW_BUILDING_GRAPHS = {
  H:  require('../../floor_plans_2/buildings_plan_json/hall.json'),
  CC: require('../../floor_plans_2/buildings_plan_json/cc1.json'),
  MB: require('../../floor_plans_2/buildings_plan_json/mb_floors_combined.json'),
  VL: require('../../floor_plans_2/buildings_plan_json/vl_floors_combined.json'),
};

const NEW_BUILDING_ID_TO_CODE = {
  Hall: 'H',
  CC: 'CC',
  MB: 'MB',
  'MB-S2': 'MB',
  VL: 'VL',
};

// ─── Floor-plan image metadata (shared by old and new graphs) ────────────────
// svgKey: key into SVG_STRINGS for buildings that have vector floor plans.
//   When present, the viewer renders the floor plan via SvgXml (better alignment
//   with the new coordinate-space graphs).  When absent, the PNG image is used.

const IMAGE_META = {
  H: {
    1: { image: require('../H1.png'), width: 849,  height: 853,  svgKey: 'H1'    },
    2: { image: require('../H2.png'), width: 1024, height: 1024, svgKey: 'H2'    },
    8: { image: require('../H8.png'), width: 1024, height: 1024, svgKey: 'hall8' },
    9: { image: require('../H9.png'), width: 1024, height: 1024, svgKey: 'hall9' },
  },
  CC: {
    1: { image: require('../cc1.png'), width: 1024, height: 1024, svgKey: 'CC1' },
  },
  VE: {
    1: { image: require('../ve1.png'), width: 249,  height: 222  },
    2: { image: require('../ve2.png'), width: 1024, height: 1024 },
  },
  MB: {
    1: { image: require('../mb1.png'),  width: 1024, height: 1024 },
    2: { image: require('../mbS2.png'), width: 1024, height: 1024 },
  },
  VL: {
    1: { image: require('../vl1.png'), width: 1024, height: 1024 },
    2: { image: require('../vl2.png'), width: 1024, height: 1024 },
  },
};

// ─── Extract a single-floor graph from a building-level JSON ─────────────────

// MB-S2 wing is exposed as "MB floor 2" to match the legacy mapping.
// In the new JSON the S2 nodes carry buildingId "MB-S2" with floor 1.
// exclusive:true means ONLY alias-matching nodes are included (the real MB
// floor 2 contains only disconnected elevator/stair nodes with no rooms, so
// mixing them in creates a disconnected graph that breaks routing).
const FLOOR_ALIASES = {
  'MB:2': { buildingIds: ['MB-S2'], floors: [1], exclusive: true },
};

// buildingIds that are exclusively controlled by FLOOR_ALIASES must NEVER
// appear in a regular floor filter — they'd introduce isolated, edgeless nodes.
const ALIAS_ONLY_BUILDING_IDS = new Set(
  Object.values(FLOOR_ALIASES).flatMap(al => al.buildingIds)
);

function extractFloorGraph(buildingJson, buildingCode, floor) {
  const nodeArray = buildingJson.nodes || [];
  const edgeArray = buildingJson.edges || [];
  const alias = FLOOR_ALIASES[`${buildingCode}:${floor}`];


  const floorNodes = nodeArray.filter(n => {
    const code = NEW_BUILDING_ID_TO_CODE[n.buildingId] || n.buildingId;
    // Exclusive alias: include ONLY nodes matching the alias, nothing else.
    if (alias?.exclusive) {
      return alias.buildingIds.includes(n.buildingId) && alias.floors.includes(n.floor);
    }
    // Non-exclusive alias: include nodes matching the alias OR the regular floor.
    /* istanbul ignore next */
    if (alias?.buildingIds.includes(n.buildingId) && alias?.floors.includes(n.floor)) {
      return true;
    }
    // Nodes whose buildingId is alias-controlled must not bleed into regular floors.
    // E.g. MB-S2 nodes must only appear via the MB:2 alias, never in MB floor 1.
    if (ALIAS_ONLY_BUILDING_IDS.has(n.buildingId)) return false;
    if (n.floor !== floor) return false;
    return code === buildingCode;
  });
  if (floorNodes.length === 0) return null;

  const floorNodeIds = new Set(floorNodes.map(n => n.id));


  // Keep same-floor edges; normalise source/target → from/to for the router.
  const floorEdges = edgeArray
    .filter(e => floorNodeIds.has(e.source) && floorNodeIds.has(e.target))
    .map(e => ({
      from: e.source,
      to: e.target,
      weight: e.weight,
      accessible: e.accessible,
      type: e.type,
    }));

  const nodesMap = {};
  for (const n of floorNodes) {
    nodesMap[n.id] = n;
  }

  return {
    nodes: nodesMap,
    edges: floorEdges,
    meta: buildingJson.meta,
  };
}

// ─── Compute viewBox from node bounding box ──────────────────────────────────

function computeViewBox(nodesMap) {
  const nodes = Object.values(nodesMap);
  if (nodes.length === 0) return null;
  let maxX = 0;
  let maxY = 0;
  for (const n of nodes) {
    if (n.x > maxX) maxX = n.x;
    if (n.y > maxY) maxY = n.y;
  }
  const pad = Math.max(maxX, maxY) * 0.05;
  return `0 0 ${Math.ceil(maxX + pad)} ${Math.ceil(maxY + pad)}`;
}

// ─── Attach image, viewBox, normalise nodes ──────────────────────────────────

/** Normalise a nodes value to a keyed object and fill any missing labels. */
function normalizeNodeLabels(rawNodes) {
  let nodes = rawNodes;
  if (Array.isArray(nodes)) {
    nodes = nodes.reduce((acc, node) => {
      if (node?.id != null) acc[node.id] = node;
      return acc;
    }, {});
  }
  if (!nodes) return nodes;
  const labeled = {};
  for (const [id, node] of Object.entries(nodes)) {
    labeled[id] = node.label ? node : { ...node, label: id };
  }
  return labeled;
}

/**
* Some Inkscape SVGs (hall8, hall9) have width/height on the root <svg>
* but NO viewBox attribute.  Inject one derived from those dimensions so
* SvgXml scales the floor plan correctly inside its container.
*/
function injectViewBoxIfMissing(svgString) {
  const rootTagEnd = svgString.indexOf('>');
  const rootTag = rootTagEnd >= 0 ? svgString.slice(0, rootTagEnd) : '';
  if (rootTag.includes('viewBox=')) return svgString;
  const wm = rootTag.match(/\bwidth=["']([\d.]+)["']/);
  const hm = rootTag.match(/\bheight=["']([\d.]+)["']/);
  if (wm && hm) {
    return svgString.replace('<svg', `<svg viewBox="0 0 ${wm[1]} ${hm[1]}"`);
  }
  return svgString;
}

/**
* Resolve the viewBox string for a floor graph.
*
* Strategy:
*   SVG background → compute from node bounds (proportional alignment).
*   PNG background → priority: graph.meta.viewBox > meta width/height >
*                    IMAGE_META width/height > node-bound fallback.
*/
function resolveViewBox(svgString, nodes, graph, imageMeta) {
  if (graph.viewBox) return graph.viewBox;
  const hasNodes = nodes && Object.keys(nodes).length > 0;
  if (svgString && hasNodes) return computeViewBox(nodes);
  if (graph.meta?.viewBox) return graph.meta.viewBox;
  if (graph.meta?.width && graph.meta?.height) return `0 0 ${graph.meta.width} ${graph.meta.height}`;
  if (imageMeta?.width && imageMeta?.height) return `0 0 ${imageMeta.width} ${imageMeta.height}`;
  if (hasNodes) return computeViewBox(nodes);
  return null;
}

function attachGraphMeta(building, floor, graph) {
  const imageMeta = IMAGE_META[building]?.[floor];

  const nodes = normalizeNodeLabels(graph.nodes);
  const image = graph.image || imageMeta?.image;

  // Prefer inline SVG string over PNG image for buildings that have vector
  // floor plans — the SVG coordinate space aligns better with the new graphs.
  let svgString = graph.svgString
    || (imageMeta?.svgKey ? SVG_STRINGS?.[imageMeta.svgKey] ?? null : null);

  if (svgString) {
    svgString = injectViewBoxIfMissing(svgString);
  }

  const viewBox = resolveViewBox(svgString, nodes, graph, imageMeta);

  return {
    ...graph,
    nodes,
    image,
    svgString: svgString || null,
    viewBox,
  };
}

// ─── Discover which floors the new building JSON contains ────────────────────

function getNewGraphFloors(buildingCode, buildingJson) {
  const floors = new Set();
  for (const n of buildingJson.nodes || []) {
    const code = NEW_BUILDING_ID_TO_CODE[n.buildingId] || n.buildingId;
    if (code === buildingCode && n.floor != null) {
      floors.add(n.floor);
    }
  }
  for (const key of Object.keys(FLOOR_ALIASES)) {
    const [bld, flr] = key.split(':');
    if (bld === buildingCode) floors.add(Number(flr));
  }
  return floors;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
* Get the waypoint graph for a specific building and floor.
* Prefers the new building-level graph; falls back to legacy per-floor JSON.
*
* @param {string} building - Building code (e.g. 'H', 'CC', 'VE', 'MB', 'VL')
* @param {number} floor    - Floor number
* @returns {object|null}   - { nodes, edges, image, viewBox, meta } or null
*/
export function getFloorGraph(building, floor) {
  const b = (building || '').toString().toUpperCase();

  const newJson = NEW_BUILDING_GRAPHS[b];
  if (newJson) {
    const extracted = extractFloorGraph(newJson, b, floor);
    if (extracted) {
      return attachGraphMeta(b, floor, extracted);
    }
  }

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
  const seen = new Set();


  for (const [building, json] of Object.entries(NEW_BUILDING_GRAPHS)) {
    for (const floor of getNewGraphFloors(building, json)) {
      const key = `${building}:${floor}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ building, floor });
      }
    }
  }

  for (const [building, floors] of Object.entries(WAYPOINT_GRAPHS)) {
    for (const floor of Object.keys(floors)) {
      const key = `${building}:${Number(floor)}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ building, floor: Number(floor) });
      }
    }
  }

  return result;
}


/**
* Get a merged waypoint graph spanning multiple floors of the same building.
* Unlike getFloorGraph (single floor, cross-floor edges dropped), this function:
*   - Includes ALL nodes whose floor is in the `floors` array.
*   - Includes ALL edges, including cross-floor stair/elevator connections.
*
* This is the entry-point for multi-floor Dijkstra routing.
*
* @param {string}   building  - Building code (e.g. 'H', 'MB', 'VL')
* @param {number[]} floors    - Array of floor numbers to include
* @returns {object|null} { nodes, edges, meta, viewBox, image, svgString } or null
*/
export function getMultiFloorGraph(building, floors) {
if (!building || !floors || floors.length === 0) return null;


const b = building.toString().toUpperCase();
const floorSet = new Set(floors);


const buildingJson = NEW_BUILDING_GRAPHS[b];
if (!buildingJson) return null;


const nodeArray = buildingJson.nodes || [];
const edgeArray = buildingJson.edges || [];


// Collect nodes from all requested floors (respecting floor aliases).
const includedNodes = nodeArray.filter(n => {
  for (const floor of floorSet) {
    const alias = FLOOR_ALIASES[`${b}:${floor}`];
    if (alias?.exclusive) {
      if (alias.buildingIds.includes(n.buildingId) && alias.floors.includes(n.floor)) return true;
      continue;
    }
    const code = NEW_BUILDING_ID_TO_CODE[n.buildingId] || n.buildingId;
    if (code === b && n.floor === floor) return true;
  }
  return false;
});


if (includedNodes.length === 0) return null;


const nodeIds = new Set(includedNodes.map(n => n.id));


// Keep all edges where at least ONE endpoint is in our node set.
// This captures cross-floor stair/elevator edges (one endpoint per floor).
const includedEdges = edgeArray
  .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
  .map(e => ({
    from: e.source,
    to: e.target,
    weight: e.weight,
    accessible: e.accessible,
    type: e.type,
  }));


const nodesMap = {};
for (const n of includedNodes) {
  nodesMap[n.id] = n;
}


const mergedGraph = {
  nodes: nodesMap,
  edges: includedEdges,
  meta: buildingJson.meta,
};


// Use the lowest numbered floor for image/svgString (just for background display).
const lowestFloor = Math.min(...floors);
return attachGraphMeta(b, lowestFloor, mergedGraph);
}


export { IMAGE_META, NEW_BUILDING_GRAPHS, injectViewBoxIfMissing, resolveViewBox };
export default WAYPOINT_GRAPHS;



