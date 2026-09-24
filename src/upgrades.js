// The Upgrade Tree (GAME_DESIGN.md section 5): Tickets buy permanent levels
// in five branches. Each branch ends in a capstone, which needs every other
// upgrade in its branch bought at least once plus a minimum spend in the
// other branches, so builds stay branching rather than five silos.
//
// This file only holds the tree and what's been bought; main.js reads the
// levels (Upgrades.level / Upgrades.effect) and applies them to the table.
// Purchases are saved in localStorage and take effect immediately.
//
// First-pass costs, aimed at roughly 2-3 hours to buy everything on one
// table. Expect to rebalance after playtesting.

const BRANCHES = [
  { id: 'flippers', name: 'Flipper Mastery' },
  { id: 'bumpers', name: 'Bumper Power' },
  { id: 'combo', name: 'Combo & Multiplier' },
  { id: 'ball', name: 'Ball Control' },
  { id: 'skills', name: 'Charge & Skills' },
];

// levels: what each level does (index 0 = level 1). effect: the value main.js
// uses at a given level (level 0 = not bought).
const UPGRADES = [
  // --- Flipper Mastery
  {
    id: 'flipStrength', branch: 'flippers', name: 'Stronger Flippers', costs: [80, 200, 450],
    levels: ['Flippers swing 10% faster', '20% faster', '30% faster'],
    effect: (l) => 1 + 0.1 * l,
  },
  {
    id: 'springyRubbers', branch: 'flippers', name: 'Springy Rubbers', costs: [300, 800],
    requires: { flipStrength: 1 },
    levels: ['Resting flippers bounce the ball back harder', 'Even harder'],
    effect: (l) => [0.3, 0.5, 0.7][l],
  },
  {
    id: 'perfectFlip', branch: 'flippers', name: 'Perfect Flip', costs: [3000], capstone: true, outsideSpend: 3000,
    levels: ['Flip just as the ball lands on a flipper for a 25% faster shot'],
    effect: (l) => l > 0,
  },

  // --- Bumper Power
  {
    id: 'bumperPoints', branch: 'bumpers', name: 'Loud Bumpers', costs: [80, 220, 550],
    levels: ['Pops, slings and standups score 50% more', '100% more', '150% more'],
    effect: (l) => 1 + 0.5 * l,
  },
  {
    id: 'superPulse', branch: 'bumpers', name: 'Super Pulse', costs: [400, 1100],
    requires: { bumperPoints: 1 },
    levels: ['10% chance a pop hit is a SUPER hit worth 5×', '20% chance'],
    effect: (l) => 0.1 * l,
  },
  {
    id: 'chainReaction', branch: 'bumpers', name: 'Chain Reaction', costs: [3000], capstone: true, outsideSpend: 3000,
    levels: ['30% chance a pop hit sets off another pop bumper too'],
    effect: (l) => (l > 0 ? 0.3 : 0),
  },

  // --- Combo & Multiplier
  {
    id: 'comboFuse', branch: 'combo', name: 'Longer Fuse', costs: [120, 300, 700],
    levels: ['Combo window 3.75 s', '4.5 s', '5.25 s'],
    effect: (l) => 3000 + 750 * l,
  },
  {
    id: 'comboCap', branch: 'combo', name: 'Higher Cap', costs: [500, 1400],
    requires: { comboFuse: 1 },
    levels: ['Combo goes up to ×6', 'Up to ×7'],
    effect: (l) => 5 + l,
  },
  {
    id: 'bonusHeadStart', branch: 'combo', name: 'Bonus Head Start', costs: [600, 1600],
    requires: { comboFuse: 1 },
    levels: ['Each ball starts with end-of-ball bonus 2×', 'Starts at 3×'],
    effect: (l) => 1 + l,
  },
  {
    id: 'hotStreak', branch: 'combo', name: 'Hot Streak', costs: [3500], capstone: true, outsideSpend: 3000,
    levels: ['The combo never drops below ×2'],
    effect: (l) => (l > 0 ? 2 : 1),
  },

  // --- Ball Control
  {
    id: 'ballSaver', branch: 'ball', name: 'Ball Saver', costs: [120, 300, 650],
    levels: ['Shoot Again lasts 12 s after launch', '16 s', '20 s'],
    effect: (l) => 8000 + 4000 * l,
  },
  {
    id: 'extraBalls', branch: 'ball', name: 'Extra Balls', costs: [250, 1200],
    levels: ['4 balls per turn', '5 balls per turn'],
    effect: (l) => 3 + l,
  },
  {
    id: 'luckyDrain', branch: 'ball', name: 'Saved by the Bell', costs: [700, 2000],
    requires: { ballSaver: 1 },
    levels: ['10% chance a drained ball comes back', '20% chance'],
    effect: (l) => 0.1 * l,
  },
  {
    id: 'guardian', branch: 'ball', name: 'Guardian Angel', costs: [3500], capstone: true, outsideSpend: 3000,
    levels: ['Once per turn, a drained ball always comes back'],
    effect: (l) => l > 0,
  },

  // --- Charge & Skills
  {
    id: 'inkSurge', branch: 'skills', name: 'Ink Surge', costs: [150],
    levels: ['Unlocks skill 1: double all scoring for 8 s'],
    effect: (l) => l > 0,
  },
  {
    id: 'chargeRate', branch: 'skills', name: 'Fast Charge', costs: [250, 600, 1400],
    requires: { inkSurge: 1 },
    levels: ['Charge meter fills 25% faster', '50% faster', '75% faster'],
    effect: (l) => 1 + 0.25 * l,
  },
  {
    id: 'slowReels', branch: 'skills', name: 'Slow Reels', costs: [600],
    requires: { inkSurge: 1 },
    levels: ['Unlocks skill 2: slow motion for 5 s'],
    effect: (l) => l > 0,
  },
  {
    id: 'skillDiscount', branch: 'skills', name: 'Cheap Tricks', costs: [800, 1800],
    requires: { inkSurge: 1 },
    levels: ['Skills cost 15% less charge', '30% less'],
    effect: (l) => 1 - 0.15 * l,
  },
  {
    id: 'bounceHouse', branch: 'skills', name: 'Bounce House', costs: [1400],
    requires: { slowReels: 1 },
    levels: ['Unlocks skill 3: two extra balls for a quick multiball'],
    effect: (l) => l > 0,
  },
  {
    id: 'magnetMitt', branch: 'skills', name: 'Magnet Mitt', costs: [2400],
    requires: { bounceHouse: 1 },
    levels: ['Unlocks skill 4: pull the ball toward the best target for 3 s'],
    effect: (l) => l > 0,
  },
  {
    id: 'doubleCharge', branch: 'skills', name: 'Double Charge', costs: [3200], capstone: true, outsideSpend: 3000,
    levels: ['The charge meter holds two full charges'],
    effect: (l) => (l > 0 ? 200 : 100),
  },
];

