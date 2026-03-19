/**
 * ───────────────────────────────────────────────────────────────────────────
 * Indoor Pathfinding & Directions Service
 * ───────────────────────────────────────────────────────────────────────────
 * Computes the shortest path between two indoor waypoints using Dijkstra's
 * algorithm on the floor graph produced by getFloorGraph().
 *
 * Edge handling strategy:
 *   - If the graph has explicit edges (edges.length > 0), those are merged with
 *     auto-generated K-nearest-neighbor edges to ensure full connectivity.
 *   - If edges is empty, edges are auto-generated entirely from node proximity.
 *   This lets individual floor JSON files ship accurate corridor edges while
 *   still providing a reasonable fallback for any floor without them.
 *
 * Coordinate scale:
 *   Each floor JSON can carry a "metresPerUnit" field in its "meta" block to
 *   give the exact real-world scale for that building.  When absent, the code
 *   derives it from the viewBox width and the DEFAULT_BUILDING_WIDTH_M constant
 *   (assumed width of the building in metres).  This makes distance and walking-
 *   time estimates reasonable for every building without manual calibration.
 *
 * Auto-edge distance threshold:
 *   AUTO_MAX_DIST is computed as a fraction of the canvas diagonal so it scales
 *   correctly regardless of the floor's coordinate system size (CC1 is 1708 units
 *   wide; VE1 is only 249 units wide — a fixed pixel threshold would break one
 *   or the other).
 * ───────────────────────────────────────────────────────────────────────────
 */

export const METRES_PER_UNIT = 0.1;   // default fallback when no meta is available
const WALKING_SPEED_MPS = 1.2;
const AUTO_K = 4;
/**
 * Default real-world building width used when "metresPerUnit" is absent from meta.
 * Concordia's Hall, CC, MB and VL buildings are all roughly 80-120 m wide;
 * 100 m is a reasonable middle estimate.
 */
const DEFAULT_BUILDING_WIDTH_M = 100;

// ─── Geometry helpers ────────────────────────────────────────────────────────

function euclidean(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function angleDeg(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
}

/** Canonical sort key for an undirected edge between two node IDs. */
function edgeKey(idA, idB) {
  return [idA, idB].sort((a, b) => a.localeCompare(b)).join('||');
}

// ─── Edge generation ─────────────────────────────────────────────────────────

/**
 * Derive metres-per-SVG-unit for the floor.
 * Priority: graph.meta.metresPerUnit > computed from viewBox width > fallback constant.
 */
function metresPerUnit(graph) {
  if (graph?.meta?.metresPerUnit) return graph.meta.metresPerUnit;
  if (graph?.viewBox) {
    const parts = graph.viewBox.split(' ').map(Number);
    if (parts.length === 4 && parts[2] > 0) {
      return DEFAULT_BUILDING_WIDTH_M / parts[2];
    }
  }
  return METRES_PER_UNIT;
}

/** Return the connected components of the graph described by adj. */
function getComponents(nodesMap, adj) {
  const ids = Object.keys(nodesMap);
  const visited = new Set();
  const comps = [];
  for (const start of ids) {
    if (visited.has(start)) continue;
    const comp = [];
    const queue = [start];
    visited.add(start);
    while (queue.length) {
      const cur = queue.shift();
      comp.push(cur);
      for (const id of (adj[cur] || [])) {
        if (!visited.has(id)) { visited.add(id); queue.push(id); }
      }
    }
    comps.push(comp);
  }
  return comps;
}

/** Phase 1 of auto-edge generation: K-nearest-neighbour edges. */
function buildKnnEdges(list, seen) {
  const edges = [];
  for (const node of list) {
    const neighbours = list
      .filter(n => n.id !== node.id)
      .map(n => ({ id: n.id, dist: euclidean(node, n) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, AUTO_K);

    for (const nb of neighbours) {
      const key = edgeKey(node.id, nb.id);
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ from: node.id, to: nb.id, weight: nb.dist });
      }
    }
  }
  return edges;
}

/** Find the cheapest edge that bridges two different components. */
function findBestBridgeEdge(comps, nodesMap) {
  let bestEdge = null;
  let bestDist = Infinity;
  for (let i = 0; i < comps.length; i++) {
    for (let j = i + 1; j < comps.length; j++) {
      for (const aId of comps[i]) {
        for (const bId of comps[j]) {
          const d = euclidean(nodesMap[aId], nodesMap[bId]);
          if (d < bestDist) { bestDist = d; bestEdge = { from: aId, to: bId, dist: d }; }
        }
      }
    }
  }
  return bestEdge;
}

