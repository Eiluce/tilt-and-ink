const { Engine, Render, World, Body, Bodies, Events } = Matter;

const L = LAYOUT;
const S = Art.SPRITES;

// --- engine & renderer -----------------------------------------------------

const engine = Engine.create();
const world = engine.world;

// Ball fall speed is a difficulty knob, not just a physics constant — later
// tables (per GAME_DESIGN.md's world progression) can use a higher value for
// a faster, harder-to-read ball. Table 1 keeps a gentle, readable baseline.
world.gravity.y = L.gravity;

// Flippers are rigid (stiffness: 1) pin constraints driven by directly
// setting angular velocity every tick; Matter's default constraintIterations
// (2) doesn't converge fast enough against that kind of external drive, so
// the pivot visibly slips. Raise it well above default. The extra position
// and velocity passes keep a fast ball from sinking into the thin guides.
engine.constraintIterations = 20;
engine.positionIterations = 10;
engine.velocityIterations = 8;

// Three stacked layers: the printed playfield (inline SVG, so its lettering
// can use the page fonts), the lamp canvas, then Matter's canvas on top.
document.getElementById('playfield-art').innerHTML = Art.playfieldSVG();
const lampLayer = new Lamps(document.getElementById('lamps'));
const fx = new Effects(document.getElementById('fx'), document.getElementById('table-wrap'));

const canvas = document.getElementById('table');
const render = Render.create({
  canvas,
  engine,
  options: {
    width: L.width,
    height: L.height,
    wireframes: false,
    background: 'transparent',
    pixelRatio: RENDER_SCALE,
  },
});
Render.run(render);

// Fixed-step physics clock: always 60 ticks of 1/60 s per real second,
// whatever the screen's refresh rate. (Matter's Runner steps once per frame,
// so on a 120-144 Hz monitor the whole table ran 2-2.4x too fast, and a
// single slow frame could sap a plunger launch.)
//
// Collision handlers run inside a sub-step, where `ball.velocity` is only
// that sub-step's share: they read speeds through velocityOf() (physics.js).
//
// Each tick runs the game logic once (tickGame), then the physics in
// SUBSTEPS smaller steps. A swinging flipper's tip moves up to ~35 px per
// tick, more than the flipper and ball can overlap, so in one big step it
// could skip right past a ball: a sweep of 2,448 shots at every flipper,
// angle and speed found 328 tunnelling with 1 step and none with 4. Matter
// keeps velocities in per-1/60 s units whatever the step size, so
// sub-stepping doesn't change any speeds.
const STEP_MS = 1000 / 60;
const SUBSTEPS = 4;
function physicsTick() {
  tickGame();
  for (let i = 0; i < SUBSTEPS; i++) Engine.update(engine, STEP_MS / SUBSTEPS);
}
const SLOW_REELS_RATE = 0.45; // game speed while the Slow Reels skill runs
let lastFrame = performance.now();
let pendingMs = 0;
let paused = false; // while the Upgrade Tree is open
function stepPhysics(now) {
  const rate = paused ? 0 : skills.isActive('slowReels', now) ? SLOW_REELS_RATE : 1;
  pendingMs = Math.min(pendingMs + (now - lastFrame) * rate, 100);
  lastFrame = now;
  while (pendingMs >= STEP_MS) {
    physicsTick();
    pendingMs -= STEP_MS;
  }
  requestAnimationFrame(stepPhysics);
}
requestAnimationFrame(stepPhysics);

// --- walls -------------------------------------------------------------------
//
// All invisible: the art is printed on the playfield layer. Wall centrelines
// are placed so their inner faces line up with the drawn ink lines.

const { cx: ARCH_X, cy: ARCH_Y } = L.arch;

const walls = [
  // Outer wall: thick and pushed outward (inner face at r 188 / x 12 / x 388)
  // so a fast ball can't tunnel through it.
  ...Walls.chain([[0, 720], ...Walls.arc(L.outerR + 8, 180, 360), [400, 720]], 24),
  // Left orbit guide and shooter-lane wall.
  ...Walls.chain([[L.orbitGuide.x, L.orbitGuide.bottom], ...Walls.arc(L.orbitGuide.r, 180, 360 + L.orbitGuide.endDeg)], 8),
  ...Walls.chain([[L.shooterWall.x, 720], ...Walls.arc(L.guideR, 0, L.shooterWall.endDeg)], 6),
  ...Walls.chain(L.sideSlopes.left, 6),
  ...Walls.chain(L.sideSlopes.right, 6),
  ...Walls.chain(L.inlaneGuides.left, 5),
  ...Walls.chain(L.inlaneGuides.right, 5),
  ...L.laneGuides.xs.flatMap((x) => Walls.chain([[x, L.laneGuides.top], [x, L.laneGuides.bottom]], L.laneGuides.width)),
  ...Walls.chain(L.gate, 4, { category: CAT.GATE, mask: CAT.BALL }),
];
World.add(world, walls);

// The plunger's top face: the served ball rests on it, and it drops as the
// plunger is pulled back.
const plungerStop = Bodies.rectangle(L.shooter.x, L.shooter.stopY + 5, 22, 10, {
  isStatic: true,
  label: 'plunger',
  render: { visible: false },
});
World.add(world, plungerStop);

// --- game state ------------------------------------------------------------

// Both set by the Ball Control branch of the Upgrade Tree.
const ballsPerTurn = () => upgrades.stat('balls');
const ballSaveMs = () => upgrades.stat('ballSaveMs');
const stat = (name) => upgrades.stat(name);
const awake = (source) => scoring.isAwake(source);
const RAMP_CHAIN_MS = 4000; // left-then-right ramp window, for the Ramp Relay mission
// Extra ball: lit by the Nth drop bank clear of the turn, and only this many
// per turn, so a turn always ends.
const EXTRA_BALL_AT_CLEAR = 3;
const EXTRA_BALLS_PER_TURN = 1;
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

const game = {
  turnActive: false,
  ballNumber: 0,
  extraBalls: 0,
  row: [false, false, false],
  chapters: 0,
  extraBallLit: false,
  bankClears: 0,
  saveArmed: false,
  ballSaveUntil: 0,
  rampChain: { ramp: null, until: 0 },
  orbitFlashUntil: 0,
  rolloverFlash: {},
};

const plunger = { charging: false, releasing: false, pull: 0 };
const balls = [];

// --- HUD -------------------------------------------------------------------

const scoring = new Scoring();
const upgrades = new Upgrades(scoring);
scoring.upgrades = upgrades;
scoring.newTurn();
const skills = new Skills(upgrades);
// The saved table pick must be a table reached (not after a progress reset).
if (TABLE.n > upgrades.tablesReached()) {
  pickTable(1);
  location.reload();
}

const scoreEl = document.getElementById('score');
const ballInfoEl = document.getElementById('ball-info');
const startPromptEl = document.getElementById('start-prompt');
// The Upgrade Tree (and its Tables tab) only opens between turns.
const treeButtons = ['open-upgrades', 'open-tables'].map((id) => document.getElementById(id));
const messageEl = document.getElementById('message');
let messageTimer;

