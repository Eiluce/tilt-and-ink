// The Upgrade Tree screen, drawn as an art deco stepped tower in black and
// gold. Every upgrade is a diamond with a name plaque; a bought diamond
// fills with its branch colour. Each branch climbs its own lanes, each table
// is one setback of the tower, and every link is a single straight segment
// (straight up, or exactly 45 degrees). The layout is computed from the node
// data by layoutTower() in treeLayout.js. Opens with U or the panel buttons;
// the game pauses while it's open.
//
// Two more tabs: the table picker (lobby cards for all eight tables) and
// the skill loadout (which skill sits on which key).

const BRANCH_COLOR = {
  tables: '#f2d894',
  bumpers: '#ff6b4f',
  targets: '#3cc7cf',
  rules: '#c690ff',
  lanes: '#ffc53a',
  skills: '#62a8ff',
  ball: '#86dc6c',
};
const DECO_GOLD = '#d4a646';
const DECO_BLACK = '#0b0b0b';

const LANE_PX = 100; // lane pitch = row height, so a one-lane step is 45 degrees
const PLINTH_Y = 96; // the gold line the tower stands on (row 0 is at y 0)
const SETBACK_PX = 26; // how much narrower each table's step is
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const READABLE_ZOOM = 0.72; // Fit never goes smaller: plaque names stay about 9 px or more
const FAR_ZOOM = 0.5; // below this, plaques and levels hide
const HUB_DROP = 64; // Second Reel sits this far below the plinth, clear of its gold lines

// 16 x 16 angular glyphs centred on 0,0; C is replaced by the ink colour.
const GLYPHS = {
  plus: '<path d="M-6 0H6M0-6V6" fill="none" stroke="C" stroke-width="2.4" stroke-linecap="square"/>',
  times: '<path d="M-5-5L5 5M5-5L-5 5" fill="none" stroke="C" stroke-width="2.4" stroke-linecap="square"/>',
  eye: '<path d="M-7 0L-3.5-4H3.5L7 0L3.5 4H-3.5Z" fill="none" stroke="C" stroke-width="1.7"/><rect x="-2" y="-2" width="4" height="4" fill="C"/>',
  bolt: '<path d="M2-8L-5 1H0L-2 8L5-1H0Z" fill="C"/>',
  ticket: '<path d="M-7-4.5H7V-1.5L5.5 0L7 1.5V4.5H-7V1.5L-5.5 0L-7-1.5Z" fill="C"/>',
  chevrons: '<path d="M-6-1L0-6L6-1M-6 5L0 0L6 5" fill="none" stroke="C" stroke-width="2.2"/>',
  coin: '<path d="M0-7L7 0L0 7L-7 0Z" fill="none" stroke="C" stroke-width="1.8"/><path d="M0-3V3" stroke="C" stroke-width="1.8"/>',
  clock: '<path d="M-6-6H6V6H-6Z" fill="none" stroke="C" stroke-width="1.7"/><path d="M0-3.5V0H3" fill="none" stroke="C" stroke-width="1.7"/>',
  star: '<path d="M0-7L2-2.2L7-2.2L3 1L4.5 6.2L0 3.2L-4.5 6.2L-3 1L-7-2.2L-2-2.2Z" fill="C"/>',
  drop: '<path d="M0-7.5L5 1L0 6.5L-5 1Z" fill="C"/>',
  battery: '<path d="M-7-4H5V4H-7Z" fill="none" stroke="C" stroke-width="1.7"/><path d="M5-2H7V2H5Z M-5-2H0V2H-5Z" fill="C"/>',
  reel: '<path d="M-6-6H6V6H-6Z" fill="none" stroke="C" stroke-width="1.7"/><rect x="-1.5" y="-4" width="3" height="3" fill="C"/><rect x="-4" y="1" width="3" height="3" fill="C"/><rect x="1" y="1" width="3" height="3" fill="C"/>',
  magnet: '<path d="M-4.5-6V1L0 5L4.5 1V-6" fill="none" stroke="C" stroke-width="3.2"/>',
  flipper: '<path d="M-5 3L5-3" stroke="C" stroke-width="3.6"/><rect x="-7.5" y="0.5" width="5" height="5" fill="C"/>',
  ball: '<path d="M0-6L6 0L0 6L-6 0Z" fill="C"/>',
  balls: '<path d="M-4 0L-1 3L-4 6L-7 3Z M4 0L7 3L4 6L1 3Z M0-7L3-4L0-1L-3-4Z" fill="C"/>',
  echo: '<path d="M-3-6L1 0L-3 6M2-8L7 0L2 8" fill="none" stroke="C" stroke-width="2"/><rect x="-7.5" y="-1.5" width="3" height="3" fill="C"/>',
  chain: '<path d="M-7-3H0V3H-7Z M0-3H7V3H0Z" fill="none" stroke="C" stroke-width="1.8"/>',
  shield: '<path d="M0-7L6-4.5V1L0 7.5L-6 1V-4.5Z" fill="C"/>',
  medal: '<path d="M-3.5-7.5L0-2L3.5-7.5" fill="none" stroke="C" stroke-width="1.7"/><path d="M0-2L4.5 2.5L0 7L-4.5 2.5Z" fill="C"/>',
  film: '<path d="M-7-5H7V5H-7Z" fill="C"/><path d="M-5-3H-3M-1-3H1M3-3H5M-5 3H-3M-1 3H1M3 3H5" stroke="#0b0b0b" stroke-width="1.6"/>',
  slot: '<path d="M-7-5H7V5H-7Z" fill="none" stroke="C" stroke-width="1.7"/><path d="M-3 0H3" stroke="C" stroke-width="2.4"/>',
};
const PADLOCK = '<g class="padlock"><path d="M-3-1V-4H3V-1"/><rect x="-5" y="-1" width="10" height="7"/></g>';

