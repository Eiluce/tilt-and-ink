// A triangular slingshot above each flipper. Hitting its long rubber face
// (first vertex to last) kicks the ball away along that face's normal; the
// other two sides are plain walls. The rubber flashes on each kick.
class Slingshot {
  constructor(world, { vertices, textures, kickSpeed = 6.5 }) {
    this.textures = textures;
    this.kickSpeed = kickSpeed;
    this.flashUntil = 0;
    this.cooldownUntil = 0;

    const cx = (vertices[0][0] + vertices[1][0] + vertices[2][0]) / 3;
    const cy = (vertices[0][1] + vertices[1][1] + vertices[2][1]) / 3;
    this.body = Matter.Bodies.fromVertices(cx, cy, [vertices.map(([x, y]) => ({ x, y }))], {
      isStatic: true,
      restitution: 0.7,
      label: 'slingshot',
      render: { sprite: { texture: textures.off, xScale: 0.25, yScale: 0.25 } },
    });
    // fromVertices re-centres on the centroid; pin it back exactly.
    Matter.Body.setPosition(this.body, { x: cx, y: cy });

    // Normal of the kicking face, pointing away from the triangle.
    const [A, , C] = vertices;
    const fx = C[0] - A[0];
    const fy = C[1] - A[1];
    const len = Math.hypot(fx, fy);
    let nx = -fy / len;
    let ny = fx / len;
    if ((A[0] - cx) * nx + (A[1] - cy) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    this.face = { ax: A[0], ay: A[1], nx, ny };

    Matter.World.add(world, this.body);
  }

  // Returns true if the kicker fired.
  hit(ball) {
    const { ax, ay, nx, ny } = this.face;
    const side = (ball.position.x - ax) * nx + (ball.position.y - ay) * ny;
    if (side < 0) return false; // touched one of the plain sides

    // Only a real hit fires the kicker, not a ball rolling along the rubber
    // or one that was kicked a moment ago. (collisionStart runs before the
    // bounce is resolved, so this is the incoming velocity.)
    const now = performance.now();
    const v = velocityOf(ball);
    const vn = v.x * nx + v.y * ny;
    if (-vn < 1 || now < this.cooldownUntil) return false;
    this.cooldownUntil = now + 150;

    // Kick sideways only, and keep (plus nudge) the ball's downward speed.
    // The face points slightly upward, so a kick along it would loft the ball
    // back up every time and the two slings could volley it forever.
    const tx = v.x - vn * nx;
    const ty = v.y - vn * ny;
    Matter.Body.setVelocity(ball, {
      x: tx * 0.5 + Math.sign(nx) * this.kickSpeed,
      y: Math.max(ty, 0) + 1,
    });
    this.flashUntil = now + 110;
    this.body.render.sprite.texture = this.textures.on;
    return true;
  }

  update() {
    if (this.flashUntil && performance.now() > this.flashUntil) {
      this.flashUntil = 0;
      this.body.render.sprite.texture = this.textures.off;
    }
  }
}
