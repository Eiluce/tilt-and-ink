// Scoring: every scoring source on the table, and the layers on top of it.
//
//  1. Sources, in rough tiers: contact (bumpers, slings, flippers, walls,
//     lanes) < target (drop targets, UFO) < shot (ramps, orbit, scoop) <
//     feature (completing a bank or set) < jackpot (multiball, missions).
//     A source scores nothing until the Upgrade Tree wakes it up (only the
//     pops and slings start awake), and starts tiny: a pop is worth 1.
//  2. Upgrade multipliers (upgrades.js): per-source +%, per-branch +% and
//     global +% each add up inside their own group; the three groups and
//     every ×N multiplier then multiply together. That's what takes a turn
//     from tens of points to billions over the whole tree.
//  3. Combo: each aimed shot within the combo window raises it, up to the
//     cap the tree allows; it multiplies points as they're scored.
//  4. End-of-ball bonus: once unlocked, shots and features add a share of
//     their value to a pool paid when the ball drains, times the bonus
//     multiplier that completing R·O·W raises.
//
// When a turn ends its score is banked 1:1 as Tickets, the game's currency,
// and saved in localStorage along with the best turn.

// base: points before multipliers. branch: which Upgrade Tree branch scales
// it. shot: an aimed shot, builds the combo. bonus: share of its value added
// to the end-of-ball bonus pool. charge: CHARGE_GAIN kind (skills.js).
// flat: not multiplied by the combo or Ink Surge.
const SOURCES = {
  pop: { base: 1, branch: 'bumpers', charge: 'pop' },
  sling: { base: 1, branch: 'bumpers', charge: 'sling' },
  flipper: { base: 1, branch: 'bumpers' },
  wall: { base: 1, branch: 'bumpers' },
  standup: { base: 3, branch: 'targets', charge: 'standup' },
  dropTarget: { base: 8, branch: 'targets', shot: true, bonus: 0.25 },
  ufo: { base: 15, branch: 'targets', shot: true, bonus: 0.25 },
  kickout: { base: 15, branch: 'targets', shot: true, bonus: 0.25 },
  dropBank: { base: 100, branch: 'targets', bonus: 0.5, charge: 'feature' },
  standupsComplete: { base: 150, branch: 'targets', bonus: 0.5, charge: 'feature' },
  inlane: { base: 3, branch: 'lanes', charge: 'lane' },
  lane: { base: 3, branch: 'lanes', charge: 'lane' },
  spinnerTurn: { base: 2, branch: 'lanes', charge: 'sling' },
  orbit: { base: 40, branch: 'lanes', shot: true, bonus: 0.5 },
  ramp: { base: 40, branch: 'lanes', shot: true, bonus: 0.5 },
  scoop: { base: 60, branch: 'lanes', shot: true, bonus: 0.5 },
  rowComplete: { base: 100, branch: 'lanes', bonus: 0.5, charge: 'feature' },
  chapter: { base: 100, branch: 'rules', bonus: 0.5, charge: 'feature' }, // times the chapter number
  saucerJackpot: { base: 1000, branch: 'rules', shot: true, bonus: 0.5, charge: 'feature' },
  mission: { base: 500, branch: 'rules', flat: true, bonus: 0.25, charge: 'mission' }, // times MISSION_TIER_X
  promotion: { base: 2500, branch: 'rules', flat: true }, // times the new rank number
  pickup: { base: 5, branch: 'rules', charge: 'lane' },
  // Tables' own modes (tableDefs/): awake from the start, the mode gates it.
  chop: { base: 40, branch: 'rules', bonus: 0.25, charge: 'pop' }, // Timber Hollow's Timber!
};

// Mission reward multiplier by tier (see MISSIONS in missions.js).
const MISSION_TIER_X = [1, 1.5, 2.5, 3.5, 5];

const POINTS_PER_TICKET = 1;
const BANK_SAVE_KEY = 'tilt-and-ink.bank.v2';

// Pre-rework saves: wiped once, since the economy changed completely.
for (const key of ['tilt-and-ink.bank', 'tilt-and-ink.upgrades', 'tilt-and-ink.missions']) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    // No storage.
  }
}

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];

// 12,345 below 100,000, then 3 significant figures: 123K, 4.56M, 7.89B.
function formatPoints(n) {
  n = Math.floor(n);
  if (n < 100000) return n.toLocaleString('en-US');
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(n) / 3));
  const v = n / 1000 ** tier;
  return `${v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0)}${SUFFIXES[tier]}`;
}

