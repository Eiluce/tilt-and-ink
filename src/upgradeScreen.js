// The Upgrade Tree screen, drawn as the inside of the machine's backbox: a
// walnut wiring board where every node is a brass lamp socket, prerequisites
// are cloth-wrapped wires, and a bought node's bulb lights in its branch
// colour. Opens with U or the panel buttons; the game pauses while it's open.
//
// Layout is radial and computed from the node data: the hub (Second Reel)
// sits in the middle, each branch owns a wedge, and each table is a ring,
// so a table's pass opens the next ring out. Tables not reached yet are
// drawn dim behind a padlock, so the whole shape is visible from the start.
//
// Two more tabs: the table picker (lobby cards for all eight tables) and
// the skill loadout (which skill sits on which key).

const BOARD_BRANCH = {
  tables: { color: '#f2d894' },
  bumpers: { color: '#ff6b4f' },
  targets: { color: '#3cc7cf' },
  rules: { color: '#c690ff' },
  lanes: { color: '#ffc53a' },
  skills: { color: '#62a8ff' },
  ball: { color: '#86dc6c' },
};
// Wedge order round the hub, clockwise from the top. Rules sits between
// Targets and Ramps & Lanes, the two branches it borrows most wires from.
const WEDGES = ['tables', 'bumpers', 'targets', 'rules', 'lanes', 'skills', 'ball'];

const RING_START = 175; // radius of the first ring of Rocket Row nodes
const DEPTH_STEP = 56; // radial distance between a node and what needs it
const RING_GAP = 84; // band between two tables' rings, where the pass sits
const NODE_SPREAD = 50; // arc length between side-by-side nodes

// 16 x 16 glyphs centred on 0,0, drawn on the bulb glass.
const GLYPHS = {
  ball: '<circle r="5.5"/><circle cx="-2" cy="-2" r="1.6" class="hi"/>',
  balls: '<circle cx="-4" cy="3" r="3.4"/><circle cx="4" cy="3" r="3.4"/><circle cx="0" cy="-3.5" r="3.4"/>',
  plus: '<path d="M-6 0H6M0-6V6" class="st"/>',
  times: '<path d="M-5-5L5 5M5-5L-5 5" class="st"/>',
  bolt: '<path d="M2-8L-5 1H0L-2 8L5-1H0Z"/>',
  echo: '<path d="M-3-6A7 7 0 0 1-3 6M2-8A10 10 0 0 1 2 8" class="st"/><circle cx="-6" r="1.8"/>',
  chain: '<rect x="-7.5" y="-3" width="8" height="6" rx="3" class="st thin"/><rect x="-0.5" y="-3" width="8" height="6" rx="3" class="st thin"/>',
  chevrons: '<path d="M-6-1L0-6L6-1M-6 5L0 0L6 5" class="st"/>',
  clock: '<circle r="6.5" class="st thin"/><path d="M0-4V0L3 2" class="st thin"/>',
  coin: '<circle r="6" class="st thin"/><path d="M0-3.5V3.5M-2 -1.5H2" class="st thin"/>',
  star: '<path d="M0-7L2-2.2L7-2.2L3 1L4.5 6.2L0 3.2L-4.5 6.2L-3 1L-7-2.2L-2-2.2Z"/>',
  shield: '<path d="M0-7L6-4.5V0.5C6 4.5 0 7.5 0 7.5S-6 4.5-6 0.5V-4.5Z"/>',
  flipper: '<path d="M-5 3L5-3" class="st fat"/><circle cx="-5" cy="3" r="3"/>',
  battery: '<rect x="-7" y="-4" width="12" height="8" rx="1.5" class="st thin"/><rect x="5" y="-2" width="2" height="4"/><rect x="-5" y="-2" width="5" height="4"/>',
  ticket: '<path d="M-7-4.5H7V-1.5A1.5 1.5 0 0 0 7 1.5V4.5H-7V1.5A1.5 1.5 0 0 0-7-1.5Z"/><path d="M-2.5-4.5V4.5" class="st thin cut"/>',
  eye: '<path d="M-7 0C-4-5 4-5 7 0C4 5-4 5-7 0Z" class="st thin"/><circle r="2.3"/>',
  medal: '<path d="M-3.5-7.5L0-2L3.5-7.5" class="st thin"/><circle cy="2.5" r="4.5"/>',
  film: '<rect x="-7" y="-5" width="14" height="10" rx="1"/><path d="M-5-3H-3M-1-3H1M3-3H5M-5 3H-3M-1 3H1M3 3H5" class="st thin cut"/>',
  drop: '<path d="M0-7.5C4-2 5 1 5 2.8A5 5 0 0 1-5 2.8C-5 1-4-2 0-7.5Z"/>',
  reel: '<circle r="6.5" class="st thin"/><circle cy="-3" r="1.6"/><circle cx="2.6" cy="1.6" r="1.6"/><circle cx="-2.6" cy="1.6" r="1.6"/>',
  magnet: '<path d="M-4.5-6V0.5A4.5 4.5 0 0 0 4.5 0.5V-6" class="st fat"/>',
  slot: '<rect x="-7" y="-5" width="14" height="10" rx="2" class="st thin"/><path d="M-3 0H3" class="st"/>',
};
const PADLOCK = '<g class="padlock"><path d="M-3.5-2V-4.5A3.5 3.5 0 0 1 3.5-4.5V-2" /><rect x="-5" y="-2" width="10" height="8" rx="1.5"/></g>';

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

