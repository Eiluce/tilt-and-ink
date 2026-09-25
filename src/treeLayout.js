// Layout of the Upgrade Tree as an art deco stepped tower (GAME_DESIGN.md
// section 5). Pure: takes the node data, returns positions, so it can be
// checked outside the browser.
//
//  - Each branch owns a few vertical lanes side by side; the Tables spine
//    (passes and global nodes) is the single lane in the middle.
//  - Rows climb the tower. Each table is one setback: its nodes take the
//    rows above the previous table's pass, and its own pass sits on the row
//    above them.
//  - Links inside a branch are one straight segment: straight up the same
//    lane, or exactly 45 degrees (k lanes over for k rows up), from the
//    node's first prerequisite in its branch.
//  - Links from another branch are stepped, with 90 degree bends: up out
//    of the prerequisite into the gap above its row, across that gap, up
//    the gutter between lanes beside the upgrade, and into its side. The
//    gaps and gutters are clear of diamonds and name plaques.
//  - A node always sits above every prerequisite, so links only climb.
//  - Nodes that need Second Reel and nothing else in their branch rise from
//    the plinth; nodes that only need other branches have no riser.
//  - A node with a child on a later table keeps its lane above it for that
//    child, so the later child climbs straight up and nothing placed
//    earlier blocks it; its same-table siblings step aside at 45 degrees.
//  - If a branch still has a link that can't be made straight, it gets
//    another lane and the layout runs again.

// Left to right. Rules sits between Targets and Charge & Skills, the
// branches its cross-branch links come from or go to, with Ramps & Lanes
// one over.
const TOWER_ORDER = ['ball', 'bumpers', 'tables', 'targets', 'rules', 'skills', 'lanes'];
const TOWER_HUB = 'secondReel';