// Scores one hit of a SOURCES entry (scoring.js) through the upgrade
// multipliers, combo and bonus. Options: `mult` (e.g. a chapter's number),
// `at` ({x, y}) to float the points up from that spot on the table. The
// charge meter fills by the source's kind. Returns the points scored: 0 when
// the source is still dormant, so callers can skip their effects.
function addScore(source, label, { at, mult = 1, echo = true } = {}) {
  if (!game.turnActive) return 0;
  const total = scoring.award(source, { mult });
  if (!total) return 0;
  const src = SOURCES[source];
  skills.gain(src.charge || (src.shot ? 'shot' : null));
  if (at) fx.popup(at.x, at.y, `+${formatPoints(total)}`);
  if (src.shot && scoring.combo > 1 && at) fx.burst(at.x + 22, at.y - 26, `×${scoring.combo}`, INK.red);
  // Echo Chamber: some hits score a second time.
  if (echo && !src.flat && Math.random() < stat('echo')) {
    const again = addScore(source, `${label} echo`, { mult, echo: false });
    if (at) fx.burst(at.x - 18, at.y - 20, 'ECHO!', INK.teal);
    return total + again;
  }
  return total;
}

const missions = new MissionControl({ addScore, fx, announce, isAwake: (source) => scoring.isAwake(source) });

const TEXT = TABLE.text; // this table's wording (tableDefs/)
document.getElementById('table-name').textContent = TABLE.name;
document.title = `${TABLE.name} — Tilt & Ink`;
document.documentElement.style.setProperty('--ground', INK.ground);
const BUMPER_WORDS = TEXT.bumperWords;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Point halfway between the ball and what it hit, for placing hit effects.
function contactPoint(ball, body) {
  return {
    x: (ball.position.x + body.position.x) / 2,
    y: (ball.position.y + body.position.y) / 2,
  };
}

function announce(text, ms = 2200) {
  messageEl.textContent = text;
  clearTimeout(messageTimer);
  if (ms) {
    messageTimer = setTimeout(() => {
      messageEl.textContent = '';
    }, ms);
  }
}

// Mission panel in the HUD; only touches the DOM when something changed.
const missionEls = Object.fromEntries(
  ['rank', 'rank-next', 'mission-label', 'mission-name', 'mission-goal', 'mission-count', 'mission-bar', 'mission-status', 'mission']
    .map((id) => [id, document.getElementById(id)]),
);
// The mission block only shows during a turn once missions are unlocked;
// rank lives in the "?" panel.
let lastMissionView = '';
function updateMissionPanel(now) {
  const on = awake('mission');
  const v = on ? { ...missions.view(now), show: game.turnActive } : { rank: '—', toNext: 'Buy Mission Control to start earning ranks', show: false };
  const key = JSON.stringify(v);
  if (key === lastMissionView) return;
  lastMissionView = key;
  missionEls.mission.hidden = !v.show;
  if (!on) {
    missionEls.rank.textContent = v.rank;
    missionEls['rank-next'].textContent = v.toNext;
    return;
  }
  missionEls.rank.textContent = v.rank;
  missionEls['rank-next'].textContent = v.toNext;
  missionEls['mission-label'].textContent = v.label === 'Mission active' ? 'Mission' : 'Offered';
  missionEls['mission-name'].textContent = v.name;
  missionEls['mission-goal'].textContent = v.goal;
  missionEls['mission-count'].textContent = v.count;
  missionEls['mission-bar'].style.width = `${Math.round(v.progress * 100)}%`;
  missionEls['mission-status'].textContent = v.status;
  missionEls.mission.classList.toggle('urgent', v.urgent);
}

// Score, combo meter, bonus and Tickets; only touches the DOM on change.
const scoreEls = Object.fromEntries(
  ['combo', 'combo-meter', 'combo-bar', 'bonus-line', 'bonus', 'bonus-x', 'best-turn'].map((id) => [id, document.getElementById(id)]),
);
let lastScoreView = '';
function updateScorePanel(now) {
  const v = {
    score: scoring.score,
    combo: scoring.combo,
    comboOn: stat('comboMax') > 1,
    left: Math.round(scoring.comboTimeLeft(now) * 40),
    bonusOn: stat('bonus') > 0,
    bonus: scoring.bonus,
    bonusX: scoring.bonusX,
    tickets: scoring.tickets,
    best: scoring.bestTurn,
  };
  const key = JSON.stringify(v);
  if (key === lastScoreView) return;
  lastScoreView = key;
  scoreEl.textContent = formatPoints(v.score);
  scoreEls.combo.hidden = !v.comboOn;
  scoreEls.combo.textContent = `Combo ×${v.combo}`;
  scoreEls.combo.classList.toggle('hot', v.combo > 1);
  scoreEls['combo-meter'].hidden = !v.comboOn;
  scoreEls['combo-bar'].style.width = `${(v.left / 40) * 100}%`;
  scoreEls['bonus-line'].hidden = !v.bonusOn;
  scoreEls.bonus.textContent = formatPoints(v.bonus);
  scoreEls['bonus-x'].textContent = `${v.bonusX}×`;
  scoreEls['best-turn'].textContent = formatPoints(v.best);
}

function updateHud() {
  startPromptEl.hidden = game.turnActive;
  for (const btn of treeButtons) {
    btn.disabled = game.turnActive;
    btn.title = game.turnActive ? 'Opens between turns' : '';
  }
  if (!game.turnActive) {
    ballInfoEl.textContent = 'Press Space to start a turn';
    return;
  }
  const total = ballsPerTurn() + game.extraBalls;
  ballInfoEl.textContent = `Ball ${game.ballNumber} of ${total}`;
}

// --- collision dispatch ------------------------------------------------------

// bodyId -> { fn(ball, body), modes }. Only fires for a ball in one of
// `modes`, so e.g. a ball riding a ramp doesn't trigger the lanes under it.
const handlers = new Map();
function on(body, fn, modes = ['playfield']) {
  handlers.set(body.id, { fn, modes });
}

Events.on(engine, 'collisionStart', (event) => {
  for (const { bodyA, bodyB } of event.pairs) {
    let ball;
    let other;
    if (bodyA.label === 'ball') {
      ball = bodyA;
      other = bodyB;
    } else if (bodyB.label === 'ball') {
      ball = bodyB;
      other = bodyA;
    } else {
      continue;
    }
    const h = handlers.get(other.id) || handlers.get(other.parent.id);
    if (h && h.modes.includes(ball.plugin.mode)) h.fn(ball, other);
  }
});

// --- scoring elements ----------------------------------------------------------