// Positions every node: { id: { x, y, r (socket radius) } }, plus the rings.
function layoutTree() {
  const byId = Object.fromEntries(NODES.map((u) => [u.id, u]));
  const hub = 'secondReel';
  // A pass sits in the band before the ring it opens.
  const tierOf = (u) => (u.pass ? u.pass - 0.5 : u.table || 1);

  // Depth: steps from the nearest prerequisite in the same ring.
  const depth = {};
  const depthOf = (u) => {
    if (u.id in depth) return depth[u.id];
    let d = 0;
    for (const req of Object.keys(u.requires || {})) {
      const r = byId[req];
      if (req !== hub && tierOf(r) === tierOf(u)) d = Math.max(d, depthOf(r) + 1);
    }
    depth[u.id] = d;
    return d;
  };
  NODES.forEach(depthOf);

  // Ring radii: each ring is as deep as its deepest branch.
  const ringStart = [];
  const ringEnd = [];
  let r = RING_START;
  for (let t = 1; t <= TABLES.length; t++) {
    const deepest = Math.max(0, ...NODES.filter((u) => !u.pass && (u.table || 1) === t && u.id !== hub).map((u) => depth[u.id]));
    ringStart[t] = r;
    ringEnd[t] = r + deepest * DEPTH_STEP;
    r = ringEnd[t] + RING_GAP;
  }

  const wedge = 360 / WEDGES.length;
  const groups = {};
  for (const u of NODES) {
    if (u.id === hub) continue;
    const key = `${u.branch}|${tierOf(u)}|${depth[u.id]}`;
    (groups[key] = groups[key] || []).push(u);
  }
  const pos = { [hub]: { x: 0, y: 0, r: 30 } };
  for (const list of Object.values(groups)) {
    list.forEach((u, i) => {
      const tier = tierOf(u);
      const radius = u.pass ? ringEnd[u.pass - 1] + RING_GAP / 2 : ringStart[tier] + depth[u.id] * DEPTH_STEP;
      const centre = -90 + WEDGES.indexOf(u.branch) * wedge;
      // Spread side by side, but never wider than the wedge.
      const step = Math.min(NODE_SPREAD / radius, ((wedge * 0.8) / Math.max(1, list.length)) * (Math.PI / 180));
      // Stagger crowded groups in and out a little so bulbs don't touch.
      const stagger = list.length > 2 && i % 2 ? DEPTH_STEP * 0.28 : 0;
      const a = (centre * Math.PI) / 180 + (i - (list.length - 1) / 2) * step;
      const rr = radius + stagger;
      pos[u.id] = { x: Math.cos(a) * rr, y: Math.sin(a) * rr, r: u.pass ? 23 : 17 };
    });
  }
  const rings = TABLES.slice(1).map((t) => ({ table: t, r: ringEnd[t.n - 1] + RING_GAP / 2 }));
  return { pos, rings, ringEnd, outer: r };
}

class UpgradeScreen {
  constructor({ root, upgrades, scoring, skills, onToggle }) {
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
    this.layout = layoutTree();
    this.svg = root.querySelector('.wiring');
    this.card = root.querySelector('.node-card');
    this.view = null; // { x, y, k }: pan and zoom

    this.buildDefs();
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
      `${formatPoints(spent)} of ${formatPoints(up.totalCost())} Tickets spent · ${NODES.filter((u) => up.level(u.id)).length} of ${NODES.length} sockets lit · Tables reached: ${up.tablesReached()} of ${TABLES.length}`;
    const reset = this.root.querySelector('[data-reset]');
    reset.textContent = this.confirmingReset ? 'Click again to erase all progress' : 'Reset all progress';
    reset.classList.toggle('armed', this.confirmingReset);
    if (this.tab === 'tree') this.renderTree();
    if (this.tab === 'tables') this.renderTables();
    if (this.tab === 'loadout') this.renderLoadout();
  }

