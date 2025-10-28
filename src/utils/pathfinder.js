function dist2(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx*dx + dy*dy;
}

export function buildGraph(nodes, { neighborRadius = 20, maxNeighbors = 8 } = {}) {
  const radius2 = neighborRadius * neighborRadius;
  const graph = new Map(); // id -> { node, edges: [{to, w}] }

  // Simple spatial hashing for speed (optional but helpful if you have many points)
  const cell = neighborRadius; // cell size ~= radius
  const buckets = new Map();
  const key = (x, y) => `${Math.floor(x/cell)},${Math.floor(y/cell)}`;
  for (const n of nodes) {
    const k = key(n.x, n.y);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(n);
  }

  const neighborCells = [
    [0,0],[1,0],[-1,0],[0,1],[0,-1],
    [1,1],[1,-1],[-1,1],[-1,-1]
  ];

  for (const n of nodes) {
    const candidates = [];
    const baseKey = key(n.x, n.y);
    for (const [dx, dy] of neighborCells) {
      const bk = baseKey.split(",");
      const k2 = `${+bk[0]+dx},${+bk[1]+dy}`;
      const bucket = buckets.get(k2);
      if (!bucket) continue;
      for (const m of bucket) {
        if (m === n) continue;
        const d2 = dist2(n, m);
        if (d2 <= radius2) candidates.push({ m, d2 });
      }
    }

    // keep closest maxNeighbors
    candidates.sort((a,b)=>a.d2-b.d2);
    const edges = candidates.slice(0, maxNeighbors).map(c => ({ to: c.m.id, w: Math.sqrt(c.d2) }));

    graph.set(n.id, { node: n, edges });
  }
  return graph;
}

export function aStar(graph, startId, goalId) {
  const start = graph.get(startId).node;
  const goal = graph.get(goalId).node;

  const h = (id) => {
    const n = graph.get(id).node;
    const dx = n.x - goal.x, dy = n.y - goal.y;
    return Math.hypot(dx, dy);
  };

  const open = new Set([startId]);
  const cameFrom = new Map();

  const g = new Map(); // cost from start
  const f = new Map(); // estimated total cost
  for (const id of graph.keys()) { g.set(id, Infinity); f.set(id, Infinity); }
  g.set(startId, 0);
  f.set(startId, h(startId));

  // A lightweight priority retrieval
  const bestInOpen = () => {
    let best = null, bestF = Infinity;
    for (const id of open) {
      const val = f.get(id);
      if (val < bestF) { bestF = val; best = id; }
    }
    return best;
  };

  while (open.size) {
    const current = bestInOpen();
    if (current === goalId) return reconstructPath(cameFrom, current);

    open.delete(current);
    const { edges } = graph.get(current);
    for (const { to, w } of edges) {
      const tentative = g.get(current) + w;
      if (tentative < g.get(to)) {
        cameFrom.set(to, current);
        g.set(to, tentative);
        f.set(to, tentative + h(to));
        if (!open.has(to)) open.add(to);
      }
    }
  }
  return []; // no path
}

function reconstructPath(cameFrom, current) {
  const path = [current];
  while (cameFrom.has(current)) {
    current = cameFrom.get(current);
    path.push(current);
  }
  path.reverse();
  return path; // array of node ids
}

// If you have obstacles, inject a custom `hasLineOfSight(a, b)` here.
// For open terrain, LOS is always true; we also de-jitter nearly-collinear points.
function almostCollinear(a, b, c, eps = 0.01) {
  const abx = b.x - a.x, aby = b.y - a.y;
  const bcx = c.x - b.x, bcy = c.y - b.y;
  const cross = Math.abs(abx*bcy - aby*bcx);
  const la = Math.hypot(abx, aby), lb = Math.hypot(bcx, bcy);
  return cross / Math.max(la+lb, 1e-6) < eps;
}

export function smoothPath(nodeIds, graph) {
  if (nodeIds.length <= 2) return nodeIds.slice();
  // remove nearly-collinear mid points
  const pts = nodeIds.map(id => graph.get(id).node);
  const keep = [pts[0]];
  for (let i=1; i<pts.length-1; i++) {
    if (!almostCollinear(pts[i-1], pts[i], pts[i+1])) keep.push(pts[i]);
  }
  keep.push(pts[pts.length-1]);
  return keep.map(p => p.id);
}