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
    pixelRatio: window.devicePixelRatio || 1,
  },
});
Render.run(render);

// Fixed-step physics clock: always 60 steps of 1/60 s per real second,
// whatever the screen's refresh rate. (Matter's Runner steps once per frame,
// so on a 120-144 Hz monitor the whole table ran 2-2.4x too fast, and a
// single slow frame could sap a plunger launch.)
const STEP_MS = 1000 / 60;
let lastFrame = performance.now();
let pendingMs = 0;
function stepPhysics(now) {
  pendingMs = Math.min(pendingMs + (now - lastFrame), 100);
  lastFrame = now;
  while (pendingMs >= STEP_MS) {
    Engine.update(engine, STEP_MS);
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

World.add(world, [
  // Outer wall: thick and pushed outward (inner face at r 188 / x 12 / x 388)
  // so a fast ball can't tunnel through it.
  ...Walls.chain([[0, 720], ...Walls.arc(L.outerR + 8, 180, 360), [400, 720]], 24),
  // Left orbit guide and shooter-lane wall.
  ...Walls.chain([[L.orbitGuide.x, L.orbitGuide.bottom], ...Walls.arc(L.guideR, 180, 360 + L.orbitGuide.endDeg)], 8),
  ...Walls.chain([[L.shooterWall.x, 720], ...Walls.arc(L.guideR, 0, L.shooterWall.endDeg)], 6),
  ...Walls.chain(L.sideSlopes.left, 6),
  ...Walls.chain(L.sideSlopes.right, 6),
  ...Walls.chain(L.inlaneGuides.left, 5),
  ...Walls.chain(L.inlaneGuides.right, 5),
  ...L.laneGuides.xs.flatMap((x) => Walls.chain([[x, L.laneGuides.top], [x, L.laneGuides.bottom]], L.laneGuides.width)),
  ...Walls.chain(L.gate, 4, { category: CAT.GATE, mask: CAT.BALL }),
]);

// The plunger's top face: the served ball rests on it, and it drops as the
// plunger is pulled back.
const plungerStop = Bodies.rectangle(L.shooter.x, L.shooter.stopY + 5, 22, 10, {
  isStatic: true,
  label: 'plunger',
  render: { visible: false },
});
World.add(world, plungerStop);

// --- game state ------------------------------------------------------------

const BALLS_PER_TURN = 3;
const BALL_SAVE_MS = 8000;
const RAMP_CHAIN_MS = 4000; // left-then-right ramp window, for the Ramp Relay mission
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

const scoreEl = document.getElementById('score');
const ballInfoEl = document.getElementById('ball-info');
const lastEventEl = document.getElementById('last-event');
const messageEl = document.getElementById('message');
let lastEventTimer;
let messageTimer;

// Scores points through the combo and bonus rules in scoring.js. Options:
// shot / flat / bonus (see Scoring.award), and `at` ({x, y}) to float the
// points up from that spot on the table. Returns the points scored.
function addScore(points, label, { at, ...opts } = {}) {
  if (!game.turnActive) return 0;
  const total = scoring.award(points, opts);
  lastEventEl.textContent = `+${total.toLocaleString()} ${label}${scoring.combo > 1 && !opts.flat ? ` (combo ×${scoring.combo})` : ''}`;
  clearTimeout(lastEventTimer);
  lastEventTimer = setTimeout(() => {
    lastEventEl.textContent = '';
  }, 900);
  if (at) fx.popup(at.x, at.y, `+${total.toLocaleString()}`);
  if (opts.shot && scoring.combo > 1 && at) fx.burst(at.x + 22, at.y - 26, `×${scoring.combo}`, INK.red);
  return total;
}

const missions = new MissionControl({ addScore, fx, announce });

const BUMPER_WORDS = ['BOP!', 'BONK!', 'POW!', 'BAM!'];
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
let lastMissionView = '';
function updateMissionPanel(now) {
  const v = game.turnActive
    ? missions.view(now)
    : {
      ...missions.view(now),
      label: 'Missions',
      name: 'Start a turn',
      goal: 'Hit a standup to pick a mission, then land in the kickout hole to accept it.',
      count: '',
      status: '',
    };
  const key = JSON.stringify(v);
  if (key === lastMissionView) return;
  lastMissionView = key;
  missionEls.rank.textContent = v.rank;
  missionEls['rank-next'].textContent = v.toNext;
  missionEls['mission-label'].textContent = v.label;
  missionEls['mission-name'].textContent = v.name;
  missionEls['mission-goal'].textContent = v.goal;
  missionEls['mission-count'].textContent = v.count;
  missionEls['mission-bar'].style.width = `${Math.round(v.progress * 100)}%`;
  missionEls['mission-status'].textContent = v.status;
  missionEls.mission.classList.toggle('urgent', v.urgent);
}

// Score, combo meter, bonus and Tickets; only touches the DOM on change.
const scoreEls = Object.fromEntries(
  ['combo', 'combo-bar', 'bonus', 'bonus-x', 'tickets', 'best-turn'].map((id) => [id, document.getElementById(id)]),
);
let lastScoreView = '';
function updateScorePanel(now) {
  const v = {
    score: scoring.score,
    combo: scoring.combo,
    left: Math.round(scoring.comboTimeLeft(now) * 40),
    bonus: scoring.bonus,
    bonusX: scoring.bonusX,
    tickets: scoring.tickets,
    best: scoring.bestTurn,
  };
  const key = JSON.stringify(v);
  if (key === lastScoreView) return;
  lastScoreView = key;
  scoreEl.textContent = v.score.toLocaleString();
  scoreEls.combo.textContent = `Combo ×${v.combo}`;
  scoreEls.combo.classList.toggle('hot', v.combo > 1);
  scoreEls['combo-bar'].style.width = `${(v.left / 40) * 100}%`;
  scoreEls.bonus.textContent = v.bonus.toLocaleString();
  scoreEls['bonus-x'].textContent = `${v.bonusX}×`;
  scoreEls.tickets.textContent = v.tickets.toLocaleString();
  scoreEls['best-turn'].textContent = v.best.toLocaleString();
}

function updateHud() {
  if (!game.turnActive) {
    ballInfoEl.textContent = 'Press Space to start a turn';
    return;
  }
  const total = BALLS_PER_TURN + game.extraBalls;
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
    points: POINTS.pop,
    label: 'pop bumper',
    texture: S.pop,
    onScore: addScore,
  });
  on(pop.body, (ball) => {
    pop.hit(ball);
    missions.event('pop');
    const c = contactPoint(ball, pop.body);
    fx.ring(x, y, INK.red, L.popR, L.popR + 16);
    fx.burst(c.x, c.y - 6, pick(BUMPER_WORDS));
  });
  return pop;
});