/** Phase 2: Bridge any disconnected components until the graph is fully connected. */
function bridgeComponents(nodesMap, edges, adj, seen) {
  let comps = getComponents(nodesMap, adj);
  while (comps.length > 1) {
    const best = findBestBridgeEdge(comps, nodesMap);
    if (!best) break;
    const key = edgeKey(best.from, best.to);
    if (!seen.has(key)) {
      seen.add(key);
      edges.push({ from: best.from, to: best.to, weight: best.dist });
    }
    adj[best.from].push(best.to);
    adj[best.to].push(best.from);
    comps = getComponents(nodesMap, adj);
  }
}

/**
 * Auto-generate bidirectional edges using K-nearest-neighbour proximity,
 * followed by a connectivity-guarantee phase that bridges any remaining
 * disconnected components with their minimum-cost inter-component edge.
 *
 * This ensures every floor graph is fully connected regardless of K value
 * or node density (sparse floors like MB2 and VL1 need more than K=4 hops
 * to reach all clusters, but the bridge phase fixes that automatically).
 */
function autoGenerateEdges(nodesMap) {
  const list = Object.values(nodesMap);
  const seen = new Set();
  const edges = buildKnnEdges(list, seen);

  const adj = {};
  for (const id of Object.keys(nodesMap)) adj[id] = [];
  for (const e of edges) { adj[e.from].push(e.to); adj[e.to].push(e.from); }

  bridgeComponents(nodesMap, edges, adj, seen);

  return edges;
}

/**
 * Build the explicit-only adjacency for connected-component analysis.
 * Room-to-room edges are excluded so doorways isolated behind rooms still
 * receive bridge auto-edges that connect them to the traversable network.
 */
function buildExplicitAdj(nodesMap, explicit) {
  const explicitAdj = {};
  for (const id of Object.keys(nodesMap)) explicitAdj[id] = [];
  for (const e of explicit) {
    if (!nodesMap[e.from] || !nodesMap[e.to]) continue;
    const fromType = (nodesMap[e.from].type || '').toLowerCase();
    const toType   = (nodesMap[e.to].type   || '').toLowerCase();
    if (fromType !== 'room' && toType !== 'room') {
      explicitAdj[e.from].push(e.to);
      explicitAdj[e.to].push(e.from);
    }
  }
  return explicitAdj;
}

/** Returns true when an auto-generated edge should be added to the edge list. */
function shouldAddAutoEdge(e, explicitKeys, explicitNodes, compOf) {
  if (explicitKeys.has(edgeKey(e.from, e.to))) return false;
  if (explicitNodes.has(e.from) && explicitNodes.has(e.to)) {
    if (compOf[e.from] !== undefined && compOf[e.from] === compOf[e.to]) return false;
  }
  return true;
}

/**
 * Build an adjacency list from the graph's explicit edges merged with
 * auto-generated KNN edges.
 *
 * Auto-edges are ONLY added for nodes that have no explicit coverage, OR
 * for bridge edges that connect otherwise-disconnected components.
 * This is critical for floors with hand-crafted corridor edges (e.g. Hall 8):
 * if auto-edges were added freely between explicitly-mapped nodes, Dijkstra
 * would find diagonal straight-line shortcuts that cut through walls instead
 * of following the real corridor path.
 *
 * However, if the explicit graph has disconnected components (e.g. a room
 * isolated from the hallway network), bridge auto-edges between components
 * are still allowed so Dijkstra can always find a path.
 *
 * For floors with zero explicit edges every node is "uncovered" and the full
 * KNN + bridge auto-generation runs as normal.
 */
function buildAdjList(nodesMap, explicitEdges) {
  const adj = {};
  for (const id of Object.keys(nodesMap)) adj[id] = [];

  const explicit = explicitEdges || [];
  const allEdges = [...explicit];

  const explicitNodes = new Set();
  for (const e of explicit) { explicitNodes.add(e.from); explicitNodes.add(e.to); }

  const explicitKeys = new Set(
    explicit.map(e => edgeKey(e.from, e.to))
  );

  const explicitAdj  = buildExplicitAdj(nodesMap, explicit);
  const explicitComps = getComponents(nodesMap, explicitAdj);
  const compOf = {};
  explicitComps.forEach((comp, idx) => { for (const id of comp) compOf[id] = idx; });

  const autoEdges = autoGenerateEdges(nodesMap);
  for (const e of autoEdges) {
    if (shouldAddAutoEdge(e, explicitKeys, explicitNodes, compOf)) {
      allEdges.push(e);
    }
  }

  for (const edge of allEdges) {
    const { from, to } = edge;
    if (!nodesMap[from] || !nodesMap[to]) continue;
    const weight = edge.weight ?? euclidean(nodesMap[from], nodesMap[to]);
    adj[from].push({ id: to, weight });
    adj[to].push({ id: from, weight });
  }

  return adj;
}