  // --- wiring board ---

  buildDefs() {
    const grads = Object.entries(BOARD_BRANCH).map(([id, { color }]) => `
      <radialGradient id="bulb-${id}" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffbe8"/><stop offset="0.35" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0.75"/></radialGradient>
      <radialGradient id="halo-${id}"><stop offset="0.3" stop-color="${color}" stop-opacity="0.55"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`).join('');
    this.defs = `<defs>
      <radialGradient id="brass" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#f6dc8a"/><stop offset="0.5" stop-color="#b98a2e"/><stop offset="1" stop-color="#5e4212"/></radialGradient>
      <radialGradient id="glass" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#6d6358"/><stop offset="0.55" stop-color="#2c2520"/><stop offset="1" stop-color="#15110d"/></radialGradient>
      ${grads}
    </defs>`;
  }

  renderTree() {
    const up = this.upgrades;
    const { pos, rings } = this.layout;
    const reached = up.tablesReached();
    const lit = (id) => up.level(id) > 0;

    const ringSvg = rings.map(({ table, r }) => {
      const open = table.n <= reached;
      return `<circle r="${r}" class="ring ${open ? 'open' : ''}" style="--ink:${table.inks[0]}"/>
        <text x="-34" y="${-r + 5}" class="ring-label ${open ? 'open' : ''}" text-anchor="end">${table.n}. ${table.name.toUpperCase()}</text>`;
    }).join('');

    const wires = [];
    for (const u of NODES) {
      for (const req of Object.keys(u.requires || {})) {
        const a = pos[req];
        const b = pos[u.id];
        const sameBranch = up.def(req).branch === u.branch || req === 'secondReel';
        // Cross-branch wires bow in toward the hub, like a loom of cables.
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const pull = sameBranch ? 0.9 : 0.6;
        const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)}Q${(mx * pull).toFixed(1)} ${(my * pull).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
        const color = BOARD_BRANCH[u.branch].color;
        let state = '';
        if (lit(req) && lit(u.id)) state = 'live';
        else if (lit(req) || req === 'secondReel') state = 'ready';
        wires.push(`<g class="wire ${state}" style="--c:${color}"><path d="${d}" class="sheath"/><path d="${d}" class="core"/></g>`);
      }
    }

    const nodes = NODES.map((u) => this.socketSvg(u, pos[u.id], reached)).join('');
    this.svg.innerHTML = `${this.defs}<g class="world">${ringSvg}<g class="wires">${wires.join('')}</g><g class="nodes">${nodes}</g></g>`;
    this.applyView();