const pops = L.pops.map(([x, y]) => {
  const pop = new Bumper(world, {
    x,
    y,
    radius: L.popR,
    label: 'pop bumper',
    texture: S.pop,
  });
  on(pop.body, (ball) => {
    pop.hit(ball);
    missions.event('pop');
    const c = contactPoint(ball, pop.body);
    fx.ring(x, y, INK.red, L.popR, L.popR + 16);
    // Super Pulse: some hits are SUPER hits, worth superX and kicking harder.
    if (Math.random() < stat('superChance')) {
      addScore('pop', 'SUPER pop', { at: { x, y: y - 24 }, mult: stat('superX') });
      fx.burst(c.x, c.y - 6, 'SUPER!', INK.red);
      const v = velocityOf(ball);
      Body.setVelocity(ball, { x: v.x * 1.3, y: v.y * 1.3 });
    } else {
      addScore('pop', 'pop bumper', { at: { x, y: y - 24 } });
      tableRules.pop?.(x, y);
      fx.burst(c.x, c.y - 6, pick(BUMPER_WORDS));
    }
    // Chain Reaction: sometimes another pop fires as well.
    if (Math.random() < stat('chain')) chainPop(pop);
  });
  return pop;
});

function chainPop(from) {
  const other = pick(pops.filter((p) => p !== from));
  const { x, y } = other.body.position;
  other.pulse = 1;
  addScore('pop', 'chain reaction', { at: { x, y: y - 24 } });
  missions.event('pop');
  fx.ring(x, y, INK.mustard, L.popR, L.popR + 20);
  fx.burst(x, y - 26, 'CHAIN!', INK.mustard);
}

const ufo = new Bumper(world, {
  x: L.centerpiece.x,
  y: L.centerpiece.y,
  radius: L.centerpiece.r,
  kickSpeed: 5,
  label: TEXT.centerpiece,
  texture: S.centerpiece,
});
on(ufo.body, (ball) => {
  ufo.hit(ball);
  if (!addScore('ufo', TEXT.centerpiece, { at: { x: L.centerpiece.x, y: L.centerpiece.y - 30 } })) return;
  missions.event('ufo');
  fx.ring(L.centerpiece.x, L.centerpiece.y, INK.teal, L.centerpiece.r, L.centerpiece.r + 24);
  fx.burst(ball.position.x, ball.position.y - 10, TEXT.centerpieceHit, INK.teal);
  fx.shake(160, 2.5);
  tableRules.centerpiece?.(); // e.g. opening the Kraken's eye
});

const spinner = new Spinner(world, {
  x: L.spinner.x,
  y: L.spinner.y,
  length: L.spinner.len,
  height: L.spinner.h,
  pointsPerRotation: 1,
  texture: S.spinner,
  onScore: (turns) => {
    if (!addScore('spinnerTurn', 'spinner', { mult: turns, at: { x: L.spinner.x + 16, y: L.spinner.y } })) return;
    missions.event('spinner', turns);
    tableRules.spinner?.(turns);
  },
});
// The ball never touches the spinner bar (see spinner.js): this sensor
// across the lane spins it as a ball passes through.
const spinnerSensor = makeSensor(L.spinner.x, L.spinner.y, 6, 'spinner');
World.add(world, spinnerSensor);
on(spinnerSensor, (ball) => {
  if (awake('spinnerTurn')) spinner.kick(ball);
});


const drops = new DropTargetBank(world, {
  x: L.drops.x,
  y: L.drops.y,
  count: L.drops.count,
  spacing: L.drops.spacing,
  width: L.drops.w,
  height: L.drops.h,
  texture: S.drop,
  onScore: (points, label) => {
    const at = { x: L.drops.x, y: L.drops.y - 8 };
    if (label === 'bank cleared') addScore('dropBank', label, { at });
    else addScore('dropTarget', label, { at });
  },
  onCleared: () => {
    missions.event('dropBank');
    tableRules.dropBank?.(); // e.g. the Kraken's feast
    game.bankClears += 1;
    if (stat('extraBall') && game.bankClears === EXTRA_BALL_AT_CLEAR && game.extraBalls < EXTRA_BALLS_PER_TURN && !game.extraBallLit) {
      game.extraBallLit = true;
      announce('Extra ball lit at the kickout');
    }
  },
});
for (const t of drops.targets) {
  on(t.body, (ball, body) => {
    // Dormant drop targets don't collide at all (applyDormancy); belt and braces.
    if (t.dropped || !awake('dropTarget')) return;
    drops.hit(body);
    fx.burst(body.position.x, body.position.y - 12, 'WHAM!', INK.paper);
    fx.sparks(body.position.x, body.position.y);
  });
}

const standups = new StandupBank(world, {
  positions: L.standups.xs.flatMap((x) => L.standups.ys.map((y) => [x, y])),
  width: L.standups.w,
  height: L.standups.h,
  textures: S.standup,
  onComplete: () => {
    addScore('standupsComplete', 'standups complete');
    advanceChapter();
  },
});
for (const t of standups.targets) {
  on(t.body, (ball, body) => {
    if (!awake('standup')) return;
    addScore('standup', 'standup', { at: { x: body.position.x < 200 ? 70 : 330, y: body.position.y } });
    standups.hit(body);
    if (awake('mission')) missions.cycle();
    fx.sparks(body.position.x, body.position.y, INK.mustard);
  });
}

const slings = [
  new Slingshot(world, { vertices: L.slings.left, textures: S.slingLeft }),
  new Slingshot(world, { vertices: L.slings.right, textures: S.slingRight }),
];
for (const sling of slings) {
  on(sling.body, (ball) => {
    if (!sling.hit(ball)) return;
    addScore('sling', 'slingshot', { at: ball.position });
    fx.sparks(ball.position.x, ball.position.y, INK.red);
  });
}

// Ramps advance the serial's chapter. The opposite ramp's arrow blinks for
// a few seconds after each one: hitting it is a "ramp relay" for missions.
function rampMade(name) {
  const now = performance.now();
  const relay = game.rampChain.ramp && game.rampChain.ramp !== name && now < game.rampChain.until;
  const end = L.ramps[name][L.ramps[name].length - 1];
  if (!addScore('ramp', 'ramp', { at: { x: end[0], y: end[1] + 20 } })) return;
  fx.burst(end[0], end[1] + 4, TEXT.rampHit, INK.mustard);
  game.rampChain = { ramp: name, until: now + RAMP_CHAIN_MS };
  missions.event('ramp');
  if (relay) missions.event('rampCombo');
  advanceChapter();
}

function advanceChapter() {
  if (game.chapters >= 5 || !awake('chapter')) return;
  game.chapters += 1;
  addScore('chapter', `Chapter ${ROMAN[game.chapters - 1]}`, { mult: game.chapters });
  const multiballLit = game.chapters === 5 && awake('saucerJackpot') && awake('scoop');
  announce(multiballLit ? TEXT.multiballLit : `Chapter ${ROMAN[game.chapters - 1]}`);
  fx.title(`Chapter ${ROMAN[game.chapters - 1]}`, multiballLit ? TEXT.multiballCallout : TEXT.chapters[game.chapters - 1]);
}

