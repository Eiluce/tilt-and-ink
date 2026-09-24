// A passive round bounce target. Real pinball bumpers actively "kick" the
// ball away on contact (not just a bounce from restitution), so every hit
// sends the ball off along the bumper-to-ball line at a minimum speed. Also drives
// a quick "pow" scale pulse on its sprite so a hit reads as an event, not
// just a silent physics bounce.
class Bumper {
  constructor(world, {
    x,
    y,
    radius = 22,
    points = 25,
    kickSpeed = 7,
    label = 'bumper',
    texture = 'assets/bumper.svg',
    // Sprite assets are drawn at 4x physics scale (radius*2*4 = image
    // width), so 0.25 is the default for every element built this way.
    spriteScale = 0.25,
    onScore,
  }) {
    this.points = points;
    this.label = label;
    this.kickSpeed = kickSpeed;
    this.onScore = onScore;
    this.spriteScale = spriteScale;
    this.pulse = 0;

    this.body = Matter.Bodies.circle(x, y, radius, {
      isStatic: true,
      // >1 restitution is the classic arcade-bumper trick — real physics
      // would just conserve energy at 1, but a bumper should visibly add
      // energy to the ball, not merely reflect it.
      restitution: 1.3,
      label: 'bumper',
      render: {
        sprite: { texture, xScale: spriteScale, yScale: spriteScale },
      },
    });

    Matter.World.add(world, this.body);
  }

  hit(ballBody) {
    const dx = ballBody.position.x - this.body.position.x;
    const dy = ballBody.position.y - this.body.position.y;
    const dist = Math.max(Math.hypot(dx, dy), 0.001);

    // Send the ball away along the bumper-to-ball line at no less than
    // kickSpeed, keeping whatever sideways speed it had.
    const nx = dx / dist;
    const ny = dy / dist;
    const outward = ballBody.velocity.x * nx + ballBody.velocity.y * ny;
    const boost = Math.max(this.kickSpeed, outward) - outward;
    Matter.Body.setVelocity(ballBody, {
      x: ballBody.velocity.x + nx * boost,
      y: ballBody.velocity.y + ny * boost,
    });

    this.onScore?.(this.points, this.label);
    this.pulse = 1;
  }

  // Called once per engine tick; eases the sprite back down from a hit.
  update() {
    if (this.pulse <= 0.001) return;
    this.pulse *= 0.8;
    const s = this.spriteScale * (1 + this.pulse * 0.3);
    this.body.render.sprite.xScale = s;
    this.body.render.sprite.yScale = s;
  }
}