const SKILL_GLYPH = { inkSurge: 'drop', slowReels: 'reel', bounceHouse: 'balls', magnetMitt: 'magnet' };

function glyphFor(u) {
  if (u.pass) return 'ticket';
  if (SKILL_GLYPH[u.id]) return SKILL_GLYPH[u.id];
  const keys = Object.keys(u.grants || {});
  const has = (...names) => keys.some((k) => names.some((n) => (n.endsWith('.') ? k.startsWith(n) : k === n)));
  if (has('skillSlots')) return 'slot';
  if (has('awake.mission')) return 'medal';
  if (has('awake.chapter')) return 'film';
  if (has('awake.saucerJackpot')) return 'balls';
  if (has('awake.pickup', 'pickupEveryMs', 'pickupGolden', 'pickupMagnet', 'x.pickup')) return 'star';
  if (has('awake.')) return 'eye';
  if (has('balls', 'extraBall')) return 'ball';
  if (has('echo')) return 'echo';
  if (has('chain')) return 'chain';
  if (has('superChance', 'superX')) return 'bolt';
  if (has('comboMax', 'comboFloor')) return 'chevrons';
  if (has('comboWindowMs', 'ballSaveMs', 'skillTime')) return 'clock';
  if (has('bonus', 'bonusXMax', 'bonusXStart')) return 'coin';
  if (has('drainSave', 'guardian')) return 'shield';
  if (has('flipStrength', 'springy', 'perfectFlip')) return 'flipper';
  if (has('chargeRate', 'chargeMax', 'skillCost', 'surgeX')) return 'battery';
  if (has('x.')) return 'times';
  return 'plus';
}

const glyphSvg = (name, color, scale = 1) => `<g transform="scale(${scale})">${GLYPHS[name].replace(/C/g, color)}</g>`;

