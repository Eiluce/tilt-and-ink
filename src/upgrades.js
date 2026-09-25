// The Upgrade Tree (GAME_DESIGN.md section 5). The table starts dormant: only
// the pops and slings score, 1 point each, on a single ball. Every other
// scoring source, rule and skill is woken up by a node here, and later nodes
// multiply what's awake until turns score billions.
//
// Nodes don't carry code. Each one grants stats (see STAT_BASE), and a stat's
// value is its base plus what every bought node grants at its level, so
// main.js and scoring.js just read Upgrades.stat(name).
//
//  - awake.<source>: 1 once that scoring source is switched on
//  - value.<source>: +% on that source's points
//  - branch.<branch>: +% on every source in that branch (SOURCES in scoring.js)
//  - global, perTable: +% on everything (perTable is per table pass owned)
//  - x.<source>, x.branch.<branch>, x.global: ×N multipliers, which multiply
// The +% stats add up inside their group, and the groups and ×N multipliers
// multiply together (scoring.js). Rocket Row's nodes are +%; each later
// table's nodes are mostly ×N, so every table reached lifts scoring ~10×.
//
// Seven branches: the centre spine holds the table passes, and each of the
// eight tables (TABLES in tables.js; see the `table` field) gates a ring of
// stronger nodes.
// Buying a table's pass counts as reaching it, even before the table itself
// is built. Costs are first-pass, checked against the pacing simulation in
// tools/pacing.js: about 1 h to the Timber Hollow pass, 15 h for everything.

const BRANCHES = [
  { id: 'tables', name: 'Tables' },
  { id: 'bumpers', name: 'Bumpers & Contact' },
  { id: 'targets', name: 'Targets' },
  { id: 'lanes', name: 'Ramps & Lanes' },
  { id: 'rules', name: 'Rules & Features' },
  { id: 'ball', name: 'Ball Control' },
  { id: 'skills', name: 'Charge & Skills' },
];

// Value of every stat before any node. awake.* and the rest default to 0,
// except the pops and slings, which score from the first ball.
const STAT_BASE = {
  'awake.pop': 1,
  'awake.sling': 1,
  balls: 1,
  ballSaveMs: 0,
  drainSave: 0,
  guardian: 0,
  flipStrength: 1,
  springy: 0.3,
  perfectFlip: 0,
  comboMax: 1,
  comboWindowMs: 3000,
  comboFloor: 1,
  bonusXStart: 1,
  bonusXMax: 1,
  superX: 5,
  pickupEveryMs: 14000,
  chargeRate: 1,
  skillCost: 1,
  chargeMax: 100,
  surgeX: 2,
  skillTime: 1,
  skillSlots: 4,
};

// Rounds a cost to two significant figures so prices read cleanly.
function niceCost(n) {
  if (n < 100) return Math.round(n);
  const mag = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / mag) * mag;
}

// `levels` prices starting at `base`, each `growth` times the last.
// Price scale of each table's ring of nodes (index = table number; Rocket
// Row's nodes are priced directly). Tuned with tools/pacing.js.
const TIER = [0, 1, 60e3, 650e3, 19e6, 280e6, 1.3e9, 7e9, 1.4e12];

const costs = (base, levels = 1, growth = 2.5) =>
  Array.from({ length: levels }, (_, i) => niceCost(base * growth ** i));