    this.root.querySelector('.legend').innerHTML = BRANCHES.map((b) => {
      const count = NODES.filter((u) => u.branch === b.id).reduce((s, u) => s + up.level(u.id), 0);
      return `<div style="--c:${BOARD_BRANCH[b.id].color}"><span>${b.name}</span><b>${count}</b></div>`;
    }).join('');
    this.renderCard();
  }

  socketSvg(u, p, reached) {
    const up = this.upgrades;
    const lvl = up.level(u.id);
    const st = up.status(u.id);
    const max = u.costs.length;
    const gated = (u.table || 1) > reached;
    const afford = st.state === 'available' && this.scoring.tickets >= st.cost;
    const cls = [
      'socket',
      lvl ? 'lit' : '',
      st.state,
      gated ? 'gated' : '',
      afford ? 'can-buy' : '',
      u.pass ? 'pass' : '',
      u.id === 'secondReel' ? 'hub' : '',
      this.selected === u.id ? 'selected' : '',
    ].join(' ');
    const r = p.r;
    const bulb = r * 0.72;
    const scale = (bulb / 9).toFixed(2);
    const pips = max > 1 ? `<g class="pips" transform="translate(0 ${r + 10})"><rect x="-13" y="-7" width="26" height="13" rx="6.5"/><text y="3.5" text-anchor="middle">${lvl}/${max}</text></g>` : '';
    const lock = gated ? `<g transform="translate(${r * 0.75} ${-r * 0.75})">${PADLOCK}</g>` : '';
    // Passes are named by their ring's label; only the hub gets its own.
    const label = u.id === 'secondReel' ? `<text class="pass-label" y="${-r - 9}" text-anchor="middle">START</text>` : '';
    return `<g class="${cls}" data-node="${u.id}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})" tabindex="0" role="button" aria-label="${u.name}, level ${lvl} of ${max}">
      ${lvl ? `<circle r="${r * 1.9}" fill="url(#halo-${u.branch})" class="halo"/>` : ''}
      <circle r="${r + 4}" class="ready-ring" style="--c:${BOARD_BRANCH[u.branch].color}"/>
      <circle r="${r}" fill="url(#brass)" class="brass"/>
      <circle r="${bulb}" fill="${lvl ? `url(#bulb-${u.branch})` : 'url(#glass)'}" class="bulb"/>
      <g class="glyph" transform="scale(${scale})">${GLYPHS[glyphFor(u)]}</g>
      ${pips}${lock}${label}
    </g>`;
  }

  renderCard() {
    const id = this.selected || this.hovered;
    this.card.classList.toggle('intro', !id);
    if (!id) {
      this.card.innerHTML = `<h3>The wiring board</h3><p>Every bulb is an upgrade. A wire leads from each one to the upgrades it unlocks. Bought bulbs light up, and bulbs you can afford now pulse.</p><p>Each ring is a table. Buy a table's pass on the centre line to open its ring.</p>`;
      return;
    }
    const up = this.upgrades;
    const u = up.def(id);
    const lvl = up.level(id);
    const st = up.status(id);
    const branch = BRANCHES.find((b) => b.id === u.branch);
    const desc = u.pass
      ? `Reach ${TABLES[u.pass - 1].name}: opens its ring of upgrades. ${TABLES[u.pass - 1].built ? '' : 'The table itself is still in production.'}`
      : u.desc;
    let action;
    if (st.state === 'maxed') action = '<p class="maxed">Fully wired</p>';
    else if (st.state === 'locked') action = `<ul class="reasons">${st.reasons.map((r) => `<li>${r}</li>`).join('')}</ul><p class="cost">Costs ${formatPoints(st.cost)} Tickets</p>`;
    else {
      const afford = this.scoring.tickets >= st.cost;
      action = `<button type="button" data-buy="${id}" ${afford ? '' : 'disabled'}>Buy · ${formatPoints(st.cost)} Tickets</button>${afford ? '' : `<p class="cost">${formatPoints(st.cost - this.scoring.tickets)} more Tickets needed</p>`}`;
    }
    const table = u.table > 1 ? `<span class="badge" style="--ink:${TABLES[u.table - 1].inks[0]}">${TABLES[u.table - 1].name}</span>` : '';
    this.card.innerHTML = `<div class="card-branch" style="--c:${BOARD_BRANCH[u.branch].color}">${branch.name}</div>
      <h3>${u.name}</h3>${table}
      <p>${desc}${u.costs.length > 1 ? ' <span class="per">per level</span>' : ''}</p>
      <p class="level">Level ${lvl} of ${u.costs.length}</p>
      ${action}`;
  }

  // Select a node and pan it into view.
  focusNode(id) {
    this.selected = id;
    const p = this.layout.pos[id];
    const { width, height } = this.svg.getBoundingClientRect();
    const k = Math.max(this.view?.k || 0, 0.7);
    this.view = { k, x: width / 2 - p.x * k, y: height / 2 - p.y * k };
    this.render();
  }

  // --- pan and zoom ---

  applyView() {
    const w = this.svg.querySelector('.world');
    if (w && this.view) w.setAttribute('transform', `translate(${this.view.x.toFixed(1)} ${this.view.y.toFixed(1)}) scale(${this.view.k.toFixed(4)})`);
  }

  // Fits the rings reached so far, plus the next one, into the board.
  fit() {
    const { width, height } = this.svg.getBoundingClientRect();
    if (!width) return;
    const next = Math.min(TABLES.length, this.upgrades.tablesReached() + 1);
    const R = this.layout.ringEnd[next] + 70;
    const k = Math.min(width, height) / (2 * R);
    this.view = { k, x: width / 2, y: height / 2 };
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
        if (!this.selected) this.renderCard();
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
      if (t.n === 1) {
        tag = 'Now playing';
        state = '<p class="state playing">Now playing</p>';
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
        <div class="glyph-chip"><svg viewBox="-10 -10 20 20" aria-hidden="true"><g class="glyph">${GLYPHS[SKILL_GLYPH[s.id]]}</g></svg></div>
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