// ─── Dijkstra ────────────────────────────────────────────────────────────────

/** Reconstruct the shortest path by walking the prev-pointer chain. */
function reconstructPath(prev, endId) {
  const path = [];
  let cur = endId;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return path;
}

/** Attempt to relax the distance to neighbour nb from current node cur. */
function relaxNeighbour(nb, cur, dist, prev, queue, nodesMap, endId, accessibleOnly) {
  if (accessibleOnly && nodesMap[nb.id]?.accessible === false) return;
  const nbType = (nodesMap[nb.id]?.type || '').toLowerCase();
  if (nbType === 'room' && nb.id !== endId) return;
  const nd = dist[cur] + nb.weight;
  if (nd < dist[nb.id]) {
    dist[nb.id] = nd;
    prev[nb.id] = cur;
    queue.push({ id: nb.id, dist: nd });
  }
}

/**
 * Dijkstra's shortest-path algorithm on the indoor graph.
 *
 * @param {Record<string,{id,x,y,accessible}>} nodesMap
 * @param {Record<string,{id,weight}[]>}        adj
 * @param {string}  startId
 * @param {string}  endId
 * @param {boolean} accessibleOnly – skip nodes with accessible === false
 * @returns {{ path: string[], totalDist: number } | null}
 */
function dijkstra(nodesMap, adj, startId, endId, accessibleOnly) {
  const dist = {};
  const prev = {};
  const visited = new Set();

  for (const id of Object.keys(nodesMap)) dist[id] = Infinity;
  dist[startId] = 0;

  // Sorted array acts as a min-priority queue (adequate for ≤ 1 000 nodes)
  const queue = [{ id: startId, dist: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.dist - b.dist);
    const { id: cur } = queue.shift();

    if (visited.has(cur)) continue;
    visited.add(cur);
    if (cur === endId) break;

    for (const nb of (adj[cur] || [])) {
      if (!visited.has(nb.id)) {
        relaxNeighbour(nb, cur, dist, prev, queue, nodesMap, endId, accessibleOnly);
      }
    }
  }

  if (!Number.isFinite(dist[endId])) return null;

  return { path: reconstructPath(prev, endId), totalDist: dist[endId] };
}

// ─── Turn-by-turn step generation ────────────────────────────────────────────

/**
 * Classify the bearing change between two consecutive segments.
 */
function classifyTurn(fromAngle, toAngle) {
  let diff = toAngle - fromAngle;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;

  if (Math.abs(diff) <= 25)  return 'straight';
  if (diff > 25  && diff <= 115) return 'right';
  if (diff < -25 && diff >= -115) return 'left';
  return 'u-turn';
}

