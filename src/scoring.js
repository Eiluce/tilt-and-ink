// Scoring: every point value in the game, and the three layers on top of them.
//
//  1. Base values, in rough 10x tiers: contact (bumpers, slings, lanes) <
//     target (drop targets, UFO) < shot (ramps, orbit, scoop) < feature
//     (completing a bank or a set) < jackpot (multiball, missions, ranks).
//     Upgrades will scale these later, so they live in one place.
//  2. Combo x1-x5: each aimed shot within COMBO.windowMs of the previous one
//     raises it; it drops back to x1 once play goes quiet. It multiplies
//     points as they're scored. Bumpers and slings never raise it, so it
//     rewards aiming rather than luck.
//  3. End-of-ball bonus: shots and features also add to a bonus pool. When
//     the ball drains the pool is paid out times the bonus multiplier, which
//     the R·O·W lanes raise (x1-x5), as on a real machine.
//
// When a turn ends its score is banked as Tickets, the game's currency, at
// POINTS_PER_TICKET and saved in localStorage along with the best turn.

const POINTS = {
  // contact
  sling: 10,
  spinnerTurn: 20,
  pop: 30,
  standup: 50,
  lane: 50,
  inlane: 50,
  // target
  dropTarget: 100,
  ufo: 250,
  kickout: 250,
  // shot
  ramp: 500,
  orbit: 500,
  scoop: 750,
  // feature
  dropBank: 1000,
  rowComplete: 1000,
  standupsComplete: 1500,
  chapter: 1000, // times the chapter number: 1,000 for I ... 5,000 for V
  // jackpot
  saucerJackpot: 10000,
  promotion: 25000, // times the new rank number
};

// Mission reward by tier (see MISSIONS in missions.js).
const MISSION_REWARDS = [10000, 15000, 25000, 35000, 50000];

// What each achievement adds to the end-of-ball bonus pool.
const BONUS = {
  kickout: 100,
  ramp: 250,
  orbit: 250,
  scoop: 500,
  dropBank: 500,
  rowComplete: 500,
  standupsComplete: 500,
  chapter: 1000,
  saucerJackpot: 2500,
  mission: 2500,
};

const COMBO = { max: 5, windowMs: 3000 };
const BONUS_X_MAX = 5;
const POINTS_PER_TICKET = 100;
const BANK_SAVE_KEY = 'tilt-and-ink.bank';

class Scoring {
  constructor() {
    this.tickets = 0;
    this.bestTurn = 0;
    this.load();
    this.newTurn();
  }

  newTurn() {
    this.score = 0;
    this.newBall();
  }

  newBall() {
    this.bonus = 0;
    this.bonusX = 1;
    this.combo = 1;
    this.lastShotAt = -Infinity;
  }

  // Adds points and returns what was actually scored.
  //  shot:  an aimed shot; builds the combo
  //  flat:  not multiplied by the combo (mission and rank rewards)
  //  bonus: amount added to the end-of-ball bonus pool
  award(points, { shot = false, flat = false, bonus = 0 } = {}) {
    if (shot) {
      const now = performance.now();
      this.combo = now - this.lastShotAt <= COMBO.windowMs ? Math.min(COMBO.max, this.combo + 1) : 1;
      this.lastShotAt = now;
    }
    const total = flat ? points : points * this.combo;
    this.score += total;
    this.bonus += bonus;
    return total;
  }

  // Called every tick: the combo lapses once the window has passed.
  tick(now) {
    if (this.combo > 1 && now - this.lastShotAt > COMBO.windowMs) this.combo = 1;
  }

  // 1 when a shot just landed, falling to 0 as the combo window runs out.
  comboTimeLeft(now) {
    if (this.combo <= 1) return 0;
    return Math.max(0, 1 - (now - this.lastShotAt) / COMBO.windowMs);
  }

  raiseBonusX() {
    this.bonusX = Math.min(BONUS_X_MAX, this.bonusX + 1);
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
    this.bestTurn = Math.max(this.bestTurn, this.score);
    this.save();
    return earned;
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(BANK_SAVE_KEY));
      if (!saved) return;
      this.tickets = Number(saved.tickets) || 0;
      this.bestTurn = Number(saved.bestTurn) || 0;
    } catch (e) {
      // No storage available: the bank starts empty each visit.
    }
  }

  save() {
    try {
      localStorage.setItem(BANK_SAVE_KEY, JSON.stringify({ tickets: this.tickets, bestTurn: this.bestTurn }));
    } catch (e) {
      // Tickets just won't survive a reload.
    }
  }
}
