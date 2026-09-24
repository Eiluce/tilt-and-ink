// Charge meter and active skills (GAME_DESIGN.md section 6). The meter fills
// from active play; each skill spends its own amount of charge, so a strong
// build can fire several in one hot streak. Skills are unlocked in the
// Charge & Skills branch of the Upgrade Tree, whose node ids match the skill
// ids below. The meter starts empty each turn.
//
// This holds the meter and timers; main.js carries out each skill's effect.

const SKILLS = [
  { id: 'inkSurge', key: 'Digit1', label: '1', name: 'Ink Surge', cost: 35, durationMs: 8000, desc: '2× scoring for 8 s' },
  { id: 'slowReels', key: 'Digit2', label: '2', name: 'Slow Reels', cost: 45, durationMs: 5000, desc: 'Slow motion for 5 s' },
  { id: 'bounceHouse', key: 'Digit3', label: '3', name: 'Bounce House', cost: 75, durationMs: 0, desc: 'Two extra balls' },
  { id: 'magnetMitt', key: 'Digit4', label: '4', name: 'Magnet Mitt', cost: 60, durationMs: 3000, desc: 'Pull the ball to the best target' },
];

// Charge gained per event, before the Fast Charge upgrade. 100 = one charge.
const CHARGE_GAIN = {
  sling: 0.5,
  pop: 1,
  standup: 1,
  lane: 1,
  shot: 4, // ramps, orbit, scoop, kickout, UFO, drop targets
  feature: 8, // completing a bank or set, reaching a chapter
  mission: 20,
};

class Skills {
  constructor(upgrades) {
    this.upgrades = upgrades;
    this.newTurn();
  }

  newTurn() {
    this.charge = 0;
    this.activeUntil = {};
  }

  isUnlocked(id) {
    return Boolean(this.upgrades.effect(id));
  }

  anyUnlocked() {
    return SKILLS.some((s) => this.isUnlocked(s.id));
  }

  max() {
    return this.upgrades.effect('doubleCharge');
  }

  cost(id) {
    const base = SKILLS.find((s) => s.id === id).cost;
    return Math.round(base * this.upgrades.effect('skillDiscount'));
  }

  gain(kind) {
    if (!this.anyUnlocked() || !CHARGE_GAIN[kind]) return;
    this.charge = Math.min(this.max(), this.charge + CHARGE_GAIN[kind] * this.upgrades.effect('chargeRate'));
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
    if (skill.durationMs) this.activeUntil[id] = now + skill.durationMs;
    return true;
  }

  timeLeft(id, now = performance.now()) {
    return Math.max(0, (this.activeUntil[id] || 0) - now);
  }
}