const ramps = ['left', 'right'].map((name) => {
  const ramp = new Ramp(world, { name, path: L.ramps[name], halfWidth: L.rampHalfWidth, onMade: rampMade });
  // A dormant ramp doesn't take the ball: it rolls on underneath.
  on(ramp.mouth, (ball) => {
    if (awake('ramp')) ramp.atMouth(ball);
  });
  return ramp;
});

// The tractor-beam scoop under the UFO. At Chapter V it starts saucer
// multiball: two more balls are fed out of the scoop.
const scoop = new Hole(world, {
  name: 'scoop',
  x: L.scoop.x,
  y: L.scoop.y,
  holdMs: 1000,
  eject: () => ({ x: (Math.random() - 0.5) * 2, y: 4.5 }),
  onCapture: () => {
    missions.event('scoop');
    if (game.chapters < 5 || !awake('saucerJackpot')) {
      addScore('scoop', TEXT.scoop, { at: L.scoop });
      fx.ring(L.scoop.x, L.scoop.y, INK.teal, 6, 28);
      tableRules.scoop?.(); // the table's own mode may start here
      return;
    }
    game.chapters = 0;
    const jackpot = addScore('saucerJackpot', TEXT.jackpot, { at: L.scoop });
    announce(TEXT.multiball, 3000);
    fx.title(TEXT.multiball, `Jackpot ${formatPoints(jackpot)}`, 2000);
    fx.shake(450, 6);
    game.ballSaveUntil = performance.now() + Math.max(ballSaveMs(), 8000);
    feedBallsFromScoop(2);
  },
});
// Dormant holes don't catch the ball: it rolls straight over them.
on(scoop.sensor, (ball) => {
  if (awake('scoop')) scoop.capture(ball);
});

const kickout = new Hole(world, {
  name: 'kickout',
  x: L.kickout.x,
  y: L.kickout.y,
  holdMs: 700,
  eject: () => ({ x: L.kickout.eject[0], y: L.kickout.eject[1] }),
  onCapture: () => {
    addScore('kickout', 'kickout', { at: L.kickout });
    fx.ring(L.kickout.x, L.kickout.y, INK.mustard, 8, 26);
    if (awake('mission')) missions.accept();
    if (game.extraBallLit) {
      game.extraBallLit = false;
      game.extraBalls += 1;
      announce('Extra ball!');
      fx.title('Extra Ball!', TEXT.extraBall);
      updateHud();
    }
  },
});
on(kickout.sensor, (ball) => {
  if (awake('kickout')) kickout.capture(ball);
});

// R·O·W rollover lanes: light all three to raise the end-of-ball bonus
// multiplier.
L.rolloverLanes.xs.forEach((x, i) => {
  const sensor = makeSensor(x, L.rolloverLanes.y, 6, 'lane');
  World.add(world, sensor);
  on(sensor, () => {
    if (!addScore('lane', 'lane', { at: { x, y: L.rolloverLanes.y + 20 } })) return;
    missions.event('lane');
    if (game.row[i]) return;
    game.row[i] = true;
    if (game.row.every(Boolean)) {
      addScore('rowComplete', 'R·O·W complete', { at: { x: 200, y: 120 } });
      if (stat('bonusXMax') > 1) {
        const bonusX = scoring.raiseBonusX();
        announce(`Bonus ${bonusX}×`);
        fx.title(`Bonus ${bonusX}×`, 'R · O · W complete · end-of-ball bonus', 1200);
      } else {
        fx.title('R · O · W', 'All three lanes lit', 1000);
      }
      updateHud();
      setTimeout(() => {
        game.row = [false, false, false];
      }, 500);
    }
  });
});

const orbitSensor = makeSensor(L.orbitSensor.x, L.orbitSensor.y, 8, 'orbit');
World.add(world, orbitSensor);
on(orbitSensor, (ball) => {
  if (velocityOf(ball).y >= 0) return; // only counts on the way up
  if (!addScore('orbit', 'orbit', { at: ball.position })) return;
  missions.event('orbit');
  fx.burst(ball.position.x + 14, ball.position.y, 'WHOOSH!', INK.paper);
  game.orbitFlashUntil = performance.now() + 1500;
});

for (const key of ['inL', 'inR']) {
  const sensor = makeSensor(L.rollovers[key], L.rollovers.y, 7, 'inlane');
  World.add(world, sensor);
  on(sensor, (ball) => {
    tableRules.inlane?.(ball); // e.g. Timber Hollow's moss
    if (!addScore('inlane', 'inlane', { at: { x: L.rollovers[key], y: L.rollovers.y } })) return;
    game.rolloverFlash[key] = performance.now() + 1000;
  });
}

// Pickups (Prop Department): stars that pay when the ball rolls through.
const pickups = new Pickups({
  onCollect: (t) => {
    const golden = t.golden;
    addScore('pickup', golden ? 'golden star' : 'star', { at: t, mult: golden ? 10 : 1 });
    fx.sparks(t.x, t.y, golden ? INK.mustard : INK.print);
    if (golden) fx.burst(t.x, t.y - 16, 'GOLD!', INK.mustard);
  },
});

// The table's own rules (TABLE.rules in tableDefs/), if it has any. It gets
// a small API and main.js calls its hooks: newTurn, spinner, inlane, pop,
// centerpiece, dropBank, scoop, tick, lamps, scoopLit.
const tableRules = TABLE.rules ? TABLE.rules({
  addScore,
  fx,
  announce,
  awake,
  game,
  INK,
  Body,
  velocityOf,
  balls,
  // How long a cleared drop bank waits before standing back up.
  setDropResetMs: (ms) => {
    drops.resetDelayMs = ms;
  },
  spawnPickup: () => {
    if (awake('pickup')) pickups.spawn(performance.now());
  },
}) : {};

// --- flippers ------------------------------------------------------------------

function makeFlipper(cfg, side, texture) {
  return new Flipper(world, {
    side,
    pivotX: cfg.x,
    pivotY: cfg.y,
    length: cfg.len,
    pivotR: cfg.pivotR,
    tipR: cfg.tipR,
    restAngle: deg(cfg.rest),
    activeAngle: deg(cfg.active),
    texture,
  });
}
const leftFlipper = makeFlipper(L.flippers.left, 'left', S.flipper);
const rightFlipper = makeFlipper(L.flippers.right, 'right', S.flipper);
// Some tables have a small upper flipper on the right button too.
const miniFlipper = L.flippers.mini ? makeFlipper(L.flippers.mini, 'mini', S.miniFlipper) : null;
const flippers = [leftFlipper, rightFlipper, miniFlipper].filter(Boolean);

// Perfect Flip capstone: flipping just as the ball lands on a flipper sends
// it 25% faster (briefly allowed past the usual speed cap).
// Inked Flippers: flipper hits score, at most once per 250 ms per flipper.
for (const f of flippers) {
  on(f.body, (ball) => {
    const now = performance.now();
    const fresh = now - (f.lastBallContact || -Infinity) > 250;
    f.lastBallContact = now;
    if (fresh) addScore('flipper', 'flipper', { at: ball.position });
  });
}