const ufo = new Bumper(world, {
  x: L.ufo.x,
  y: L.ufo.y,
  radius: L.ufo.r,
  points: POINTS.ufo,
  kickSpeed: 5,
  label: 'UFO',
  texture: S.ufo,
  onScore: (points, label) => addScore(points, label, { shot: true, at: { x: L.ufo.x, y: L.ufo.y - 30 } }),
});
on(ufo.body, (ball) => {
  ufo.hit(ball);
  missions.event('ufo');
  fx.ring(L.ufo.x, L.ufo.y, INK.teal, L.ufo.r, L.ufo.r + 24);
  fx.burst(ball.position.x, ball.position.y - 10, 'ZAP!', INK.teal);
  fx.shake(160, 2.5);
});

const spinner = new Spinner(world, {
  x: L.spinner.x,
  y: L.spinner.y,
  length: L.spinner.len,
  height: L.spinner.h,
  pointsPerRotation: POINTS.spinnerTurn,
  texture: S.spinner,
  onScore: (points, label) => {
    addScore(points, label);
    missions.event('spinner', points / POINTS.spinnerTurn);
  },
});

const drops = new DropTargetBank(world, {
  x: L.drops.x,
  y: L.drops.y,
  count: L.drops.count,
  spacing: L.drops.spacing,
  width: L.drops.w,
  height: L.drops.h,
  points: POINTS.dropTarget,
  bonusPoints: POINTS.dropBank,
  texture: S.drop,
  onScore: (points, label) => {
    const at = { x: L.drops.x, y: L.drops.y - 8 };
    if (label === 'bank cleared') addScore(points, label, { bonus: BONUS.dropBank, at });
    else addScore(points, label, { shot: true });
  },
  onCleared: () => {
    missions.event('dropBank');
    game.bankClears += 1;
    if (game.bankClears % 2 === 0 && !game.extraBallLit) {
      game.extraBallLit = true;
      announce('Extra ball lit at the kickout');
    }
  },
});
for (const t of drops.targets) {
  on(t.body, (ball, body) => {
    if (t.dropped) return;
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
  points: POINTS.standup,
  onScore: addScore,
  onComplete: () => {
    addScore(POINTS.standupsComplete, 'standups complete', { bonus: BONUS.standupsComplete });
    advanceChapter();
  },
});
for (const t of standups.targets) {
  on(t.body, (ball, body) => {
    standups.hit(body);
    missions.cycle();
    fx.sparks(body.position.x, body.position.y, INK.mustard);
  });
}

const slings = [
  new Slingshot(world, { vertices: L.slings.left, textures: S.slingLeft, points: POINTS.sling, onScore: addScore }),
  new Slingshot(world, { vertices: L.slings.right, textures: S.slingRight, points: POINTS.sling, onScore: addScore }),
];
for (const sling of slings) {
  on(sling.body, (ball) => {
    if (!sling.hit(ball)) return;
    fx.sparks(ball.position.x, ball.position.y, INK.red);
  });
}

// Ramps advance the serial's chapter. The opposite ramp's arrow blinks for
// a few seconds after each one: hitting it is a "ramp relay" for missions.
function rampMade(name) {
  const now = performance.now();
  const relay = game.rampChain.ramp && game.rampChain.ramp !== name && now < game.rampChain.until;
  const end = L.ramps[name][L.ramps[name].length - 1];
  addScore(POINTS.ramp, 'ramp', { shot: true, bonus: BONUS.ramp, at: { x: end[0], y: end[1] + 20 } });
  fx.burst(end[0], end[1] + 4, 'ZOOM!', INK.mustard);
  game.rampChain = { ramp: name, until: now + RAMP_CHAIN_MS };
  missions.event('ramp');
  if (relay) missions.event('rampCombo');
  advanceChapter();
}

function advanceChapter() {
  if (game.chapters >= 5) return;
  game.chapters += 1;
  addScore(POINTS.chapter * game.chapters, `Chapter ${ROMAN[game.chapters - 1]}`, { bonus: BONUS.chapter });
  announce(game.chapters === 5 ? 'Chapter V! Shoot the UFO scoop for multiball' : `Chapter ${ROMAN[game.chapters - 1]}`);
  const subs = ['The Saucer Men', 'Peril on Planet X', 'The Ray Gun Rumble', 'Trapped in the Nebula', 'The Tractor Beam! Shoot the scoop'];
  fx.title(`Chapter ${ROMAN[game.chapters - 1]}`, subs[game.chapters - 1]);
}

const ramps = ['left', 'right'].map((name) => {
  const ramp = new Ramp(world, { name, path: L.ramps[name], halfWidth: L.rampHalfWidth, onMade: rampMade });
  on(ramp.mouth, (ball) => ramp.atMouth(ball));
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
    if (game.chapters < 5) {
      addScore(POINTS.scoop, 'tractor beam', { shot: true, bonus: BONUS.scoop, at: L.scoop });
      fx.ring(L.scoop.x, L.scoop.y, INK.teal, 6, 28);
      return;
    }
    game.chapters = 0;
    const jackpot = addScore(POINTS.saucerJackpot, 'saucer jackpot', { shot: true, bonus: BONUS.saucerJackpot, at: L.scoop });
    announce('Saucer multiball!', 3000);
    fx.title('Saucer Multiball!', `Jackpot ${jackpot.toLocaleString()}`, 2000);
    fx.shake(450, 6);
    game.ballSaveUntil = performance.now() + BALL_SAVE_MS;
    for (let k = 1; k <= 2; k++) {
      scoop.hold(createBall(L.scoop.x, L.scoop.y, 'held'), 1000 + k * 700);
    }
  },
});
on(scoop.sensor, (ball) => scoop.capture(ball));