// Node fields:
//  id, branch, name, desc (what one level does), costs (one per level)
//  grants: { stat: per-level amount | [total at level 1, level 2, ...] }
//          (an x.* stat's amount is a factor applied once per level)
//  requires: { nodeId: level }  table: table pass needed (default 1)
//  pass: n for a table pass node, with lifetime: lifetime Tickets needed
const NODES = [
  // --- Tables: the centre spine
  { id: 'secondReel', branch: 'tables', name: 'Second Reel', desc: '+1 ball per turn', costs: [12], grants: { balls: 1 } },
  { id: 'crowd', branch: 'tables', name: 'Matinee Crowd', desc: '+10% to all points', costs: costs(400, 5, 2.4), grants: { global: 10 }, requires: { secondReel: 1 } },
  { id: 'pass2', branch: 'tables', name: 'Timber Hollow Pass', pass: 2, lifetime: TIER[2] * 0.6, costs: [TIER[2] * 0.8], requires: { crowd: 1 } },
  { id: 'doubleFeature', branch: 'tables', name: 'Double Feature', desc: '+25% to all points for each table reached', costs: costs(TIER[2] * 1.33, 3, 3), grants: { perTable: 25 }, requires: { pass2: 1 }, table: 2 },
  { id: 'pass3', branch: 'tables', name: "Davy Jones' Deep Pass", pass: 3, lifetime: TIER[3] * 0.6, costs: [TIER[3] * 0.8], requires: { pass2: 1 } },
  { id: 'boxOffice', branch: 'tables', name: 'Box Office', desc: '×1.5 all points', costs: costs(TIER[3] * 1.25, 3, 3), grants: { 'x.global': 1.5 }, requires: { pass3: 1 }, table: 3 },
  { id: 'pass4', branch: 'tables', name: 'Mount Cinder Pass', pass: 4, lifetime: TIER[4] * 0.6, costs: [TIER[4] * 0.8], requires: { pass3: 1 } },
  { id: 'soldOut', branch: 'tables', name: 'Sold Out', desc: '+50% to all points for each table reached', costs: costs(TIER[4] * 1.2, 3, 3), grants: { perTable: 50 }, requires: { pass4: 1 }, table: 4 },
  { id: 'pass5', branch: 'tables', name: 'Frostbite Peak Pass', pass: 5, lifetime: TIER[5] * 0.6, costs: [TIER[5] * 0.8], requires: { pass4: 1 } },
  { id: 'newsreel', branch: 'tables', name: 'Newsreel', desc: '×1.6 all points', costs: costs(TIER[5] * 1.33, 3, 3), grants: { 'x.global': 1.6 }, requires: { pass5: 1 }, table: 5 },
  { id: 'pass6', branch: 'tables', name: 'Tomb of Sekhmet Pass', pass: 6, lifetime: TIER[6] * 0.6, costs: [TIER[6] * 0.8], requires: { pass5: 1 } },
  { id: 'premiere', branch: 'tables', name: 'Premiere Night', desc: '+150% to all points for each table reached', costs: costs(TIER[6] * 1.25, 3, 3), grants: { perTable: 150 }, requires: { pass6: 1 }, table: 6 },
  { id: 'pass7', branch: 'tables', name: 'Ghost Train Pass', pass: 7, lifetime: TIER[7] * 0.6, costs: [TIER[7] * 0.8], requires: { pass6: 1 } },
  { id: 'encore', branch: 'tables', name: 'Encore', desc: '×1.7 all points', costs: costs(TIER[7] * 1.33, 3, 3), grants: { 'x.global': 1.7 }, requires: { pass7: 1 }, table: 7 },
  { id: 'pass8', branch: 'tables', name: "Devil's Lounge Pass", pass: 8, lifetime: TIER[8] * 0.6, costs: [TIER[8] * 0.8], requires: { pass7: 1 } },
  { id: 'ovation', branch: 'tables', name: 'Standing Ovation', desc: '×3 all points', costs: [TIER[8] * 1.67], grants: { 'x.global': 3 }, requires: { pass8: 1 }, table: 8 },

  // --- Bumpers & Contact: pops, slings, flippers and walls
  { id: 'popPolish', branch: 'bumpers', name: 'Pop Polish', desc: '+50% pop bumper points', costs: costs(20, 5, 2.2), grants: { 'value.pop': 50 }, requires: { secondReel: 1 } },
  { id: 'slingRubber', branch: 'bumpers', name: 'Sling Rubber', desc: '+50% slingshot points', costs: costs(25, 5, 2.2), grants: { 'value.sling': 50 }, requires: { popPolish: 1 } },
  { id: 'flipperInk', branch: 'bumpers', name: 'Inked Flippers', desc: 'Flipper hits score', costs: [60], grants: { 'awake.flipper': 1 }, requires: { popPolish: 1 } },
  { id: 'wallRattle', branch: 'bumpers', name: 'Rattle the Rails', desc: 'Hard hits on walls and rails score', costs: [150], grants: { 'awake.wall': 1 }, requires: { flipperInk: 1 } },
  { id: 'contactCrew', branch: 'bumpers', name: 'Contact Crew', desc: '+20% to every Bumpers & Contact source', costs: costs(350, 5, 2.4), grants: { 'branch.bumpers': 20 }, requires: { slingRubber: 1 } },
  { id: 'superPulse', branch: 'bumpers', name: 'Super Pulse', desc: '+5% chance a pop hit is a SUPER hit', costs: costs(900, 4, 2.4), grants: { superChance: 0.05 }, requires: { contactCrew: 1 } },
  { id: 'chainReaction', branch: 'bumpers', name: 'Chain Reaction', desc: '+6% chance a pop hit fires another pop', costs: costs(5000, 3, 2.5), grants: { chain: 0.06 }, requires: { superPulse: 1 } },
  { id: 'toadstools', branch: 'bumpers', name: 'Toadstool Ring', desc: '×1.5 pop and sling points', costs: costs(TIER[2], 3, 2.8), grants: { 'x.pop': 1.5, 'x.sling': 1.5 }, requires: { contactCrew: 1 }, table: 2 },
  { id: 'echoChamber', branch: 'bumpers', name: 'Echo Chamber', desc: '+4% chance any hit echoes and scores twice', costs: costs(TIER[2] * 1.67, 5, 2.2), grants: { echo: 0.04 }, requires: { chainReaction: 1 }, table: 2 },
  { id: 'riptide', branch: 'bumpers', name: 'Riptide Rubber', desc: '×1.5 every Bumpers & Contact source', costs: costs(TIER[3], 3, 2.8), grants: { 'x.branch.bumpers': 1.5 }, requires: { toadstools: 1 }, table: 3 },
  { id: 'jellyfish', branch: 'bumpers', name: 'Jellyfish Sting', desc: 'SUPER hits are worth 5× more', costs: costs(TIER[3] * 1.75, 2, 3), grants: { superX: 5 }, requires: { superPulse: 4 }, table: 3 },
  { id: 'magmaCore', branch: 'bumpers', name: 'Magma Core', desc: '×1.6 pop, sling, flipper and wall points', costs: costs(TIER[4], 3, 2.8), grants: { 'x.pop': 1.6, 'x.sling': 1.6, 'x.flipper': 1.6, 'x.wall': 1.6 }, requires: { riptide: 1 }, table: 4 },
  { id: 'avalanche', branch: 'bumpers', name: 'Avalanche Echo', desc: '+5% echo chance', costs: costs(TIER[5], 3, 2.8), grants: { echo: 0.05 }, requires: { echoChamber: 5 }, table: 5 },
  { id: 'scarabSwarm', branch: 'bumpers', name: 'Scarab Swarm', desc: '+10% chain reaction chance', costs: costs(TIER[6], 3, 2.8), grants: { chain: 0.1 }, requires: { magmaCore: 1 }, table: 6 },
  { id: 'poltergeist', branch: 'bumpers', name: 'Poltergeist', desc: '×1.7 every Bumpers & Contact source', costs: costs(TIER[7], 3, 2.8), grants: { 'x.branch.bumpers': 1.7 }, requires: { scarabSwarm: 1 }, table: 7 },
  { id: 'hellfire', branch: 'bumpers', name: 'Hellfire Bumpers', desc: '×5 every Bumpers & Contact source', costs: [TIER[8]], grants: { 'x.branch.bumpers': 5 }, requires: { poltergeist: 1 }, table: 8 },

  // --- Targets: standups, drop targets, UFO, kickout
  { id: 'wakeStandups', branch: 'targets', name: 'Standup Targets', desc: 'Standup targets score and light', costs: [30], grants: { 'awake.standup': 1 }, requires: { secondReel: 1 } },
  { id: 'targetPaint', branch: 'targets', name: 'Fresh Paint', desc: '+20% to every Targets source', costs: costs(250, 5, 2.4), grants: { 'branch.targets': 20 }, requires: { wakeStandups: 1 } },
  { id: 'wakeDrops', branch: 'targets', name: 'Drop Targets', desc: 'The 1-2-3 drop targets drop and score, and clearing them pays a bonus', costs: [120], grants: { 'awake.dropTarget': 1, 'awake.dropBank': 1 }, requires: { wakeStandups: 1 } },
  { id: 'standupSet', branch: 'targets', name: 'Full Set', desc: 'Lighting all six standups pays a bonus', costs: [900], grants: { 'awake.standupsComplete': 1 }, requires: { wakeStandups: 1 } },
  { id: 'wakeKickout', branch: 'targets', name: 'Kickout Hole', desc: 'The kickout hole catches the ball and scores', costs: [500], grants: { 'awake.kickout': 1 }, requires: { wakeDrops: 1 } },
  { id: 'wakeUfo', branch: 'targets', name: 'The Saucer', desc: 'The UFO scores and counts as an aimed shot', costs: [300], grants: { 'awake.ufo': 1 }, requires: { wakeDrops: 1 } },
  { id: 'bankShot', branch: 'targets', name: 'Bank Shot', desc: '+50% drop target and bank points', costs: costs(1500, 3, 2.5), grants: { 'value.dropTarget': 50, 'value.dropBank': 50 }, requires: { wakeDrops: 1 } },
  { id: 'deathRay', branch: 'targets', name: 'Death Ray', desc: '+50% UFO points', costs: costs(2000, 3, 2.5), grants: { 'value.ufo': 50 }, requires: { wakeUfo: 1 } },
  { id: 'owlEyes', branch: 'targets', name: 'Owl Eyes', desc: '×1.5 every Targets source', costs: costs(TIER[2], 3, 2.8), grants: { 'x.branch.targets': 1.5 }, requires: { targetPaint: 1 }, table: 2 },
  { id: 'treasure', branch: 'targets', name: 'Treasure Chests', desc: '×1.7 drop target and bank points', costs: costs(TIER[3], 3, 2.8), grants: { 'x.dropTarget': 1.7, 'x.dropBank': 1.7 }, requires: { bankShot: 1 }, table: 3 },
  { id: 'tikiIdols', branch: 'targets', name: 'Tiki Idols', desc: '×1.6 every Targets source', costs: costs(TIER[4], 3, 2.8), grants: { 'x.branch.targets': 1.6 }, requires: { owlEyes: 1 }, table: 4 },
  { id: 'yetiTracks', branch: 'targets', name: 'Yeti Tracks', desc: '×2.5 standup and full-set points', costs: costs(TIER[5], 2, 3), grants: { 'x.standup': 2.5, 'x.standupsComplete': 2.5 }, requires: { standupSet: 1 }, table: 5 },
  { id: 'sarcophagus', branch: 'targets', name: 'Sarcophagus', desc: '×2.5 kickout and UFO points', costs: costs(TIER[6], 2, 3), grants: { 'x.kickout': 2.5, 'x.ufo': 2.5 }, requires: { tikiIdols: 1 }, table: 6 },
  { id: 'hauntedTargets', branch: 'targets', name: 'Haunted Targets', desc: '×2 every Targets source', costs: costs(TIER[7], 2, 3), grants: { 'x.branch.targets': 2 }, requires: { sarcophagus: 1 }, table: 7 },
  { id: 'devilsDue', branch: 'targets', name: "Devil's Due", desc: '×5 every Targets source', costs: [TIER[8]], grants: { 'x.branch.targets': 5 }, requires: { hauntedTargets: 1 }, table: 8 },

  // --- Ramps & Lanes: inlanes, R·O·W lanes, spinner, orbit, ramps, scoop
  { id: 'wakeInlanes', branch: 'lanes', name: 'Inlanes', desc: 'The inlanes above the flippers score', costs: [40], grants: { 'awake.inlane': 1 }, requires: { secondReel: 1 } },
  { id: 'laneShine', branch: 'lanes', name: 'Lane Shine', desc: '+20% to every Ramps & Lanes source', costs: costs(300, 5, 2.4), grants: { 'branch.lanes': 20 }, requires: { wakeInlanes: 1 } },
  { id: 'wakeRow', branch: 'lanes', name: 'R·O·W Lanes', desc: 'The R·O·W lanes score, and lighting all three pays a bonus', costs: [100], grants: { 'awake.lane': 1, 'awake.rowComplete': 1 }, requires: { wakeInlanes: 1 } },
  { id: 'wakeSpinner', branch: 'lanes', name: 'Satellite Spinner', desc: 'The spinner scores for every turn', costs: [200], grants: { 'awake.spinnerTurn': 1 }, requires: { wakeInlanes: 1 } },
  { id: 'wakeOrbit', branch: 'lanes', name: 'Left Orbit', desc: 'The left orbit scores and counts as an aimed shot', costs: [450], grants: { 'awake.orbit': 1 }, requires: { wakeSpinner: 1 } },
  { id: 'wakeRamps', branch: 'lanes', name: 'Ramps', desc: 'Both ramps score and count as aimed shots', costs: [700], grants: { 'awake.ramp': 1 }, requires: { wakeOrbit: 1 } },
  { id: 'wakeScoop', branch: 'lanes', name: 'Tractor Beam', desc: 'The scoop under the UFO catches the ball and scores', costs: [1500], grants: { 'awake.scoop': 1 }, requires: { wakeRamps: 1 } },
  { id: 'boosters', branch: 'lanes', name: 'Rocket Boosters', desc: '+50% ramp and orbit points', costs: costs(2000, 3, 2.5), grants: { 'value.ramp': 50, 'value.orbit': 50 }, requires: { wakeRamps: 1 } },
  { id: 'logFlume', branch: 'lanes', name: 'Log Flume', desc: '×1.5 ramp and orbit points', costs: costs(TIER[2], 3, 2.8), grants: { 'x.ramp': 1.5, 'x.orbit': 1.5 }, requires: { boosters: 1 }, table: 2 },
  { id: 'currentLane', branch: 'lanes', name: 'Current Lane', desc: '×1.5 every Ramps & Lanes source', costs: costs(TIER[3], 3, 2.8), grants: { 'x.branch.lanes': 1.5 }, requires: { laneShine: 1 }, table: 3 },
  { id: 'lavaTube', branch: 'lanes', name: 'Lava Tube', desc: '×1.6 ramp, orbit and scoop points', costs: costs(TIER[4], 3, 2.8), grants: { 'x.ramp': 1.6, 'x.orbit': 1.6, 'x.scoop': 1.6 }, requires: { logFlume: 1 }, table: 4 },
  { id: 'iceChute', branch: 'lanes', name: 'Ice Chute', desc: '×2.5 spinner and lane points', costs: costs(TIER[5], 2, 3), grants: { 'x.spinnerTurn': 2.5, 'x.lane': 2.5, 'x.inlane': 2.5 }, requires: { currentLane: 1 }, table: 5 },
  { id: 'sandstorm', branch: 'lanes', name: 'Sandstorm', desc: '×1.6 every Ramps & Lanes source', costs: costs(TIER[6], 3, 2.8), grants: { 'x.branch.lanes': 1.6 }, requires: { lavaTube: 1 }, table: 6 },
  { id: 'ghostRails', branch: 'lanes', name: 'Ghost Rails', desc: '×2 ramp and orbit points', costs: costs(TIER[7], 2, 3), grants: { 'x.ramp': 2, 'x.orbit': 2 }, requires: { sandstorm: 1 }, table: 7 },
  { id: 'perdition', branch: 'lanes', name: 'Road to Perdition', desc: '×5 every Ramps & Lanes source', costs: [TIER[8]], grants: { 'x.branch.lanes': 5 }, requires: { ghostRails: 1 }, table: 8 },

  // --- Rules & Features: combo, bonus, chapters, multiball, missions, pickups
  { id: 'combo', branch: 'rules', name: 'Combo Meter', desc: 'Aimed shots in quick succession build a combo, up to ×3', costs: [250], grants: { comboMax: 2 }, requires: { secondReel: 1 } },
  { id: 'comboFuse', branch: 'rules', name: 'Longer Fuse', desc: '+0.5 s combo window', costs: costs(800, 4, 2.4), grants: { comboWindowMs: 500 }, requires: { combo: 1 } },
  { id: 'comboCap', branch: 'rules', name: 'Higher Cap', desc: '+1 to the combo cap', costs: costs(1200, 2, 2.6), grants: { comboMax: 1 }, requires: { combo: 1 } },
  { id: 'bonus', branch: 'rules', name: 'End-of-Ball Bonus', desc: 'Shots and features build a bonus paid when the ball drains', costs: [350], grants: { bonus: 1 }, requires: { secondReel: 1 } },
  { id: 'bonusX', branch: 'rules', name: 'Bonus Multiplier', desc: 'Completing R·O·W raises the bonus multiplier, up to 5×', costs: [1200], grants: { bonusXMax: 4 }, requires: { bonus: 1, wakeRow: 1 } },
  { id: 'pickups', branch: 'rules', name: 'Prop Department', desc: 'Stars appear on the table and pay when the ball rolls through', costs: [600], grants: { 'awake.pickup': 1 }, requires: { secondReel: 1 } },
  { id: 'moreProps', branch: 'rules', name: 'More Props', desc: 'Stars appear 1.5 s sooner', costs: costs(1500, 4, 2.4), grants: { pickupEveryMs: -1500 }, requires: { pickups: 1 } },
  { id: 'chapters', branch: 'rules', name: 'Chapters', desc: 'Ramps and the standup set advance the serial, and each chapter pays', costs: [2000], grants: { 'awake.chapter': 1 }, requires: { wakeRamps: 1 } },
  { id: 'missions', branch: 'rules', name: 'Mission Control', desc: 'Missions are offered at the kickout hole, and each rank earns +10% to all points', costs: [2500], grants: { 'awake.mission': 1, 'awake.promotion': 1, rankBonus: 10 }, requires: { wakeKickout: 1, wakeStandups: 1 } },
  { id: 'extraBall', branch: 'rules', name: 'Extra Ball', desc: 'Every second drop bank clear lights an extra ball at the kickout', costs: [3000], grants: { extraBall: 1 }, requires: { wakeDrops: 1, wakeKickout: 1 } },
  { id: 'multiball', branch: 'rules', name: 'Saucer Multiball', desc: 'Chapter V lights the scoop for a three-ball multiball and jackpot', costs: [5000], grants: { 'awake.saucerJackpot': 1 }, requires: { chapters: 1, wakeScoop: 1 } },
  { id: 'goldenStars', branch: 'rules', name: 'Golden Props', desc: '+4% chance a pickup is golden and worth 10×', costs: costs(TIER[2], 3, 2.8), grants: { pickupGolden: 0.04 }, requires: { moreProps: 1 }, table: 2 },
  { id: 'headStart', branch: 'rules', name: 'Bonus Head Start', desc: 'Each ball starts with the bonus multiplier 1 higher', costs: costs(TIER[2] * 1.67, 2, 3), grants: { bonusXStart: 1 }, requires: { bonusX: 1 }, table: 2 },
  { id: 'pearlDiver', branch: 'rules', name: 'Pearl Diver', desc: 'Pickups pull in from 12 px further away', costs: costs(TIER[3], 3, 2.8), grants: { pickupMagnet: 12 }, requires: { goldenStars: 1 }, table: 3 },
  { id: 'brassButtons', branch: 'rules', name: 'Brass Buttons', desc: '+10% to all points per rank', costs: costs(TIER[3] * 1.25, 3, 2.8), grants: { rankBonus: 10 }, requires: { missions: 1 }, table: 3 },
  { id: 'hotStreak', branch: 'rules', name: 'Hot Streak', desc: 'The combo never drops below ×2', costs: [TIER[4] * 1.2], grants: { comboFloor: 1 }, requires: { comboCap: 2 }, table: 4 },
  { id: 'eruption', branch: 'rules', name: 'Eruption Jackpot', desc: '×1.7 chapter and jackpot points', costs: costs(TIER[4], 3, 2.8), grants: { 'x.chapter': 1.7, 'x.saucerJackpot': 1.7 }, requires: { multiball: 1 }, table: 4 },
  { id: 'deepFreeze', branch: 'rules', name: 'Deep Freeze Combo', desc: '+1 to the combo cap', costs: costs(TIER[5], 3, 2.8), grants: { comboMax: 1 }, requires: { hotStreak: 1 }, table: 5 },
  { id: 'mummy', branch: 'rules', name: "Mummy's Curse", desc: '×2.5 mission and promotion points', costs: costs(TIER[6], 2, 3), grants: { 'x.mission': 2.5, 'x.promotion': 2.5 }, requires: { brassButtons: 1 }, table: 6 },
  { id: 'seance', branch: 'rules', name: 'Séance', desc: '×2.5 pickup points', costs: costs(TIER[7], 2, 3), grants: { 'x.pickup': 2.5 }, requires: { pearlDiver: 1 }, table: 7 },
  { id: 'devilsDeal', branch: 'rules', name: 'Deal with the Devil', desc: '+3 to the combo cap', costs: [TIER[8] * 1.25], grants: { comboMax: 3 }, requires: { deepFreeze: 1 }, table: 8 },

  // --- Ball Control
  { id: 'flipStrength', branch: 'ball', name: 'Stronger Flippers', desc: 'Flippers swing 10% faster', costs: costs(50, 3, 3), grants: { flipStrength: 0.1 }, requires: { secondReel: 1 } },
  { id: 'ballSaver', branch: 'ball', name: 'Ball Saver', desc: 'Shoot Again after launch: 6 s, then +4 s per level', costs: costs(150, 3, 3), grants: { ballSaveMs: [6000, 10000, 14000] }, requires: { secondReel: 1 } },
  { id: 'thirdReel', branch: 'ball', name: 'Third Reel', desc: '+1 ball per turn', costs: [800], grants: { balls: 1 }, requires: { ballSaver: 1 } },
  { id: 'springy', branch: 'ball', name: 'Springy Rubbers', desc: 'Resting flippers bounce the ball back harder', costs: costs(400, 2, 3), grants: { springy: 0.2 }, requires: { flipStrength: 1 } },
  { id: 'luckyDrain', branch: 'ball', name: 'Saved by the Bell', desc: '+10% chance a drained ball comes back', costs: costs(2500, 2, 3), grants: { drainSave: 0.1 }, requires: { thirdReel: 1 } },
  { id: 'perfectFlip', branch: 'ball', name: 'Perfect Flip', desc: 'Flip as the ball lands for a 25% faster shot', costs: [4000], grants: { perfectFlip: 1 }, requires: { springy: 1 } },
  { id: 'fourthReel', branch: 'ball', name: 'Fourth Reel', desc: '+1 ball per turn', costs: [TIER[2] * 2], grants: { balls: 1 }, requires: { thirdReel: 1 }, table: 2 },
  { id: 'lifeRaft', branch: 'ball', name: 'Life Raft', desc: '+10% drain save chance', costs: costs(TIER[3] * 1.25, 2, 3), grants: { drainSave: 0.1 }, requires: { luckyDrain: 1 }, table: 3 },
  { id: 'guardian', branch: 'ball', name: 'Guardian Angel', desc: 'Once per turn, a drained ball always comes back', costs: [TIER[4] * 1.6], grants: { guardian: 1 }, requires: { lifeRaft: 1 }, table: 4 },
  { id: 'fifthReel', branch: 'ball', name: 'Fifth Reel', desc: '+1 ball per turn', costs: [TIER[5] * 1.33], grants: { balls: 1 }, requires: { fourthReel: 1 }, table: 5 },
  { id: 'sandTimer', branch: 'ball', name: 'Sand Timer', desc: '+10 s ball saver', costs: costs(TIER[6] * 1.12, 2, 3), grants: { ballSaveMs: 10000 }, requires: { ballSaver: 3 }, table: 6 },
  { id: 'ghostlySave', branch: 'ball', name: 'Ghostly Save', desc: '+10% drain save chance', costs: costs(TIER[7] * 1.11, 2, 3), grants: { drainSave: 0.1 }, requires: { guardian: 1 }, table: 7 },
  { id: 'sixthReel', branch: 'ball', name: 'Sixth Reel', desc: '+1 ball per turn', costs: [TIER[8] * 1.25], grants: { balls: 1 }, requires: { fifthReel: 1 }, table: 8 },

  // --- Charge & Skills
  { id: 'inkSurge', branch: 'skills', name: 'Ink Surge', desc: 'Unlocks skill 1: double all scoring for 8 s', costs: [1000], grants: { inkSurge: 1 }, requires: { combo: 1 } },
  { id: 'chargeRate', branch: 'skills', name: 'Fast Charge', desc: 'Charge meter fills 25% faster', costs: costs(1500, 3, 2.5), grants: { chargeRate: 0.25 }, requires: { inkSurge: 1 } },
  { id: 'slowReels', branch: 'skills', name: 'Slow Reels', desc: 'Unlocks skill 2: slow motion for 5 s', costs: [3000], grants: { slowReels: 1 }, requires: { inkSurge: 1 } },
  { id: 'skillDiscount', branch: 'skills', name: 'Cheap Tricks', desc: 'Skills cost 15% less charge', costs: costs(4000, 2, 3), grants: { skillCost: -0.15 }, requires: { inkSurge: 1 } },
  { id: 'bounceHouse', branch: 'skills', name: 'Bounce House', desc: 'Unlocks skill 3: two extra balls for a quick multiball', costs: [9000], grants: { bounceHouse: 1 }, requires: { slowReels: 1 } },
  { id: 'magnetMitt', branch: 'skills', name: 'Magnet Mitt', desc: 'Unlocks skill 4: pull the ball toward the best target for 3 s', costs: [TIER[2] * 1.33], grants: { magnetMitt: 1 }, requires: { bounceHouse: 1 }, table: 2 },
  { id: 'sapRising', branch: 'skills', name: 'Sap Rising', desc: 'Charge meter fills 25% faster', costs: costs(TIER[2] * 1.67, 3, 2.8), grants: { chargeRate: 0.25 }, requires: { chargeRate: 1 }, table: 2 },
  { id: 'doubleCharge', branch: 'skills', name: 'Double Charge', desc: 'The charge meter holds two full charges', costs: [TIER[3] * 1.75], grants: { chargeMax: 100 }, requires: { sapRising: 1 }, table: 3 },
  { id: 'fifthSlot', branch: 'skills', name: 'Fifth Slot', desc: 'A fifth skill slot in the loadout, on key 5', costs: [TIER[3] * 2], grants: { skillSlots: 1 }, requires: { doubleCharge: 1 }, table: 3 },
  { id: 'moltenSurge', branch: 'skills', name: 'Molten Surge', desc: 'Ink Surge triples scoring instead of doubling it', costs: [TIER[4] * 1.6], grants: { surgeX: 1 }, requires: { doubleCharge: 1 }, table: 4 },
  { id: 'cheaperTricks', branch: 'skills', name: 'Cheaper Tricks', desc: 'Skills cost 10% less charge', costs: costs(TIER[5] * 1.33, 2, 3), grants: { skillCost: -0.1 }, requires: { skillDiscount: 2 }, table: 5 },
  { id: 'longTakes', branch: 'skills', name: 'Long Takes', desc: 'Timed skills last 50% longer', costs: [TIER[6] * 1.12], grants: { skillTime: 0.5 }, requires: { moltenSurge: 1 }, table: 6 },
  { id: 'sixthSlot', branch: 'skills', name: 'Sixth Slot', desc: 'A sixth skill slot in the loadout, on key 6', costs: [TIER[6] * 2], grants: { skillSlots: 1 }, requires: { fifthSlot: 1 }, table: 6 },
  { id: 'tripleCharge', branch: 'skills', name: 'Triple Charge', desc: 'The charge meter holds a third charge', costs: [TIER[7] * 1.11], grants: { chargeMax: 100 }, requires: { longTakes: 1 }, table: 7 },
  { id: 'hellfireSurge', branch: 'skills', name: 'Hellfire Surge', desc: 'Ink Surge multiplies scoring by 2 more', costs: [TIER[8] * 1.25], grants: { surgeX: 2 }, requires: { tripleCharge: 1 }, table: 8 },
];

