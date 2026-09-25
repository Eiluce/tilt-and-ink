// Rough pacing check for the Upgrade Tree: simulates an average player's
// turns with the real node data and scoring formulas, buying the cheapest
// available node whenever they can, and prints when each table pass and the
// whole tree are reached. Run with `node tools/pacing.js`.
//
// The play model (event rates, ball life) is a guess, not measured; use it to
// compare cost curves, not as a promise of real play time.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const store = {};
const context = vm.createContext({
  console,
  Math,
  performance: { now: () => 0 },
  localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } },
});
const src = ['tables.js', 'scoring.js', 'upgrades.js', 'skills.js']
  .map((f) => fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')).join('\n');
const { Scoring, Upgrades, NODES, SOURCES, CHARGE_GAIN, SKILLS, TABLES, formatPoints } =
  vm.runInContext(`${src}\n({ Scoring, Upgrades, NODES, SOURCES, CHARGE_GAIN, SKILLS, TABLES, formatPoints })`, context);

// Hits per minute of a ball in play, for an average player.
const RATE = {
  pop: 22, sling: 12, flipper: 30, wall: 18, standup: 5, dropTarget: 3, ufo: 2.5, kickout: 1,
  spinnerTurn: 8, lane: 4, inlane: 4, orbit: 1.2, ramp: 1.5, scoop: 0.6, dropBank: 0.8,
  rowComplete: 1, standupsComplete: 0.6, saucerJackpot: 0.2, mission: 0.25,
};
const BALL_LIFE_S = 45;
const OVERHEAD_S = 8; // per ball: launch, bonus card
const SHOP_S = 10; // per turn, in the tree
const RANK_AT = [1, 3, 5, 8, 12];

const scoring = new Scoring();
const up = new Upgrades(scoring);
scoring.upgrades = up;
let missionsDone = 0;

function turn() {
  const s = (n) => up.stat(n);
  scoring.rank = RANK_AT.filter((m) => missionsDone >= m).length;
  const balls = s('balls') / (1 - Math.min(0.6, s('drainSave'))) + s('guardian')
    + s('balls') * 0.2 * Math.min(1, s('ballSaveMs') / 15000);
  const minutes = (balls * BALL_LIFE_S) / 60;

  const rate = { ...RATE };
  rate.chapter = scoring.isAwake('chapter') ? Math.min(RATE.ramp * (scoring.isAwake('ramp') ? 1 : 0) + RATE.standupsComplete, 2) : 0;
  rate.pickup = scoring.isAwake('pickup') ? (60000 / s('pickupEveryMs')) * (0.3 + s('pickupMagnet') * 0.015) : 0;
  if (!scoring.isAwake('saucerJackpot') || !scoring.isAwake('scoop')) rate.saucerJackpot = 0;

  const shotsPerMin = Object.keys(rate).filter((k) => SOURCES[k].shot && scoring.isAwake(k)).reduce((a, k) => a + rate[k], 0);
  const combo = s('comboFloor') + (s('comboMax') - s('comboFloor')) * Math.min(0.45, shotsPerMin / 25);

  let charge = 0;
  for (const k of Object.keys(rate)) if (scoring.isAwake(k) && SOURCES[k].charge) charge += rate[k] * CHARGE_GAIN[SOURCES[k].charge];
  charge *= s('chargeRate');
  const surgeUses = s('inkSurge') ? charge / (35 * s('skillCost')) : 0;
  const surgeOn = Math.min(0.5, (surgeUses * 8 * s('skillTime')) / 60);
  const surge = 1 + surgeOn * (s('surgeX') - 1);

  const bonusX = s('bonusXMax') > 1 ? (s('bonusXStart') + s('bonusXMax')) / 2 : s('bonusXStart');
  let perMin = 0;
  let bonusPerMin = 0;
  for (const [k, r] of Object.entries(rate)) {
    let v = scoring.value(k) * r;
    if (k === 'chapter') v *= 3;
    if (k === 'mission') v *= 2;
    if (k === 'pickup') v *= 1 + s('pickupGolden') * 9;
    if (k === 'pop') v *= (1 + s('superChance') * (s('superX') - 1)) * (1 + s('chain'));
    if (s('bonus') && SOURCES[k].bonus) bonusPerMin += v * SOURCES[k].bonus;
    perMin += SOURCES[k].flat ? v : v * combo * surge;
  }
  perMin *= 1 + s('echo');
  if (scoring.isAwake('mission')) missionsDone += RATE.mission * minutes;

  scoring.score = Math.round((perMin + bonusPerMin * bonusX) * minutes);
  const seconds = balls * (BALL_LIFE_S + OVERHEAD_S) + SHOP_S;
  scoring.bankTurn();
  return seconds;
}

function cheapestAvailable() {
  let best = null;
  for (const u of NODES) {
    const st = up.status(u.id);
    if (st.state !== 'available') continue;
    if (!best || st.cost < best.cost) best = { id: u.id, cost: st.cost };
  }
  return best;
}

const hours = (t) => `${(t / 3600).toFixed(2)} h`;
let t = 0;
let turns = 0;
const log = [];
while (t < 60 * 3600) {
  t += turn();
  turns += 1;
  if (turns <= 3 || turns % 200 === 0) log.push(`turn ${turns} at ${hours(t)}: ${formatPoints(scoring.score)} points`);
  for (;;) {
    const next = cheapestAvailable();
    if (!next || next.cost > scoring.tickets) break;
    up.buy(next.id);
    const u = up.def(next.id);
    if (u.pass || turns < 25) log.push(`${hours(t)} (turn ${turns}): ${u.name}${u.pass ? ' ← PASS' : ''} for ${formatPoints(next.cost)}, turn score ${formatPoints(scoring.score)}`);
  }
  if (NODES.every((u) => up.status(u.id).state === 'maxed')) {
    log.push(`Whole tree bought at ${hours(t)} after ${turns} turns`);
    break;
  }
}
console.log(log.join('\n'));
console.log(`\n${NODES.length} nodes, ${formatPoints(up.totalCost())} Tickets in total, ended at ${hours(t)}`);
