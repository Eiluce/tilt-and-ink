// Shared physics plumbing: collision layers, ball modes and wall builders.
//
// A ball is always in one of four modes, each a different collision mask:
//  - shooter:   still in the shooter lane, passes through the one-way gate
//  - playfield: normal play
//  - ramp:      up on a raised ramp; only touches ramp walls and sensors,
//               so it passes over everything on the playfield below
//  - held:      parked in a scoop/saucer; touches nothing
const CAT = {
  DEFAULT: 0x0001,
  BALL: 0x0002,
  RAMP: 0x0004,
  GATE: 0x0008,
  SPINNER: 0x0010,
  SENSOR: 0x0020,
};

const BALL_MASKS = {
  shooter: CAT.DEFAULT | CAT.BALL | CAT.SPINNER | CAT.SENSOR,
  playfield: CAT.DEFAULT | CAT.BALL | CAT.GATE | CAT.SPINNER | CAT.SENSOR,
  ramp: CAT.RAMP | CAT.SENSOR,
  held: 0,
};

// Matter's air drag on the ball: the share of speed lost per 1/60 s tick.
const BALL_AIR = 0.0015;

function setBallMode(ball, mode) {
  ball.plugin.mode = mode;
  ball.collisionFilter.mask = BALL_MASKS[mode];
  // Tables can thicken the air (Davy Jones' Deep's water drag), but never
  // in the shooter lane, so every table's plunger reaches the same places.
  ball.frictionAir = mode === 'playfield' || mode === 'ramp' ? LAYOUT.ballAir || BALL_AIR : BALL_AIR;
  // Balls up on a ramp are drawn a touch bigger so they read as raised.
  const s = mode === 'ramp' ? 0.29 : 0.25;
  ball.render.sprite.xScale = s;
  ball.render.sprite.yScale = s;
}

// A body's true velocity (px per 1/60 s), wherever it's read from. During a
// physics sub-step Matter keeps `body.velocity` as that sub-step's
// displacement (a quarter of the speed with 4 sub-steps), so collision
// handlers, which run inside a sub-step, must read it through this.
const velocityOf = (body) => Matter.Body.getVelocity(body);

// Outline of a flipper with its pivot at the origin, pointing along +x: a
// round pivot end of radius rp, straight sides, and a round tip of radius
// rt. The art (art.js) and the physics body (flipper.js) are both built from
// it, so the ball bounces exactly where the flipper is drawn.
function flipperOutline(len, rp, rt, arcSteps = 8) {
  const tip = len - rt;
  const pts = [];
  for (let i = 0; i <= arcSteps; i++) {
    const a = Math.PI / 2 + (Math.PI * i) / arcSteps; // back of the pivot end
    pts.push({ x: rp * Math.cos(a), y: rp * Math.sin(a) });
  }
  for (let i = 0; i <= arcSteps; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / arcSteps; // round the tip
    pts.push({ x: tip + rt * Math.cos(a), y: rt * Math.sin(a) });
  }
  return pts;
}

const Walls = {
  // Invisible static wall between two points. Square-ended: use chain() or
  // post() for rounded ends. (A chamfer can't do it: on a segment shorter
  // than it is thick, a thickness/2 chamfer folds the shape inside out.)
  segment(x1, y1, x2, y2, thickness, filter = {}) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    return Matter.Bodies.rectangle((x1 + x2) / 2, (y1 + y2) / 2, len, thickness, {
      isStatic: true,
      angle: Math.atan2(y2 - y1, x2 - x1),
      friction: 0,
      collisionFilter: filter,
      render: { visible: false },
      label: 'wall',
    });
  },

  // A connected run of segments. Every joint and both ends get a round cap,
  // so the ball can't snag on the seam between two rectangles.
  chain(points, thickness, filter = {}) {
    const bodies = [];
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      bodies.push(Walls.segment(x1, y1, x2, y2, thickness, filter));
    }
    for (let i = 0; i < points.length; i++) {
      bodies.push(Walls.post(points[i][0], points[i][1], thickness / 2, filter));
    }
    return bodies;
  },

  post(x, y, r, filter = {}) {
    return Matter.Bodies.circle(x, y, r, {
      isStatic: true,
      friction: 0,
      collisionFilter: filter,
      render: { visible: false },
      label: 'wall',
    });
  },

  // Points along an arc around LAYOUT.arch, from angle a0 to a1 (degrees).
  arc(r, a0, a1, stepDeg = 4) {
    const { cx, cy } = LAYOUT.arch;
    const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / stepDeg));
    const points = [];
    for (let i = 0; i <= n; i++) {
      const a = deg(a0 + ((a1 - a0) * i) / n);
      points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return points;
  },
};

// Invisible trigger zone that only balls touch.
function makeSensor(x, y, r, label = 'sensor') {
  return Matter.Bodies.circle(x, y, r, {
    isStatic: true,
    isSensor: true,
    label,
    collisionFilter: { category: CAT.SENSOR, mask: CAT.BALL },
    render: { visible: false },
  });
}

// Samples a chain of cubic beziers (P0, C1, C2, P1, C3, C4, P2, ...).
function sampleBezierChain(c, stepsPerCurve = 14) {
  const out = [];
  for (let k = 0; k + 3 < c.length; k += 3) {
    const [p0, p1, p2, p3] = [c[k], c[k + 1], c[k + 2], c[k + 3]];
    for (let i = k === 0 ? 0 : 1; i <= stepsPerCurve; i++) {
      const t = i / stepsPerCurve;
      const u = 1 - t;
      const a = u * u * u;
      const b = 3 * u * u * t;
      const d = 3 * u * t * t;
      const e = t * t * t;
      out.push([
        a * p0[0] + b * p1[0] + d * p2[0] + e * p3[0],
        a * p0[1] + b * p1[1] + d * p2[1] + e * p3[1],
      ]);
    }
  }
  return out;
}