const UPGRADES_SAVE_KEY = 'tilt-and-ink.upgrades.v2';

class Upgrades {
  constructor(scoring) {
    this.scoring = scoring; // holds the Tickets balance
    this.levels = {};
    this.listeners = [];
    this.load();
    this.recompute();
  }

  def(id) {
    return NODES.find((u) => u.id === id);
  }

  level(id) {
    return this.levels[id] || 0;
  }

  // Current value of a stat: its base plus every bought node's grant.
  stat(name) {
    return this.stats[name] ?? STAT_BASE[name] ?? (name.startsWith('x.') ? 1 : 0);
  }

  recompute() {
    const stats = { ...STAT_BASE };
    for (const u of NODES) {
      const lvl = this.level(u.id);
      if (!lvl || !u.grants) continue;
      for (const [name, g] of Object.entries(u.grants)) {
        if (name.startsWith('x.')) stats[name] = (stats[name] ?? 1) * g ** lvl;
        else stats[name] = (stats[name] ?? 0) + (Array.isArray(g) ? g[lvl - 1] : g * lvl);
      }
    }
    this.stats = stats;
  }

  // The highest table pass owned (1 = Rocket Row only).
  tablesReached() {
    return NODES.reduce((n, u) => (u.pass && this.level(u.id) ? Math.max(n, u.pass) : n), 1);
  }

