// A pinball flipper: a rigid body pinned to a fixed pivot by a Matter.js
// constraint, driven toward a rest or active angle by directly setting its
// angular velocity each tick (the standard approach for Matter.js flippers,
// since motors/torque don't give the snappy, consistent response real
// flippers have).
class Flipper {
  constructor(world, options) {
    const {
      pivotX,
      pivotY,
      length,
      pivotR,
      tipR,
      restAngle,
      activeAngle,
      upSpeed = 0.55,
      downSpeed = 0.3,
      side = 'left',
      texture,
      spriteScale = 0.25,
    } = options;

    this.restAngle = restAngle;
    this.activeAngle = activeAngle;
    this.upSpeed = upSpeed;
    this.downSpeed = downSpeed;
    this.isActive = false;
    this.length = length;

    // The body is the drawn outline (tapered: wide round pivot end, narrow
    // round tip). Matter centres a polygon body on its centroid, so build it
    // at angle 0 with the centroid `c` to the right of the pivot, pinned by
    // pointB = -c, which lands exactly on the pivot *before* any rotation.
    // Matter's constraint rotates pointB by the body's angle *change since
    // the constraint was created* (not its absolute angle), so the
    // constraint must be created while the body is still at angle 0, and
    // only rotated into its resting pose afterward, or that reference point
    // is wrong for the rest of the body's life.
    const outline = flipperOutline(length, pivotR, tipR);
    const c = Matter.Vertices.centre(outline);
    this.body = Matter.Bodies.fromVertices(pivotX + c.x, pivotY + c.y, [outline], {
      friction: 0,
      frictionAir: 0,
      restitution: 0.3,
      density: 0.04,
      label: `flipper-${side}`,
      // Flippers only need to hit balls; letting them touch the inlane
      // guides that end at their pivots just makes them jitter.
      collisionFilter: { category: CAT.DEFAULT, mask: CAT.BALL },
      // The sprite is drawn at 4x physics scale, centred on the same
      // centroid, with its pivot cap on the local -x side (the end pointB
      // pins), so left and right both read correctly from rotation alone.
      render: {
        sprite: { texture, xScale: spriteScale, yScale: spriteScale },
      },
    });

    this.constraint = Matter.Constraint.create({
      pointA: { x: pivotX, y: pivotY },
      bodyB: this.body,
      pointB: { x: -c.x, y: -c.y },
      stiffness: 1,
      length: 0,
    });

    Matter.Body.setAngle(this.body, restAngle);

    Matter.World.add(world, [this.body, this.constraint]);
  }

  setActive(active) {
    this.isActive = active;
  }

  // Called once per engine tick (Events.on(engine, 'beforeUpdate', ...)).
  //
  // Always stay in velocity-space rather than ever calling Body.setAngle:
  // setAngle rotates the body around its current centroid with no idea the
  // pivot constraint exists, so calling it repeatedly fights the constraint
  // solver and drags the pivot point away from its anchor. Bang-bang at a
  // constant speed also overshoots (then overshoots back) once the
  // remaining angle is smaller than one step's rotation, so cap the applied
  // velocity to exactly the remaining distance once we're that close —
  // still a normal, constraint-respecting integration step, just one that
  // lands on the target instead of sailing past it.
  update() {
    const target = this.isActive ? this.activeAngle : this.restAngle;
    const diff = target - this.body.angle;
    const speed = this.isActive ? this.upSpeed : this.downSpeed;

    const step = Math.sign(diff) * Math.min(Math.abs(diff), speed);
    Matter.Body.setAngularVelocity(this.body, step);
  }
}