const kickout = new Hole(world, {
  name: 'kickout',
  x: L.kickout.x,
  y: L.kickout.y,
  holdMs: 700,
  eject: () => ({ x: 0.6, y: 4 }),
  onCapture: () => {
    addScore(POINTS.kickout, 'kickout', { shot: true, bonus: BONUS.kickout, at: L.kickout });
    fx.ring(L.kickout.x, L.kickout.y, INK.mustard, 8, 26);
    missions.accept();
    if (game.extraBallLit) {
      game.extraBallLit = false;
      game.extraBalls += 1;
      announce('Extra ball!');
      fx.title('Extra Ball!', 'The serial continues');
      updateHud();
    }
  },
});
on(kickout.sensor, (ball) => kickout.capture(ball));

// R·O·W rollover lanes: light all three to raise the end-of-ball bonus
// multiplier.
L.rolloverLanes.xs.forEach((x, i) => {
  const sensor = makeSensor(x, L.rolloverLanes.y, 6, 'lane');
  World.add(world, sensor);
  on(sensor, () => {
    addScore(POINTS.lane, 'lane');
    missions.event('lane');
    if (game.row[i]) return;
    game.row[i] = true;
    if (game.row.every(Boolean)) {
      const bonusX = scoring.raiseBonusX();
      addScore(POINTS.rowComplete, 'R·O·W complete', { bonus: BONUS.rowComplete });
      announce(`Bonus ${bonusX}×`);
      fx.title(`Bonus ${bonusX}×`, 'R · O · W complete · end-of-ball bonus', 1200);
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
  if (ball.velocity.y >= 0) return; // only counts on the way up
  addScore(POINTS.orbit, 'orbit', { shot: true, bonus: BONUS.orbit, at: ball.position });
  missions.event('orbit');
  fx.burst(ball.position.x + 14, ball.position.y, 'WHOOSH!', INK.paper);
  game.orbitFlashUntil = performance.now() + 1500;
});

const ROLLOVERS = { inL: [POINTS.inlane, 'inlane'], inR: [POINTS.inlane, 'inlane'] };
for (const [key, [points, label]] of Object.entries(ROLLOVERS)) {
  const sensor = makeSensor(L.rollovers[key], L.rollovers.y, 7, label);
  World.add(world, sensor);
  on(sensor, () => {
    addScore(points, label);
    game.rolloverFlash[key] = performance.now() + 1000;
  });
}

// --- flippers ------------------------------------------------------------------

function makeFlipper(cfg, side, texture) {
  return new Flipper(world, {
    side,
    pivotX: cfg.x,
    pivotY: cfg.y,
    length: cfg.len,
    height: L.flippers.height,
    restAngle: deg(cfg.rest),
    activeAngle: deg(cfg.active),
    texture,
  });
}
const leftFlipper = makeFlipper(L.flippers.left, 'left', S.flipper);
const rightFlipper = makeFlipper(L.flippers.right, 'right', S.flipper);
const miniFlipper = makeFlipper(L.flippers.mini, 'mini', S.miniFlipper);
const flippers = [leftFlipper, rightFlipper, miniFlipper];

// --- balls & turns -------------------------------------------------------------

function createBall(x, y, mode) {
  const ball = Bodies.circle(x, y, L.ballR, {
    restitution: 0.6,
    friction: 0.05,
    frictionAir: 0.0015,
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

function serveBall() {
  if (!game.turnActive) return;
  createBall(L.shooter.x, L.shooter.stopY - L.ballR - 1, 'shooter');
  game.saveArmed = true;
  updateHud();
}

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
  missions.newTurn();
  scoring.newTurn();
  announce('Hold Space to pull the plunger, release to launch', 4000);
  serveBall();
}

// Ball over: pay the end-of-ball bonus, then serve the next ball or end the
// turn and bank its score as Tickets.
const BONUS_CARD_MS = 1600;

function endBall() {
  game.row = [false, false, false];
  const b = scoring.collectBonus();
  fx.title(`Bonus ${b.bonus.toLocaleString()} × ${b.x}`, `= ${b.total.toLocaleString()} points`, BONUS_CARD_MS);
  scoring.newBall();

  if (game.ballNumber >= BALLS_PER_TURN + game.extraBalls) {
    game.turnActive = false;
    const earned = scoring.bankTurn();
    announce(`Turn over: ${scoring.score.toLocaleString()} points, +${earned.toLocaleString()} Tickets`, 0);
    setTimeout(() => fx.title('To Be Continued…', `${scoring.score.toLocaleString()} points · +${earned.toLocaleString()} Tickets`, 3500), BONUS_CARD_MS);
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
    setTimeout(serveBall, 700);
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

Events.on(engine, 'beforeUpdate', () => {
  const now = performance.now();

  for (const f of flippers) f.update();
  spinner.update();
  ufo.update();
  for (const pop of pops) pop.update();
  for (const sling of slings) sling.update();
  scoop.update();
  kickout.update();

  missions.tick(STEP_MS, balls.some((b) => b.plugin.mode !== 'shooter'));
  scoring.tick(now);

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
          game.ballSaveUntil = now + BALL_SAVE_MS;
        }
      }
    }

    // Speed cap keeps the ball readable and stops it tunnelling through thin
    // guides. The plunger launch is exempt: it needs the extra to clear the arch.
    const speed = Math.hypot(ball.velocity.x, ball.velocity.y);
    if (speed > MAX_SPEED && ball.plugin.mode !== 'shooter') {
      Body.setVelocity(ball, { x: (ball.velocity.x / speed) * MAX_SPEED, y: (ball.velocity.y / speed) * MAX_SPEED });
    }

    const drained = y > L.drainY && x < L.shooterWall.x;
    const escaped = !Number.isFinite(x) || y > 740 || y < -40 || x < -40 || x > 440;
    if (drained || escaped) removeBall(ball);
  }
});

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
  else if (game.saveArmed && game.turnActive) shootAgain = 'on';
  return {
    arrows: {
      leftRamp: game.turnActive ? comboOn('right') : 'off',
      rightRamp: game.turnActive ? comboOn('left') : 'off',
      orbit: now < game.orbitFlashUntil ? 'blink' : 'off',
      scoop: game.chapters >= 5 ? 'blink' : 'off',
    },
    row: game.row,
    multiplier: scoring.bonusX,
    chapters: game.chapters,
    nextChapterBlink: game.turnActive,
    extraBall: game.extraBallLit ? 'blink' : game.extraBalls > 0 ? 'on' : 'off',
    shootAgain,
    rolloverFlash: game.rolloverFlash,
    halos: missions.halos(),
    beam: game.chapters >= 5,
    plungerPull: plunger.pull,
  };
}

Events.on(render, 'afterRender', () => {
  const now = performance.now();
  lampLayer.draw(lampState(now), now);
  Effects.speedLines(lampLayer.ctx, balls);
  Lamps.letterDropTargets(render.context, drops);
  fx.draw(now);
  updateMissionPanel(now);
  updateScorePanel(now);
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
  if (LEFT_KEYS.has(event.code) || RIGHT_KEYS.has(event.code) || PLUNGER_KEYS.has(event.code)) event.preventDefault();
  if (LEFT_KEYS.has(event.code)) {
    leftFlipper.setActive(true);
    if (!event.repeat) laneChange(-1);
  }
  if (RIGHT_KEYS.has(event.code)) {
    rightFlipper.setActive(true);
    miniFlipper.setActive(true);
    if (!event.repeat) laneChange(1);
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
    miniFlipper.setActive(false);
  }
  if (PLUNGER_KEYS.has(event.code) && plunger.charging) releasePlunger();
});

// Test hooks for poking at the table from the console.
Object.assign(window, {
  __game: game,
  __scoring: scoring,
  __balls: balls,
  __world: world,
  __createBall: createBall,
  __startTurn: startTurn,
});

updateHud();
