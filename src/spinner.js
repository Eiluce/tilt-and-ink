// A spinner: a bar pinned at its own center (pointB is the body's own
// centroid, so — unlike the flipper — there's no rotation-reference-angle
// pitfall here: a zero offset is the same point regardless of the body's
// current angle).
//
// On a real machine the spinner turns on an axis across the lane, so the
// ball always passes under it and just sets it spinning. In 2D a bar that
// the ball can touch is a trap: a ball landing on its middle pushes both
// halves equally, the bar never turns, and the ball sits on it. So the bar
// never collides; a ball passing through (main.js calls kick()) spins it by
// its speed and direction and loses a little speed. Points are awarded per
// full rotation accumulated, so a fast shot racks up more than a slow one.
class Spinner {
  constructor(world, {
    x,
    y,
    length = 70,
    height = 10,
    pointsPerRotation = 15,
    texture,
    spriteScale = 0.25,
    onScore,
  }) {
    this.pointsPerRotation = pointsPerRotation;
    this.onScore = onScore;
    this.rotationAccum = 0;
    this.lastAngle = 0;

    this.body = Matter.Bodies.rectangle(x, y, length, height, {
      friction: 0,
      frictionAir: 0.02,
      density: 0.001,
      label: 'spinner',
      // Touches nothing: the ball passes through and kick() spins it.
      collisionFilter: { category: CAT.SPINNER, mask: 0 },
      render: {
        sprite: { texture, xScale: spriteScale, yScale: spriteScale },
      },
    });

    this.constraint = Matter.Constraint.create({
      pointA: { x, y },
      bodyB: this.body,
      pointB: { x: 0, y: 0 },
      stiffness: 1,
      length: 0,
    });

    Matter.World.add(world, [this.body, this.constraint]);
  }

  // A ball passing through: spin by its speed, in the direction it's going
  // (up the lane spins one way, down the other), and take a little speed
  // off the ball as the bar drags on it.
  kick(ball) {
    const v = velocityOf(ball);
    const speed = Math.hypot(v.x, v.y);
    const dir = v.y < 0 ? 1 : -1;
    Matter.Body.setAngularVelocity(this.body, dir * Math.min(0.9, 0.05 + speed * 0.06));
    Matter.Body.setVelocity(ball, { x: v.x * 0.94, y: v.y * 0.94 });
  }

  // Called once per engine tick.
  update() {
    const delta = this.body.angle - this.lastAngle;
    this.lastAngle = this.body.angle;
    this.rotationAccum += Math.abs(delta);

    const fullTurns = Math.floor(this.rotationAccum / (Math.PI * 2));
    if (fullTurns > 0) {
      this.rotationAccum -= fullTurns * Math.PI * 2;
      this.onScore?.(fullTurns * this.pointsPerRotation, 'spinner');
    }
  }
}
