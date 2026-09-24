// A free-spinning bar pinned at its own center (pointB is the body's own
// centroid, so — unlike the flipper — there's no rotation-reference-angle
// pitfall here: a zero offset is the same point regardless of the body's
// current angle). The ball knocks it as it passes; points are awarded
// continuously per full rotation accumulated, not just once per collision,
// so a fast spin racks up more than a slow graze.
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
      // Its own layer so it can spin freely in a narrow lane without
      // catching on the lane walls; only balls push it round.
      collisionFilter: { category: CAT.SPINNER, mask: CAT.BALL },
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