// Up to two lines of about 10 characters, for a name plaque.
function plaqueLines(name) {
  const lines = [];
  let cur = '';
  for (const w of name.toUpperCase().split(' ')) {
    if (cur && cur.length + 1 + w.length > 10) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  lines.push(cur);
  if (lines.length > 2) lines.splice(1, lines.length, lines.slice(1).join(' '));
  return lines;
}

const diamondPts = (x, y, r) => `${x},${y - r} ${x + r},${y} ${x},${y + r} ${x - r},${y}`;

class UpgradeScreen {
  constructor({ root, upgrades, scoring, skills, onToggle, canSwitchTable = () => true }) {
    this.canSwitchTable = canSwitchTable;
    this.root = root;
    this.upgrades = upgrades;
    this.scoring = scoring;
    this.skills = skills;
    this.onToggle = onToggle;
    this.confirmingReset = false;
    this.tab = 'tree';
    this.selected = null;
    this.hovered = null;
    this.slot = 0; // loadout slot being filled
    this.layout = layoutTower(NODES, TABLES.length);
    this.svg = root.querySelector('.tower');
    this.tierTags = root.querySelector('.tier-tags');
    this.card = root.querySelector('.node-card');
    this.view = null; // { x, y, k }: pan and zoom

    this.bindTree();

    // Loadout slots are divs acting as buttons.
    this.root.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-slot]')) {
        e.preventDefault();
        e.target.click();
      }
    });

    this.root.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) this.show(tab.dataset.tab);
      const buy = e.target.closest('[data-buy]');
      if (buy) {
        this.upgrades.buy(buy.dataset.buy);
        this.render();
      }
      const play = e.target.closest('[data-play]');
      if (play && !play.disabled) {
        pickTable(Number(play.dataset.play));
        location.reload();
        return;
      }
      const find = e.target.closest('[data-find]');
      if (find) {
        this.show('tree');
        this.focusNode(find.dataset.find);
      }
      const slot = e.target.closest('[data-slot]');
      if (slot) {
        this.slot = Number(slot.dataset.slot);
        if (e.target.closest('[data-unequip]')) this.skills.equip(this.slot, null);
        this.render();
      }
      const equip = e.target.closest('[data-equip]');
      if (equip) {
        this.skills.equip(this.slot, equip.dataset.equip);
        this.render();
      }
      const zoom = e.target.closest('[data-zoom]');
      if (zoom) this.zoomButton(zoom.dataset.zoom);
      if (e.target.closest('[data-close]')) this.close();
      if (e.target.closest('[data-reset]')) this.handleReset();
    });
  }

  get isOpen() {
    return !this.root.hidden;
  }

  open(tab = this.tab) {
    this.confirmingReset = false;
    this.root.hidden = false;
    this.show(tab);
    this.root.querySelector('[data-close]').focus();
    this.onToggle(true);
  }

  close() {
    this.root.hidden = true;
    this.onToggle(false);
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  show(tab) {
    this.tab = tab;
    for (const b of this.root.querySelectorAll('[data-tab]')) b.setAttribute('aria-selected', String(b.dataset.tab === tab));
    for (const p of this.root.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== tab;
    this.render();
    if (tab === 'tree' && !this.view) this.fit();
  }

  // Two-step reset: the first click asks, the second wipes all saved
  // progress (Tickets, upgrades, rank, loadout) and reloads.
  handleReset() {
    if (!this.confirmingReset) {
      this.confirmingReset = true;
      this.render();
      return;
    }
    try {
      for (const key of [BANK_SAVE_KEY, UPGRADES_SAVE_KEY, MISSION_SAVE_KEY, LOADOUT_SAVE_KEY]) localStorage.removeItem(key);
    } catch (e) {
      // Nothing saved to clear.
    }
    location.reload();
  }

  render() {
    const up = this.upgrades;
    const spent = BRANCHES.reduce((s, b) => s + up.spentIn(b.id), 0);
    this.root.querySelector('.tickets').textContent = formatPoints(this.scoring.tickets);
    this.root.querySelector('.tree-total').textContent =
      `${formatPoints(spent)} of ${formatPoints(up.totalCost())} Tickets spent · ${NODES.filter((u) => up.level(u.id)).length} of ${NODES.length} upgrades lit · Tables reached: ${up.tablesReached()} of ${TABLES.length}`;
    const reset = this.root.querySelector('[data-reset]');
    reset.textContent = this.confirmingReset ? 'Click again to erase all progress' : 'Reset all progress';
    reset.classList.toggle('armed', this.confirmingReset);
    if (this.tab === 'tree') this.renderTree();
    if (this.tab === 'tables') this.renderTables();
    if (this.tab === 'loadout') this.renderLoadout();
  }

  // --- the tower ---

  // Plane coordinates of a lane and row; rows climb, so y goes negative.
  cellXY([lane, row]) {
    return [lane * LANE_PX, -row * LANE_PX];
  }

  renderTree() {
    const up = this.upgrades;
    const L = this.layout;
    const reached = up.tablesReached();
    const lit = (id) => up.level(id) > 0;
    const out = [];

    // One setback per table: each is narrower than the one below it.
    const lastX = (L.laneCount - 1) * LANE_PX;
    for (let t = 1; t <= TABLES.length; t++) {
      const inset = 70 + SETBACK_PX * (TABLES.length - t);
      const xl = -inset;
      const xr = lastX + inset;
      const yb = t === 1 ? PLINTH_Y : -(L.tierBase[t] - 0.5) * LANE_PX;
      const yt = -(L.passRow[t] + 0.5) * LANE_PX;
      const open = t <= reached;
      out.push(`<path d="M${xl} ${yb}V${yt}H${xr}V${yb}" class="setback ${open ? 'open' : ''}"/>`);
      out.push(`<path d="M${xl + 8} ${yb}V${yt + 8}H${xr - 8}V${yb}" class="setback inner ${open ? 'open' : ''}"/>`);
    }
    // Faint lane guides and the plinth with each branch's name under it.
    const topY = -(L.passRow[TABLES.length] + 0.5) * LANE_PX;
    for (let l = 0; l < L.laneCount; l++) out.push(`<path d="M${l * LANE_PX} ${PLINTH_Y}V${topY}" class="lane-guide"/>`);
    const plinthL = -70 - SETBACK_PX * (TABLES.length - 1);
    const plinthR = lastX - plinthL;
    out.push(`<path d="M${plinthL} ${PLINTH_Y}H${plinthR}" class="plinth"/><path d="M${plinthL} ${PLINTH_Y + 7}H${plinthR}" class="plinth inner"/>`);
    for (const b of TOWER_ORDER) {
      if (b === 'tables') continue;
      const mid = (L.firstLane[b] + (L.lanes[b] - 1) / 2) * LANE_PX;
      out.push(`<text x="${mid}" y="${PLINTH_Y + 30}" text-anchor="middle" class="branch-name" fill="${BRANCH_COLOR[b]}">${BRANCHES.find((x) => x.id === b).name.toUpperCase()}</text>`);
    }

    // Links, drawn under the diamonds. Inside a branch: one straight
    // segment. From another branch: a stepped route with 90 degree bends, in
    // the colour of the branch it comes from. Second Reel's links are
    // dashed: up from it to the plinth, then up from the plinth to each
    // branch's first upgrade. data-from / data-to drive the hover highlight.
    const [hubX, hubY] = this.nodeXY(TOWER_HUB);
    const hubState = lit(TOWER_HUB) ? 'live' : 'ready';
    const hubLine = `M${hubX} ${hubY - 28}L${hubX} ${PLINTH_Y}`;
    out.push(`<g class="link root ${hubState}" data-from="${TOWER_HUB}" data-to="${TOWER_HUB}" style="--c:${BRANCH_COLOR.tables}"><path d="${hubLine}" class="glow"/><path d="${hubLine}" class="line"/></g>`);
    for (const { from, to, cross, route } of L.links) {
      let d;
      if (cross) {
        d = route.map(([l, r], i) => `${i ? 'L' : 'M'}${(l * LANE_PX).toFixed(1)} ${(-r * LANE_PX).toFixed(1)}`).join('');
      } else {
        const [x2, y2] = this.cellXY(L.place[to]);
        const [x1, y1] = from ? this.cellXY(L.place[from]) : [x2, PLINTH_Y];
        d = `M${x1} ${y1}L${x2} ${y2}`;
      }
      const parentLit = from ? lit(from) : lit(TOWER_HUB);
      const state = parentLit && lit(to) ? 'live' : parentLit ? 'ready' : '';
      const color = BRANCH_COLOR[up.def(cross ? from : to).branch];
      out.push(`<g class="link ${from ? '' : 'root'} ${cross ? 'cross' : ''} ${state}" data-from="${from || TOWER_HUB}" data-to="${to}" style="--c:${color}"><path d="${d}" class="glow"/><path d="${d}" class="line"/></g>`);
    }

    for (const u of NODES) {
      if (u.id === TOWER_HUB) continue;
      out.push(this.diamondSvg(u, this.cellXY(L.place[u.id]), reached));
    }
    out.push(this.hubSvg());

    // Diamonds after links, so every line runs under them.
    this.svg.innerHTML = `<g class="world">${out.join('')}</g>`;
    this.highlight();
    // Table names are HTML tags pinned to the left of the view (the tower
    // is wider than the screen); applyView() keeps them level with their step.
    this.tierTags.innerHTML = TABLES.map((t) => `<span class="${t.n <= reached ? 'open' : ''}">${ROMAN_NUMERALS[t.n - 1]} · ${t.name}</span>`).join('');
    this.applyView();

    this.root.querySelector('.legend').innerHTML = `<h4>Lit by branch</h4>${BRANCHES.map((b) => {
      const count = NODES.filter((u) => u.branch === b.id).reduce((s, u) => s + up.level(u.id), 0);
      return `<div><span style="color:${BRANCH_COLOR[b.id]}">${b.name}</span><b>${count}</b></div>`;
    }).join('')}`;
    this.renderCard();
  }

  diamondSvg(u, [x, y], reached) {
    const up = this.upgrades;
    const lvl = up.level(u.id);
    const st = up.status(u.id);
    const max = u.costs.length;
    const gated = (u.table || 1) > reached;
    const afford = st.state === 'available' && this.scoring.tickets >= st.cost;
    const col = BRANCH_COLOR[u.branch];
    const r = u.pass || u.id === TOWER_HUB ? 24 : 19;
    const cls = ['diamond', lvl ? 'lit' : '', st.state, gated ? 'gated' : '', afford ? 'can-buy' : '', this.selected === u.id ? 'selected' : ''].join(' ');
    const g = [];
    if (lvl) g.push(`<polygon points="${diamondPts(0, 0, r + 14)}" class="halo" fill="${col}"/>`);
    g.push(`<polygon points="${diamondPts(0, 0, r + 9)}" class="ready-ring" stroke="${col}"/>`);
    g.push(`<polygon points="${diamondPts(0, 0, r + 4)}" class="frame"/>`);
    g.push(`<polygon points="${diamondPts(0, 0, r - 2)}" class="face" fill="${lvl ? col : DECO_BLACK}" stroke="${col}"/>`);
    g.push(glyphSvg(glyphFor(u), lvl ? DECO_BLACK : col, u.pass ? 1.25 : 1.05));
    // Level count, kept clear of the gutter between lanes (x 50).
    if (max > 1) g.push(`<text x="${r + 6}" y="4" class="level">${lvl}/${max}</text>`);
    if (!u.pass) {
      // At most 88 px wide, so the gutters between lanes stay clear for
      // links from other branches.
      const lines = plaqueLines(u.name);
      const pw = Math.min(88, Math.max(...lines.map((t) => t.length)) * 7.4 + 12);
      const ph = lines.length * 13.5 + 7;
      g.push(`<rect x="${(-pw / 2).toFixed(1)}" y="${r + 8}" width="${pw.toFixed(1)}" height="${ph}" class="plaque"/>`);
      lines.forEach((t, i) => g.push(`<text y="${r + 21 + i * 13.5}" text-anchor="middle" class="name">${t}</text>`));
    }
    if (gated) g.push(`<g transform="translate(${r + 2} ${-r - 2})">${PADLOCK}</g>`);
    return `<g class="${cls}" data-node="${u.id}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="${u.name}, level ${lvl} of ${max}">${g.join('')}</g>`;
  }

  // Brightens the links into the hovered or selected upgrade and the
  // upgrades they come from; everything else dims.
  highlight() {
    const id = this.selected || this.hovered;
    this.svg.classList.toggle('focusing', Boolean(id));
    for (const el of this.svg.querySelectorAll('.hot')) el.classList.remove('hot');
    if (!id) return;
    this.svg.querySelector(`[data-node="${id}"]`)?.classList.add('hot');
    for (const link of this.svg.querySelectorAll(`.link[data-to="${id}"]`)) {
      link.classList.add('hot');
      this.svg.querySelector(`[data-node="${link.dataset.from}"]`)?.classList.add('hot');
      // A plinth riser comes from Second Reel: light its link to the plinth too.
      if (link.classList.contains('root')) this.svg.querySelector(`.link[data-to="${TOWER_HUB}"]`)?.classList.add('hot');
    }
  }

  // Second Reel, the first upgrade: an ordinary diamond standing on the
  // plinth, below the roots of every branch.
  hubSvg() {
    return this.diamondSvg(this.upgrades.def(TOWER_HUB), this.nodeXY(TOWER_HUB), this.upgrades.tablesReached());
  }

  renderCard() {
    const id = this.selected || this.hovered;
    this.card.classList.toggle('intro', !id);
    if (!id) {
      this.card.innerHTML = `<h3>The tower</h3><p>Every diamond is an upgrade. A line leads up from each one to the upgrades it unlocks. Bought diamonds fill with their branch colour, and ones you can afford now pulse.</p><p>Start with Second Reel on the plinth: every branch grows from it. Each step of the tower is a table. Buy its pass on the centre line to open the next step.</p><p>A stepped line in another branch's colour is a requirement from that branch. Hover an upgrade to light up everything it needs.</p>`;
      return;
    }
    const up = this.upgrades;
    const u = up.def(id);
    const lvl = up.level(id);
    const st = up.status(id);
    const branch = BRANCHES.find((b) => b.id === u.branch);
    const desc = u.pass
      ? `Reach ${TABLES[u.pass - 1].name}: opens its step of the tower. ${TABLES[u.pass - 1].built ? '' : 'The table itself is still in production.'}`
      : u.desc;
    let action;
    if (st.state === 'maxed') action = '<p class="maxed">Fully bought</p>';
    else if (st.state === 'locked') action = `<ul class="reasons">${st.reasons.map((r) => `<li>${r}</li>`).join('')}</ul><p class="cost">Costs ${formatPoints(st.cost)} Tickets</p>`;
    else {
      const afford = this.scoring.tickets >= st.cost;
      action = `<button type="button" data-buy="${id}" ${afford ? '' : 'disabled'}>Buy · ${formatPoints(st.cost)} Tickets</button>${afford ? '' : `<p class="cost">${formatPoints(st.cost - this.scoring.tickets)} more Tickets needed</p>`}`;
    }
    const table = u.table > 1 ? `<span class="badge">${ROMAN_NUMERALS[u.table - 1]} · ${TABLES[u.table - 1].name}</span>` : '';
    this.card.innerHTML = `<div class="card-branch" style="color:${BRANCH_COLOR[u.branch]}">${branch.name}</div>
      <h3>${u.name}</h3>${table}
      <p>${desc}${u.costs.length > 1 ? ' <span class="per">per level</span>' : ''}</p>
      <p class="level">Level ${lvl} of ${u.costs.length}</p>
      ${action}`;
  }

  // Plane position of a node (the hub sits on the plinth).
  nodeXY(id) {
    if (id === TOWER_HUB) return [this.layout.firstLane.tables * LANE_PX, PLINTH_Y + HUB_DROP];
    return this.cellXY(this.layout.place[id]);
  }

  // Select a node and pan it into view.
  focusNode(id) {
    this.selected = id;
    const [x, y] = this.nodeXY(id);
    const { width, height } = this.svg.getBoundingClientRect();
    const k = Math.max(this.view?.k || 0, 0.7);
    this.view = { k, x: width / 2 - x * k, y: height / 2 - y * k };
    this.render();
  }

  // --- pan and zoom ---

  applyView() {
    const w = this.svg.querySelector('.world');
    if (!w || !this.view) return;
    const { x, y, k } = this.view;
    w.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(4)})`);
    this.svg.classList.toggle('far', k < FAR_ZOOM);
    // Each tag sits just under the top edge of its step.
    [...this.tierTags.children].forEach((tag, i) => {
      const top = y + -(this.layout.passRow[i + 1] + 0.5) * LANE_PX * k;
      tag.style.transform = `translateY(${(top + 8).toFixed(1)}px)`;
    });
  }

  // Fits the steps reached so far, plus the first row of the next one,
  // from the plinth up, but never so small that the names can't be read
  // (the tower pans both ways), centred on the spine.
  fit() {
    const { width, height } = this.svg.getBoundingClientRect();
    if (!width) return;
    const reached = this.upgrades.tablesReached();
    const top = -(this.layout.passRow[reached] + 1.9) * LANE_PX;
    const bottom = PLINTH_Y + HUB_DROP + 130; // room for its plaque and the hint line
    const k = Math.min(1, Math.max(READABLE_ZOOM, height / (bottom - top)));
    const spineX = this.layout.firstLane.tables * LANE_PX;
    this.view = { k, x: width / 2 - spineX * k, y: height - bottom * k };
    this.applyView();
  }

  zoomAt(px, py, factor) {
    const v = this.view;
    const k = Math.min(3, Math.max(0.08, v.k * factor));
    const f = k / v.k;
    this.view = { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
    this.applyView();
  }

  zoomButton(kind) {
    if (kind === 'fit') return this.fit();
    const { width, height } = this.svg.getBoundingClientRect();
    return this.zoomAt(width / 2, height / 2, kind === 'in' ? 1.35 : 1 / 1.35);
  }

  bindTree() {
    const svg = this.svg;
    let drag = null;
    svg.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, vx: this.view?.x, vy: this.view?.y, moved: false };
    });
    svg.addEventListener('pointermove', (e) => {
      if (drag && this.view) {
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) > 4) {
          drag.moved = true;
          svg.setPointerCapture(e.pointerId);
          svg.classList.add('dragging');
        }
        if (drag.moved) {
          this.view = { ...this.view, x: drag.vx + dx, y: drag.vy + dy };
          this.applyView();
        }
        return;
      }
      const node = e.target.closest('[data-node]');
      const id = node ? node.dataset.node : null;
      if (id !== this.hovered) {
        this.hovered = id;
        if (!this.selected) {
          this.renderCard();
          this.highlight();
        }
      }
    });
    const end = (e) => {
      if (drag && !drag.moved) {
        const node = e.target.closest('[data-node]');
        this.selected = node ? node.dataset.node : null;
        this.render();
      }
      drag = null;
      svg.classList.remove('dragging');
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', () => {
      drag = null;
      svg.classList.remove('dragging');
    });
    svg.addEventListener('wheel', (e) => {
      if (!this.view) return;
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      this.zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0015));
    }, { passive: false });
    svg.addEventListener('keydown', (e) => {
      const node = e.target.closest('[data-node]');
      if (!node || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      this.selected = node.dataset.node;
      this.render();
      this.svg.querySelector(`[data-node="${this.selected}"]`)?.focus();
    });
    window.addEventListener('resize', () => {
      if (this.isOpen && this.tab === 'tree') this.fit();
    });
  }

  // --- table picker ---

  renderTables() {
    const up = this.upgrades;
    const reached = up.tablesReached();
    const cards = TABLES.map((t) => {
      const pass = NODES.find((u) => u.pass === t.n);
      let state;
      let tag;
      if (t.n === TABLE.n) {
        tag = 'Now playing';
        state = '<p class="state playing">Now playing</p>';
      } else if (t.built && t.n <= reached) {
        tag = 'Open';
        const ok = this.canSwitchTable();
        state = `<p class="state">Tickets and upgrades are shared across every table.</p>
          <button type="button" data-play="${t.n}" ${ok ? '' : 'disabled'}>Play this table</button>${ok ? '' : '<p class="state-note">Finish your turn first.</p>'}`;
      } else if (t.n <= reached) {
        tag = 'In production';
        state = `<p class="state">Pass bought: its ring of upgrades is open. The table is still in production and will be playable in a later update.</p>`;
      } else {
        const st = up.status(pass.id);
        tag = 'Locked';
        state = `<p class="state">Buy the <b>${pass.name}</b> for ${formatPoints(pass.costs[0])} Tickets.${st.reasons.length ? ` ${st.reasons.join('. ')}.` : ''}</p>
          <button type="button" data-find="${pass.id}">Show the pass on the board</button>`;
      }
      return `<article class="lobby ${t.n <= reached ? 'reached' : 'locked'}" style="--c1:${t.inks[0]};--c2:${t.inks[1]}">
        <div class="poster">
          <span class="tag">${tag}</span>
          <svg viewBox="0 0 88 88" aria-hidden="true">${t.emblem}</svg>
          <div class="titles"><span class="world">${t.n}. ${t.world}</span><h3>${t.name}</h3><span class="serial">“${t.serial}”</span></div>
        </div>
        <div class="lobby-body">
          <dl><dt>Centerpiece</dt><dd>${t.centerpiece}</dd><dt>Twist</dt><dd>${t.twist}</dd></dl>
          ${state}
        </div>
      </article>`;
    }).join('');
    this.root.querySelector('.tables-view').innerHTML = `<div class="lobby-grid">${cards}</div>`;
  }

  // --- skill loadout ---

  renderLoadout() {
    const sk = this.skills;
    const slots = sk.slots();
    if (this.slot >= slots) this.slot = 0;
    const slotNodes = ['fifthSlot', 'sixthSlot'];
    const slotHtml = Array.from({ length: MAX_SKILL_SLOTS }, (_, i) => {
      if (i >= slots) {
        const node = this.upgrades.def(slotNodes[i - 4]);
        return `<div class="slot locked"><kbd>${i + 1}</kbd><span>Locked</span><small>Needs ${node.name} (${TABLES[node.table - 1].name})</small></div>`;
      }
      const id = sk.inSlot(i);
      const s = SKILLS.find((x) => x.id === id);
      return `<div class="slot ${i === this.slot ? 'current' : ''}" data-slot="${i}" role="button" tabindex="0">
        <kbd>${i + 1}</kbd><span>${s ? s.name : 'Empty'}</span>
        ${s ? `<small>${sk.cost(id)} charge</small><button type="button" data-unequip aria-label="Clear slot ${i + 1}">×</button>` : '<small>Choose a skill below</small>'}
      </div>`;
    }).join('');
    const list = SKILLS.map((s) => {
      const unlocked = sk.isUnlocked(s.id);
      const node = this.upgrades.def(s.id);
      const at = sk.loadout.indexOf(s.id);
      return `<article class="skill-card ${unlocked ? '' : 'locked'}">
        <div class="glyph-chip"><svg viewBox="-10 -10 20 20" aria-hidden="true">${glyphSvg(SKILL_GLYPH[s.id], DECO_BLACK)}</svg></div>
        <div><h4>${s.name}</h4><p>${s.desc}</p><small>${unlocked ? `${sk.cost(s.id)} charge${at >= 0 && at < slots ? ` · on key ${at + 1}` : ''}` : `Unlock with ${node.name} in Charge & Skills`}</small></div>
        ${unlocked && at !== this.slot ? `<button type="button" data-equip="${s.id}">Put on key ${this.slot + 1}</button>` : ''}
      </article>`;
    }).join('');
    this.root.querySelector('.loadout-view').innerHTML = `
      <p class="loadout-intro">Pick a slot, then choose the skill to put on its key. Skills you unlock go into a free slot by themselves.</p>
      <div class="slots">${slotHtml}</div>
      <div class="skill-list">${list}</div>`;
  }
}