// Rattle the Rails: a hard hit on a wall or rail scores, once per 200 ms per
// ball. collisionStart runs before the bounce, so this is the impact speed.
for (const w of walls) {
  on(w, (ball) => {
    const now = performance.now();
    const v = velocityOf(ball);
    if (!awake('wall') || Math.hypot(v.x, v.y) < 4) return;
    if (now - (ball.plugin.lastWallAt || -Infinity) < 200) return;
    ball.plugin.lastWallAt = now;
    addScore('wall', 'rail', { at: ball.position });
  });
}
function perfectFlip(flipper) {
  if (!stat('perfectFlip')) return;
  if (performance.now() - (flipper.lastBallContact || -Infinity) > 150) return;
  setTimeout(() => {
    for (const ball of balls) {
      if (ball.plugin.mode !== 'playfield') continue;
      const d = Math.hypot(ball.position.x - flipper.body.position.x, ball.position.y - flipper.body.position.y);
      if (d > 55) continue;
      ball.plugin.boostUntil = performance.now() + 400;
      const v = velocityOf(ball);
      Body.setVelocity(ball, { x: v.x * 1.25, y: v.y * 1.25 });
      fx.burst(ball.position.x, ball.position.y - 20, 'PERFECT!', INK.red);
    }
  }, 50);
}

// --- upgrades --------------------------------------------------------------------

const FLIPPER_UP_SPEED = 0.55;

// Dormant elements: a sprite drawn faded, or a printed feature washed over
// with the field's stock on the lamp layer. `awake` says what switches each one on.
const DORMANT_SPRITES = [
  { awake: () => awake('ufo'), bodies: () => [ufo.body] },
  { awake: () => awake('spinnerTurn'), bodies: () => [spinner.body] },
  { awake: () => awake('dropTarget'), bodies: () => drops.targets.map((t) => t.body) },
  { awake: () => awake('standup'), bodies: () => standups.targets.map((t) => t.body) },
];
const rampPath = (c) => new Path2D(`M${c[0]} C${c[1]} ${c[2]} ${c[3]} C${c[4]} ${c[5]} ${c[6]}`);
const I = Art.INSERTS;
const DORMANT_PRINTS = [
  { id: 'ramps', awake: () => awake('ramp'), stroke: [rampPath(L.ramps.left), rampPath(L.ramps.right)], width: L.rampHalfWidth * 2 + 10 },
  { id: 'row', awake: () => awake('lane'), rect: [140, 60, 120, 46], circles: L.rolloverLanes.xs.map((x) => [x, I.rowLetters.y, 11]) },
  { id: 'inlanes', awake: () => awake('inlane'), circles: [[L.rollovers.inL, L.rollovers.y, 11], [L.rollovers.inR, L.rollovers.y, 11]] },
  { id: 'orbit', awake: () => awake('orbit'), circles: [[L.orbitSensor.x, L.orbitSensor.y, 13], [I.arrows[2].x, I.arrows[2].y, 12]] },
  { id: 'scoop', awake: () => awake('scoop'), circles: [[L.scoop.x, L.scoop.y, 16], [I.arrows[3].x, I.arrows[3].y, 9]] },
  { id: 'kickout', awake: () => awake('kickout'), circles: [[L.kickout.x, L.kickout.y, 15]] },
  { id: 'rampArrows', awake: () => awake('ramp'), circles: [[I.arrows[0].x, I.arrows[0].y, 13], [I.arrows[1].x, I.arrows[1].y, 13]] },
  { id: 'multipliers', awake: () => stat('bonusXMax') > 1, circles: I.multipliers.map((m) => [m.x, m.y, m.r + 2]) },
  { id: 'chapters', awake: () => awake('chapter'), rect: [136, 507, 128, 22] },
  { id: 'extraBall', awake: () => stat('extraBall') > 0, rect: [I.extraBall.x - 2, I.extraBall.y - 2, I.extraBall.w + 4, I.extraBall.h + 4] },
  { id: 'shootAgain', awake: () => ballSaveMs() > 0, rect: [I.shootAgain.x - 2, I.shootAgain.y - 2, I.shootAgain.w + 4, I.shootAgain.h + 4] },
];
const INK_IN_MS = 1400; // how long a newly woken element takes to ink in
const wokenAt = {}; // print id -> when it woke (fades the wash out)
const wasAwake = {};

function drawDormant(ctx, now) {
  ctx.save();
  ctx.fillStyle = INK.field;
  ctx.strokeStyle = INK.field;
  ctx.lineCap = 'round';
  for (const d of DORMANT_PRINTS) {
    let alpha = 0.72;
    if (d.awake()) {
      const p = (now - (wokenAt[d.id] ?? -Infinity)) / INK_IN_MS;
      if (p >= 1) continue;
      alpha *= 1 - Math.max(0, p);
    }
    ctx.globalAlpha = alpha;
    if (d.rect) ctx.fillRect(...d.rect);
    for (const [x, y, r] of d.circles || []) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.lineWidth = d.width || 0;
    for (const path of d.stroke || []) ctx.stroke(path);
  }
  ctx.restore();
  for (const d of DORMANT_SPRITES) {
    const on = d.awake();
    for (const b of d.bodies()) {
      if (b.render.opacity > 0.2) b.render.opacity = on ? 1 : 0.3; // dropped targets stay faint
    }
  }
}

// Called when the tree closes: anything that woke up while it was open inks
// in on the table now, where the player can see it.
function inkInWoken() {
  const now = performance.now();
  for (const d of DORMANT_PRINTS) {
    const on = d.awake();
    if (on && wasAwake[d.id] === false) wokenAt[d.id] = now;
    wasAwake[d.id] = on;
  }
}
inkInWoken();

// Dormant elements don't respond at all: the ball passes straight through
// a sleeping UFO, drop target or standup (they're drawn faded), and a
// sleeping spinner doesn't turn (see spinnerSensor).
// Walls, guides, pops and slings are always solid.
const ALL_MASK = 0xffffffff;
function applyDormancy() {
  ufo.body.collisionFilter.mask = awake('ufo') ? ALL_MASK : 0;
  for (const t of standups.targets) t.body.collisionFilter.mask = awake('standup') ? ALL_MASK : 0;
  drops.setEnabled(awake('dropTarget'));
}

// Pushes the current Upgrade Tree levels onto the table. Runs at start-up
// and after every purchase, so upgrades apply immediately.
function applyUpgrades() {
  applyDormancy();
  for (const f of flippers) {
    f.upSpeed = FLIPPER_UP_SPEED * stat('flipStrength');
    f.body.restitution = stat('springy');
  }
  skills.charge = Math.min(skills.charge, skills.max());
  skills.fillLoadout();
  if (!game.turnActive) scoring.newBall();
  updateHud();
}
upgrades.onChange(applyUpgrades);

// --- skills ----------------------------------------------------------------------

function feedBallsFromScoop(count) {
  for (let k = 1; k <= count; k++) {
    scoop.hold(createBall(L.scoop.x, L.scoop.y, 'held'), 400 + k * 600);
  }
}