function fmtDist(metres) {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

function fmtDur(secs) {
  if (secs < 60) return `${Math.round(secs)} sec`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return s > 0 ? `${m} min ${s} sec` : `${m} min`;
}

function turnInstruction(turn, label) {
  if (turn === 'right') return `Turn right at ${label}`;
  if (turn === 'left')  return `Turn left at ${label}`;
  return `Turn around at ${label}`;
}

function buildTurnStep(curNode, curNodeId, turn, segDistUnits, mpu, stepCount) {
  const distM = segDistUnits * mpu;
  const durS  = distM / WALKING_SPEED_MPS;
  return {
    id: `s${stepCount}`,
    instruction: turnInstruction(turn, curNode.label || curNodeId),
    distance: fmtDist(distM),
    duration: fmtDur(durS),
  };
}

function buildArriveStep(curNode, curNodeId, segDistUnits, mpu, stepCount) {
  const distM = segDistUnits * mpu;
  const durS  = distM / WALKING_SPEED_MPS;
  return {
    id: `s${stepCount}`,
    instruction: `Arrive at ${curNode.label || curNodeId}`,
    distance: distM > 0 ? fmtDist(distM) : '',
    duration: distM > 0 ? fmtDur(durS)   : '',
  };
}

/**
 * Derive a turn-by-turn step list from a sequence of node IDs.
 * mpu (metres per unit) is passed in so distances are accurate per-building.
 * Each "segment" between turns is collapsed into one walk step.
 */
function generateSteps(path, nodesMap, mpu) {
  if (path.length === 0) return [];

  const startLabel = nodesMap[path[0]]?.label || path[0];

  if (path.length === 1) {
    return [{ id: 's0', instruction: `You are at ${startLabel}`, distance: '', duration: '' }];
  }

  const steps = [{ id: 's0', instruction: `Start at ${startLabel}`, distance: '', duration: '' }];

  let prevAngle = angleDeg(nodesMap[path[0]], nodesMap[path[1]]);
  let segDistUnits = 0;

  for (let i = 1; i < path.length; i++) {
    const prevNode = nodesMap[path[i - 1]];
    const curNode  = nodesMap[path[i]];
    segDistUnits += euclidean(prevNode, curNode);

    if (i < path.length - 1) {
      const nextNode = nodesMap[path[i + 1]];
      const curAngle = angleDeg(curNode, nextNode);
      const turn = classifyTurn(prevAngle, curAngle);

      if (turn !== 'straight') {
        steps.push(buildTurnStep(curNode, path[i], turn, segDistUnits, mpu, steps.length));
        segDistUnits = 0;
      }

      prevAngle = curAngle;
    } else {
      steps.push(buildArriveStep(curNode, path[i], segDistUnits, mpu, steps.length));
    }
  }

  return steps;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute the shortest indoor path between two nodes.
 *
 * @param {object}  graph          – floor graph from getFloorGraph()
 * @param {string}  originId       – starting node ID
 * @param {string}  destId         – destination node ID
 * @param {boolean} accessibleOnly – if true, avoid nodes with accessible===false
 * @returns {{
 *   path: string[],
 *   pathPoints: {x:number, y:number, id:string}[],
 *   steps: {id,instruction,distance,duration}[],
 *   distanceText: string,
 *   durationText: string,
 *   totalMetres: number,
 * } | null}
 */
export function computeIndoorDirections(graph, originId, destId, accessibleOnly = false) {
  if (!graph || !originId || !destId) return null;

  const nodesMap = graph.nodes;
  if (!nodesMap?.[originId] || !nodesMap?.[destId]) return null;

  // Same-node degenerate case
  if (originId === destId) {
    const label = nodesMap[originId]?.label || originId;
    return {
      path: [originId],
      pathPoints: [{ x: nodesMap[originId].x, y: nodesMap[originId].y, id: originId }],
      steps: [{ id: 's0', instruction: `You are already at ${label}`, distance: '', duration: '' }],
      distanceText: '0 m',
      durationText: '0 sec',
      totalMetres: 0,
    };
  }

  // Derive real-world scale for this specific building/floor
  const mpu = metresPerUnit(graph);

  const adj = buildAdjList(nodesMap, graph.edges || []);
  const result = dijkstra(nodesMap, adj, originId, destId, accessibleOnly);
  if (!result) return null;

  const { path, totalDist } = result;
  const totalMetres = totalDist * mpu;
  const totalSecs   = totalMetres / WALKING_SPEED_MPS;

  const distanceText = fmtDist(totalMetres);
  const durationText = fmtDur(totalSecs);

  const steps      = generateSteps(path, nodesMap, mpu);
  const pathPoints = path.map(id => ({ x: nodesMap[id].x, y: nodesMap[id].y, id }));

  return { path, pathPoints, steps, distanceText, durationText, totalMetres };
}

const TRAVERSABLE_TYPES = new Set([
  'corridor',
  'hallway_waypoint',
  'doorway',
  'stair_landing',
  'elevator_door',
  'building_entry_exit',
]);

/**
 * Find the node in nodesMap closest to a given SVG-coordinate position.
 * Prefers traversable network nodes (hallway waypoints, doorways, corridors,
 * stairs, elevators) so the nearest-node result can be used as a route origin.
 *
 * @param {Record<string,{x,y}>} nodesMap
 * @param {{ x: number, y: number }} pos
 * @returns {string | null} node ID of the nearest node
 */
export function findNearestNode(nodesMap, pos) {
  if (!nodesMap || !pos) return null;
  let minTraversableDist = Infinity;
  let nearestTraversable = null;
  let minAnyDist = Infinity;
  let nearestAny = null;
  for (const [id, node] of Object.entries(nodesMap)) {
    if (node.x == null || node.y == null) continue;
    const d = euclidean(node, pos);
    if (d < minAnyDist) { minAnyDist = d; nearestAny = id; }
    const type = (node.type || '').toLowerCase();
    if (TRAVERSABLE_TYPES.has(type) && d < minTraversableDist) {
      minTraversableDist = d; nearestTraversable = id;
    }
  }
  return nearestTraversable || nearestAny;
}