const UPGRADES_SAVE_KEY = 'tilt-and-ink.upgrades';

class Upgrades {
  constructor(scoring) {
    this.scoring = scoring; // holds the Tickets balance
    this.levels = {};
    this.listeners = [];
    this.load();
  }

  def(id) {
    return UPGRADES.find((u) => u.id === id);
  }

  level(id) {
    return this.levels[id] || 0;
  }

  // The effect value for an upgrade at its current level.
  effect(id) {
    return this.def(id).effect(this.level(id));
  }

  spentIn(branch) {
    return UPGRADES.filter((u) => u.branch === branch)
      .reduce((sum, u) => sum + u.costs.slice(0, this.level(u.id)).reduce((a, b) => a + b, 0), 0);
  }

  spentOutside(branch) {
    return BRANCHES.filter((b) => b.id !== branch).reduce((sum, b) => sum + this.spentIn(b.id), 0);
  }

  // { state: 'maxed' | 'locked' | 'available', cost, reasons[] }
  status(id) {
    const u = this.def(id);
    const lvl = this.level(id);
    if (lvl >= u.costs.length) return { state: 'maxed', cost: 0, reasons: [] };
    const reasons = [];
    for (const [req, need] of Object.entries(u.requires || {})) {
      if (this.level(req) < need) reasons.push(`Needs ${this.def(req).name}${need > 1 ? ` level ${need}` : ''}`);
    }
    if (u.capstone) {
      const missing = UPGRADES.filter((o) => o.branch === u.branch && !o.capstone && this.level(o.id) < 1);
      if (missing.length) reasons.push(`Needs every ${BRANCHES.find((b) => b.id === u.branch).name} upgrade`);
      const outside = this.spentOutside(u.branch);
      if (outside < u.outsideSpend) {
        reasons.push(`Spend ${u.outsideSpend.toLocaleString()} Tickets in other branches (${outside.toLocaleString()} so far)`);
      }
    }
    return { state: reasons.length ? 'locked' : 'available', cost: u.costs[lvl], reasons };
  }

  canBuy(id) {
    const s = this.status(id);
    return s.state === 'available' && this.scoring.tickets >= s.cost;
  }

  buy(id) {
    if (!this.canBuy(id)) return false;
    const { cost } = this.status(id);
    this.scoring.tickets -= cost;
    this.scoring.save();
    this.levels[id] = this.level(id) + 1;
    this.save();
    for (const fn of this.listeners) fn(id);
    return true;
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  totalCost() {
    return UPGRADES.reduce((sum, u) => sum + u.costs.reduce((a, b) => a + b, 0), 0);
  }

  // Wipes all purchases (the Tickets they cost are not refunded).
  reset() {
    this.levels = {};
    this.save();
    for (const fn of this.listeners) fn(null);
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(UPGRADES_SAVE_KEY));
      if (saved && saved.levels) this.levels = saved.levels;
    } catch (e) {
      // No storage: nothing bought yet.
    }
  }

  save() {
    try {
      localStorage.setItem(UPGRADES_SAVE_KEY, JSON.stringify({ levels: this.levels }));
    } catch (e) {
      // Purchases just won't survive a reload.
    }
  }
}