function useSkill(id) {
  if (!game.turnActive || paused || !skills.use(id)) return;
  const s = SKILLS.find((sk) => sk.id === id);
  fx.title(s.name, s.desc, 1100);
  if (id === 'bounceHouse') {
    feedBallsFromScoop(2);
    game.ballSaveUntil = Math.max(game.ballSaveUntil, performance.now() + 6000);
  }
}

// Magnet Mitt pulls toward the most valuable target right now: the scoop
// when multiball is lit, else the active mission's target, else the UFO.
function magnetTarget() {
  if (game.chapters >= 5) return L.scoop;
  const key = missions.active ? missions.halos()[0] : null;
  const spot = key && Lamps.HALO_SPOTS[key] ? Lamps.HALO_SPOTS[key][0] : null;
  return spot ? { x: spot[0], y: spot[1] } : { x: L.centerpiece.x, y: L.centerpiece.y };
}

function steerToMagnet() {
  const t = magnetTarget();
  for (const ball of balls) {
    if (ball.plugin.mode !== 'playfield') continue;
    const dx = t.x - ball.position.x;
    const dy = t.y - ball.position.y;
    const d = Math.hypot(dx, dy) || 1;
    Body.setVelocity(ball, {
      x: ball.velocity.x * 0.94 + (dx / d) * 0.6,
      y: ball.velocity.y * 0.94 + (dy / d) * 0.6,
    });
  }
}