class Scoring {
  constructor() {
    this.tickets = 0;
    this.lifetimeTickets = 0; // gates the table passes
    this.bestTurn = 0;
    this.upgrades = null; // set by main.js once the tree exists
    this.rank = 0; // mission rank, for the Mission Control rank bonus
    this.surge = 1; // Ink Surge skill: surgeX while active
    this.load();
  }

  stat(name) {
    return this.upgrades.stat(name);
  }

  isAwake(source) {
    return this.stat(`awake.${source}`) > 0;
  }

  // Global group: +% from global nodes, per table reached, and per rank.
  globalMult() {
    const u = this.upgrades;
    return 1 + (u.stat('global') + u.stat('perTable') * u.tablesReached() + u.stat('rankBonus') * this.rank) / 100;
  }

  // Points one hit of `source` is worth right now, before combo and surge.
  value(source) {
    const s = SOURCES[source];
    if (!this.isAwake(source)) return 0;
    return s.base
      * (1 + this.stat(`value.${source}`) / 100) * this.stat(`x.${source}`)
      * (1 + this.stat(`branch.${s.branch}`) / 100) * this.stat(`x.branch.${s.branch}`)
      * this.globalMult() * this.stat('x.global');
  }

  newTurn() {
    this.score = 0;
    this.newBall();
  }

  newBall() {
    this.bonus = 0;
    this.bonusX = this.stat('bonusXStart');
    this.combo = this.stat('comboFloor');
    this.lastShotAt = -Infinity;
  }

  // Scores one hit of `source` (times `mult`, e.g. a chapter's number) and
  // returns the points actually scored, 0 if the source is still dormant.
  award(source, { mult = 1 } = {}) {
    const s = SOURCES[source];
    const base = this.value(source) * mult;
    if (!base) return 0;
    if (s.shot) {
      const now = performance.now();
      this.combo = now - this.lastShotAt <= this.stat('comboWindowMs')
        ? Math.min(this.stat('comboMax'), this.combo + 1)
        : this.stat('comboFloor');
      this.lastShotAt = now;
    }
    const total = Math.max(1, Math.round(s.flat ? base : base * this.combo * this.surge));
    this.score += total;
    if (s.bonus && this.stat('bonus')) this.bonus += Math.round(base * s.bonus);
    return total;
  }

  // Called every tick: the combo lapses once the window has passed.
  tick(now) {
    const floor = this.stat('comboFloor');
    if (this.combo > floor && now - this.lastShotAt > this.stat('comboWindowMs')) this.combo = floor;
    if (this.combo < floor) this.combo = floor;
  }

  // 1 when a shot just landed, falling to 0 as the combo window runs out.
  comboTimeLeft(now) {
    if (this.combo <= this.stat('comboFloor')) return 0;
    return Math.max(0, 1 - (now - this.lastShotAt) / this.stat('comboWindowMs'));
  }

  raiseBonusX() {
    this.bonusX = Math.min(this.stat('bonusXMax'), this.bonusX + 1);
    return this.bonusX;
  }

  // End of ball: pay the bonus pool times the bonus multiplier.
  collectBonus() {
    const result = { bonus: this.bonus, x: this.bonusX, total: this.bonus * this.bonusX };
    this.score += result.total;
    return result;
  }

  // End of turn: convert the score to Tickets and save. Returns Tickets earned.
  bankTurn() {
    const earned = Math.floor(this.score / POINTS_PER_TICKET);
    this.tickets += earned;
    this.lifetimeTickets += earned;
    this.bestTurn = Math.max(this.bestTurn, this.score);
    this.save();
    return earned;
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(BANK_SAVE_KEY));
      if (!saved) return;
      this.tickets = Number(saved.tickets) || 0;
      this.lifetimeTickets = Number(saved.lifetimeTickets) || this.tickets;
      this.bestTurn = Number(saved.bestTurn) || 0;
    } catch (e) {
      // No storage available: the bank starts empty each visit.
    }
  }

  save() {
    try {
      localStorage.setItem(BANK_SAVE_KEY, JSON.stringify({
        tickets: this.tickets,
        lifetimeTickets: this.lifetimeTickets,
        bestTurn: this.bestTurn,
      }));
    } catch (e) {
      // Tickets just won't survive a reload.
    }
  }
}