function layoutTower(nodes, tableCount) {
  const byId = Object.fromEntries(nodes.map((u) => [u.id, u]));
  // A pass sits on the top row of the table before the one it opens.
  const tierOf = (u) => (u.pass ? u.pass - 1 : u.table || 1);
  const primary = {};
  for (const u of nodes) {
    const same = Object.keys(u.requires || {}).find((r) => r !== TOWER_HUB && byId[r].branch === u.branch);
    primary[u.id] = same || null;
  }
  // Prerequisites from other branches, and whether a node rises from the
  // plinth (it needs Second Reel and has no prerequisite in its branch).
  const cross = {};
  const riser = {};
  for (const u of nodes) {
    cross[u.id] = Object.keys(u.requires || {}).filter((r) => r !== TOWER_HUB && byId[r].branch !== u.branch);
    riser[u.id] = !primary[u.id] && TOWER_HUB in (u.requires || {});
  }
  const kids = {};
  for (const u of nodes) if (primary[u.id]) (kids[primary[u.id]] = kids[primary[u.id]] || []).push(u.id);
  // The child on a later table that a node keeps its lane for, if any.
  const climber = {};
  for (const u of nodes) {
    const later = (kids[u.id] || []).filter((k) => tierOf(byId[k]) > tierOf(u))
      .sort((a, c) => tierOf(byId[a]) - tierOf(byId[c]));
    if (later.length) climber[u.id] = later[0];
  }
  const ancestors = (id) => {
    const out = new Set();
    for (let p = primary[id]; p; p = primary[p]) out.add(p);
    return out;
  };

  // Lanes per branch to start with: room for its roots side by side, and
  // for its busiest node's children to fan out.
  const extra = Object.fromEntries(TOWER_ORDER.map((b) => [b, 0]));
  let bestResult = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const result = attemptLayout(extra);
    if (!bestResult || result.approximate < bestResult.approximate) bestResult = result;
    const crowded = Object.entries(result.approximateIn).filter(([, n]) => n > 0).map(([b]) => b);
    if (!crowded.length) break;
    for (const b of crowded) extra[b] += 1;
  }
  return bestResult;

  function attemptLayout(extra) {
  const lanes = {};
  const firstLane = {};
  let lane = 0;
  for (const b of TOWER_ORDER) {
    const members = nodes.filter((u) => u.branch === b && u.id !== TOWER_HUB);
    const roots = members.filter((u) => !primary[u.id]).length;
    const fan = Math.max(0, ...members.map((u) => (kids[u.id] || []).length));
    lanes[b] = b === 'tables' ? 1 : Math.max(2, roots, fan + 1) + extra[b];
    firstLane[b] = lane;
    lane += lanes[b];
  }
  const laneCount = lane;

  const cells = new Map(); // "lane,row" -> node id
  const reserved = new Map(); // "lane,row" -> id of the chain that climbs through it
  const place = {}; // id -> [lane, row]
  const key = (l, r) => `${l},${r}`;
  const free = (l, r, id) => {
    if (cells.has(key(l, r))) return false;
    const owner = reserved.get(key(l, r));
    return !owner || owner === id || ancestors(id).has(owner);
  };
  const occupy = (id, l, r) => {
    place[id] = [l, r];
    cells.set(key(l, r), id);
    // It has arrived: release what was held for it beyond this cell.
    for (const [k, owner] of reserved) {
      if (owner !== id) continue;
      const [kl, kr] = k.split(',').map(Number);
      if (kl !== l || kr > r) reserved.delete(k);
    }
    // Keep the lane above for the later-table child (and its descendants);
    // the deepest chain through a cell owns it.
    if (climber[id]) for (let rr = r + 1; rr <= r + 60; rr++) reserved.set(key(l, rr), climber[id]);
  };
  const clearAbove = (l, r) => {
    for (let rr = r + 1; rr <= r + 60; rr++) if (cells.has(key(l, rr))) return false;
    return true;
  };

  const tierBase = [0, 0];
  const passRow = [];
  const approximateIn = Object.fromEntries(TOWER_ORDER.map((b) => [b, 0])); // links not straight or 45 degrees

  function placeNode(u, t) {
    const b = u.branch;
    const lo = firstLane[b];
    const hi = lo + lanes[b] - 1;
    const mid = Math.floor((lo + hi) / 2);
    const inBranch = (l) => l >= lo && l <= hi;
    const p = primary[u.id];
    // Above every prerequisite from another branch.
    const above = Math.max(0, ...cross[u.id].map((r) => place[r][1] + 1));
    if (!p) {
      // Root: the first lane (from the middle out) that's free. One that
      // rises from the plinth needs its cells down to the plinth clear, so
      // its riser is straight; one that will climb also wants its lane
      // empty above it.
      const order = [mid];
      for (let d = 1; d <= lanes[b]; d++) order.push(mid - d, mid + d);
      for (const strict of [true, false]) {
        for (let row = Math.max(tierBase[t], above); row < tierBase[t] + above + 40; row++) {
          for (const l of order.filter(inBranch)) {
            let clear = !(strict && climber[u.id]) || clearAbove(l, row);
            for (let r = riser[u.id] ? 0 : row; r <= row && clear; r++) clear = free(l, r, u.id);
            if (clear) return occupy(u.id, l, row);
          }
        }
      }
    }
    const [pl, pr] = place[p];
    const want = Math.max(pr + 1, tierBase[t], above);
    let options = [];
    let firstRow = null;
    for (let row = want; row < want + 12 && (firstRow === null || row <= firstRow + 2); row++) {
      const k = row - pr;
      let straight = true;
      for (let r = pr + 1; r <= row && straight; r++) straight = free(pl, r, u.id);
      if (straight) options.push([pl, row]);
      for (const dl of [k, -k]) {
        if (!inBranch(pl + dl)) continue;
        let ok = true;
        for (let j = 1; j <= k && ok; j++) ok = free(pl + Math.sign(dl) * j, pr + j, u.id);
        if (ok) options.push([pl + dl, row]);
      }
      if (options.length && firstRow === null) firstRow = row;
    }
    // Among same-table siblings, the one with the most children goes straight
    // up; the others step aside at 45 degrees so the fan has room.
    // A sibling that will climb to a later table steps further out, so its
    // kept lane doesn't box in the fan beside it, and wants its lane empty
    // above it.
    const sibs = kids[p].filter((id) => tierOf(byId[id]) === t);
    const best = sibs.reduce((a, c) => ((kids[c] || []).length > (kids[a] || []).length ? c : a));
    const isBest = u.id === best || sibs.length < 2;
    const climbs = Boolean(climber[u.id]);
    const rank = ([l, row]) => [
      climbs && !clearAbove(l, row) ? 1 : 0,
      climbs && !isBest ? -Math.abs(l - pl) : 0,
      row - want,
      isBest ? (l === pl ? 0 : 1) : (l === pl ? 1 : 0),
      Math.abs(l - pl),
    ];
    options.sort((a, c) => {
      const ra = rank(a);
      const rc = rank(c);
      for (let i = 0; i < ra.length; i++) if (ra[i] !== rc[i]) return ra[i] - rc[i];
      return 0;
    });
    if (options.length) return occupy(u.id, ...options[0]);
    // Fallback: nearest free cell in the branch; its link won't be 45 degrees.
    approximateIn[b] += 1;
    for (let row = want; ; row++) {
      for (let l = lo; l <= hi; l++) if (free(l, row, u.id)) return occupy(u.id, l, row);
    }
  }

  const spine = firstLane.tables;
  for (let t = 1; t <= tableCount; t++) {
    let pending = nodes.filter((u) => !u.pass && u.id !== TOWER_HUB && (u.table || 1) === t);
    while (pending.length) {
      const before = pending.length;
      pending = pending.filter((u) => {
        const p = primary[u.id];
        if ((p && !place[p]) || cross[u.id].some((r) => !place[r])) return true;
        placeNode(u, t);
        return false;
      });
      if (pending.length === before) throw new Error(`Tree layout: can't place ${pending.map((u) => u.id)}`);
    }
    const rows = nodes.filter((u) => place[u.id] && tierOf(u) === t).map((u) => place[u.id][1]);
    passRow[t] = Math.max(tierBase[t], ...rows) + 1;
    const pass = nodes.find((u) => u.pass === t + 1);
    if (pass) occupy(pass.id, spine, passRow[t]);
    tierBase[t + 1] = passRow[t] + 1;
  }

  // Links: from the primary prerequisite, except on the spine, where each
  // node links to the spine node right below it so no wire runs through one.
  const links = [];
  const spineIds = nodes.filter((u) => u.branch === 'tables' && u.id !== TOWER_HUB).map((u) => u.id)
    .sort((a, c) => place[a][1] - place[c][1]);
  for (const u of nodes) {
    if (u.id === TOWER_HUB) continue;
    if (u.branch === 'tables') {
      const i = spineIds.indexOf(u.id);
      links.push({ from: i ? spineIds[i - 1] : null, to: u.id });
    } else if (primary[u.id] || riser[u.id]) {
      links.push({ from: primary[u.id], to: u.id });
    }
  }

  // Stepped links from other branches, as [lane, row] points (fractional:
  // 0.5 of a lane is the gutter between two lanes). Several links into one
  // node from the same side get their own gutter line and entry height.
  const GAP_ABOVE = 0.31; // between a diamond's top (0.23) and the plaque of the row above (0.39)
  const bySide = {};
  for (const u of nodes) {
    for (const req of cross[u.id]) {
      const [ls, rs] = place[req];
      const [lt, rt] = place[u.id];
      const side = ls < lt ? -1 : 1;
      const k = `${u.id}${side}`;
      const n = (bySide[k] = (bySide[k] || 0) + 1) - 1;
      const gutter = lt + side * (0.5 - n * 0.06);
      const entry = rt + (n % 2 ? -0.07 : 0.07) * Math.ceil(n / 2);
      const gap = rs + GAP_ABOVE + ((rs * 7 + ls) % 3) * 0.02;
      links.push({
        from: req,
        to: u.id,
        cross: true,
        route: [[ls, rs], [ls, gap], [gutter, gap], [gutter, entry], [lt, entry]],
      });
    }
  }
  const approximate = Object.values(approximateIn).reduce((a, c) => a + c, 0);
  return { place, links, firstLane, lanes, laneCount, tierBase, passRow, approximate, approximateIn };
  }
}

if (typeof module !== 'undefined') module.exports = { layoutTower, TOWER_ORDER, TOWER_HUB };
