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
    if (alias && alias.buildingIds.includes(n.buildingId) && alias.floors.includes(n.floor)) {
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

function attachGraphMeta(building, floor, graph) {
  const meta = IMAGE_META[building]?.[floor];

  let nodes = graph.nodes;
  if (Array.isArray(nodes)) {
    nodes = nodes.reduce((acc, node) => {
      if (node?.id != null) acc[node.id] = node;
      return acc;
    }, {});
  }

  // Ensure every node has a non-empty label so the room picker never shows
  // a blank entry.  Fall back to the node's id when label is missing or empty.
  if (nodes) {
    const labeled = {};
    for (const [id, node] of Object.entries(nodes)) {
      labeled[id] = node.label ? node : { ...node, label: id };
    }
    nodes = labeled;
  }

  const image = graph.image || meta?.image;

  // Prefer inline SVG string over PNG image for buildings that have vector
  // floor plans — the SVG coordinate space aligns better with the new graphs.
  let svgString = graph.svgString
    || (meta?.svgKey ? SVG_STRINGS?.[meta.svgKey] ?? null : null);

  // Some Inkscape SVGs (hall8, hall9) have width/height on the root <svg>
  // but NO viewBox attribute.  Without viewBox, SvgXml renders at raw SVG
  // coordinates without scaling to the component size, so only the top-left
  // corner of the floor plan is visible.  Inject a viewBox derived from the
  // SVG's own width/height so it scales correctly.
  if (svgString) {
    const rootTagEnd = svgString.indexOf('>');
    const rootTag = rootTagEnd >= 0 ? svgString.slice(0, rootTagEnd) : '';
    if (!rootTag.includes('viewBox=')) {
      const wm = rootTag.match(/\bwidth=["']([\d.]+)["']/);
      const hm = rootTag.match(/\bheight=["']([\d.]+)["']/);
      if (wm && hm) {
        svgString = svgString.replace('<svg', `<svg viewBox="0 0 ${wm[1]} ${hm[1]}"`);
      }
    }
  }

  // ── viewBox selection ──────────────────────────────────────────────────
  // The strategy depends on whether the floor plan is rendered as SVG or PNG:
  //
  //   SVG background → compute viewBox from node bounds.  The SVG has its
  //     own internal viewBox and renders proportionally into the same
  //     container, so rooms at matching proportional positions align.
  //
  //   PNG background → the viewBox must match the coordinate space the PNG
  //     was drawn in.  Priority order:
  //       1. graph.meta.viewBox  – explicit viewBox string in the JSON
  //       2. graph.meta.width/height – the JSON's declared coordinate space
  //          (most accurate; e.g. ve2.json says 801×378, ve1.json says 249×222)
  //       3. IMAGE_META.width/height – fallback when JSON has no meta dims
  //       4. computeViewBox from node bounds – last resort
  let viewBox = graph.viewBox;

  if (!viewBox) {
    if (svgString && nodes && Object.keys(nodes).length > 0) {
      viewBox = computeViewBox(nodes);
    } else if (graph.meta?.viewBox) {
      viewBox = graph.meta.viewBox;
    } else if (graph.meta?.width && graph.meta?.height) {
      viewBox = `0 0 ${graph.meta.width} ${graph.meta.height}`;
    } else if (meta?.width && meta?.height) {
      viewBox = `0 0 ${meta.width} ${meta.height}`;
    } else if (nodes && Object.keys(nodes).length > 0) {
      viewBox = computeViewBox(nodes);
    }
  }

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

export { IMAGE_META, NEW_BUILDING_GRAPHS };
export default WAYPOINT_GRAPHS;