function drawMagnet(ctx) {
  const t = magnetTarget();
  ctx.save();
  ctx.strokeStyle = INK.red;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 5]);
  ctx.lineDashOffset = -performance.now() / 30;
  for (const ball of balls) {
    if (ball.plugin.mode !== 'playfield') continue;
    ctx.beginPath();
    ctx.moveTo(ball.position.x, ball.position.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(t.x, t.y, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// --- balls & turns -------------------------------------------------------------

function createBall(x, y, mode) {
  const ball = Bodies.circle(x, y, L.ballR, {
    restitution: 0.6,
    friction: 0.05,
    frictionAir: BALL_AIR,
    density: 0.08,
    label: 'ball',
    collisionFilter: { category: CAT.BALL, mask: 0 },
    render: { sprite: { texture: S.ball, xScale: 0.25, yScale: 0.25 } },
  });
  ball.plugin = { mode };
  setBallMode(ball, mode);
  World.add(world, ball);
  balls.push(ball);
  return ball;
}

// A new ball arms the ball saver (its countdown starts when the ball
// reaches the playfield). A ball given back by a save (Shoot Again, Guardian
// Angel, Saved by the Bell) doesn't: otherwise a player who drained inside
// the window every time got a fresh window every time, and the turn never
// ended.
function serveBall({ armSave = true } = {}) {
  if (!game.turnActive) return;
  createBall(L.shooter.x, L.shooter.stopY - L.ballR - 1, 'shooter');
  game.saveArmed = armSave && ballSaveMs() > 0;
  updateHud();
}
const serveSavedBall = () => serveBall({ armSave: false });

function startTurn() {
  Object.assign(game, {
    turnActive: true,
    ballNumber: 1,
    extraBalls: 0,
    row: [false, false, false],
    chapters: 0,
    extraBallLit: false,
    bankClears: 0,
    ballSaveUntil: 0,
    rampChain: { ramp: null, until: 0 },
  });
  standups.reset();
  drops.reset();
  pickups.clear();
  tableRules.newTurn?.();
  missions.newTurn();
  scoring.newTurn();
  skills.newTurn();
  game.guardianUsed = false;
  announce('Hold Space to pull the plunger, release to launch', 4000);
  serveBall();
}

// Ball over: pay the end-of-ball bonus, then serve the next ball or end the
// turn and bank its score as Tickets.
const BONUS_CARD_MS = 1600;

function endBall() {
  game.row = [false, false, false];
  const b = scoring.collectBonus();
  if (stat('bonus')) fx.title(`Bonus ${formatPoints(b.bonus)} × ${b.x}`, `= ${formatPoints(b.total)} points`, BONUS_CARD_MS);
  scoring.newBall();

  if (game.ballNumber >= ballsPerTurn() + game.extraBalls) {
    game.turnActive = false;
    const earned = scoring.bankTurn();
    announce(`Turn over: ${formatPoints(scoring.score)} points, +${formatPoints(earned)} Tickets`, 0);
    setTimeout(() => fx.title(TEXT.turnOver, `${formatPoints(scoring.score)} points · +${formatPoints(earned)} Tickets`, 3500), BONUS_CARD_MS);
    updateHud();
    return;
  }
  game.ballNumber += 1;
  announce(`Ball ${game.ballNumber}`);
  setTimeout(() => {
    fx.title(`Ball ${game.ballNumber}`, '', 1100);
    serveBall();
  }, BONUS_CARD_MS);
}

function removeBall(ball) {
  World.remove(world, ball);
  balls.splice(balls.indexOf(ball), 1);
  if (balls.length > 0 || !game.turnActive) return;
  if (performance.now() < game.ballSaveUntil) {
    game.ballSaveUntil = 0;
    announce('Shoot again!');
    fx.title('Shoot Again!', 'Ball saved', 1200);
    setTimeout(serveSavedBall, 700);
    return;
  }
  if (stat('guardian') && !game.guardianUsed) {
    game.guardianUsed = true;
    announce('Guardian Angel!');
    fx.title('Guardian Angel!', 'Ball returned, once per turn', 1300);
    setTimeout(serveSavedBall, 700);
    return;
  }
  if (Math.random() < stat('drainSave')) {
    announce('Saved by the bell!');
    fx.title('Saved by the Bell!', 'Ball returned', 1300);
    setTimeout(serveSavedBall, 700);
    return;
  }
  endBall();
}

function ballInShooterLane(ball) {
  return ball.position.x > L.shooterWall.x && ball.position.y > 560;
}

function releasePlunger() {
  const power = plunger.pull;
  plunger.charging = false;
  plunger.releasing = true;
  for (const ball of balls) {
    if (!ballInShooterLane(ball)) continue;
    setBallMode(ball, 'shooter');
    Body.setVelocity(ball, { x: 0, y: -(13.2 + power * 5.2) });
  }
}

// Where the shooter lane curves over the top of the table, a fast ball
// would ping between the two curved walls and stall. Guide it along the
// lane's centreline instead, like a rail, so launch power alone decides how
// far round the arch it gets: a light pull drops into the R·O·W lanes, a
// full pull loops right round to the left orbit.
const SHOOTER_LANE_R = (L.guideR + 3 + (L.outerR - 4)) / 2; // between the two wall faces

function railShooterBall(ball, angleDeg, r) {
  const a = deg(angleDeg);
  const tx = Math.sin(a); // anticlockwise (up and over) along the arch
  const ty = -Math.cos(a);
  const along = ball.velocity.x * tx + ball.velocity.y * ty;
  Body.setVelocity(ball, { x: tx * along, y: ty * along });
  const k = 1 + ((SHOOTER_LANE_R - r) / r) * 0.5; // ease halfway to the centreline
  Body.setPosition(ball, { x: ARCH_X + (ball.position.x - ARCH_X) * k, y: ARCH_Y + (ball.position.y - ARCH_Y) * k });
}

// --- per-tick updates ------------------------------------------------------------

const MAX_SPEED = 16;

// Game logic, once per 1/60 s tick (before that tick's physics sub-steps).
function tickGame() {
  const now = performance.now();

  for (const f of flippers) f.update();
  spinner.update();
  ufo.update();
  for (const pop of pops) pop.update();
  for (const sling of slings) sling.update();
  scoop.update();
  kickout.update();

  const inPlay = balls.some((b) => b.plugin.mode !== 'shooter');
  missions.tick(STEP_MS, inPlay);
  scoring.rank = awake('mission') ? missions.rank : 0;
  scoring.tick(now);
  tableRules.tick?.(now);
  scoring.surge = skills.isActive('inkSurge', now) ? stat('surgeX') : 1;
  if (game.turnActive && inPlay && awake('pickup')) {
    pickups.update(now, balls, { everyMs: stat('pickupEveryMs'), golden: stat('pickupGolden'), magnet: stat('pickupMagnet') });
  }
  if (skills.isActive('magnetMitt', now)) steerToMagnet();

  if (plunger.charging) plunger.pull = Math.min(1, plunger.pull + 0.025);
  if (plunger.releasing) {
    plunger.pull = Math.max(0, plunger.pull - 0.25);
    if (plunger.pull === 0) plunger.releasing = false;
  }
  Body.setPosition(plungerStop, { x: L.shooter.x, y: L.shooter.stopY + 5 + plunger.pull * L.shooter.pullTravel });

  for (const ball of [...balls]) {
    for (const ramp of ramps) ramp.update(ball);
    const { x, y } = ball.position;

    // A launched ball is in play once it's past the gate at the top of the
    // lane, or has dropped out of the lane short of it. The ball-save timer
    // starts then, not while the ball sits on the plunger.
    if (ball.plugin.mode === 'shooter') {
      const angle = (Math.atan2(y - ARCH_Y, x - ARCH_X) * 180) / Math.PI;
      const r = Math.hypot(x - ARCH_X, y - ARCH_Y);
      const outOfLane = y < ARCH_Y ? angle < L.shooterExitDeg || r < L.guideR : x < L.shooterWall.x;
      if (!outOfLane && y < ARCH_Y) railShooterBall(ball, angle, r);
      if (!outOfLane && y >= ARCH_Y) {
        // Straight part of the lane: keep the ball centred so it never rubs a wall.
        Body.setPosition(ball, { x: L.shooter.x, y });
        Body.setVelocity(ball, { x: 0, y: ball.velocity.y });
      }
      if (outOfLane) {
        setBallMode(ball, 'playfield');
        if (game.saveArmed) {
          game.saveArmed = false;
          game.ballSaveUntil = now + ballSaveMs();
        }
      }
    }

    // Speed cap keeps the ball readable and stops it tunnelling through thin
    // guides. The plunger launch is exempt: it needs the extra to clear the arch.
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    const cap = ball.plugin.boostUntil > now ? MAX_SPEED + 3 : MAX_SPEED;
    if (speed > cap && ball.plugin.mode !== 'shooter') {
      Body.setVelocity(ball, { x: (ball.velocity.x / speed) * cap, y: (ball.velocity.y / speed) * cap });
    }

    const drained = y > L.drainY && x < L.shooterWall.x;
    const escaped = !Number.isFinite(x) || y > 740 || y < -40 || x < -40 || x > 440;
    if (drained || escaped) removeBall(ball);
  }
}


// --- lamps ---------------------------------------------------------------------

// Between turns the lamps run a chase, like a machine in attract mode.
function attractState(now) {
  const step = Math.floor(now / 180);
  return {
    arrows: { leftRamp: step % 4 === 0 ? 'on' : 'off', scoop: step % 4 === 1 ? 'on' : 'off', rightRamp: step % 4 === 2 ? 'on' : 'off', orbit: step % 4 === 3 ? 'on' : 'off' },
    row: [0, 1, 2].map((i) => step % 3 === i),
    multiplier: 1 + (step % 5),
    chapters: step % 6,
    nextChapterBlink: false,
    extraBall: step % 8 < 4 ? 'on' : 'off',
    shootAgain: step % 8 >= 4 ? 'on' : 'off',
    rolloverFlash: {},
    beam: false,
    plungerPull: plunger.pull,
  };
}

function lampState(now) {
  if (!game.turnActive) return attractState(now);
  const comboOn = (other) => (game.rampChain.ramp === other && now < game.rampChain.until ? 'blink' : 'on');
  const saveLeft = game.ballSaveUntil - now;
  let shootAgain = 'off';
  if (saveLeft > 0) shootAgain = saveLeft < 2000 ? 'blink' : 'on';
  else if (game.saveArmed && game.turnActive && ballSaveMs() > 0) shootAgain = 'on';
  const multiballLit = game.chapters >= 5 && awake('saucerJackpot') && awake('scoop');
  return {
    arrows: {
      leftRamp: awake('ramp') ? comboOn('right') : 'off',
      rightRamp: awake('ramp') ? comboOn('left') : 'off',
      orbit: now < game.orbitFlashUntil ? 'blink' : 'off',
      scoop: multiballLit || tableRules.scoopLit?.() ? 'blink' : 'off',
    },
    row: game.row,
    multiplier: stat('bonusXMax') > 1 ? scoring.bonusX : 0,
    chapters: game.chapters,
    nextChapterBlink: awake('chapter'),
    extraBall: game.extraBallLit ? 'blink' : game.extraBalls > 0 ? 'on' : 'off',
    shootAgain,
    rolloverFlash: game.rolloverFlash,
    halos: awake('mission') ? missions.halos() : [],
    beam: multiballLit,
    plungerPull: plunger.pull,
  };
}

Events.on(render, 'afterRender', () => {
  const now = performance.now();
  lampLayer.draw(lampState(now), now);
  drawDormant(lampLayer.ctx, now);
  tableRules.lamps?.(lampLayer.ctx, now);
  if (game.turnActive) pickups.draw(lampLayer.ctx, now);
  Effects.speedLines(lampLayer.ctx, balls);
  Lamps.letterDropTargets(render.context, drops);
  fx.draw(now);
  if (skills.isActive('magnetMitt', now)) drawMagnet(fx.ctx);
  tableWrap.classList.toggle('slow-reels', skills.isActive('slowReels', now));
  tableWrap.classList.toggle('ink-surge', skills.isActive('inkSurge', now));
  updateMissionPanel(now);
  updateScorePanel(now);
  updateSkillPanel(now);
});

// --- input -----------------------------------------------------------------------

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyZ']);
const RIGHT_KEYS = new Set(['ArrowRight', 'Slash']);
const PLUNGER_KEYS = new Set(['Space', 'ArrowDown', 'Enter']);

// Flipper buttons also shift the lit R·O·W letters left or right ("lane
// change"), so a player can steer the gaps under the ball.
function laneChange(dir) {
  if (game.row.every(Boolean)) return;
  const r = game.row;
  game.row = dir < 0 ? [r[1], r[2], r[0]] : [r[2], r[0], r[1]];
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyU' || (event.code === 'Escape' && upgradeScreen.isOpen)) {
    if (upgradeScreen.isOpen || !game.turnActive) upgradeScreen.toggle();
    else if (!event.repeat) announce('The Upgrade Tree opens between turns', 2000);
    return;
  }
  if (paused) return;
  if (LEFT_KEYS.has(event.code) || RIGHT_KEYS.has(event.code) || PLUNGER_KEYS.has(event.code)) event.preventDefault();
  if (LEFT_KEYS.has(event.code)) {
    leftFlipper.setActive(true);
    if (!event.repeat) {
      laneChange(-1);
      perfectFlip(leftFlipper);
    }
  }
  if (RIGHT_KEYS.has(event.code)) {
    rightFlipper.setActive(true);
    miniFlipper?.setActive(true);
    if (!event.repeat) {
      laneChange(1);
      perfectFlip(rightFlipper);
      if (miniFlipper) perfectFlip(miniFlipper);
    }
  }
  // Keys 1-6 fire the skill in that loadout slot.
  const slot = /^Digit([1-6])$/.exec(event.code);
  if (slot && !event.repeat) {
    const id = skills.inSlot(Number(slot[1]) - 1);
    if (id) useSkill(id);
  }
  if (PLUNGER_KEYS.has(event.code) && !event.repeat) {
    if (!game.turnActive) startTurn();
    else if (balls.some(ballInShooterLane)) plunger.charging = true;
  }
});

window.addEventListener('keyup', (event) => {
  if (LEFT_KEYS.has(event.code)) leftFlipper.setActive(false);
  if (RIGHT_KEYS.has(event.code)) {
    rightFlipper.setActive(false);
    miniFlipper?.setActive(false);
  }
  if (PLUNGER_KEYS.has(event.code) && plunger.charging) releasePlunger();
});

// --- Upgrade Tree screen and skill panel ------------------------------------------

const tableWrap = document.getElementById('table-wrap');

const upgradeScreen = new UpgradeScreen({
  root: document.getElementById('upgrade-screen'),
  upgrades,
  scoring,
  skills,
  canSwitchTable: () => !game.turnActive,
  onToggle: (open) => {
    paused = open;
    if (open) {
      for (const f of flippers) f.setActive(false);
      plunger.charging = false;
    } else {
      inkInWoken();
    }
  },
});

// Clicking a HUD button must not leave it focused, or Space (the plunger)
// would press it again.
function hudButton(el, fn) {
  el.addEventListener('mousedown', (e) => e.preventDefault());
  el.addEventListener('click', (e) => {
    fn(e);
    el.blur();
  });
}
hudButton(document.getElementById('open-upgrades'), () => upgradeScreen.open('tree'));
hudButton(document.getElementById('open-tables'), () => upgradeScreen.open('tables'));
const helpEl = document.getElementById('help');
const helpToggle = document.getElementById('help-toggle');
hudButton(helpToggle, () => {
  helpEl.hidden = !helpEl.hidden;
  helpToggle.setAttribute('aria-expanded', String(!helpEl.hidden));
});
const tablesReachedEl = document.getElementById('tables-reached');

const skillsEl = document.getElementById('skills');
const skillListEl = document.getElementById('skill-list');
const chargeBarEl = document.getElementById('charge-bar');
const upgradesTicketsEl = document.getElementById('upgrades-tickets');
skillListEl.innerHTML = Array.from({ length: MAX_SKILL_SLOTS }, (_, i) => `<button type="button" tabindex="-1" data-slot="${i}"><kbd>${i + 1}</kbd> <span class="name"></span> <span class="cost"></span></button>`).join('');
for (const btn of skillListEl.querySelectorAll('button')) {
  hudButton(btn, () => {
    const id = skills.inSlot(Number(btn.dataset.slot));
    if (id) useSkill(id);
  });
}

let lastSkillView = '';
function updateSkillPanel(now) {
  const v = {
    show: skills.anyUnlocked(),
    charge: Math.floor(skills.charge),
    max: skills.max(),
    tickets: scoring.tickets,
    reached: upgrades.tablesReached(),
    list: Array.from({ length: MAX_SKILL_SLOTS }, (_, i) => {
      const id = skills.inSlot(i);
      return id ? [id, skills.cost(id), skills.canUse(id, now) && game.turnActive, Math.ceil(skills.timeLeft(id, now) / 1000)] : null;
    }),
  };
  const key = JSON.stringify(v);
  if (key === lastSkillView) return;
  lastSkillView = key;
  upgradesTicketsEl.textContent = formatPoints(v.tickets);
  tablesReachedEl.textContent = `${v.reached} of ${TABLES.length}`;
  skillsEl.hidden = !v.show;
  chargeBarEl.style.width = `${(v.charge / v.max) * 100}%`;
  chargeBarEl.parentElement.style.setProperty('--charges', v.max / 100);
  v.list.forEach((slot, i) => {
    const btn = skillListEl.children[i];
    btn.hidden = !slot;
    if (!slot) return;
    const [id, cost, ready, secs] = slot;
    btn.querySelector('.name').textContent = SKILLS.find((s) => s.id === id).name;
    btn.disabled = !ready;
    btn.classList.toggle('active', secs > 0);
    btn.querySelector('.cost').textContent = secs > 0 ? `${secs}s` : cost;
  });
}

applyUpgrades();

// Test hooks for poking at the table from the console.
Object.assign(window, {
  __game: game,
  __scoring: scoring,
  __upgrades: upgrades,
  __skills: skills,
  __missions: missions,
  __tableRules: tableRules,
  __balls: balls,
  __world: world,
  __createBall: createBall,
  __startTurn: startTurn,
  // Physics tests: pause the frame loop, then step the engine by hand.
  __engine: engine,
  __flippers: flippers,
  __slings: slings,
  __pause: (on) => { paused = on; },
  __step: (n = 1) => { for (let i = 0; i < n; i++) physicsTick(); },
  // Debug: __addTickets(1e6) to try later parts of the tree.
  __addTickets: (n) => {
    scoring.tickets += n;
    scoring.lifetimeTickets += n;
    scoring.save();
    updateHud();
  },
  // Debug: __setTickets(5e6) sets the balance outright. Lifetime Tickets
  // (which gate the table passes) rise to match but never drop.
  __setTickets: (n) => {
    scoring.tickets = Math.max(0, n);
    scoring.lifetimeTickets = Math.max(scoring.lifetimeTickets, scoring.tickets);
    scoring.save();
    updateHud();
  },
});

updateHud();
