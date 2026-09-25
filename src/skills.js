// Charge meter and active skills (GAME_DESIGN.md section 6). The meter fills
// from active play; each skill spends its own amount of charge, so a strong
// build can fire several in one hot streak. Skills are unlocked in the
// Charge & Skills branch of the Upgrade Tree, which grants a stat named
// after each skill id below. The meter starts empty each turn.
//
// Unlocked skills go into a loadout of slots (4, more from the tree) fired
// with keys 1-6; the loadout is saved in localStorage.
//
// This holds the meter, timers and loadout; main.js carries out each
// skill's effect.

const SKILLS = [
  { id: 'inkSurge', name: 'Ink Surge', cost: 35, durationMs: 8000, desc: 'Multiplies all scoring for 8 s (2× to start)' },
  { id: 'slowReels', name: 'Slow Reels', cost: 45, durationMs: 5000, desc: 'Slow motion for 5 s' },
  { id: 'bounceHouse', name: 'Bounce House', cost: 75, durationMs: 0, desc: 'Two extra balls from the scoop' },
  { id: 'magnetMitt', name: 'Magnet Mitt', cost: 60, durationMs: 3000, desc: 'Pull the ball toward the best target for 3 s' },
];

const MAX_SKILL_SLOTS = 6;
const LOADOUT_SAVE_KEY = 'tilt-and-ink.loadout.v2';

// Charge gained per event, before the Fast Charge upgrade. 100 = one charge.
const CHARGE_GAIN = {
  sling: 0.5,
  pop: 1,
  standup: 1,
  lane: 1,
  shot: 4, // aimed shots: ramps, orbit, scoop, kickout, UFO, drop targets
  feature: 8, // completing a bank or set, reaching a chapter
  mission: 20,
};

class Skills {
  constructor(upgrades) {
    this.upgrades = upgrades;
    this.loadout = Array(MAX_SKILL_SLOTS).fill(null); // skill id per slot
    this.loadLoadout();
    this.fillLoadout();
    this.newTurn();
  }

  slots() {
    return Math.min(MAX_SKILL_SLOTS, this.upgrades.stat('skillSlots'));
  }

  // Puts `id` in `slot` (moving it out of any other slot), or clears the
  // slot when id is null.
  equip(slot, id) {
    if (slot >= this.slots() || (id && !this.isUnlocked(id))) return;
    if (id) this.loadout = this.loadout.map((s) => (s === id ? null : s));
    this.loadout[slot] = id;
    this.saveLoadout();
  }

  // Newly unlocked skills drop into the first free slot, so a player who
  // never opens the loadout still gets every skill while there's room.
  fillLoadout() {
    for (const s of SKILLS) {
      if (!this.isUnlocked(s.id) || this.loadout.includes(s.id) || this.known?.has(s.id)) continue;
      const free = this.loadout.findIndex((x, i) => !x && i < this.slots());
      if (free >= 0) this.loadout[free] = s.id;
    }
    this.known = new Set(SKILLS.filter((s) => this.isUnlocked(s.id)).map((s) => s.id));
    this.saveLoadout();
  }

  // Skill in a slot, if it's equipped and still unlocked.
  inSlot(slot) {
    const id = slot < this.slots() ? this.loadout[slot] : null;
    return id && this.isUnlocked(id) ? id : null;
  }

  loadLoadout() {
    try {
      const saved = JSON.parse(localStorage.getItem(LOADOUT_SAVE_KEY));
      if (Array.isArray(saved?.loadout)) {
        this.loadout = this.loadout.map((_, i) => (SKILLS.some((s) => s.id === saved.loadout[i]) ? saved.loadout[i] : null));
      }
      if (Array.isArray(saved?.known)) this.known = new Set(saved.known);
    } catch (e) {
      // No storage: default loadout.
    }
  }

  saveLoadout() {
    try {
      localStorage.setItem(LOADOUT_SAVE_KEY, JSON.stringify({ loadout: this.loadout, known: [...(this.known || [])] }));
    } catch (e) {
      // The loadout just won't survive a reload.
    }
  }

  newTurn() {
    this.charge = 0;
    this.activeUntil = {};
  }

  isUnlocked(id) {
    return this.upgrades.stat(id) > 0;
  }

  anyUnlocked() {
    return SKILLS.some((s) => this.isUnlocked(s.id));
  }

  max() {
    return this.upgrades.stat('chargeMax');
  }

  cost(id) {
    const base = SKILLS.find((s) => s.id === id).cost;
    return Math.round(base * this.upgrades.stat('skillCost'));
  }

  gain(kind) {
    if (!this.anyUnlocked() || !CHARGE_GAIN[kind]) return;
    this.charge = Math.min(this.max(), this.charge + CHARGE_GAIN[kind] * this.upgrades.stat('chargeRate'));
  }

  isActive(id, now = performance.now()) {
    return now < (this.activeUntil[id] || 0);
  }

  canUse(id, now = performance.now()) {
    return this.isUnlocked(id) && this.charge >= this.cost(id) && !this.isActive(id, now);
  }

  // Spends the charge and starts the timer. Returns false if it can't fire.
  use(id, now = performance.now()) {
    if (!this.canUse(id, now)) return false;
    this.charge -= this.cost(id);
    const skill = SKILLS.find((s) => s.id === id);
    if (skill.durationMs) this.activeUntil[id] = now + skill.durationMs * this.upgrades.stat('skillTime');
    return true;
  }

  timeLeft(id, now = performance.now()) {
    return Math.max(0, (this.activeUntil[id] || 0) - now);
  }
}
