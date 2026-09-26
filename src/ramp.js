// A raised ramp. A ball moving into the mouth sensor switches to "ramp" mode,
// which only collides with ramp walls, so it rides over the playfield below.
//
// On the ramp the ball is steered along the centreline like a habitrail:
// each tick its velocity is projected onto the path's direction, so only
// gravity slows it (bouncing between two curved walls would eat most of its
// speed). The walls are just a backstop. Reaching the end counts as a made
// shot and drops the ball back into play; a ball that runs out of speed rolls
// back out of the mouth and simply returns to the playfield.
class Ramp {
  constructor(world, { name, path, halfWidth = 13, wallThickness = 4, onMade }) {
    this.name = name;
    this.onMade = onMade;
    this.halfWidth = halfWidth;

    this.points = sampleBezierChain(path, 24);
    this.tangents = this.points.map((p, i) => {
      const a = this.points[Math.max(0, i - 1)];
      const b = this.points[Math.min(this.points.length - 1, i + 1)];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    });

    const side = (sign) => this.points.map(([x, y], i) => {
      const [tx, ty] = this.tangents[i];
      return [x - ty * halfWidth * sign, y + tx * halfWidth * sign];
    });
    const filter = { category: CAT.RAMP, mask: CAT.BALL };
    this.walls = [...Walls.chain(side(1), wallThickness, filter), ...Walls.chain(side(-1), wallThickness, filter)];

    const [mx, my] = this.points[3];
    this.mouth = makeSensor(mx, my, 9, `ramp-mouth-${name}`);

    Matter.World.add(world, [...this.walls, this.mouth]);
  }

  // Ball touched the mouth sensor: it's on the ramp if it's heading in and
  // lined up with the mouth. (The sensor is wider than the ramp, so a ball
  // passing beside it at an angle can touch it; switching that one to ramp
  // mode trapped it against the outside of the ramp's wall.)
  atMouth(ball) {
    if (ball.plugin.mode !== 'playfield') return;
    const [tx, ty] = this.tangents[0];
    const v = velocityOf(ball);
    if (v.x * tx + v.y * ty < 1) return;
    if (Math.abs(this.offCentre(ball, 3)) > this.halfWidth - 4) return;
    setBallMode(ball, 'ramp');
    ball.plugin.ramp = this.name;
    ball.plugin.rampIndex = 3;
    ball.plugin.rampStall = 0;
  }

  // How far the ball is from the centreline, sideways, at sample `i`.
  offCentre(ball, i) {
    const [tx, ty] = this.tangents[i];
    return (ball.position.x - this.points[i][0]) * -ty + (ball.position.y - this.points[i][1]) * tx;
  }

  // Called once per engine tick for every ball.
  update(ball) {
    if (ball.plugin.mode !== 'ramp' || ball.plugin.ramp !== this.name) return;

    // Nearest centreline point, searched near where the ball was last tick.
    const { x, y } = ball.position;
    let best = ball.plugin.rampIndex;
    let bestD = Infinity;
    const lo = Math.max(0, best - 4);
    const hi = Math.min(this.points.length - 1, best + 4);
    for (let i = lo; i <= hi; i++) {
      const d = (this.points[i][0] - x) ** 2 + (this.points[i][1] - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    ball.plugin.rampIndex = best;

    const [tx, ty] = this.tangents[best];
    const along = ball.velocity.x * tx + ball.velocity.y * ty;
    const last = this.points.length - 1;

    if (best >= last - 1 && along > 0) {
      this.leave(ball);
      this.onMade?.(this.name);
      return;
    }
    if (best <= 1 && along < 0) {
      this.leave(ball);
      return;
    }
    // Safety net: a ball outside the walls, or one that has sat still on
    // the ramp for half a second, drops back to the playfield.
    ball.plugin.rampStall = Math.abs(along) < 0.3 ? (ball.plugin.rampStall || 0) + 1 : 0;
    if (Math.abs(this.offCentre(ball, best)) > this.halfWidth + 2 || ball.plugin.rampStall > 30) {
      this.leave(ball);
      return;
    }

    // Keep the ball on the rail: velocity along the path only, and ease it
    // sideways back toward the centreline (never along it, which would drag
    // it back toward the nearest sample point).
    const ox = this.points[best][0] - x;
    const oy = this.points[best][1] - y;
    const alongOffset = ox * tx + oy * ty;
    Matter.Body.setVelocity(ball, { x: tx * along, y: ty * along });
    Matter.Body.setPosition(ball, {
      x: x + (ox - alongOffset * tx) * 0.3,
      y: y + (oy - alongOffset * ty) * 0.3,
    });
  }

  leave(ball) {
    setBallMode(ball, 'playfield');
    ball.plugin.ramp = null;
  }
}