  spentIn(branch) {
    return NODES.filter((u) => u.branch === branch)
      .reduce((sum, u) => sum + u.costs.slice(0, this.level(u.id)).reduce((a, b) => a + b, 0), 0);
  }

  // { state: 'maxed' | 'locked' | 'available', cost, reasons[] }
  status(id) {
    const u = this.def(id);
    const lvl = this.level(id);
    if (lvl >= u.costs.length) return { state: 'maxed', cost: 0, reasons: [] };
    const reasons = [];
    const table = u.table || 1;
    if (table > this.tablesReached()) reasons.push(`Needs the ${TABLES[table - 1].name} pass`);
    for (const [req, need] of Object.entries(u.requires || {})) {
      if (this.level(req) < need) reasons.push(`Needs ${this.def(req).name}${need > 1 ? ` level ${need}` : ''}`);
    }
    if (u.lifetime && this.scoring.lifetimeTickets < u.lifetime) {
      reasons.push(`Earn ${formatPoints(u.lifetime)} lifetime Tickets (${formatPoints(this.scoring.lifetimeTickets)} so far)`);
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
    this.recompute();
    this.save();
    for (const fn of this.listeners) fn(id);
    return true;
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  totalCost() {
    return NODES.reduce((sum, u) => sum + u.costs.reduce((a, b) => a + b, 0), 0);
  }

  // Wipes all purchases (the Tickets they cost are not refunded).
  reset() {
    this.levels = {};
    this.recompute();
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
